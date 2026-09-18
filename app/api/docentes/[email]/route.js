import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoGestionRosterDocentes } from '../../../../lib/permisos';
import { leerDocentesCombinados, actualizarDocente, desactivarDocente, materializarDocente } from '../../../../lib/datosDocentes';
import { registrarAccion } from '../../../../lib/auditoria';

// PATCH /api/docentes/[email] -> { nombre, cursos, activo }
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionRosterDocentes(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const email = decodeURIComponent(params.email).trim().toLowerCase();
  const docentes = await leerDocentesCombinados();
  const docente = docentes.find((d) => d.email === email);
  if (!docente) return NextResponse.json({ error: 'No existe ese docente/staff.' }, { status: 404 });

  const body = await request.json();
  const { nombre, cursos, activo } = body;
  const cambios = {};
  if (nombre !== undefined) cambios.nombre = nombre;
  if (cursos !== undefined) cambios.cursos = cursos;
  if (typeof activo === 'boolean') cambios.activo = activo;

  if (docente._rowIndex === null) {
    // Es un docente "fijo" (del roster precargado) que todavía no tiene fila propia en el
    // Sheet — hay que crearla recién ahora con los datos combinados + el cambio pedido.
    await materializarDocente(docente, cambios);
  } else if (typeof activo === 'boolean' && !nombre && !cursos) {
    await desactivarDocente(docente._rowIndex);
    if (activo) await actualizarDocente(docente._rowIndex, { activo: true });
  } else {
    await actualizarDocente(docente._rowIndex, cambios);
  }

  const detalle = [
    nombre ? `nombre → ${nombre}` : null,
    cursos ? `cursos → ${cursos.join(', ')}` : null,
    typeof activo === 'boolean' ? (activo ? 'reactivado' : 'dado de baja') : null
  ].filter(Boolean).join(' · ');
  await registrarAccion(usuario.email, usuario.nombre, 'Editó docente/staff', `${docente.nombre} (${email}): ${detalle}`);

  return NextResponse.json({ ok: true });
})
