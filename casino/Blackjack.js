// casino/Blackjack.js — Blackjack con zapato de 4 barajas, seguro, doblar, split y rendirse
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { Layers, Flame, Trophy, LogOut } from 'lucide-react-native';
import { styles } from './estilos';
import { RenderizarCarta, BotonAyuda, SelectorApuesta, COLORES_BANNER_CLARO } from './componentes';

const colorClaro = (tipo) => COLORES_BANNER_CLARO[tipo] || COLORES_BANNER_CLARO.neutro;

// ── Lógica pura ─────────────────────────────────────────────────────────────

// Zapato de 4 barajas
const crearZapato = () => {
  const palos = ['♦', '♣', '♥', '♠'];
  const valores = [
    { nombre: 'A', valor: 11 }, { nombre: '2', valor: 2 }, { nombre: '3', valor: 3 },
    { nombre: '4', valor: 4 },  { nombre: '5', valor: 5 }, { nombre: '6', valor: 6 },
    { nombre: '7', valor: 7 },  { nombre: '8', valor: 8 }, { nombre: '9', valor: 9 },
    { nombre: '10', valor: 10 }, { nombre: 'J', valor: 10 }, { nombre: 'Q', valor: 10 }, { nombre: 'K', valor: 10 },
  ];
  let zapato = [];
  for (let d = 0; d < 4; d++)
    for (let p of palos)
      for (let v of valores)
        zapato.push({ ...v, palo: p });
  // Fisher-Yates shuffle
  for (let i = zapato.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zapato[i], zapato[j]] = [zapato[j], zapato[i]];
  }
  return zapato;
};

// Calcula puntos con As flexible
export const calcularPuntos = (mano) => {
  let pts = mano.reduce((t, c) => t + c.valor, 0);
  let ases = mano.filter(c => c.nombre === 'A').length;
  while (pts > 21 && ases > 0) { pts -= 10; ases--; }
  return pts;
};

const esBJ = (mano) => mano.length === 2 && calcularPuntos(mano) === 21;

const finalizarMano = (manoJ, manoC, esBJNat = false) => {
  const pJ = calcularPuntos(manoJ);
  const pC = calcularPuntos(manoC);
  if (pJ > 21) return { res: 'perdido', msg: 'Te has pasado de 21. Gana la casa.' };
  if (pC > 21) return { res: 'ganado', msg: 'El crupier se pasa. ¡Victoria!' };
  if (esBJNat && !esBJ(manoC)) return { res: 'ganado', msg: 'BLACKJACK NATURAL! Cobras 3:2.' };
  if (pJ > pC) return { res: 'ganado', msg: 'Mayor puntuación. Has ganado la mano.' };
  if (pC > pJ) return { res: 'perdido', msg: 'El crupier tiene mejor mano. Gana la casa.' };
  return { res: 'empate', msg: 'Empate. Se devuelve la apuesta.' };
};

// ── Estado y acciones ───────────────────────────────────────────────────────
export function useBlackjack({ monedas, actualizarMonedas, verificarAuxilioBancarrota, ganarRacha, perderRacha, logro }) {
  const [enPartida,        setEnPartida]        = useState(false);
  const [repartiendo,      setRepartiendo]      = useState(false);
  const [baraja,           setBaraja]           = useState([]);
  const [manoJugador,      setManoJugador]      = useState([]);
  const [manoSplit,        setManoSplit]        = useState([]); // segunda mano tras split
  const [jugandoSplit,     setJugandoSplit]     = useState(false); // false=mano1, true=mano2
  const [manoCrupier,      setManoCrupier]      = useState([]);
  const [resultadoTipo,    setResultadoTipo]    = useState('');
  const [resultadoSplit,   setResultadoSplit]   = useState(''); // resultado mano2
  const [mensajeResultado, setMensajeResultado] = useState('');
  const [mensajeSplit,     setMensajeSplit]     = useState('');
  const [verTapete,        setVerTapete]        = useState(false);
  const [apuestaDoble,     setApuestaDoble]     = useState(0);   // extra por doble/split
  const [ofrecerSeguro,    setOfrecerSeguro]    = useState(false);
  const [puedeDoble,       setPuedeDoble]       = useState(false);
  const [puedeSplit,       setPuedeSplit]       = useState(false);
  const [apuestaActual,    setApuestaActual]    = useState(50);

  const puedeSplitMano = (mano) => mano.length === 2 && mano[0].valor === mano[1].valor;

  // Gestiona la racha y devuelve la ganancia neta de una mano
  const resolverPago = (resultado, apuesta, esBJNatural = false) => {
    if (resultado === 'ganado') {
      ganarRacha();
      return esBJNatural ? Math.floor(apuesta * 1.5) : apuesta; // BJ paga 3:2
    }
    if (resultado === 'perdido') {
      perderRacha();
      return -apuesta;
    }
    // empate: ganancia = 0, se devuelve la apuesta (ya descontada al inicio)
    return 0;
  };

  const iniciarPartida = () => {
    if (monedas < apuestaActual) {
      Alert.alert('Falta saldo', `No tienes suficientes monedas.`);
      return;
    }
    // Descontar apuesta
    const saldoResta = monedas - apuestaActual;
    actualizarMonedas(saldoResta);

    setVerTapete(true);
    setEnPartida(false);
    setRepartiendo(true);
    setResultadoTipo(''); setResultadoSplit('');
    setMensajeResultado(''); setMensajeSplit('');
    setManoSplit([]); setJugandoSplit(false);
    setApuestaDoble(0);
    setOfrecerSeguro(false);

    const zapato = crearZapato();
    const cJ1 = zapato.pop();
    const cC1 = zapato.pop();
    const cJ2 = zapato.pop();
    const cC2 = zapato.pop(); // carta oculta del crupier

    setManoJugador([cJ1]);
    setManoCrupier([cC1]);
    setBaraja(zapato);

    setTimeout(() => {
      setManoJugador([cJ1, cJ2]);
    }, 400);

    setTimeout(() => {
      const manoJ = [cJ1, cJ2];
      const manoC = [cC1, cC2];
      setManoCrupier(manoC);
      setRepartiendo(false);

      const bjJ = esBJ(manoJ);
      const bjC = esBJ(manoC);

      // ── Comprobar si ofrecer seguro (carta visible del crupier es As)
      if (cC1.nombre === 'A' && !bjJ) {
        setOfrecerSeguro(true);
        setEnPartida(true); // dejamos que el jugador decida
        setPuedeDoble(false);
        setPuedeSplit(false);
        return;
      }

      // ── BJ natural
      if (bjJ || bjC) {
        setEnPartida(false);
        if (bjJ && bjC) {
          setResultadoTipo('empate');
          setMensajeResultado('Doble Blackjack Natural. Empate.');
          // Devolver apuesta (ya descontada)
          actualizarMonedas(saldoResta + apuestaActual);
        } else if (bjJ) {
          logro('bj_natural');
          const g = resolverPago('ganado', apuestaActual, true);
          const s = saldoResta + apuestaActual + g;
          actualizarMonedas(s);
          verificarAuxilioBancarrota(s);
          setResultadoTipo('ganado');
          setMensajeResultado(`BLACKJACK! Ganas ${g} monedas.`);
        } else {
          resolverPago('perdido', apuestaActual);
          verificarAuxilioBancarrota(saldoResta);
          setResultadoTipo('perdido');
          setMensajeResultado('Blackjack del crupier. Gana la casa.');
        }
        return;
      }

      // ── Partida normal
      setPuedeDoble(true); // solo con 2 cartas iniciales
      setPuedeSplit(manoJ[0].valor === manoJ[1].valor);
      setEnPartida(true);
    }, 800);
  };

  const rechazarSeguro = () => {
    setOfrecerSeguro(false);
    setPuedeDoble(true);
    setPuedeSplit(puedeSplitMano(manoJugador));
  };

  const aceptarSeguro = () => {
    const costeSeguro = Math.floor(apuestaActual / 2);
    if (monedas < costeSeguro) { Alert.alert('Falta saldo', 'No tienes monedas para el seguro.'); return; }
    const s = monedas - costeSeguro;
    actualizarMonedas(s);
    setOfrecerSeguro(false);
    if (esBJ(manoCrupier)) {
      const cobro = costeSeguro * 2;
      actualizarMonedas(s + cobro);
      setEnPartida(false);
      setResultadoTipo('perdido');
      setMensajeResultado(`Blackjack del crupier. Seguro cobrado: +${cobro} monedas.`);
    } else {
      setPuedeDoble(true);
      setPuedeSplit(puedeSplitMano(manoJugador));
    }
  };

  const pedirCarta = () => {
    if (!enPartida || repartiendo || ofrecerSeguro) return;
    const zapato = [...baraja];
    const carta = zapato.pop();
    setBaraja(zapato);
    setPuedeDoble(false); setPuedeSplit(false);

    if (jugandoSplit) {
      const mano = [...manoSplit, carta];
      setManoSplit(mano);
      if (calcularPuntos(mano) > 21) {
        // Split mano 2 busto → turno crupier
        setEnPartida(false);
        ejecutarTurnoCrupier(zapato, [...manoCrupier], manoJugador, mano, monedas - apuestaActual);
      }
    } else {
      const mano = [...manoJugador, carta];
      setManoJugador(mano);
      if (calcularPuntos(mano) > 21) {
        if (manoSplit.length > 0) {
          // Mano 1 busto, pasar a mano 2
          setResultadoTipo('perdido');
          setMensajeResultado('Te pasaste en la primera mano.');
          setJugandoSplit(true);
        } else {
          setEnPartida(false);
          setResultadoTipo('perdido');
          setMensajeResultado('Te has pasado de 21. Gana la casa.');
          verificarAuxilioBancarrota(monedas);
        }
      }
    }
  };

  const doblarApuesta = () => {
    if (!enPartida || !puedeDoble) return;
    if (monedas < apuestaActual) { Alert.alert('Falta saldo', 'No tienes monedas para doblar.'); return; }
    const s = monedas - apuestaActual;
    actualizarMonedas(s);
    const doble = apuestaActual;
    setApuestaDoble(doble);
    setPuedeDoble(false); setPuedeSplit(false);

    const zapato = [...baraja];
    const carta = zapato.pop();
    const nuevaMano = [...manoJugador, carta];
    setManoJugador(nuevaMano);
    setBaraja(zapato);

    setTimeout(() => {
      setEnPartida(false);
      if (calcularPuntos(nuevaMano) > 21) {
        setResultadoTipo('perdido');
        setMensajeResultado('Doble — te has pasado. Gana la casa.');
        verificarAuxilioBancarrota(s);
      } else {
        ejecutarTurnoCrupier(zapato, [...manoCrupier], nuevaMano, [], s, doble);
      }
    }, 300);
  };

  const hacerSplit = () => {
    if (!enPartida || !puedeSplit) return;
    if (monedas < apuestaActual) { Alert.alert('Falta saldo', 'No tienes monedas para el split.'); return; }
    const s = monedas - apuestaActual;
    actualizarMonedas(s);

    const zapato = [...baraja];
    const carta1 = manoJugador[0];
    const carta2 = manoJugador[1];
    const mano1 = [carta1, zapato.pop()];
    const mano2 = [carta2, zapato.pop()];

    setManoJugador(mano1);
    setManoSplit(mano2);
    setBaraja(zapato);
    setPuedeDoble(false); setPuedeSplit(false);

    if (carta1.nombre === 'A') {
      // Split de Ases: una carta por mano, resolver directo
      setEnPartida(false);
      setTimeout(() => ejecutarTurnoCrupier(zapato, [...manoCrupier], mano1, mano2, s, 0), 400);
    } else {
      setJugandoSplit(false); // jugar mano 1 primero
      setEnPartida(true);
    }
  };

  const rendirse = () => {
    if (!enPartida || !puedeDoble) return; // solo disponible con 2 cartas iniciales
    const devuelto = Math.floor(apuestaActual / 2);
    // La apuesta ya fue descontada al inicio, devolvemos la mitad
    actualizarMonedas(monedas + devuelto);
    setEnPartida(false);
    setResultadoTipo('perdido');
    setMensajeResultado(`Te rindes. Recuperas ${devuelto} monedas.`);
  };

  const plantarse = () => {
    if (!enPartida) return;

    // Si hay split y estamos en mano 1, pasar a mano 2
    if (!jugandoSplit && manoSplit.length > 0) {
      setJugandoSplit(true);
      return;
    }

    setEnPartida(false);
    ejecutarTurnoCrupier([...baraja], [...manoCrupier], manoJugador, manoSplit, monedas, apuestaDoble);
  };

  const ejecutarTurnoCrupier = (zapato, manoC, mJ1, mJ2, saldoBase, dobleExtra = 0) => {
    // saldoBase: saldo DESPUÉS de descontar todas las apuestas
    const turno = () => {
      if (calcularPuntos(manoC) < 17) {
        manoC.push(zapato.pop());
        setManoCrupier([...manoC]);
        setBaraja([...zapato]);
        setTimeout(turno, 550);
        return;
      }
      // Resolver mano principal
      const { res: r1, msg: m1 } = finalizarMano(mJ1, manoC);
      setResultadoTipo(r1);
      setMensajeResultado(m1);

      // Calcular saldo final partiendo de saldoBase (apuestas ya descontadas)
      let saldoFinal = saldoBase;
      // Devolver apuesta principal + ganancias
      if (r1 === 'ganado') saldoFinal += apuestaActual * 2; // apuesta + premio
      else if (r1 === 'empate') saldoFinal += apuestaActual; // solo devolver

      // Doblar: si ganó devolver también la apuesta doble + premio
      if (dobleExtra > 0) {
        if (r1 === 'ganado') saldoFinal += dobleExtra * 2;
        else if (r1 === 'empate') saldoFinal += dobleExtra;
      }

      // Resolver split si existe
      if (mJ2 && mJ2.length > 0) {
        const { res: r2, msg: m2 } = finalizarMano(mJ2, manoC);
        setResultadoSplit(r2);
        setMensajeSplit(m2);
        if (r2 === 'ganado') saldoFinal += apuestaActual * 2;
        else if (r2 === 'empate') saldoFinal += apuestaActual;
      }

      actualizarMonedas(saldoFinal);
      verificarAuxilioBancarrota(saldoFinal);

      // Actualizar racha
      if (r1 === 'ganado') ganarRacha();
      else if (r1 === 'perdido') perderRacha();
    };
    turno();
  };

  return {
    enPartida, repartiendo, manoJugador, manoSplit, jugandoSplit, manoCrupier,
    resultadoTipo, resultadoSplit, mensajeResultado, mensajeSplit, verTapete, setVerTapete,
    ofrecerSeguro, puedeDoble, puedeSplit, apuestaActual, setApuestaActual,
    iniciarPartida, rechazarSeguro, aceptarSeguro, pedirCarta, doblarApuesta, hacerSplit, rendirse, plantarse,
  };
}

// ── Pantalla ────────────────────────────────────────────────────────────────
export function MesaBlackjack({ bj, monedas, rachaActual, rachaMaxima, onAyuda, onSalir }) {
  if (!bj.verTapete) {
    return (
      <View style={styles.lobbyCasinoCaja}>
        <View style={styles.tarjetaBlancaLobbyBase}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={20} color="#FEF08A" />
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1, flex: 1 }}>MESA DE BLACKJACK</Text>
            <BotonAyuda onPress={onAyuda} />
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

          <SelectorApuesta
            valor={bj.apuestaActual} setValor={bj.setApuestaActual} monedas={monedas}
            style={{ marginVertical: 14 }} estiloEtiqueta={{ color: '#aaa' }}
          />

          <TouchableOpacity style={styles.btnIniciarJuegoPremium} onPress={bj.iniciarPartida}>
            <Text style={styles.txtBtnJuegoText}>REPARTIR CARTAS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnRegresarLobbyMenu} onPress={onSalir}>
            <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 13 }}>← Volver al menú</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cBanner = colorClaro(bj.resultadoTipo);
  const cSplit  = colorClaro(bj.resultadoSplit);

  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      {/* MANO CRUPIER */}
      <View style={styles.zonaJugadorFila}>
        <Text style={styles.txtMarcadorEtiqueta}>
          CRUPIER ({(!bj.enPartida && !bj.repartiendo && !bj.ofrecerSeguro) ? `${calcularPuntos(bj.manoCrupier)} PTS` : '???'})
        </Text>
        <View style={styles.filaCartasContenedor}>
          {bj.manoCrupier.map((carta, index) => (
            <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo}
              oculta={(bj.enPartida || bj.ofrecerSeguro) && index === 1} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 8 }}>
        <View style={[styles.lineaMesaSeparador, { width: '30%' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(91,50,129,0.4)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 }}>
          <Flame size={12} color="#EAB308" />
          <Text style={{ color: '#E2D5EE', fontSize: 10, fontWeight: '900' }}>RACHA: {rachaActual}</Text>
        </View>
        <View style={[styles.lineaMesaSeparador, { width: '30%' }]} />
      </View>

      {/* MANO JUGADOR */}
      <View style={styles.zonaJugadorFila}>
        <Text style={styles.txtMarcadorEtiqueta}>
          TU MANO ({calcularPuntos(bj.manoJugador)} PTS){bj.jugandoSplit ? ' — JUGANDO MANO 1' : ''}
        </Text>
        <View style={styles.filaCartasContenedor}>
          {bj.manoJugador.map((carta, index) => (
            <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={false} />
          ))}
        </View>
      </View>

      {/* MANO SPLIT (si existe) */}
      {bj.manoSplit.length > 0 && (
        <View style={[styles.zonaJugadorFila, { opacity: bj.jugandoSplit ? 1 : 0.5 }]}>
          <Text style={styles.txtMarcadorEtiqueta}>
            MANO 2 — SPLIT ({calcularPuntos(bj.manoSplit)} PTS){bj.jugandoSplit ? ' — JUGANDO AHORA' : ''}
          </Text>
          <View style={styles.filaCartasContenedor}>
            {bj.manoSplit.map((carta, index) => (
              <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={false} />
            ))}
          </View>
          {bj.resultadoSplit !== '' && (
            <View style={[styles.bannerResultadoFino, { backgroundColor: cSplit.fondo, borderColor: cSplit.borde, marginTop: 6 }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: cSplit.texto }}>
                {bj.mensajeSplit}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* BANNER RESULTADO */}
      <View style={[styles.bannerResultadoFino, {
        backgroundColor: bj.mensajeResultado ? cBanner.fondo : 'transparent',
        borderColor: bj.mensajeResultado ? cBanner.borde : 'transparent',
      }]}>
        <Text style={[styles.txtBannerResultadoText, {
          color: bj.mensajeResultado ? cBanner.texto : 'transparent',
        }]}>{bj.mensajeResultado || ' '}</Text>
      </View>

      <View style={{ paddingHorizontal: 4, marginTop: 10, gap: 8 }}>

        {/* SEGURO — oferta */}
        {bj.ofrecerSeguro && (
          <>
            <Text style={{ color: '#FEF08A', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
              El crupier muestra un As. ¿Quieres contratar un seguro?{'\n'}Cuesta {Math.floor(bj.apuestaActual / 2)} monedas. Paga 2:1 si tiene Blackjack.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.btnCasinoAccionSecundario, { flex: 1 }]} onPress={bj.rechazarSeguro}>
                <Text style={{ color: '#D1D5DB', fontWeight: '900', fontSize: 13 }}>NO, SEGUIR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnBlackjackFijoMorado, { flex: 1 }]} onPress={bj.aceptarSeguro}>
                <Text style={styles.txtBtnAccionPrincipalText}>CONTRATAR SEGURO</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* BOTONES EN PARTIDA */}
        {bj.enPartida && !bj.ofrecerSeguro && (
          <>
            {/* Fila principal: Pedir + Plantarse */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity disabled={bj.repartiendo} style={[styles.btnBlackjackFijoBlanco, { flex: 1 }]} onPress={bj.pedirCarta}>
                <Text style={styles.txtBtnAccionSecundarioText}>PEDIR</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={bj.repartiendo} style={[styles.btnBlackjackFijoMorado, { flex: 1 }]} onPress={bj.plantarse}>
                <Text style={styles.txtBtnAccionPrincipalText}>PLANTARSE</Text>
              </TouchableOpacity>
            </View>

            {/* Fila secundaria: Doblar + Split + Rendirse */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {bj.puedeDoble && (
                <TouchableOpacity
                  style={[styles.btnCasinoAccionSecundario, { flex: 1, opacity: monedas >= bj.apuestaActual ? 1 : 0.4 }]}
                  onPress={bj.doblarApuesta} disabled={monedas < bj.apuestaActual}
                >
                  <Text style={{ color: '#FEF08A', fontWeight: '800', fontSize: 12 }}>DOBLAR</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '600' }}>×2 apuesta</Text>
                </TouchableOpacity>
              )}
              {bj.puedeSplit && (
                <TouchableOpacity
                  style={[styles.btnCasinoAccionSecundario, { flex: 1, opacity: monedas >= bj.apuestaActual ? 1 : 0.4 }]}
                  onPress={bj.hacerSplit} disabled={monedas < bj.apuestaActual}
                >
                  <Text style={{ color: '#34D399', fontWeight: '800', fontSize: 12 }}>SPLIT</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '600' }}>dividir mano</Text>
                </TouchableOpacity>
              )}
              {bj.puedeDoble && (
                <TouchableOpacity style={[styles.btnCasinoAccionSecundario, { flex: 1 }]} onPress={bj.rendirse}>
                  <Text style={{ color: '#F87171', fontWeight: '800', fontSize: 12 }}>RENDIRSE</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '600' }}>-{Math.floor(bj.apuestaActual / 2)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* BOTONES POST-MANO */}
        {!bj.enPartida && !bj.ofrecerSeguro && (
          <>
            <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={bj.iniciarPartida}>
              <Text style={styles.txtBtnOtraPartidaText}>NUEVA MANO</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={bj.repartiendo} style={styles.btnSalirAlLobby} onPress={() => bj.setVerTapete(false)}>
              <LogOut size={16} color="#D1D5DB" style={{ marginRight: 6 }} />
              <Text style={styles.txtBtnSalirLobbyText}>ABANDONAR MESA</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
