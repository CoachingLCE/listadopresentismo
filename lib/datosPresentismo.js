import { readSheet, appendRow, patchRow } from './sheets';
export { ESTADOS_PRESENTISMO, COLOR_PRESENTISMO, calcularPorcentaje } from './presentismoCalculo';

// Pestaña "Presentismo" — columnas: Id, EstudianteId, ClaseId, EdicionId, Estado, Notas,
// ModificadoPor, FechaModificacion. Una fila por (estudiante, clase).
export async function leerPresentismoDeEdicion(edicionId) {
  const filas = await readSheet('Presentismo');
  return filas
    .filter((f) => f.EdicionId === edicionId)
    .map((f) => ({
      id: f.Id,
      estudianteId: f.EstudianteId,
      claseId: f.ClaseId,
      edicionId: f.EdicionId,
      estado: f.Estado || '',
      notas: f.Notas || '',
      modificadoPor: f.ModificadoPor || '',
      fechaModificacion: f.FechaModificacion || '',
      _rowIndex: f._rowIndex
    }));
}

/**
 * Carga o modifica el estado de presentismo de un estudiante en una clase puntual.
 * Si ya existe una fila para ese (estudiante, clase), la actualiza (deja registro de
 * quién la modificó por última vez); si no, la crea. Nunca hay dos filas para el mismo
 * par estudiante+clase.
 */
export async function guardarPresentismo({ estudianteId, claseId, edicionId, estado, notas, modificadoPor }) {
  const filas = await readSheet('Presentismo');
  const existente = filas.find((f) => f.EstudianteId === estudianteId && f.ClaseId === claseId);
  const ahora = new Date().toISOString();

  if (existente) {
    const patch = { ModificadoPor: modificadoPor || '', FechaModificacion: ahora };
    if (estado !== undefined) patch.Estado = estado;
    if (notas !== undefined) patch.Notas = notas;
    await patchRow('Presentismo', existente._rowIndex, patch);
    return existente.Id;
  }

  const id = `pres-${estudianteId}-${claseId}`;
  await appendRow('Presentismo', {
    Id: id,
    EstudianteId: estudianteId,
    ClaseId: claseId,
    EdicionId: edicionId,
    Estado: estado || '',
    Notas: notas || '',
    ModificadoPor: modificadoPor || '',
    FechaModificacion: ahora
  });
  return id;
}

/** Presentismo de un estudiante en TODAS las ediciones (para su ficha resumida). */
export async function leerPresentismoDeEstudiante(estudianteId) {
  const filas = await readSheet('Presentismo');
  return filas
    .filter((f) => f.EstudianteId === estudianteId)
    .map((f) => ({ claseId: f.ClaseId, estado: f.Estado || '', notas: f.Notas || '', fechaModificacion: f.FechaModificacion || '' }));
}
