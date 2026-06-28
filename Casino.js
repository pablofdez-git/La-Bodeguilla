import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registrarOObtenerJugador, sincronizarJugador, obtenerRanking } from './supabaseService';
import { Dices, Gamepad, Layers, Flame, Trophy, Minus, Plus, LogOut, AlertTriangle, RefreshCw, Users, Star } from 'lucide-react-native';

const AYUDA_TEXTOS = {
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

function ModalAyuda({ juego, onCerrar }) {
  if (!juego) return null;
  const info = AYUDA_TEXTOS[juego];
  return (
    <Modal transparent animationType="fade" visible={!!juego} onRequestClose={onCerrar}>
      <TouchableOpacity style={estilosModal.fondo} activeOpacity={1} onPress={onCerrar}>
        <TouchableOpacity activeOpacity={1} style={estilosModal.caja}>
          <Text style={estilosModal.titulo}>{info.titulo}</Text>
          <View style={estilosModal.separador} />
          {info.reglas.map((r, i) => (
            <View key={i} style={estilosModal.filaRegla}>
              <Text style={estilosModal.icono}>{r.icono}</Text>
              <Text style={estilosModal.textoRegla}>{r.texto}</Text>
            </View>
          ))}
          <View style={estilosModal.separador} />
          <Text style={estilosModal.pagos}>{info.pagos}</Text>
          <TouchableOpacity style={estilosModal.btnCerrar} onPress={onCerrar}>
            <Text style={estilosModal.txtBtnCerrar}>ENTENDIDO</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const estilosModal = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  caja: { backgroundColor: '#1C1130', borderRadius: 18, padding: 22, width: '100%', borderWidth: 1.5, borderColor: 'rgba(254,240,138,0.3)' },
  titulo: { color: '#FEF08A', fontWeight: '900', fontSize: 17, letterSpacing: 0.5, marginBottom: 14, textAlign: 'center' },
  separador: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  filaRegla: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  icono: { fontSize: 16, width: 22, textAlign: 'center', marginTop: 1 },
  textoRegla: { flex: 1, color: '#D1D5DB', fontSize: 13, fontWeight: '500', lineHeight: 19 },
  pagos: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  btnCerrar: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16, borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnCerrar: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});

// Componente de dado con puntos dibujados (evita emojis unicode que no contrastan en fondos oscuros)
const PUNTOS_DADO = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

function DadoVisual({ valor, size = 80, animando = false }) {
  const puntos = valor ? PUNTOS_DADO[valor] : [];
  return (
    <View style={{
      width: size, height: size,
      backgroundColor: animando ? '#fff' : '#F8F5FF',
      borderRadius: 14,
      borderWidth: 2.5,
      borderColor: animando ? '#F87171' : 'rgba(248,113,113,0.5)',
      position: 'relative',
      shadowColor: '#F87171',
      shadowOpacity: animando ? 0.6 : 0.15,
      shadowRadius: 8,
      elevation: 4,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {valor === null ? (
        <Text style={{ color: '#C4B5FD', fontSize: 28, fontWeight: '900' }}>?</Text>
      ) : (
        puntos.map((p, i) => (
          <View key={i} style={{
            position: 'absolute',
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: '#1C1130',
            left: (p[0] / 100) * size - (size * 0.08),
            top: (p[1] / 100) * size - (size * 0.08),
          }} />
        ))
      )}
    </View>
  );
}

// Ampliamos el array a 9 símbolos para diluir la probabilidad y subir la dificultad real
const SIMBOLOS_SLOTS = ['🍺', '🍷', '🥩', '💵', '💎', '🃏', '🔊', '🧊', '🥪'];

const NUMEROS_RULETA = [
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

function RenderizarCarta({ nombre, palo, oculta }) {
  if (oculta) {
    return (
      <View style={styles.cartaEstilo}>
        <Image
          source={require('./assets/Javicristo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const esRojo = palo === '♦' || palo === '♥';
  return (
    <View style={styles.cartaEstilo}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <Text style={[styles.textoCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{nombre}</Text>
        <Text style={[styles.paloCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      </View>
      <Text style={[styles.paloCartaCentral, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', transform: [{ rotate: '180deg' }] }}>
        <Text style={[styles.textoCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{nombre}</Text>
        <Text style={[styles.paloCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      </View>
    </View>
  );
}

export default function Casino() {
  const [juegoSeleccionado, setJuegoSeleccionado] = useState(null);

  // Estados del Blackjack originales
  const [enPartida, setEnPartida] = useState(false);
  const [repartiendo, setRepartiendo] = useState(false);
  const [baraja, setBaraja] = useState([]);
  const [manoJugador, setManoJugador] = useState([]);
  const [manoCrupier, setManoCrupier] = useState([]);
  const [resultadoTipo, setResultadoTipo] = useState('');
  const [mensajeResultado, setMensajeResultado] = useState('');
  const [verTapete, setVerTapete] = useState(false);

  // Sistema de monedas general y rachas
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaMaxima, setRachaMaxima] = useState(0);
  const [monedas, setMonedas] = useState(500);
  const [apuestaActual, setApuestaActual] = useState(50);


  // Estados de la Ruleta compacta
  const [fichaSeleccionada, setFichaSeleccionada] = useState(10);
  const [girandoRuleta, setGirandoRuleta] = useState(false);
  const [numeroGanadorRuleta, setNumeroGanadorRuleta] = useState(null);
  const [colorGanadorRuleta, setColorGanadorRuleta] = useState('#451A60');
  const [apuestasRuleta, setApuestasRuleta] = useState({ rojo: 0, negro: 0, par: 0, impar: 0, numeros: {} });

  const [mostrarOverlayRuleta, setMostrarOverlayRuleta] = useState(false);
  const [textoOverlayRuleta, setTextoOverlayRuleta] = useState('');
  const [colorOverlayFondo, setColorOverlayFondo] = useState('rgba(0,0,0,0.8)');

  // Estados de la Máquina Tragaperras
  const [slots, setSlots] = useState(['🍺', '🍷', '🥩']);
  const [girandoSlots, setGirandoSlots] = useState(false);
  const [apuestaSlots, setApuestaSlots] = useState(20);
  const [mensajeSlots, setMensajeSlots] = useState('');
  const [resultadoTipoSlots, setResultadoTipoSlots] = useState('');

  // Estados de los Dados (Craps simplificado)
  const [apuestaDados, setApuestaDados] = useState(20);
  const [dadosValores, setDadosValores] = useState([null, null]);
  const [dadosTirandose, setDadosTirandose] = useState(false);
  const [dadosPunto, setDadosPunto] = useState(null);
  const [dadosFase, setDadosFase] = useState('inicio'); // 'inicio' | 'punto'
  const [dadosMensaje, setDadosMensaje] = useState('');
  const [dadosResultadoTipo, setDadosResultadoTipo] = useState('');

  // Estados del Rasca y Gana
  const [rascaApuesta, setRascaApuesta] = useState(20);
  const [rascaCasillas, setRascaCasillas] = useState([]);
  const [rascaFase, setRascaFase] = useState('comprar'); // 'comprar' | 'rascando' | 'fin'
  const [rascaMensaje, setRascaMensaje] = useState('');
  const [rascaResultadoTipo, setRascaResultadoTipo] = useState('');

  // Estados del War (Carta Alta)
  const [warApuesta, setWarApuesta] = useState(20);
  const [warCartaJugador, setWarCartaJugador] = useState(null);
  const [warCartaCrupier, setWarCartaCrupier] = useState(null);
  const [warCartasGuerra, setWarCartasGuerra] = useState(null); // { jugador, crupier }
  const [warFase, setWarFase] = useState('inicio'); // 'inicio' | 'esperando' | 'empate' | 'guerra' | 'fin'
  const [warMensaje, setWarMensaje] = useState('');
  const [warResultadoTipo, setWarResultadoTipo] = useState(''); // 'ganado'|'perdido'|'empate'|''
  const [warAnimando, setWarAnimando] = useState(false);

  // Modal de ayuda
  const [modalAyuda, setModalAyuda] = useState(null);

  // ── Perfil y Ranking ────────────────────────────────────────────────────────
  const [pantallaActiva, setPantallaActiva] = useState('cargando'); // 'cargando' | 'registro' | 'juego' | 'ranking'
  const [nombreJugador, setNombreJugador] = useState('');
  const [inputNombre, setInputNombre] = useState('');
  const [bancarrotas, setBancarrotas] = useState(0);
  const [ranking, setRanking] = useState([]);
  const [cargandoRanking, setCargandoRanking] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState('');

  // Al montar: comprueba si ya hay nombre guardado localmente
  useEffect(() => {
    const init = async () => {
      try {
        const nombre = await AsyncStorage.getItem('@casino_nombre');
        const banca  = await AsyncStorage.getItem('@casino_bancarrotas');
        const monCachadas = await AsyncStorage.getItem('@bj_monedas');
        if (nombre) {
          setNombreJugador(nombre);
          if (banca) setBancarrotas(parseInt(banca, 10));
          if (monCachadas) setMonedas(parseInt(monCachadas, 10));
          setPantallaActiva('juego');
        } else {
          setPantallaActiva('registro');
        }
      } catch (_) {
        setPantallaActiva('registro');
      }
    };
    init();
  }, []);

  // Sincroniza con Supabase cada vez que cambian monedas o bancarrotas
  useEffect(() => {
    if (!nombreJugador || pantallaActiva === 'cargando' || pantallaActiva === 'registro') return;
    sincronizarJugador({ nombre: nombreJugador, monedas, bancarrotas })
      .catch(e => console.warn('Sync error:', e));
  }, [monedas, bancarrotas]);

  const confirmarNombre = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) { setErrorRegistro('Escribe tu nombre.'); return; }
    if (nombre.length < 2) { setErrorRegistro('Al menos 2 caracteres.'); return; }
    if (nombre.length > 20) { setErrorRegistro('Máximo 20 caracteres.'); return; }
    setRegistrando(true);
    setErrorRegistro('');
    const { ok, jugador, error } = await registrarOObtenerJugador(nombre);
    if (!ok) {
      setErrorRegistro('Error de conexión. Inténtalo de nuevo.');
      setRegistrando(false);
      return;
    }
    // Si el jugador ya existía en Supabase, cargamos sus monedas y bancarrotas
    const m = jugador.monedas ?? 500;
    const b = jugador.bancarrotas ?? 0;
    setNombreJugador(nombre);
    setMonedas(m);
    setBancarrotas(b);
    await AsyncStorage.setItem('@casino_nombre', nombre);
    await AsyncStorage.setItem('@casino_bancarrotas', b.toString());
    await AsyncStorage.setItem('@bj_monedas', m.toString());
    setRegistrando(false);
    setPantallaActiva('juego');
  };

  const cargarRanking = async () => {
    setCargandoRanking(true);
    try {
      const data = await obtenerRanking();
      setRanking(data || []);
    } catch (_) {
      Alert.alert('Error', 'No se pudo cargar el ranking.');
    } finally {
      setCargandoRanking(false);
    }
  };

  const guardarDatoCasinoLocal = async (clave, valor) => {
    try { await AsyncStorage.setItem(clave, valor.toString()); } catch (e) {}
  };

  const verificarAuxilioBancarrota = (saldoActual, esManoBJ = false) => {
    if (saldoActual <= 0) {
      const saldoAuxilio = 50;
      const nuevasBancarrotas = bancarrotas + 1;
      setMonedas(saldoAuxilio);
      setBancarrotas(nuevasBancarrotas);
      guardarDatoCasinoLocal('@bj_monedas', saldoAuxilio);
      guardarDatoCasinoLocal('@casino_bancarrotas', nuevasBancarrotas);
      if (esManoBJ) setApuestaActual(50);
      Alert.alert('💸 Bancarrota', `Has perdido todo. Se te asignan 50 monedas para reengancharte.\nBancarrotas totales: ${nuevasBancarrotas}`);
      return saldoAuxilio;
    }
    return saldoActual;
  };

  // Lógica original del Blackjack
  const inicializarBaraja = () => {
    const palos = ['♦', '♣', '♥', '♠'];
    const valores = [
      { nombre: 'A', valor: 11 }, { nombre: '2', valor: 2 }, { nombre: '3', valor: 3 },
      { nombre: '4', valor: 4 }, { nombre: '5', valor: 5 }, { nombre: '6', valor: 6 },
      { nombre: '7', valor: 7 }, { nombre: '8', valor: 8 }, { nombre: '9', valor: 9 },
      { nombre: '10', valor: 10 }, { nombre: 'J', valor: 10 }, { nombre: 'Q', valor: 10 }, { nombre: 'K', valor: 10 },
    ];
    let mazo = [];
    for (let p of palos) { for (let v of valores) { mazo.push({ ...v, palo: p }); } }
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    return mazo;
  };

  const calcularPuntos = (mano) => {
    let puntos = mano.reduce((tot, c) => tot + c.valor, 0);
    let ases = mano.filter(c => c.nombre === 'A').length;
    while (puntos > 21 && ases > 0) { puntos -= 10; ases -= 1; }
    return puntos;
  };

  const finalizarManoCasino = (resultado) => {
    let nuevasMonedas = monedas;
    let nuevaRacha = rachaActual;

    if (resultado === 'ganado') {
      nuevaRacha = rachaActual + 1;
      nuevasMonedas = monedas + apuestaActual;
      setRachaActual(nuevaRacha);
      guardarDatoCasinoLocal('@bj_racha_actual', nuevaRacha);

      if (nuevaRacha > rachaMaxima) {
        setRachaMaxima(nuevaRacha);
        guardarDatoCasinoLocal('@bj_racha_maxima', nuevaRacha);
      }
    } else if (resultado === 'perdido') {
      nuevaRacha = 0;
      nuevasMonedas = monedas - apuestaActual;
      setRachaActual(0);
      guardarDatoCasinoLocal('@bj_racha_actual', 0);
    }

    setMonedas(nuevasMonedas);
    guardarDatoCasinoLocal('@bj_monedas', nuevasMonedas);

    const saldoComprobado = verificarAuxilioBancarrota(nuevasMonedas, true);
    if (apuestaActual > saldoComprobado) setApuestaActual(saldoComprobado);
  };

  const iniciarPartidaBlackjack = () => {
    if (monedas < apuestaActual) {
      Alert.alert('Falta saldo', `No tienes suficientes monedas para la apuesta de ${apuestaActual}.`);
      return;
    }

    setVerTapete(true);
    setEnPartida(false);
    setRepartiendo(true);
    setResultadoTipo('');
    setMensajeResultado('');

    const mazoNuevo = inicializarBaraja();
    const cJ1 = mazoNuevo.pop();
    const cC1 = mazoNuevo.pop();
    const cJ2 = mazoNuevo.pop();
    const cC2 = mazoNuevo.pop();

    setManoJugador([cJ1]);
    setManoCrupier([cC1]);
    setBaraja(mazoNuevo);

    setTimeout(() => { setManoJugador([cJ1, cJ2]); }, 400);

    setTimeout(() => {
      const manoInicialJugador = [cJ1, cJ2];
      const manoInicialCrupier = [cC1, cC2];

      setManoCrupier(manoInicialCrupier);
      setRepartiendo(false);

      const puntosJ = calcularPuntos(manoInicialJugador);
      const puntosC = calcularPuntos(manoInicialCrupier);

      if (puntosJ === 21 || puntosC === 21) {
        setEnPartida(false);
        if (puntosJ === 21 && puntosC === 21) {
          setResultadoTipo('empate');
          setMensajeResultado('🤝 Doble Blackjack Natural. Empate en la mesa.');
          finalizarManoCasino('empate');
        } else if (puntosJ === 21) {
          setResultadoTipo('ganado');
          setMensajeResultado('🎉 ¡BLACKJACK NATURAL! Ganas la mano.');
          finalizarManoCasino('ganado');
        } else {
          setResultadoTipo('perdido');
          setMensajeResultado('❌ Blackjack del crupier. Gana la casa.');
          finalizarManoCasino('perdido');
        }
      } else {
        setEnPartida(true);
      }
    }, 800);
  };

  const pedirCarta = () => {
    if (!enPartida || repartiendo) return;
    const mazoCopia = [...baraja];
    const nuevaCarta = mazoCopia.pop();
    const nuevaMano = [...manoJugador, nuevaCarta];

    setManoJugador(nuevaMano);
    setBaraja(mazoCopia);

    if (calcularPuntos(nuevaMano) > 21) {
      setResultadoTipo('perdido');
      setMensajeResultado('Te has pasado de 21. Gana la casa.');
      setEnPartida(false);
      finalizarManoCasino('perdido');
    }
  };

  const plantarse = () => {
    if (!enPartida || repartiendo) return;
    let mazoCopia = [...baraja];
    let manoC = [...manoCrupier];

    const ejecutarTurnoCrupier = () => {
      let puntosJ = calcularPuntos(manoJugador);
      let puntosC = calcularPuntos(manoC);

      if (puntosC < 17 || (puntosC < puntosJ && puntosC <= 21)) {
        const nuevaCarta = mazoCopia.pop();
        manoC.push(nuevaCarta);
        setManoCrupier([...manoC]);
        setBaraja(mazoCopia);
        setTimeout(ejecutarTurnoCrupier, 600);
      } else {
        setEnPartida(false);
        let finalRes = '';
        if (puntosC > 21) {
          finalRes = 'ganado';
          setMensajeResultado('El crupier se ha pasado. Victoria para ti.');
        } else if (puntosJ > puntosC) {
          finalRes = 'ganado';
          setMensajeResultado('Mayor puntuación. Has ganado la mano.');
        } else if (puntosC > puntosJ) {
          finalRes = 'perdido';
          setMensajeResultado('El crupier tiene mejor mano. Gana la casa.');
        } else {
          finalRes = 'empate';
          setMensajeResultado('Empate técnico en la mesa.');
        }
        setResultadoTipo(finalRes);
        finalizarManoCasino(finalRes);
      }
    };
    ejecutarTurnoCrupier();
  };

  // Lógica de la Ruleta
  const calcularTotalApostadoRuleta = () => {
    let total = apuestasRuleta.rojo + apuestasRuleta.negro + apuestasRuleta.par + apuestasRuleta.impar;
    Object.values(apuestasRuleta.numeros).forEach(v => { total += v; });
    return total;
  };

  const agregarApuestaRuleta = (tipo, numero = null) => {
    if (girandoRuleta) return;
    if (monedas < fichaSeleccionada) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas.');
      return;
    }
    const nuevoSaldo = monedas - fichaSeleccionada;
    setMonedas(nuevoSaldo);
    guardarDatoCasinoLocal('@bj_monedas', nuevoSaldo);
    setApuestasRuleta(prev => {
      if (numero !== null) {
        const nuevosNumeros = { ...prev.numeros };
        nuevosNumeros[numero] = (nuevosNumeros[numero] || 0) + fichaSeleccionada;
        return { ...prev, numeros: nuevosNumeros };
      } else { return { ...prev, [tipo]: prev[tipo] + fichaSeleccionada }; }
    });
  };

  const limpiarTapeteRuleta = () => {
    if (girandoRuleta) return;
    const devuelto = calcularTotalApostadoRuleta();
    if (devuelto > 0) {
      const saldoRestaurado = monedas + devuelto;
      setMonedas(saldoRestaurado);
      guardarDatoCasinoLocal('@bj_monedas', saldoRestaurado);
    }
    setApuestasRuleta({ rojo: 0, negro: 0, par: 0, impar: 0, numeros: {} });
    setNumeroGanadorRuleta(null);
    setColorGanadorRuleta('#451A60');
  };

  const lanzarBolaRuleta = () => {
    const totalJugado = calcularTotalApostadoRuleta();
    if (totalJugado === 0) {
      Alert.alert('Tapete vacío', 'Coloca alguna ficha antes de tirar.');
      return;
    }
    setGirandoRuleta(true);

    let velocidad = 50;
    let duracionTotal = 0;

    const simularGiroProgresivo = () => {
      const indiceFalso = Math.floor(Math.random() * 37);
      const itemFalso = NUMEROS_RULETA.find(r => r.n === indiceFalso);
      setNumeroGanadorRuleta(indiceFalso);
      setColorGanadorRuleta(itemFalso.color === 'rojo' ? '#b91c1c' : itemFalso.color === 'negro' ? '#1c1c1e' : '#15803d');

      duracionTotal += velocidad;
      if (duracionTotal < 3200) {
        if (duracionTotal > 2000) velocidad += 45;
        setTimeout(simularGiroProgresivo, velocidad);
      } else {
        const bola = Math.floor(Math.random() * 37);
        const datosPremio = NUMEROS_RULETA.find(r => r.n === bola);
        setNumeroGanadorRuleta(bola);

        const hexColor = datosPremio.color === 'rojo' ? '#b91c1c' : datosPremio.color === 'negro' ? '#1c1c1e' : '#15803d';
        setColorGanadorRuleta(hexColor);

        let balancePremios = 0;
        if (bola !== 0) {
          if (datosPremio.color === 'rojo') balancePremios += apuestasRuleta.rojo * 2;
          if (datosPremio.color === 'negro') balancePremios += apuestasRuleta.negro * 2;
          if (bola % 2 === 0) balancePremios += apuestasRuleta.par * 2;
          if (bola % 2 !== 0) balancePremios += apuestasRuleta.impar * 2;
        }
        if (apuestasRuleta.numeros[bola]) balancePremios += apuestasRuleta.numeros[bola] * 36;

        const saldoFinalCasino = monedas + balancePremios;
        setMonedas(saldoFinalCasino);
        guardarDatoCasinoLocal('@bj_monedas', saldoFinalCasino);

        const rgbaTranslucido = datosPremio.color === 'rojo' ? 'rgba(185, 28, 28, 0.5)' : datosPremio.color === 'negro' ? 'rgba(28, 28, 30, 0.65)' : 'rgba(21, 128, 61, 0.6)';
        setColorOverlayFondo(rgbaTranslucido);

        if (balancePremios > 0) {
          setTextoOverlayRuleta(`¡HAS GANADO!\n+${balancePremios} MONEDAS`);
        } else {
          setTextoOverlayRuleta(`GANA LA CASA\nHas perdido tu apuesta`);
        }
        setMostrarOverlayRuleta(true);

        setApuestasRuleta({ rojo: 0, negro: 0, par: 0, impar: 0, numeros: {} });
        setGirandoRuleta(false);
        verificarAuxilioBancarrota(saldoFinalCasino);
      }
    };
    setTimeout(simularGiroProgresivo, velocidad);
  };

  const cerrarResultadoOverlay = () => {
    setMostrarOverlayRuleta(false);
    setNumeroGanadorRuleta(null);
    setColorGanadorRuleta('#451A60');
  };

  // Lógica de las Tragaperras
  const jugarTragaperras = () => {
    if (monedas < apuestaSlots) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas para jugar.');
      return;
    }
    setGirandoSlots(true);
    setMensajeSlots('');
    setResultadoTipoSlots('');

    let saldoResta = monedas - apuestaSlots;
    setMonedas(saldoResta);
    guardarDatoCasinoLocal('@bj_monedas', saldoResta);

    let iteracion = 0;
    const intervalo = setInterval(() => {
      setSlots([
        SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
        SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
        SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
      ]);
      iteracion++;

      if (iteracion > 15) {
        clearInterval(intervalo);

        const finalSlots = [
          SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
          SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
          SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)],
        ];
        setSlots(finalSlots);
        const bola = finalSlots[0];

        let balancePremios = 0;

        // Comprobar combinaciones con la nueva dificultad diluida
        if (finalSlots[0] === finalSlots[1] && finalSlots[1] === finalSlots[2]) {
          // 3 Iguales: Premio Gordo
          if (bola === '💎') balancePremios += apuestaSlots * 60;
          else if (bola === '💵') balancePremios += apuestaSlots * 40;
          else if (bola === '🥩' || bola === '🥪') balancePremios += apuestaSlots * 25;
          else balancePremios += apuestaSlots * 15;
        } else if (finalSlots[0] === finalSlots[1] || finalSlots[1] === finalSlots[2] || finalSlots[0] === finalSlots[2]) {
          // 2 Iguales: Reintegro / Premio Menor
          balancePremios += Math.floor(apuestaSlots * 2);
        }

        const saldoFinalCasino = saldoResta + balancePremios;
        setMonedas(saldoFinalCasino);
        guardarDatoCasinoLocal('@bj_monedas', saldoFinalCasino);

        if (balancePremios > 0) {
          setResultadoTipoSlots('ganado');
          setMensajeSlots(`🎉 ¡PREMIO! +${balancePremios} monedas`);
        } else {
          setResultadoTipoSlots('perdido');
          setMensajeSlots('❌ Sin premio. ¡Dale otra vez!');
          verificarAuxilioBancarrota(saldoFinalCasino);
        }

        setGirandoSlots(false);
      }
    }, 100);
  };

  // ─── LÓGICA DADOS (CRAPS SIMPLIFICADO) ───────────────────────────────────────
  const tirarDados = () => {
    if (dadosTirandose) return;
    if (dadosFase === 'inicio' && monedas < apuestaDados) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas para jugar.');
      return;
    }

    setDadosTirandose(true);
    setDadosMensaje('');
    setDadosResultadoTipo('');

    // Descontar apuesta solo en la tirada inicial
    let saldoBase = monedas;
    if (dadosFase === 'inicio') {
      saldoBase = monedas - apuestaDados;
      setMonedas(saldoBase);
      guardarDatoCasinoLocal('@bj_monedas', saldoBase);
    }

    // Animación de dados sacudiendo
    let tick = 0;
    const animInterval = setInterval(() => {
      setDadosValores([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
      tick++;
      if (tick >= 10) {
        clearInterval(animInterval);

        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        const suma = d1 + d2;
        setDadosValores([d1, d2]);
        setDadosTirandose(false);

        if (dadosFase === 'inicio') {
          if (suma === 7 || suma === 11) {
            // Gana al instante
            const premio = saldoBase + apuestaDados * 2;
            setMonedas(premio);
            guardarDatoCasinoLocal('@bj_monedas', premio);
            setDadosMensaje(`🎲 ¡${suma}! Victoria natural. +${apuestaDados * 2} monedas`);
            setDadosResultadoTipo('ganado');
            setDadosFase('inicio');
            verificarAuxilioBancarrota(premio);
          } else if (suma === 2 || suma === 3 || suma === 12) {
            // Craps, pierde al instante
            const saldoFinal = verificarAuxilioBancarrota(saldoBase);
            setMonedas(saldoFinal);
            setDadosMensaje(`💀 ¡Craps! ${suma} — la casa gana.`);
            setDadosResultadoTipo('perdido');
            setDadosFase('inicio');
          } else {
            // Establece punto
            setDadosPunto(suma);
            setDadosFase('punto');
            setDadosMensaje(`🎯 Punto: ${suma}. ¡Sácalo antes que el 7!`);
          }
        } else {
          // Fase punto
          if (suma === dadosPunto) {
            const premio = saldoBase + apuestaDados * 2;
            setMonedas(premio);
            guardarDatoCasinoLocal('@bj_monedas', premio);
            setDadosMensaje(`🏆 ¡${suma}! Punto conseguido. +${apuestaDados * 2} monedas`);
            setDadosResultadoTipo('ganado');
            setDadosFase('inicio');
            setDadosPunto(null);
          } else if (suma === 7) {
            const saldoFinal = verificarAuxilioBancarrota(saldoBase);
            setMonedas(saldoFinal);
            setDadosMensaje(`💀 ¡7! La casa gana. Punto perdido.`);
            setDadosResultadoTipo('perdido');
            setDadosFase('inicio');
            setDadosPunto(null);
          } else {
            setDadosMensaje(`🎲 ${suma}. Punto sigue siendo ${dadosPunto}, sigue tirando.`);
            setDadosResultadoTipo('');
          }
        }
      }
    }, 80);
  };

  const resetearDados = () => {
    setDadosValores([null, null]);
    setDadosFase('inicio');
    setDadosPunto(null);
    setDadosMensaje('');
    setDadosResultadoTipo('');
  };

  // ─── LÓGICA RASCA Y GANA ─────────────────────────────────────────────────────
  // 9 símbolos para controlar bien las probabilidades
  const SIMBOLOS_RASCA = ['🍺', '🍷', '🥩', '💎', '💵', '🃏', '🎯', '🍋', '🔔'];

  const comprarRasca = () => {
    if (monedas < rascaApuesta) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas para comprar el cartón.');
      return;
    }
    const saldoResta = monedas - rascaApuesta;
    setMonedas(saldoResta);
    guardarDatoCasinoLocal('@bj_monedas', saldoResta);

    const rand = Math.random();
    let simbolos;

    if (rand < 0.08) {
      // 8% — trifecta: exactamente 3 iguales, los otros 3 todos distintos entre sí y distintos al ganador
      const ganador = SIMBOLOS_RASCA[Math.floor(Math.random() * SIMBOLOS_RASCA.length)];
      const resto = [...SIMBOLOS_RASCA.filter(s => s !== ganador)].sort(() => Math.random() - 0.5);
      simbolos = [ganador, ganador, ganador, resto[0], resto[1], resto[2]];

    } else if (rand < 0.43) {
      // 35% — par exacto: exactamente 2 iguales, los otros 4 todos distintos entre sí y al ganador
      const ganador = SIMBOLOS_RASCA[Math.floor(Math.random() * SIMBOLOS_RASCA.length)];
      const resto = [...SIMBOLOS_RASCA.filter(s => s !== ganador)].sort(() => Math.random() - 0.5);
      simbolos = [ganador, ganador, resto[0], resto[1], resto[2], resto[3]];

    } else {
      // 57% — sin premio: 6 símbolos todos distintos (imposible par ni trío)
      simbolos = [...SIMBOLOS_RASCA].sort(() => Math.random() - 0.5).slice(0, 6);
    }

    // Mezclar posiciones para que el resultado no sea predecible visualmente
    for (let i = simbolos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [simbolos[i], simbolos[j]] = [simbolos[j], simbolos[i]];
    }

    setRascaCasillas(simbolos.map(s => ({ simbolo: s, revelada: false })));
    setRascaFase('rascando');
    setRascaMensaje('Toca cada casilla para rascar...');
    setRascaResultadoTipo('');
  };

  const rascarCasilla = (index) => {
    if (rascaFase !== 'rascando') return;
    const nuevas = rascaCasillas.map((c, i) => i === index ? { ...c, revelada: true } : c);
    setRascaCasillas(nuevas);

    // Si todas reveladas, calcular premio
    const todasReveladas = nuevas.every(c => c.revelada);
    if (todasReveladas) {
      const simbolosRevelados = nuevas.map(c => c.simbolo);
      const conteo = {};
      simbolosRevelados.forEach(s => { conteo[s] = (conteo[s] || 0) + 1; });
      const maxIguales = Math.max(...Object.values(conteo));
      const simboloGanador = Object.keys(conteo).find(k => conteo[k] === maxIguales);

      let premio = 0;
      let msg = '';
      if (maxIguales >= 3) {
        const mult = simboloGanador === '💎' ? 80 : simboloGanador === '💵' ? 40 : 20;
        premio = rascaApuesta * mult;
        msg = `🎉 ¡TRIFECTA! ${simboloGanador}×3 — +${premio} monedas`;
        setRascaResultadoTipo('ganado');
      } else if (maxIguales === 2) {
        premio = rascaApuesta * 4;
        msg = `✨ Par de ${simboloGanador} — +${premio} monedas`;
        setRascaResultadoTipo('ganado');
      } else {
        msg = '❌ Sin premio. ¡Prueba otro cartón!';
        setRascaResultadoTipo('perdido');
      }

      if (premio > 0) {
        const nuevoSaldo = monedas + premio;
        setMonedas(nuevoSaldo);
        guardarDatoCasinoLocal('@bj_monedas', nuevoSaldo);
        verificarAuxilioBancarrota(nuevoSaldo);
      } else {
        verificarAuxilioBancarrota(monedas);
      }
      setRascaMensaje(msg);
      setRascaFase('fin');
    }
  };

  const rascaRevelarTodo = () => {
    if (rascaFase !== 'rascando') return;
    const nuevas = rascaCasillas.map(c => ({ ...c, revelada: true }));
    setRascaCasillas(nuevas);

    const simbolosRevelados = nuevas.map(c => c.simbolo);
    const conteo = {};
    simbolosRevelados.forEach(s => { conteo[s] = (conteo[s] || 0) + 1; });
    const maxIguales = Math.max(...Object.values(conteo));
    const simboloGanador = Object.keys(conteo).find(k => conteo[k] === maxIguales);

    let premio = 0;
    let msg = '';
    if (maxIguales >= 3) {
      const mult = simboloGanador === '💎' ? 80 : simboloGanador === '💵' ? 40 : 20;
      premio = rascaApuesta * mult;
      msg = `🎉 ¡TRIFECTA! ${simboloGanador}×3 — +${premio} monedas`;
      setRascaResultadoTipo('ganado');
    } else if (maxIguales === 2) {
      premio = rascaApuesta * 4;
      msg = `✨ Par de ${simboloGanador} — +${premio} monedas`;
      setRascaResultadoTipo('ganado');
    } else {
      msg = '❌ Sin premio. ¡Prueba otro cartón!';
      setRascaResultadoTipo('perdido');
    }

    if (premio > 0) {
      const nuevoSaldo = monedas + premio;
      setMonedas(nuevoSaldo);
      guardarDatoCasinoLocal('@bj_monedas', nuevoSaldo);
    } else {
      verificarAuxilioBancarrota(monedas);
    }
    setRascaMensaje(msg);
    setRascaFase('fin');
  };

  const nuevaRasca = () => {
    setRascaCasillas([]);
    setRascaFase('comprar');
    setRascaMensaje('');
    setRascaResultadoTipo('');
  };

  // ─── LÓGICA WAR (CARTA ALTA) ──────────────────────────────────────────────────
  const BARAJA_WAR = (() => {
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

  // Saca N cartas distintas del mazo (sin repetición dentro de la misma mano)
  const cartasAleatorias = (n) => {
    const copia = [...BARAJA_WAR].sort(() => Math.random() - 0.5);
    return copia.slice(0, n);
  };

  const mejorCarta = (cartas) => cartas.reduce((m, c) => c.valor > m.valor ? c : m);

  const jugarWar = () => {
    if (monedas < warApuesta) { Alert.alert('Falta saldo', 'No tienes suficientes monedas.'); return; }
    setWarAnimando(true);
    setWarMensaje('');
    setWarResultadoTipo('');
    setWarCartasGuerra(null);

    const saldoResta = monedas - warApuesta;
    setMonedas(saldoResta);
    guardarDatoCasinoLocal('@bj_monedas', saldoResta);

    setTimeout(() => {
      // Cada uno recibe 3 cartas; gana quien tenga la carta más alta
      const mazoMezclado = [...BARAJA_WAR].sort(() => Math.random() - 0.5);
      const cartasJugador = mazoMezclado.slice(0, 3);
      const cartasCrupier = mazoMezclado.slice(3, 6);
      const cJugador = mejorCarta(cartasJugador);
      const cCrupier = mejorCarta(cartasCrupier);

      // Guardamos todas las cartas para mostrarlas
      setWarCartaJugador({ ...cJugador, extras: cartasJugador.filter(c => c !== cJugador) });
      setWarCartaCrupier({ ...cCrupier, extras: cartasCrupier.filter(c => c !== cCrupier) });
      setWarAnimando(false);

      if (cJugador.valor > cCrupier.valor) {
        // Gana: devuelve la apuesta + x3 (neto +2x)
        const premio = saldoResta + warApuesta * 3;
        setMonedas(premio);
        guardarDatoCasinoLocal('@bj_monedas', premio);
        setWarMensaje(`🏆 ¡Tu ${cJugador.nombre}${cJugador.palo} supera al ${cCrupier.nombre}${cCrupier.palo}! +${warApuesta * 3} monedas`);
        setWarResultadoTipo('ganado');
        setWarFase('fin');
      } else if (cJugador.valor < cCrupier.valor) {
        const saldoFin = verificarAuxilioBancarrota(saldoResta);
        setMonedas(saldoFin);
        setWarMensaje(`💀 Tu ${cJugador.nombre}${cJugador.palo} pierde ante el ${cCrupier.nombre}${cCrupier.palo}`);
        setWarResultadoTipo('perdido');
        setWarFase('fin');
      } else {
        // Empate en carta alta → opción de ir a la guerra
        setWarMensaje(`⚔️ ¡EMPATE en ${cJugador.nombre}! ¿Vas a LA GUERRA?`);
        setWarResultadoTipo('empate');
        setWarFase('empate');
      }
    }, 600);
  };

  const irAGuerra = () => {
    if (monedas < warApuesta) { Alert.alert('Falta saldo', 'No tienes monedas para doblar la apuesta.'); return; }
    setWarAnimando(true);
    setWarMensaje('');

    // Paga otra apuesta igual — ahora tiene 2x en juego
    const saldoResta = monedas - warApuesta;
    setMonedas(saldoResta);
    guardarDatoCasinoLocal('@bj_monedas', saldoResta);

    setTimeout(() => {
      const mazoMezclado = [...BARAJA_WAR].sort(() => Math.random() - 0.5);
      const cJugador = mazoMezclado[0];
      const cCrupier = mazoMezclado[1];
      setWarCartasGuerra({ jugador: cJugador, crupier: cCrupier });
      setWarAnimando(false);

      if (cJugador.valor >= cCrupier.valor) {
        // Gana la guerra: devuelve las 2 apuestas + x6 sobre la apuesta original (premio gordo)
        const premio = saldoResta + warApuesta * 6;
        setMonedas(premio);
        guardarDatoCasinoLocal('@bj_monedas', premio);
        setWarMensaje(`🔥 ¡GUERRA GANADA! ${cJugador.nombre}${cJugador.palo} vs ${cCrupier.nombre}${cCrupier.palo} · +${warApuesta * 6} monedas`);
        setWarResultadoTipo('ganado');
      } else {
        const saldoFin = verificarAuxilioBancarrota(saldoResta);
        setMonedas(saldoFin);
        setWarMensaje(`💀 Guerra perdida. ${cJugador.nombre}${cJugador.palo} < ${cCrupier.nombre}${cCrupier.palo}`);
        setWarResultadoTipo('perdido');
      }
      setWarFase('fin');
    }, 700);
  };

  const rendirse = () => {
    // Recupera la mitad de la apuesta original
    const recuperado = Math.floor(warApuesta / 2);
    const saldoFin = monedas + recuperado;
    setMonedas(saldoFin);
    guardarDatoCasinoLocal('@bj_monedas', saldoFin);
    setWarMensaje(`🏳️ Te rindes. Recuperas ${recuperado} monedas.`);
    setWarResultadoTipo('perdido');
    setWarFase('fin');
    verificarAuxilioBancarrota(saldoFin);
  };

  const resetearWar = () => {
    setWarCartaJugador(null);
    setWarCartaCrupier(null);
    setWarCartasGuerra(null);
    setWarFase('inicio');
    setWarMensaje('');
    setWarResultadoTipo('');
    setWarAnimando(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1923' }}>


      {/* ── PANTALLA CARGANDO ──────────────────────────────────────────────── */}
      {pantallaActiva === 'cargando' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color="#FEF08A" size="large" />
          <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Cargando...</Text>
        </View>
      )}

      {/* ── PANTALLA REGISTRO (primer arranque) ───────────────────────────── */}
      {pantallaActiva === 'registro' && (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#0F1923' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 28, paddingTop: 60, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🎰</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 3, marginBottom: 6 }}>LA BODEGUILLA</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>CASINO DEL PUEBLO</Text>
          </View>

          <View style={{ backgroundColor: '#1C1130', borderRadius: 16, padding: 22, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', gap: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>¿CÓMO TE LLAMAS?</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
              Tu nombre se guarda en este dispositivo y en el ranking compartido. No podrás cambiarlo después.
            </Text>

            <TextInput
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: errorRegistro ? '#EF4444' : 'rgba(124,58,237,0.5)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' }}
              placeholder="Nombre..."
              placeholderTextColor="#4B5563"
              value={inputNombre}
              onChangeText={t => { setInputNombre(t); setErrorRegistro(''); }}
              maxLength={20}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmarNombre}
            />

            {errorRegistro ? (
              <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{errorRegistro}</Text>
            ) : null}

            <TouchableOpacity
              disabled={registrando}
              onPress={confirmarNombre}
              style={{ backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6', opacity: registrando ? 0.7 : 1 }}
            >
              {registrando
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>ENTRAR AL CASINO →</Text>}
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Empiezas con 500 monedas · Gratis · Sin trampas (bueno...)
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── PANTALLA RANKING ───────────────────────────────────────────────── */}
      {pantallaActiva === 'ranking' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 48 }} style={{ backgroundColor: '#0F1923' }}>
          {/* Cabecera */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 }}>
            <TouchableOpacity onPress={() => setPantallaActiva('juego')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '300' }}>‹</Text>
            </TouchableOpacity>
            <Trophy size={20} color="#FEF08A" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, flex: 1 }}>RANKING</Text>
            <TouchableOpacity onPress={cargarRanking} style={{ padding: 8 }}>
              <RefreshCw size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Leyenda fórmula */}
          <View style={{ backgroundColor: 'rgba(254,240,138,0.06)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(254,240,138,0.15)', marginBottom: 20 }}>
            <Text style={{ color: '#FEF08A', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 }}>
              Puntos = monedas × (1 − bancarrotas × 0.08) · mínimo ×0.2
            </Text>
          </View>

          {cargandoRanking ? (
            <ActivityIndicator color="#FEF08A" size="large" style={{ marginTop: 40 }} />
          ) : (
            <View style={{ gap: 8 }}>
              {ranking.map((j, idx) => {
                const medalla = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                const esTu = j.nombre === nombreJugador;
                return (
                  <View key={j.nombre} style={{
                    backgroundColor: esTu ? 'rgba(124,58,237,0.18)' : '#1C1130',
                    borderRadius: 12, padding: 14, borderWidth: 1,
                    borderColor: esTu ? 'rgba(124,58,237,0.7)' : idx < 3 ? 'rgba(254,240,138,0.2)' : 'rgba(91,50,129,0.3)',
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    {/* Posición */}
                    <View style={{ width: 34, alignItems: 'center' }}>
                      {medalla
                        ? <Text style={{ fontSize: 22 }}>{medalla}</Text>
                        : <Text style={{ color: '#6B7280', fontWeight: '900', fontSize: 14 }}>#{idx + 1}</Text>}
                    </View>

                    {/* Nombre */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                        {j.nombre}{esTu ? ' 👈' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>🪙 {j.monedas}</Text>
                        {j.bancarrotas > 0 && (
                          <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '600' }}>💸 ×{j.bancarrotas}</Text>
                        )}
                      </View>
                    </View>

                    {/* Puntuación */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#FEF08A', fontWeight: '900', fontSize: 18 }}>{j.puntuacion}</Text>
                      <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '600' }}>pts</Text>
                    </View>
                  </View>
                );
              })}

              {ranking.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                  <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                    Aún no hay nadie en el ranking.{'\n'}¡Sé el primero en jugar!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── PANTALLA DE JUEGO ──────────────────────────────────────────────── */}
      {pantallaActiva === 'juego' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} style={{ backgroundColor: '#0F1923' }}>
          <View style={styles.tableroCasinoPremium}>

            <ModalAyuda juego={modalAyuda} onCerrar={() => setModalAyuda(null)} />

            {/* HUD Superior */}
            <View style={styles.cabeceraCasinoMesa}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Dices size={18} color="#FEF08A" />
                <Text style={styles.txtMesaPremiumTitulo}>LA BODEGUILLA</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => { cargarRanking(); setPantallaActiva('ranking'); }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(254,240,138,0.08)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <Trophy size={14} color="#FEF08A" />
                </TouchableOpacity>
                <View style={styles.hudMonedasPill}>
                  <Text style={{ color: '#C4B5FD', fontWeight: '700', fontSize: 11, marginRight: 5 }}>{nombreJugador}</Text>
                  <Text style={{ color: '#FEF08A', fontSize: 13 }}>🪙</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, marginLeft: 4 }}>{monedas}</Text>
                </View>
              </View>
            </View>

        {/* LOBBY INICIAL CON FILAS RECTANGULARES VERTICALES COMPACTAS */}
        {juegoSeleccionado === null && (
          <View style={styles.lobbyCasinoListaVertical}>

            {/* Tarjeta Rectangular 1: Blackjack */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => setJuegoSeleccionado('blackjack')} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.iconoTarjetaCirculo}>
                  <Layers size={22} color="#FEF08A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>BLACK JACK</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>La mesa clásica · Apuesta libre</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
              <View style={styles.miniContenedorRachasFila}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Flame size={11} color="#EAB308" />
                  <Text style={styles.txtMiniRachaText}>Racha: {rachaActual}</Text>
                </View>
                <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Trophy size={11} color="#34C759" />
                  <Text style={styles.txtMiniRachaText}>Récord: {rachaMaxima}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 2: Ruleta */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => setJuegoSeleccionado('ruleta')} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconoTarjetaCirculo, { backgroundColor: 'rgba(21,128,61,0.25)', borderColor: 'rgba(21,128,61,0.5)' }]}>
                  <RefreshCw size={22} color="#4ADE80" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>RULETA EUROPEA</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>Tapete táctil · Paga x36 al número</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 3: Tragaperras */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => setJuegoSeleccionado('tragaperras')} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconoTarjetaCirculo, { backgroundColor: 'rgba(180,83,9,0.25)', borderColor: 'rgba(180,83,9,0.5)' }]}>
                  <Gamepad size={22} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>CUBATAS JACKPOT</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>Tragaperras · 9 símbolos · x60 al trifecta</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 4: Dados */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => { resetearDados(); setJuegoSeleccionado('dados'); }} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconoTarjetaCirculo, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }]}>
                  <Dices size={22} color="#F87171" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>DADOS — CRAPS</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>7 u 11 ganas · 2, 3, 12 pierdes · x2 apuesta</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 5: Rasca y Gana */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => { nuevaRasca(); setJuegoSeleccionado('rasca'); }} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconoTarjetaCirculo, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' }]}>
                  <AlertTriangle size={22} color="#34D399" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>RASCA Y GANA</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>6 casillas · Par x2 · Trifecta hasta x50</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 6: War */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => { resetearWar(); setJuegoSeleccionado('war'); }} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.iconoTarjetaCirculo, { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.4)' }]}>
                  <Layers size={22} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txtTituloTarjetaJuego}>WAR — CARTA ALTA</Text>
                  <Text style={styles.txtSubtituloTarjetaJuego}>Tú vs crupier · Empate → ¡a la guerra! · x2</Text>
                </View>
                <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
              </View>
            </TouchableOpacity>

          </View>
        )}

        {/* JUEGO 1: BLACKJACK EN ACCIÓN */}
        {juegoSeleccionado === 'blackjack' && (
          <View style={{ width: '100%' }}>
            {!verTapete ? (
              <View style={styles.lobbyCasinoCaja}>
                <View style={styles.tarjetaBlancaLobbyBase}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Layers size={20} color="#FEF08A" />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1, flex: 1 }}>MESA DE BLACKJACK</Text>
                    <TouchableOpacity onPress={() => setModalAyuda('blackjack')} style={styles.btnAyuda}>
                      <Text style={styles.txtBtnAyuda}>?</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cajaEstadisticasRachas}>
                    <View style={styles.filaRachaStat}>
                      <Flame size={15} color="#EAB308" />
                      <Text style={styles.txtRachaStatLabel}>Racha actual</Text>
                      <Text style={styles.txtRachaStatValor}>{rachaActual}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 }} />
                    <View style={styles.filaRachaStat}>
                      <Trophy size={13} color="#34C759" />
                      <Text style={styles.txtRachaStatLabel}>Récord personal</Text>
                      <Text style={styles.txtRachaStatValor}>{rachaMaxima}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#aaa' }}>Apuesta:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaActual(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
                      <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{apuestaActual}</Text>
                      <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaActual(a => Math.min(monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setApuestaActual(monedas)} style={styles.btnTodoIn}>
                      <Text style={styles.txtBtnTodoIn}>TODO</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.btnIniciarJuegoPremium} onPress={iniciarPartidaBlackjack}>
                    <Text style={styles.txtBtnJuegoText}>REPARTIR CARTAS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnRegresarLobbyMenu} onPress={() => setJuegoSeleccionado(null)}>
                    <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 13 }}>← Volver al menú</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.contenedorMesaFondoVerdeReal}>

                <View style={styles.zonaJugadorFila}>
                  <Text style={styles.txtMarcadorEtiqueta}>CRUPIER BANCA ({!enPartida && !repartiendo ? `${calcularPuntos(manoCrupier)} PTS` : '???'})</Text>
                  <View style={styles.filaCartasContenedor}>
                    {manoCrupier.map((carta, index) => <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={enPartida && index === 1} />)}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 10 }}>
                  <View style={[styles.lineaMesaSeparador, { width: '30%' }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(91,50,129,0.4)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 }}>
                    <Flame size={12} color="#EAB308" />
                    <Text style={{ color: '#E2D5EE', fontSize: 10, fontWeight: '900' }}>RACHA: {rachaActual}</Text>
                  </View>
                  <View style={[styles.lineaMesaSeparador, { width: '30%' }]} />
                </View>

                <View style={styles.zonaJugadorFila}>
                  <Text style={styles.txtMarcadorEtiqueta}>TU MANO ({calcularPuntos(manoJugador)} PTS)</Text>
                  <View style={styles.filaCartasContenedor}>
                    {manoJugador.map((carta, index) => <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={false} />)}
                  </View>
                </View>

                {/* BANNER DE RESULTADO FIJO CON CONTENEDOR SIEMPRE RENDERIZADO */}
                <View style={[
                  styles.bannerResultadoFino,
                  {
                    backgroundColor: mensajeResultado ? (resultadoTipo === 'ganado' ? '#DEF7EC' : resultadoTipo === 'perdido' ? '#FDE8E8' : '#FEF08A') : 'transparent',
                    borderColor: mensajeResultado ? (resultadoTipo === 'ganado' ? '#34C759' : resultadoTipo === 'perdido' ? '#FF3B30' : '#EAB308') : 'transparent'
                  }
                ]}><Text style={[
                    styles.txtBannerResultadoText,
                    {
                      color: mensajeResultado ? (resultadoTipo === 'ganado' ? '#1E4620' : resultadoTipo === 'perdido' ? '#6B1D1D' : '#713F12') : 'transparent'
                    }
                  ]}>{mensajeResultado || ' '}</Text></View>

                <View style={{ paddingHorizontal: 4, marginTop: 12, gap: 10 }}>
                  {enPartida ? (
                    <>
                      <TouchableOpacity disabled={repartiendo} style={styles.btnBlackjackFijoBlanco} onPress={pedirCarta}>
                        <Text style={styles.txtBtnAccionSecundarioText}>PEDIR CARTA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={repartiendo} style={styles.btnBlackjackFijoMorado} onPress={plantarse}>
                        <Text style={styles.txtBtnAccionPrincipalText}>PLANTARSE</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={iniciarPartidaBlackjack}>
                        <Text style={styles.txtBtnOtraPartidaText}>NUEVA MANO</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={repartiendo} style={styles.btnSalirAlLobby} onPress={() => setVerTapete(false)}>
                        <LogOut size={16} color="#D1D5DB" style={{ marginRight: 6 }} />
                        <Text style={styles.txtBtnSalirLobbyText}>ABANDONAR MESA</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

              </View>
            )}
          </View>
        )}

        {/* JUEGO 2: RULETA EUROPEA */}
        {juegoSeleccionado === 'ruleta' && (
          <View style={styles.contenedorMesaFondoVerdeReal}>

            <View style={styles.hudContenedorRuletaAmpliado}>
              <Text style={{ color: '#E2D5EE', fontSize: 13, fontWeight: '800' }}>BOLA</Text>
              <View style={[styles.circuloResultadoRuletaGigante, { backgroundColor: colorGanadorRuleta }]}>
                <Text style={styles.txtResultadoRuletaNumeroGigante}>{numeroGanadorRuleta !== null ? numeroGanadorRuleta : '--'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Apuesta: {calcularTotalApostadoRuleta()}</Text>
                <TouchableOpacity onPress={() => setModalAyuda('ruleta')} style={styles.btnAyuda}>
                  <Text style={styles.txtBtnAyuda}>?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tapeteGridFichasAmpliado}>
              <View style={{ flexDirection: 'row', width: '100%', height: 115 }}>
                <TouchableOpacity style={styles.casillaCeroVerticalAmpliada} onPress={() => agregarApuestaRuleta(null, 0)}>
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>0</Text>
                  {apuestasRuleta.numeros[0] > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.numeros[0]}</Text></View>}
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 560, height: 110 }}>
                    {NUMEROS_RULETA.slice(1).map((item) => (
                      <TouchableOpacity
                        key={item.n}
                        style={[styles.casillaTapeteNumero, { backgroundColor: item.color === 'rojo' ? '#b91c1c' : '#1c1c1e', width: 43, height: 32, margin: 1.5 }]}
                        onPress={() => agregarApuestaRuleta(null, item.n)}
                      >
                        <Text style={styles.txtCasillaTapeteTxtAmpliado}>{item.n}</Text>
                        {apuestasRuleta.numeros[item.n] > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.numeros[item.n]}</Text></View>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', width: '100%', gap: 6, marginTop: 8 }}>
                <TouchableOpacity style={[styles.btnSuerteSencillaTapete, { backgroundColor: '#b91c1c', height: 34 }]} onPress={() => agregarApuestaRuleta('rojo')}>
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>ROJO</Text>
                  {apuestasRuleta.rojo > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.rojo}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSuerteSencillaTapete, { backgroundColor: '#1c1c1e', height: 34 }]} onPress={() => agregarApuestaRuleta('negro')}>
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>NEGRO</Text>
                  {apuestasRuleta.negro > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.negro}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSuerteSencillaTapete, { height: 34 }]} onPress={() => agregarApuestaRuleta('par')}>
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>PAR</Text>
                  {apuestasRuleta.par > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.par}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSuerteSencillaTapete, { height: 34 }]} onPress={() => agregarApuestaRuleta('impar')}>
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>IMPAR</Text>
                  {apuestasRuleta.impar > 0 && <View style={styles.badgeFichaColocadaAmpliada}><Text style={styles.txtBadgeFichaColocada}>{apuestasRuleta.impar}</Text></View>}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.contenedorFichasFisicasAmpliado}>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                {[10, 20, 50].map((valor) => (
                  <TouchableOpacity key={valor} style={[styles.fichaFisicaCirculo, fichaSeleccionada === valor && styles.fichaFisicaCirculoActiva, { width: 44, height: 44, borderRadius: 22 }]} onPress={() => setFichaSeleccionada(valor)}>
                    <Text style={{ fontWeight: '900', fontSize: 15, color: fichaSeleccionada === valor ? '#fff' : '#000' }}>{valor}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 6, paddingBottom: 4 }}>
              <TouchableOpacity disabled={girandoRuleta} style={[styles.btnOtraPartidaVerde, { paddingVertical: 12 }]} onPress={lanzarBolaRuleta}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>TIRAR BOLA</Text></TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity disabled={girandoRuleta} style={[styles.btnCasinoAccionSecundario, { paddingVertical: 10 }]} onPress={limpiarTapeteRuleta}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#D1D5DB' }}>LIMPIAR</Text></TouchableOpacity>
              <TouchableOpacity disabled={girandoRuleta} style={[styles.btnSalirAlLobby, { paddingVertical: 10, flex: 1, width: 'auto' }]} onPress={() => setJuegoSeleccionado(null)}><Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← MENÚ</Text></TouchableOpacity>
              </View>
            </View>

            {mostrarOverlayRuleta && (
              <TouchableOpacity activeOpacity={0.9} style={[styles.overlayResultadoTranslucido, { backgroundColor: colorOverlayFondo }]} onPress={cerrarResultadoOverlay}>
                <View style={styles.contenedorCentralOverlay}>
                  <View style={[styles.circuloResultadoRuletaGrande, { backgroundColor: colorGanadorRuleta, width: 100, height: 100, borderRadius: 50 }]}>
                    <Text style={styles.txtOverlayNumeroGigante}>{numeroGanadorRuleta}</Text>
                  </View>
                  <Text style={styles.txtOverlayMensajePremio}>{textoOverlayRuleta}</Text>
                  <Text style={styles.txtOverlaySubtituloToque}>Toca para continuar</Text>
                </View>
              </TouchableOpacity>
            )}

          </View>
        )}

        {/* JUEGO 3: TRAGAPERRAS LA PEÑA AMBIENTADA */}
        {juegoSeleccionado === 'tragaperras' && (
          <View style={styles.contenedorMesaFondoVerdeReal}>

            {/* Chasis de Máquina Recreativa Vintage */}
            <View style={styles.chasisTragaperrasMueble}>
              <View style={styles.marquesinaLuminosa}>
                <Text style={styles.txtMarquesinaTitulo}>CUBATAS JACKPOT</Text>
                <TouchableOpacity onPress={() => setModalAyuda('tragaperras')} style={[styles.btnAyuda, { position: 'absolute', right: 10 }]}>
                  <Text style={styles.txtBtnAyuda}>?</Text>
                </TouchableOpacity>
              </View>

              {/* Ventana de Rodillos con Estilo Neon */}
              <View style={styles.pantallaRodillosNeon}>
                <View style={styles.contenedorRodillosRow}>
                  <View style={styles.cajaRodilloFisico}><Text style={styles.txtEmojiRodillo}>{slots[0]}</Text></View>
                  <View style={styles.cajaRodilloFisico}><Text style={styles.txtEmojiRodillo}>{slots[1]}</Text></View>
                  <View style={styles.cajaRodilloFisico}><Text style={styles.txtEmojiRodillo}>{slots[2]}</Text></View>
                </View>
              </View>

              {/* Minipantalla de pagos integrada en el mueble con la nueva distribución */}
              <View style={styles.tablaPagosMueble}>
                <Text style={styles.txtTablaPagosTitulo}>PREMIOS TOP (3 IGUALES):</Text>
                <Text style={styles.txtTablaPagosLinea}>💎 x60 | 💵 x40 | 🥩 x25 | 🥪 x25</Text>
                <Text style={styles.txtTablaPagosMiniNota}>¡Ojo! Hay 9 símbolos. Sacar 2 iguales paga x2</Text>
              </View>
            </View>

            {/* Banner de Ganancia Fijo */}
            <View style={[
              styles.bannerResultadoFino,
              {
                backgroundColor: mensajeSlots ? (resultadoTipoSlots === 'ganado' ? '#DEF7EC' : '#FDE8E8') : 'transparent',
                borderColor: mensajeSlots ? (resultadoTipoSlots === 'ganado' ? '#34C759' : '#FF3B30') : 'transparent',
                marginVertical: 10
              }
            ]}><Text style={[
                styles.txtBannerResultadoText,
                { color: mensajeSlots ? (resultadoTipoSlots === 'ganado' ? '#1E4620' : '#6B1D1D') : 'transparent' }
              ]}>{mensajeSlots || ' '}</Text></View>

            {/* Selector de Apuestas */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10, gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#9CA3AF' }}>Apuesta:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaSlots(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
                <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{apuestaSlots}</Text>
                <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaSlots(a => Math.min(monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setApuestaSlots(monedas)} style={styles.btnTodoIn}>
                <Text style={styles.txtBtnTodoIn}>TODO</Text>
              </TouchableOpacity>
            </View>

            {/* Botonera de la máquina */}
            <View style={{ gap: 6, paddingBottom: 4 }}>
              <TouchableOpacity disabled={girandoSlots} style={styles.btnOtraPartidaVerde} onPress={jugarTragaperras}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{girandoSlots ? 'GIRANDO...' : 'TIRAR PALANCA'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={girandoSlots} style={styles.btnSalirAlLobby} onPress={() => { setJuegoSeleccionado(null); setMensajeSlots(''); }}>
                <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← SALIR AL MENÚ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* JUEGO 4: DADOS — CRAPS SIMPLIFICADO */}
        {juegoSeleccionado === 'dados' && (
          <View style={styles.contenedorMesaFondoVerdeReal}>

            {/* Cabecera del juego */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <Dices size={18} color="#F87171" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1, flex: 1 }}>DADOS — CRAPS</Text>
              <TouchableOpacity onPress={() => setModalAyuda('dados')} style={styles.btnAyuda}>
                <Text style={styles.txtBtnAyuda}>?</Text>
              </TouchableOpacity>
              {dadosPunto !== null && (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}>
                  <Text style={{ color: '#F87171', fontWeight: '900', fontSize: 12 }}>PUNTO: {dadosPunto}</Text>
                </View>
              )}
            </View>

            {/* Dados visuales */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
              {[0, 1].map(i => (
                <DadoVisual key={i} valor={dadosValores[i]} animando={dadosTirandose} />
              ))}
            </View>

            {/* Suma */}
            {dadosValores[0] !== null && (
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SUMA</Text>
                <Text style={{ color: '#FEF08A', fontSize: 36, fontWeight: '900', lineHeight: 42 }}>{dadosValores[0] + dadosValores[1]}</Text>
              </View>
            )}

            {/* Banner resultado */}
            {dadosMensaje !== '' && (
              <View style={[styles.bannerResultadoFino, {
                backgroundColor: dadosResultadoTipo === 'ganado' ? 'rgba(5,150,105,0.15)' : dadosResultadoTipo === 'perdido' ? 'rgba(239,68,68,0.12)' : 'rgba(254,240,138,0.08)',
                borderColor: dadosResultadoTipo === 'ganado' ? '#059669' : dadosResultadoTipo === 'perdido' ? '#EF4444' : '#EAB308',
              }]}>
                <Text style={[styles.txtBannerResultadoText, {
                  color: dadosResultadoTipo === 'ganado' ? '#34D399' : dadosResultadoTipo === 'perdido' ? '#F87171' : '#FEF08A'
                }]}>{dadosMensaje}</Text>
              </View>
            )}

            {/* Info reglas rápidas */}
            {dadosFase === 'inicio' && dadosMensaje === '' && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 18 }}>
                  7 u 11 → ganas al instante · 2, 3 o 12 → pierde{'\n'}
                  Otro número → se convierte en tu punto{'\n'}
                  Saca el punto antes que el 7 para ganar
                </Text>
              </View>
            )}

            {/* Selector apuesta (solo en fase inicio) */}
            {dadosFase === 'inicio' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }}>Apuesta:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaDados(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
                  <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{apuestaDados}</Text>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => setApuestaDados(a => Math.min(monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setApuestaDados(monedas)} style={styles.btnTodoIn}>
                  <Text style={styles.txtBtnTodoIn}>TODO</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ gap: 6, paddingBottom: 4, marginTop: 6 }}>
              <TouchableOpacity disabled={dadosTirandose} style={styles.btnOtraPartidaVerde} onPress={tirarDados}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>
                  {dadosTirandose ? 'RODANDO...' : dadosFase === 'punto' ? `TIRAR OTRA VEZ (PUNTO: ${dadosPunto})` : 'LANZAR DADOS'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSalirAlLobby} onPress={() => { resetearDados(); setJuegoSeleccionado(null); }}>
                <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← SALIR AL MENÚ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* JUEGO 5: RASCA Y GANA */}
        {juegoSeleccionado === 'rasca' && (
          <View style={styles.contenedorMesaFondoVerdeReal}>

            {/* Cabecera */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <AlertTriangle size={18} color="#34D399" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1, flex: 1 }}>RASCA Y GANA</Text>
              <TouchableOpacity onPress={() => setModalAyuda('rasca')} style={styles.btnAyuda}>
                <Text style={styles.txtBtnAyuda}>?</Text>
              </TouchableOpacity>
            </View>

            {/* Fase: comprar cartón */}
            {rascaFase === 'comprar' && (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', width: '100%' }}>
                  <Text style={{ fontSize: 42, marginBottom: 8 }}>🎟️</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginBottom: 4 }}>CARTÓN LA BODEGUILLA</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', lineHeight: 17 }}>9 símbolos · 6 casillas · Par x4{'\n'}💎×3 paga x80 · 💵×3 paga x40 · resto ×3 paga x20</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }}>Precio:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <TouchableOpacity style={{ padding: 10 }} onPress={() => setRascaApuesta(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
                    <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{rascaApuesta}</Text>
                    <TouchableOpacity style={{ padding: 10 }} onPress={() => setRascaApuesta(a => Math.min(monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setRascaApuesta(monedas)} style={styles.btnTodoIn}>
                    <Text style={styles.txtBtnTodoIn}>TODO</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.btnIniciarJuegoPremium} onPress={comprarRasca}>
                  <Text style={styles.txtBtnJuegoText}>🎟️ COMPRAR CARTÓN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSalirAlLobby} onPress={() => setJuegoSeleccionado(null)}>
                  <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← SALIR AL MENÚ</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Fase: rascando / fin */}
            {(rascaFase === 'rascando' || rascaFase === 'fin') && (
              <View style={{ gap: 12 }}>

                {/* Banner mensaje */}
                <View style={[styles.bannerResultadoFino, {
                  backgroundColor: rascaResultadoTipo === 'ganado' ? 'rgba(5,150,105,0.15)' : rascaResultadoTipo === 'perdido' ? 'rgba(239,68,68,0.12)' : 'rgba(254,240,138,0.06)',
                  borderColor: rascaResultadoTipo === 'ganado' ? '#059669' : rascaResultadoTipo === 'perdido' ? '#EF4444' : 'rgba(255,255,255,0.1)',
                }]}>
                  <Text style={[styles.txtBannerResultadoText, {
                    color: rascaResultadoTipo === 'ganado' ? '#34D399' : rascaResultadoTipo === 'perdido' ? '#F87171' : '#9CA3AF'
                  }]}>{rascaMensaje}</Text>
                </View>

                {/* Grid 2x3 de casillas */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {rascaCasillas.map((casilla, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => rascarCasilla(i)}
                      disabled={casilla.revelada || rascaFase === 'fin'}
                      style={[styles.casillaScratch, casilla.revelada && styles.casillaScratchRevelada]}
                      activeOpacity={0.7}
                    >
                      {casilla.revelada ? (
                        <Text style={{ fontSize: 34 }}>{casilla.simbolo}</Text>
                      ) : (
                        <Text style={{ fontSize: 26, color: 'rgba(255,255,255,0.3)' }}>?</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ gap: 6 }}>
                  {rascaFase === 'rascando' && (
                    <TouchableOpacity style={styles.btnBlackjackFijoBlanco} onPress={rascaRevelarTodo}>
                      <Text style={styles.txtBtnAccionSecundarioText}>REVELAR TODO</Text>
                    </TouchableOpacity>
                  )}
                  {rascaFase === 'fin' && (
                    <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={nuevaRasca}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>OTRO CARTÓN</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.btnSalirAlLobby} onPress={() => { nuevaRasca(); setJuegoSeleccionado(null); }}>
                    <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← SALIR AL MENÚ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* JUEGO 6: WAR — CARTA ALTA */}
        {juegoSeleccionado === 'war' && (
          <View style={styles.contenedorMesaFondoVerdeReal}>

            {/* Cabecera */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <Layers size={18} color="#FBBF24" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1, flex: 1 }}>WAR — CARTA ALTA</Text>
              <TouchableOpacity onPress={() => setModalAyuda('war')} style={styles.btnAyuda}>
                <Text style={styles.txtBtnAyuda}>?</Text>
              </TouchableOpacity>
            </View>

            {/* Mesa de cartas */}
            <View style={{ gap: 8, marginBottom: 14 }}>

              {/* Cartas crupier */}
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>CRUPIER</Text>
                {warAnimando ? (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    {[0,1,2].map(i => (
                      <View key={i} style={[styles.cartaWarSlot, { overflow: 'hidden' }]}>
                        <Image source={require('./assets/Javicristo.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                ) : warCartaCrupier ? (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
                    {/* Cartas secundarias más pequeñas */}
                    {(warCartaCrupier.extras || []).map((c, i) => (
                      <View key={i} style={{ opacity: 0.55, transform: [{ scale: 0.82 }] }}>
                        <RenderizarCarta nombre={c.nombre} palo={c.palo} oculta={false} />
                      </View>
                    ))}
                    {/* Carta ganadora destacada */}
                    <View style={{ borderWidth: 2, borderColor: warResultadoTipo === 'perdido' ? '#EF4444' : warResultadoTipo === 'ganado' ? '#34D399' : '#FBBF24', borderRadius: 9 }}>
                      <RenderizarCarta nombre={warCartaCrupier.nombre} palo={warCartaCrupier.palo} oculta={false} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.cartaWarSlot}>
                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>—</Text>
                  </View>
                )}
              </View>

              {/* Separador VS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <Text style={{ color: '#FBBF24', fontWeight: '900', fontSize: 13, letterSpacing: 2 }}>VS</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </View>

              {/* Cartas jugador */}
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>TÚ</Text>
                {warAnimando ? (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    {[0,1,2].map(i => (
                      <View key={i} style={[styles.cartaWarSlot, { overflow: 'hidden' }]}>
                        <Image source={require('./assets/Javicristo.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                ) : warCartaJugador ? (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
                    {(warCartaJugador.extras || []).map((c, i) => (
                      <View key={i} style={{ opacity: 0.55, transform: [{ scale: 0.82 }] }}>
                        <RenderizarCarta nombre={c.nombre} palo={c.palo} oculta={false} />
                      </View>
                    ))}
                    <View style={{ borderWidth: 2, borderColor: warResultadoTipo === 'ganado' ? '#34D399' : warResultadoTipo === 'perdido' ? '#EF4444' : '#FBBF24', borderRadius: 9 }}>
                      <RenderizarCarta nombre={warCartaJugador.nombre} palo={warCartaJugador.palo} oculta={false} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.cartaWarSlot}>
                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>—</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cartas de la guerra (si las hay) */}
            {warCartasGuerra && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 10 }}>
                <Text style={{ color: '#F87171', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 8 }}>⚔️ CARTA DECISIVA</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700' }}>TÚ</Text>
                    <RenderizarCarta nombre={warCartasGuerra.jugador.nombre} palo={warCartasGuerra.jugador.palo} oculta={false} />
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700' }}>CRUPIER</Text>
                    <RenderizarCarta nombre={warCartasGuerra.crupier.nombre} palo={warCartasGuerra.crupier.palo} oculta={false} />
                  </View>
                </View>
              </View>
            )}

            {/* Banner resultado */}
            {warMensaje !== '' && (
              <View style={[styles.bannerResultadoFino, {
                backgroundColor: warResultadoTipo === 'ganado' ? 'rgba(5,150,105,0.15)' : warResultadoTipo === 'perdido' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
                borderColor: warResultadoTipo === 'ganado' ? '#059669' : warResultadoTipo === 'perdido' ? '#EF4444' : '#F59E0B',
                marginBottom: 12,
              }]}>
                <Text style={[styles.txtBannerResultadoText, {
                  color: warResultadoTipo === 'ganado' ? '#34D399' : warResultadoTipo === 'perdido' ? '#F87171' : '#FBBF24',
                }]}>{warMensaje}</Text>
              </View>
            )}

            {/* Selector apuesta (solo en inicio) */}
            {warFase === 'inicio' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }}>Apuesta:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => setWarApuesta(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
                  <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{warApuesta}</Text>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => setWarApuesta(a => Math.min(monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setWarApuesta(monedas)} style={styles.btnTodoIn}>
                  <Text style={styles.txtBtnTodoIn}>TODO</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botones según fase */}
            <View style={{ gap: 6 }}>
              {warFase === 'inicio' && (
                <TouchableOpacity disabled={warAnimando} style={styles.btnOtraPartidaVerde} onPress={jugarWar}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>
                    {warAnimando ? 'REPARTIENDO...' : '⚔️ REPARTIR CARTAS'}
                  </Text>
                </TouchableOpacity>
              )}

              {warFase === 'empate' && (
                <>
                  <TouchableOpacity disabled={warAnimando} style={styles.btnBlackjackFijoMorado} onPress={irAGuerra}>
                    <Text style={styles.txtBtnAccionPrincipalText}>
                      {warAnimando ? 'EN GUERRA...' : `⚔️ IR A LA GUERRA · +${warApuesta} más → ganas x6`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnBlackjackFijoBlanco} onPress={rendirse}>
                    <Text style={styles.txtBtnAccionSecundarioText}>🏳️ RENDIRSE (-{Math.floor(warApuesta / 2)} monedas)</Text>
                  </TouchableOpacity>
                </>
              )}

              {warFase === 'fin' && (
                <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={() => { resetearWar(); }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>NUEVA MANO</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.btnSalirAlLobby} onPress={() => { resetearWar(); setJuegoSeleccionado(null); }}>
                <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>← SALIR AL MENÚ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

          </View>{/* fin tableroCasinoPremium */}
        </ScrollView>
      )}{/* fin pantalla juego */}

    </View>
  );
}

const styles = StyleSheet.create({
  // === CONTENEDOR PRINCIPAL ===
  tableroCasinoPremium: { backgroundColor: '#0F1923', borderRadius: 0, borderWidth: 2, borderColor: '#2A1A40', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, width: '100%', overflow: 'hidden' },

  // === HEADER ===
  cabeceraCasinoMesa: { flexDirection: 'row', backgroundColor: '#1A0A2E', width: '100%', paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(254,240,138,0.15)' },
  txtMesaPremiumTitulo: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  hudMonedasPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(254,240,138,0.12)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(254,240,138,0.3)' },

  // === LOBBY ===
  lobbyCasinoListaVertical: { width: '100%', padding: 14, backgroundColor: '#0F1923', gap: 10 },
  tarjetaJuegoRectangularGris: { width: '100%', backgroundColor: '#1C1130', borderRadius: 14, padding: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(91,50,129,0.4)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 3 },
  iconoTarjetaCirculo: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(254,240,138,0.1)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.25)', alignItems: 'center', justifyContent: 'center' },
  txtTituloTarjetaJuego: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  txtSubtituloTarjetaJuego: { color: '#6B7280', fontSize: 11, fontWeight: '500', marginTop: 2 },
  flechaTarjeta: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(254,240,138,0.08)', alignItems: 'center', justifyContent: 'center' },
  miniContenedorRachasFila: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  txtMiniRachaText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },

  // === PANTALLA PREVIA BLACKJACK ===
  lobbyCasinoCaja: { padding: 16, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: '#0F1923', gap: 14 },
  tarjetaBlancaLobbyBase: { width: '100%', borderWidth: 1, borderColor: 'rgba(91,50,129,0.5)', borderRadius: 14, padding: 18, backgroundColor: '#1C1130', alignItems: 'center' },

  btnIniciarJuegoPremium: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%', alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnJuegoText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  btnRegresarLobbyMenu: { width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },

  cajaEstadisticasRachas: { backgroundColor: 'rgba(0,0,0,0.25)', width: '100%', borderRadius: 10, padding: 12, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4 },
  filaRachaStat: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 2 },
  txtRachaStatLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginLeft: 8 },
  txtRachaStatValor: { fontSize: 15, fontWeight: '900', color: '#FEF08A' },

  // === MESA BLACKJACK ===
  contenedorMesaFondoVerdeReal: { width: '100%', padding: 14, backgroundColor: '#0F1923' },
  zonaJugadorFila: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  txtMarcadorEtiqueta: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  filaCartasContenedor: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 85, alignItems: 'center', width: '100%', marginTop: 4 },
  lineaMesaSeparador: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'center', marginVertical: 4 },

  cartaEstilo: { backgroundColor: '#fff', width: 56, height: 84, borderRadius: 8, justifyContent: 'space-between', padding: 5, marginHorizontal: 4, marginVertical: 4, borderWidth: 1, borderColor: '#D1D5DB', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  textoCartaEsquina: { fontSize: 13, fontWeight: '900', lineHeight: 13 },
  paloCartaEsquina: { fontSize: 11, lineHeight: 11, marginTop: 1 },
  paloCartaCentral: { fontSize: 24, textAlign: 'center', alignSelf: 'center', marginVertical: -4 },
  bannerResultadoFino: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, marginVertical: 8, width: '100%', minHeight: 46 },
  txtBannerResultadoText: { fontSize: 13, fontWeight: '800', textAlign: 'center', flex: 1 },

  // === BOTONES BLACKJACK ===
  btnBlackjackFijoBlanco: { backgroundColor: '#374151', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#1F2937' },
  txtBtnAccionSecundarioText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  btnBlackjackFijoMorado: { backgroundColor: '#7C3AED', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnAccionPrincipalText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  btnOtraPartidaVerde: { backgroundColor: '#059669', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#047857' },
  txtBtnOtraPartidaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  btnSalirAlLobby: { flexDirection: 'row', backgroundColor: '#374151', paddingVertical: 12, width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: '#1F2937' },
  txtBtnSalirLobbyText: { color: '#D1D5DB', fontWeight: '700', fontSize: 13 },

  btnCasinoAccionSecundario: { backgroundColor: '#374151', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, flex: 1, alignItems: 'center', borderBottomWidth: 2, borderColor: '#1F2937' },

  // === RULETA ===
  hudContenedorRuletaAmpliado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, marginBottom: 8 },
  circuloResultadoRuletaGigante: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FEF08A' },
  txtResultadoRuletaNumeroGigante: { color: '#fff', fontSize: 32, fontWeight: '900' },
  tapeteGridFichasAmpliado: { width: '100%', backgroundColor: '#14532D', padding: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  casillaCeroVerticalAmpliada: { width: 40, height: 104, backgroundColor: '#166534', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginRight: 3 },
  txtCasillaTapeteTxtAmpliado: { color: '#fff', fontSize: 12, fontWeight: '900' },
  btnSuerteSencillaTapete: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#166534' },
  badgeFichaColocadaAmpliada: { position: 'absolute', right: 2, bottom: 2, backgroundColor: '#FEF08A', borderRadius: 7, minWidth: 16, alignItems: 'center', paddingHorizontal: 2 },
  contenedorFichasFisicasAmpliado: { paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, alignItems: 'center', marginVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  fichaFisicaCirculo: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4B5563', backgroundColor: '#1F2937' },
  fichaFisicaCirculoActiva: { borderColor: '#FEF08A', backgroundColor: '#7C3AED' },
  overlayResultadoTranslucido: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  contenedorCentralOverlay: { backgroundColor: 'rgba(15, 10, 30, 0.95)', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#FEF08A', width: '80%' },
  circuloResultadoRuletaGrande: { justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FEF08A', marginBottom: 16 },
  txtOverlayNumeroGigante: { color: '#fff', fontSize: 42, fontWeight: '900' },
  txtOverlayMensajePremio: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', lineHeight: 28 },
  txtOverlaySubtituloToque: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 },

  // === TRAGAPERRAS ===
  chasisTragaperrasMueble: { width: '100%', backgroundColor: '#1C1130', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#2E1065', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  marquesinaLuminosa: { width: '100%', backgroundColor: '#4C1D95', paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: '#FEF08A', marginBottom: 14 },
  txtMarquesinaTitulo: { color: '#FEF08A', fontWeight: '900', fontSize: 15, letterSpacing: 3, textShadowColor: 'rgba(254, 240, 138, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  pantallaRodillosNeon: { width: '100%', backgroundColor: '#0D0D0D', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#EAB308', shadowColor: '#EAB308', shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  contenedorRodillosRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  cajaRodilloFisico: { width: 76, height: 88, backgroundColor: '#1F1F1F', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EAB308' },
  txtEmojiRodillo: { fontSize: 40 },
  tablaPagosMueble: { width: '100%', backgroundColor: '#0D0D0D', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: '#292524' },
  txtTablaPagosTitulo: { color: '#EAB308', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  txtTablaPagosLinea: { color: '#D1D5DB', fontSize: 10, fontWeight: '700', marginTop: 4 },
  txtTablaPagosMiniNota: { color: '#6B7280', fontSize: 9, fontWeight: '500', marginTop: 3, fontStyle: 'italic' },

  // Estilo extra para la casilla del tapete
  casillaTapeteNumero: { justifyContent: 'center', alignItems: 'center', borderRadius: 3 },

  // === DADOS ===
  cajaDado: { width: 88, height: 88, backgroundColor: '#1C1130', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(248,113,113,0.4)', shadowColor: '#F87171', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  cajaDadoAnimando: { borderColor: '#F87171', shadowOpacity: 0.5 },
  txtEmojidado: { fontSize: 52 },

  // === RASCA Y GANA ===
  casillaScratch: { width: 96, height: 96, backgroundColor: '#2E1065', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(167,139,250,0.4)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  casillaScratchRevelada: { backgroundColor: '#1C1130', borderColor: 'rgba(52,211,153,0.4)' },

  // === BOTÓN AYUDA ? ===
  btnAyuda: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(254,240,138,0.12)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.35)', justifyContent: 'center', alignItems: 'center' },
  txtBtnAyuda: { color: '#FEF08A', fontWeight: '900', fontSize: 13, lineHeight: 16 },

  // === WAR ===
  cartaWarSlot: { width: 56, height: 84, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  // === BOTÓN TODO IN ===
  btnTodoIn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  txtBtnTodoIn: { color: '#F87171', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
});
