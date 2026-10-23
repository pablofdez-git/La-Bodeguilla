// errores.js — utilidades compartidas para mostrar errores en la app
import { Alert } from 'react-native';

// Texto legible de cualquier error (Supabase, red, JS...)
export function textoError(e) {
  if (!e) return 'Error desconocido.';
  if (typeof e === 'string') return e;
  return e.message || e.details || String(e);
}

// Muestra el error en pantalla y lo deja también en consola
export function avisarError(titulo, e) {
  console.warn(`[${titulo}]`, textoError(e));
  Alert.alert(titulo, textoError(e));
}

// true si el fallo es por falta de conexión (no por datos o permisos)
// Los errores de red de Supabase llegan sin código de PostgreSQL
export function esErrorDeRed(e) {
  const msg = textoError(e).toLowerCase();
  return !e?.code || msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
}
