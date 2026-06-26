import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, StatusBar, Alert, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './supabase';
// Sumamos LogOut y Flame para el botón de salida y el contador de racha
import { Eye, ClipboardList, ShoppingCart, Settings, Plus, Minus, CheckSquare, Trash2, SlidersHorizontal, Save, Gamepad, Dices, Trophy, AlertTriangle, RefreshCw, Layers, LogOut, Flame } from 'lucide-react-native';

const CATEGORIAS = ['Todos', 'Bebidas', 'Mezcla', 'Limpieza', 'Otros'];
const CATEGORIAS_FORM = ['Bebidas', 'Mezcla', 'Limpieza', 'Otros'];

// Componente de Carta Rediseñado (Más Premium y con sombra suave)
function RenderizarCarta({ nombre, palo, oculta }) {
  if (oculta) {
    return (
      <View style={styles.cartaEstilo}>
        <Image
          source={require('./assets/Javicristo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const esRojo = palo === '♦' || palo === '♥';
  return (
    <View style={styles.cartaEstilo}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <Text style={[styles.textoCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{nombre}</Text>
        <Text style={[styles.paloCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      </View>
      <Text style={[styles.paloCartaCentral, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', transform: [{ rotate: '180deg' }] }}>
        <Text style={[styles.textoCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{nombre}</Text>
        <Text style={[styles.paloCartaEsquina, { color: esRojo ? '#EF4444' : '#1C1C1E' }]}>{palo}</Text>
      </View>
    </View>
  );
}

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

  // Estados de la pestaña GESTIÓN
  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoProdCategoria, setNuevoProdCategoria] = useState('Bebidas');
  const [nuevoProdMinimo, setNuevoProdMinimo] = useState('2');

  // ==========================================
  //         ESTADOS DEL BLACKJACK
  // ==========================================
  const [enPartida, setEnPartida] = useState(false);
  const [repartiendo, setRepartiendo] = useState(false);
  const [baraja, setBaraja] = useState([]);
  const [manoJugador, setManoJugador] = useState([]);
  const [manoCrupier, setManoCrupier] = useState([]);
  const [resultadoTipo, setResultadoTipo] = useState('');
  const [mensajeResultado, setMensajeResultado] = useState('');
  const [verTapete, setVerTapete] = useState(false); // Para controlar si estamos en el lobby o jugando

  // Contadores de rachas en memoria de la sesión
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaMaxima, setRachaMaxima] = useState(0);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: prodData, error: prodError } = await supabase.from('productos').select('*').order('nombre', { ascending: true });
      if (prodError) throw prodError;
      setProductos(prodData);

      const temp = {};
      prodData.forEach(p => { temp[p.id] = p.stock_actual; });
      setStockTemporal(temp);

      const { data: extData, error: extError } = await supabase.from('extras_compra').select('*').eq('comprado', false).order('created_at', { ascending: false });
      if (extError) throw extError;
      setExtras(extData);

      const { data: tienData, error: tienError } = await supabase.from('tiendas').select('*').order('nombre', { ascending: true });
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

  const modificarStockTemporal = (id, cambio) => {
    setStockTemporal(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + cambio) }));
  };

  const guardarRecuento = async () => {
    try {
      setCargando(true);
      for (const id of Object.keys(stockTemporal)) {
        await supabase.from('productos').update({ stock_actual: stockTemporal[id] }).eq('id', id);
      }
      await cargarDatos();
      setPestanaActual('visual');
      Alert.alert('Éxito', '¡Recuento guardado en La Bodeguilla!');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el recuento');
    } finally {
      setCargando(false);
    }
  };

  const añadirALaCompra = async () => {
    if (!nombreCompra.trim()) {
      Alert.alert('Aviso', 'Pon el nombre de lo que hay que comprar, melón.');
      return;
    }
    try {
      const itemFormateado = `${nombreCompra.trim()} (x${cantidadCompra})`;
      const { error } = await supabase.from('extras_compra').insert([{ nombre: itemFormateado, lugar_compra: lugarCompra }]);
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
      const { error } = await supabase.from('tiendas').insert([{ nombre: nombreLimpio }]);
      if (error) {
        if (error.code === '23505') Alert.alert('Aviso', 'Ese sitio ya está en la lista.');
        else throw error;
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
      const { error } = await supabase.from('tiendas').delete() .eq('id', id);
      if (error) throw error;
      if (lugarCompra === nombre) {
        setLugarCompra(tiendas.length > 1 ? tiendas.find(t => t.id !== id).nombre : '');
      }
      await cargarDatos();
      Alert.alert('Eliminado', `Sitio "${nombre}" quitado de la lista.`);
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
      const productoExistente = productos.find(p => p.nombre.toLowerCase().trim() === nombreReal.toLowerCase());
      if (productoExistente) {
        const nuevoStock = productoExistente.stock_actual + cantidadASumar;
        await supabase.from('productos').update({ stock_actual: nuevoStock }).eq('id', productoExistente.id);
      }
      await supabase.from('extras_compra').update({ comprado: true }).eq('id', id);
      await cargarDatos();
      if (productoExistente) Alert.alert('Comprado', `Suman ${cantidadASumar} unidades a "${productoExistente.nombre}".`);
      else Alert.alert('Comprado', `Quitado de la lista.`);
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

  const registrarNuevoProductoInventario = async () => {
    if (!nuevoProdNombre.trim()) {
      Alert.alert('Falta campo', 'Escribe el nombre del artículo.');
      return;
    }
    const minimoNumerico = parseInt(nuevoProdMinimo, 10);
    if (isNaN(minimoNumerico) || minimoNumerico < 0) {
      Alert.alert('Falta campo', 'El stock mínimo debe ser un número.');
      return;
    }
    try {
      setCargando(true);
      const { error } = await supabase.from('productos').insert([{ nombre: nuevoProdNombre.trim(), categoria: nuevoProdCategoria, stock_minimo: minimoNumerico, stock_actual: 0 }]);
      if (error) {
        if (error.code === '23505') Alert.alert('Aviso', 'Ese producto ya existe en la Alacena.');
        else throw error;
      } else {
        Alert.alert('Registrado', `"${nuevoProdNombre.trim()}" añadido correctamente.`);
        setNuevoProdNombre('');
        setNuevoProdMinimo('2');
        await cargarDatos();
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarProductoInventario = async (id, nombre) => {
    try {
      setCargando(true);
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      await cargarDatos();
      Alert.alert('Eliminado', `"${nombre}" borrado.`);
    } catch (error) {
      console.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  //      LÓGICA DEL BLACKJACK PERFECCIONADA
  // ==========================================
  const inicializarBaraja = () => {
    const palos = ['♦', '♣', '♥', '♠'];
    const valores = [
      { nombre: 'A', valor: 11 }, { nombre: '2', valor: 2 }, { nombre: '3', valor: 3 },
      { nombre: '4', valor: 4 }, { nombre: '5', valor: 5 }, { nombre: '6', valor: 6 },
      { nombre: '7', valor: 7 }, { nombre: '8', valor: 8 }, { nombre: '9', valor: 9 },
      { nombre: '10', valor: 10 }, { nombre: 'J', valor: 10 }, { nombre: 'Q', valor: 10 }, { nombre: 'K', valor: 10 },
    ];
    let mazo = [];
    for (let p of palos) { for (let v of valores) { mazo.push({ ...v, palo: p }); } }
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    return mazo;
  };

  const calcularPuntos = (mano) => {
    let puntos = mano.reduce((tot, c) => tot + c.valor, 0);
    let ases = mano.filter(c => c.nombre === 'A').length;
    while (puntos > 21 && ases > 0) { puntos -= 10; ases -= 1; }
    return puntos;
  };

  const actualizarRacha = (resultado) => {
    if (resultado === 'ganado') {
      setRachaActual(prev => {
        const nuevaRacha = prev + 1;
        if (nuevaRacha > rachaMaxima) {
          setRachaMaxima(nuevaRacha);
        }
        return nuevaRacha;
      });
    } else if (resultado === 'perdido') {
      setRachaActual(0);
    }
  };

  const iniciarPartidaBlackjack = () => {
    setVerTapete(true);
    setEnPartida(false);
    setRepartiendo(true);
    setResultadoTipo('');
    setMensajeResultado('');

    const mazoNuevo = inicializarBaraja();
    const cJ1 = mazoNuevo.pop();
    const cC1 = mazoNuevo.pop();
    const cJ2 = mazoNuevo.pop();
    const cC2 = mazoNuevo.pop();

    setManoJugador([cJ1]);
    setManoCrupier([cC1]);
    setBaraja(mazoNuevo);

    setTimeout(() => {
      setManoJugador([cJ1, cJ2]);
    }, 400);

    setTimeout(() => {
      const manoInicialJugador = [cJ1, cJ2];
      const manoInicialCrupier = [cC1, cC2];

      setManoCrupier(manoInicialCrupier);
      setRepartiendo(false);

      const puntosJ = calcularPuntos(manoInicialJugador);
      const puntosC = calcularPuntos(manoInicialCrupier);

      if (puntosJ === 21 || puntosC === 21) {
        setEnPartida(false);

        if (puntosJ === 21 && puntosC === 21) {
          setResultadoTipo('empate');
          setMensajeResultado('🤝 ¡Doble Blackjack Natural! Empate histórico.');
          actualizarRacha('empate');
        } else if (puntosJ === 21) {
          setResultadoTipo('ganado');
          setMensajeResultado('🎉 ¡BLACKJACK NATURAL! Ganas la mano al instante.');
          actualizarRacha('ganado');
        } else {
          setResultadoTipo('perdido');
          setMensajeResultado('❌ ¡Blackjack de la casa! El crupier gana de inicio.');
          actualizarRacha('perdido');
        }
      } else {
        setEnPartida(true);
      }
    }, 800);
  };

  const pedirCarta = () => {
    if (!enPartida || repartiendo) return;

    const mazoCopia = [...baraja];
    const nuevaCarta = mazoCopia.pop();
    const nuevaMano = [...manoJugador, nuevaCarta];

    setManoJugador(nuevaMano);
    setBaraja(mazoCopia);

    if (calcularPuntos(nuevaMano) > 21) {
      setResultadoTipo('perdido');
      setMensajeResultado('¡Te has pasado del límite! Gana la casa.');
      setEnPartida(false);
      actualizarRacha('perdido');
    }
  };

  const plantarse = () => {
    if (!enPartida || repartiendo) return;

    let mazoCopia = [...baraja];
    let manoC = [...manoCrupier];

    const ejecutarTurnoCrupier = () => {
      let puntosJ = calcularPuntos(manoJugador);
      let puntosC = calcularPuntos(manoC);

      // 🛠️ IA ARREGLADA CON AS DINÁMICO: Pide si tiene menos de 17, o si va por detrás de tus puntos y no se ha pasado
      if (puntosC < 17 || (puntosC < puntosJ && puntosC <= 21)) {
        const nuevaCarta = mazoCopia.pop();
        manoC.push(nuevaCarta);
        setManoCrupier([...manoC]);
        setBaraja(mazoCopia);
        setTimeout(ejecutarTurnoCrupier, 600);
      } else {
        setEnPartida(false);
        let finalRes = '';
        if (puntosC > 21) {
          finalRes = 'ganado';
          setMensajeResultado('¡El crupier se ha pasado! ¡Victoria para ti!');
        } else if (puntosJ > puntosC) {
          finalRes = 'ganado';
          setMensajeResultado('¡Tienes mayor puntuación! ¡Has ganado!');
        } else if (puntosC > puntosJ) {
          finalRes = 'perdido';
          setMensajeResultado('El crupier tiene mejor mano. Gana la casa.');
        } else {
          finalRes = 'empate';
          setMensajeResultado('Tablas. Empate técnico en la mesa.');
        }
        setResultadoTipo(finalRes);
        actualizarRacha(finalRes);
      }
    };

    ejecutarTurnoCrupier();
  };

  const generarListaCompraAgrupada = () => {
    const list = {};
    extras.forEach(e => { const t = e.lugar_compra || 'Mercadona'; if (!list[t]) list[t] = []; list[t].push(e); });
    return list;
  };

  const productosFiltrados = categoriaSeleccionada === 'Todos' ? productos : productos.filter(p => p.categoria === categoriaSeleccionada);

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

          {/* PESTAÑA 1: INVENTARIO VISUAL */}
          {pestanaActual === 'visual' && (
            <View style={{ flex: 1 }}>
              <View style={styles.contenedorFiltros}>
                <FlatList
                  data={CATEGORIAS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.botonFiltro, categoriaSeleccionada === item && styles.botonFiltroActivo]} onPress={() => setCategoriaSeleccionada(item)}>
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
                        <Text style={styles.prodSub}>{item.categoria} • MÍNIMO: {item.stock_minimo}</Text>
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
                        <Minus color="#555" size={18} />
                      </TouchableOpacity>
                      <Text style={styles.txtStockTemp}>{stockTemporal[item.id] ?? 0}</Text>
                      <TouchableOpacity style={styles.btnMas} onPress={() => modificarStockTemporal(item.id, 1)}>
                        <Plus color="#fff" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarRecuento}>
                <Text style={styles.txtGuardar}>CONFIRMAR RECUENTO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PESTAÑA 3: COMPRA */}
          {pestanaActual === 'compra' && (
            <ScrollView style={styles.listaContenido}>
              <View style={styles.formularioExtra}>
                <Text style={styles.labelForm}>¿Qué falta comprar?</Text>
                <TextInput style={styles.input} placeholder="Ej: Bolsas de hielo, Ron, Coca-Cola..." placeholderTextColor="#999" value={nombreCompra} onChangeText={setNombreCompra} />
                <Text style={styles.labelForm}>Cantidad:</Text>
                <View style={styles.selectorCantidad}>
                  <TouchableOpacity style={styles.btnCant} onPress={() => setCantidadCompra(m => Math.max(1, m - 1))}>
                    <Minus color="#5B3281" size={20} />
                  </TouchableOpacity>
                  <Text style={styles.txtCantNum}>{cantidadCompra}</Text>
                  <TouchableOpacity style={styles.btnCant} onPress={() => setCantidadCompra(m => m + 1)}>
                    <Plus color="#5B3281" size={20} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.labelForm, { marginBottom: 0 }]}>¿Dónde se compra?</Text>
                  <TouchableOpacity onPress={() => setMostrandoAñadirTienda(!mostrandoAñadirTienda)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <SlidersHorizontal color="#5B3281" size={14} />
                    <Text style={{ color: '#5B3281', fontWeight: 'bold', fontSize: 13 }}>Config. Sitios</Text>
                  </TouchableOpacity>
                </View>
                {mostrandoAñadirTienda && (
                  <View style={styles.cajaGestionTiendas}>
                    <View style={styles.miniFormTienda}>
                      <TextInput style={styles.miniInput} placeholder="Nuevo sitio (Ej: Lupa)" placeholderTextColor="#999" value={nuevaTiendaNombre} onChangeText={setNuevaTiendaNombre} />
                      <TouchableOpacity style={styles.btnMiniGuardar} onPress={registrarNuevaTienda}><Save color="#fff" size={14} /></TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#8E8E93', fontWeight: '700', marginBottom: 4 }}>SITIOS ACTIVOS:</Text>
                    {tiendas.map(t => (
                      <View key={t.id} style={styles.filaBorrarTienda}>
                        <Text style={{ color: '#1C1C1E', fontSize: 14, fontWeight: '500' }}>{t.nombre}</Text>
                        <TouchableOpacity style={{ padding: 4 }} onPress={() => eliminarTienda(t.id, t.nombre)}><Trash2 color="#ef4444" size={14} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.contenedorFilaTiendas}>
                  {tiendas.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.btnTiendaDinamica, lugarCompra === t.nombre && styles.btnTiendaActivo]} onPress={() => setLugarCompra(t.nombre)}>
                      <Text style={{ color: lugarCompra === t.nombre ? '#fff' : '#555', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{t.nombre.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.btnAñadirExtra} onPress={añadirALaCompra}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>APUNTAR EN LA LISTA</Text></TouchableOpacity>
              </View>
              {Object.keys(generarListaCompraAgrupada()).length === 0 ? (
                <Text style={styles.txtVacio}>No hay nada apuntado. ¡A disfrutar del local!</Text>
              ) : (
                Object.entries(generarListaCompraAgrupada()).map(([tienda, items]) => (
                  <View key={tienda} style={styles.bloqueTienda}>
                    <Text style={styles.tituloTienda}>🛒 COMPRAR EN: {tienda.toUpperCase()}</Text>
                    {items.map(item => (
                      <View key={item.id} style={styles.itemCompra}>
                        <Text style={styles.txtItemCompra}>• {item.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <TouchableOpacity onPress={() => procesarCompraCompletada(item.id, item.nombre)}><CheckSquare color="#34C759" size={20} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => eliminarExtraSinSumar(item.id)}><Trash2 color="#ef4444" size={18} /></TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* PESTAÑA 4: GESTIÓN DE ARTÍCULOS */}
          {pestanaActual === 'gestion' && (
            <ScrollView style={styles.listaContenido}>
              <View style={styles.formularioExtra}>
                <Text style={[styles.tituloTienda, { marginBottom: 12 }]}>AÑADIR NUEVO ARTÍCULO</Text>
                <Text style={styles.labelForm}>Nombre del Producto:</Text>
                <TextInput style={styles.input} placeholder="Ej: Fanta Naranja 2L, Ron Dyc..." placeholderTextColor="#999" value={nuevoProdNombre} onChangeText={setNuevoProdNombre} />
                <Text style={styles.labelForm}>Categoría:</Text>
                <View style={styles.contenedorFilaTiendas}>
                  {CATEGORIAS_FORM.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.btnTiendaDinamica, nuevoProdCategoria === cat && styles.btnTiendaActivo]} onPress={() => setNuevoProdCategoria(cat)}>
                      <Text style={{ color: nuevoProdCategoria === cat ? '#fff' : '#555', fontSize: 12, fontWeight: '600' }}>{cat.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.labelForm}>Stock Mínimo:</Text>
                <TextInput style={styles.input} placeholder="Ej: 2" placeholderTextColor="#999" keyboardType="numeric" value={nuevoProdMinimo} onChangeText={setNuevoProdMinimo} />
                <TouchableOpacity style={[styles.btnAñadirExtra, { backgroundColor: '#34C759', marginTop: 8 }]} onPress={registrarNuevoProductoInventario}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>REGISTRAR</Text></TouchableOpacity>
              </View>
              <View style={styles.bloqueTienda}>
                <Text style={styles.tituloTienda}>ELIMINAR ARTÍCULOS EXISTENTES</Text>
                {productos.map(p => (
                  <View key={p.id} style={styles.itemCompra}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '600' }}>{p.nombre}</Text>
                      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>{p.categoria} • Mín: {p.stock_minimo}</Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarProductoInventario(p.id, p.nombre)}><Trash2 color="#ef4444" size= {16} /></TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* PESTAÑA 5: CASINO - MENÚ GENERAL Y JUEGOS */}
          {pestanaActual === 'blackjack' && (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 12 }}>
              <View style={styles.tableroCasinoPremium}>

                <View style={styles.cabeceraCasinoMesa}>
                  <Dices size={20} color="#fff" />
                  <Text style={styles.txtMesaPremiumTitulo}>CASINO LA BODEGUILLA</Text>
                  <Gamepad size={18} color="#E2D5EE" />
                </View>

                {!verTapete ? (
                  <View style={styles.lobbyCasinoCaja}>
                    <View style={{ width: '100%', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 16, backgroundColor: '#F4F4F6', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Layers size={22} color="#5B3281" />
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' }}>BLACK JACK</Text>
                      </View>

                      <View style={styles.cajaEstadisticasRachas}>
                        <View style={styles.filaRachaStat}>
                          <Flame size={15} color="#EAB308" />
                          <Text style={styles.txtRachaStatLabel}>Racha Actual:</Text>
                          <Text style={styles.txtRachaStatValor}>{rachaActual}</Text>
                        </View>
                        <View style={styles.filaRachaStat}>
                          <Trophy size={13} color="#34C759" />
                          <Text style={styles.txtRachaStatLabel}>Racha Máxima:</Text>
                          <Text style={styles.txtRachaStatValor}>{rachaMaxima}</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 14 }}>
                        Juega contra la casa. La banca pide con menos de 17 puntos.
                      </Text>

                      <TouchableOpacity style={styles.btnIniciarJuegoPremium} onPress={iniciarPartidaBlackjack}>
                        <Text style={styles.txtBtnJuegoText}>JUGAR AHORA</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ width: '100%', padding: 14 }}>
                    <View style={styles.zonaJugadorFila}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                        <Text style={styles.txtMarcadorEtiqueta}>CRUPIER BANCA</Text>
                        <View style={styles.badgePuntos}><Text style={styles.txtBadgePuntosText}>{!enPartida && !repartiendo ? `${calcularPuntos(manoCrupier)} PTS` : '???'}</Text></View>
                      </View>
                      <View style={styles.filaCartasContenedor}>
                        {manoCrupier.map((carta, index) => (
                          <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={enPartida && index === 1} />
                        ))}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 4 }}>
                      <View style={[styles.lineaMesaSeparador, { width: '30%', marginVertical: 0 }]} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(91,50,129,0.4)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 }}>
                        <Flame size={12} color="#EAB308" />
                        <Text style={{ color: '#E2D5EE', fontSize: 10, fontWeight: '900' }}>RACHA: {rachaActual}</Text>
                      </View>
                      <View style={[styles.lineaMesaSeparador, { width: '30%', marginVertical: 0 }]} />
                    </View>

                    <View style={styles.zonaJugadorFila}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                        <Text style={styles.txtMarcadorEtiqueta}>TU MANO</Text>
                        <View style={[styles.badgePuntos, { backgroundColor: '#5B3281' }]}><Text style={styles.txtBadgePuntosText}>{calcularPuntos(manoJugador)} PTS</Text></View>
                      </View>
                      <View style={styles.filaCartasContenedor}>
                        {manoJugador.map((carta, index) => (
                          <RenderizarCarta key={index} nombre={carta.nombre} palo={carta.palo} oculta={false} />
                        ))}
                      </View>
                    </View>

                    {mensajeResultado ? (
                      <View style={[
                        styles.bannerResultadoFino,
                        resultadoTipo === 'ganado' && { backgroundColor: '#DEF7EC', borderColor: '#34C759' },
                        resultadoTipo === 'perdido' && { backgroundColor: '#FDE8E8', borderColor: '#FF3B30' },
                        resultadoTipo === 'empate' && { backgroundColor: '#FEF08A', borderColor: '#EAB308' }
                      ]}>
                        {resultadoTipo === 'ganado' && <Trophy size={20} color="#34C759" style={{ marginRight: 8 }} />}
                        {resultadoTipo === 'perdido' && <AlertTriangle size={20} color="#FF3B30" style={{ marginRight: 8 }} />}
                        {resultadoTipo === 'empate' && <RefreshCw size={18} color="#EAB308" style={{ marginRight: 8 }} />}
                        <Text style={[
                          styles.txtBannerResultadoText,
                          resultadoTipo === 'ganado' && { color: '#1E4620' },
                          resultadoTipo === 'perdido' && { color: '#6B1D1D' },
                          resultadoTipo === 'empate' && { color: '#713F12' }
                        ]}>{mensajeResultado}</Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                      {enPartida ? (
                        <>
                          <TouchableOpacity disabled={repartiendo} style={[styles.btnCasinoAccionSecundario, repartiendo && { opacity: 0.5 }]} onPress={pedirCarta}>
                            <Text style={styles.txtBtnAccionSecundarioText}>PEDIR CARTA</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={repartiendo} style={[styles.btnCasinoAccionPrincipal, repartiendo && { opacity: 0.5 }]} onPress={plantarse}>
                            <Text style={styles.txtBtnAccionPrincipalText}>PLANTARSE</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity style={styles.btnOtraPartidaVerde} onPress={iniciarPartidaBlackjack}>
                            <Text style={styles.txtBtnOtraPartidaText}>NUEVA MANO</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={repartiendo} style={styles.btnSalirAlLobby} onPress={() => setVerTapete(false)}>
                            <LogOut size={16} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.txtBtnSalirLobbyText}>ABANDONAR MESA</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                  </View>
                )}

              </View>
            </ScrollView>
          )}

        </View>
      )}

      {/* BARRA INFERIOR DE PESTAÑAS */}
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

        <TouchableOpacity style={styles.btnTab} onPress={() => setPestanaActual('blackjack')}>
          <Gamepad size={22} color={pestanaActual === 'blackjack' ? '#5B3281' : '#8E8E93'} />
          <Text style={[styles.txtTab, pestanaActual === 'blackjack' && styles.txtTabActivo]}>Casino</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

export default function App() { return (<SafeAreaProvider><ContenidoApp /></SafeAreaProvider>); }

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
  txtStock: { fontSize: 22, fontWeight: 'bold', color: '#34C759', minWidth: 30, textAlign: 'center' },
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
  btnMiniGuardar: { backgroundColor: '#5B3281', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
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
  txtTabActivo: { color: '#5B3281' },

  tableroCasinoPremium: { backgroundColor: '#1E3A1E', borderRadius: 16, borderWidth: 3, borderColor: '#451A60', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5, width: '100%', overflow: 'hidden' },
  cabeceraCasinoMesa: { flexDirection: 'row', backgroundColor: '#451A60', width: '100%', padding: 12, alignItems: 'center', justifyContent: 'space-between' },
  txtMesaPremiumTitulo: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },

  lobbyCasinoCaja: { padding: 20, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: '#fff', gap: 14 },
  lobbyCasinoTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginTop: 4 },
  lobbyCasinoSub: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 2, marginBottom: 4, lineHeight: 16 },
  btnIniciarJuegoPremium: { backgroundColor: '#5B3281', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  txtBtnJuegoText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  cajaEstadisticasRachas: { backgroundColor: '#ffffff', width: '90%', borderRadius: 8, padding: 8, marginVertical: 6, borderWidth: 1, borderColor: '#E5E5EA', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
  filaRachaStat: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 4 },
  txtRachaStatLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#555', marginLeft: 6 },
  txtRachaStatValor: { fontSize: 14, fontWeight: '900', color: '#1C1C1E' },

  zonaJugadorFila: { width: '100%', paddingVertical: 8, alignItems: 'center' },
  txtMarcadorEtiqueta: { color: '#E2D5EE', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  badgePuntos: { backgroundColor: '#3A6B3A', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  txtBadgePuntosText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  filaCartasContenedor: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 85, alignItems: 'center', width: '100%', marginTop: 6 },
  lineaMesaSeparador: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', width: '90%', alignSelf: 'center', marginVertical: 4, borderStyle: 'dashed', borderRadius: 1 },

  cartaEstilo: { backgroundColor: '#fff', width: 56, height: 84, borderRadius: 6, justifyContent: 'space-between', padding: 5, marginHorizontal: 4, marginVertical: 4, borderWidth: 1, borderColor: '#BBB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3 },
  textoCartaEsquina: { fontSize: 13, fontWeight: '900', lineHeight: 13 },
  paloCartaEsquina: { fontSize: 11, lineHeight: 11, marginTop: 1 },
  paloCartaCentral: { fontSize: 24, textAlign: 'center', alignSelf: 'center', marginVertical: -4 },

  bannerResultadoFino: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, marginVertical: 10, width: '100%' },
  txtBannerResultadoText: { fontSize: 14, fontWeight: '800', textAlign: 'center', flex: 1 },

  btnCasinoAccionSecundario: { backgroundColor: '#E5E5EA', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, flex: 1, alignItems: 'center', borderBottomWidth: 2, borderColor: '#CCC' },
  txtBtnAccionSecundarioText: { color: '#1C1C1E', fontWeight: '900', fontSize: 13 },
  btnCasinoAccionPrincipal: { backgroundColor: '#451A60', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, flex: 1, alignItems: 'center', borderBottomWidth: 2, borderColor: '#290E3B' },
  txtBtnAccionPrincipalText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  btnOtraPartidaVerde: { backgroundColor: '#10B981', paddingVertical: 14, width: '100%', borderRadius: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: '#059669' },
  txtBtnOtraPartidaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  btnSalirAlLobby: { flexDirection: 'row', backgroundColor: '#EF4444', paddingVertical: 12, width: '100%', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: '#DC2626' },
  txtBtnSalirLobbyText: { color: '#fff', fontWeight: '800', fontSize: 13 }
});
