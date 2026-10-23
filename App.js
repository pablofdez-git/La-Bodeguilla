import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView, StatusBar, Alert, Modal, RefreshControl
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Eye, ClipboardList, ShoppingCart, Settings,
  Plus, Minus, CheckSquare, Trash2, SlidersHorizontal,
  Save, Gamepad, AlertTriangle, WifiOff, RefreshCw,
  Pencil, X, Receipt, Calendar, CalendarDays, Search, ListPlus
} from 'lucide-react-native';
import Casino from './Casino';
import CuentasPena from './CuentasPena';
import Eventos, { obtenerProximoEvento, diasRestantes, tipoInfo } from './Eventos';
import Toast from './Toast';
import { C, normalizar } from './tema';
import { mostrarToast, vibrar } from './feedback';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useOfflineSync } from './useOfflineSync';

const CATEGORIAS      = ['Todos', 'Bebidas', 'Mezcla', 'Limpieza', 'Otros'];
const CATEGORIAS_FORM = ['Bebidas', 'Mezcla', 'Limpieza', 'Otros'];


function ContenidoApp() {
  const insets = useSafeAreaInsets();

  const [pestanaActual, setPestanaActual] = useState('visual');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');

  const [stockTemporal,  setStockTemporal]  = useState({});
  const [inputRecuento,  setInputRecuento]  = useState({});

  const [nombreCompra,   setNombreCompra]   = useState('');
  const [cantidadCompra, setCantidadCompra] = useState(1);
  const [lugarCompra,    setLugarCompra]    = useState('');
  const [mostrandoAnadirTienda, setMostrandoAnadirTienda] = useState(false);
  const [nuevaTiendaNombre,     setNuevaTiendaNombre]     = useState('');

  const [nuevoProdNombre,    setNuevoProdNombre]    = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState('Bebidas');
  const [nuevoProdMinimo,    setNuevoProdMinimo]    = useState('2');
  const [nuevoProdTieneMin,  setNuevoProdTieneMin]  = useState(true);

  const [modalProd,      setModalProd]      = useState(null);
  const [modalNombre,    setModalNombre]    = useState('');
  const [modalCategoria, setModalCategoria] = useState('Bebidas');
  const [modalMinimo,    setModalMinimo]    = useState('');
  const [modalTieneMin,  setModalTieneMin]  = useState(true);

  const [cuentasVisible, setCuentasVisible] = useState(false);
  const [eventosVisible, setEventosVisible] = useState(false);

  const [busqueda,       setBusqueda]       = useState('');
  const [refrescando,    setRefrescando]    = useState(false);
  const [proximoEvento,  setProximoEvento]  = useState(null);

  const {
    productos, extras, tiendas,
    cargando, hayRed, pendientes,
    recargar,
    guardarRecuento: syncGuardarRecuento,
    anadirExtra,
    marcarComprado,
    insertarProducto,
    eliminarProducto,
    editarProducto,
    insertarTienda,
    eliminarTienda,
  } = useOfflineSync();

  const recuentoInicializado = React.useRef(false);

  // Próximo evento del calendario (al abrir la app y al cerrar el calendario)
  useEffect(() => {
    if (eventosVisible || !hayRed) return;
    obtenerProximoEvento().then(setProximoEvento).catch(() => {});
  }, [eventosVisible, hayRed]);

  const onRefrescar = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };

  useEffect(() => {
    if (tiendas.length > 0 && !lugarCompra) setLugarCompra(tiendas[0].nombre);
  }, [tiendas]);

  // Cuando se entra al recuento: inicializar UNA SOLA VEZ con los valores actuales
  // Cuando se sale: marcar como no inicializado para la próxima vez
  useEffect(() => {
    if (pestanaActual !== 'recuento') {
      recuentoInicializado.current = false;
      return;
    }
    if (recuentoInicializado.current) return;
    if (productos.length === 0) return;
    const temp = {}; const inp = {};
    productos.forEach(p => { temp[p.id] = p.stock_actual; inp[p.id] = String(p.stock_actual); });
    setStockTemporal(temp);
    setInputRecuento(inp);
    recuentoInicializado.current = true;
  }, [pestanaActual, productos]);

  // Fuera del recuento, sincronizar stockTemporal con productos frescos
  useEffect(() => {
    if (pestanaActual === 'recuento') return;
    if (productos.length === 0) return;
    const temp = {}; const inp = {};
    productos.forEach(p => { temp[p.id] = p.stock_actual; inp[p.id] = String(p.stock_actual); });
    setStockTemporal(temp);
    setInputRecuento(inp);
  }, [productos]);

  // ── Recuento ──────────────────────────────────────────────────────────────
  const modificarStockTemporal = (id, cambio) => {
    setStockTemporal(prev => {
      const nuevo = Math.max(0, (prev[id] || 0) + cambio);
      setInputRecuento(pi => ({ ...pi, [id]: String(nuevo) }));
      return { ...prev, [id]: nuevo };
    });
  };

  const handleInputRecuento = (id, texto) => {
    setInputRecuento(prev => ({ ...prev, [id]: texto }));
    const num = parseInt(texto, 10);
    if (!isNaN(num) && num >= 0) setStockTemporal(prev => ({ ...prev, [id]: num }));
  };

  const cambiosRecuento = productos.filter(
    p => stockTemporal[p.id] !== undefined && stockTemporal[p.id] !== p.stock_actual
  ).length;

  const handleGuardarRecuento = async (destino = 'visual') => {
    // Copiar el stock antes de cambiar de pestaña para que el useEffect no lo resetee
    const stockAGuardar = { ...stockTemporal };
    setPestanaActual(destino);
    const res = await syncGuardarRecuento(stockAGuardar);
    if (res === 'encolado') mostrarToast('Recuento guardado sin conexión. Se subirá al volver la cobertura.', 'aviso');
    else if (res === 'ok') mostrarToast('Recuento guardado.');
  };

  // Al salir del recuento con cambios sin guardar, preguntar
  const cambiarPestana = (id) => {
    if (pestanaActual === 'recuento' && id !== 'recuento' && cambiosRecuento > 0) {
      Alert.alert(
        'Recuento sin guardar',
        `Tienes ${cambiosRecuento} cambio${cambiosRecuento > 1 ? 's' : ''} sin guardar.`,
        [
          { text: 'Seguir contando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => setPestanaActual(id) },
          { text: 'Guardar', onPress: () => handleGuardarRecuento(id) },
        ]
      );
      return;
    }
    setPestanaActual(id);
  };

  // ── Compra ────────────────────────────────────────────────────────────────
  const handleAnadirALaCompra = async () => {
    if (!nombreCompra.trim()) { Alert.alert('Falta el nombre', 'Pon qué hay que comprar.'); return; }
    const item = `${nombreCompra.trim()} (x${cantidadCompra})`;
    const res = await anadirExtra(item, lugarCompra);
    if (res === 'error') return;
    vibrar();
    if (res === 'encolado') mostrarToast('Apuntado sin conexión. Se subirá al volver la cobertura.', 'aviso');
    else mostrarToast(`Apuntado: ${item}`);
    setNombreCompra(''); setCantidadCompra(1);
  };

  // Sugerencias de productos existentes mientras se escribe en Compra
  const sugerenciasCompra = nombreCompra.trim().length >= 2
    ? productos.filter(p => {
        const n = normalizar(p.nombre), q = normalizar(nombreCompra);
        return n.includes(q) && n !== q;
      }).slice(0, 5)
    : [];

  const elegirSugerencia = (p) => {
    setNombreCompra(p.nombre);
    // Si está bajo mínimo, propone la cantidad que falta
    if (p.stock_minimo !== null && p.stock_actual < p.stock_minimo) setCantidadCompra(p.stock_minimo - p.stock_actual);
  };

  // Apunta en la lista todo lo que está bajo mínimo y aún no está apuntado
  const handleApuntarFaltantes = () => {
    const yaEnLista = new Set(extras.map(e => normalizar(e.nombre.replace(/\s*\(x\d+\)$/, ''))));
    const nuevos = productos.filter(
      p => p.stock_minimo !== null && p.stock_actual < p.stock_minimo && !yaEnLista.has(normalizar(p.nombre))
    );
    if (nuevos.length === 0) { mostrarToast('Todo lo que falta ya está en la lista.', 'info'); return; }
    const lugar = lugarCompra || tiendas[0]?.nombre || '';
    Alert.alert(
      'Apuntar lo que falta',
      `Se añadirán ${nuevos.length} producto${nuevos.length > 1 ? 's' : ''} a la compra${lugar ? ` (${lugar})` : ''}:\n\n` +
        nuevos.map(p => `· ${p.nombre} (x${p.stock_minimo - p.stock_actual})`).join('\n'),
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apuntar', onPress: async () => {
          let apuntados = 0, sinRed = false;
          for (const p of nuevos) {
            const res = await anadirExtra(`${p.nombre} (x${p.stock_minimo - p.stock_actual})`, lugar);
            if (res === 'error') break;
            apuntados++;
            if (res === 'encolado') sinRed = true;
          }
          if (apuntados === 0) return;
          vibrar('exito');
          mostrarToast(`${apuntados} apuntado${apuntados > 1 ? 's' : ''} en la lista${sinRed ? ' (sin conexión)' : ''}.`, sinRed ? 'aviso' : 'exito');
        }},
      ]
    );
  };

  const handleRegistrarTienda = async () => {
    if (!nuevaTiendaNombre.trim()) return;
    const nombre = nuevaTiendaNombre.trim();
    const yaExiste = tiendas.some(t => t.nombre.toLowerCase() === nombre.toLowerCase());
    if (yaExiste) { Alert.alert('Aviso', 'Ese sitio ya está en la lista.'); return; }
    const res = await insertarTienda(nombre);
    if (res === 'error') return;
    setLugarCompra(nombre);
    setNuevaTiendaNombre('');
    setMostrandoAnadirTienda(false);
  };

  const handleEliminarTienda = (id, nombre) => {
    Alert.alert('Eliminar sitio', `¿Quitar "${nombre}" de la lista de sitios?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const res = await eliminarTienda(id);
        if (res === 'error') return;
        if (lugarCompra === nombre) setLugarCompra(tiendas.find(t => t.id !== id)?.nombre || '');
      }},
    ]);
  };

  const handleEliminarProducto = (p) => {
    Alert.alert('Eliminar artículo', `¿Eliminar "${p.nombre}"? Se perderá su stock.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const res = await eliminarProducto(p.id);
        if (res !== 'error') mostrarToast(`"${p.nombre}" eliminado.`, 'info');
      }},
    ]);
  };

  const handleComprado = async (id, nombreItem) => {
    const regex = /^(.*?)\s*\(x(\d+)\)$/;
    const m = nombreItem.match(regex);
    let nombreReal = nombreItem, cantidad = 1;
    if (m) { nombreReal = m[1].trim(); cantidad = parseInt(m[2], 10); }
    const prod = productos.find(p => normalizar(p.nombre) === normalizar(nombreReal));
    const res = await marcarComprado(id, prod?.id || null, prod ? cantidad : 0);
    if (res === 'error') return;
    vibrar('exito');
    if (prod) {
      if (res === 'encolado') mostrarToast(`Sin conexión: se sumará +${cantidad} a "${prod.nombre}" cuando vuelva la cobertura.`, 'aviso');
      else mostrarToast(`Comprado: +${cantidad} a "${prod.nombre}".`);
    } else {
      mostrarToast(`Comprado: ${nombreReal}${res === 'encolado' ? ' (sin conexión)' : ''}.`, res === 'encolado' ? 'aviso' : 'exito');
    }
  };

  // ── Gestion ───────────────────────────────────────────────────────────────
  const handleRegistrarProducto = async () => {
    if (!nuevoProdNombre.trim()) { Alert.alert('Falta campo', 'Escribe el nombre.'); return; }
    let min = null;
    if (nuevoProdTieneMin) {
      min = parseInt(nuevoProdMinimo, 10);
      if (isNaN(min) || min < 0) { Alert.alert('Falta campo', 'El mínimo debe ser un número.'); return; }
    }
    const yaExiste = productos.some(p => p.nombre.toLowerCase().trim() === nuevoProdNombre.trim().toLowerCase());
    if (yaExiste) { Alert.alert('Aviso', 'Ese producto ya existe.'); return; }
    const res = await insertarProducto(nuevoProdNombre.trim(), nuevoProdCategoria, min);
    if (res === 'error') return;
    if (res === 'encolado') mostrarToast(`"${nuevoProdNombre.trim()}" registrado sin conexión. Se subirá al volver la cobertura.`, 'aviso');
    else mostrarToast(`"${nuevoProdNombre.trim()}" añadido.`);
    setNuevoProdNombre(''); setNuevoProdMinimo('2'); setNuevoProdTieneMin(true);
  };

  const abrirModalEdicion = (p) => {
    setModalProd(p);
    setModalNombre(p.nombre);
    setModalCategoria(p.categoria);
    setModalTieneMin(p.stock_minimo !== null);
    setModalMinimo(p.stock_minimo !== null ? String(p.stock_minimo) : '2');
  };

  const handleGuardarEdicion = async () => {
    if (!modalNombre.trim()) { Alert.alert('Falta campo', 'Escribe el nombre.'); return; }
    let min = null;
    if (modalTieneMin) {
      min = parseInt(modalMinimo, 10);
      if (isNaN(min) || min < 0) { Alert.alert('Falta campo', 'El mínimo debe ser un número.'); return; }
    }
    const res = await editarProducto(modalProd.id, {
      nombre: modalNombre.trim(),
      categoria: modalCategoria,
      stock_minimo: min,
    });
    if (res === 'error') return;
    mostrarToast('Cambios guardados.');
    setModalProd(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generarListaAgrupada = () => {
    const list = {};
    extras.forEach(e => {
      const t = e.lugar_compra || 'Sin sitio';
      if (!list[t]) list[t] = [];
      list[t].push(e);
    });
    return list;
  };

  const productosFiltrados = productos.filter(p =>
    (categoriaSeleccionada === 'Todos' || p.categoria === categoriaSeleccionada) &&
    (!busqueda.trim() || normalizar(p.nombre).includes(normalizar(busqueda)))
  );

  const productosEnAlerta = productos.filter(
    p => p.stock_minimo !== null && p.stock_actual < p.stock_minimo
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────
  // ESTRUCTURA CLAVE:
  //   <View>              ← raiz fija, NUNCA se mueve
  //     <Cabecera />
  //     <KeyboardAvoidingView>   ← solo empuja el contenido (pestañas)
  //       ... tabs ...
  //     </KeyboardAvoidingView>
  //     <TabBar />        ← FUERA del KAV, siempre pegada abajo
  //   </View>
  // El modal usa <Modal> nativo para no interferir con el layout

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* CABECERA — fija, nunca se mueve */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={s.headerTitle}>La Bodeguilla</Text>
          <Text style={s.headerSub}>PEÑA EL CHUNGAZO</Text>
          {proximoEvento && (
            <TouchableOpacity onPress={() => setEventosVisible(true)} style={s.eventoChip}>
              <CalendarDays size={11} color={tipoInfo(proximoEvento.tipo).color} />
              <Text style={s.eventoChipTxt} numberOfLines={1}>
                {proximoEvento.nombre} · {diasRestantes(proximoEvento.fecha) || proximoEvento.fecha}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.headerRight}>
          {!hayRed && (
            <View style={s.offlineBadge}>
              <WifiOff size={12} color={C.warning} />
              <Text style={s.offlineTxt}>SIN RED</Text>
            </View>
          )}
          {pendientes > 0 && (
            <View style={s.pendienteBadge}>
              <RefreshCw size={11} color={C.accent} />
              <Text style={s.pendienteTxt}>{pendientes}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setEventosVisible(true)}
            style={{ padding: 6, borderRadius: 8, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 6 }}
          >
            <Calendar size={16} color={C.accent} />
          </TouchableOpacity>
          {productosEnAlerta > 0 && (
            <View style={s.alertBadge}>
              <AlertTriangle size={13} color={C.accent} />
              <Text style={s.alertBadgeTxt}>{productosEnAlerta}</Text>
            </View>
          )}
        </View>
      </View>

      {/* CONTENIDO */}
      <View style={{ flex: 1 }}>
        {cargando && productos.length === 0 ? (
          <View style={s.centrado}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={[s.textMuted, { marginTop: 12 }]}>Cargando...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>

            {/* ── ALACENA ── */}
            {pestanaActual === 'visual' && (
              <View style={{ flex: 1 }}>
                <View style={s.resumenBar}>
                  <View style={s.resumenItem}>
                    <Text style={s.resumenNum}>{productos.length}</Text>
                    <Text style={s.resumenLbl}>ARTÍCULOS</Text>
                  </View>
                  <View style={s.resumenDivider} />
                  <View style={s.resumenItem}>
                    <Text style={[s.resumenNum, productosEnAlerta > 0 && { color: C.danger }]}>
                      {productosEnAlerta}
                    </Text>
                    <Text style={s.resumenLbl}>EN ALERTA</Text>
                  </View>
                  <View style={s.resumenDivider} />
                  <View style={s.resumenItem}>
                    <Text style={[s.resumenNum, { color: C.success }]}>
                      {productos.length - productosEnAlerta}
                    </Text>
                    <Text style={s.resumenLbl}>BIEN</Text>
                  </View>
                </View>
                {productosEnAlerta > 0 && (
                  <TouchableOpacity style={s.btnFaltantes} onPress={handleApuntarFaltantes}>
                    <ListPlus size={16} color={C.danger} />
                    <Text style={s.btnFaltantesTxt}>APUNTAR LO QUE FALTA EN LA COMPRA</Text>
                  </TouchableOpacity>
                )}
                <View style={s.filterBar}>
                  <View style={s.buscador}>
                    <Search size={15} color={C.textMuted} />
                    <TextInput
                      style={s.buscadorInput} placeholder="Buscar artículo..."
                      placeholderTextColor={C.textMuted} value={busqueda} onChangeText={setBusqueda}
                    />
                    {busqueda !== '' && (
                      <TouchableOpacity onPress={() => setBusqueda('')}><X size={15} color={C.textMuted} /></TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={CATEGORIAS} horizontal showsHorizontalScrollIndicator={false}
                    keyExtractor={i => i}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[s.chip, categoriaSeleccionada === item && s.chipActive]}
                        onPress={() => setCategoriaSeleccionada(item)}
                      >
                        <Text style={[s.chipTxt, categoriaSeleccionada === item && s.chipTxtActive]}>
                          {item.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
                <FlatList
                  data={productosFiltrados}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={s.listPad}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={C.accent} colors={[C.accent]} />}
                  ListEmptyComponent={<Text style={s.emptyTxt}>{busqueda ? 'Nada coincide con la búsqueda.' : 'Nada en esta categoría.'}</Text>}
                  renderItem={({ item }) => {
                    const bajo = item.stock_minimo !== null && item.stock_actual < item.stock_minimo;
                    return (
                      <View style={[s.card, bajo && s.cardAlert]}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardName}>{item.nombre}</Text>
                          <Text style={s.cardSub}>
                            {item.categoria.toUpperCase()}
                            {item.stock_minimo !== null && `  \u00B7  MIN ${item.stock_minimo}`}
                          </Text>
                        </View>
                        <View style={s.stockBadge}>
                          <Text style={[s.stockNum, bajo && s.stockNumAlert]}>{item.stock_actual}</Text>
                          {bajo && <AlertTriangle size={11} color={C.danger} style={{ marginTop: 2 }} />}
                        </View>
                      </View>
                    );
                  }}
                />
              </View>
            )}

            {/* ── RECUENTO ── */}
            {pestanaActual === 'recuento' && (
              <View style={{ flex: 1 }}>
                <View style={[s.recuentoBanner, !hayRed && s.recuentoBannerOffline]}>
                  <Text style={[s.recuentoBannerTxt, !hayRed && { color: C.warning }]}>
                    {hayRed
                      ? 'Escribe cuánto queda de cada cosa. Puedes usar el campo o los botones.'
                      : 'Sin conexión — el recuento se guardará en el móvil y se subirá solo después.'}
                  </Text>
                </View>
                <FlatList
                  data={productos}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={s.listPad}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  renderItem={({ item }) => {
                    const anterior = item.stock_actual;
                    const actual   = stockTemporal[item.id] ?? 0;
                    const diff     = actual - anterior;
                    return (
                      <View style={s.recuentoCard}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={s.cardName} numberOfLines={1}>{item.nombre}</Text>
                          <Text style={s.cardSub}>
                            {'ANTES: ' + anterior}
                            {diff !== 0 && (
                              <Text style={{ color: diff > 0 ? C.success : C.danger }}>
                                {diff > 0 ? '  +' + diff : '  ' + diff}
                              </Text>
                            )}
                          </Text>
                        </View>
                        <View style={s.recuentoControls}>
                          <TouchableOpacity style={s.btnMenos} onPress={() => modificarStockTemporal(item.id, -1)}>
                            <Minus color={C.textSec} size={16} />
                          </TouchableOpacity>
                          <TextInput
                            style={s.recuentoInput}
                            keyboardType="numeric"
                            value={inputRecuento[item.id] ?? '0'}
                            onChangeText={txt => handleInputRecuento(item.id, txt)}
                            selectTextOnFocus
                          />
                          <TouchableOpacity style={s.btnMas} onPress={() => modificarStockTemporal(item.id, 1)}>
                            <Plus color={C.bg} size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
                <TouchableOpacity style={[s.btnPrimary, s.btnGuardarRecuento]} onPress={() => handleGuardarRecuento()}>
                  <Save size={17} color={C.bg} style={{ marginRight: 8 }} />
                  <Text style={s.btnPrimaryTxt}>
                    {cambiosRecuento > 0 ? `GUARDAR RECUENTO (${cambiosRecuento} cambio${cambiosRecuento > 1 ? 's' : ''})` : 'GUARDAR RECUENTO'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── COMPRA ── */}
            {pestanaActual === 'compra' && (
              <KeyboardAwareScrollView
                style={s.listPad}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                enableOnAndroid={true}
                extraScrollHeight={20}
                refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={C.accent} colors={[C.accent]} />}
              >
                <TouchableOpacity
                  onPress={() => setCuentasVisible(true)}
                  style={s.btnCuentas}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Receipt size={18} color={C.accent} />
                    <Text style={s.btnCuentasTxt}>CUENTAS DE LA PEÑA</Text>
                  </View>
                  <Plus size={18} color={C.accent} />
                </TouchableOpacity>

                <View style={s.formCard}>
                  <Text style={s.sectionLabel}>QUÉ HAY QUE COMPRAR</Text>
                  <TextInput
                    style={[s.input, sugerenciasCompra.length > 0 && { marginBottom: 8 }]} placeholder="Ej: Coca-Cola 2L, Ron Dyc..."
                    placeholderTextColor={C.textMuted} value={nombreCompra}
                    onChangeText={setNombreCompra}
                  />
                  {sugerenciasCompra.length > 0 && (
                    <View style={s.chipRow}>
                      {sugerenciasCompra.map(p => (
                        <TouchableOpacity key={p.id} style={s.chipSugerencia} onPress={() => elegirSugerencia(p)}>
                          <Text style={s.chipSugerenciaTxt} numberOfLines={1}>{p.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Text style={s.fieldLabel}>Cantidad</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.btnQty} onPress={() => setCantidadCompra(m => Math.max(1, m - 1))}>
                      <Minus color={C.accent} size={18} />
                    </TouchableOpacity>
                    <Text style={s.qtyNum}>{cantidadCompra}</Text>
                    <TouchableOpacity style={s.btnQty} onPress={() => setCantidadCompra(m => m + 1)}>
                      <Plus color={C.accent} size={18} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>Dónde se compra</Text>
                    <TouchableOpacity onPress={() => setMostrandoAnadirTienda(!mostrandoAnadirTienda)} style={s.configLink}>
                      <SlidersHorizontal size={13} color={C.accent} />
                      <Text style={s.configLinkTxt}>Gestionar sitios</Text>
                    </TouchableOpacity>
                  </View>
                  {mostrandoAnadirTienda && (
                    <View style={s.tiendaBox}>
                      <View style={s.tiendaMiniForm}>
                        <TextInput
                          style={s.miniInput} placeholder="Nuevo sitio..."
                          placeholderTextColor={C.textMuted} value={nuevaTiendaNombre}
                          onChangeText={setNuevaTiendaNombre}
                        />
                        <TouchableOpacity style={s.btnMiniSave} onPress={handleRegistrarTienda}>
                          <Save color={C.bg} size={14} />
                        </TouchableOpacity>
                      </View>
                      <Text style={s.tiendaListLabel}>SITIOS GUARDADOS</Text>
                      {tiendas.map(t => (
                        <View key={t.id} style={s.tiendaFila}>
                          <Text style={s.tiendaFilaTxt}>{t.nombre}</Text>
                          <TouchableOpacity onPress={() => handleEliminarTienda(t.id, t.nombre)}>
                            <Trash2 color={C.danger} size={14} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={s.chipRow}>
                    {tiendas.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[s.chip, lugarCompra === t.nombre && s.chipActive]}
                        onPress={() => setLugarCompra(t.nombre)}
                      >
                        <Text style={[s.chipTxt, lugarCompra === t.nombre && s.chipTxtActive]} numberOfLines={1}>
                          {t.nombre.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.btnPrimary} onPress={handleAnadirALaCompra}>
                    <Plus size={16} color={C.bg} style={{ marginRight: 6 }} />
                    <Text style={s.btnPrimaryTxt}>APUNTAR EN LA LISTA</Text>
                  </TouchableOpacity>
                </View>

                {Object.keys(generarListaAgrupada()).length === 0 ? (
                  <Text style={s.emptyTxt}>La lista está vacía. Buen síntoma.</Text>
                ) : (
                  Object.entries(generarListaAgrupada()).map(([tienda, items]) => (
                    <View key={tienda} style={s.bloqueTienda}>
                      <View style={s.bloqueTiendaHeader}>
                        <Text style={s.bloqueTiendaTitulo}>{tienda.toUpperCase()}</Text>
                        <View style={s.bloqueTiendaCount}>
                          <Text style={s.bloqueTiendaCountTxt}>{items.length}</Text>
                        </View>
                      </View>
                      {items.map(item => (
                        <View key={item.id} style={s.itemCompra}>
                          <Text style={s.itemCompraTxt} numberOfLines={1}>{item.nombre}</Text>
                          <View style={s.itemCompraAcciones}>
                            <TouchableOpacity style={s.btnComprado} onPress={() => handleComprado(item.id, item.nombre)}>
                              <CheckSquare color={C.white} size={17} />
                              <Text style={s.btnCompradoTxt}>COMPRADO</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.btnBorrarItem} onPress={() => marcarComprado(item.id)}>
                              <Trash2 color={C.textMuted} size={16} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
                <View style={{ height: 40 }} />
              </KeyboardAwareScrollView>
            )}

            {/* ── GESTION ── */}
            {pestanaActual === 'gestion' && (
              <KeyboardAwareScrollView
                style={s.listPad}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                enableOnAndroid={true}
                extraScrollHeight={20}
              >
                <View style={s.formCard}>
                  <Text style={s.sectionLabel}>NUEVO ARTÍCULO</Text>
                  <Text style={s.fieldLabel}>Nombre</Text>
                  <TextInput
                    style={s.input} placeholder="Ej: Fanta Naranja 2L"
                    placeholderTextColor={C.textMuted} value={nuevoProdNombre}
                    onChangeText={setNuevoProdNombre}
                  />
                  <Text style={s.fieldLabel}>Categoría</Text>
                  <View style={s.chipRow}>
                    {CATEGORIAS_FORM.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.chip, nuevoProdCategoria === cat && s.chipActive]}
                        onPress={() => setNuevoProdCategoria(cat)}
                      >
                        <Text style={[s.chipTxt, nuevoProdCategoria === cat && s.chipTxtActive]}>
                          {cat.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.toggleRow} onPress={() => setNuevoProdTieneMin(v => !v)}>
                    <View style={[s.toggleBox, nuevoProdTieneMin && s.toggleBoxActive]}>
                      {nuevoProdTieneMin && <View style={s.toggleDot} />}
                    </View>
                    <Text style={s.toggleLbl}>
                      {nuevoProdTieneMin ? 'Tiene stock mínimo' : 'Sin stock mínimo (producto puntual)'}
                    </Text>
                  </TouchableOpacity>
                  {nuevoProdTieneMin && (
                    <>
                      <Text style={s.fieldLabel}>Stock mínimo</Text>
                      <TextInput
                        style={s.input} placeholder="Ej: 2" placeholderTextColor={C.textMuted}
                        keyboardType="numeric" value={nuevoProdMinimo} onChangeText={setNuevoProdMinimo}
                      />
                    </>
                  )}
                  <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.success }]} onPress={handleRegistrarProducto}>
                    <Plus size={16} color={C.white} style={{ marginRight: 6 }} />
                    <Text style={[s.btnPrimaryTxt, { color: C.white }]}>REGISTRAR</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.bloqueTienda}>
                  <Text style={s.bloqueTiendaTitulo}>ARTÍCULOS EXISTENTES</Text>
                  {productos.map(p => (
                    <View key={p.id} style={s.gestionItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemCompraTxt}>{p.nombre}</Text>
                        <Text style={s.cardSub}>
                          {p.categoria}
                          {p.stock_minimo !== null ? `  \u00B7  Mín: ${p.stock_minimo}` : '  \u00B7  Sin mínimo'}
                        </Text>
                      </View>
                      <TouchableOpacity style={s.btnEditar} onPress={() => abrirModalEdicion(p)}>
                        <Pencil color={C.accent} size={15} />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingLeft: 10 }} onPress={() => handleEliminarProducto(p)}>
                        <Trash2 color={C.danger} size={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={{ height: 40 }} />
              </KeyboardAwareScrollView>
            )}

            {/* ── CASINO ── */}
            {pestanaActual === 'blackjack' && <Casino />}

          </View>
        )}
      </View>

      {/* BARRA INFERIOR — fuera del KeyboardAvoidingView, siempre fija */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom, height: 62 + insets.bottom }]}>
        {[
          { id: 'visual',    label: 'Alacena',  Icon: Eye },
          { id: 'recuento',  label: 'Recuento', Icon: ClipboardList },
          { id: 'compra',    label: 'Compra',   Icon: ShoppingCart },
          { id: 'gestion',   label: 'Gestión',  Icon: Settings },
          { id: 'blackjack', label: 'Casino',   Icon: Gamepad },
        ].map(({ id, label, Icon }) => {
          const active = pestanaActual === id;
          return (
            <TouchableOpacity key={id} style={s.tabBtn} onPress={() => cambiarPestana(id)}>
              <View style={s.tabIconWrap}>
                <Icon size={20} color={active ? C.accent : C.textMuted} />
              </View>
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL EDICION — Modal nativo, no interfiere con el layout */}
      <Modal
        visible={!!modalProd}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setModalProd(null)}
      >
        <View style={s.modalOverlay}>
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            enableOnAndroid={true}
            extraScrollHeight={20}
          >
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitulo}>EDITAR ARTÍCULO</Text>
                <TouchableOpacity onPress={() => setModalProd(null)}>
                  <X color={C.textMuted} size={20} />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>Nombre</Text>
              <TextInput
                style={s.input} value={modalNombre}
                onChangeText={setModalNombre} placeholderTextColor={C.textMuted}
              />

              <Text style={s.fieldLabel}>Categoría</Text>
              <View style={s.chipRow}>
                {CATEGORIAS_FORM.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.chip, modalCategoria === cat && s.chipActive]}
                    onPress={() => setModalCategoria(cat)}
                  >
                    <Text style={[s.chipTxt, modalCategoria === cat && s.chipTxtActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={s.toggleRow} onPress={() => setModalTieneMin(v => !v)}>
                <View style={[s.toggleBox, modalTieneMin && s.toggleBoxActive]}>
                  {modalTieneMin && <View style={s.toggleDot} />}
                </View>
                <Text style={s.toggleLbl}>
                  {modalTieneMin ? 'Tiene stock mínimo' : 'Sin stock mínimo (producto puntual)'}
                </Text>
              </TouchableOpacity>

              {modalTieneMin && (
                <>
                  <Text style={s.fieldLabel}>Stock mínimo</Text>
                  <TextInput
                    style={s.input} keyboardType="numeric"
                    value={modalMinimo} onChangeText={setModalMinimo}
                    placeholderTextColor={C.textMuted}
                  />
                </>
              )}

              <TouchableOpacity style={s.btnPrimary} onPress={handleGuardarEdicion}>
                <Save size={16} color={C.bg} style={{ marginRight: 8 }} />
                <Text style={s.btnPrimaryTxt}>GUARDAR CAMBIOS</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* CUENTAS DE LA PENA */}
      <CuentasPena visible={cuentasVisible} onClose={() => setCuentasVisible(false)} />
      <Eventos visible={eventosVisible} onClose={() => setEventosVisible(false)} />

      <Toast bottom={72 + insets.bottom} />

    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><ContenidoApp /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  centrado:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textMuted: { color: C.textMuted, fontSize: 13 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.bg, borderBottomWidth: 1, borderColor: C.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.textPrim, letterSpacing: -0.5 },
  headerSub:   { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2.5, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.warningDim, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  offlineTxt: { color: C.warning, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },

  pendienteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accentDim, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20,
  },
  pendienteTxt: { color: C.accent, fontWeight: '800', fontSize: 12 },

  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  alertBadgeTxt: { color: C.accent, fontWeight: '800', fontSize: 13 },

  filterBar: {
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.border,
  },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:          { backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  chipActive:    { backgroundColor: C.accent },
  chipTxt:       { color: C.textSec, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  chipTxtActive: { color: C.bg },

  listPad: { padding: 14 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, padding: 16, borderRadius: 10,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  cardAlert:     { borderColor: C.danger, backgroundColor: C.dangerDim },
  cardName:      { fontSize: 16, fontWeight: '700', color: C.textPrim },
  cardSub:       { fontSize: 11, color: C.textMuted, marginTop: 3, letterSpacing: 0.3 },
  stockBadge:    { alignItems: 'center' },
  stockNum:      { fontSize: 24, fontWeight: '900', color: C.success, minWidth: 32, textAlign: 'center' },
  stockNumAlert: { color: C.danger },

  recuentoBanner: {
    backgroundColor: C.accentDim, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: C.border,
  },
  recuentoBannerOffline: { backgroundColor: C.warningDim },
  recuentoBannerTxt:     { color: C.accent, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  recuentoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, padding: 14, borderRadius: 10,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  recuentoControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnMenos: {
    backgroundColor: C.surfaceAlt, width: 36, height: 36,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  btnMas: {
    backgroundColor: C.accent, width: 36, height: 36,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  recuentoInput: {
    backgroundColor: C.surfaceAlt, color: C.textPrim,
    fontSize: 20, fontWeight: '900', textAlign: 'center',
    width: 58, height: 44, borderRadius: 8,
    borderWidth: 1, borderColor: C.accent,
  },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, padding: 15, borderRadius: 10, marginTop: 6,
  },
  btnPrimaryTxt: { color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },

  formCard: {
    backgroundColor: C.surface, padding: 16, borderRadius: 12,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 14 },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 6, marginTop: 4, letterSpacing: 0.5 },
  fieldRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  input: {
    backgroundColor: C.surfaceAlt, color: C.textPrim,
    padding: 12, borderRadius: 8, marginBottom: 14,
    fontSize: 14, borderWidth: 1, borderColor: C.border,
  },

  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 16 },
  btnQty: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyNum: { fontSize: 20, fontWeight: '900', color: C.textPrim, minWidth: 24, textAlign: 'center' },

  configLink:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  configLinkTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },

  tiendaBox: {
    backgroundColor: C.surfaceAlt, padding: 12, borderRadius: 8,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  tiendaMiniForm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  miniInput: {
    flex: 1, color: C.textPrim, fontSize: 13,
    backgroundColor: C.surface, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
  },
  btnMiniSave: {
    backgroundColor: C.accent, padding: 9, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  tiendaListLabel: { fontSize: 10, color: C.textMuted, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  tiendaFila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border,
  },
  tiendaFilaTxt: { color: C.textPrim, fontSize: 14 },

  btnCuentas: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.accentDim, borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: C.accent + '55',
  },
  btnCuentasTxt: { color: C.accent, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

  bloqueTienda: {
    backgroundColor: C.surface, padding: 16, borderRadius: 12,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  bloqueTiendaHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  bloqueTiendaTitulo:   { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2 },
  bloqueTiendaCount:    { backgroundColor: C.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  bloqueTiendaCountTxt: { color: C.accent, fontSize: 11, fontWeight: '800' },

  itemCompra:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border },
  itemCompraTxt:      { color: C.textPrim, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 10 },
  itemCompraAcciones: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  btnComprado: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.success, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7,
  },
  btnCompradoTxt: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  btnBorrarItem: {
    padding: 7, borderRadius: 7,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },

  emptyTxt: { color: C.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  resumenBar:     { flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderColor: C.border, paddingVertical: 14 },
  resumenItem:    { flex: 1, alignItems: 'center' },
  resumenNum:     { fontSize: 26, fontWeight: '900', color: C.accent },
  resumenLbl:     { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginTop: 2 },
  resumenDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  gestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border },

  btnEditar: {
    padding: 7, borderRadius: 7,
    backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '44',
    marginLeft: 8,
  },

  tabBar:       { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderColor: C.border, alignItems: 'center', paddingTop: 6 },
  tabBtn:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  tabIconWrap:  { padding: 5 },
  tabTxt:       { color: C.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  tabTxtActive: { color: C.accent },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 2 },
  toggleBox: {
    width: 36, height: 20, borderRadius: 10,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleBoxActive: { backgroundColor: C.accent, borderColor: C.accent },
  toggleDot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: C.bg, alignSelf: 'flex-end' },
  toggleLbl:       { color: C.textSec, fontSize: 13, fontWeight: '600', flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,8,14,0.88)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 20, borderWidth: 1, borderColor: C.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 18,
  },
  modalTitulo: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 2 },

  eventoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 8, maxWidth: 230,
  },
  eventoChipTxt: { color: C.textSec, fontSize: 11, fontWeight: '700', flexShrink: 1 },

  btnFaltantes: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.dangerDim, paddingVertical: 11,
    borderBottomWidth: 1, borderColor: C.border,
  },
  btnFaltantesTxt: { color: C.danger, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, marginBottom: 10,
  },
  buscadorInput: { flex: 1, color: C.textPrim, fontSize: 14, paddingVertical: 8 },

  chipSugerencia:    { backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + '55', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, maxWidth: '100%' },
  chipSugerenciaTxt: { color: C.accent, fontWeight: '700', fontSize: 12 },

  btnGuardarRecuento: { marginHorizontal: 14, marginBottom: 10 },
});
