import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Plus, Trash2, ChevronRight, Receipt, ArrowLeft, Pencil, WifiOff, RefreshCw } from 'lucide-react-native';
import { supabase } from './supabase';
import { avisarError, esErrorDeRed, textoError } from './errores';

// ─── Colores (idénticos a App.js) ───────────────────────────────────────────
const C = {
  bg:          '#131215',
  surface:     '#1C1A20',
  surfaceAlt:  '#252229',
  border:      '#332F3C',
  accent:      '#9B6DCC',
  accentDim:   '#2A1F3D',
  success:     '#2D9E5F',
  danger:      '#C94A3F',
  dangerDim:   '#3A1210',
  warning:     '#C9921A',
  warningDim:  '#3A2A08',
  textPrim:    '#EDE9F4',
  textSec:     '#9890A8',
  textMuted:   '#5A5466',
  white:       '#FFFFFF',
};

// ─── Claves AsyncStorage ─────────────────────────────────────────────────────
const KEY_INTEGRANTES = '@cuentas_integrantes';
const KEY_SESIONES    = '@cuentas_sesiones';
const KEY_GASTOS      = '@cuentas_gastos';       // gastos de sesiones cerradas
const KEY_COLA        = '@cuentas_cola';          // operaciones pendientes offline

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatEur  = n   => parseFloat(n || 0).toFixed(2) + ' €';
const formatFecha = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function calcularSaldos(gastos, integrantes) {
  const saldos = {};
  integrantes.forEach(i => { saldos[i.id] = 0; });
  gastos.forEach(g => {
    (g.integrantes_ids || []).forEach(id => {
      saldos[id] = parseFloat(((saldos[id] || 0) + parseFloat(g.coste_por_persona)).toFixed(2));
    });
  });
  return saldos;
}

// ─── Servicio Supabase ───────────────────────────────────────────────────────
async function apiCargarIntegrantes() {
  const { data, error } = await supabase.from('integrantes').select('*').eq('activo', true).order('nombre');
  if (error) throw error;
  return data;
}
async function apiCargarSesiones() {
  const { data, error } = await supabase.from('sesiones_compra').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}
async function apiCargarGastos(sesionId) {
  const { data, error } = await supabase.from('gastos').select('*').eq('sesion_id', sesionId).order('created_at');
  if (error) throw error;
  return data;
}
async function apiCrearSesion(nombre) {
  const { data, error } = await supabase.from('sesiones_compra').insert({ nombre }).select().single();
  if (error) throw error;
  return data;
}
async function apiInsertarGasto(sesionId, producto, costeTotal, integrantesIds) {
  const costePorPersona = parseFloat((costeTotal / integrantesIds.length).toFixed(2));
  const { data: gasto, error } = await supabase.from('gastos').insert({ sesion_id: sesionId, producto, coste_total: costeTotal, integrantes_ids: integrantesIds, coste_por_persona: costePorPersona }).select().single();
  if (error) throw error;
  const { data: sesion, error: errSesion } = await supabase.from('sesiones_compra').select('total,num_productos').eq('id', sesionId).single();
  if (errSesion) throw errSesion;
  const { error: errTotal } = await supabase.from('sesiones_compra').update({ total: parseFloat(((sesion?.total || 0) + costeTotal).toFixed(2)), num_productos: (sesion?.num_productos || 0) + 1 }).eq('id', sesionId);
  if (errTotal) throw errTotal;
  return gasto;
}
async function apiEliminarGasto(gastoId, sesionId, costeTotal) {
  const { error } = await supabase.from('gastos').delete().eq('id', gastoId);
  if (error) throw error;
  const { data: sesion, error: errSesion } = await supabase.from('sesiones_compra').select('total,num_productos').eq('id', sesionId).single();
  if (errSesion) throw errSesion;
  const { error: errTotal } = await supabase.from('sesiones_compra').update({ total: Math.max(0, parseFloat(((sesion?.total || 0) - costeTotal).toFixed(2))), num_productos: Math.max(0, (sesion?.num_productos || 0) - 1) }).eq('id', sesionId);
  if (errTotal) throw errTotal;
}
async function apiEditarGasto(gastoId, integrantesIds, costeTotal) {
  const costePorPersona = parseFloat((costeTotal / integrantesIds.length).toFixed(2));
  const { error } = await supabase.from('gastos').update({ integrantes_ids: integrantesIds, coste_por_persona: costePorPersona }).eq('id', gastoId);
  if (error) throw error;
}
async function apiCerrarSesion(sesionId) {
  const { error } = await supabase.from('sesiones_compra').update({ cerrada: true }).eq('id', sesionId);
  if (error) throw error;
}
async function apiEliminarSesion(sesionId) {
  const { error } = await supabase.from('sesiones_compra').delete().eq('id', sesionId);
  if (error) throw error;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function CuentasPena({ visible, onClose }) {
  const insets = useSafeAreaInsets();

  // Pantallas: 'lista' | 'sesion_activa' | 'detalle_historico'
  const [pantalla,          setPantalla]          = useState('lista');
  const [hayRed,            setHayRed]            = useState(true);
  const [pendientes,        setPendientes]        = useState(0);
  const [cargando,          setCargando]          = useState(false);

  // Datos
  const [integrantes,       setIntegrantes]       = useState([]);
  const [sesiones,          setSesiones]          = useState([]);
  const [sesionActiva,      setSesionActiva]      = useState(null);
  const [gastosActivos,     setGastosActivos]     = useState([]);
  const [sesionDetalle,     setSesionDetalle]     = useState(null);
  const [gastosDetalle,     setGastosDetalle]     = useState([]);

  // Form nuevo gasto
  const [formProducto,      setFormProducto]      = useState('');
  const [formCoste,         setFormCoste]         = useState('');
  const [formSeleccionados, setFormSeleccionados] = useState([]);
  const [guardandoGasto,    setGuardandoGasto]    = useState(false);

  // Edición gasto
  const [gastoEditando,     setGastoEditando]     = useState(null);
  const [editIntegrantes,   setEditIntegrantes]   = useState([]);

  // Modal nombre sesión
  const [modalNombre,       setModalNombre]       = useState(false);
  const [inputNombre,       setInputNombre]       = useState('');

  const colaRef = useRef([]);

  // ── Red ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setHayRed(online);
      if (online) procesarCola();
    });
    return () => unsub();
  }, []);

  // ── Cola offline ───────────────────────────────────────────────────────────
  const guardarCola = async (cola) => {
    colaRef.current = cola;
    setPendientes(cola.length);
    await AsyncStorage.setItem(KEY_COLA, JSON.stringify(cola));
  };

  const cargarCola = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_COLA);
      const cola = raw ? JSON.parse(raw) : [];
      colaRef.current = cola;
      setPendientes(cola.length);
      return cola;
    } catch { return []; }
  };

  const encolarOperacion = async (op) => {
    const cola = [...colaRef.current, op];
    await guardarCola(cola);
  };

  const procesarCola = async () => {
    // Siempre leer del AsyncStorage, nunca del ref (puede estar desactualizado)
    const cola = await cargarCola();
    if (cola.length === 0) {
      setPendientes(0);
      return;
    }
    const fallidas = [];
    const rechazadas = [];
    for (const op of cola) {
      try {
        if (op.tipo === 'insertar_gasto')
          await apiInsertarGasto(op.sesionId, op.producto, op.costeTotal, op.integrantesIds);
        else if (op.tipo === 'eliminar_gasto')
          await apiEliminarGasto(op.gastoId, op.sesionId, op.costeTotal);
        else if (op.tipo === 'editar_gasto')
          await apiEditarGasto(op.gastoId, op.integrantesIds, op.costeTotal);
        else if (op.tipo === 'crear_sesion')
          await apiCrearSesion(op.nombre);
        else if (op.tipo === 'cerrar_sesion')
          await apiCerrarSesion(op.sesionId);
        else if (op.tipo === 'eliminar_sesion')
          await apiEliminarSesion(op.sesionId);
      } catch (e) {
        if (esErrorDeRed(e)) fallidas.push(op);
        else rechazadas.push(`· ${op.tipo}: ${textoError(e)}`);
      }
    }
    if (rechazadas.length > 0) avisarError('Algunos cambios offline no se pudieron subir', rechazadas.join('\n'));
    // Siempre guardar el resultado (aunque todo haya fallado)
    await guardarCola(fallidas);
    // Siempre actualizar pendientes aunque falle el recargar
    setPendientes(fallidas.length);
    try {
      if (fallidas.length === 0) await recargar();
    } catch { /* si falla el recargar, los datos se quedan en cache */ }
  };

  // ── Cache local ────────────────────────────────────────────────────────────
  const guardarCacheLocal = async (ints, sess) => {
    await AsyncStorage.setItem(KEY_INTEGRANTES, JSON.stringify(ints));
    await AsyncStorage.setItem(KEY_SESIONES, JSON.stringify(sess));
  };

  const cargarCacheLocal = async () => {
    const [rawI, rawS] = await Promise.all([
      AsyncStorage.getItem(KEY_INTEGRANTES),
      AsyncStorage.getItem(KEY_SESIONES),
    ]);
    return {
      integrantes: rawI ? JSON.parse(rawI) : [],
      sesiones:    rawS ? JSON.parse(rawS) : [],
    };
  };

  const guardarGastosLocal = async (sesionId, gastos) => {
    const raw = await AsyncStorage.getItem(KEY_GASTOS);
    const todos = raw ? JSON.parse(raw) : {};
    todos[sesionId] = gastos;
    await AsyncStorage.setItem(KEY_GASTOS, JSON.stringify(todos));
  };

  const cargarGastosLocal = async (sesionId) => {
    const raw = await AsyncStorage.getItem(KEY_GASTOS);
    const todos = raw ? JSON.parse(raw) : {};
    return todos[sesionId] || [];
  };

  // ── Carga principal ────────────────────────────────────────────────────────
  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      if (hayRed) {
        const [ints, sess] = await Promise.all([apiCargarIntegrantes(), apiCargarSesiones()]);
        setIntegrantes(ints);
        setSesiones(sess);
        await guardarCacheLocal(ints, sess);
      } else {
        const cache = await cargarCacheLocal();
        setIntegrantes(cache.integrantes);
        setSesiones(cache.sesiones);
      }
    } catch (e) {
      if (!esErrorDeRed(e)) avisarError('No se pudieron cargar las cuentas', e);
      const cache = await cargarCacheLocal();
      setIntegrantes(cache.integrantes);
      setSesiones(cache.sesiones);
    } finally {
      setCargando(false);
    }
  }, [hayRed]);

  useEffect(() => {
    if (visible) {
      cargarCola().then(cola => {
        // Si hay red y hay pendientes al abrir, procesarlos
        if (hayRed && cola.length > 0) procesarCola();
      });
      recargar();
      setPantalla('lista');
    }
  }, [visible]);

  // Suscripción realtime sesión activa
  useEffect(() => {
    if (!sesionActiva || !hayRed) return;
    const canal = supabase
      .channel(`gastos_${sesionActiva.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos', filter: `sesion_id=eq.${sesionActiva.id}` },
        () => recargarGastosActivos())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [sesionActiva?.id, hayRed]);

  const recargarGastosActivos = async () => {
    if (!sesionActiva) return;
    let gastos;
    try {
      if (hayRed) {
        gastos = await apiCargarGastos(sesionActiva.id);
        await guardarGastosLocal(sesionActiva.id, gastos);
        const { data } = await supabase.from('sesiones_compra').select('total,num_productos').eq('id', sesionActiva.id).single();
        if (data) setSesionActiva(prev => ({ ...prev, ...data }));
      } else {
        gastos = await cargarGastosLocal(sesionActiva.id);
      }
    } catch (e) {
      if (!esErrorDeRed(e)) avisarError('No se pudieron cargar los gastos', e);
      gastos = await cargarGastosLocal(sesionActiva.id);
    }
    setGastosActivos(gastos);
  };

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleNuevaSesion = () => {
    const hoy = new Date();
    setInputNombre(`Compra ${hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`);
    setModalNombre(true);
  };

  const confirmarNuevaSesion = async () => {
    if (!inputNombre.trim()) return;
    setModalNombre(false);
    setCargando(true);
    try {
      let sesion;
      if (hayRed) {
        sesion = await apiCrearSesion(inputNombre.trim());
        await recargar();
      } else {
        sesion = { id: `local_${Date.now()}`, nombre: inputNombre.trim(), total: 0, num_productos: 0, cerrada: false, created_at: new Date().toISOString() };
        await encolarOperacion({ tipo: 'crear_sesion', nombre: inputNombre.trim(), localId: sesion.id });
        setSesiones(prev => [sesion, ...prev]);
      }
      setSesionActiva(sesion);
      setGastosActivos([]);
      setFormProducto(''); setFormCoste(''); setFormSeleccionados([]);
      setPantalla('sesion_activa');
    } catch (e) {
      avisarError('No se pudo crear la sesión', e);
    } finally {
      setCargando(false);
    }
  };

  const handleAnadirGasto = async () => {
    if (!formProducto.trim()) { Alert.alert('Falta el producto', 'Escribe un nombre.'); return; }
    const coste = parseFloat(formCoste.replace(',', '.'));
    if (isNaN(coste) || coste <= 0) { Alert.alert('Coste inválido', 'Introduce un número mayor que 0.'); return; }
    if (formSeleccionados.length === 0) { Alert.alert('Sin asignar', 'Selecciona al menos un integrante.'); return; }
    setGuardandoGasto(true);
    try {
      const costePorPersona = parseFloat((coste / formSeleccionados.length).toFixed(2));
      if (hayRed) {
        await apiInsertarGasto(sesionActiva.id, formProducto.trim(), coste, formSeleccionados);
        await recargarGastosActivos();
      } else {
        const nuevoGasto = { id: `local_${Date.now()}`, sesion_id: sesionActiva.id, producto: formProducto.trim(), coste_total: coste, integrantes_ids: formSeleccionados, coste_por_persona: costePorPersona, created_at: new Date().toISOString() };
        const nuevosGastos = [...gastosActivos, nuevoGasto];
        setGastosActivos(nuevosGastos);
        await guardarGastosLocal(sesionActiva.id, nuevosGastos);
        setSesionActiva(prev => ({ ...prev, total: parseFloat(((prev.total || 0) + coste).toFixed(2)), num_productos: (prev.num_productos || 0) + 1 }));
        await encolarOperacion({ tipo: 'insertar_gasto', sesionId: sesionActiva.id, producto: formProducto.trim(), costeTotal: coste, integrantesIds: formSeleccionados });
        Alert.alert('Guardado sin conexión', 'Se subirá cuando vuelva la cobertura.');
      }
      setFormProducto(''); setFormCoste(''); setFormSeleccionados([]);
    } catch (e) {
      avisarError('No se pudo guardar el gasto', e);
    } finally {
      setGuardandoGasto(false);
    }
  };

  const handleEliminarGasto = (gasto) => {
    Alert.alert('Eliminar', `¿Quitar "${gasto.producto}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        if (hayRed) {
          try {
            await apiEliminarGasto(gasto.id, sesionActiva.id, gasto.coste_total);
            await recargarGastosActivos();
          } catch (e) { avisarError('No se pudo eliminar el gasto', e); }
        } else {
          const nuevos = gastosActivos.filter(g => g.id !== gasto.id);
          setGastosActivos(nuevos);
          await guardarGastosLocal(sesionActiva.id, nuevos);
          setSesionActiva(prev => ({ ...prev, total: Math.max(0, parseFloat(((prev.total || 0) - gasto.coste_total).toFixed(2))), num_productos: Math.max(0, (prev.num_productos || 0) - 1) }));
          await encolarOperacion({ tipo: 'eliminar_gasto', gastoId: gasto.id, sesionId: sesionActiva.id, costeTotal: gasto.coste_total });
        }
      }},
    ]);
  };

  const abrirEdicionGasto = (gasto) => { setGastoEditando(gasto); setEditIntegrantes([...gasto.integrantes_ids]); };

  const handleGuardarEdicionGasto = async () => {
    if (editIntegrantes.length === 0) { Alert.alert('Sin asignar', 'Selecciona al menos un integrante.'); return; }
    const costePorPersona = parseFloat((gastoEditando.coste_total / editIntegrantes.length).toFixed(2));
    if (hayRed) {
      try {
        await apiEditarGasto(gastoEditando.id, editIntegrantes, gastoEditando.coste_total);
        await recargarGastosActivos();
      } catch (e) { avisarError('No se pudo editar el gasto', e); return; }
    } else {
      const nuevos = gastosActivos.map(g => g.id === gastoEditando.id ? { ...g, integrantes_ids: editIntegrantes, coste_por_persona: costePorPersona } : g);
      setGastosActivos(nuevos);
      await guardarGastosLocal(sesionActiva.id, nuevos);
      await encolarOperacion({ tipo: 'editar_gasto', gastoId: gastoEditando.id, integrantesIds: editIntegrantes, costeTotal: gastoEditando.coste_total });
    }
    setGastoEditando(null);
  };

  const handleCerrarSesion = () => {
    Alert.alert('Cerrar cuenta', '¿Cerrar esta sesión? Quedará guardada en el historial.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', onPress: async () => {
        if (hayRed) {
          try { await apiCerrarSesion(sesionActiva.id); }
          catch (e) { avisarError('No se pudo cerrar la sesión', e); return; }
        }
        else await encolarOperacion({ tipo: 'cerrar_sesion', sesionId: sesionActiva.id });
        setSesionActiva(null); setGastosActivos([]);
        await recargar(); setPantalla('lista');
      }},
    ]);
  };

  const handleSalirSesion = () => {
    Alert.alert('¿Salir sin cerrar?', 'La sesión seguirá abierta y podrás seguir añadiendo productos.', [
      { text: 'Quedarme', style: 'cancel' },
      { text: 'Salir', onPress: () => { setSesionActiva(null); setGastosActivos([]); recargar(); setPantalla('lista'); }},
    ]);
  };

  const handleEliminarSesion = (sesion) => {
    Alert.alert('Borrar compra', `¿Eliminar "${sesion.nombre}"? No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: async () => {
        if (hayRed) {
          try { await apiEliminarSesion(sesion.id); }
          catch (e) { avisarError('No se pudo borrar la compra', e); return; }
        }
        else await encolarOperacion({ tipo: 'eliminar_sesion', sesionId: sesion.id });
        await recargar();
      }},
    ]);
  };

  const handleVerDetalle = async (sesion) => {
    setSesionDetalle(sesion);
    let gastos;
    try {
      if (hayRed) {
        gastos = await apiCargarGastos(sesion.id);
        await guardarGastosLocal(sesion.id, gastos);
      } else {
        gastos = await cargarGastosLocal(sesion.id);
      }
    } catch (e) {
      if (!esErrorDeRed(e)) avisarError('No se pudo cargar el detalle', e);
      gastos = await cargarGastosLocal(sesion.id);
    }
    setGastosDetalle(gastos);
    setPantalla('detalle_historico');
  };

  const saldos        = calcularSaldos(gastosActivos, integrantes);
  const saldosDetalle = calcularSaldos(gastosDetalle, integrantes);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => pantalla === 'sesion_activa' ? handleSalirSesion() : onClose()}>
      <View style={[st.root, { paddingTop: insets.top || 16 }]}>

        {/* ── BANNER OFFLINE ─────────────────────────────────────────────── */}
        {!hayRed && (
          <View style={st.offlineBanner}>
            <WifiOff size={13} color={C.warning} />
            <Text style={st.offlineTxt}>Sin conexión — los cambios se sincronizarán al volver la cobertura</Text>
            {pendientes > 0 && <Text style={st.pendienteTxt}>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</Text>}
          </View>
        )}
        {hayRed && pendientes > 0 && (
          <View style={[st.offlineBanner, { backgroundColor: C.accentDim, borderColor: C.accent + '44' }]}>
            <RefreshCw size={13} color={C.accent} />
            <Text style={[st.offlineTxt, { color: C.accent }]}>
              {pendientes} cambio{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''} de subir
            </Text>
            <TouchableOpacity onPress={procesarCola} style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: C.accent + '33', borderRadius: 8 }}>
              <Text style={{ color: C.accent, fontSize: 10, fontWeight: '900' }}>SUBIR</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LISTA ──────────────────────────────────────────────────────── */}
        {pantalla === 'lista' && (
          <>
            <View style={st.header}>
              <View style={{ flex: 1 }}>
                <Text style={st.headerTitulo}>CUENTAS DE LA PEÑA</Text>
                <Text style={st.headerSub}>Historial de compras</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={st.btnCerrar}><X size={20} color={C.textSec} /></TouchableOpacity>
            </View>

            {cargando ? (
              <View style={st.centrado}><ActivityIndicator color={C.accent} size="large" /></View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}>

                {sesiones.filter(s => !s.cerrada).length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={st.seccionLabel}>ABIERTA</Text>
                    {sesiones.filter(s => !s.cerrada).map(s => (
                      <TouchableOpacity key={s.id} style={[st.cardSesion, { borderColor: C.accent }]} onPress={async () => {
                        setSesionActiva(s);
                        const g = hayRed ? await apiCargarGastos(s.id) : await cargarGastosLocal(s.id);
                        setGastosActivos(g);
                        setFormProducto(''); setFormCoste(''); setFormSeleccionados([]);
                        setPantalla('sesion_activa');
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.cardSesionNombre}>{s.nombre}</Text>
                          <Text style={st.cardSesionMeta}>{formatFecha(s.created_at)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={[st.cardSesionTotal, { color: C.accent }]}>{formatEur(s.total)}</Text>
                          <Text style={st.cardSesionMeta}>{s.num_productos} productos</Text>
                        </View>
                        <ChevronRight size={16} color={C.accent} style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {sesiones.filter(s => s.cerrada).length > 0 && (
                  <View>
                    <Text style={st.seccionLabel}>HISTORIAL</Text>
                    {sesiones.filter(s => s.cerrada).map(s => (
                      <View key={s.id} style={st.cardSesion}>
                        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleVerDetalle(s)}>
                          <View style={{ flex: 1 }}>
                            <Text style={st.cardSesionNombre}>{s.nombre}</Text>
                            <Text style={st.cardSesionMeta}>{formatFecha(s.created_at)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4, marginRight: 10 }}>
                            <Text style={st.cardSesionTotal}>{formatEur(s.total)}</Text>
                            <Text style={st.cardSesionMeta}>{s.num_productos} productos</Text>
                          </View>
                          <ChevronRight size={16} color={C.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEliminarSesion(s)} style={[st.btnIcono, { marginLeft: 10 }]}>
                          <Trash2 size={14} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {sesiones.length === 0 && (
                  <Text style={st.emptyTxt}>Aún no hay compras registradas.{'\n'}Pulsa el botón para empezar.</Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={[st.btnNuevaSesion, { bottom: insets.bottom + 16 }]} onPress={handleNuevaSesion}>
              <Plus size={20} color={C.bg} />
              <Text style={st.btnNuevaSesionTxt}>NUEVA COMPRA</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── SESIÓN ACTIVA ──────────────────────────────────────────────── */}
        {pantalla === 'sesion_activa' && sesionActiva && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
            <View style={st.header}>
              <TouchableOpacity onPress={handleSalirSesion} style={{ padding: 4, marginRight: 8 }}>
                <ArrowLeft size={20} color={C.textSec} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={st.headerTitulo}>{sesionActiva.nombre.toUpperCase()}</Text>
                <Text style={st.headerSub}>{sesionActiva.num_productos} productos · {formatEur(sesionActiva.total)}</Text>
              </View>
              <TouchableOpacity onPress={handleCerrarSesion} style={st.btnCerrarSesion}>
                <Text style={st.btnCerrarSesionTxt}>CERRAR</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">

              {/* Formulario */}
              <View style={st.card}>
                <Text style={st.seccionLabel}>AÑADIR PRODUCTO</Text>
                <TextInput style={st.input} placeholder="Nombre del producto..." placeholderTextColor={C.textMuted} value={formProducto} onChangeText={setFormProducto} />
                <TextInput style={st.input} placeholder="Coste total (ej: 12.50)" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" value={formCoste} onChangeText={setFormCoste} />
                <Text style={st.fieldLabel}>¿QUIÉN PAGA?</Text>
                <View style={st.grid}>
                  {integrantes.map(i => {
                    const sel = formSeleccionados.includes(i.id);
                    return (
                      <TouchableOpacity key={i.id} onPress={() => setFormSeleccionados(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id])} style={[st.chip, sel && st.chipActivo]}>
                        <Text style={[st.chipTxt, sel && st.chipTxtActivo]}>{i.nombre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {formSeleccionados.length > 0 && formCoste && !isNaN(parseFloat(formCoste.replace(',', '.'))) && (
                  <Text style={st.preview}>{formatEur(parseFloat(formCoste.replace(',', '.')) / formSeleccionados.length)} por persona · {formSeleccionados.length} personas</Text>
                )}
                <TouchableOpacity style={[st.btnPrimary, guardandoGasto && { opacity: 0.6 }]} onPress={handleAnadirGasto} disabled={guardandoGasto}>
                  {guardandoGasto ? <ActivityIndicator color={C.bg} size="small" /> : <><Plus size={16} color={C.bg} /><Text style={st.btnPrimaryTxt}>AÑADIR</Text></>}
                </TouchableOpacity>
              </View>

              {/* Gastos */}
              {gastosActivos.length > 0 && (
                <View style={st.card}>
                  <Text style={st.seccionLabel}>PRODUCTOS AÑADIDOS</Text>
                  {gastosActivos.map(g => {
                    const nombres = g.integrantes_ids.map(id => integrantes.find(i => i.id === id)?.nombre).filter(Boolean).join(', ');
                    return (
                      <View key={g.id} style={st.filaGasto}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.gastoNombre}>{g.producto}</Text>
                          <Text style={st.gastoMeta}>{nombres}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                          <Text style={st.gastoTotal}>{formatEur(g.coste_total)}</Text>
                          <Text style={st.gastoMeta}>{formatEur(g.coste_por_persona)} / persona</Text>
                        </View>
                        <TouchableOpacity onPress={() => abrirEdicionGasto(g)} style={[st.btnIcono, { backgroundColor: C.accentDim, marginRight: 6 }]}>
                          <Pencil size={13} color={C.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEliminarGasto(g)} style={[st.btnIcono, { backgroundColor: C.dangerDim }]}>
                          <Trash2 size={13} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Saldos */}
              {gastosActivos.length > 0 && (
                <View style={st.card}>
                  <Text style={st.seccionLabel}>LO QUE DEBE CADA UNO</Text>
                  {integrantes.filter(i => saldos[i.id] > 0).sort((a, b) => saldos[b.id] - saldos[a.id]).map(i => (
                    <View key={i.id} style={st.filaSaldo}>
                      <Text style={st.saldoNombre}>{i.nombre}</Text>
                      <Text style={st.saldoValor}>{formatEur(saldos[i.id])}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ── DETALLE HISTÓRICO ──────────────────────────────────────────── */}
        {pantalla === 'detalle_historico' && sesionDetalle && (
          <>
            <View style={st.header}>
              <TouchableOpacity onPress={() => setPantalla('lista')} style={{ padding: 4, marginRight: 8 }}>
                <ArrowLeft size={20} color={C.textSec} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={st.headerTitulo}>{sesionDetalle.nombre.toUpperCase()}</Text>
                <Text style={st.headerSub}>{formatFecha(sesionDetalle.created_at)} · {formatEur(sesionDetalle.total)}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={st.btnCerrar}><X size={20} color={C.textSec} /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
              <View style={st.card}>
                <Text style={st.seccionLabel}>RESUMEN POR PERSONA</Text>
                {integrantes.filter(i => saldosDetalle[i.id] > 0).sort((a, b) => saldosDetalle[b.id] - saldosDetalle[a.id]).map(i => (
                  <View key={i.id} style={st.filaSaldo}>
                    <Text style={st.saldoNombre}>{i.nombre}</Text>
                    <Text style={st.saldoValor}>{formatEur(saldosDetalle[i.id])}</Text>
                  </View>
                ))}
                <View style={[st.filaSaldo, { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }]}>
                  <Text style={[st.saldoNombre, { color: C.textPrim, fontWeight: '800' }]}>TOTAL</Text>
                  <Text style={[st.saldoValor, { color: C.accent }]}>{formatEur(sesionDetalle.total)}</Text>
                </View>
              </View>

              <View style={st.card}>
                <Text style={st.seccionLabel}>DETALLE DE PRODUCTOS</Text>
                {gastosDetalle.map(g => {
                  const nombres = g.integrantes_ids.map(id => integrantes.find(i => i.id === id)?.nombre).filter(Boolean).join(', ');
                  return (
                    <View key={g.id} style={st.filaGasto}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.gastoNombre}>{g.producto}</Text>
                        <Text style={st.gastoMeta}>{nombres}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={st.gastoTotal}>{formatEur(g.coste_total)}</Text>
                        <Text style={st.gastoMeta}>{formatEur(g.coste_por_persona)} / persona</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {/* ── MODAL EDICIÓN GASTO ────────────────────────────────────────── */}
        <Modal visible={!!gastoEditando} transparent animationType="fade" onRequestClose={() => setGastoEditando(null)}>
          <View style={st.overlay}>
            <View style={st.modalCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={st.seccionLabel}>EDITAR · {gastoEditando?.producto}</Text>
                <TouchableOpacity onPress={() => setGastoEditando(null)}><X size={18} color={C.textMuted} /></TouchableOpacity>
              </View>
              <Text style={[st.fieldLabel, { marginBottom: 6 }]}>Coste total: {formatEur(gastoEditando?.coste_total)}</Text>
              <Text style={st.fieldLabel}>¿QUIÉN PAGA?</Text>
              <View style={st.grid}>
                {integrantes.map(i => {
                  const sel = editIntegrantes.includes(i.id);
                  return (
                    <TouchableOpacity key={i.id} onPress={() => setEditIntegrantes(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id])} style={[st.chip, sel && st.chipActivo]}>
                      <Text style={[st.chipTxt, sel && st.chipTxtActivo]}>{i.nombre}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {editIntegrantes.length > 0 && gastoEditando && (
                <Text style={[st.preview, { marginBottom: 14 }]}>{formatEur(gastoEditando.coste_total / editIntegrantes.length)} por persona · {editIntegrantes.length} personas</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[st.btnPrimary, { flex: 1, backgroundColor: C.surfaceAlt }]} onPress={() => setGastoEditando(null)}>
                  <Text style={[st.btnPrimaryTxt, { color: C.textSec }]}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.btnPrimary, { flex: 1 }]} onPress={handleGuardarEdicionGasto}>
                  <Text style={st.btnPrimaryTxt}>GUARDAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL NOMBRE SESIÓN ────────────────────────────────────────── */}
        <Modal visible={modalNombre} transparent animationType="fade" onRequestClose={() => setModalNombre(false)}>
          <View style={st.overlay}>
            <View style={st.modalCard}>
              <Text style={st.seccionLabel}>NOMBRE DE LA COMPRA</Text>
              <TextInput style={[st.input, { marginTop: 10 }]} value={inputNombre} onChangeText={setInputNombre} placeholder="Ej: Compra 14 jun" placeholderTextColor={C.textMuted} autoFocus returnKeyType="done" onSubmitEditing={confirmarNuevaSesion} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={[st.btnPrimary, { flex: 1, backgroundColor: C.surfaceAlt }]} onPress={() => setModalNombre(false)}>
                  <Text style={[st.btnPrimaryTxt, { color: C.textSec }]}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.btnPrimary, { flex: 1 }]} onPress={confirmarNuevaSesion}>
                  <Text style={st.btnPrimaryTxt}>CREAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  centrado:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.warningDim, paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.warning + '44',
  },
  offlineTxt:    { flex: 1, color: C.warning, fontSize: 11, fontWeight: '700' },
  pendienteTxt:  { color: C.warning, fontSize: 11, fontWeight: '900', backgroundColor: C.warning + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitulo: { color: C.textPrim, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  headerSub:    { color: C.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  btnCerrar:    { padding: 8, borderRadius: 8, backgroundColor: C.surfaceAlt },

  seccionLabel: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 12 },
  emptyTxt:     { color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },

  cardSesion: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center',
  },
  cardSesionNombre: { color: C.textPrim, fontSize: 15, fontWeight: '700' },
  cardSesionMeta:   { color: C.textMuted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  cardSesionTotal:  { color: C.textPrim, fontSize: 16, fontWeight: '900' },

  btnNuevaSesion: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  btnNuevaSesionTxt: { color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  btnCerrarSesion:    { backgroundColor: C.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnCerrarSesionTxt: { color: C.white, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  card:       { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  input:      { backgroundColor: C.surfaceAlt, color: C.textPrim, padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: C.border },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: C.textSec, letterSpacing: 1.5, marginBottom: 10 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:         { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  chipActivo:   { backgroundColor: C.accentDim, borderColor: C.accent },
  chipTxt:      { color: C.textSec, fontSize: 13, fontWeight: '700' },
  chipTxtActivo:{ color: C.accent },
  preview:      { color: C.accent, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 12 },

  btnPrimary:    { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimaryTxt: { color: C.bg, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  filaGasto:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  gastoNombre:{ color: C.textPrim, fontSize: 14, fontWeight: '700' },
  gastoMeta:  { color: C.textMuted, fontSize: 11, marginTop: 2 },
  gastoTotal: { color: C.textPrim, fontSize: 14, fontWeight: '900' },
  btnIcono:   { padding: 8, borderRadius: 8, backgroundColor: C.dangerDim },

  filaSaldo:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  saldoNombre:{ color: C.textSec, fontSize: 14, fontWeight: '700' },
  saldoValor: { color: C.success, fontSize: 16, fontWeight: '900' },

  overlay:   { flex: 1, backgroundColor: 'rgba(10,8,14,0.88)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: C.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.border },
});
