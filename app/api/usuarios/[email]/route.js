import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoAccesos, tienePermisoGestionarAdmins, tienePermisoGestionRosterDocentes } from '../../../../lib/permisos';
import { actualizarUsuario, puedeAsignarRoles, rolesValidos, buscarUsuarioPorEmail } from '../../../../lib/gestionUsuarios';
import { registrarAccion } from '../../../../lib/auditoria';

// Ver la nota en app/api/usuarios/route.js: Coordinación (sin el permiso completo de
// Accesos) solo puede tocar cuentas que sean Docente/Staff, nunca Académico/Coordinación/
// SuperAdmin — eso sigue siendo exclusivo de la pantalla de Accesos.
const ROLES_ROSTER = ['Docente', 'Staff'];
function esSoloRolesRoster(roles) {
  return (roles || []).every((r) => ROLES_ROSTER.includes(r));
}

export const PATCH = conManejo(async (request, { params }) => {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const accesoTotal = tienePermisoAccesos(actor);
  const accesoRoster = tienePermisoGestionRosterDocentes(actor);
  if (!accesoTotal && !accesoRoster) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const email = decodeURIComponent(params.email);
  const objetivo = await buscarUsuarioPorEmail(email);
  if (!objetivo) return NextResponse.json({ error: 'No existe ese usuario.' }, { status: 404 });

  const rolesActuales = (objetivo.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean);

  if (!accesoTotal && !esSoloRolesRoster(rolesActuales)) {
    return NextResponse.json({ error: 'No tenés permiso para modificar esta cuenta.' }, { status: 403 });
  }

  const body = await request.json();
  const { roles, activo, nuevaPassword } = body;

  if (!accesoTotal && roles && !esSoloRolesRoster(roles)) {
    return NextResponse.json({ error: 'Solo podés asignar rol Docente o Staff.' }, { status: 403 });
  }

  const rolesAEvaluar = roles && rolesValidos(roles) ? roles : rolesActuales;
  if (!puedeAsignarRoles(actor, [...rolesActuales, ...rolesAEvaluar], tienePermisoGestionarAdmins)) {
    return NextResponse.json(
      { error: 'Solo un SuperAdmin puede modificar a otro usuario SuperAdmin.' },
      { status: 403 }
    );
  }
  if (roles && !rolesValidos(roles)) {
    return NextResponse.json({ error: 'Roles no válidos.' }, { status: 400 });
  }
  if (nuevaPassword && nuevaPassword.length < 8) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  const cambios = {};
  if (roles) cambios.roles = roles;
  if (typeof activo === 'boolean') cambios.activo = activo;
  if (nuevaPassword) cambios.nuevaPassword = nuevaPassword;

  await actualizarUsuario(objetivo._rowIndex, cambios);

  const detalle = [
    roles ? `roles → ${roles.join(', ')}` : null,
    typeof activo === 'boolean' ? (activo ? 'reactivado' : 'desactivado') : null,
    nuevaPassword ? 'contraseña reseteada' : null
  ].filter(Boolean).join(' · ');
  await registrarAccion(actor.email, actor.nombre, 'Editó usuario', `${email}: ${detalle}`);

  return NextResponse.json({ ok: true });
})
