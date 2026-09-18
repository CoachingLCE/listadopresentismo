import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoVerSeguimiento, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { leerSeguimientos, agregarSeguimiento } from '../../../lib/datosSeguimiento';
import { leerEdiciones, filtrarEdicionesPorUsuario } from '../../../lib/datosEdiciones';
import { nombreCurso } from '../../../lib/cursosLogic';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerSeguimiento(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const estudianteId = searchParams.get('estudianteId') || undefined;
  const edicionId = searchParams.get('edicionId') || undefined;

  const [seguimientos, ediciones] = await Promise.all([
    leerSeguimientos({ estudianteId, edicionId }),
    leerEdiciones()
  ]);

  // El Docente solo ve seguimiento de las ediciones que tiene asignadas (nunca el
  // registro completo de todo el instituto) — los roles de gestión ven todo, igual que
  // antes. Además, a cada registro se le suma edición/curso para mostrarlo en la lista.
  const esLimitado = esRolLimitadoAEdicionesPropias(usuario);
  const idsPermitidos = esLimitado
    ? new Set(filtrarEdicionesPorUsuario(ediciones, usuario, true).map((e) => e.id))
    : null;
  const edicionesPorId = new Map(ediciones.map((e) => [e.id, e]));

  const resultado = seguimientos
    .filter((s) => !idsPermitidos || idsPermitidos.has(s.edicionId))
    .map((s) => {
      const e = edicionesPorId.get(s.edicionId);
      return { ...s, edicionCurso: e ? nombreCurso(e.curso) : '', edicionNumero: e?.numero || '' };
    });

  return NextResponse.json({ seguimientos: resultado });
})

// POST /api/seguimiento -> { estudianteId, edicionId, motivo, observaciones }
// El "área"/responsable ya no se elige a mano: queda registrada automáticamente como la
// persona logueada que carga el registro (usuario.nombre). Ahora estudianteId/edicionId
// son obligatorios (antes se podía crear un registro "suelto", sin estudiante ni edición
// vinculados) porque la pantalla ya obliga a elegir un estudiante cargado antes de poder
// registrar algo.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerSeguimiento(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { estudianteId, edicionId, motivo, observaciones } = await request.json();
  if (!motivo) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });
  if (!estudianteId || !edicionId) return NextResponse.json({ error: 'Elegí un estudiante primero.' }, { status: 400 });

  if (esRolLimitadoAEdicionesPropias(usuario)) {
    const ediciones = await leerEdiciones();
    const esPropia = filtrarEdicionesPorUsuario(ediciones, usuario, true).some((e) => e.id === edicionId);
    if (!esPropia) return NextResponse.json({ error: 'No tenés acceso a esa edición.' }, { status: 403 });
  }

  const id = await agregarSeguimiento({ estudianteId, edicionId, motivo, responsable: usuario.nombre, observaciones });
  await registrarAccion(usuario.email, usuario.nombre, 'Registró seguimiento', motivo);

  return NextResponse.json({ ok: true, id });
})
