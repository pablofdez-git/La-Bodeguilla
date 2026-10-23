// casino/estilos.js — estilos compartidos por todas las pantallas del casino
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // === CONTENEDOR PRINCIPAL ===
  tableroCasinoPremium: { backgroundColor: '#0F1923', borderRadius: 0, borderWidth: 2, borderColor: '#2A1A40', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, width: '100%', overflow: 'hidden' },

  // === HEADER ===
  cabeceraCasinoMesa: { flexDirection: 'row', backgroundColor: '#1A0A2E', width: '100%', paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(254,240,138,0.15)' },
  txtMesaPremiumTitulo: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  hudMonedasPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(254,240,138,0.12)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(254,240,138,0.3)' },

  // === LOBBY ===
  lobbyCasinoListaVertical: { width: '100%', padding: 14, backgroundColor: '#0F1923', gap: 10 },
  tarjetaJuegoRectangularGris: { width: '100%', backgroundColor: '#1C1130', borderRadius: 14, padding: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(91,50,129,0.4)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 3 },
  iconoTarjetaCirculo: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(254,240,138,0.1)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.25)', alignItems: 'center', justifyContent: 'center' },
  txtTituloTarjetaJuego: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  txtSubtituloTarjetaJuego: { color: '#6B7280', fontSize: 11, fontWeight: '500', marginTop: 2 },
  flechaTarjeta: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(254,240,138,0.08)', alignItems: 'center', justifyContent: 'center' },
  miniContenedorRachasFila: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  txtMiniRachaText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },

  // === PANTALLA PREVIA BLACKJACK ===
  lobbyCasinoCaja: { padding: 16, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: '#0F1923', gap: 14 },
  tarjetaBlancaLobbyBase: { width: '100%', borderWidth: 1, borderColor: 'rgba(91,50,129,0.5)', borderRadius: 14, padding: 18, backgroundColor: '#1C1130', alignItems: 'center' },

  btnIniciarJuegoPremium: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%', alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnJuegoText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  btnRegresarLobbyMenu: { width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },

  cajaEstadisticasRachas: { backgroundColor: 'rgba(0,0,0,0.25)', width: '100%', borderRadius: 10, padding: 12, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4 },
  filaRachaStat: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 2 },
  txtRachaStatLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginLeft: 8 },
  txtRachaStatValor: { fontSize: 15, fontWeight: '900', color: '#FEF08A' },

  // === MESA BLACKJACK ===
  contenedorMesaFondoVerdeReal: { width: '100%', padding: 14, backgroundColor: '#0F1923' },
  zonaJugadorFila: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  txtMarcadorEtiqueta: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' },
  filaCartasContenedor: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 85, alignItems: 'center', width: '100%', marginTop: 4 },
  lineaMesaSeparador: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'center', marginVertical: 4 },

  cartaEstilo: { backgroundColor: '#fff', width: 56, height: 84, borderRadius: 8, justifyContent: 'space-between', padding: 5, marginHorizontal: 4, marginVertical: 4, borderWidth: 1, borderColor: '#D1D5DB', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  textoCartaEsquina: { fontSize: 13, fontWeight: '900', lineHeight: 13 },
  paloCartaEsquina: { fontSize: 11, lineHeight: 11, marginTop: 1 },
  paloCartaCentral: { fontSize: 24, textAlign: 'center', alignSelf: 'center', marginVertical: -4 },
  bannerResultadoFino: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, marginVertical: 8, width: '100%', minHeight: 46 },
  txtBannerResultadoText: { fontSize: 13, fontWeight: '800', textAlign: 'center', flex: 1 },

  // === BOTONES BLACKJACK ===
  btnBlackjackFijoBlanco: { backgroundColor: '#374151', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#1F2937' },
  txtBtnAccionSecundarioText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  btnBlackjackFijoMorado: { backgroundColor: '#7C3AED', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnAccionPrincipalText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  btnOtraPartidaVerde: { backgroundColor: '#059669', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: '#047857' },
  txtBtnOtraPartidaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  btnSalirAlLobby: { flexDirection: 'row', backgroundColor: '#374151', paddingVertical: 12, width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: '#1F2937' },
  txtBtnSalirLobbyText: { color: '#D1D5DB', fontWeight: '700', fontSize: 13 },

  btnCasinoAccionSecundario: { backgroundColor: '#374151', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, flex: 1, alignItems: 'center', borderBottomWidth: 2, borderColor: '#1F2937' },

  // === RULETA ===
  hudContenedorRuletaAmpliado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, marginBottom: 8 },
  circuloResultadoRuletaGigante: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FEF08A' },
  txtResultadoRuletaNumeroGigante: { color: '#fff', fontSize: 32, fontWeight: '900' },
  tapeteGridFichasAmpliado: { width: '100%', backgroundColor: '#14532D', padding: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  casillaCeroVerticalAmpliada: { width: 40, height: 104, backgroundColor: '#166534', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginRight: 3 },
  txtCasillaTapeteTxtAmpliado: { color: '#fff', fontSize: 12, fontWeight: '900' },
  btnSuerteSencillaTapete: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#166534' },
  badgeFichaColocadaAmpliada: { position: 'absolute', right: 2, bottom: 2, backgroundColor: '#FEF08A', borderRadius: 7, minWidth: 16, alignItems: 'center', paddingHorizontal: 2 },
  contenedorFichasFisicasAmpliado: { paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, alignItems: 'center', marginVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  fichaFisicaCirculo: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4B5563', backgroundColor: '#1F2937' },
  fichaFisicaCirculoActiva: { borderColor: '#FEF08A', backgroundColor: '#7C3AED' },
  overlayResultadoTranslucido: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  contenedorCentralOverlay: { backgroundColor: 'rgba(15, 10, 30, 0.95)', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#FEF08A', width: '80%' },
  circuloResultadoRuletaGrande: { justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FEF08A', marginBottom: 16 },
  txtOverlayNumeroGigante: { color: '#fff', fontSize: 42, fontWeight: '900' },
  txtOverlayMensajePremio: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', lineHeight: 28 },
  txtOverlaySubtituloToque: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 },
  casillaTapeteNumero: { justifyContent: 'center', alignItems: 'center', borderRadius: 3 },

  // === TRAGAPERRAS ===
  chasisTragaperrasMueble: { width: '100%', backgroundColor: '#1C1130', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#2E1065', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  marquesinaLuminosa: { width: '100%', backgroundColor: '#4C1D95', paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: '#FEF08A', marginBottom: 14 },
  txtMarquesinaTitulo: { color: '#FEF08A', fontWeight: '900', fontSize: 15, letterSpacing: 3, textShadowColor: 'rgba(254, 240, 138, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  pantallaRodillosNeon: { width: '100%', backgroundColor: '#0D0D0D', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#EAB308', shadowColor: '#EAB308', shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  contenedorRodillosRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  cajaRodilloFisico: { width: 76, height: 88, backgroundColor: '#1F1F1F', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EAB308' },
  txtEmojiRodillo: { fontSize: 40 },
  tablaPagosMueble: { width: '100%', backgroundColor: '#0D0D0D', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: '#292524' },
  txtTablaPagosTitulo: { color: '#EAB308', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  txtTablaPagosLinea: { color: '#D1D5DB', fontSize: 10, fontWeight: '700', marginTop: 4 },
  txtTablaPagosMiniNota: { color: '#6B7280', fontSize: 9, fontWeight: '500', marginTop: 3, fontStyle: 'italic' },

  // === RASCA Y GANA ===
  casillaScratch: { width: 96, height: 96, backgroundColor: '#2E1065', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(167,139,250,0.4)', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  casillaScratchRevelada: { backgroundColor: '#1C1130', borderColor: 'rgba(52,211,153,0.4)' },

  // === BOTÓN AYUDA ? ===
  btnAyuda: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(254,240,138,0.12)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.35)', justifyContent: 'center', alignItems: 'center' },
  txtBtnAyuda: { color: '#FEF08A', fontWeight: '900', fontSize: 13, lineHeight: 16 },

  // === WAR ===
  cartaWarSlot: { width: 56, height: 84, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  // === BOTÓN TODO IN ===
  btnTodoIn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  txtBtnTodoIn: { color: '#F87171', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
});

export const estilosModal = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  caja: { backgroundColor: '#1C1130', borderRadius: 18, padding: 22, width: '100%', borderWidth: 1.5, borderColor: 'rgba(254,240,138,0.3)' },
  titulo: { color: '#FEF08A', fontWeight: '900', fontSize: 17, letterSpacing: 0.5, marginBottom: 14, textAlign: 'center' },
  separador: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  filaRegla: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  icono: { fontSize: 16, width: 22, textAlign: 'center', marginTop: 1 },
  textoRegla: { flex: 1, color: '#D1D5DB', fontSize: 13, fontWeight: '500', lineHeight: 19 },
  pagos: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },
  btnCerrar: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16, borderBottomWidth: 3, borderColor: '#5B21B6' },
  txtBtnCerrar: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
