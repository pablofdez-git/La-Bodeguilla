// casino/War.js — War (carta alta) con opción de ir a la guerra
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { Layers } from 'lucide-react-native';
import { styles } from './estilos';
import { RenderizarCarta, CartasBocaAbajo, CabeceraJuego, BotonSalirMenu, SelectorApuesta, BannerResultado, coloresBannerOscuro } from './componentes';
import { BARAJA_WAR } from './datos';

const COLORES_WAR = coloresBannerOscuro({ fondo: 'rgba(245,158,11,0.1)', borde: '#F59E0B', texto: '#FBBF24' });

const mezclar = () => [...BARAJA_WAR].sort(() => Math.random() - 0.5);
const mejorCarta = (cartas) => cartas.reduce((m, c) => c.valor > m.valor ? c : m);

export function useWar({ monedas, actualizarMonedas, verificarAuxilioBancarrota }) {
  const [warApuesta,       setWarApuesta]       = useState(20);
  const [warCartaJugador,  setWarCartaJugador]  = useState(null);
  const [warCartaCrupier,  setWarCartaCrupier]  = useState(null);
  const [warCartasGuerra,  setWarCartasGuerra]  = useState(null); // { jugador, crupier }
  const [warFase,          setWarFase]          = useState('inicio'); // 'inicio' | 'empate' | 'fin'
  const [warMensaje,       setWarMensaje]       = useState('');
  const [warResultadoTipo, setWarResultadoTipo] = useState(''); // 'ganado'|'perdido'|'empate'|''
  const [warAnimando,      setWarAnimando]      = useState(false);

  const jugar = () => {
    if (monedas < warApuesta) { Alert.alert('Falta saldo', 'No tienes suficientes monedas.'); return; }
    setWarAnimando(true);
    setWarMensaje('');
    setWarResultadoTipo('');
    setWarCartasGuerra(null);

    const saldoResta = monedas - warApuesta;
    actualizarMonedas(saldoResta);

    setTimeout(() => {
      // Cada uno recibe 3 cartas; gana quien tenga la carta más alta
      const mazoMezclado = mezclar();
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
        actualizarMonedas(saldoResta + warApuesta * 3);
        setWarMensaje(`🏆 ¡Tu ${cJugador.nombre}${cJugador.palo} supera al ${cCrupier.nombre}${cCrupier.palo}! +${warApuesta * 3} monedas`);
        setWarResultadoTipo('ganado');
        setWarFase('fin');
      } else if (cJugador.valor < cCrupier.valor) {
        actualizarMonedas(verificarAuxilioBancarrota(saldoResta));
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
    actualizarMonedas(saldoResta);

    setTimeout(() => {
      const [cJugador, cCrupier] = mezclar();
      setWarCartasGuerra({ jugador: cJugador, crupier: cCrupier });
      setWarAnimando(false);

      if (cJugador.valor >= cCrupier.valor) {
        // Gana la guerra: devuelve las 2 apuestas + x6 sobre la apuesta original (premio gordo)
        actualizarMonedas(saldoResta + warApuesta * 6);
        setWarMensaje(`🔥 ¡GUERRA GANADA! ${cJugador.nombre}${cJugador.palo} vs ${cCrupier.nombre}${cCrupier.palo} · +${warApuesta * 6} monedas`);
        setWarResultadoTipo('ganado');
      } else {
        actualizarMonedas(verificarAuxilioBancarrota(saldoResta));
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
    actualizarMonedas(saldoFin);
    setWarMensaje(`🏳️ Te rindes. Recuperas ${recuperado} monedas.`);
    setWarResultadoTipo('perdido');
    setWarFase('fin');
    verificarAuxilioBancarrota(saldoFin);
  };

  const resetear = () => {
    setWarCartaJugador(null);
    setWarCartaCrupier(null);
    setWarCartasGuerra(null);
    setWarFase('inicio');
    setWarMensaje('');
    setWarResultadoTipo('');
    setWarAnimando(false);
  };

  return {
    warApuesta, setWarApuesta, warCartaJugador, warCartaCrupier, warCartasGuerra, warFase,
    warMensaje, warResultadoTipo, warAnimando, jugar, irAGuerra, rendirse, resetear,
  };
}

// Mano de un lado de la mesa: 2 cartas pequeñas + la ganadora destacada
function ManoWar({ titulo, carta, animando, colorBorde }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>{titulo}</Text>
      {animando ? (
        <CartasBocaAbajo />
      ) : carta ? (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
          {/* Cartas secundarias más pequeñas */}
          {(carta.extras || []).map((c, i) => (
            <View key={i} style={{ opacity: 0.55, transform: [{ scale: 0.82 }] }}>
              <RenderizarCarta nombre={c.nombre} palo={c.palo} oculta={false} />
            </View>
          ))}
          {/* Carta ganadora destacada */}
          <View style={{ borderWidth: 2, borderColor: colorBorde, borderRadius: 9 }}>
            <RenderizarCarta nombre={carta.nombre} palo={carta.palo} oculta={false} />
          </View>
        </View>
      ) : (
        <View style={styles.cartaWarSlot}>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>—</Text>
        </View>
      )}
    </View>
  );
}

export function MesaWar({ wa, monedas, onAyuda, onSalir }) {
  const r = wa.warResultadoTipo;
  // Borde de la carta ganadora de cada lado según el resultado
  const colorBorde = r === 'ganado' ? '#34D399' : r === 'perdido' ? '#EF4444' : '#FBBF24';

  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      <CabeceraJuego Icono={Layers} color="#FBBF24" titulo="WAR — CARTA ALTA" onAyuda={onAyuda} />

      {/* Mesa de cartas */}
      <View style={{ gap: 8, marginBottom: 14 }}>
        <ManoWar titulo="CRUPIER" carta={wa.warCartaCrupier} animando={wa.warAnimando} colorBorde={colorBorde} />

        {/* Separador VS */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ color: '#FBBF24', fontWeight: '900', fontSize: 13, letterSpacing: 2 }}>VS</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>

        <ManoWar titulo="TÚ" carta={wa.warCartaJugador} animando={wa.warAnimando} colorBorde={colorBorde} />
      </View>

      {/* Cartas de la guerra (si las hay) */}
      {wa.warCartasGuerra && (
        <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 10 }}>
          <Text style={{ color: '#F87171', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', marginBottom: 8 }}>⚔️ CARTA DECISIVA</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
            {[['TÚ', wa.warCartasGuerra.jugador], ['CRUPIER', wa.warCartasGuerra.crupier]].map(([quien, c]) => (
              <View key={quien} style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '700' }}>{quien}</Text>
                <RenderizarCarta nombre={c.nombre} palo={c.palo} oculta={false} />
              </View>
            ))}
          </View>
        </View>
      )}

      {wa.warMensaje !== '' && (
        <BannerResultado mensaje={wa.warMensaje} tipo={r} colores={COLORES_WAR} style={{ marginBottom: 12 }} />
      )}

      {/* Selector apuesta (solo en inicio) */}
      {wa.warFase === 'inicio' && (
        <SelectorApuesta
          valor={wa.warApuesta} setValor={wa.setWarApuesta} monedas={monedas}
          style={{ justifyContent: 'center', marginBottom: 12 }}
        />
      )}

      {/* Botones según fase */}
      <View style={{ gap: 6 }}>
        {wa.warFase === 'inicio' && (
          <TouchableOpacity disabled={wa.warAnimando} style={styles.btnOtraPartidaVerde} onPress={wa.jugar}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>
              {wa.warAnimando ? 'REPARTIENDO...' : '⚔️ REPARTIR CARTAS'}
            </Text>
          </TouchableOpacity>
        )}

        {wa.warFase === 'empate' && (
          <>
            <TouchableOpacity disabled={wa.warAnimando} style={styles.btnBlackjackFijoMorado} onPress={wa.irAGuerra}>
              <Text style={styles.txtBtnAccionPrincipalText}>
                {wa.warAnimando ? 'EN GUERRA...' : `⚔️ IR A LA GUERRA · +${wa.warApuesta} más → ganas x6`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnBlackjackFijoBlanco} onPress={wa.rendirse}>
              <Text style={styles.txtBtnAccionSecundarioText}>🏳️ RENDIRSE (-{Math.floor(wa.warApuesta / 2)} monedas)</Text>
            </TouchableOpacity>
          </>
        )}

        {wa.warFase === 'fin' && (
          <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={wa.resetear}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>NUEVA MANO</Text>
          </TouchableOpacity>
        )}

        <BotonSalirMenu onPress={() => { wa.resetear(); onSalir(); }} />
      </View>
    </View>
  );
}
