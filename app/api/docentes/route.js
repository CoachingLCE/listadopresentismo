import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoGestionAcademica, tienePermisoGestionRosterDocentes } from '../../../lib/permisos';
import { leerDocentesCombinados, agregarDocente } from '../../../lib/datosDocentes';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const docentes = await leerDocentesCombinados();
  return NextResponse.json({ docentes });
})

// POST /api/docentes -> { nombre, email, cursos } — alta de un docente/staff nuevo al roster.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionRosterDocentes(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { nombre, email, cursos } = await request.json();
  if (!nombre || !email) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });

  const existentes = await leerDocentesCombinados();
  if (existentes.some((d) => d.email === email.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Ya hay un docente/staff con ese email.' }, { status: 409 });
  }

  await agregarDocente({ nombre, email, cursos: cursos || [] });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó docente/staff', `${nombre} (${email})`);

  return NextResponse.json({ ok: true });
})
