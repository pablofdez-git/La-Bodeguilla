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
export async function sincronizarJugador({ nombre, monedas, bancarrotas }) {
  const { error } = await supabase
    .from('jugadores')
    .update({ monedas, bancarrotas })
    .eq('nombre', nombre);

  if (error) console.warn('[Casino] Error sincronizando jugador:', error.message);
  return !error;
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
    return null;
  }
  return data;
}
