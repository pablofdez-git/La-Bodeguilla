import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, ArrowLeft, Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { supabase } from './supabase';

const C = {
  bg: '#131215', surface: '#1C1A20', surfaceAlt: '#252229',
  border: '#332F3C', accent: '#9B6DCC', accentDim: '#2A1F3D',
  success: '#2D9E5F', danger: '#C94A3F', dangerDim: '#3A1210',
  textPrim: '#EDE9F4', textSec: '#9890A8', textMuted: '#5A5466',
};

const TIPOS = [
  { id: 'barbacoa',  label: 'Barbacoa',  color: '#C94A3F' },
  { id: 'compra',    label: 'Compra',    color: '#2D9E5F' },
  { id: 'limpieza',  label: 'Limpieza',  color: '#C9921A' },
  { id: 'salida',    label: 'Salida',    color: '#3B82F6' },
  { id: 'otro',      label: 'Otro',      color: '#9B6DCC' },
];

const tipoInfo = id => TIPOS.find(t => t.id === id) || TIPOS[4];

const formatFecha = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const esPasado = iso => {
  if (!iso) return false;
  return new Date(iso) < new Date(new Date().toDateString());
};

// ── Supabase ──────────────────────────────────────────────────────────────────
async function getEventos() {
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true });
  return data || [];
}
async function insertEvento(nombre, fecha, hora, tipo, notas) {
  const { error } = await supabase.from('eventos').insert({ nombre, fecha, hora: hora || null, tipo, notas: notas || null });
  if (error) throw error;
}
async function deleteEvento(id) {
  await supabase.from('eventos').delete().eq('id', id);
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function Eventos({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [eventos,    setEventos]    = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form
  const [fNombre, setFNombre] = useState('');
  const [fFecha,  setFFecha]  = useState('');
  const [fHora,   setFHora]   = useState('');
  const [fTipo,   setFTipo]   = useState('barbacoa');
  const [fNotas,  setFNotas]  = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setEventos(await getEventos()); }
    catch { Alert.alert('Error', 'No se pudieron cargar los eventos.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { if (visible) cargar(); }, [visible]);

  const resetForm = () => { setFNombre(''); setFFecha(''); setFHora(''); setFTipo('barbacoa'); setFNotas(''); };

  const handleGuardar = async () => {
    if (!fNombre.trim()) { Alert.alert('Falta', 'Escribe el nombre del evento.'); return; }
    if (!fFecha.trim())  { Alert.alert('Falta', 'Escribe la fecha (DD/MM/AAAA).'); return; }
    // Parsear fecha DD/MM/AAAA → AAAA-MM-DD
    const partes = fFecha.trim().split('/');
    if (partes.length !== 3) { Alert.alert('Formato', 'Usa el formato DD/MM/AAAA.'); return; }
    const fechaISO = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    if (isNaN(new Date(fechaISO).getTime())) { Alert.alert('Fecha inválida', 'Comprueba el formato DD/MM/AAAA.'); return; }
    setGuardando(true);
    try {
      await insertEvento(fNombre.trim(), fechaISO, fHora.trim() || null, fTipo, fNotas.trim() || null);
      resetForm(); setMostrarForm(false); await cargar();
    } catch { Alert.alert('Error', 'No se pudo guardar el evento.'); }
    finally { setGuardando(false); }
  };

  const handleEliminar = (ev) => {
    Alert.alert('Eliminar', `¿Eliminar "${ev.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteEvento(ev.id); await cargar();
      }},
    ]);
  };

  const proximos = eventos.filter(e => !esPasado(e.fecha));
  const pasados  = eventos.filter(e => esPasado(e.fecha));

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
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}>

            {/* PRÓXIMOS */}
            {proximos.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={st.seccionLabel}>PRÓXIMOS</Text>
                {proximos.map(ev => {
                  const t = tipoInfo(ev.tipo);
                  return (
                    <View key={ev.id} style={st.cardEvento}>
                      <View style={[st.tipeBarra, { backgroundColor: t.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.eventoNombre}>{ev.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 12 }}>
                          <View style={[st.tipePill, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
                            <Text style={[st.tipePillTxt, { color: t.color }]}>{t.label}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} color={C.textMuted} />
                            <Text style={st.eventoMeta}>{formatFecha(ev.fecha)}</Text>
                          </View>
                          {ev.hora ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} color={C.textMuted} />
                              <Text style={st.eventoMeta}>{ev.hora}</Text>
                            </View>
                          ) : null}
                        </View>
                        {ev.notas ? <Text style={st.eventoNotas}>{ev.notas}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => handleEliminar(ev)} style={st.btnEliminar}>
                        <Trash2 size={14} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* PASADOS */}
            {pasados.length > 0 && (
              <View>
                <Text style={st.seccionLabel}>PASADOS</Text>
                {pasados.map(ev => {
                  const t = tipoInfo(ev.tipo);
                  return (
                    <View key={ev.id} style={[st.cardEvento, { opacity: 0.5 }]}>
                      <View style={[st.tipeBarra, { backgroundColor: t.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.eventoNombre}>{ev.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 12 }}>
                          <View style={[st.tipePill, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
                            <Text style={[st.tipePillTxt, { color: t.color }]}>{t.label}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} color={C.textMuted} />
                            <Text style={st.eventoMeta}>{formatFecha(ev.fecha)}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleEliminar(ev)} style={st.btnEliminar}>
                        <Trash2 size={14} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {eventos.length === 0 && (
              <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 }}>
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
          <View style={st.formOverlay}>
            <View style={[st.formCard, { paddingBottom: insets.bottom + 16 }]}>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <Text style={st.formTitulo}>NUEVO EVENTO</Text>
                <TouchableOpacity onPress={() => setMostrarForm(false)}>
                  <X size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={st.fieldLabel}>Nombre</Text>
              <TextInput style={st.input} placeholder="Ej: Barbacoa de verano" placeholderTextColor={C.textMuted} value={fNombre} onChangeText={setFNombre} />

              <Text style={st.fieldLabel}>Fecha (DD/MM/AAAA)</Text>
              <TextInput style={st.input} placeholder="Ej: 15/08/2026" placeholderTextColor={C.textMuted} value={fFecha} onChangeText={setFFecha} keyboardType="numeric" />

              <Text style={st.fieldLabel}>Hora (opcional)</Text>
              <TextInput style={st.input} placeholder="Ej: 14:00" placeholderTextColor={C.textMuted} value={fHora} onChangeText={setFHora} />

              <Text style={st.fieldLabel}>Tipo</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {TIPOS.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setFTipo(t.id)}
                    style={[st.chipTipo, fTipo === t.id && { backgroundColor: t.color + '33', borderColor: t.color }]}
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
                value={fNotas} onChangeText={setFNotas}
                multiline
              />

              <TouchableOpacity
                style={[st.btnGuardar, guardando && { opacity: 0.6 }]}
                onPress={handleGuardar} disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={st.btnGuardarTxt}>GUARDAR EVENTO</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  centrado:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitulo: { color: C.textPrim, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  headerSub:    { color: C.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  btnCerrar:    { padding: 8, borderRadius: 8, backgroundColor: C.surfaceAlt },
  seccionLabel: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 10 },

  cardEvento:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  tipeBarra:    { width: 4, alignSelf: 'stretch' },
  eventoNombre: { color: C.textPrim, fontSize: 15, fontWeight: '700', marginLeft: 12 },
  tipePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tipePillTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  eventoMeta:   { color: C.textSec, fontSize: 11, fontWeight: '600' },
  eventoNotas:  { color: C.textMuted, fontSize: 11, marginLeft: 12, marginTop: 4, fontStyle: 'italic' },
  btnEliminar:  { padding: 14, backgroundColor: C.dangerDim },

  btnNuevo:     { position: 'absolute', left: 20, right: 20, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnNuevoTxt:  { color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  formOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,8,14,.7)' },
  formCard:     { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: C.border, maxHeight: '90%' },
  formTitulo:   { fontSize: 12, fontWeight: '900', color: C.accent, letterSpacing: 2 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 6, letterSpacing: 0.5 },
  input:        { backgroundColor: C.surfaceAlt, color: C.textPrim, padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: C.border },
  chipTipo:     { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  chipTipoTxt:  { color: C.textSec, fontSize: 12, fontWeight: '700' },
  btnGuardar:   { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnGuardarTxt:{ color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
