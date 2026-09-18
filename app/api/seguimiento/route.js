import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoGestionAcademica } from '../../../lib/permisos';
import { leerSeguimientos, agregarSeguimiento } from '../../../lib/datosSeguimiento';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const estudianteId = searchParams.get('estudianteId') || undefined;
  const edicionId = searchParams.get('edicionId') || undefined;

  const seguimientos = await leerSeguimientos({ estudianteId, edicionId });
  return NextResponse.json({ seguimientos });
})

// POST /api/seguimiento -> { estudianteId, edicionId, motivo, observaciones }
// El "área"/responsable ya no se elige a mano: queda registrada automáticamente como la
// persona logueada que carga el registro (usuario.nombre).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { estudianteId, edicionId, motivo, observaciones } = await request.json();
  if (!motivo) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });

  const id = await agregarSeguimiento({ estudianteId, edicionId, motivo, responsable: usuario.nombre, observaciones });
  await registrarAccion(usuario.email, usuario.nombre, 'Registró seguimiento', motivo);

  return NextResponse.json({ ok: true, id });
})
