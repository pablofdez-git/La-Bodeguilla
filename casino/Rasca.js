// casino/Rasca.js — Rasca y Gana (límite de cartones diario)
import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertTriangle } from 'lucide-react-native';
import { styles } from './estilos';
import { CabeceraJuego, BotonSalirMenu, SelectorApuesta, BannerResultado, coloresBannerOscuro } from './componentes';
import { SIMBOLOS_RASCA, RASCA_LIMITE_DIARIO } from './datos';

const COLORES_RASCA = coloresBannerOscuro({ fondo: 'rgba(254,240,138,0.06)', borde: 'rgba(255,255,255,0.1)', texto: '#9CA3AF' });

const hoyISO = () => new Date().toISOString().slice(0, 10);
const barajar = (arr) => [...arr].sort(() => Math.random() - 0.5);

// Genera las 6 casillas del cartón según las probabilidades del juego
function generarCarton() {
  const rand = Math.random();
  let simbolos;

  if (rand < 0.08) {
    // 8% — trifecta: exactamente 3 iguales, los otros 3 todos distintos entre sí y distintos al ganador
    const ganador = SIMBOLOS_RASCA[Math.floor(Math.random() * SIMBOLOS_RASCA.length)];
    const resto = barajar(SIMBOLOS_RASCA.filter(s => s !== ganador));
    simbolos = [ganador, ganador, ganador, resto[0], resto[1], resto[2]];
  } else if (rand < 0.43) {
    // 35% — par exacto: exactamente 2 iguales, los otros 4 todos distintos entre sí y al ganador
    const ganador = SIMBOLOS_RASCA[Math.floor(Math.random() * SIMBOLOS_RASCA.length)];
    const resto = barajar(SIMBOLOS_RASCA.filter(s => s !== ganador));
    simbolos = [ganador, ganador, resto[0], resto[1], resto[2], resto[3]];
  } else {
    // 57% — sin premio: 6 símbolos todos distintos (imposible par ni trío)
    simbolos = barajar(SIMBOLOS_RASCA).slice(0, 6);
  }

  // Mezclar posiciones para que el resultado no sea predecible visualmente
  for (let i = simbolos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [simbolos[i], simbolos[j]] = [simbolos[j], simbolos[i]];
  }
  return simbolos;
}

// Calcula el premio de un cartón ya revelado
function evaluarCarton(casillas, apuesta) {
  const conteo = {};
  casillas.forEach(c => { conteo[c.simbolo] = (conteo[c.simbolo] || 0) + 1; });
  const maxIguales = Math.max(...Object.values(conteo));
  const simboloGanador = Object.keys(conteo).find(k => conteo[k] === maxIguales);

  if (maxIguales >= 3) {
    const mult = simboloGanador === '💎' ? 25 : simboloGanador === '💵' ? 15 : 8;
    const premio = apuesta * mult;
    return { premio, tipo: 'ganado', trifecta: true, msg: `🎉 ¡TRIFECTA! ${simboloGanador}×3 — +${premio} monedas` };
  }
  if (maxIguales === 2) {
    const premio = apuesta * 2;
    return { premio, tipo: 'ganado', msg: `✨ Par de ${simboloGanador} — +${premio} monedas` };
  }
  return { premio: 0, tipo: 'perdido', msg: '❌ Sin premio. ¡Prueba otro cartón!' };
}

export function useRasca({ monedas, actualizarMonedas, verificarAuxilioBancarrota, logro }) {
  const [rascaApuesta,       setRascaApuesta]       = useState(20);
  const [rascaCasillas,      setRascaCasillas]      = useState([]);
  const [rascaFase,          setRascaFase]          = useState('comprar'); // 'comprar' | 'rascando' | 'fin'
  const [rascaMensaje,       setRascaMensaje]       = useState('');
  const [rascaResultadoTipo, setRascaResultadoTipo] = useState('');
  const [rascaTiradasHoy,    setRascaTiradasHoy]    = useState(0); // límite diario de tiradas

  // Al montar: cargar el contador de hoy (o reiniciarlo si es un día nuevo)
  useEffect(() => {
    (async () => {
      try {
        const hoy = hoyISO();
        const rascaDia   = await AsyncStorage.getItem('@rasca_dia');
        const rascaCount = await AsyncStorage.getItem('@rasca_count');
        if (rascaDia === hoy && rascaCount) {
          setRascaTiradasHoy(parseInt(rascaCount, 10));
        } else if (rascaDia !== hoy) {
          // Nuevo día — resetear contador
          await AsyncStorage.setItem('@rasca_dia', hoy);
          await AsyncStorage.setItem('@rasca_count', '0');
          setRascaTiradasHoy(0);
        }
      } catch (_) {}
    })();
  }, []);

  const comprar = async () => {
    // Comprobar límite diario
    if (rascaTiradasHoy >= RASCA_LIMITE_DIARIO) {
      Alert.alert(
        'Límite diario alcanzado',
        `Solo se pueden comprar ${RASCA_LIMITE_DIARIO} cartones al día. Vuelve mañana.`
      );
      return;
    }
    if (monedas < rascaApuesta) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas para comprar el cartón.');
      return;
    }

    // Registrar tirada
    const nuevasTiradas = rascaTiradasHoy + 1;
    setRascaTiradasHoy(nuevasTiradas);
    await AsyncStorage.setItem('@rasca_dia', hoyISO());
    await AsyncStorage.setItem('@rasca_count', nuevasTiradas.toString());

    actualizarMonedas(monedas - rascaApuesta);

    setRascaCasillas(generarCarton().map(s => ({ simbolo: s, revelada: false })));
    setRascaFase('rascando');
    setRascaMensaje('Toca cada casilla para rascar...');
    setRascaResultadoTipo('');
  };

  // Cobra el premio y muestra el resultado. Al rascar a mano también se
  // comprueba la bancarrota tras cobrar; con "revelar todo" solo si no hay premio.
  const resolver = (casillas, comprobarTrasPremio) => {
    const { premio, tipo, msg, trifecta } = evaluarCarton(casillas, rascaApuesta);
    if (trifecta) logro('rasca_trifecta');
    setRascaResultadoTipo(tipo);
    if (premio > 0) {
      const nuevoSaldo = monedas + premio;
      actualizarMonedas(nuevoSaldo);
      if (comprobarTrasPremio) verificarAuxilioBancarrota(nuevoSaldo);
    } else {
      verificarAuxilioBancarrota(monedas);
    }
    setRascaMensaje(msg);
    setRascaFase('fin');
  };

  const rascarCasilla = (index) => {
    if (rascaFase !== 'rascando') return;
    const nuevas = rascaCasillas.map((c, i) => i === index ? { ...c, revelada: true } : c);
    setRascaCasillas(nuevas);
    // Si todas reveladas, calcular premio
    if (nuevas.every(c => c.revelada)) resolver(nuevas, true);
  };

  const revelarTodo = () => {
    if (rascaFase !== 'rascando') return;
    const nuevas = rascaCasillas.map(c => ({ ...c, revelada: true }));
    setRascaCasillas(nuevas);
    resolver(nuevas, false);
  };

  const nueva = () => {
    setRascaCasillas([]);
    setRascaFase('comprar');
    setRascaMensaje('');
    setRascaResultadoTipo('');
  };

  return {
    rascaApuesta, setRascaApuesta, rascaCasillas, rascaFase, rascaMensaje, rascaResultadoTipo, rascaTiradasHoy,
    comprar, rascarCasilla, revelarTodo, nueva,
  };
}

export function MesaRasca({ ra, monedas, onAyuda, onSalir }) {
  const limite = ra.rascaTiradasHoy >= RASCA_LIMITE_DIARIO;
  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      <CabeceraJuego Icono={AlertTriangle} color="#34D399" titulo="RASCA Y GANA" onAyuda={onAyuda} />

      {/* Fase: comprar cartón */}
      {ra.rascaFase === 'comprar' && (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', width: '100%' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginBottom: 4 }}>CARTÓN LA BODEGUILLA</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', lineHeight: 17 }}>9 símbolos · 6 casillas · Par x2{'\n'}💎×3 → x25 · 💵×3 → x15 · resto → x8</Text>
            {/* Contador tiradas */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: limite ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: limite ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.3)' }}>
              <Text style={{ color: limite ? '#F87171' : '#34D399', fontSize: 12, fontWeight: '800' }}>
                {limite
                  ? 'Límite diario alcanzado — vuelve mañana'
                  : `Tiradas hoy: ${ra.rascaTiradasHoy} / ${RASCA_LIMITE_DIARIO}`}
              </Text>
            </View>
          </View>
          <SelectorApuesta valor={ra.rascaApuesta} setValor={ra.setRascaApuesta} monedas={monedas} etiqueta="Precio:" />
          <TouchableOpacity
            style={[styles.btnIniciarJuegoPremium, limite && { opacity: 0.4 }]}
            onPress={ra.comprar}
            disabled={limite}
          >
            <Text style={styles.txtBtnJuegoText}>COMPRAR CARTÓN</Text>
          </TouchableOpacity>
          <BotonSalirMenu onPress={onSalir} />
        </View>
      )}

      {/* Fase: rascando / fin */}
      {(ra.rascaFase === 'rascando' || ra.rascaFase === 'fin') && (
        <View style={{ gap: 12 }}>

          <BannerResultado mensaje={ra.rascaMensaje} tipo={ra.rascaResultadoTipo} colores={COLORES_RASCA} />

          {/* Grid 2x3 de casillas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {ra.rascaCasillas.map((casilla, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => ra.rascarCasilla(i)}
                disabled={casilla.revelada || ra.rascaFase === 'fin'}
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
            {ra.rascaFase === 'rascando' && (
              <TouchableOpacity style={styles.btnBlackjackFijoBlanco} onPress={ra.revelarTodo}>
                <Text style={styles.txtBtnAccionSecundarioText}>REVELAR TODO</Text>
              </TouchableOpacity>
            )}
            {ra.rascaFase === 'fin' && (
              <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={ra.nueva}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>OTRO CARTÓN</Text>
              </TouchableOpacity>
            )}
            <BotonSalirMenu onPress={() => { ra.nueva(); onSalir(); }} />
          </View>
        </View>
      )}
    </View>
  );
}
