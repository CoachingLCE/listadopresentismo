import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Caché en memoria muy corta (5 segundos) de lecturas de pestañas.
 *
 * Por qué hace falta: CADA llamado a la API (aunque sea de solo lectura) primero
 * verifica la sesión leyendo la pestaña "Usuarios" completa — y una sola pantalla
 * suele disparar varios llamados en paralelo (por ejemplo, Cronograma CM carga
 * actividades + campañas + enlaces + notas de una). Eso multiplica las lecturas a
 * Google Sheets, que tiene un límite de lecturas por minuto — con varias personas
 * usando la app a la vez, se llega a superar ese límite y todo empieza a fallar con
 * "Quota exceeded".
 *
 * Con esta caché, si la MISMA pestaña se pide de nuevo dentro de los 5 segundos
 * (típico dentro de una misma ráfaga de llamados de una sola pantalla), se reusa el
 * resultado en vez de volver a golpear la API de Google. Se invalida sola apenas se
 * escribe algo en esa pestaña, así nunca se sirve un dato viejo después de un cambio.
 */
const TTL_CACHE_MS = 5000;
const cacheLecturas = new Map(); // tabName -> { datos, expira }

function leerDeCache(tabName) {
  const entrada = cacheLecturas.get(tabName);
  if (entrada && entrada.expira > Date.now()) return entrada.datos;
  return null;
}
function guardarEnCache(tabName, datos) {
  cacheLecturas.set(tabName, { datos, expira: Date.now() + TTL_CACHE_MS });
}
function invalidarCache(tabName) {
  cacheLecturas.delete(tabName);
}

function validarEntorno() {
  const faltantes = [];
  if (!process.env.GOOGLE_SHEET_ID) faltantes.push('GOOGLE_SHEET_ID');
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) faltantes.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!process.env.GOOGLE_PRIVATE_KEY) faltantes.push('GOOGLE_PRIVATE_KEY');
  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno en Vercel: ${faltantes.join(', ')}`);
  }
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
}

async function getSheetsClient() {
  validarEntorno();
  const auth = getAuth();
  try {
    await auth.authorize();
  } catch (err) {
    throw new Error(`No se pudo autenticar con Google (revisá GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY): ${err.message}`);
  }
  return google.sheets({ version: 'v4', auth });
}

/** Traduce errores crudos de la API de Sheets a mensajes entendibles. */
function traducirError(err, tabName) {
  const msg = err?.errors?.[0]?.message || err?.message || String(err);
  if (/Unable to parse range/i.test(msg) || /not found/i.test(msg)) {
    return new Error(`No existe la pestaña "${tabName}" en el Google Sheet (o el nombre no es exacto, mayúsculas incluidas). Revisá SETUP.md.`);
  }
  if (/PERMISSION_DENIED/i.test(msg) || /caller does not have permission/i.test(msg)) {
    return new Error(`La cuenta de servicio no tiene permiso sobre este Sheet. Compartilo como Editor con GOOGLE_SERVICE_ACCOUNT_EMAIL.`);
  }
  if (/Requested entity was not found/i.test(msg)) {
    return new Error(`No se encontró el Google Sheet — revisá que GOOGLE_SHEET_ID sea el correcto.`);
  }
  return new Error(`Error leyendo/escribiendo "${tabName}": ${msg}`);
}

/**
 * Lee una pestaña completa y la devuelve como array de objetos, usando la
 * primera fila como encabezados de columna. Cada objeto incluye _rowIndex
 * (número de fila real en la hoja, 1-indexed, para poder actualizarla después).
 */
export async function readSheet(tabName) {
  const cacheado = leerDeCache(tabName);
  if (cacheado) return cacheado;

  const sheets = await getSheetsClient();
  let res;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:Z10000`
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  const rows = res.data.values || [];
  if (rows.length === 0) { guardarEnCache(tabName, []); return []; }
  const headers = rows[0];
  const datos = rows.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 }; // +2: fila 1 es el encabezado, y es 1-indexed
    headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
    return obj;
  });
  guardarEnCache(tabName, datos);
  return datos;
}

/** Agrega una fila nueva al final de la pestaña. `valoresPorColumna` es un objeto {NombreColumna: valor}. */
export async function appendRow(tabName, valoresPorColumna) {
  const sheets = await getSheetsClient();
  let headerRes;
  try {
    headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:Z1`
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  const headers = (headerRes.data.values || [[]])[0];
  if (headers.length === 0) {
    throw new Error(`La pestaña "${tabName}" existe pero no tiene encabezados en la fila 1. Revisá SETUP.md.`);
  }
  const fila = headers.map((h) => valoresPorColumna[h] ?? '');
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] }
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  invalidarCache(tabName);
}

/** Actualiza una fila existente (por su _rowIndex) con los valores dados. */
export async function updateRow(tabName, rowIndex, valoresPorColumna) {
  const sheets = await getSheetsClient();
  let headerRes;
  try {
    headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:Z1`
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  const headers = (headerRes.data.values || [[]])[0];
  const fila = headers.map((h) => (h in valoresPorColumna ? valoresPorColumna[h] : ''));
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] }
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  invalidarCache(tabName);
}

/** Actualiza solo algunas columnas de una fila, dejando el resto intacto (lee antes de escribir). */
export async function patchRow(tabName, rowIndex, cambios) {
  const filas = await readSheet(tabName);
  const actual = filas.find((f) => f._rowIndex === rowIndex) || {};
  await updateRow(tabName, rowIndex, { ...actual, ...cambios });
}

/**
 * Agrega MUCHAS filas de una sola vez, en un único llamado a la API (en vez de uno por fila).
 * Fundamental para cargas masivas: Google Sheets tiene un límite de escrituras por minuto,
 * y escribir de a una fila por vez lo supera enseguida con listas de cientos de elementos.
 * `arrayValoresPorColumna` es un array de objetos {NombreColumna: valor}.
 */
/**
 * Vacía (deja en blanco) muchas filas de una sola vez, en un único llamado a la API.
 * Se usa para "borrar" varias filas juntas (Google Sheets vía API no borra filas
 * fácilmente sin reordenar todo lo de abajo, así que se vacía el contenido en su lugar).
 */
export async function clearRows(tabName, rowIndexes) {
  if (!rowIndexes || rowIndexes.length === 0) return;
  const sheets = await getSheetsClient();
  let headerRes;
  try {
    headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:Z1`
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  const headers = (headerRes.data.values || [[]])[0];
  const filaVacia = headers.map(() => '');
  const data = rowIndexes.map((rowIndex) => ({
    range: `${tabName}!A${rowIndex}:Z${rowIndex}`,
    values: [filaVacia]
  }));
  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data }
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  invalidarCache(tabName);
}

export async function appendRows(tabName, arrayValoresPorColumna) {
  if (!arrayValoresPorColumna || arrayValoresPorColumna.length === 0) return;
  const sheets = await getSheetsClient();
  let headerRes;
  try {
    headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:Z1`
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  const headers = (headerRes.data.values || [[]])[0];
  if (headers.length === 0) {
    throw new Error(`La pestaña "${tabName}" existe pero no tiene encabezados en la fila 1. Revisá SETUP.md.`);
  }
  const filas = arrayValoresPorColumna.map((valores) => headers.map((h) => valores[h] ?? ''));
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: filas }
    });
  } catch (err) {
    throw traducirError(err, tabName);
  }
  invalidarCache(tabName);
}
