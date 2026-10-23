// tema.js — paleta de colores compartida por toda la app
export const C = {
  bg:           '#131215',
  surface:      '#1C1A20',
  surfaceAlt:   '#252229',
  border:       '#332F3C',
  accent:       '#9B6DCC',
  accentDim:    '#2A1F3D',
  success:      '#2D9E5F',
  danger:       '#C94A3F',
  dangerDim:    '#3A1210',
  warning:      '#C9921A',
  warningDim:   '#3A2A08',
  textPrim:     '#EDE9F4',
  textSec:      '#9890A8',
  textMuted:    '#5A5466',
  white:        '#FFFFFF',
};

// Quita tildes y pasa a minúsculas para comparar nombres ("Limón" == "limon")
export const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
