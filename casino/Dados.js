// casino/Dados.js — Craps simplificado
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { Dices } from 'lucide-react-native';
import { styles } from './estilos';
import { DadoVisual, CabeceraJuego, BotonSalirMenu, SelectorApuesta, BannerResultado, coloresBannerOscuro } from './componentes';

const COLORES_DADOS = coloresBannerOscuro({ fondo: 'rgba(254,240,138,0.08)', borde: '#EAB308', texto: '#FEF08A' });

export function useDados({ monedas, actualizarMonedas, verificarAuxilioBancarrota }) {
  const [apuestaDados,       setApuestaDados]       = useState(20);
  const [dadosValores,       setDadosValores]       = useState([null, null]);
  const [dadosTirandose,     setDadosTirandose]     = useState(false);
  const [dadosPunto,         setDadosPunto]         = useState(null);
  const [dadosFase,          setDadosFase]          = useState('inicio'); // 'inicio' | 'punto'
  const [dadosMensaje,       setDadosMensaje]       = useState('');
  const [dadosResultadoTipo, setDadosResultadoTipo] = useState('');

  const terminarRonda = (mensaje, tipo) => {
    setDadosMensaje(mensaje);
    setDadosResultadoTipo(tipo);
    setDadosFase('inicio');
    setDadosPunto(null);
  };

  const tirar = () => {
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
      actualizarMonedas(saldoBase);
    }

    // Animación de dados sacudiendo
    let tick = 0;
    const animInterval = setInterval(() => {
      setDadosValores([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      tick++;
      if (tick < 10) return;

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
          actualizarMonedas(premio);
          terminarRonda(`🎲 ¡${suma}! Victoria natural. +${apuestaDados * 2} monedas`, 'ganado');
          verificarAuxilioBancarrota(premio);
        } else if (suma === 2 || suma === 3 || suma === 12) {
          // Craps, pierde al instante
          actualizarMonedas(verificarAuxilioBancarrota(saldoBase));
          terminarRonda(`💀 ¡Craps! ${suma} — la casa gana.`, 'perdido');
        } else {
          // Establece punto
          setDadosPunto(suma);
          setDadosFase('punto');
          setDadosMensaje(`🎯 Punto: ${suma}. ¡Sácalo antes que el 7!`);
        }
      } else if (suma === dadosPunto) {
        actualizarMonedas(saldoBase + apuestaDados * 2);
        terminarRonda(`🏆 ¡${suma}! Punto conseguido. +${apuestaDados * 2} monedas`, 'ganado');
      } else if (suma === 7) {
        actualizarMonedas(verificarAuxilioBancarrota(saldoBase));
        terminarRonda(`💀 ¡7! La casa gana. Punto perdido.`, 'perdido');
      } else {
        setDadosMensaje(`🎲 ${suma}. Punto sigue siendo ${dadosPunto}, sigue tirando.`);
        setDadosResultadoTipo('');
      }
    }, 80);
  };

  const resetear = () => {
    setDadosValores([null, null]);
    setDadosFase('inicio');
    setDadosPunto(null);
    setDadosMensaje('');
    setDadosResultadoTipo('');
  };

  return {
    apuestaDados, setApuestaDados, dadosValores, dadosTirandose, dadosPunto, dadosFase,
    dadosMensaje, dadosResultadoTipo, tirar, resetear,
  };
}

export function MesaDados({ da, monedas, onAyuda, onSalir }) {
  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      <CabeceraJuego Icono={Dices} color="#F87171" titulo="DADOS — CRAPS" onAyuda={onAyuda}>
        {da.dadosPunto !== null && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' }}>
            <Text style={{ color: '#F87171', fontWeight: '900', fontSize: 12 }}>PUNTO: {da.dadosPunto}</Text>
          </View>
        )}
      </CabeceraJuego>

      {/* Dados visuales */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
        {[0, 1].map(i => (
          <DadoVisual key={i} valor={da.dadosValores[i]} animando={da.dadosTirandose} />
        ))}
      </View>

      {/* Suma */}
      {da.dadosValores[0] !== null && (
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SUMA</Text>
          <Text style={{ color: '#FEF08A', fontSize: 36, fontWeight: '900', lineHeight: 42 }}>{da.dadosValores[0] + da.dadosValores[1]}</Text>
        </View>
      )}

      {da.dadosMensaje !== '' && (
        <BannerResultado mensaje={da.dadosMensaje} tipo={da.dadosResultadoTipo} colores={COLORES_DADOS} />
      )}

      {/* Info reglas rápidas */}
      {da.dadosFase === 'inicio' && da.dadosMensaje === '' && (
        <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 18 }}>
            7 u 11 → ganas al instante · 2, 3 o 12 → pierde{'\n'}
            Otro número → se convierte en tu punto{'\n'}
            Saca el punto antes que el 7 para ganar
          </Text>
        </View>
      )}

      {/* Selector apuesta (solo en fase inicio) */}
      {da.dadosFase === 'inicio' && (
        <SelectorApuesta
          valor={da.apuestaDados} setValor={da.setApuestaDados} monedas={monedas}
          style={{ justifyContent: 'center', marginVertical: 10 }}
        />
      )}

      <View style={{ gap: 6, paddingBottom: 4, marginTop: 6 }}>
        <TouchableOpacity disabled={da.dadosTirandose} style={styles.btnOtraPartidaVerde} onPress={da.tirar}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>
            {da.dadosTirandose ? 'RODANDO...' : da.dadosFase === 'punto' ? `TIRAR OTRA VEZ (PUNTO: ${da.dadosPunto})` : 'LANZAR DADOS'}
          </Text>
        </TouchableOpacity>
        <BotonSalirMenu onPress={() => { da.resetear(); onSalir(); }} />
      </View>
    </View>
  );
}
