/**
 * useOfflineSync.js — La Bodeguilla
 *
 * Estrategia:
 *  - Datos en AsyncStorage como caché local (lectura instantánea sin red)
 *  - Cambios sin conexión se guardan en una cola con timestamp
 *  - Al recuperar red, se vacia la cola aplicando cada operacion en orden
 *  - Si dos moviles modifican el mismo campo, gana el timestamp mas reciente
 *  - Un listener de NetInfo detecta la conexion y lanza la sincronizacion sola
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

const KEYS = {
  productos:   'bodeguilla:productos',
  extras:      'bodeguilla:extras',
  tiendas:     'bodeguilla:tiendas',
  cola:        'bodeguilla:cola_sync',
};

// Lee del cache o devuelve []
async function leerCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Guarda en cache
async function guardarCache(key, data) {
  try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// Añade una operacion a la cola de pendientes
async function encolar(operacion) {
  const cola = await leerCache(KEYS.cola);
  cola.push({ ...operacion, ts: Date.now() });
  await guardarCache(KEYS.cola, cola);
}

export function useOfflineSync() {
  const [productos,    setProductos]    = useState([]);
  const [extras,       setExtras]       = useState([]);
  const [tiendas,      setTiendas]      = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [hayRed,       setHayRed]       = useState(true);
  const [pendientes,   setPendientes]   = useState(0);  // ops en cola
  const sincronizando  = useRef(false);

  // ── Carga inicial: cache primero, luego red ──────────────────────────────
  const cargarDatos = useCallback(async (forzarRed = false) => {
    setCargando(true);
    try {
      // 1. Mostrar cache inmediatamente (cero espera percibida)
      const [cachedProd, cachedExt, cachedTien] = await Promise.all([
        leerCache(KEYS.productos),
        leerCache(KEYS.extras),
        leerCache(KEYS.tiendas),
      ]);
      if (cachedProd.length > 0) { setProductos(cachedProd); setExtras(cachedExt); setTiendas(cachedTien); setCargando(false); }

      // 2. Si hay red, traer datos frescos
      const estado = await NetInfo.fetch();
      if (estado.isConnected || forzarRed) {
        const [{ data: prod }, { data: ext }, { data: tien }] = await Promise.all([
          supabase.from('productos').select('*').order('nombre'),
          supabase.from('extras_compra').select('*').eq('comprado', false).order('created_at', { ascending: false }),
          supabase.from('tiendas').select('*').order('nombre'),
        ]);
        if (prod) { setProductos(prod); await guardarCache(KEYS.productos, prod); }
        if (ext)  { setExtras(ext);     await guardarCache(KEYS.extras, ext); }
        if (tien) { setTiendas(tien);   await guardarCache(KEYS.tiendas, tien); }
      }
    } catch (e) {
      console.warn('cargarDatos error:', e.message);
    } finally {
      setCargando(false);
      // Actualizar contador de pendientes
      const cola = await leerCache(KEYS.cola);
      setPendientes(cola.length);
    }
  }, []);

  // ── Vaciar la cola cuando hay red ────────────────────────────────────────
  const vaciarCola = useCallback(async () => {
    if (sincronizando.current) return;
    const cola = await leerCache(KEYS.cola);
    if (cola.length === 0) return;

    sincronizando.current = true;
    const fallidas = [];

    for (const op of cola) {
      try {
        if (op.tipo === 'update_stock') {
          // Leer timestamp del servidor para resolver conflictos
          const { data: actual } = await supabase
            .from('productos').select('updated_at, stock_actual').eq('id', op.id).single();
          // Si el servidor tiene un cambio mas reciente que el nuestro, no pisamos
          const tsServidor = actual?.updated_at ? new Date(actual.updated_at).getTime() : 0;
          if (op.ts > tsServidor) {
            await supabase.from('productos').update({
              stock_actual: op.stock_actual,
              updated_at: new Date(op.ts).toISOString(),
            }).eq('id', op.id);
          }

        } else if (op.tipo === 'update_minimo') {
          await supabase.from('productos').update({ stock_minimo: op.stock_minimo }).eq('id', op.id);

        } else if (op.tipo === 'update_producto') {
          await supabase.from('productos').update(op.campos).eq('id', op.id);

        } else if (op.tipo === 'insert_extra') {
          await supabase.from('extras_compra').insert([{ nombre: op.nombre, lugar_compra: op.lugar_compra }]);

        } else if (op.tipo === 'update_extra_comprado') {
          await supabase.from('extras_compra').update({ comprado: true }).eq('id', op.id);
          // Si habia suma de stock pendiente, aplicarla
          if (op.producto_id && op.cantidad) {
            const { data: p } = await supabase.from('productos').select('stock_actual').eq('id', op.producto_id).single();
            if (p) await supabase.from('productos').update({ stock_actual: p.stock_actual + op.cantidad }).eq('id', op.producto_id);
          }

        } else if (op.tipo === 'insert_tienda') {
          await supabase.from('tiendas').insert([{ nombre: op.nombre }]).onConflict('nombre').ignore();

        } else if (op.tipo === 'delete_tienda') {
          await supabase.from('tiendas').delete().eq('id', op.id);

        } else if (op.tipo === 'insert_producto') {
          await supabase.from('productos').insert([{
            nombre: op.nombre, categoria: op.categoria,
            stock_minimo: op.stock_minimo, stock_actual: 0,
          }]).onConflict('nombre').ignore();

        } else if (op.tipo === 'delete_producto') {
          await supabase.from('productos').delete().eq('id', op.id);
        }
      } catch (e) {
        console.warn('Op fallida, reencolar:', op.tipo, e.message);
        fallidas.push(op);
      }
    }

    // Guardar solo las que fallaron
    await guardarCache(KEYS.cola, fallidas);
    setPendientes(fallidas.length);
    sincronizando.current = false;

    // Recargar datos frescos del servidor
    await cargarDatos(true);
  }, [cargarDatos]);

  // ── Listener de red ──────────────────────────────────────────────────────
  useEffect(() => {
    cargarDatos();

    const unsub = NetInfo.addEventListener(estado => {
      const conectado = !!estado.isConnected;
      setHayRed(conectado);
      if (conectado) vaciarCola();
    });

    return () => unsub();
  }, []);

  // ── Helpers para operar localmente + encolar ──────────────────────────────

  // Actualiza cache local de productos
  const actualizarProductoLocal = useCallback(async (id, cambios) => {
    setProductos(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...cambios } : p);
      guardarCache(KEYS.productos, next);
      return next;
    });
  }, []);

  // RECUENTO: guarda stock de todos los productos
  const guardarRecuento = useCallback(async (stockTemporal) => {
    const ahora = Date.now();
    // Actualizar cache local
    setProductos(prev => {
      const next = prev.map(p =>
        stockTemporal[p.id] !== undefined
          ? { ...p, stock_actual: stockTemporal[p.id], updated_at: new Date(ahora).toISOString() }
          : p
      );
      guardarCache(KEYS.productos, next);
      return next;
    });
    // Encolar o aplicar directo
    const estado = await NetInfo.fetch();
    for (const [id, stock_actual] of Object.entries(stockTemporal)) {
      if (estado.isConnected) {
        await supabase.from('productos').update({
          stock_actual,
          updated_at: new Date(ahora).toISOString(),
        }).eq('id', id);
      } else {
        await encolar({ tipo: 'update_stock', id, stock_actual, ts: ahora });
      }
    }
    if (estado.isConnected) await cargarDatos(true);
    else { const cola = await leerCache(KEYS.cola); setPendientes(cola.length); }
  }, [cargarDatos]);

  // COMPRA: añadir item
  const anadirExtra = useCallback(async (nombre, lugar_compra) => {
    const tempId = `temp_${Date.now()}`;
    const nuevoItem = { id: tempId, nombre, lugar_compra, comprado: false, created_at: new Date().toISOString() };
    setExtras(prev => { const next = [nuevoItem, ...prev]; guardarCache(KEYS.extras, next); return next; });

    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      const { error } = await supabase.from('extras_compra').insert([{ nombre, lugar_compra }]);
      if (!error) await cargarDatos(true);
    } else {
      await encolar({ tipo: 'insert_extra', nombre, lugar_compra });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [cargarDatos]);

  // COMPRA: marcar como comprado (con suma opcional al stock)
  const marcarComprado = useCallback(async (id, producto_id = null, cantidad = 0) => {
    // Actualizar extras local
    setExtras(prev => { const next = prev.filter(e => e.id !== id); guardarCache(KEYS.extras, next); return next; });
    // Si hay suma de stock, aplicar local
    if (producto_id && cantidad) actualizarProductoLocal(producto_id, {
      stock_actual: (productos.find(p => p.id === producto_id)?.stock_actual ?? 0) + cantidad
    });

    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      if (producto_id && cantidad) {
        const { data: p } = await supabase.from('productos').select('stock_actual').eq('id', producto_id).single();
        if (p) await supabase.from('productos').update({ stock_actual: p.stock_actual + cantidad }).eq('id', producto_id);
      }
      await cargarDatos(true);
    } else {
      await encolar({ tipo: 'update_extra_comprado', id, producto_id, cantidad });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [productos, actualizarProductoLocal, cargarDatos]);

  // GESTIÓN: nuevo producto
  const insertarProducto = useCallback(async (nombre, categoria, stock_minimo) => {
    const tempId = `temp_${Date.now()}`;
    const nuevo = { id: tempId, nombre, categoria, stock_minimo, stock_actual: 0 };
    setProductos(prev => { const next = [...prev, nuevo].sort((a,b) => a.nombre.localeCompare(b.nombre)); guardarCache(KEYS.productos, next); return next; });

    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('productos').insert([{ nombre, categoria, stock_minimo, stock_actual: 0 }]);
      await cargarDatos(true);
    } else {
      await encolar({ tipo: 'insert_producto', nombre, categoria, stock_minimo });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [cargarDatos]);

  // GESTIÓN: borrar producto
  const eliminarProducto = useCallback(async (id) => {
    setProductos(prev => { const next = prev.filter(p => p.id !== id); guardarCache(KEYS.productos, next); return next; });
    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('productos').delete().eq('id', id);
    } else {
      await encolar({ tipo: 'delete_producto', id });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, []);

  // GESTIÓN: editar mínimo
  const editarMinimo = useCallback(async (id, stock_minimo) => {
    actualizarProductoLocal(id, { stock_minimo });
    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('productos').update({ stock_minimo }).eq('id', id);
    } else {
      await encolar({ tipo: 'update_minimo', id, stock_minimo });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [actualizarProductoLocal]);

  // GESTIÓN: editar producto completo (nombre, categoria, stock_minimo)
  const editarProducto = useCallback(async (id, campos) => {
    actualizarProductoLocal(id, campos);
    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('productos').update(campos).eq('id', id);
      await cargarDatos(true);
    } else {
      await encolar({ tipo: 'update_producto', id, campos });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [actualizarProductoLocal, cargarDatos]);

  // TIENDAS: insertar
  const insertarTienda = useCallback(async (nombre) => {
    const tempId = `temp_${Date.now()}`;
    setTiendas(prev => { const next = [...prev, { id: tempId, nombre }].sort((a,b) => a.nombre.localeCompare(b.nombre)); guardarCache(KEYS.tiendas, next); return next; });
    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('tiendas').insert([{ nombre }]);
      await cargarDatos(true);
    } else {
      await encolar({ tipo: 'insert_tienda', nombre });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, [cargarDatos]);

  // TIENDAS: borrar
  const eliminarTienda = useCallback(async (id) => {
    setTiendas(prev => { const next = prev.filter(t => t.id !== id); guardarCache(KEYS.tiendas, next); return next; });
    const estado = await NetInfo.fetch();
    if (estado.isConnected) {
      await supabase.from('tiendas').delete().eq('id', id);
    } else {
      await encolar({ tipo: 'delete_tienda', id });
      const cola = await leerCache(KEYS.cola); setPendientes(cola.length);
    }
  }, []);

  return {
    // Datos
    productos, extras, tiendas,
    // Estado
    cargando, hayRed, pendientes,
    // Acciones
    cargarDatos,
    guardarRecuento,
    anadirExtra,
    marcarComprado,
    insertarProducto,
    eliminarProducto,
    editarMinimo,
    editarProducto,
    insertarTienda,
    eliminarTienda,
  };
}
