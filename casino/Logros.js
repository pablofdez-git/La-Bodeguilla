// casino/Logros.js — logros del casino (se guardan en el móvil)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Award } from 'lucide-react-native';
import { C } from '../tema';
import { vibrar, mostrarToast } from '../feedback';

const KEY_LOGROS = '@casino_logros';

export const LOGROS = [
  { id: 'bj_natural',      icono: '🃏', titulo: 'Blackjack natural',   desc: 'Consigue 21 con las dos primeras cartas.' },
  { id: 'racha_3',         icono: '🔥', titulo: 'En racha',            desc: 'Gana 3 manos seguidas de Blackjack.' },
  { id: 'racha_5',         icono: '☄️', titulo: 'Imparable',           desc: 'Gana 5 manos seguidas de Blackjack.' },
  { id: 'racha_10',        icono: '👑', titulo: 'Leyenda de la mesa',  desc: 'Gana 10 manos seguidas de Blackjack.' },
  { id: 'monedas_1000',    icono: '💰', titulo: 'Mil monedas',         desc: 'Llega a 1.000 monedas.' },
  { id: 'monedas_5000',    icono: '🏦', titulo: 'Banquero',            desc: 'Llega a 5.000 monedas.' },
  { id: 'bancarrota',      icono: '💸', titulo: 'Tocando fondo',       desc: 'Arruínate por primera vez.' },
  { id: 'ruleta_numero',   icono: '🎯', titulo: 'Pleno',               desc: 'Acierta un número exacto en la ruleta.' },
  { id: 'slots_diamantes', icono: '💎', titulo: 'Jackpot',             desc: 'Saca 💎💎💎 en la tragaperras.' },
  { id: 'dados_punto',     icono: '🎲', titulo: 'Punto conseguido',    desc: 'Saca tu punto antes que el 7 en los dados.' },
  { id: 'rasca_trifecta',  icono: '🎟️', titulo: 'Rasca premiado',      desc: 'Consigue una trifecta en el Rasca y Gana.' },
  { id: 'war_guerra',      icono: '⚔️', titulo: 'Veterano de guerra',  desc: 'Gana una guerra en el War.' },
  { id: 'bonus_7',         icono: '📅', titulo: 'Fiel a la peña',      desc: 'Cobra el bonus diario 7 días seguidos.' },
];

export function useLogros() {
  const [desbloqueados, setDesbloqueados] = useState({}); // id → fecha ISO
  const ref = useRef({});
  const cargadoRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY_LOGROS)
      .then(raw => {
        // Lo que se haya desbloqueado antes de terminar de leer también se conserva
        ref.current = { ...(raw ? JSON.parse(raw) : {}), ...ref.current };
        setDesbloqueados(ref.current);
      })
      .catch(() => {})
      .finally(() => { cargadoRef.current = true; });
  }, []);

  // Desbloquea un logro (solo la primera vez) y lo celebra
  const desbloquear = useCallback((id) => {
    if (ref.current[id]) return;
    const def = LOGROS.find(l => l.id === id);
    if (!def) return;
    ref.current = { ...ref.current, [id]: new Date().toISOString() };
    setDesbloqueados(ref.current);
    AsyncStorage.setItem(KEY_LOGROS, JSON.stringify(ref.current)).catch(() => {});
    vibrar('exito');
    mostrarToast(`🏆 Logro desbloqueado: ${def.icono} ${def.titulo}`, 'info');
  }, []);

  return { desbloqueados, desbloquear, total: LOGROS.length, conseguidos: Object.keys(desbloqueados).length };
}

export function PantallaLogros({ desbloqueados, onVolver }) {
  const conseguidos = LOGROS.filter(l => desbloqueados[l.id]).length;
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 48 }} style={{ backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity onPress={onVolver} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '300' }}>‹</Text>
        </TouchableOpacity>
        <Award size={20} color="#FEF08A" />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, flex: 1 }}>LOGROS</Text>
        <Text style={{ color: '#FEF08A', fontWeight: '900', fontSize: 14 }}>{conseguidos}/{LOGROS.length}</Text>
      </View>

      {/* Barra de progreso */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, marginBottom: 20, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${(conseguidos / LOGROS.length) * 100}%`, backgroundColor: '#FEF08A' }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {LOGROS.map(l => {
          const fecha = desbloqueados[l.id];
          return (
            <View key={l.id} style={{
              width: '48%', flexGrow: 1, backgroundColor: C.surface, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: fecha ? 'rgba(254,240,138,0.35)' : C.border, opacity: fecha ? 1 : 0.55,
            }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{fecha ? l.icono : '🔒'}</Text>
              <Text style={{ color: fecha ? '#FEF08A' : '#9CA3AF', fontWeight: '900', fontSize: 13 }}>{l.titulo}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 3, lineHeight: 15 }}>{l.desc}</Text>
              {fecha && (
                <Text style={{ color: '#6B7280', fontSize: 10, marginTop: 6, fontWeight: '600' }}>
                  {new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
