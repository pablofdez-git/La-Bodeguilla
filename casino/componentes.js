// casino/componentes.js — piezas visuales reutilizadas por varios juegos
import React from 'react';
import { C } from '../tema';
import { Text, View, TouchableOpacity, Image, Modal } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { AYUDA_TEXTOS, PUNTOS_DADO } from './datos';
import { styles, estilosModal } from './estilos';

const IMAGEN_REVERSO = require('../assets/Javicristo.png');

export function ModalAyuda({ juego, onCerrar }) {
  if (!juego) return null;
  const info = AYUDA_TEXTOS[juego];
  return (
    <Modal transparent animationType="fade" visible={!!juego} onRequestClose={onCerrar}>
      <TouchableOpacity style={estilosModal.fondo} activeOpacity={1} onPress={onCerrar}>
        <TouchableOpacity activeOpacity={1} style={estilosModal.caja}>
          <Text style={estilosModal.titulo}>{info.titulo}</Text>
          <View style={estilosModal.separador} />
          {info.reglas.map((r, i) => (
            <View key={i} style={estilosModal.filaRegla}>
              <Text style={estilosModal.icono}>{r.icono}</Text>
              <Text style={estilosModal.textoRegla}>{r.texto}</Text>
            </View>
          ))}
          <View style={estilosModal.separador} />
          <Text style={estilosModal.pagos}>{info.pagos}</Text>
          <TouchableOpacity style={estilosModal.btnCerrar} onPress={onCerrar}>
            <Text style={estilosModal.txtBtnCerrar}>ENTENDIDO</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Botón redondo "?" que abre las reglas del juego
export function BotonAyuda({ onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btnAyuda, style]}>
      <Text style={styles.txtBtnAyuda}>?</Text>
    </TouchableOpacity>
  );
}

// Componente de dado con puntos dibujados (evita emojis unicode que no contrastan en fondos oscuros)
export function DadoVisual({ valor, size = 80, animando = false }) {
  const puntos = valor ? PUNTOS_DADO[valor] : [];
  return (
    <View style={{
      width: size, height: size,
      backgroundColor: animando ? '#fff' : '#F8F5FF',
      borderRadius: 14,
      borderWidth: 2.5,
      borderColor: animando ? '#F87171' : 'rgba(248,113,113,0.5)',
      position: 'relative',
      shadowColor: '#F87171',
      shadowOpacity: animando ? 0.6 : 0.15,
      shadowRadius: 8,
      elevation: 4,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {valor === null ? (
        <Text style={{ color: '#C4B5FD', fontSize: 28, fontWeight: '900' }}>?</Text>
      ) : (
        puntos.map((p, i) => (
          <View key={i} style={{
            position: 'absolute',
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: C.surface,
            left: (p[0] / 100) * size - (size * 0.08),
            top: (p[1] / 100) * size - (size * 0.08),
          }} />
        ))
      )}
    </View>
  );
}

export function RenderizarCarta({ nombre, palo, oculta }) {
  if (oculta) {
    return (
      <View style={styles.cartaEstilo}>
        <Image source={IMAGEN_REVERSO} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  const color = palo === '♦' || palo === '♥' ? '#EF4444' : '#1C1C1E';
  const esquina = (
    <>
      <Text style={[styles.textoCartaEsquina, { color }]}>{nombre}</Text>
      <Text style={[styles.paloCartaEsquina, { color }]}>{palo}</Text>
    </>
  );
  return (
    <View style={styles.cartaEstilo}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>{esquina}</View>
      <Text style={[styles.paloCartaCentral, { color }]}>{palo}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', transform: [{ rotate: '180deg' }] }}>{esquina}</View>
    </View>
  );
}

// Tres cartas boca abajo (animación de reparto del War)
export function CartasBocaAbajo() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.cartaWarSlot, { overflow: 'hidden' }]}>
          <Image source={IMAGEN_REVERSO} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}

// Selector de apuesta: −  valor  +  TODO   (pasos de 10, máximo 500 o el saldo)
export function SelectorApuesta({ valor, setValor, monedas, etiqueta = 'Apuesta:', style, estiloEtiqueta }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }, estiloEtiqueta]}>{etiqueta}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity style={{ padding: 10 }} onPress={() => setValor(a => Math.max(10, a - 10))}><Minus size={14} color="#FEF08A" /></TouchableOpacity>
        <Text style={{ minWidth: 40, textAlign: 'center', fontWeight: '900', color: '#FEF08A', fontSize: 16 }}>{valor}</Text>
        <TouchableOpacity style={{ padding: 10 }} onPress={() => setValor(a => Math.min(500, monedas, a + 10))}><Plus size={14} color="#FEF08A" /></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setValor(Math.min(500, monedas))} style={styles.btnTodoIn}>
        <Text style={styles.txtBtnTodoIn}>TODO</Text>
      </TouchableOpacity>
    </View>
  );
}

// Cabecera de los juegos: icono + título + botón de ayuda (+ extras a la derecha)
export function CabeceraJuego({ Icono, color, titulo, onAyuda, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }}>
      <Icono size={18} color={color} />
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1, flex: 1 }}>{titulo}</Text>
      <BotonAyuda onPress={onAyuda} />
      {children}
    </View>
  );
}

// Botón gris de volver al menú
export function BotonSalirMenu({ onPress, texto = '← SALIR AL MENÚ', disabled, style }) {
  return (
    <TouchableOpacity disabled={disabled} style={[styles.btnSalirAlLobby, style]} onPress={onPress}>
      <Text style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 'bold' }}>{texto}</Text>
    </TouchableOpacity>
  );
}

// Banner de resultado con colores según 'ganado' | 'perdido' | otro (neutro)
export function BannerResultado({ mensaje, tipo, colores, style }) {
  const c = colores[tipo] || colores.neutro;
  return (
    <View style={[styles.bannerResultadoFino, { backgroundColor: c.fondo, borderColor: c.borde }, style]}>
      <Text style={[styles.txtBannerResultadoText, { color: c.texto }]}>{mensaje}</Text>
    </View>
  );
}

// Banners claros (Blackjack y tragaperras): ganado / perdido / empate
export const COLORES_BANNER_CLARO = {
  ganado:  { fondo: '#DEF7EC', borde: '#34C759', texto: '#1E4620' },
  perdido: { fondo: '#FDE8E8', borde: '#FF3B30', texto: '#6B1D1D' },
  neutro:  { fondo: '#FEF3C7', borde: '#EAB308', texto: '#713F12' },
};

// Paletas de banner usadas por los juegos de fondo oscuro
export const coloresBannerOscuro = (neutro) => ({
  ganado:  { fondo: 'rgba(5,150,105,0.15)', borde: '#059669', texto: '#34D399' },
  perdido: { fondo: 'rgba(239,68,68,0.12)', borde: '#EF4444', texto: '#F87171' },
  neutro,
});
