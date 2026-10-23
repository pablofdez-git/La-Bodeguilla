/**
 * useOfflineSync.js — La Bodeguilla
 * Stock, compra y tiendas con soporte sin conexión:
 *  - Los datos se guardan en caché local (AsyncStorage) para verlos sin red.
 *  - Sin red, cada cambio se aplica en pantalla y se guarda en una cola.
 *  - Al volver la cobertura, la cola se sube a Supabase en orden.
 *
 * Cada acción devuelve 'ok' (subido), 'encolado' (se subirá luego) o 'error'.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { avisarError, esErrorDeRed, textoError } from './errores';

const KEY_CACHE = '@bodega_cache';
const KEY_COLA  = '@bodega_cola';

const DATOS_VACIOS = { productos: [], extras: [], tiendas: [] };

const esLocal = (id) => typeof id === 'string' && id.startsWith('local_');
const idLocal = () => `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre);

// Supabase no lanza excepciones: las convertimos para poder usar try/catch
async function comprobar(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

// ── Ejecuta una operación contra Supabase ───────────────────────────────────
async function ejecutarOperacion(op) {
  switch (op.tipo) {
    case 'recuento':
      await Promise.all(
        Object.entries(op.cambios).map(([id, stock_actual]) =>
          comprobar(supabase.from('productos').update({ stock_actual }).eq('id', id))
        )
      );
      return;
    case 'anadir_extra':
      await comprobar(supabase.from('extras_compra').insert([{ nombre: op.nombre, lugar_compra: op.lugar_compra }]));
      return;
    case 'marcar_comprado':
      if (op.id) await comprobar(supabase.from('extras_compra').update({ comprado: true }).eq('id', op.id));
      if (op.producto_id && op.cantidad) {
        const p = await comprobar(supabase.from('productos').select('stock_actual').eq('id', op.producto_id).single());
        await comprobar(supabase.from('productos').update({ stock_actual: p.stock_actual + op.cantidad }).eq('id', op.producto_id));
      }
      return;
    case 'insertar_producto':
      await comprobar(supabase.from('productos').insert([{
        nombre: op.nombre, categoria: op.categoria, stock_minimo: op.stock_minimo, stock_actual: op.stock_actual || 0,
      }]));
      return;
    case 'eliminar_producto':
      await comprobar(supabase.from('productos').delete().eq('id', op.id));
      return;
    case 'editar_producto':
      await comprobar(supabase.from('productos').update(op.campos).eq('id', op.id));
      return;
    case 'insertar_tienda':
      await comprobar(supabase.from('tiendas').insert([{ nombre: op.nombre }]));
      return;
    case 'eliminar_tienda':
      await comprobar(supabase.from('tiendas').delete().eq('id', op.id));
      return;
    default:
      throw new Error(`Operación desconocida: ${op.tipo}`);
  }
}

// ── Aplica una operación sobre los datos locales (para verla sin red) ───────
function aplicarLocal(datos, op) {
  const { productos, extras, tiendas } = datos;
  switch (op.tipo) {
    case 'recuento':
      return { ...datos, productos: productos.map(p => (p.id in op.cambios ? { ...p, stock_actual: op.cambios[p.id] } : p)) };
    case 'anadir_extra':
      return { ...datos, extras: [{ id: op.localId, nombre: op.nombre, lugar_compra: op.lugar_compra, comprado: false, created_at: new Date().toISOString() }, ...extras] };
    case 'marcar_comprado':
      return {
        ...datos,
        extras: extras.filter(e => e.id !== op.id),
        productos: op.producto_id && op.cantidad
          ? productos.map(p => (p.id === op.producto_id ? { ...p, stock_actual: p.stock_actual + op.cantidad } : p))
          : productos,
      };
    case 'insertar_producto':
      return { ...datos, productos: [...productos, { id: op.localId, nombre: op.nombre, categoria: op.categoria, stock_minimo: op.stock_minimo, stock_actual: op.stock_actual || 0 }].sort(porNombre) };
    case 'eliminar_producto':
      return { ...datos, productos: productos.filter(p => p.id !== op.id) };
    case 'editar_producto':
      return { ...datos, productos: productos.map(p => (p.id === op.id ? { ...p, ...op.campos } : p)).sort(porNombre) };
    case 'insertar_tienda':
      return { ...datos, tiendas: [...tiendas, { id: op.localId, nombre: op.nombre }].sort(porNombre) };
    case 'eliminar_tienda':
      return { ...datos, tiendas: tiendas.filter(t => t.id !== op.id) };
    default:
      return datos;
  }
}

// ── Añade una operación a la cola ───────────────────────────────────────────
// Si toca algo creado sin red (id local_), se fusiona con la operación que lo
// creó, porque ese id no existe todavía en Supabase.
function encolarEn(cola, op) {
  const creadoraDe = (id) => (o) => o.localId === id;

  switch (op.tipo) {
    case 'eliminar_producto':
    case 'eliminar_tienda':
      if (esLocal(op.id)) return cola.filter(o => !creadoraDe(op.id)(o));
      break;
    case 'editar_producto':
      if (esLocal(op.id)) return cola.map(o => (creadoraDe(op.id)(o) ? { ...o, ...op.campos } : o));
      break;
    case 'recuento': {
      const cambios = {};
      let nuevaCola = cola;
      for (const [id, stock] of Object.entries(op.cambios)) {
        if (esLocal(id)) nuevaCola = nuevaCola.map(o => (creadoraDe(id)(o) ? { ...o, stock_actual: stock } : o));
        else cambios[id] = stock;
      }
      return Object.keys(cambios).length ? [...nuevaCola, { ...op, cambios }] : nuevaCola;
    }
    case 'marcar_comprado': {
      let nuevaCola = cola;
      let { id, producto_id } = op;
      if (esLocal(id)) { nuevaCola = nuevaCola.filter(o => !creadoraDe(id)(o)); id = null; }
      if (esLocal(producto_id)) {
        nuevaCola = nuevaCola.map(o => (creadoraDe(producto_id)(o) ? { ...o, stock_actual: (o.stock_actual || 0) + op.cantidad } : o));
        producto_id = null;
      }
      return id || producto_id ? [...nuevaCola, { ...op, id, producto_id }] : nuevaCola;
    }
  }
  return [...cola, op];
}

export function useOfflineSync() {
  const [datos,      setDatos]      = useState(DATOS_VACIOS);
  const [cargando,   setCargando]   = useState(true);
  const [hayRed,     setHayRed]     = useState(true);
  const [pendientes, setPendientes] = useState(0);

  const datosRef      = useRef(DATOS_VACIOS);
  const colaRef       = useRef([]);
  const hayRedRef     = useRef(true);
  const procesandoRef = useRef(false);
  const cacheListaRef = useRef(false);

  // Mantener el ref al día y guardar en caché cada cambio
  useEffect(() => {
    datosRef.current = datos;
    if (cacheListaRef.current) AsyncStorage.setItem(KEY_CACHE, JSON.stringify(datos)).catch(() => {});
  }, [datos]);

  const guardarCola = useCallback(async (cola) => {
    colaRef.current = cola;
    setPendientes(cola.length);
    try { await AsyncStorage.setItem(KEY_COLA, JSON.stringify(cola)); }
    catch (e) { avisarError('No se pudo guardar la cola offline', e); }
  }, []);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    if (!hayRedRef.current) { setCargando(false); return; }
    setCargando(true);
    try {
      const [productos, extras, tiendas] = await Promise.all([
        comprobar(supabase.from('productos').select('*').order('nombre')),
        comprobar(supabase.from('extras_compra').select('*').eq('comprado', false).order('created_at', { ascending: false })),
        comprobar(supabase.from('tiendas').select('*').order('nombre')),
      ]);
      // Lo que aún no se ha subido se vuelve a aplicar encima de lo recibido
      const frescos = { productos: productos || [], extras: extras || [], tiendas: tiendas || [] };
      setDatos(colaRef.current.reduce(aplicarLocal, frescos));
    } catch (e) {
      // Sin cobertura: seguimos con la caché y el aviso de SIN RED
      if (!esErrorDeRed(e)) avisarError('Error al cargar los datos', e);
    } finally {
      setCargando(false);
    }
  }, []);

  // ── Subir la cola pendiente ───────────────────────────────────────────────
  const procesarCola = useCallback(async () => {
    if (procesandoRef.current || !hayRedRef.current) return;
    procesandoRef.current = true;
    try {
      const rechazadas = [];
      // Se lee siempre colaRef para no perder cambios hechos mientras se sube
      while (colaRef.current.length > 0) {
        const op = colaRef.current[0];
        try {
          await ejecutarOperacion(op);
        } catch (e) {
          if (esErrorDeRed(e)) break; // se ha vuelto a ir la red: el resto espera
          rechazadas.push(`· ${op.tipo}: ${textoError(e)}`);
        }
        await guardarCola(colaRef.current.filter(o => o !== op));
      }
      if (rechazadas.length > 0) {
        avisarError('Algunos cambios offline no se pudieron subir', rechazadas.join('\n'));
      }
    } finally {
      procesandoRef.current = false;
    }
    await cargarDatos();
  }, [cargarDatos, guardarCola]);

  // ── Arranque: caché + cola, y luego escuchar la red ───────────────────────
  useEffect(() => {
    let unsub = () => {};
    let activo = true;
    (async () => {
      try {
        const [rawCache, rawCola] = await Promise.all([
          AsyncStorage.getItem(KEY_CACHE),
          AsyncStorage.getItem(KEY_COLA),
        ]);
        const cola = rawCola ? JSON.parse(rawCola) : [];
        colaRef.current = cola;
        setPendientes(cola.length);
        if (rawCache) {
          setDatos(JSON.parse(rawCache));
          setCargando(false);
        }
      } catch (e) {
        avisarError('No se pudo leer la caché local', e);
      }
      cacheListaRef.current = true;
      if (!activo) return;

      unsub = NetInfo.addEventListener(state => {
        // isInternetReachable empieza en null: solo es "sin red" si es false
        const online = !!state.isConnected && state.isInternetReachable !== false;
        const volvio = online && !hayRedRef.current;
        hayRedRef.current = online;
        setHayRed(online);
        if (!online) setCargando(false);
        else if (volvio || colaRef.current.length > 0) procesarCola();
      });
      // Primera carga (si hay red)
      if (colaRef.current.length > 0) procesarCola();
      else cargarDatos();
    })();
    return () => { activo = false; unsub(); };
  }, []);

  // ── Ejecuta o encola una acción ───────────────────────────────────────────
  const accion = useCallback(async (op, tituloError) => {
    if (hayRedRef.current && colaRef.current.length === 0) {
      try {
        await ejecutarOperacion(op);
        await cargarDatos();
        return 'ok';
      } catch (e) {
        if (!esErrorDeRed(e)) { avisarError(tituloError, e); return 'error'; }
        // Ha fallado la red a mitad: se guarda para luego
      }
    }
    const conId = op.localId === undefined && ['anadir_extra', 'insertar_producto', 'insertar_tienda'].includes(op.tipo)
      ? { ...op, localId: idLocal() }
      : op;
    await guardarCola(encolarEn(colaRef.current, conId));
    setDatos(prev => aplicarLocal(prev, conId));
    if (hayRedRef.current) procesarCola();
    return 'encolado';
  }, [cargarDatos, guardarCola, procesarCola]);

  // ── Recuento ──────────────────────────────────────────────────────────────
  const guardarRecuento = useCallback(async (stockTemporal) => {
    // Solo se suben los productos que han cambiado
    const cambios = {};
    datosRef.current.productos.forEach(p => {
      const nuevo = Number(stockTemporal[p.id]);
      if (p.id in stockTemporal && !isNaN(nuevo) && nuevo !== p.stock_actual) cambios[p.id] = nuevo;
    });
    if (Object.keys(cambios).length === 0) return 'ok';
    return accion({ tipo: 'recuento', cambios }, 'No se pudo guardar el recuento');
  }, [accion]);

  // ── Compra ────────────────────────────────────────────────────────────────
  const anadirExtra = useCallback((nombre, lugar_compra) =>
    accion({ tipo: 'anadir_extra', nombre, lugar_compra }, 'No se pudo añadir a la compra'), [accion]);

  const marcarComprado = useCallback((id, producto_id = null, cantidad = 0) =>
    accion({ tipo: 'marcar_comprado', id, producto_id, cantidad }, 'No se pudo marcar como comprado'), [accion]);

  // ── Gestión ───────────────────────────────────────────────────────────────
  const insertarProducto = useCallback((nombre, categoria, stock_minimo) =>
    accion({ tipo: 'insertar_producto', nombre, categoria, stock_minimo }, 'No se pudo registrar el producto'), [accion]);

  const eliminarProducto = useCallback((id) =>
    accion({ tipo: 'eliminar_producto', id }, 'No se pudo eliminar el producto'), [accion]);

  const editarMinimo = useCallback((id, stock_minimo) =>
    accion({ tipo: 'editar_producto', id, campos: { stock_minimo } }, 'No se pudo editar el mínimo'), [accion]);

  const editarProducto = useCallback((id, campos) =>
    accion({ tipo: 'editar_producto', id, campos }, 'No se pudo editar el producto'), [accion]);

  // ── Tiendas ───────────────────────────────────────────────────────────────
  const insertarTienda = useCallback((nombre) =>
    accion({ tipo: 'insertar_tienda', nombre }, 'No se pudo añadir la tienda'), [accion]);

  const eliminarTienda = useCallback((id) =>
    accion({ tipo: 'eliminar_tienda', id }, 'No se pudo eliminar la tienda'), [accion]);

  return {
    productos: datos.productos, extras: datos.extras, tiendas: datos.tiendas,
    cargando, hayRed, pendientes,
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
