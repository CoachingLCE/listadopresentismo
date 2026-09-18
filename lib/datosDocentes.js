import { readSheet, appendRow, patchRow } from './sheets';
import { DOCENTES_DEFAULT } from './docentesDefaults';

// Pestaña "Docentes" — columnas: Id, Nombre, Email, Cursos, Activo
export async function leerDocentesSheet() {
  const filas = await readSheet('Docentes');
  return filas
    .filter((f) => f.Nombre)
    .map((f) => ({
      id: f.Id || String(f._rowIndex),
      nombre: f.Nombre,
      email: (f.Email || '').trim().toLowerCase(),
      cursos: (f.Cursos || '').split(',').map((c) => c.trim()).filter(Boolean),
      activo: f.Activo !== 'FALSE',
      _rowIndex: f._rowIndex
    }));
}

/**
 * Docentes combinados: el roster fijo de DOCENTES_DEFAULT + lo que haya en el Sheet.
 * El Sheet manda si un mismo email aparece en los dos lados (por si se edita a mano
 * después) — mismo patrón que Docentes C.O. en Cronograma ILCE.
 */
export async function leerDocentesCombinados() {
  const delSheet = await leerDocentesSheet();
  const emailsSheet = new Set(delSheet.map((d) => d.email));
  const fijos = DOCENTES_DEFAULT
    .filter((d) => !emailsSheet.has(d.email.toLowerCase()))
    .map((d) => ({ id: `fijo-${d.email}`, nombre: d.nombre, email: d.email.toLowerCase(), cursos: d.cursos, activo: true, _rowIndex: null }));
  return [...fijos, ...delSheet].filter((d) => d.activo);
}

export async function agregarDocente({ nombre, email, cursos }) {
  await appendRow('Docentes', {
    Id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    Nombre: nombre,
    Email: (email || '').trim().toLowerCase(),
    Cursos: (cursos || []).join(', '),
    Activo: 'TRUE'
  });
}

/** Baja lógica (no se borra la fila, se marca Activo=FALSE) — conserva el historial. */
export async function desactivarDocente(rowIndex) {
  await patchRow('Docentes', rowIndex, { Activo: 'FALSE' });
}

export async function actualizarDocente(rowIndex, cambios) {
  const patch = {};
  if (cambios.nombre !== undefined) patch.Nombre = cambios.nombre;
  if (cambios.email !== undefined) patch.Email = (cambios.email || '').trim().toLowerCase();
  if (cambios.cursos !== undefined) patch.Cursos = cambios.cursos.join(', ');
  if (typeof cambios.activo === 'boolean') patch.Activo = cambios.activo ? 'TRUE' : 'FALSE';
  await patchRow('Docentes', rowIndex, patch);
}

/**
 * Los docentes "fijo-" (roster precargado, ver DOCENTES_DEFAULT) no tienen fila propia en
 * el Sheet todavía — su _rowIndex es null porque viven solo en código. Para poder editarlos
 * o darlos de baja hay que "materializarlos": crear recién ahí su fila real en la pestaña
 * "Docentes" con los datos combinados (los de siempre + el cambio pedido). A partir de ese
 * momento leerDocentesCombinados() los toma del Sheet (que manda por sobre el default) y
 * las próximas ediciones ya pueden usar actualizarDocente/desactivarDocente normalmente.
 */
export async function materializarDocente(docente, cambios = {}) {
  const nombre = cambios.nombre !== undefined ? cambios.nombre : docente.nombre;
  const email = cambios.email !== undefined ? cambios.email : docente.email;
  const cursos = cambios.cursos !== undefined ? cambios.cursos : docente.cursos;
  const activo = typeof cambios.activo === 'boolean' ? cambios.activo : docente.activo;
  await appendRow('Docentes', {
    Id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    Nombre: nombre,
    Email: (email || '').trim().toLowerCase(),
    Cursos: (cursos || []).join(', '),
    Activo: activo ? 'TRUE' : 'FALSE'
  });
}
