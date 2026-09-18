import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoGestionAcademica } from '../../../../lib/permisos';
import { leerSeguimientos, actualizarSeguimiento } from '../../../../lib/datosSeguimiento';
import { registrarAccion } from '../../../../lib/auditoria';

// PATCH /api/seguimiento/[id] -> { estado, observaciones }
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const todos = await leerSeguimientos();
  const seg = todos.find((s) => s.id === params.id);
  if (!seg) return NextResponse.json({ error: 'No existe ese seguimiento.' }, { status: 404 });

  const { estado, observaciones } = await request.json();
  await actualizarSeguimiento(seg._rowIndex, { estado, observaciones, responsable: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Actualizó seguimiento', `${seg.motivo}${estado ? ` → ${estado}` : ''}`);

  return NextResponse.json({ ok: true });
})
