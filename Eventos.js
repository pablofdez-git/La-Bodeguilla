import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Calendar, Clock } from 'lucide-react-native';
import { supabase } from './supabase';
import { avisarError } from './errores';

const C = {
  bg: '#131215', surface: '#1C1A20', surfaceAlt: '#252229',
  border: '#332F3C', accent: '#9B6DCC', accentDim: '#2A1F3D',
  success: '#2D9E5F', danger: '#C94A3F', dangerDim: '#3A1210',
  textPrim: '#EDE9F4', textSec: '#9890A8', textMuted: '#5A5466',
};

const TIPOS = [
  { id: 'comida', label: 'Comida', color: '#C94A3F' },
  { id: 'compra',   label: 'Compra',   color: '#2D9E5F' },
  { id: 'limpieza', label: 'Limpieza', color: '#C9921A' },
  { id: 'salida',   label: 'Salida',   color: '#3B82F6' },
  { id: 'otro',     label: 'Otro',     color: '#9B6DCC' },
];

export const tipoInfo = id => TIPOS.find(t => t.id === id) || TIPOS[4];

const formatFecha = iso => {
  if (!iso) return '';
  // Parsear como fecha local para evitar desfase de zona horaria
  const [y, m, d] = iso.split('-');
  const fecha = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const esPasado = iso => {
  if (!iso) return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)) < hoy;
};

export const diasRestantes = iso => {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = iso.split('-');
  const ev = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const diff = Math.round((ev - hoy) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff > 1)   return `En ${diff} días`;
  return null;
};

// ── Supabase ──────────────────────────────────────────────────────────────────
async function getEventos() {
  const { data, error } = await supabase
    .from('eventos').select('*').order('fecha', { ascending: true });
  if (error) throw error;
  return data || [];
}
// Próximo evento (hoy o después), o null si no hay ninguno
export async function obtenerProximoEvento() {
  const hoy = new Date();
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('eventos').select('*').gte('fecha', iso).order('fecha', { ascending: true }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}
async function insertEvento(nombre, fecha, hora, tipo, notas) {
  const { error } = await supabase.from('eventos')
    .insert({ nombre, fecha, hora: hora || null, tipo, notas: notas || null });
  if (error) throw error;
}
async function deleteEvento(id) {
  const { error } = await supabase.from('eventos').delete().eq('id', id);
  if (error) throw error;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function Eventos({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [eventos,     setEventos]     = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [fNombre,   setFNombre]   = useState('');
  const [fFecha,    setFFecha]    = useState('');
  const [fHora,     setFHora]     = useState('');
  const [fTipo,     setFTipo]     = useState('comida');
  const [fNotas,    setFNotas]    = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setEventos(await getEventos()); }
    catch (e) { avisarError('No se pudieron cargar los eventos', e); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { if (visible) cargar(); }, [visible]);

  const resetForm = () => {
    setFNombre(''); setFFecha(''); setFHora('');
    setFTipo('comida'); setFNotas('');
  };

  const handleGuardar = async () => {
    if (!fNombre.trim()) { Alert.alert('Falta', 'Escribe el nombre del evento.'); return; }
    if (!fFecha.trim())  { Alert.alert('Falta', 'Escribe la fecha (DD-MM-AAAA).'); return; }
    const partes = fFecha.trim().split('-');
    if (partes.length !== 3 || partes.some(p => !p)) {
      Alert.alert('Formato incorrecto', 'Usa el formato DD-MM-AAAA.\nEjemplo: 15-08-2026'); return;
    }
    const fechaISO = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    if (isNaN(new Date(fechaISO).getTime())) {
      Alert.alert('Fecha inválida', 'Comprueba que la fecha sea correcta.'); return;
    }
    setGuardando(true);
    try {
      await insertEvento(fNombre.trim(), fechaISO, fHora.trim() || null, fTipo, fNotas.trim() || null);
      resetForm(); setMostrarForm(false); await cargar();
    } catch (e) { avisarError('No se pudo guardar el evento', e); }
    finally { setGuardando(false); }
  };

  const handleEliminar = (ev) => {
    Alert.alert('Eliminar evento', `¿Eliminar "${ev.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteEvento(ev.id); }
        catch (e) { avisarError('No se pudo eliminar el evento', e); }
        await cargar();
      }},
    ]);
  };

  const proximos = eventos.filter(e => !esPasado(e.fecha));
  const pasados  = eventos.filter(e => esPasado(e.fecha));

  const renderEvento = (ev, atenuado = false) => {
    const t    = tipoInfo(ev.tipo);
    const dias = diasRestantes(ev.fecha);
    return (
      <View key={ev.id} style={[st.cardEvento, atenuado && { opacity: 0.45 }]}>
        {/* Barra de color lateral */}
        <View style={[st.barraColor, { backgroundColor: t.color }]} />

        {/* Contenido */}
        <View style={{ flex: 1, padding: 14 }}>
          {/* Fila superior: nombre + badge días restantes */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={st.eventoNombre} numberOfLines={1}>{ev.nombre}</Text>
            {dias && !atenuado && (
              <View style={[st.diasBadge, { backgroundColor: t.color + '22', borderColor: t.color + '66' }]}>
                <Text style={[st.diasTxt, { color: t.color }]}>{dias}</Text>
              </View>
            )}
          </View>

          {/* Fila inferior: tipo + fecha + hora */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <View style={[st.tipePill, { backgroundColor: t.color + '18', borderColor: t.color + '44' }]}>
              <Text style={[st.tipePillTxt, { color: t.color }]}>{t.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} color={C.textMuted} />
              <Text style={st.metaTxt}>{formatFecha(ev.fecha)}</Text>
            </View>
            {ev.hora && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Clock size={12} color={C.textMuted} />
                <Text style={st.metaTxt}>{ev.hora}</Text>
              </View>
            )}
          </View>

          {/* Notas */}
          {ev.notas ? (
            <Text style={st.notasTxt} numberOfLines={2}>{ev.notas}</Text>
          ) : null}
        </View>

        {/* Botón eliminar — discreto, solo icono pequeño en esquina */}
        <TouchableOpacity
          onPress={() => handleEliminar(ev)}
          style={st.btnEliminar}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[st.root, { paddingTop: insets.top || 16 }]}>

        {/* CABECERA */}
        <View style={st.header}>
          <Calendar size={18} color={C.accent} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.headerTitulo}>EVENTOS DE LA PEÑA</Text>
            <Text style={st.headerSub}>Próximas quedadas y tareas</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={st.btnCerrar}>
            <X size={20} color={C.textSec} />
          </TouchableOpacity>
        </View>

        {cargando ? (
          <View style={st.centrado}><ActivityIndicator color={C.accent} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>

            {proximos.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={st.seccionLabel}>PRÓXIMOS</Text>
                {proximos.map(ev => renderEvento(ev, false))}
              </View>
            )}

            {pasados.length > 0 && (
              <View>
                <Text style={st.seccionLabel}>PASADOS</Text>
                {pasados.map(ev => renderEvento(ev, true))}
              </View>
            )}

            {eventos.length === 0 && (
              <Text style={st.emptyTxt}>
                Aún no hay eventos.{'\n'}Pulsa el botón para añadir el primero.
              </Text>
            )}
          </ScrollView>
        )}

        {/* BOTÓN AÑADIR */}
        <TouchableOpacity
          style={[st.btnNuevo, { bottom: insets.bottom + 16 }]}
          onPress={() => { resetForm(); setMostrarForm(true); }}
        >
          <Plus size={20} color={C.bg} />
          <Text style={st.btnNuevoTxt}>NUEVO EVENTO</Text>
        </TouchableOpacity>

        {/* MODAL FORMULARIO */}
        <Modal visible={mostrarForm} transparent animationType="slide" onRequestClose={() => setMostrarForm(false)}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: 'flex-end' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios'}
          >
            <View style={{ backgroundColor: 'rgba(10,8,14,.7)', flex: 1, justifyContent: 'flex-end' }}>
              <View style={[st.formCard, { paddingBottom: insets.bottom + 16 }]}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Text style={st.formTitulo}>NUEVO EVENTO</Text>
                    <TouchableOpacity onPress={() => setMostrarForm(false)}>
                      <X size={20} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={st.fieldLabel}>Nombre</Text>
                  <TextInput
                    style={st.input} placeholder="Ej: Barbacoa de verano"
                    placeholderTextColor={C.textMuted} value={fNombre} onChangeText={setFNombre}
                  />

                  <Text style={st.fieldLabel}>Fecha (DD-MM-AAAA)</Text>
                  <TextInput
                    style={st.input} placeholder="Ej: 15-08-2026"
                    placeholderTextColor={C.textMuted} value={fFecha} onChangeText={setFFecha}
                    keyboardType="numbers-and-punctuation"
                  />

                  <Text style={st.fieldLabel}>Hora (opcional)</Text>
                  <TextInput
                    style={st.input} placeholder="Ej: 14:00"
                    placeholderTextColor={C.textMuted} value={fHora} onChangeText={setFHora}
                    keyboardType="numbers-and-punctuation"
                  />

                  <Text style={st.fieldLabel}>Tipo</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {TIPOS.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setFTipo(t.id)}
                        style={[st.chipTipo, fTipo === t.id && { backgroundColor: t.color + '28', borderColor: t.color }]}
                      >
                        <Text style={[st.chipTipoTxt, fTipo === t.id && { color: t.color }]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={st.fieldLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={[st.input, { height: 72, textAlignVertical: 'top' }]}
                    placeholder="Detalles del evento..."
                    placeholderTextColor={C.textMuted}
                    value={fNotas} onChangeText={setFNotas} multiline
                  />

                  <TouchableOpacity
                    style={[st.btnGuardar, guardando && { opacity: 0.6 }]}
                    onPress={handleGuardar} disabled={guardando}
                  >
                    {guardando
                      ? <ActivityIndicator color={C.bg} size="small" />
                      : <Text style={st.btnGuardarTxt}>GUARDAR EVENTO</Text>}
                  </TouchableOpacity>

                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  centrado:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTxt:     { color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },

  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitulo: { color: C.textPrim, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  headerSub:    { color: C.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  btnCerrar:    { padding: 8, borderRadius: 8, backgroundColor: C.surfaceAlt },

  seccionLabel: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 12 },

  cardEvento:   { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  barraColor:   { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  eventoNombre: { color: C.textPrim, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  diasBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, flexShrink: 0 },
  diasTxt:      { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  tipePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tipePillTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  metaTxt:      { color: C.textSec, fontSize: 12, fontWeight: '600' },
  notasTxt:     { color: C.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic', lineHeight: 17 },
  btnEliminar:  { padding: 14, alignSelf: 'flex-start' },

  btnNuevo:     { position: 'absolute', left: 20, right: 20, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnNuevoTxt:  { color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  formCard:     { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: C.border, maxHeight: '92%' },
  formTitulo:   { fontSize: 12, fontWeight: '900', color: C.accent, letterSpacing: 2 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 6, letterSpacing: 0.5 },
  input:        { backgroundColor: C.surfaceAlt, color: C.textPrim, padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 14, borderWidth: 1, borderColor: C.border },
  chipTipo:     { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  chipTipoTxt:  { color: C.textSec, fontSize: 13, fontWeight: '700' },
  btnGuardar:   { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnGuardarTxt:{ color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
