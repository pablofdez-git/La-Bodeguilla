// casino/Bonus.js — bonus diario de monedas con racha de días seguidos
import React, { useState } from 'react';
import { Text, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estilosModal } from './estilos';
import { vibrar } from '../feedback';

const RACHA_MAXIMA = 7;
export const calcularBonus = (racha) => 25 + 10 * Math.min(racha, RACHA_MAXIMA); // 35 … 95

// Fecha local AAAA-MM-DD desplazada N días (0 = hoy, -1 = ayer)
const fechaLocal = (desplazamiento = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function useBonusDiario({ sumarMonedas, logro }) {
  const [bonus, setBonus] = useState(null); // { cantidad, racha } mientras se enseña el modal

  // Se llama al entrar al casino: cobra el bonus si hoy aún no se ha cobrado
  const comprobar = async () => {
    try {
      const hoy = fechaLocal(0);
      const ultimoDia = await AsyncStorage.getItem('@casino_bonus_dia');
      if (ultimoDia === hoy) return;
      const rachaAnterior = parseInt((await AsyncStorage.getItem('@casino_bonus_racha')) || '0', 10);
      const racha = ultimoDia === fechaLocal(-1) ? rachaAnterior + 1 : 1;
      const cantidad = calcularBonus(racha);
      await AsyncStorage.setItem('@casino_bonus_dia', hoy);
      await AsyncStorage.setItem('@casino_bonus_racha', String(racha));
      sumarMonedas(cantidad);
      vibrar('exito');
      setBonus({ cantidad, racha });
      if (racha >= RACHA_MAXIMA) logro('bonus_7');
    } catch (_) {
      // Sin AsyncStorage no hay bonus: no es grave
    }
  };

  return { bonus, cerrar: () => setBonus(null), comprobar };
}

export function ModalBonus({ bonus, onCerrar }) {
  if (!bonus) return null;
  const manana = calcularBonus(bonus.racha + 1);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCerrar}>
      <TouchableOpacity style={estilosModal.fondo} activeOpacity={1} onPress={onCerrar}>
        <TouchableOpacity activeOpacity={1} style={[estilosModal.caja, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 48, marginBottom: 6 }}>🎁</Text>
          <Text style={estilosModal.titulo}>BONUS DIARIO</Text>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>+{bonus.cantidad} 🪙</Text>
          <Text style={[estilosModal.textoRegla, { textAlign: 'center', marginTop: 10, flex: 0 }]}>
            {bonus.racha > 1 ? `🔥 Racha de ${bonus.racha} días seguidos` : 'Primer día de racha'}
            {'\n'}
            {bonus.racha < RACHA_MAXIMA ? `Vuelve mañana y cobras ${manana}.` : '¡Racha al máximo! Sigue viniendo cada día.'}
          </Text>
          <TouchableOpacity style={[estilosModal.btnCerrar, { alignSelf: 'stretch' }]} onPress={onCerrar}>
            <Text style={estilosModal.txtBtnCerrar}>¡A JUGAR!</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
