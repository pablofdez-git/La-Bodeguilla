// Toast.js — aviso flotante que aparece encima de la barra inferior y se va solo
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { CircleCheck, WifiOff, Info } from 'lucide-react-native';
import { C } from './tema';
import { registrarToast } from './feedback';

const ESTILO_TIPO = {
  exito: { color: C.success, Icono: CircleCheck },
  aviso: { color: C.warning, Icono: WifiOff },
  info:  { color: C.accent,  Icono: Info },
};

export default function Toast({ bottom = 80 }) {
  const [toast, setToast] = useState(null); // { texto, tipo }
  const opacidad = useRef(new Animated.Value(0)).current;
  const temporizador = useRef(null);

  useEffect(() => {
    registrarToast((texto, tipo) => {
      clearTimeout(temporizador.current);
      setToast({ texto, tipo });
      Animated.timing(opacidad, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      temporizador.current = setTimeout(() => {
        Animated.timing(opacidad, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(() => setToast(null));
      }, 2600);
    });
    return () => { registrarToast(null); clearTimeout(temporizador.current); };
  }, []);

  if (!toast) return null;
  const { color, Icono } = ESTILO_TIPO[toast.tipo] || ESTILO_TIPO.info;
  const desplazamiento = opacidad.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[st.caja, { bottom, borderColor: color, opacity: opacidad, transform: [{ translateY: desplazamiento }] }]}
    >
      <Icono size={16} color={color} />
      <Text style={st.texto}>{toast.texto}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  caja: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  texto: { flex: 1, color: C.textPrim, fontSize: 13, fontWeight: '700' },
});
