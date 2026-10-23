// supabaseService.js
// Colócalo en la raíz del proyecto (junto a App.js y supabase.js)
// No necesita instalar nada extra — reutiliza el cliente ya configurado en supabase.js

import { supabase } from './supabase';

// ── Registro / primer arranque ──────────────────────────────────────────────
// Si el nombre ya existe devuelve el jugador existente (con sus monedas).
// Si no existe, lo crea con 500 monedas de inicio.
export async function registrarOObtenerJugador(nombre) {
  const nombreLimpio = nombre.trim();

  // Intentar insertar
  const { data: insertado, error: errInsert } = await supabase
    .from('jugadores')
    .insert({ nombre: nombreLimpio })
    .select()
    .single();

  if (!errInsert) return { ok: true, jugador: insertado };

  // Nombre duplicado (código PostgreSQL 23505) → devolvemos el existente
  if (errInsert.code === '23505') {
    const { data: existente, error: errGet } = await supabase
      .from('jugadores')
      .select()
      .eq('nombre', nombreLimpio)
      .single();

    if (!errGet) return { ok: true, jugador: existente };
  }

  return { ok: false, error: errInsert.message };
}

// ── Sincronizar monedas y bancarrotas ───────────────────────────────────────
// Se llama automáticamente cada vez que cambian monedas o bancarrotas en el casino.
// Devuelve el error de Supabase (o null si ha ido bien).
export async function sincronizarJugador({ nombre, monedas, bancarrotas }) {
  const { error } = await supabase
    .from('jugadores')
    .update({ monedas, bancarrotas })
    .eq('nombre', nombre);

  if (error) console.warn('[Casino] Error sincronizando jugador:', error.message);
  return error || null;
}

// ── Obtener ranking (top 20 por puntuación) ─────────────────────────────────
export async function obtenerRanking() {
  const { data, error } = await supabase
    .from('jugadores')
    .select('nombre, monedas, bancarrotas, puntuacion, updated_at')
    .order('puntuacion', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('[Casino] Error cargando ranking:', error.message);
    throw error;
  }
  return data;
}

// ── Ranking semanal ─────────────────────────────────────────────────────────
// Necesita en Supabase:
//   alter table jugadores add column semana text, add column monedas_inicio_semana integer;

// Lunes de la semana actual en formato AAAA-MM-DD (hora local)
export function semanaActual() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Si el jugador aún no ha jugado esta semana, la empieza con sus monedas actuales
export async function prepararSemana(nombre, monedas) {
  const semana = semanaActual();
  const { data, error } = await supabase.from('jugadores').select('semana').eq('nombre', nombre).single();
  if (error) throw error;
  if (data?.semana === semana) return;
  const { error: errUpdate } = await supabase
    .from('jugadores')
    .update({ semana, monedas_inicio_semana: monedas })
    .eq('nombre', nombre);
  if (errUpdate) throw errUpdate;
}

// Top 20 de lo ganado (o perdido) desde el lunes
export async function obtenerRankingSemanal() {
  const { data, error } = await supabase
    .from('jugadores')
    .select('nombre, monedas, bancarrotas, monedas_inicio_semana')
    .eq('semana', semanaActual());
  if (error) throw error;
  return (data || [])
    .map(j => ({ ...j, ganancia: j.monedas - (j.monedas_inicio_semana ?? j.monedas) }))
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 20);
}

// true si el error es porque faltan las columnas de la semana
export const faltanColumnasSemana = (e) => e?.code === '42703' || /semana/.test(e?.message || '');
