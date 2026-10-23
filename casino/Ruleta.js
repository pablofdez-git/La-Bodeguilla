// casino/Ruleta.js — Ruleta europea con tapete táctil
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { styles } from './estilos';
import { BotonAyuda, BotonSalirMenu } from './componentes';
import { NUMEROS_RULETA } from './datos';

const APUESTAS_VACIAS = { rojo: 0, negro: 0, par: 0, impar: 0, numeros: {} };
const COLOR_INICIAL = '#451A60';
const colorHex = (color) => (color === 'rojo' ? '#b91c1c' : color === 'negro' ? '#1c1c1e' : '#15803d');

// Apuestas simples del tapete (fila inferior)
const APUESTAS_SIMPLES = [
  { tipo: 'rojo',  texto: 'ROJO',  fondo: '#b91c1c' },
  { tipo: 'negro', texto: 'NEGRO', fondo: '#1c1c1e' },
  { tipo: 'par',   texto: 'PAR' },
  { tipo: 'impar', texto: 'IMPAR' },
];

export function useRuleta({ monedas, actualizarMonedas, verificarAuxilioBancarrota, logro }) {
  const [fichaSeleccionada,   setFichaSeleccionada]   = useState(10);
  const [girandoRuleta,       setGirandoRuleta]       = useState(false);
  const [numeroGanadorRuleta, setNumeroGanadorRuleta] = useState(null);
  const [colorGanadorRuleta,  setColorGanadorRuleta]  = useState(COLOR_INICIAL);
  const [apuestasRuleta,      setApuestasRuleta]      = useState(APUESTAS_VACIAS);

  const [mostrarOverlayRuleta, setMostrarOverlayRuleta] = useState(false);
  const [textoOverlayRuleta,   setTextoOverlayRuleta]   = useState('');
  const [colorOverlayFondo,    setColorOverlayFondo]    = useState('rgba(0,0,0,0.8)');

  const calcularTotalApostado = () => {
    let total = apuestasRuleta.rojo + apuestasRuleta.negro + apuestasRuleta.par + apuestasRuleta.impar;
    Object.values(apuestasRuleta.numeros).forEach(v => { total += v; });
    return total;
  };

  const agregarApuesta = (tipo, numero = null) => {
    if (girandoRuleta) return;
    if (monedas < fichaSeleccionada) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas.');
      return;
    }
    actualizarMonedas(monedas - fichaSeleccionada);
    setApuestasRuleta(prev => {
      if (numero !== null) {
        const nuevosNumeros = { ...prev.numeros };
        nuevosNumeros[numero] = (nuevosNumeros[numero] || 0) + fichaSeleccionada;
        return { ...prev, numeros: nuevosNumeros };
      } else { return { ...prev, [tipo]: prev[tipo] + fichaSeleccionada }; }
    });
  };

  const limpiarTapete = () => {
    if (girandoRuleta) return;
    const devuelto = calcularTotalApostado();
    if (devuelto > 0) actualizarMonedas(monedas + devuelto);
    setApuestasRuleta(APUESTAS_VACIAS);
    setNumeroGanadorRuleta(null);
    setColorGanadorRuleta(COLOR_INICIAL);
  };

  const lanzarBola = () => {
    const totalJugado = calcularTotalApostado();
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
      setColorGanadorRuleta(colorHex(itemFalso.color));

      duracionTotal += velocidad;
      if (duracionTotal < 3200) {
        if (duracionTotal > 2000) velocidad += 45;
        setTimeout(simularGiroProgresivo, velocidad);
        return;
      }

      const bola = Math.floor(Math.random() * 37);
      const datosPremio = NUMEROS_RULETA.find(r => r.n === bola);
      setNumeroGanadorRuleta(bola);
      setColorGanadorRuleta(colorHex(datosPremio.color));

      let balancePremios = 0;
      if (bola !== 0) {
        if (datosPremio.color === 'rojo') balancePremios += apuestasRuleta.rojo * 2;
        if (datosPremio.color === 'negro') balancePremios += apuestasRuleta.negro * 2;
        if (bola % 2 === 0) balancePremios += apuestasRuleta.par * 2;
        if (bola % 2 !== 0) balancePremios += apuestasRuleta.impar * 2;
      }
      if (apuestasRuleta.numeros[bola]) {
        balancePremios += apuestasRuleta.numeros[bola] * 36;
        logro('ruleta_numero');
      }

      const saldoFinalCasino = monedas + balancePremios;
      actualizarMonedas(saldoFinalCasino);

      setColorOverlayFondo(
        datosPremio.color === 'rojo' ? 'rgba(185, 28, 28, 0.5)' : datosPremio.color === 'negro' ? 'rgba(28, 28, 30, 0.65)' : 'rgba(21, 128, 61, 0.6)'
      );
      setTextoOverlayRuleta(balancePremios > 0
        ? `¡HAS GANADO!\n+${balancePremios} MONEDAS`
        : `GANA LA CASA\nHas perdido tu apuesta`);
      setMostrarOverlayRuleta(true);

      setApuestasRuleta(APUESTAS_VACIAS);
      setGirandoRuleta(false);
      verificarAuxilioBancarrota(saldoFinalCasino);
    };
    setTimeout(simularGiroProgresivo, velocidad);
  };

  const cerrarResultadoOverlay = () => {
    setMostrarOverlayRuleta(false);
    setNumeroGanadorRuleta(null);
    setColorGanadorRuleta(COLOR_INICIAL);
  };

  return {
    fichaSeleccionada, setFichaSeleccionada, girandoRuleta, numeroGanadorRuleta, colorGanadorRuleta,
    apuestasRuleta, mostrarOverlayRuleta, textoOverlayRuleta, colorOverlayFondo,
    calcularTotalApostado, agregarApuesta, limpiarTapete, lanzarBola, cerrarResultadoOverlay,
  };
}

// Ficha colocada sobre una casilla
const BadgeFicha = ({ valor }) => (valor > 0 ? (
  <View style={styles.badgeFichaColocadaAmpliada}><Text>{valor}</Text></View>
) : null);

export function MesaRuleta({ ru, onAyuda, onSalir }) {
  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      <View style={styles.hudContenedorRuletaAmpliado}>
        <Text style={{ color: '#E2D5EE', fontSize: 13, fontWeight: '800' }}>BOLA</Text>
        <View style={[styles.circuloResultadoRuletaGigante, { backgroundColor: ru.colorGanadorRuleta }]}>
          <Text style={styles.txtResultadoRuletaNumeroGigante}>{ru.numeroGanadorRuleta !== null ? ru.numeroGanadorRuleta : '--'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Apuesta: {ru.calcularTotalApostado()}</Text>
          <BotonAyuda onPress={onAyuda} />
        </View>
      </View>

      <View style={styles.tapeteGridFichasAmpliado}>
        <View style={{ flexDirection: 'row', width: '100%', height: 115 }}>
          <TouchableOpacity style={styles.casillaCeroVerticalAmpliada} onPress={() => ru.agregarApuesta(null, 0)}>
            <Text style={styles.txtCasillaTapeteTxtAmpliado}>0</Text>
            <BadgeFicha valor={ru.apuestasRuleta.numeros[0]} />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 560, height: 110 }}>
              {NUMEROS_RULETA.slice(1).map((item) => (
                <TouchableOpacity
                  key={item.n}
                  style={[styles.casillaTapeteNumero, { backgroundColor: item.color === 'rojo' ? '#b91c1c' : '#1c1c1e', width: 43, height: 32, margin: 1.5 }]}
                  onPress={() => ru.agregarApuesta(null, item.n)}
                >
                  <Text style={styles.txtCasillaTapeteTxtAmpliado}>{item.n}</Text>
                  <BadgeFicha valor={ru.apuestasRuleta.numeros[item.n]} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', width: '100%', gap: 6, marginTop: 8 }}>
          {APUESTAS_SIMPLES.map(a => (
            <TouchableOpacity
              key={a.tipo}
              style={[styles.btnSuerteSencillaTapete, a.fondo && { backgroundColor: a.fondo }, { height: 34 }]}
              onPress={() => ru.agregarApuesta(a.tipo)}
            >
              <Text style={styles.txtCasillaTapeteTxtAmpliado}>{a.texto}</Text>
              <BadgeFicha valor={ru.apuestasRuleta[a.tipo]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.contenedorFichasFisicasAmpliado}>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          {[10, 20, 50].map((valor) => (
            <TouchableOpacity key={valor} style={[styles.fichaFisicaCirculo, ru.fichaSeleccionada === valor && styles.fichaFisicaCirculoActiva, { width: 44, height: 44, borderRadius: 22 }]} onPress={() => ru.setFichaSeleccionada(valor)}>
              <Text style={{ fontWeight: '900', fontSize: 15, color: ru.fichaSeleccionada === valor ? '#fff' : '#000' }}>{valor}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ gap: 6, paddingBottom: 4 }}>
        <TouchableOpacity disabled={ru.girandoRuleta} style={[styles.btnOtraPartidaVerde, { paddingVertical: 12 }]} onPress={ru.lanzarBola}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>TIRAR BOLA</Text></TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity disabled={ru.girandoRuleta} style={[styles.btnCasinoAccionSecundario, { paddingVertical: 10 }]} onPress={ru.limpiarTapete}><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#D1D5DB' }}>LIMPIAR</Text></TouchableOpacity>
          <BotonSalirMenu disabled={ru.girandoRuleta} texto="← MENÚ" style={{ paddingVertical: 10, flex: 1, width: 'auto' }} onPress={onSalir} />
        </View>
      </View>

      {ru.mostrarOverlayRuleta && (
        <TouchableOpacity activeOpacity={0.9} style={[styles.overlayResultadoTranslucido, { backgroundColor: ru.colorOverlayFondo }]} onPress={ru.cerrarResultadoOverlay}>
          <View style={styles.contenedorCentralOverlay}>
            <View style={[styles.circuloResultadoRuletaGrande, { backgroundColor: ru.colorGanadorRuleta, width: 100, height: 100, borderRadius: 50 }]}>
              <Text style={styles.txtOverlayNumeroGigante}>{ru.numeroGanadorRuleta}</Text>
            </View>
            <Text style={styles.txtOverlayMensajePremio}>{ru.textoOverlayRuleta}</Text>
            <Text style={styles.txtOverlaySubtituloToque}>Toca para continuar</Text>
          </View>
        </TouchableOpacity>
      )}

    </View>
  );
}
