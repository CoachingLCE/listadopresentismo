import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoCargarAsistencia, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { guardarPresentismo } from '../../../lib/datosPresentismo';
import { buscarEdicion } from '../../../lib/datosEdiciones';
import { registrarAccion } from '../../../lib/auditoria';

function puedeOperarEdicion(usuario, edicion) {
  if (!esRolLimitadoAEdicionesPropias(usuario)) return true;
  const email = (usuario.email || '').trim().toLowerCase();
  return edicion.docenteEmail === email || edicion.staffEmail === email;
}

// POST /api/presentismo -> { estudianteId, claseId, edicionId, estado, notas }
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoCargarAsistencia(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { estudianteId, claseId, edicionId, estado, notas } = await request.json();
  if (!estudianteId || !claseId || !edicionId) {
    return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
  }

  const edicion = await buscarEdicion(edicionId);
  if (!edicion) return NextResponse.json({ error: 'No existe esa edición.' }, { status: 404 });
  if (!puedeOperarEdicion(usuario, edicion)) return NextResponse.json({ error: 'Sin permiso sobre esta edición.' }, { status: 403 });

  await guardarPresentismo({ estudianteId, claseId, edicionId, estado, notas, modificadoPor: usuario.email });

  return NextResponse.json({ ok: true });
})
