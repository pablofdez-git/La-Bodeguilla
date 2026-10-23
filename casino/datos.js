// casino/datos.js — constantes de los juegos del casino

export const AYUDA_TEXTOS = {
  blackjack: {
    titulo: '🃏 Black Jack',
    reglas: [
      { icono: '🎯', texto: 'Llega a 21 puntos o supera al crupier sin pasarte.' },
      { icono: '🂡', texto: 'El As vale 11 o 1. Las figuras (J, Q, K) valen 10.' },
      { icono: '✋', texto: 'PLANTARSE: te quedas con tus cartas y el crupier juega.' },
      { icono: '➕', texto: 'PEDIR CARTA: recibes una carta más.' },
      { icono: '🎉', texto: 'Blackjack natural (21 con 2 cartas) gana al instante.' },
      { icono: '🏦', texto: 'El crupier pide hasta llegar a 17 o superarte.' },
    ],
    pagos: '· Ganar → x2 apuesta  · Empate → sin cambio',
  },
  ruleta: {
    titulo: '🟢 Ruleta Europea',
    reglas: [
      { icono: '🎰', texto: 'Coloca fichas en los números o en las apuestas simples.' },
      { icono: '🔴', texto: 'ROJO / NEGRO: paga x2 si la bola cae en ese color.' },
      { icono: '🔢', texto: 'PAR / IMPAR: paga x2. El 0 no cuenta para estas apuestas.' },
      { icono: '💯', texto: 'NÚMERO EXACTO: paga x36 la ficha apostada.' },
      { icono: '🪙', texto: 'Selecciona el valor de ficha (10, 20 o 50) antes de colocar.' },
      { icono: '🧹', texto: 'LIMPIAR devuelve todas las fichas al saldo.' },
    ],
    pagos: '· Color/Paridad → x2  · Número → x36',
  },
  tragaperras: {
    titulo: '🎰 Cubatas Jackpot',
    reglas: [
      { icono: '🎲', texto: 'Hay 9 símbolos distintos para mayor dificultad.' },
      { icono: '✌️', texto: '2 iguales en cualquier posición: reintegro x2.' },
      { icono: '🏆', texto: '3 iguales: premio según símbolo (ver tabla en máquina).' },
      { icono: '💎', texto: '💎×3 paga x60 · 💵×3 paga x40 · 🥩/🥪×3 paga x25.' },
      { icono: '🍺', texto: 'El resto de símbolos ×3 pagan x15 la apuesta.' },
    ],
    pagos: '· Par → x2  · Trifecta → x15 hasta x60',
  },
  dados: {
    titulo: '🎲 Dados — Craps',
    reglas: [
      { icono: '🎯', texto: 'TIRADA INICIAL: 7 u 11 ganas al instante (x2).' },
      { icono: '💀', texto: 'TIRADA INICIAL: 2, 3 o 12 (Craps) → pierde la apuesta.' },
      { icono: '📍', texto: 'Cualquier otro número se convierte en tu PUNTO.' },
      { icono: '🔄', texto: 'FASE PUNTO: sigue tirando sin coste extra.' },
      { icono: '✅', texto: 'Sacar tu punto antes que el 7 → ganas x2.' },
      { icono: '❌', texto: 'Sacar 7 en fase punto → la casa gana.' },
    ],
    pagos: '· Natural → x2  · Punto conseguido → x2',
  },
  rasca: {
    titulo: '🎟️ Rasca y Gana',
    reglas: [
      { icono: '🛒', texto: 'Compras un cartón al precio que elijas (10–50 monedas).' },
      { icono: '👆', texto: 'Toca cada casilla para revelarla una a una.' },
      { icono: '⚡', texto: 'REVELAR TODO destapa todas las casillas de golpe.' },
      { icono: '✌️', texto: 'PAR (2 iguales en las 6 casillas): x4 la apuesta.' },
      { icono: '🏆', texto: 'TRIFECTA (3 iguales): x20 mínimo.' },
      { icono: '💎', texto: '💎×3 → x80 · 💵×3 → x40 · resto ×3 → x20.' },
    ],
    pagos: '· Par → x4  · Trifecta → x20 hasta x80',
  },
  war: {
    titulo: '⚔️ War — Carta Alta',
    reglas: [
      { icono: '🃏', texto: 'Tú y el crupier recibís 3 cartas cada uno.' },
      { icono: '👑', texto: 'Gana quien tenga la carta más alta entre sus 3.' },
      { icono: '🏆', texto: 'Si ganas: cobras x3 tu apuesta.' },
      { icono: '⚔️', texto: 'EMPATE en carta alta: puedes ir a LA GUERRA (pagas otra apuesta igual) o rendirte (recuperas la mitad).' },
      { icono: '🔥', texto: 'En la GUERRA se reparte una carta decisiva. Si ganas cobras x6. Si pierdes, pierdes todo.' },
      { icono: '🂡', texto: 'Orden: A > K > Q > J > 10 > ... > 2. El As es siempre el más alto.' },
    ],
    pagos: '· Victoria → x3  · Guerra ganada → x6 (sobre apuesta doble)  · Rendirse → -mitad',
  },
};

// Posiciones (en %) de los puntos de cada cara del dado
export const PUNTOS_DADO = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

// Ampliamos el array a 9 símbolos para diluir la probabilidad y subir la dificultad real
export const SIMBOLOS_SLOTS = ['🍺', '🍷', '🥩', '💵', '💎', '🃏', '🔊', '🧊', '🥪'];

// 9 símbolos para controlar bien las probabilidades
export const SIMBOLOS_RASCA = ['🍺', '🍷', '🥩', '💎', '💵', '🃏', '🎯', '🍋', '🔔'];
export const RASCA_LIMITE_DIARIO = 5;

export const NUMEROS_RULETA = [
  { n: 0, color: 'verde' },
  { n: 1, color: 'rojo' }, { n: 2, color: 'negro' }, { n: 3, color: 'rojo' },
  { n: 4, color: 'negro' }, { n: 5, color: 'rojo' }, { n: 6, color: 'negro' },
  { n: 7, color: 'rojo' }, { n: 8, color: 'negro' }, { n: 9, color: 'rojo' },
  { n: 10, color: 'negro' }, { n: 11, color: 'negro' }, { n: 12, color: 'rojo' },
  { n: 13, color: 'negro' }, { n: 14, color: 'rojo' }, { n: 15, color: 'negro' },
  { n: 16, color: 'rojo' }, { n: 17, color: 'negro' }, { n: 18, color: 'rojo' },
  { n: 19, color: 'rojo' }, { n: 20, color: 'negro' }, { n: 21, color: 'rojo' },
  { n: 22, color: 'negro' }, { n: 23, color: 'rojo' }, { n: 24, color: 'negro' },
  { n: 25, color: 'rojo' }, { n: 26, color: 'negro' }, { n: 27, color: 'rojo' },
  { n: 28, color: 'negro' }, { n: 29, color: 'negro' }, { n: 30, color: 'rojo' },
  { n: 31, color: 'negro' }, { n: 32, color: 'rojo' }, { n: 33, color: 'negro' },
  { n: 34, color: 'rojo' }, { n: 35, color: 'negro' }, { n: 36, color: 'rojo' }
];

// Baraja de 52 cartas para el War (el As es la más alta)
export const BARAJA_WAR = (() => {
  const palos = ['♠', '♥', '♦', '♣'];
  const figuras = [
    { nombre: '2', valor: 2 }, { nombre: '3', valor: 3 }, { nombre: '4', valor: 4 },
    { nombre: '5', valor: 5 }, { nombre: '6', valor: 6 }, { nombre: '7', valor: 7 },
    { nombre: '8', valor: 8 }, { nombre: '9', valor: 9 }, { nombre: '10', valor: 10 },
    { nombre: 'J', valor: 11 }, { nombre: 'Q', valor: 12 }, { nombre: 'K', valor: 13 }, { nombre: 'A', valor: 14 },
  ];
  const mazo = [];
  for (const p of palos) for (const f of figuras) mazo.push({ ...f, palo: p });
  return mazo;
})();
