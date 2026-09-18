import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoGestionAcademica, tienePermisoEscribirNotasEstudiante, esRolLimitadoAEdicionesPropias } from '../../../../lib/permisos';
import { buscarEstudiante, actualizarEstudiante } from '../../../../lib/datosEstudiantes';
import { buscarEdicion } from '../../../../lib/datosEdiciones';
import { registrarAccion } from '../../../../lib/auditoria';

function puedeOperarEdicion(usuario, edicion) {
  if (!esRolLimitadoAEdicionesPropias(usuario)) return true;
  const email = (usuario.email || '').trim().toLowerCase();
  return edicion.docenteEmail === email || edicion.staffEmail === email;
}

// PATCH /api/estudiantes/[id] -> { estado, observaciones }
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const estudiante = await buscarEstudiante(params.id);
  if (!estudiante) return NextResponse.json({ error: 'No existe ese estudiante.' }, { status: 404 });

  const edicion = await buscarEdicion(estudiante.edicionId);
  if (!edicion || !puedeOperarEdicion(usuario, edicion)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { estado, observaciones } = await request.json();
  const cambios = {};
  let detalle = [];

  if (estado !== undefined) {
    if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Solo Coordinación/Académico puede cambiar el estado del estudiante.' }, { status: 403 });
    cambios.estado = estado;
    detalle.push(`Estado → ${estado}`);
  }
  if (observaciones !== undefined) {
    if (!tienePermisoEscribirNotasEstudiante(usuario)) return NextResponse.json({ error: 'Sin permiso para escribir observaciones.' }, { status: 403 });
    cambios.observaciones = observaciones;
    detalle.push('Observaciones actualizadas');
  }

  await actualizarEstudiante(estudiante._rowIndex, cambios);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó estudiante', `${estudiante.nombre} (${edicion.curso} #${edicion.numero}): ${detalle.join(' · ')}`);

  return NextResponse.json({ ok: true });
})
