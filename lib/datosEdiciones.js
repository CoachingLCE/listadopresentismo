import { readSheet, appendRow, appendRows, patchRow, clearRows } from './sheets';
import { generarCalendario, fechaFinEstimada, cursoPorCodigo } from './cursosLogic';

// Pestaña "Ediciones" — columnas: Id, Curso, Numero, FechaInicio, FechaFin, TotalClases,
// DocenteEmail, DocenteNombre, StaffEmail, StaffNombre, Estado, FechaCreacion, CreadoPor
export async function leerEdiciones() {
  const filas = await readSheet('Ediciones');
  const hoyISO = new Date().toISOString().slice(0, 10);
  return filas
    .filter((f) => f.Id)
    .map((f) => {
      const estado = f.Estado || (f.FechaFin && f.FechaFin < hoyISO ? 'Finalizada' : 'Activa');
      return {
        id: f.Id,
        curso: f.Curso,
        numero: f.Numero,
        fechaInicio: f.FechaInicio || '',
        fechaFin: f.FechaFin || '',
        totalClases: parseInt(f.TotalClases, 10) || null,
        docenteEmail: (f.DocenteEmail || '').trim().toLowerCase(),
        docenteNombre: f.DocenteNombre || '',
        staffEmail: (f.StaffEmail || '').trim().toLowerCase(),
        staffNombre: f.StaffNombre || '',
        estado,
        fechaCreacion: f.FechaCreacion || '',
        creadoPor: f.CreadoPor || '',
        _rowIndex: f._rowIndex
      };
    });
}

export async function buscarEdicion(id) {
  const ediciones = await leerEdiciones();
  return ediciones.find((e) => e.id === id) || null;
}

/**
 * Crea una nueva edición Y genera de una todas sus clases en la pestaña "Clases"
 * (un solo llamado por lote, no una escritura por clase — ver appendRows en sheets.js).
 * Devuelve la edición creada junto con el calendario generado.
 */
export async function crearEdicionConCalendario({ curso, numero, fechaInicio, docenteEmail, docenteNombre, staffEmail, staffNombre, creadoPor, totalClasesOverride }) {
  const cursoInfo = cursoPorCodigo(curso);
  const total = totalClasesOverride || cursoInfo?.totalClases || 16;
  const id = `ed-${curso}-${numero}-${Date.now().toString(36)}`;
  const calendario = generarCalendario(curso, fechaInicio, totalClasesOverride);
  const fechaFin = fechaFinEstimada(curso, fechaInicio, totalClasesOverride);

  await appendRow('Ediciones', {
    Id: id,
    Curso: curso,
    Numero: numero,
    FechaInicio: fechaInicio,
    FechaFin: fechaFin,
    TotalClases: total,
    DocenteEmail: (docenteEmail || '').trim().toLowerCase(),
    DocenteNombre: docenteNombre || '',
    StaffEmail: (staffEmail || '').trim().toLowerCase(),
    StaffNombre: staffNombre || '',
    Estado: 'Activa',
    FechaCreacion: new Date().toISOString(),
    CreadoPor: creadoPor || ''
  });

  await appendRows('Clases', calendario.map((c) => ({
    Id: `${id}-c${c.numero}`,
    EdicionId: id,
    Numero: c.numero,
    Fecha: c.fecha,
    Cuatrimestre: c.cuatrimestre || ''
  })));

  return { id, calendario };
}

export async function actualizarEdicion(rowIndex, cambios) {
  const patch = {};
  if (cambios.docenteEmail !== undefined) patch.DocenteEmail = (cambios.docenteEmail || '').trim().toLowerCase();
  if (cambios.docenteNombre !== undefined) patch.DocenteNombre = cambios.docenteNombre;
  if (cambios.staffEmail !== undefined) patch.StaffEmail = (cambios.staffEmail || '').trim().toLowerCase();
  if (cambios.staffNombre !== undefined) patch.StaffNombre = cambios.staffNombre;
  if (cambios.estado !== undefined) patch.Estado = cambios.estado;
  if (cambios.fechaFin !== undefined) patch.FechaFin = cambios.fechaFin;
  await patchRow('Ediciones', rowIndex, patch);
}

// Pestaña "Clases" — columnas: Id, EdicionId, Numero, Fecha, Cuatrimestre
export async function leerClasesDeEdicion(edicionId) {
  const filas = await readSheet('Clases');
  return filas
    .filter((f) => f.EdicionId === edicionId)
    .map((f) => ({
      id: f.Id,
      edicionId: f.EdicionId,
      numero: parseInt(f.Numero, 10),
      fecha: f.Fecha || '',
      cuatrimestre: f.Cuatrimestre ? parseInt(f.Cuatrimestre, 10) : null
    }))
    .sort((a, b) => a.numero - b.numero);
}

/**
 * Borra por completo una edición (reservado a SuperAdmin): vacía su fila en "Ediciones"
 * y en cascada las filas de "Clases", "Estudiantes" y "Presentismo" que le pertenecen —
 * Google Sheets vía API no borra filas fácilmente sin reordenar todo lo de abajo, así que
 * se vacía el contenido en su lugar (mismo criterio que clearRows en sheets.js).
 */
export async function borrarEdicion(edicionId) {
  const [ediciones, clases, estudiantes, presentismo] = await Promise.all([
    readSheet('Ediciones'),
    readSheet('Clases'),
    readSheet('Estudiantes'),
    readSheet('Presentismo')
  ]);

  const filaEdicion = ediciones.find((f) => f.Id === edicionId);
  const filasClases = clases.filter((f) => f.EdicionId === edicionId);
  const filasEstudiantes = estudiantes.filter((f) => f.EdicionId === edicionId);
  const filasPresentismo = presentismo.filter((f) => f.EdicionId === edicionId);

  await Promise.all([
    filaEdicion ? clearRows('Ediciones', [filaEdicion._rowIndex]) : null,
    clearRows('Clases', filasClases.map((f) => f._rowIndex)),
    clearRows('Estudiantes', filasEstudiantes.map((f) => f._rowIndex)),
    clearRows('Presentismo', filasPresentismo.map((f) => f._rowIndex))
  ]);
}

/** Ediciones visibles para un usuario: todas si tiene gestión académica, o solo las
 * que tenga asignadas como docente/staff si su rol está limitado a las propias. */
export function filtrarEdicionesPorUsuario(ediciones, usuario, esRolLimitado) {
  if (!esRolLimitado) return ediciones;
  const email = (usuario.email || '').trim().toLowerCase();
  return ediciones.filter((e) => e.docenteEmail === email || e.staffEmail === email);
}
