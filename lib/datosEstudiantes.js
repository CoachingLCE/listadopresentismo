import { readSheet, appendRow, appendRows, patchRow } from './sheets';
export { ESTADOS_ESTUDIANTE } from './estudiantesCliente';

// Pestaña "Estudiantes" — columnas: Id, EdicionId, Nombre, FechaIncorporacion, Estado,
// FechaBaja, Observaciones
export async function leerEstudiantesDeEdicion(edicionId) {
  const filas = await readSheet('Estudiantes');
  return filas
    .filter((f) => f.EdicionId === edicionId && f.Nombre)
    .map((f) => ({
      id: f.Id,
      edicionId: f.EdicionId,
      nombre: f.Nombre,
      fechaIncorporacion: f.FechaIncorporacion || '',
      estado: f.Estado || 'Regular',
      fechaBaja: f.FechaBaja || '',
      observaciones: f.Observaciones || '',
      _rowIndex: f._rowIndex
    }));
}

/** Todos los estudiantes de TODAS las ediciones — para buscar por nombre en /estudiantes. */
export async function leerTodosEstudiantes() {
  const filas = await readSheet('Estudiantes');
  return filas
    .filter((f) => f.Nombre)
    .map((f) => ({
      id: f.Id,
      edicionId: f.EdicionId,
      nombre: f.Nombre,
      fechaIncorporacion: f.FechaIncorporacion || '',
      estado: f.Estado || 'Regular',
      fechaBaja: f.FechaBaja || '',
      observaciones: f.Observaciones || '',
      _rowIndex: f._rowIndex
    }));
}

export async function buscarEstudiante(id) {
  const filas = await readSheet('Estudiantes');
  const f = filas.find((r) => r.Id === id);
  if (!f) return null;
  return {
    id: f.Id, edicionId: f.EdicionId, nombre: f.Nombre,
    fechaIncorporacion: f.FechaIncorporacion || '', estado: f.Estado || 'Regular',
    fechaBaja: f.FechaBaja || '', observaciones: f.Observaciones || '', _rowIndex: f._rowIndex
  };
}

export async function agregarEstudiante({ edicionId, nombre, fechaIncorporacion }) {
  await appendRow('Estudiantes', {
    Id: `est-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    EdicionId: edicionId,
    Nombre: nombre,
    FechaIncorporacion: fechaIncorporacion || new Date().toISOString().slice(0, 10),
    Estado: 'Regular',
    FechaBaja: '',
    Observaciones: ''
  });
}

/** Carga masiva — un solo llamado a la API para toda la lista pegada de una vez. */
export async function agregarEstudiantesBulk(edicionId, nombres) {
  const hoy = new Date().toISOString().slice(0, 10);
  await appendRows('Estudiantes', nombres.map((nombre, i) => ({
    Id: `est-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    EdicionId: edicionId,
    Nombre: nombre,
    FechaIncorporacion: hoy,
    Estado: 'Regular',
    FechaBaja: '',
    Observaciones: ''
  })));
}

export async function actualizarEstudiante(rowIndex, cambios) {
  const patch = {};
  if (cambios.nombre !== undefined) patch.Nombre = cambios.nombre;
  if (cambios.estado !== undefined) {
    patch.Estado = cambios.estado;
    if (cambios.estado === 'Baja' && !cambios.fechaBaja) patch.FechaBaja = new Date().toISOString().slice(0, 10);
  }
  if (cambios.fechaBaja !== undefined) patch.FechaBaja = cambios.fechaBaja;
  if (cambios.observaciones !== undefined) patch.Observaciones = cambios.observaciones;
  await patchRow('Estudiantes', rowIndex, patch);
}
