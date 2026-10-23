// feedback.js — avisos rápidos (toast) y vibración
import * as Haptics from 'expo-haptics';

// El componente <Toast /> se registra aquí al montarse
let mostrarToastActual = null;
export function registrarToast(fn) { mostrarToastActual = fn; }

// Aviso pequeño que desaparece solo. tipo: 'exito' | 'aviso' | 'info'
export function mostrarToast(texto, tipo = 'exito') {
  if (mostrarToastActual) mostrarToastActual(texto, tipo);
}

// Vibración corta. tipo: 'exito' | 'error' | 'aviso' | 'suave'
export function vibrar(tipo = 'suave') {
  const N = Haptics.NotificationFeedbackType;
  const promesa =
    tipo === 'exito' ? Haptics.notificationAsync(N.Success) :
    tipo === 'error' ? Haptics.notificationAsync(N.Error) :
    tipo === 'aviso' ? Haptics.notificationAsync(N.Warning) :
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  promesa.catch(() => {}); // sin vibrador no pasa nada
}
