import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView, StatusBar, Alert
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './supabase';
import {
  Eye, ClipboardList, ShoppingCart, Settings,
  Plus, Minus, CheckSquare, Trash2, SlidersHorizontal,
  Save, Gamepad, AlertTriangle
} from 'lucide-react-native';
import Casino from './Casino';

const CATEGORIAS = ['Todos', 'Bebidas', 'Mezcla', 'Limpieza', 'Otros'];
const CATEGORIAS_FORM = ['Bebidas', 'Mezcla', 'Limpieza', 'Otros'];

// Paleta oscura con acento morado de la pena
const C = {
  bg:           '#131215',
  surface:      '#1C1A20',
  surfaceAlt:   '#252229',
  border:       '#332F3C',
  accent:       '#9B6DCC',
  accentDim:    '#2A1F3D',
  success:      '#2D9E5F',
  danger:       '#C94A3F',
  dangerDim:    '#3A1210',
  textPrim:     '#EDE9F4',
  textSec:      '#9890A8',
  textMuted:    '#5A5466',
  white:        '#FFFFFF',
};

function ContenidoApp() {
  const insets = useSafeAreaInsets();
  const [pestanaActual, setPestanaActual] = useState('visual');
  const [productos, setProductos] = useState([]);
  const [extras, setExtras] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [cargando, setCargando] = useState(true);

  const [stockTemporal, setStockTemporal] = useState({});
  const [inputRecuento, setInputRecuento] = useState({});

  const [nombreCompra, setNombreCompra] = useState('');
  const [cantidadCompra, setCantidadCompra] = useState(1);
  const [lugarCompra, setLugarCompra] = useState('');
  const [mostrandoAnadirTienda, setMostrandoAnadirTienda] = useState(false);
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState('');

  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState('Bebidas');
  const [nuevoProdMinimo, setNuevoProdMinimo] = useState('2');

  // Gestion: edicion de stock minimo inline
  const [editandoMinimo, setEditandoMinimo] = useState(null);
  const [inputMinimo, setInputMinimo] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: prodData, error: prodError } = await supabase
        .from('productos').select('*').order('nombre', { ascending: true });
      if (prodError) throw prodError;
      setProductos(prodData);

      const temp = {};
      const inp = {};
      prodData.forEach(p => {
        temp[p.id] = p.stock_actual;
        inp[p.id] = String(p.stock_actual);
      });
      setStockTemporal(temp);
      setInputRecuento(inp);

      const { data: extData, error: extError } = await supabase
        .from('extras_compra').select('*').eq('comprado', false)
        .order('created_at', { ascending: false });
      if (extError) throw extError;
      setExtras(extData);

      const { data: tienData, error: tienError } = await supabase
        .from('tiendas').select('*').order('nombre', { ascending: true });
      if (tienError) throw tienError;
      setTiendas(tienData);

      if (tienData.length > 0 && !lugarCompra) setLugarCompra(tienData[0].nombre);
    } catch (error) {
      console.error('Error cargando La Bodeguilla:', error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Recuento: botones +/-
  const modificarStockTemporal = (id, cambio) => {
    setStockTemporal(prev => {
      const nuevo = Math.max(0, (prev[id] || 0) + cambio);
      setInputRecuento(pi => ({ ...pi, [id]: String(nuevo) }));
      return { ...prev, [id]: nuevo };
    });
  };

  // Recuento: input directo con el numero que queda
  const handleInputRecuento = (id, texto) => {
    setInputRecuento(prev => ({ ...prev, [id]: texto }));
    const num = parseInt(texto, 10);
    if (!isNaN(num) && num >= 0) {
      setStockTemporal(prev => ({ ...prev, [id]: num }));
    }
  };

  const guardarRecuento = async () => {
    try {
      setCargando(true);
      for (const id of Object.keys(stockTemporal)) {
        await supabase.from('productos').update({ stock_actual: stockTemporal[id] }).eq('id', id);
      }
      await cargarDatos();
      setPestanaActual('visual');
      Alert.alert('Listo', 'Recuento guardado en La Bodeguilla.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el recuento.');
    } finally {
      setCargando(false);
    }
  };

  const anadirALaCompra = async () => {
    if (!nombreCompra.trim()) {
      Alert.alert('Falta el nombre', 'Pon que hay que comprar.');
      return;
    }
    try {
      const itemFormateado = `${nombreCompra.trim()} (x${cantidadCompra})`;
      const { error } = await supabase.from('extras_compra')
        .insert([{ nombre: itemFormateado, lugar_compra: lugarCompra }]);
      if (error) throw error;
      setNombreCompra('');
      setCantidadCompra(1);
      await cargarDatos();
    } catch (error) { console.error(error.message); }
  };

  const registrarNuevaTienda = async () => {
    if (!nuevaTiendaNombre.trim()) return;
    try {
      const nombreLimpio = nuevaTiendaNombre.trim();
      const { error } = await supabase.from('tiendas').insert([{ nombre: nombreLimpio }]);
      if (error) {
        if (error.code === '23505') Alert.alert('Aviso', 'Ese sitio ya esta en la lista.');
        else throw error;
      } else {
        setLugarCompra(nombreLimpio);
        setNuevaTiendaNombre('');
        setMostrandoAnadirTienda(false);
        await cargarDatos();
      }
    } catch (error) { console.error(error.message); }
  };

  const eliminarTienda = async (id, nombre) => {
    try {
      const { error } = await supabase.from('tiendas').delete().eq('id', id);
      if (error) throw error;
      if (lugarCompra === nombre) {
        setLugarCompra(tiendas.length > 1 ? tiendas.find(t => t.id !== id).nombre : '');
      }
      await cargarDatos();
    } catch (error) { console.error(error.message); }
  };

  const procesarCompraCompletada = async (id, nombreItem) => {
    try {
      setCargando(true);
      const regex = /^(.*?)\s*\(x(\d+)\)$/;
      const coincidencia = nombreItem.match(regex);
      let nombreReal = nombreItem;
      let cantidadASumar = 1;
      if (coincidencia && coincidencia.length === 3) {
        nombreReal = coincidencia[1].trim();
        cantidadASumar = parseInt(coincidencia[2], 10);
      }
      const productoExistente = productos.find(
        p => p.nombre.toLowerCase().trim() === nombreReal.toLowerCase()
      );
      if (productoExistente) {
        const nuevoStock = productoExistente.stock_actual + cantidadASumar;
        await supabase.from('productos').update({ stock_actual: nuevoStock }).eq('id', productoExistente.id);
      }
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      await cargarDatos();
      if (productoExistente)
        Alert.alert('Comprado', `+${cantidadASumar} unidades a "${productoExistente.nombre}".`);
      else
        Alert.alert('Comprado', 'Quitado de la lista.');
    } catch (error) { console.error(error.message); }
    finally { setCargando(false); }
  };

  const eliminarExtraSinSumar = async (id) => {
    try {
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      await cargarDatos();
    } catch (error) { console.error(error.message); }
  };

  const registrarNuevoProductoInventario = async () => {
    if (!nuevoProdNombre.trim()) {
      Alert.alert('Falta campo', 'Escribe el nombre del articulo.');
      return;
    }
    const minimoNumerico = parseInt(nuevoProdMinimo, 10);
    if (isNaN(minimoNumerico) || minimoNumerico < 0) {
      Alert.alert('Falta campo', 'El stock minimo debe ser un numero.');
      return;
    }
    try {
      setCargando(true);
      const { error } = await supabase.from('productos').insert([{
        nombre: nuevoProdNombre.trim(),
        categoria: nuevoProdCategoria,
        stock_minimo: minimoNumerico,
        stock_actual: 0,
      }]);
      if (error) {
        if (error.code === '23505') Alert.alert('Aviso', 'Ese producto ya existe.');
        else throw error;
      } else {
        Alert.alert('Registrado', `"${nuevoProdNombre.trim()}" anadido.`);
        setNuevoProdNombre('');
        setNuevoProdMinimo('2');
        await cargarDatos();
      }
    } catch (error) { console.error(error.message); }
    finally { setCargando(false); }
  };

  const eliminarProductoInventario = async (id, nombre) => {
    try {
      setCargando(true);
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      await cargarDatos();
      Alert.alert('Eliminado', `"${nombre}" borrado.`);
    } catch (error) { console.error(error.message); }
    finally { setCargando(false); }
  };

  const guardarMinimoEditado = async (id) => {
    const num = parseInt(inputMinimo, 10);
    if (isNaN(num) || num < 0) { setEditandoMinimo(null); return; }
    try {
      await supabase.from('productos').update({ stock_minimo: num }).eq('id', id);
      setEditandoMinimo(null);
      await cargarDatos();
    } catch (error) { console.error(error.message); }
  };

  const generarListaCompraAgrupada = () => {
    const list = {};
    extras.forEach(e => {
      const t = e.lugar_compra || 'Sin sitio';
      if (!list[t]) list[t] = [];
      list[t].push(e);
    });
    return list;
  };

  const productosFiltrados = categoriaSeleccionada === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === categoriaSeleccionada);

  const productosEnAlerta = productos.filter(p => p.stock_actual <= p.stock_minimo).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* CABECERA */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={s.headerTitle}>La Bodeguilla</Text>
          <Text style={s.headerSub}>PENA EL CHUNGAZO</Text>
        </View>
        {productosEnAlerta > 0 && (
          <View style={s.alertBadge}>
            <AlertTriangle size={13} color={C.accent} />
            <Text style={s.alertBadgeTxt}>{productosEnAlerta}</Text>
          </View>
        )}
      </View>

      {cargando ? (
        <View style={s.centrado}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={[s.textMuted, { marginTop: 12 }]}>Cargando...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* ALACENA */}
          {pestanaActual === 'visual' && (
            <View style={{ flex: 1 }}>
              {/* Resumen rapido */}
              <View style={s.resumenBar}>
                <View style={s.resumenItem}>
                  <Text style={s.resumenNum}>{productos.length}</Text>
                  <Text style={s.resumenLbl}>ARTICULOS</Text>
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
              <View style={s.filterBar}>
                <FlatList
                  data={CATEGORIAS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => item}
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
                ListEmptyComponent={<Text style={s.emptyTxt}>Nada en esta categoria.</Text>}
                renderItem={({ item }) => {
                  const bajo = item.stock_actual <= item.stock_minimo;
                  return (
                    <View style={[s.card, bajo && s.cardAlert]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName}>{item.nombre}</Text>
                        <Text style={s.cardSub}>
                          {item.categoria.toUpperCase()}  {'\u00B7'}  MIN {item.stock_minimo}
                        </Text>
                      </View>
                      <View style={s.stockBadge}>
                        <Text style={[s.stockNum, bajo && s.stockNumAlert]}>
                          {item.stock_actual}
                        </Text>
                        {bajo && <AlertTriangle size={11} color={C.danger} style={{ marginTop: 2 }} />}
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          )}

          {/* RECUENTO */}
          {pestanaActual === 'recuento' && (
            <View style={{ flex: 1 }}>
              <View style={s.recuentoBanner}>
                <Text style={s.recuentoBannerTxt}>
                  Escribe cuanto queda de cada cosa. Puedes usar el campo o los botones.
                </Text>
              </View>
              <FlatList
                data={productos}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={s.listPad}
                renderItem={({ item }) => {
                  const anterior = item.stock_actual;
                  const actual = stockTemporal[item.id] ?? 0;
                  const diff = actual - anterior;
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
                        <TouchableOpacity
                          style={s.btnMenos}
                          onPress={() => modificarStockTemporal(item.id, -1)}
                        >
                          <Minus color={C.textSec} size={16} />
                        </TouchableOpacity>

                        <TextInput
                          style={s.recuentoInput}
                          keyboardType="numeric"
                          value={inputRecuento[item.id] ?? '0'}
                          onChangeText={txt => handleInputRecuento(item.id, txt)}
                          selectTextOnFocus
                        />

                        <TouchableOpacity
                          style={s.btnMas}
                          onPress={() => modificarStockTemporal(item.id, 1)}
                        >
                          <Plus color={C.bg} size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
              <TouchableOpacity style={s.btnPrimary} onPress={guardarRecuento}>
                <Save size={17} color={C.bg} style={{ marginRight: 8 }} />
                <Text style={s.btnPrimaryTxt}>GUARDAR RECUENTO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* COMPRA */}
          {pestanaActual === 'compra' && (
            <ScrollView style={s.listPad} showsVerticalScrollIndicator={false}>
              <View style={s.formCard}>
                <Text style={s.sectionLabel}>QUE HAY QUE COMPRAR</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Coca-Cola 2L, Ron Dyc..."
                  placeholderTextColor={C.textMuted}
                  value={nombreCompra}
                  onChangeText={setNombreCompra}
                />

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
                  <Text style={s.fieldLabel}>Donde se compra</Text>
                  <TouchableOpacity
                    onPress={() => setMostrandoAnadirTienda(!mostrandoAnadirTienda)}
                    style={s.configLink}
                  >
                    <SlidersHorizontal size={13} color={C.accent} />
                    <Text style={s.configLinkTxt}>Gestionar sitios</Text>
                  </TouchableOpacity>
                </View>

                {mostrandoAnadirTienda && (
                  <View style={s.tiendaBox}>
                    <View style={s.tiendaMiniForm}>
                      <TextInput
                        style={s.miniInput}
                        placeholder="Nuevo sitio..."
                        placeholderTextColor={C.textMuted}
                        value={nuevaTiendaNombre}
                        onChangeText={setNuevaTiendaNombre}
                      />
                      <TouchableOpacity style={s.btnMiniSave} onPress={registrarNuevaTienda}>
                        <Save color={C.bg} size={14} />
                      </TouchableOpacity>
                    </View>
                    <Text style={s.tiendaListLabel}>SITIOS GUARDADOS</Text>
                    {tiendas.map(t => (
                      <View key={t.id} style={s.tiendaFila}>
                        <Text style={s.tiendaFilaTxt}>{t.nombre}</Text>
                        <TouchableOpacity onPress={() => eliminarTienda(t.id, t.nombre)}>
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

                <TouchableOpacity style={s.btnPrimary} onPress={anadirALaCompra}>
                  <Plus size={16} color={C.bg} style={{ marginRight: 6 }} />
                  <Text style={s.btnPrimaryTxt}>APUNTAR EN LA LISTA</Text>
                </TouchableOpacity>
              </View>

              {Object.keys(generarListaCompraAgrupada()).length === 0 ? (
                <Text style={s.emptyTxt}>La lista esta vacia. Buen sintoma.</Text>
              ) : (
                Object.entries(generarListaCompraAgrupada()).map(([tienda, items]) => (
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
                          <TouchableOpacity
                            style={s.btnComprado}
                            onPress={() => procesarCompraCompletada(item.id, item.nombre)}
                          >
                            <CheckSquare color={C.white} size={17} />
                            <Text style={s.btnCompradoTxt}>COMPRADO</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.btnBorrarItem}
                            onPress={() => eliminarExtraSinSumar(item.id)}
                          >
                            <Trash2 color={C.textMuted} size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* GESTION */}
          {pestanaActual === 'gestion' && (
            <ScrollView style={s.listPad} showsVerticalScrollIndicator={false}>
              <View style={s.formCard}>
                <Text style={s.sectionLabel}>NUEVO ARTICULO</Text>
                <Text style={s.fieldLabel}>Nombre</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Fanta Naranja 2L"
                  placeholderTextColor={C.textMuted}
                  value={nuevoProdNombre}
                  onChangeText={setNuevoProdNombre}
                />
                <Text style={s.fieldLabel}>Categoria</Text>
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
                <Text style={s.fieldLabel}>Stock minimo</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: 2"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={nuevoProdMinimo}
                  onChangeText={setNuevoProdMinimo}
                />
                <TouchableOpacity
                  style={[s.btnPrimary, { backgroundColor: C.success }]}
                  onPress={registrarNuevoProductoInventario}
                >
                  <Plus size={16} color={C.white} style={{ marginRight: 6 }} />
                  <Text style={[s.btnPrimaryTxt, { color: C.white }]}>REGISTRAR</Text>
                </TouchableOpacity>
              </View>

              <View style={s.bloqueTienda}>
                <Text style={s.bloqueTiendaTitulo}>ARTICULOS EXISTENTES</Text>
                {productos.map(p => (
                  <View key={p.id} style={s.gestionItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemCompraTxt}>{p.nombre}</Text>
                      <Text style={s.cardSub}>{p.categoria}</Text>
                    </View>
                    {/* Minimo editable inline */}
                    <View style={s.gestionMinimoWrap}>
                      <Text style={s.gestionMinimoLbl}>MIN</Text>
                      {editandoMinimo === p.id ? (
                        <TextInput
                          style={s.gestionMinimoInput}
                          keyboardType="numeric"
                          value={inputMinimo}
                          onChangeText={setInputMinimo}
                          onBlur={() => guardarMinimoEditado(p.id)}
                          onSubmitEditing={() => guardarMinimoEditado(p.id)}
                          autoFocus
                          selectTextOnFocus
                        />
                      ) : (
                        <TouchableOpacity onPress={() => { setEditandoMinimo(p.id); setInputMinimo(String(p.stock_minimo)); }}>
                          <Text style={s.gestionMinimoVal}>{p.stock_minimo}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity style={{ paddingLeft: 14 }} onPress={() => eliminarProductoInventario(p.id, p.nombre)}>
                      <Trash2 color={C.danger} size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* CASINO */}
          {pestanaActual === 'blackjack' && <Casino />}

        </View>
      )}

      {/* BARRA INFERIOR */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom, height: 62 + insets.bottom }]}>
        {[
          { id: 'visual',    label: 'Alacena',  Icon: Eye },
          { id: 'recuento',  label: 'Recuento', Icon: ClipboardList },
          { id: 'compra',    label: 'Compra',   Icon: ShoppingCart },
          { id: 'gestion',   label: 'Gestion',  Icon: Settings },
          { id: 'blackjack', label: 'Casino',   Icon: Gamepad },
        ].map(({ id, label, Icon }) => {
          const active = pestanaActual === id;
          return (
            <TouchableOpacity key={id} style={s.tabBtn} onPress={() => setPestanaActual(id)}>
              <View style={[s.tabIconWrap, active && s.tabIconWrapActive]}>
                <Icon size={20} color={active ? C.accent : C.textMuted} />
              </View>
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ContenidoApp />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  centrado:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textMuted:    { color: C.textMuted, fontSize: 13 },

  // Cabecera
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderColor: C.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.textPrim, letterSpacing: -0.5 },
  headerSub:   { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 2.5, marginTop: 2 },
  alertBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  alertBadgeTxt: { color: C.accent, fontWeight: '800', fontSize: 13 },

  // Filtros
  filterBar: {
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderColor: C.border,
  },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:          { backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  chipActive:    { backgroundColor: C.accent },
  chipTxt:       { color: C.textSec, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  chipTxtActive: { color: C.bg },

  listPad: { padding: 14 },

  // Tarjeta alacena
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

  // Recuento
  recuentoBanner: {
    backgroundColor: C.accentDim, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: C.border,
  },
  recuentoBannerTxt: { color: C.accent, fontSize: 12, fontWeight: '600', textAlign: 'center' },
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

  // Boton primario
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accent, padding: 15, borderRadius: 10, marginTop: 6,
  },
  btnPrimaryTxt: { color: C.bg, fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },

  // Formularios
  formCard: {
    backgroundColor: C.surface, padding: 16, borderRadius: 12,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: C.accent,
    letterSpacing: 2, marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSec,
    marginBottom: 6, marginTop: 4, letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  input: {
    backgroundColor: C.surfaceAlt, color: C.textPrim,
    padding: 12, borderRadius: 8, marginBottom: 14,
    fontSize: 14, borderWidth: 1, borderColor: C.border,
  },

  // Cantidad
  qtyRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 16 },
  btnQty:  {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyNum:  { fontSize: 20, fontWeight: '900', color: C.textPrim, minWidth: 24, textAlign: 'center' },

  configLink:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  configLinkTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },

  tiendaBox: {
    backgroundColor: C.surfaceAlt, padding: 12, borderRadius: 8,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  tiendaMiniForm:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
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

  bloqueTienda: {
    backgroundColor: C.surface, padding: 16, borderRadius: 12,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  bloqueTiendaTitulo: {
    fontSize: 10, fontWeight: '800', color: C.accent,
    letterSpacing: 2,
  },
  itemCompra: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border,
  },
  itemCompraTxt:    { color: C.textPrim, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 10 },
  itemCompraAcciones: { flexDirection: 'row', gap: 16, alignItems: 'center' },

  emptyTxt: { color: C.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  // Resumen alacena
  resumenBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  resumenItem:    { flex: 1, alignItems: 'center' },
  resumenNum:     { fontSize: 26, fontWeight: '900', color: C.accent },
  resumenLbl:     { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginTop: 2 },
  resumenDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // Compra: botones de item mejorados
  bloqueTiendaHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  bloqueTiendaCount: {
    backgroundColor: C.accentDim, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10,
  },
  bloqueTiendaCountTxt: { color: C.accent, fontSize: 11, fontWeight: '800' },
  btnComprado: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.success, paddingHorizontal: 10,
    paddingVertical: 7, borderRadius: 7,
  },
  btnCompradoTxt: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  btnBorrarItem: {
    padding: 7, borderRadius: 7,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },

  // Gestion: edicion inline de minimo
  gestionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border,
  },
  gestionMinimoWrap: { alignItems: 'center', marginLeft: 8 },
  gestionMinimoLbl:  { fontSize: 8, fontWeight: '800', color: C.textMuted, letterSpacing: 1, marginBottom: 2 },
  gestionMinimoVal: {
    fontSize: 16, fontWeight: '900', color: C.accent,
    minWidth: 28, textAlign: 'center',
    borderBottomWidth: 1, borderColor: C.accentDim, paddingBottom: 1,
  },
  gestionMinimoInput: {
    fontSize: 16, fontWeight: '900', color: C.accent,
    width: 40, textAlign: 'center', padding: 0,
    borderBottomWidth: 1, borderColor: C.accent,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1, borderColor: C.border,
    alignItems: 'center', paddingTop: 6,
  },
  tabBtn:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  tabIconWrap:      { padding: 5 },
  tabIconWrapActive:{},
  tabTxt:           { color: C.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  tabTxtActive:     { color: C.accent },
});
