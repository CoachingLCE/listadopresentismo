import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoGestionAcademica, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { leerEdiciones, crearEdicionConCalendario, filtrarEdicionesPorUsuario } from '../../../lib/datosEdiciones';
import { cursoPorCodigo } from '../../../lib/cursosLogic';
import { leerDocentesCombinados } from '../../../lib/datosDocentes';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const ediciones = await leerEdiciones();
  const visibles = filtrarEdicionesPorUsuario(ediciones, usuario, esRolLimitadoAEdicionesPropias(usuario));

  return NextResponse.json({ ediciones: visibles });
})

// POST /api/ediciones -> { curso, numero, fechaInicio, docenteEmail, staffEmail, totalClasesOverride }
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { curso, numero, fechaInicio, docenteEmail, staffEmail, totalClasesOverride } = body;

  if (!curso || !cursoPorCodigo(curso)) {
    return NextResponse.json({ error: 'Curso no válido.' }, { status: 400 });
  }
  if (!numero) {
    return NextResponse.json({ error: 'Falta el número de edición.' }, { status: 400 });
  }
  if (!fechaInicio) {
    return NextResponse.json({ error: 'Falta la fecha de inicio.' }, { status: 400 });
  }

  const docentes = await leerDocentesCombinados();
  const docente = docenteEmail ? docentes.find((d) => d.email === docenteEmail.trim().toLowerCase()) : null;
  const staff = staffEmail ? docentes.find((d) => d.email === staffEmail.trim().toLowerCase()) : null;

  const { id, calendario } = await crearEdicionConCalendario({
    curso,
    numero,
    fechaInicio,
    docenteEmail: docente?.email || '',
    docenteNombre: docente?.nombre || '',
    staffEmail: staff?.email || '',
    staffNombre: staff?.nombre || '',
    creadoPor: usuario.email,
    totalClasesOverride: totalClasesOverride || undefined
  });

  await registrarAccion(
    usuario.email, usuario.nombre, 'Creó edición',
    `${curso} #${numero} (${calendario.length} clases desde ${fechaInicio})${docente ? ` · Docente: ${docente.nombre}` : ''}${staff ? ` · Staff: ${staff.nombre}` : ''}`
  );

  return NextResponse.json({ ok: true, id, calendario });
})
