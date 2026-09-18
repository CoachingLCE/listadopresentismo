import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoGestionAcademica, esRolLimitadoAEdicionesPropias, esSuperAdmin } from '../../../../lib/permisos';
import { buscarEdicion, actualizarEdicion, leerClasesDeEdicion, borrarEdicion } from '../../../../lib/datosEdiciones';
import { leerEstudiantesDeEdicion } from '../../../../lib/datosEstudiantes';
import { leerPresentismoDeEdicion } from '../../../../lib/datosPresentismo';
import { leerDocentesCombinados } from '../../../../lib/datosDocentes';
import { registrarAccion } from '../../../../lib/auditoria';

function puedeVerEdicion(usuario, edicion) {
  if (!esRolLimitadoAEdicionesPropias(usuario)) return true;
  const email = (usuario.email || '').trim().toLowerCase();
  return edicion.docenteEmail === email || edicion.staffEmail === email;
}

export const GET = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const edicion = await buscarEdicion(params.id);
  if (!edicion) return NextResponse.json({ error: 'No existe esa edición.' }, { status: 404 });
  if (!puedeVerEdicion(usuario, edicion)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const [clases, estudiantes, presentismo] = await Promise.all([
    leerClasesDeEdicion(edicion.id),
    leerEstudiantesDeEdicion(edicion.id),
    leerPresentismoDeEdicion(edicion.id)
  ]);

  return NextResponse.json({ edicion, clases, estudiantes, presentismo });
})

// PATCH /api/ediciones/[id] -> { docenteEmail, staffEmail, estado, fechaFin }
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const edicion = await buscarEdicion(params.id);
  if (!edicion) return NextResponse.json({ error: 'No existe esa edición.' }, { status: 404 });

  const body = await request.json();
  const { docenteEmail, staffEmail, estado, fechaFin } = body;

  const cambios = {};
  let detalle = [];

  if (docenteEmail !== undefined) {
    const docentes = await leerDocentesCombinados();
    const docente = docenteEmail ? docentes.find((d) => d.email === docenteEmail.trim().toLowerCase()) : null;
    cambios.docenteEmail = docente?.email || '';
    cambios.docenteNombre = docente?.nombre || '';
    detalle.push(`Docente → ${docente?.nombre || '(sin asignar)'}`);
  }
  if (staffEmail !== undefined) {
    const docentes = await leerDocentesCombinados();
    const staff = staffEmail ? docentes.find((d) => d.email === staffEmail.trim().toLowerCase()) : null;
    cambios.staffEmail = staff?.email || '';
    cambios.staffNombre = staff?.nombre || '';
    detalle.push(`Staff → ${staff?.nombre || '(sin asignar)'}`);
  }
  if (estado !== undefined) {
    cambios.estado = estado;
    detalle.push(`Estado → ${estado}`);
  }
  if (fechaFin !== undefined) {
    cambios.fechaFin = fechaFin;
    detalle.push(`Fecha fin → ${fechaFin}`);
  }

  await actualizarEdicion(edicion._rowIndex, cambios);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó edición', `${edicion.curso} #${edicion.numero}: ${detalle.join(' · ')}`);

  return NextResponse.json({ ok: true });
})

// DELETE /api/ediciones/[id] -> borra la edición y todo lo que le pertenece (clases,
// estudiantes, presentismo). Reservado a SuperAdmin — es irreversible.
export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esSuperAdmin(usuario)) return NextResponse.json({ error: 'Solo SuperAdmin puede borrar una edición.' }, { status: 403 });

  const edicion = await buscarEdicion(params.id);
  if (!edicion) return NextResponse.json({ error: 'No existe esa edición.' }, { status: 404 });

  await borrarEdicion(edicion.id);
  await registrarAccion(usuario.email, usuario.nombre, 'Borró edición', `${edicion.curso} #${edicion.numero}`);

  return NextResponse.json({ ok: true });
})
