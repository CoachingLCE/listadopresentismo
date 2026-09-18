import { readSheet, appendRow, patchRow } from './sheets';
export { AREAS_SEGUIMIENTO, MOTIVOS_SEGUIMIENTO, ESTADOS_SEGUIMIENTO } from './datosSeguimientoCliente';

// Pestaña "Seguimiento" — columnas: Id, EstudianteId, EdicionId, Area, Motivo,
// Responsable, Observaciones, Fecha, Estado
export async function leerSeguimientos({ estudianteId, edicionId } = {}) {
  const filas = await readSheet('Seguimiento');
  return filas
    .filter((f) => f.Id && (!estudianteId || f.EstudianteId === estudianteId) && (!edicionId || f.EdicionId === edicionId))
    .map((f) => ({
      id: f.Id,
      estudianteId: f.EstudianteId,
      edicionId: f.EdicionId,
      area: f.Area || '',
      motivo: f.Motivo || '',
      responsable: f.Responsable || '',
      observaciones: f.Observaciones || '',
      fecha: f.Fecha || '',
      estado: f.Estado || 'Pendiente',
      _rowIndex: f._rowIndex
    }))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

export async function agregarSeguimiento({ estudianteId, edicionId, motivo, responsable, observaciones }) {
  const id = `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await appendRow('Seguimiento', {
    Id: id,
    EstudianteId: estudianteId || '',
    EdicionId: edicionId || '',
    Area: '',
    Motivo: motivo,
    Responsable: responsable || '',
    Observaciones: observaciones || '',
    Fecha: new Date().toISOString().slice(0, 10),
    Estado: 'Pendiente'
  });
  return id;
}

export async function actualizarSeguimiento(rowIndex, cambios) {
  const patch = {};
  if (cambios.estado !== undefined) patch.Estado = cambios.estado;
  if (cambios.observaciones !== undefined) patch.Observaciones = cambios.observaciones;
  if (cambios.responsable !== undefined) patch.Responsable = cambios.responsable;
  await patchRow('Seguimiento', rowIndex, patch);
}
