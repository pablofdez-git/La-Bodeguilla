@AGENTS.md

# La Bodeguilla

App móvil (Expo / React Native, JavaScript sin TypeScript) para la peña "El Chungazo": stock de la bodega, lista de la compra, cuentas compartidas, calendario de eventos y un casino con monedas ficticias y ranking. Backend en Supabase. La usa solo el grupo, así que la seguridad (RLS, auth) no es prioritaria.

## Comandos

- `npx expo start` — arrancar en desarrollo (probar en Expo Go).
- `eas build -p android --profile preview` — generar la APK (`eas.json`).
- No hay tests ni linter configurados.
- Ojo: el proyecto está dentro de OneDrive y `npx expo export` puede fallar con `UNKNOWN: unknown error, read` al leer `node_modules`; es del entorno, no del código.

## Estructura

- `App.js` — pantalla principal con pestañas (visual, recuento, compra, gestión, casino) y modales de Cuentas y Eventos. Paleta de colores en la constante `C`.
- `useOfflineSync.js` — hook de datos de stock/compra/tiendas. Caché en AsyncStorage (`@bodega_cache`), cola offline (`@bodega_cola`) y NetInfo. Cada acción devuelve `'ok' | 'encolado' | 'error'`; `App.js` decide los avisos según ese valor. Los elementos creados sin red usan ids `local_…` y `encolarEn` fusiona las operaciones posteriores sobre ellos.
- `CuentasPena.js` — cuentas compartidas (sesiones de compra, gastos por integrante) con su propia cola offline y realtime de Supabase.
- `Eventos.js` — calendario de eventos (fechas en formato DD-MM-AAAA en el formulario, ISO en BD).
- `errores.js` — `avisarError(titulo, e)` (Alert + consola), `esErrorDeRed(e)`, `textoError(e)`. Usarlo para cualquier error que el usuario deba ver.
- `tema.js` — paleta `C` compartida por toda la app (también el casino) y `normalizar(texto)` para comparar nombres sin mayúsculas ni tildes.
- `feedback.js` + `Toast.js` — `mostrarToast(texto, 'exito'|'aviso'|'info')` para avisos de éxito no bloqueantes (los errores siguen siendo Alert) y `vibrar('exito'|'error'|'aviso'|'suave')` con expo-haptics. `<Toast />` se monta una vez en `App.js`.
- `supabase.js` — cliente de Supabase. `supabaseService.js` — jugadores y ranking del casino.
- `Casino.js` — perfil del jugador, monedas, rachas, bancarrotas, lobby, registro y ranking. Llama a los hooks de cada juego (`useBlackjack`, `useRuleta`, …) para que su estado viva en el componente padre.
- `casino/` — un archivo por juego (`Blackjack`, `Ruleta`, `Tragaperras`, `Dados`, `Rasca`, `War`), cada uno con su hook `useX(ctx)` y su componente de pantalla; `componentes.js` (piezas compartidas: `SelectorApuesta`, `CabeceraJuego`, `BannerResultado`, cartas, dado…), `estilos.js` y `datos.js` (textos de ayuda, símbolos, barajas).

## Convenciones

- Código, nombres y comentarios en español.
- Supabase no lanza excepciones: comprobar siempre `error` (`if (error) throw error;`) y capturar con `try/catch` + `avisarError`.
- En el casino, cambiar el saldo siempre con `actualizarMonedas(saldo)` (guarda en AsyncStorage `@bj_monedas`) y comprobar bancarrota con `verificarAuxilioBancarrota`.
- Tablas de Supabase: `productos`, `extras_compra`, `tiendas`, `integrantes`, `sesiones_compra`, `gastos`, `eventos`, `jugadores`.

## Rollback

El tag `backup-antes-refactor` (commit `150a464`) es el último estado anterior al refactor del casino y del sistema offline. Para volver: `git reset --hard backup-antes-refactor` (y `git push --force` si ya estaba subido).
