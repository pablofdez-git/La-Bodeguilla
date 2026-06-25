import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './supabase';
import { Eye, ClipboardList, ShoppingCart, Plus, Minus, Trash2, CheckSquare, Settings } from 'lucide-react-native';

const CATEGORIAS = ['Todos', 'Bebidas', 'Mezcla', 'Limpieza', 'Otros'];
// Categorías reales para el formulario (quitando 'Todos')
const CATEGORIAS_FORM = ['Bebidas', 'Mezcla', 'Limpieza', 'Otros'];

function ContenidoApp() {
  const insets = useSafeAreaInsets();
  const [pestanaActual, setPestanaActual] = useState('visual');
  const [productos, setProductos] = useState([]);
  const [extras, setExtras] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [cargando, setCargando] = useState(true);

  const [stockTemporal, setStockTemporal] = useState({});

  // Estados de la pestaña COMPRA
  const [nombreCompra, setNombreCompra] = useState('');
  const [cantidadCompra, setCantidadCompra] = useState(1);
  const [lugarCompra, setLugarCompra] = useState('');
  const [mostrandoAñadirTienda, setMostrandoAñadirTienda] = useState(false);
  const [nuevaTiendaNombre, setNuevaTiendaNombre] = useState('');

  // Estados de la nueva pestaña GESTIÓN (Añadir productos al inventario)
  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState('Bebidas');
  const [nuevoProdMinimo, setNuevoProdMinimo] = useState('2');

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // 1. Traer productos de la alacena
      const { data: prodData, error: prodError } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });
      if (prodError) throw prodError;
      setProductos(prodData);

      const temp = {};
      prodData.forEach(p => { temp[p.id] = p.stock_actual; });
      setStockTemporal(temp);

      // 2. Traer extras de compra pendientes
      const { data: extData, error: extError } = await supabase
        .from('extras_compra')
        .select('*')
        .eq('comprado', false)
        .order('created_at', { ascending: false });
      if (extError) throw extError;
      setExtras(extData);

      // 3. Traer la lista de tiendas
      const { data: tienData, error: tienError } = await supabase
        .from('tiendas')
        .select('*')
        .order('nombre', { ascending: true });
      if (tienError) throw tienError;
      setTiendas(tienData);

      if (tienData.length > 0 && !lugarCompra) {
        setLugarCompra(tienData[0].nombre);
      }

    } catch (error) {
      console.error('Error cargando La Bodeguilla:', error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const modificarStockTemporal = (id, cambio) => {
    setStockTemporal(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + cambio)
    }));
  };

  const guardarRecuento = async () => {
    try {
      setCargando(true);
      for (const id of Object.keys(stockTemporal)) {
        await supabase
          .from('productos')
          .update({ stock_actual: stockTemporal[id] })
          .eq('id', id);
      }
      await cargarDatos();
      setPestanaActual('visual');
      alert('¡Recuento guardado en La Bodeguilla!');
    } catch (error) {
      alert('Error al guardar el recuento');
    } finally {
      setCargando(false);
    }
  };

  const añadirALaCompra = async () => {
    if (!nombreCompra.trim()) {
      alert('Pon el nombre de lo que hay que comprar, melón.');
      return;
    }
    try {
      const itemFormateado = `${nombreCompra.trim()} (x${cantidadCompra})`;
      const { error } = await supabase
        .from('extras_compra')
        .insert([{ nombre: itemFormateado, lugar_compra: lugarCompra }]);
      if (error) throw error;

      setNombreCompra('');
      setCantidadCompra(1);
      await cargarDatos();
    } catch (error) {
      console.error(error.message);
    }
  };

  const registrarNuevaTienda = async () => {
    if (!nuevaTiendaNombre.trim()) return;
    try {
      const nombreLimpio = nuevaTiendaNombre.trim();
      const { error } = await supabase
        .from('tiendas')
        .insert([{ nombre: nombreLimpio }]);

      if (error) {
        if (error.code === '23505') {
          alert('Ese sitio ya está en la lista, no dupliques.');
        } else throw error;
      } else {
        setLugarCompra(nombreLimpio);
        setNuevaTiendaNombre('');
        setMostrandoAñadirTienda(false);
        await cargarDatos();
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  const eliminarTienda = async (id, nombre) => {
    try {
      const { error } = await supabase
        .from('tiendas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (lugarCompra === nombre) {
        setLugarCompra(tiendas.length > 1 ? tiendas.find(t => t.id !== id).nombre : '');
      }
      await cargarDatos();
      alert(`Sitio "${nombre}" eliminado de la lista.`);
    } catch (error) {
      console.error(error.message);
    }
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
        await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock })
          .eq('id', productoExistente.id);
      }

      await supabase
        .from('extras_compra')
        .update({ comprado: true })
        .eq('id', id);

      await cargarDatos();

      if (productoExistente) {
        alert(`¡Comprado! Se han sumado ${cantidadASumar} a "${productoExistente.nombre}".`);
      } else {
        alert(`¡Comprado! Quitado de la lista (no varió stock porque "${nombreReal}" no coincide con la Alacena).`);
      }

    } catch (error) {
      console.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarExtraSinSumar = async (id) => {
    try {
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      await cargarDatos();
    } catch (error) {
      console.error(error.message);
    }
  };

  // --- 🔥 NUEVAS FUNCIONES: CREAR Y ELIMINAR ELEMENTOS DEL INVENTARIO ---
  const registrarNuevoProductoInventario = async () => {
    if (!nuevoProdNombre.trim()) {
      alert('Escribe el nombre del artículo que quieres añadir a la alacena.');
      return;
    }

    const minimoNumerico = parseInt(nuevoProdMinimo, 10);
    if (isNaN(minimoNumerico) || minimoNumerico < 0) {
      alert('El stock mínimo tiene que ser un número válido (0 o más).');
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase
        .from('productos')
        .insert([{
          nombre: nuevoProdNombre.trim(),
          categoria: nuevoProdCategoria,
          stock_minimo: minimoNumerico,
          stock_actual: 0 // Empieza a cero hasta que se cuente o se compre
        }]);

      if (error) {
        if (error.code === '23505') {
          alert('Ese producto ya existe en la Alacena, no lo metas repetido.');
        } else throw error;
      } else {
        alert(`"${nuevoProdNombre.trim()}" añadido correctamente a la Alacena.`);
        setNuevoProdNombre('');
        setNuevoProdMinimo('2');
        await cargarDatos();
      }
    } catch (error) {
      console.error(error.message);
      alert('Error al añadir el producto a la base de datos.');
    } finally {
      setCargando(false);
    }
  };

  const eliminarProductoInventario = async (id, nombre) => {
    try {
      setCargando(true);
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert(`"${nombre}" ha sido eliminado del inventario.`);
      await cargarDatos();
    } catch (error) {
      console.error(error.message);
      alert('No se pudo borrar. Puede estar referenciado en otra tabla.');
    } finally {
      setCargando(false);
    }
  };


  const generarListaCompraAgrupada = () => {
    const lista = {};
    extras.forEach(e => {
      const tienda = e.lugar_compra || 'Mercadona';
      if (!lista[tienda]) lista[tienda] = [];
      lista[tienda].push(e);
    });
    return lista;
  };

  const productosFiltrados = categoriaSeleccionada === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === categoriaSeleccionada);

  return (
    <View style={styles.contenedorPrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#5B3281" />

      <View style={[styles.cabecera, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.titulo}>La Bodeguilla</Text>
        <Text style={styles.subtitulo}>PEÑA EL CHUNGAZO</Text>
      </View>

      {cargando ? (
        <View style={styles.centrado}><ActivityIndicator size="large" color="#5B3281" /></View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* PESTAÑA 1: INVENTARIO VISUAL (ALACENA) */}
          {pestanaActual === 'visual' && (
            <View style={{ flex: 1 }}>
              <View style={styles.contenedorFiltros}>
                <FlatList
                  data={CATEGORIAS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.botonFiltro, categoriaSeleccionada === item && styles.botonFiltroActivo]}
                      onPress={() => setCategoriaSeleccionada(item)}
                    >
                      <Text style={[styles.textoFiltro, categoriaSeleccionada === item && styles.textoFiltroActivo]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <FlatList
                data={productosFiltrados}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listaContenido}
                renderItem={({ item }) => {
                  const bajo = item.stock_actual <= item.stock_minimo;
                  return (
                    <View style={[styles.tarjeta, bajo && styles.tarjetaAlerta]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prodNombre}>{item.nombre}</Text>
                        <Text style={styles.prodSub}>{item.categoria} • Mínimo: {item.stock_minimo}</Text>
                      </View>
                      <Text style={[styles.txtStock, bajo && styles.txtStockAlerta]}>{item.stock_actual}</Text>
                    </View>
                  );
                }}
              />
            </View>
          )}

          {/* PESTAÑA 2: MODO RECUENTO */}
          {pestanaActual === 'recuento' && (
            <View style={{ flex: 1 }}>
              <FlatList
                data={productos}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listaContenido}
                renderItem={({ item }) => (
                  <View style={styles.tarjetaRecuento}>
                    <Text style={styles.prodNombreRecuento}>{item.nombre}</Text>
                    <View style={styles.controlesRecuento}>
                      <TouchableOpacity style={styles.btnMenos} onPress={() => modificarStockTemporal(item.id, -1)}>
                        <Text style={styles.btnTexto}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.txtStockTemp}>{stockTemporal[item.id] ?? 0}</Text>
                      <TouchableOpacity style={styles.btnMas} onPress={() => modificarStockTemporal(item.id, 1)}>
                        <Text style={styles.btnTexto}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarRecuento}>
                <Text style={styles.txtGuardar}>Confirmar Recuento</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PESTAÑA 3: COMPRA */}
          {pestanaActual === 'compra' && (
            <ScrollView style={styles.listaContenido}>
              <View style={styles.formularioExtra}>
                <Text style={styles.labelForm}>¿Qué falta comprar?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Bolsas de hielo, Ron, Coca-Cola..."
                  placeholderTextColor="#999"
                  value={nombreCompra}
                  onChangeText={setNombreCompra}
                />

                <Text style={styles.labelForm}>Cantidad:</Text>
                <View style={styles.selectorCantidad}>
                  <TouchableOpacity style={styles.btnCant} onPress={() => setCantidadCompra(m => Math.max(1, m - 1))}>
                    <Minus size={20} color="#5B3281" />
                  </TouchableOpacity>
                  <Text style={styles.txtCantNum}>{cantidadCompra}</Text>
                  <TouchableOpacity style={styles.btnCant} onPress={() => setCantidadCompra(m => m + 1)}>
                    <Plus size={20} color="#5B3281" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.labelForm, { marginBottom: 0 }]}>¿Dónde se compra?</Text>
                  <TouchableOpacity onPress={() => setMostrandoAñadirTienda(!mostrandoAñadirTienda)}>
                    <Text style={{ color: '#5B3281', fontWeight: 'bold', fontSize: 13 }}>
                      {mostrandoAñadirTienda ? 'Cerrar Ajustes' : '⚙️ Gestionar Sitios'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {mostrandoAñadirTienda && (
                  <View style={styles.cajaGestionTiendas}>
                    <View style={styles.miniFormTienda}>
                      <TextInput
                        style={styles.miniInput}
                        placeholder="Nuevo sitio (Ej: Lupa)"
                        placeholderTextColor="#999"
                        value={nuevaTiendaNombre}
                        onChangeText={setNuevaTiendaNombre}
                      />
                      <TouchableOpacity style={styles.btnMiniGuardar} onPress={registrarNuevaTienda}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Añadir</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 12, color: '#8E8E93', fontWeight: '700', marginBottom: 4 }}>Sitios activos:</Text>
                    {tiendas.map(t => (
                      <View key={t.id} style={styles.filaBorrarTienda}>
                        <Text style={{ color: '#1C1C1E', fontSize: 14, fontWeight: '500' }}>{t.nombre}</Text>
                        <TouchableOpacity style={{ padding: 4 }} onPress={() => eliminarTienda(t.id, t.nombre)}>
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.contenedorFilaTiendas}>
                  {tiendas.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.btnTiendaDinamica, lugarCompra === t.nombre && styles.btnTiendaActivo]}
                      onPress={() => setLugarCompra(t.nombre)}
                    >
                      <Text style={{ color: lugarCompra === t.nombre ? '#fff' : '#555', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                        {t.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.btnAñadirExtra} onPress={añadirALaCompra}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Apuntar en la Lista</Text>
                </TouchableOpacity>
              </View>

              {Object.keys(generarListaCompraAgrupada()).length === 0 ? (
                <Text style={styles.txtVacio}>No hay nada apuntado. ¡A disfrutar del local!</Text>
              ) : (
                Object.entries(generarListaCompraAgrupada()).map(([tienda, items]) => (
                  <View key={tienda} style={styles.bloqueTienda}>
                    <Text style={styles.tituloTienda}>🛒 En el {tienda}:</Text>
                    {items.map(item => (
                      <View key={item.id} style={styles.itemCompra}>
                        <Text style={styles.txtItemCompra}>• {item.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <TouchableOpacity onPress={() => procesarCompraCompletada(item.id, item.nombre)}>
                            <CheckSquare size={22} color="#34C759" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => eliminarExtraSinSumar(item.id)}>
                            <Trash2 size={18} color="#ef4444" />
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

          {/* 🔥 NUEVA PESTAÑA 4: GESTIÓN DE ARTÍCULOS */}
          {pestanaActual === 'gestion' && (
            <ScrollView style={styles.listaContenido}>
              <View style={styles.formularioExtra}>
                <Text style={[styles.tituloTienda, { marginBottom: 12 }]}>Añadir Nuevo Artículo al Inventario</Text>

                <Text style={styles.labelForm}>Nombre del Producto:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Fanta Naranja 2L, Ron Dyc..."
                  placeholderTextColor="#999"
                  value={nuevoProdNombre}
                  onChangeText={setNuevoProdNombre}
                />

                <Text style={styles.labelForm}>Categoría:</Text>
                <View style={styles.contenedorFilaTiendas}>
                  {CATEGORIAS_FORM.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.btnTiendaDinamica, nuevoProdCategoria === cat && styles.btnTiendaActivo]}
                      onPress={() => setNuevoProdCategoria(cat)}
                    >
                      <Text style={{ color: nuevoProdCategoria === cat ? '#fff' : '#555', fontSize: 12, fontWeight: '600' }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.labelForm}>Stock Mínimo (Aviso de alerta):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 2"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={nuevoProdMinimo}
                  onChangeText={setNuevoProdMinimo}
                />

                <TouchableOpacity style={[styles.btnAñadirExtra, { backgroundColor: '#34C759', marginTop: 8 }]} onPress={registrarNuevoProductoInventario}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Registrar en Base de Datos</Text>
                </TouchableOpacity>
              </View>

              {/* Lista para poder purgar artículos viejos */}
              <View style={styles.bloqueTienda}>
                <Text style={styles.tituloTienda}>Eliminar Artículos Existentes</Text>
                <Text style={{ fontSize: 12, color: '#8E8E93', marginBottom: 10 }}>Cuidado: si borras un producto aquí, desaparecerá de la alacena y del recuento.</Text>
                {productos.map(p => (
                  <View key={p.id} style={styles.itemCompra}>
                    <View>
                      <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '600' }}>{p.nombre}</Text>
                      <Text style={{ color: '#8E8E93', fontSize: 11 }}>{p.categoria} • Mín: {p.stock_minimo}</Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarProductoInventario(p.id, p.nombre)}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

        </View>
      )}

      {/* MENÚ INFERIOR (Ahora con 4 botones) */}
      <View style={[styles.menuInferior, { paddingBottom: insets.bottom, height: 65 + insets.bottom }]}>
        <TouchableOpacity style={styles.btnTab} onPress={() => setPestanaActual('visual')}>
          <Eye size={22} color={pestanaActual === 'visual' ? '#5B3281' : '#8E8E93'} />
          <Text style={[styles.txtTab, pestanaActual === 'visual' && styles.txtTabActivo]}>Alacena</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnTab} onPress={() => setPestanaActual('recuento')}>
          <ClipboardList size={22} color={pestanaActual === 'recuento' ? '#5B3281' : '#8E8E93'} />
          <Text style={[styles.txtTab, pestanaActual === 'recuento' && styles.txtTabActivo]}>Recuento</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnTab} onPress={() => setPestanaActual('compra')}>
          <ShoppingCart size={22} color={pestanaActual === 'compra' ? '#5B3281' : '#8E8E93'} />
          <Text style={[styles.txtTab, pestanaActual === 'compra' && styles.txtTabActivo]}>Compra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnTab} onPress={() => setPestanaActual('gestion')}>
          <Settings size={22} color={pestanaActual === 'gestion' ? '#5B3281' : '#8E8E93'} />
          <Text style={[styles.txtTab, pestanaActual === 'gestion' && styles.txtTabActivo]}>Gestión</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  contenedorPrincipal: { flex: 1, backgroundColor: '#F4F4F6' },
  cabecera: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#5B3281', borderBottomWidth: 1, borderColor: '#4A256B' },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  subtitulo: { fontSize: 11, color: '#E2D5EE', fontWeight: '800', letterSpacing: 1.5, marginTop: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  contenedorFiltros: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#E5E5EA' },
  botonFiltro: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E5EA', marginRight: 8 },
  botonFiltroActivo: { backgroundColor: '#5B3281' },
  textoFiltro: { color: '#555', fontWeight: '600', fontSize: 13 },
  textoFiltroActivo: { color: '#fff' },
  listaContenido: { padding: 16 },
  tarjeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 18, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tarjetaAlerta: { backgroundColor: '#FDF2F2', borderWidth: 1, borderColor: '#F8B4B4' },
  prodNombre: { fontSize: 17, fontWeight: 'bold', color: '#1C1C1E' },
  prodSub: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  txtStock: { fontSize: 22, fontWeight: 'bold', color: '#34C759' },
  txtStockAlerta: { color: '#FF3B30' },

  tarjetaRecuento: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  prodNombreRecuento: { fontSize: 16, color: '#1C1C1E', fontWeight: '500', flex: 1 },
  controlesRecuento: { flexDirection: 'row', alignItems: 'center' },
  btnMenos: { backgroundColor: '#E5E5EA', width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnMas: { backgroundColor: '#5B3281', width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnTexto: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  txtStockTemp: { color: '#1C1C1E', fontSize: 20, fontWeight: 'bold', marginHorizontal: 18, minWidth: 25, textAlign: 'center' },
  btnGuardar: { backgroundColor: '#5B3281', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  txtGuardar: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  formularioExtra: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  labelForm: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#F4F4F6', color: '#1C1C1E', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 14 },
  selectorCantidad: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  btnCant: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center' },
  txtCantNum: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginHorizontal: 20, minWidth: 20, textAlign: 'center' },

  contenedorFilaTiendas: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  btnTiendaDinamica: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, minWidth: '22%', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  btnTiendaActivo: { backgroundColor: '#5B3281' },

  cajaGestionTiendas: { backgroundColor: '#F4F4F6', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#E5E5EA' },
  miniFormTienda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 6, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  miniInput: { flex: 1, color: '#1C1C1E', fontSize: 13, paddingVertical: 4, paddingHorizontal: 6 },
  btnMiniGuardar: { backgroundColor: '#5B3281', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  filaBorrarTienda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 4 },

  btnAñadirExtra: { backgroundColor: '#5B3281', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  bloqueTienda: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tituloTienda: { color: '#5B3281', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  itemCompra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E5E5EA' },
  txtItemCompra: { color: '#1C1C1E', fontSize: 15, fontWeight: '500' },
  txtVacio: { color: '#8E8E93', textAlign: 'center', marginTop: 30, fontSize: 14 },

  menuInferior: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', paddingTop: 8 },
  btnTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  txtTab: { color: '#8E8E93', fontSize: 11, fontWeight: '600', marginTop: 4 },
  txtTabActivo: { color: '#5B3281' }
});
