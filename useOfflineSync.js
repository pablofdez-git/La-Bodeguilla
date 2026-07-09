/**
 * useOfflineSync.js — La Bodeguilla (version simplificada)
 * Llamadas directas a Supabase, sin cola offline.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export function useOfflineSync() {
  const [productos,  setProductos]  = useState([]);
  const [extras,     setExtras]     = useState([]);
  const [tiendas,    setTiendas]    = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const hayRed    = true;
  const pendientes = 0;

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [{ data: prod }, { data: ext }, { data: tien }] = await Promise.all([
        supabase.from('productos').select('*').order('nombre'),
        supabase.from('extras_compra').select('*').eq('comprado', false).order('created_at', { ascending: false }),
        supabase.from('tiendas').select('*').order('nombre'),
      ]);
      if (prod) setProductos(prod);
      if (ext)  setExtras(ext);
      if (tien) setTiendas(tien);
    } catch (e) {
      console.warn('cargarDatos error:', e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, []);

  // ── Recuento ──────────────────────────────────────────────────────────────
  const guardarRecuento = useCallback(async (stockTemporal) => {
    try {
      await Promise.all(
        Object.entries(stockTemporal).map(([id, stock_actual]) =>
          supabase.from('productos').update({ stock_actual: Number(stock_actual) }).eq('id', id)
        )
      );
      await cargarDatos();
    } catch (e) {
      console.warn('guardarRecuento error:', e.message);
    }
  }, [cargarDatos]);

  // ── Compra ────────────────────────────────────────────────────────────────
  const anadirExtra = useCallback(async (nombre, lugar_compra) => {
    try {
      await supabase.from('extras_compra').insert([{ nombre, lugar_compra }]);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  const marcarComprado = useCallback(async (id, producto_id = null, cantidad = 0) => {
    try {
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      if (producto_id && cantidad) {
        const { data: p } = await supabase.from('productos').select('stock_actual').eq('id', producto_id).single();
        if (p) await supabase.from('productos').update({ stock_actual: p.stock_actual + cantidad }).eq('id', producto_id);
      }
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  // ── Gestión ───────────────────────────────────────────────────────────────
  const insertarProducto = useCallback(async (nombre, categoria, stock_minimo) => {
    try {
      await supabase.from('productos').insert([{ nombre, categoria, stock_minimo, stock_actual: 0 }]);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  const eliminarProducto = useCallback(async (id) => {
    try {
      await supabase.from('productos').delete().eq('id', id);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  const editarMinimo = useCallback(async (id, stock_minimo) => {
    try {
      await supabase.from('productos').update({ stock_minimo }).eq('id', id);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  const editarProducto = useCallback(async (id, campos) => {
    try {
      await supabase.from('productos').update(campos).eq('id', id);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  // ── Tiendas ───────────────────────────────────────────────────────────────
  const insertarTienda = useCallback(async (nombre) => {
    try {
      await supabase.from('tiendas').insert([{ nombre }]);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  const eliminarTienda = useCallback(async (id) => {
    try {
      await supabase.from('tiendas').delete().eq('id', id);
      await cargarDatos();
    } catch (e) { console.warn(e.message); }
  }, [cargarDatos]);

  return {
    productos, extras, tiendas,
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
