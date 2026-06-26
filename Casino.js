import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dices, Gamepad, Layers, Flame, Trophy, Minus, Plus, LogOut, AlertTriangle, RefreshCw } from 'lucide-react-native';

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
  const LIMITE_APUESTA_MAX = 50;

  // Estados de la Ruleta compacta
  const [fichaSeleccionada, setFichaSeleccionada] = useState(10);
  const [girandoRuleta, setGirandoRuleta] = useState(false);
  const [numeroGanadorRuleta, setNumeroGanadorRuleta] = useState(null);
  const [colorGanadorRuleta, setColorGanadorRuleta] = useState('#451A60');
  const [apuestasRuleta, setApuestasRuleta] = useState({ rojo: 0, negro: 0, par: 0, impar: 0, numeros: {} });

  const [mostrarOverlayRuleta, setMostrarOverlayRuleta] = useState(false);
  const [textoOverlayRuleta, setTextoOverlayRuleta] = useState('');
  const [colorOverlayFondo, setColorOverlayFondo] = useState('rgba(0,0,0,0.8)');

  useEffect(() => {
    cargarDatosCasinoLocal();
  }, []);

  const cargarDatosCasinoLocal = async () => {
    try {
      const localRacha = await AsyncStorage.getItem('@bj_racha_actual');
      const localMaxRacha = await AsyncStorage.getItem('@bj_racha_maxima');
      const localMonedas = await AsyncStorage.getItem('@bj_monedas');

      if (localRacha !== null) setRachaActual(parseInt(localRacha, 10));
      if (localMaxRacha !== null) setRachaMaxima(parseInt(localMaxRacha, 10));
      if (localMonedas !== null) setMonedas(parseInt(localMonedas, 10));
    } catch (e) {
      console.error('Error cargando datos locales del casino', e);
    }
  };

  const guardarDatoCasinoLocal = async (clave, valor) => {
    try { await AsyncStorage.setItem(clave, valor.toString()); } catch (e) {}
  };

  const verificarAuxilioBancarrota = (saldoActual, esManoBJ = false) => {
    if (saldoActual <= 0) {
      const saldoAuxilio = 50;
      setMonedas(saldoAuxilio);
      guardarDatoCasinoLocal('@bj_monedas', saldoAuxilio);
      if (esManoBJ) setApuestaActual(50);
      Alert.alert('Bancarrota', 'Has perdido todo. Se te asignan 50 monedas de penalización para poder reengancharte.');
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

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={styles.tableroCasinoPremium}>

        {/* HUD Superior de Monedas global */}
        <View style={styles.cabeceraCasinoMesa}>
          <Dices size={20} color="#fff" />
          <Text style={styles.txtMesaPremiumTitulo}>CASINO LA BODEGUILLA</Text>
          <View style={{ backgroundColor: '#290E3B', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 }}>
            <Text style={{ color: '#FEF08A', fontWeight: 'bold', fontSize: 13 }}>MONEDAS: {monedas}</Text>
          </View>
        </View>

        {/* LOBBY INICIAL CON FILAS RECTANGULARES VERTICALES COMPACTAS */}
        {juegoSeleccionado === null && (
          <View style={styles.lobbyCasinoListaVertical}>

            {/* Tarjeta Rectangular 1: Blackjack */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => setJuegoSeleccionado('blackjack')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Layers size={26} color="#5B3281" />
                <Text style={styles.txtTituloTarjetaJuego}>BLACK JACK</Text>
              </View>
              <View style={styles.miniContenedorRachasFila}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} color="#EAB308" />
                  <Text style={styles.txtMiniRachaText}>Racha: {rachaActual}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Trophy size={11} color="#34C759" />
                  <Text style={styles.txtMiniRachaText}>Máx: {rachaMaxima}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Tarjeta Rectangular 2: Ruleta */}
            <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={() => setJuegoSeleccionado('ruleta')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <RefreshCw size={26} color="#15803d" />
                <Text style={styles.txtTituloTarjetaJuego}>RULETA EUROPEA</Text>
              </View>
              <Text style={[styles.txtMiniRachaText, { color: '#8E8E93', marginTop: 4, marginLeft: 36 }]}>Tapete Táctil Premium</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* JUEGO 1: BLACKJACK EN ACCIÓN */}
        {juegoSeleccionado === 'blackjack' && (
          <View style={{ width: '100%' }}>
            {!verTapete ? (
              <View style={styles.lobbyCasinoCaja}>
                <View style={styles.tarjetaBlancaLobbyBase}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 14 }}>MESA DE BLACKJACK</Text>

                  <View style={styles.cajaEstadisticasRachas}>
                    <View style={styles.filaRachaStat}>
                      <Flame size={15} color="#EAB308" />
                      <Text style={styles.txtRachaStatLabel}>Racha Actual:</Text>
                      <Text style={styles.txtRachaStatValor}>{rachaActual}</Text>
                    </View>
                    <View style={styles.filaRachaStat}>
                      <Trophy size={13} color="#34C759" />
                      <Text style={styles.txtRachaStatLabel}>Racha Máxima:</Text>
                      <Text style={styles.txtRachaStatValor}>{rachaMaxima}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#555' }}>Apuesta:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E5EA', borderRadius: 8 }}>
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => setApuestaActual(a => Math.max(10, a - 10))}><Minus size={14} color="#000" /></TouchableOpacity>
                      <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: 'bold', color: '#000' }}>{apuestaActual}</Text>
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => setApuestaActual(a => Math.min(LIMITE_APUESTA_MAX, monedas, a + 10))}><Plus size={14} color="#000" /></TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.btnIniciarJuegoPremium} onPress={iniciarPartidaBlackjack}>
                    <Text style={styles.txtBtnJuegoText}>REPARTIR CARTAS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnRegresarLobbyMenu} onPress={() => setJuegoSeleccionado(null)}>
                    <Text style={{ color: '#5B3281', fontWeight: 'bold' }}>CAMBIAR DE JUEGO</Text>
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
                        <LogOut size={16} color="#fff" style={{ marginRight: 6 }} />
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
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Apuesta: {calcularTotalApostadoRuleta()}</Text>
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
                <TouchableOpacity disabled={girandoRuleta} style={[styles.btnCasinoAccionSecundario, { paddingVertical: 10 }]} onPress={limpiarTapeteRuleta}><Text style={{ fontSize: 12, fontWeight: 'bold' }}>LIMPIAR</Text></TouchableOpacity>
                <TouchableOpacity disabled={girandoRuleta} style={[styles.btnSalirAlLobby, { paddingVertical: 10, flex: 1, width: 'auto' }]} onPress={() => setJuegoSeleccionado(null)}><Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>SALIR AL MENÚ</Text></TouchableOpacity>
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

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tableroCasinoPremium: { backgroundColor: '#1E3A1E', borderRadius: 0, borderWidth: 3, borderColor: '#451A60', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5, width: '100%', overflow: 'hidden' },
  cabeceraCasinoMesa: { flexDirection: 'row', backgroundColor: '#451A60', width: '100%', padding: 12, alignItems: 'center', justifyContent: 'space-between' },
  txtMesaPremiumTitulo: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },

  lobbyCasinoListaVertical: { width: '100%', padding: 16, backgroundColor: '#1E3A1E', gap: 12 },
  tarjetaJuegoRectangularGris: { width: '100%', backgroundColor: '#E5E5EA', borderRadius: 12, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  txtTituloTarjetaJuego: { color: '#1C1C1E', fontWeight: '900', fontSize: 16, textAlign: 'left' },
  miniContenedorRachasFila: { flexDirection: 'row', gap: 16, marginTop: 8, marginLeft: 4 },
  txtMiniRachaText: { color: '#444', fontSize: 11, fontWeight: '800' },

  lobbyCasinoCaja: { padding: 20, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: '#1E3A1E', gap: 14 },
  tarjetaBlancaLobbyBase: { width: '100%', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 16, backgroundColor: '#F4F4F6', alignItems: 'center' },

  btnIniciarJuegoPremium: { backgroundColor: '#5B3281', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3, width: '100%', alignItems: 'center' },
  txtBtnJuegoText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5, textAlign: 'center' },
  btnRegresarLobbyMenu: { width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#5B3281', marginTop: 4 },

  cajaEstadisticasRachas: { backgroundColor: '#ffffff', width: '90%', borderRadius: 8, padding: 8, marginVertical: 6, borderWidth: 1, borderColor: '#E5E5EA', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
  filaRachaStat: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 4 },
  txtRachaStatLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#555', marginLeft: 6 },
  txtRachaStatValor: { fontSize: 14, fontWeight: '900', color: '#1C1C1E' },

  contenedorMesaFondoVerdeReal: { width: '100%', padding: 14, backgroundColor: '#1E3A1E' },
  zonaJugadorFila: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  txtMarcadorEtiqueta: { color: '#E2D5EE', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  filaCartasContenedor: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 85, alignItems: 'center', width: '100%', marginTop: 4 },
  lineaMesaSeparador: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginVertical: 4, borderStyle: 'dashed', borderRadius: 1 },

  cartaEstilo: { backgroundColor: '#fff', width: 56, height: 84, borderRadius: 6, justifyContent: 'space-between', padding: 5, marginHorizontal: 4, marginVertical: 4, borderWidth: 1, borderColor: '#BBB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3 },
  textoCartaEsquina: { fontSize: 13, fontWeight: '900', lineHeight: 13 },
  paloCartaEsquina: { fontSize: 11, lineHeight: 11, marginTop: 1 },
  paloCartaCentral: { fontSize: 24, textAlign: 'center', alignSelf: 'center', marginVertical: -4 },
  bannerResultadoFino: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, marginVertical: 10, width: '100%', minHeight: 46 },
  txtBannerResultadoText: { fontSize: 14, fontWeight: '800', textAlign: 'center', flex: 1 },

  btnBlackjackFijoBlanco: { backgroundColor: '#E5E5EA', paddingVertical: 14, width: '100%', borderRadius: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#CCC' },
  txtBtnAccionSecundarioText: { color: '#1C1C1E', fontWeight: '900', fontSize: 13 },
  btnBlackjackFijoMorado: { backgroundColor: '#451A60', paddingVertical: 14, width: '100%', borderRadius: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#290E3B' },
  txtBtnAccionPrincipalText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  btnOtraPartidaVerde: { backgroundColor: '#10B981', paddingVertical: 14, width: '100%', borderRadius: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#059669' },
  txtBtnOtraPartidaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  btnSalirAlLobby: { flexDirection: 'row', backgroundColor: '#EF4444', paddingVertical: 12, width: '100%', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: '#DC2626' },
  txtBtnSalirLobbyText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  btnCasinoAccionSecundario: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, flex: 1, alignItems: 'center' },

  hudContenedorRuletaAmpliado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10 },
  circuloResultadoRuletaGigante: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', borderWidth: 3.5, borderColor: '#FEF08A' },
  txtResultadoRuletaNumeroGigante: { color: '#fff', fontSize: 32, fontWeight: '900' },
  tapeteGridFichasAmpliado: { width: '100%', backgroundColor: '#166534', padding: 6, borderRadius: 10 },
  casillaCeroVerticalAmpliada: { width: 40, height: 104, backgroundColor: '#15803d', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 4, marginRight: 3 },
  txtCasillaTapeteTxtAmpliado: { color: '#fff', fontSize: 13, fontWeight: '900' },
  btnSuerteSencillaTapete: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#3f6212' },
  badgeFichaColocadaAmpliada: { position: 'absolute', right: 2, bottom: 2, backgroundColor: '#FEF08A', borderRadius: 7, minWidth: 16, alignItems: 'center' },
  contenedorFichasFisicasAmpliado: { paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  fichaFisicaCirculo: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#94a3b8', backgroundColor: '#e2e8f0' },
  fichaFisicaCirculoActiva: { borderColor: '#FEF08A', backgroundColor: '#451A60' },
  overlayResultadoTranslucido: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  contenedorCentralOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.88)', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FEF08A', width: '80%' },
  circuloResultadoRuletaGrande: { justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FEF08A', marginBottom: 16 },
  txtOverlayNumeroGigante: { color: '#fff', fontSize: 42, fontWeight: '900' },
  txtOverlayMensajePremio: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', lineHeight: 28 },
  txtOverlaySubtituloToque: { color: '#8E8E93', fontSize: 11, fontWeight: '600', marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 }
});
