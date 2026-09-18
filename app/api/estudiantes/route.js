import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoGestionAcademica, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { agregarEstudiantesBulk, leerTodosEstudiantes } from '../../../lib/datosEstudiantes';
import { buscarEdicion, leerEdiciones, filtrarEdicionesPorUsuario, leerClasesDeEdicion } from '../../../lib/datosEdiciones';
import { nombreCurso } from '../../../lib/cursosLogic';
import { registrarAccion } from '../../../lib/auditoria';
import { appendRows } from '../../../lib/sheets';

// GET /api/estudiantes?q=texto -> busca por nombre en todas las ediciones visibles.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  const [todos, ediciones] = await Promise.all([leerTodosEstudiantes(), leerEdiciones()]);
  const visibles = filtrarEdicionesPorUsuario(ediciones, usuario, esRolLimitadoAEdicionesPropias(usuario));
  const edicionesPorId = new Map(visibles.map((e) => [e.id, e]));

  const resultado = todos
    .filter((es) => edicionesPorId.has(es.edicionId))
    .filter((es) => !q || es.nombre.toLowerCase().includes(q))
    .map((es) => {
      const e = edicionesPorId.get(es.edicionId);
      return { ...es, edicionCurso: e ? nombreCurso(e.curso) : '', edicionNumero: e?.numero || '' };
    });

  return NextResponse.json({ estudiantes: resultado });
})

// POST /api/estudiantes -> { edicionId, nombres: string[] } — carga masiva (pegar lista).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { edicionId, nombres } = await request.json();
  if (!edicionId) return NextResponse.json({ error: 'Falta la edición.' }, { status: 400 });
  const limpios = (nombres || []).map((n) => (n || '').trim()).filter(Boolean);
  if (limpios.length === 0) return NextResponse.json({ error: 'No hay nombres para cargar.' }, { status: 400 });

  const edicion = await buscarEdicion(edicionId);
  if (!edicion) return NextResponse.json({ error: 'No existe esa edición.' }, { status: 404 });

  const nuevos = await agregarEstudiantesBulk(edicionId, limpios);

  // Si ya se dieron clases antes de hoy, a cada estudiante nuevo se le marca automáticamente
  // "CC" (se incorporó/cursa distinto) en esas clases anteriores a su incorporación — así no
  // quedan como ausencias sin explicación ni hay que cargarlas a mano una por una.
  const hoy = new Date().toISOString().slice(0, 10);
  const clases = await leerClasesDeEdicion(edicionId);
  const clasesAnteriores = clases.filter((c) => c.fecha && c.fecha <= hoy);
  if (clasesAnteriores.length > 0) {
    const filasPresentismo = [];
    for (const est of nuevos) {
      for (const clase of clasesAnteriores) {
        filasPresentismo.push({
          Id: `pres-${est.id}-${clase.id}`,
          EstudianteId: est.id,
          ClaseId: clase.id,
          EdicionId: edicionId,
          Estado: 'CC',
          Notas: '',
          ModificadoPor: usuario.email,
          FechaModificacion: new Date().toISOString()
        });
      }
    }
    await appendRows('Presentismo', filasPresentismo);
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Cargó estudiantes', `${limpios.length} en ${edicion.curso} #${edicion.numero}`);

  return NextResponse.json({ ok: true, cantidad: limpios.length, clasesAnterioresMarcadas: clasesAnteriores.length });
})
