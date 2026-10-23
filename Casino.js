import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registrarOObtenerJugador, sincronizarJugador, obtenerRanking } from './supabaseService';
import { avisarError, esErrorDeRed } from './errores';
import { Dices, Gamepad, Layers, Flame, Trophy, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { styles } from './casino/estilos';
import { ModalAyuda } from './casino/componentes';
import { useBlackjack, MesaBlackjack } from './casino/Blackjack';
import { useRuleta, MesaRuleta } from './casino/Ruleta';
import { useTragaperras, MaquinaTragaperras } from './casino/Tragaperras';
import { useDados, MesaDados } from './casino/Dados';
import { useRasca, MesaRasca } from './casino/Rasca';
import { useWar, MesaWar } from './casino/War';

// Tarjeta del lobby para entrar a un juego
function TarjetaJuego({ titulo, subtitulo, Icono, colorIcono, estiloCirculo, onPress, children }) {
  return (
    <TouchableOpacity style={styles.tarjetaJuegoRectangularGris} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.iconoTarjetaCirculo, estiloCirculo]}>
          <Icono size={22} color={colorIcono} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txtTituloTarjetaJuego}>{titulo}</Text>
          <Text style={styles.txtSubtituloTarjetaJuego}>{subtitulo}</Text>
        </View>
        <View style={styles.flechaTarjeta}><Text style={{ color: '#FEF08A', fontWeight: '900' }}>›</Text></View>
      </View>
      {children}
    </TouchableOpacity>
  );
}

export default function Casino() {
  const [juegoSeleccionado, setJuegoSeleccionado] = useState(null);

  // Sistema de monedas general y rachas
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaMaxima, setRachaMaxima] = useState(0);
  const [monedas, setMonedas] = useState(500);

  // Modal de ayuda
  const [modalAyuda, setModalAyuda] = useState(null);

  // ── Perfil y Ranking ────────────────────────────────────────────────────────
  const [pantallaActiva, setPantallaActiva] = useState('cargando'); // 'cargando' | 'registro' | 'juego' | 'ranking'
  const [nombreJugador, setNombreJugador] = useState('');
  const [inputNombre, setInputNombre] = useState('');
  const [bancarrotas, setBancarrotas] = useState(0);
  const [ranking, setRanking] = useState([]);
  const [cargandoRanking, setCargandoRanking] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState('');

  // El aviso de fallo al sincronizar solo se muestra una vez por sesión
  const avisoSyncMostrado = useRef(false);

  // Al montar: comprueba si ya hay nombre guardado localmente
  useEffect(() => {
    const init = async () => {
      try {
        const nombre       = await AsyncStorage.getItem('@casino_nombre');
        const banca        = await AsyncStorage.getItem('@casino_bancarrotas');
        const monCachadas  = await AsyncStorage.getItem('@bj_monedas');
        const rachaAct     = await AsyncStorage.getItem('@bj_racha_actual');
        const rachaMax     = await AsyncStorage.getItem('@bj_racha_maxima');
        if (nombre) {
          setNombreJugador(nombre);
          if (banca)       setBancarrotas(parseInt(banca, 10));
          if (monCachadas) setMonedas(parseInt(monCachadas, 10));
          if (rachaAct)    setRachaActual(parseInt(rachaAct, 10));
          if (rachaMax)    setRachaMaxima(parseInt(rachaMax, 10));
          setPantallaActiva('juego');
        } else {
          setPantallaActiva('registro');
        }
      } catch (_) {
        setPantallaActiva('registro');
      }
    };
    init();
  }, []);

  // Sincroniza con Supabase cada vez que cambian monedas o bancarrotas
  useEffect(() => {
    if (!nombreJugador || pantallaActiva === 'cargando' || pantallaActiva === 'registro') return;
    sincronizarJugador({ nombre: nombreJugador, monedas, bancarrotas })
      .then(error => { if (error) throw error; })
      .catch(e => {
        if (avisoSyncMostrado.current) return;
        avisoSyncMostrado.current = true;
        if (esErrorDeRed(e)) {
          Alert.alert('Casino sin conexión', 'Tus monedas se guardan en el móvil y se subirán al ranking en cuanto vuelva la cobertura.');
        } else {
          avisarError('No se pudo sincronizar tu saldo con el ranking', e);
        }
      });
  }, [monedas, bancarrotas]);

  const confirmarNombre = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) { setErrorRegistro('Escribe tu nombre.'); return; }
    if (nombre.length < 2) { setErrorRegistro('Al menos 2 caracteres.'); return; }
    if (nombre.length > 20) { setErrorRegistro('Máximo 20 caracteres.'); return; }
    setRegistrando(true);
    setErrorRegistro('');
    const { ok, jugador, error } = await registrarOObtenerJugador(nombre);
    if (!ok) {
      setErrorRegistro(`Error de conexión. Inténtalo de nuevo.${error ? `\n(${error})` : ''}`);
      setRegistrando(false);
      return;
    }
    // Si el jugador ya existía en Supabase, cargamos sus monedas y bancarrotas
    const m = jugador.monedas ?? 500;
    const b = jugador.bancarrotas ?? 0;
    setNombreJugador(nombre);
    setMonedas(m);
    setBancarrotas(b);
    await AsyncStorage.setItem('@casino_nombre', nombre);
    await AsyncStorage.setItem('@casino_bancarrotas', b.toString());
    await AsyncStorage.setItem('@bj_monedas', m.toString());
    setRegistrando(false);
    setPantallaActiva('juego');
  };

  const cargarRanking = async () => {
    setCargandoRanking(true);
    try {
      const data = await obtenerRanking();
      setRanking(data || []);
    } catch (e) {
      avisarError('No se pudo cargar el ranking', e);
    } finally {
      setCargandoRanking(false);
    }
  };

  const guardarDatoCasinoLocal = async (clave, valor) => {
    try { await AsyncStorage.setItem(clave, valor.toString()); } catch (e) {}
  };

  // Cambia el saldo y lo guarda en el móvil
  const actualizarMonedas = (saldo) => {
    setMonedas(saldo);
    guardarDatoCasinoLocal('@bj_monedas', saldo);
  };

  const verificarAuxilioBancarrota = (saldoActual) => {
    if (saldoActual <= 0) {
      const saldoAuxilio = 50;
      const nuevasBancarrotas = bancarrotas + 1;
      actualizarMonedas(saldoAuxilio);
      setBancarrotas(nuevasBancarrotas);
      guardarDatoCasinoLocal('@casino_bancarrotas', nuevasBancarrotas);
      Alert.alert('💸 Bancarrota', `Has perdido todo. Se te asignan 50 monedas para reengancharte.\nBancarrotas totales: ${nuevasBancarrotas}`);
      return saldoAuxilio;
    }
    return saldoActual;
  };

  // Rachas del Blackjack
  const ganarRacha = () => {
    const nr = rachaActual + 1;
    setRachaActual(nr);
    guardarDatoCasinoLocal('@bj_racha_actual', nr);
    if (nr > rachaMaxima) { setRachaMaxima(nr); guardarDatoCasinoLocal('@bj_racha_maxima', nr); }
  };
  const perderRacha = () => {
    setRachaActual(0);
    guardarDatoCasinoLocal('@bj_racha_actual', 0);
  };

  // Lo que comparten todos los juegos
  const ctx = { monedas, actualizarMonedas, verificarAuxilioBancarrota, ganarRacha, perderRacha };
  const bj = useBlackjack(ctx);
  const ru = useRuleta(ctx);
  const tp = useTragaperras(ctx);
  const da = useDados(ctx);
  const ra = useRasca(ctx);
  const wa = useWar(ctx);

  const salirAlMenu = () => setJuegoSeleccionado(null);
  const props = (juego) => ({ monedas, onAyuda: () => setModalAyuda(juego), onSalir: salirAlMenu });

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1923' }}>

      {/* ── PANTALLA CARGANDO ──────────────────────────────────────────────── */}
      {pantallaActiva === 'cargando' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color="#FEF08A" size="large" />
          <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Cargando...</Text>
        </View>
      )}

      {/* ── PANTALLA REGISTRO (primer arranque) ───────────────────────────── */}
      {pantallaActiva === 'registro' && (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#0F1923' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 28, paddingTop: 60, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🎰</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 3, marginBottom: 6 }}>LA BODEGUILLA</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>CASINO DEL PUEBLO</Text>
          </View>

          <View style={{ backgroundColor: '#1C1130', borderRadius: 16, padding: 22, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', gap: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>¿CÓMO TE LLAMAS?</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
              Tu nombre se guarda en este dispositivo y en el ranking compartido. No podrás cambiarlo después.
            </Text>

            <TextInput
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: errorRegistro ? '#EF4444' : 'rgba(124,58,237,0.5)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' }}
              placeholder="Nombre..."
              placeholderTextColor="#4B5563"
              value={inputNombre}
              onChangeText={t => { setInputNombre(t); setErrorRegistro(''); }}
              maxLength={20}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmarNombre}
            />

            {errorRegistro ? (
              <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{errorRegistro}</Text>
            ) : null}

            <TouchableOpacity
              disabled={registrando}
              onPress={confirmarNombre}
              style={{ backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderColor: '#5B21B6', opacity: registrando ? 0.7 : 1 }}
            >
              {registrando
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>ENTRAR AL CASINO →</Text>}
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            Empiezas con 500 monedas · Gratis · Sin trampas (bueno...)
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── PANTALLA RANKING ───────────────────────────────────────────────── */}
      {pantallaActiva === 'ranking' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 48 }} style={{ backgroundColor: '#0F1923' }}>
          {/* Cabecera */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 }}>
            <TouchableOpacity onPress={() => setPantallaActiva('juego')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '300' }}>‹</Text>
            </TouchableOpacity>
            <Trophy size={20} color="#FEF08A" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, flex: 1 }}>RANKING</Text>
            <TouchableOpacity onPress={cargarRanking} style={{ padding: 8 }}>
              <RefreshCw size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Leyenda fórmula */}
          <View style={{ backgroundColor: 'rgba(254,240,138,0.06)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(254,240,138,0.15)', marginBottom: 20 }}>
            <Text style={{ color: '#FEF08A', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 }}>
              Puntos = monedas × (1 − bancarrotas × 0.08) · mínimo ×0.2
            </Text>
          </View>

          {cargandoRanking ? (
            <ActivityIndicator color="#FEF08A" size="large" style={{ marginTop: 40 }} />
          ) : (
            <View style={{ gap: 8 }}>
              {ranking.map((j, idx) => {
                const medalla = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                const esTu = j.nombre === nombreJugador;
                return (
                  <View key={j.nombre} style={{
                    backgroundColor: esTu ? 'rgba(124,58,237,0.18)' : '#1C1130',
                    borderRadius: 12, padding: 14, borderWidth: 1,
                    borderColor: esTu ? 'rgba(124,58,237,0.7)' : idx < 3 ? 'rgba(254,240,138,0.2)' : 'rgba(91,50,129,0.3)',
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    {/* Posición */}
                    <View style={{ width: 34, alignItems: 'center' }}>
                      {medalla
                        ? <Text style={{ fontSize: 22 }}>{medalla}</Text>
                        : <Text style={{ color: '#6B7280', fontWeight: '900', fontSize: 14 }}>#{idx + 1}</Text>}
                    </View>

                    {/* Nombre */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                        {j.nombre}{esTu ? ' 👈' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600' }}>🪙 {j.monedas}</Text>
                        {j.bancarrotas > 0 && (
                          <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '600' }}>💸 ×{j.bancarrotas}</Text>
                        )}
                      </View>
                    </View>

                    {/* Puntuación */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#FEF08A', fontWeight: '900', fontSize: 18 }}>{j.puntuacion}</Text>
                      <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '600' }}>pts</Text>
                    </View>
                  </View>
                );
              })}

              {ranking.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                  <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                    Aún no hay nadie en el ranking.{'\n'}¡Sé el primero en jugar!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── PANTALLA DE JUEGO ──────────────────────────────────────────────── */}
      {pantallaActiva === 'juego' && (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} style={{ backgroundColor: '#0F1923' }}>
          <View style={styles.tableroCasinoPremium}>

            <ModalAyuda juego={modalAyuda} onCerrar={() => setModalAyuda(null)} />

            {/* HUD Superior */}
            <View style={styles.cabeceraCasinoMesa}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Dices size={18} color="#FEF08A" />
                <Text style={styles.txtMesaPremiumTitulo}>LA BODEGUILLA</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => { cargarRanking(); setPantallaActiva('ranking'); }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(254,240,138,0.08)', borderWidth: 1, borderColor: 'rgba(254,240,138,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <Trophy size={14} color="#FEF08A" />
                </TouchableOpacity>
                <View style={styles.hudMonedasPill}>
                  <Text style={{ color: '#C4B5FD', fontWeight: '700', fontSize: 11, marginRight: 5 }}>{nombreJugador}</Text>
                  <Text style={{ color: '#FEF08A', fontSize: 13 }}>🪙</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, marginLeft: 4 }}>{monedas}</Text>
                </View>
              </View>
            </View>

            {/* LOBBY INICIAL CON FILAS RECTANGULARES VERTICALES COMPACTAS */}
            {juegoSeleccionado === null && (
              <View style={styles.lobbyCasinoListaVertical}>
                <TarjetaJuego
                  titulo="BLACK JACK" subtitulo="La mesa clásica · Apuesta libre"
                  Icono={Layers} colorIcono="#FEF08A"
                  onPress={() => setJuegoSeleccionado('blackjack')}
                >
                  <View style={styles.miniContenedorRachasFila}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Flame size={11} color="#EAB308" />
                      <Text style={styles.txtMiniRachaText}>Racha: {rachaActual}</Text>
                    </View>
                    <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Trophy size={11} color="#34C759" />
                      <Text style={styles.txtMiniRachaText}>Récord: {rachaMaxima}</Text>
                    </View>
                  </View>
                </TarjetaJuego>

                <TarjetaJuego
                  titulo="RULETA EUROPEA" subtitulo="Tapete táctil · Paga x36 al número"
                  Icono={RefreshCw} colorIcono="#4ADE80"
                  estiloCirculo={{ backgroundColor: 'rgba(21,128,61,0.25)', borderColor: 'rgba(21,128,61,0.5)' }}
                  onPress={() => setJuegoSeleccionado('ruleta')}
                />

                <TarjetaJuego
                  titulo="CUBATAS JACKPOT" subtitulo="Tragaperras · 9 símbolos · x60 al trifecta"
                  Icono={Gamepad} colorIcono="#FBBF24"
                  estiloCirculo={{ backgroundColor: 'rgba(180,83,9,0.25)', borderColor: 'rgba(180,83,9,0.5)' }}
                  onPress={() => setJuegoSeleccionado('tragaperras')}
                />

                <TarjetaJuego
                  titulo="DADOS — CRAPS" subtitulo="7 u 11 ganas · 2, 3, 12 pierdes · x2 apuesta"
                  Icono={Dices} colorIcono="#F87171"
                  estiloCirculo={{ backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }}
                  onPress={() => { da.resetear(); setJuegoSeleccionado('dados'); }}
                />

                <TarjetaJuego
                  titulo="RASCA Y GANA" subtitulo="6 casillas · Par x2 · Trifecta hasta x50"
                  Icono={AlertTriangle} colorIcono="#34D399"
                  estiloCirculo={{ backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' }}
                  onPress={() => { ra.nueva(); setJuegoSeleccionado('rasca'); }}
                />

                <TarjetaJuego
                  titulo="WAR — CARTA ALTA" subtitulo="Tú vs crupier · Empate → ¡a la guerra! · x2"
                  Icono={Layers} colorIcono="#FBBF24"
                  estiloCirculo={{ backgroundColor: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.4)' }}
                  onPress={() => { wa.resetear(); setJuegoSeleccionado('war'); }}
                />
              </View>
            )}

            {juegoSeleccionado === 'blackjack' && (
              <View style={{ width: '100%' }}>
                <MesaBlackjack bj={bj} rachaActual={rachaActual} rachaMaxima={rachaMaxima} {...props('blackjack')} />
              </View>
            )}
            {juegoSeleccionado === 'ruleta'      && <MesaRuleta ru={ru} {...props('ruleta')} />}
            {juegoSeleccionado === 'tragaperras' && <MaquinaTragaperras tp={tp} {...props('tragaperras')} />}
            {juegoSeleccionado === 'dados'       && <MesaDados da={da} {...props('dados')} />}
            {juegoSeleccionado === 'rasca'       && <MesaRasca ra={ra} {...props('rasca')} />}
            {juegoSeleccionado === 'war'         && <MesaWar wa={wa} {...props('war')} />}

          </View>{/* fin tableroCasinoPremium */}
        </ScrollView>
      )}{/* fin pantalla juego */}

    </View>
  );
}
