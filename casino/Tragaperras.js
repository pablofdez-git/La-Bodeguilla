// casino/Tragaperras.js — Cubatas Jackpot
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { styles } from './estilos';
import { BotonAyuda, BotonSalirMenu, SelectorApuesta, BannerResultado, COLORES_BANNER_CLARO } from './componentes';
import { SIMBOLOS_SLOTS } from './datos';

const simboloAleatorio = () => SIMBOLOS_SLOTS[Math.floor(Math.random() * SIMBOLOS_SLOTS.length)];
const tiradaAleatoria = () => [simboloAleatorio(), simboloAleatorio(), simboloAleatorio()];

// Sin premio se pinta en rojo, igual que perder
const COLORES_SLOTS = { ...COLORES_BANNER_CLARO, neutro: COLORES_BANNER_CLARO.perdido };
const SIN_MENSAJE   = { fondo: 'transparent', borde: 'transparent', texto: 'transparent' };

export function useTragaperras({ monedas, actualizarMonedas, verificarAuxilioBancarrota, logro }) {
  const [slots,              setSlots]              = useState(['🍺', '🍷', '🥩']);
  const [girandoSlots,       setGirandoSlots]       = useState(false);
  const [apuestaSlots,       setApuestaSlots]       = useState(20);
  const [mensajeSlots,       setMensajeSlots]       = useState('');
  const [resultadoTipoSlots, setResultadoTipoSlots] = useState('');

  const jugar = () => {
    if (monedas < apuestaSlots) {
      Alert.alert('Falta saldo', 'No tienes suficientes monedas para jugar.');
      return;
    }
    setGirandoSlots(true);
    setMensajeSlots('');
    setResultadoTipoSlots('');

    const saldoResta = monedas - apuestaSlots;
    actualizarMonedas(saldoResta);

    let iteracion = 0;
    const intervalo = setInterval(() => {
      setSlots(tiradaAleatoria());
      iteracion++;
      if (iteracion <= 15) return;

      clearInterval(intervalo);
      const finalSlots = tiradaAleatoria();
      setSlots(finalSlots);
      const bola = finalSlots[0];

      let balancePremios = 0;
      // Comprobar combinaciones con la nueva dificultad diluida
      if (finalSlots[0] === finalSlots[1] && finalSlots[1] === finalSlots[2]) {
        // 3 Iguales: Premio Gordo
        if (bola === '💎') { balancePremios += apuestaSlots * 60; logro('slots_diamantes'); }
        else if (bola === '💵') balancePremios += apuestaSlots * 40;
        else if (bola === '🥩' || bola === '🥪') balancePremios += apuestaSlots * 25;
        else balancePremios += apuestaSlots * 15;
      } else if (finalSlots[0] === finalSlots[1] || finalSlots[1] === finalSlots[2] || finalSlots[0] === finalSlots[2]) {
        // 2 Iguales: Reintegro / Premio Menor
        balancePremios += Math.floor(apuestaSlots * 2);
      }

      const saldoFinalCasino = saldoResta + balancePremios;
      actualizarMonedas(saldoFinalCasino);

      if (balancePremios > 0) {
        setResultadoTipoSlots('ganado');
        setMensajeSlots(`🎉 ¡PREMIO! +${balancePremios} monedas`);
      } else {
        setResultadoTipoSlots('perdido');
        setMensajeSlots('❌ Sin premio. ¡Dale otra vez!');
        verificarAuxilioBancarrota(saldoFinalCasino);
      }

      setGirandoSlots(false);
    }, 100);
  };

  return { slots, girandoSlots, apuestaSlots, setApuestaSlots, mensajeSlots, setMensajeSlots, resultadoTipoSlots, jugar };
}

export function MaquinaTragaperras({ tp, monedas, onAyuda, onSalir }) {
  const colores = tp.mensajeSlots ? COLORES_SLOTS : { neutro: SIN_MENSAJE };
  return (
    <View style={styles.contenedorMesaFondoVerdeReal}>

      {/* Chasis de Máquina Recreativa Vintage */}
      <View style={styles.chasisTragaperrasMueble}>
        <View style={styles.marquesinaLuminosa}>
          <Text style={styles.txtMarquesinaTitulo}>CUBATAS JACKPOT</Text>
          <BotonAyuda onPress={onAyuda} style={{ position: 'absolute', right: 10 }} />
        </View>

        {/* Ventana de Rodillos con Estilo Neon */}
        <View style={styles.pantallaRodillosNeon}>
          <View style={styles.contenedorRodillosRow}>
            {tp.slots.map((s, i) => (
              <View key={i} style={styles.cajaRodilloFisico}><Text style={styles.txtEmojiRodillo}>{s}</Text></View>
            ))}
          </View>
        </View>

        {/* Minipantalla de pagos integrada en el mueble */}
        <View style={styles.tablaPagosMueble}>
          <Text style={styles.txtTablaPagosTitulo}>PREMIOS TOP (3 IGUALES):</Text>
          <Text style={styles.txtTablaPagosLinea}>💎 x60 | 💵 x40 | 🥩 x25 | 🥪 x25</Text>
          <Text style={styles.txtTablaPagosMiniNota}>¡Ojo! Hay 9 símbolos. Sacar 2 iguales paga x2</Text>
        </View>
      </View>

      {/* Banner de Ganancia Fijo */}
      <BannerResultado
        mensaje={tp.mensajeSlots || ' '}
        tipo={tp.mensajeSlots ? tp.resultadoTipoSlots : 'neutro'}
        colores={colores}
        style={{ marginVertical: 10 }}
      />

      {/* Selector de Apuestas */}
      <SelectorApuesta
        valor={tp.apuestaSlots} setValor={tp.setApuestaSlots} monedas={monedas}
        style={{ justifyContent: 'center', marginVertical: 10 }} estiloEtiqueta={{ fontSize: 14 }}
      />

      {/* Botonera de la máquina */}
      <View style={{ gap: 6, paddingBottom: 4 }}>
        <TouchableOpacity disabled={tp.girandoSlots} style={styles.btnOtraPartidaVerde} onPress={tp.jugar}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{tp.girandoSlots ? 'GIRANDO...' : 'TIRAR PALANCA'}</Text>
        </TouchableOpacity>
        <BotonSalirMenu disabled={tp.girandoSlots} onPress={() => { onSalir(); tp.setMensajeSlots(''); }} />
      </View>
    </View>
  );
}
