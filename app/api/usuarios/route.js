import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoAccesos, tienePermisoGestionarAdmins, tienePermisoGestionRosterDocentes } from '../../../lib/permisos';
import { listarUsuarios, crearUsuario, puedeAsignarRoles, rolesValidos, buscarUsuarioPorEmail } from '../../../lib/gestionUsuarios';
import { leerHistorialCompleto } from '../../../lib/datosHistorial';
import { registrarAccion } from '../../../lib/auditoria';

// Roles que puede tocar alguien que solo tiene permiso de roster (Coordinación/SuperAdmin
// vía tienePermisoGestionRosterDocentes), no el permiso completo de Accesos — así
// Coordinación puede crear/resetear el acceso de un Docente o Staff desde Equipo Docente,
// sin poder ver ni tocar cuentas de Académico/Coordinación/SuperAdmin (eso sigue siendo
// exclusivo de la pantalla de Accesos, reservada a SuperAdmin).
const ROLES_ROSTER = ['Docente', 'Staff'];
function esSoloRolesRoster(roles) {
  return (roles || []).every((r) => ROLES_ROSTER.includes(r));
}

export const GET = conManejo(async (request) => {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const accesoTotal = tienePermisoAccesos(actor);
  const accesoRoster = tienePermisoGestionRosterDocentes(actor);
  if (!accesoTotal && !accesoRoster) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const [usuariosTodos, historial] = await Promise.all([listarUsuarios(), leerHistorialCompleto()]);
  // Sin el permiso completo de Accesos, solo se devuelven las cuentas de Docente/Staff
  // (lo que hace falta para el indicador de acceso en Equipo Docente).
  const usuarios = accesoTotal ? usuariosTodos : usuariosTodos.filter((u) => esSoloRolesRoster(u.roles));

  const conUltimoLogin = usuarios.map((u) => {
    const ultimo = historial.find((h) => h.accion === 'Inició sesión' && h.email?.toLowerCase() === u.email?.toLowerCase());
    return { ...u, ultimoLogin: ultimo ? ultimo.fecha : '' };
  });

  return NextResponse.json({ usuarios: conUltimoLogin });
})

export const POST = conManejo(async (request) => {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const accesoTotal = tienePermisoAccesos(actor);
  const accesoRoster = tienePermisoGestionRosterDocentes(actor);
  if (!accesoTotal && !accesoRoster) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { email, nombre, roles, password } = body;

  if (!email || !nombre || !rolesValidos(roles)) {
    return NextResponse.json({ error: 'Faltan datos o los roles no son válidos.' }, { status: 400 });
  }
  if (!accesoTotal && !esSoloRolesRoster(roles)) {
    return NextResponse.json({ error: 'Solo podés crear accesos con rol Docente o Staff.' }, { status: 403 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }
  if (!puedeAsignarRoles(actor, roles, tienePermisoGestionarAdmins)) {
    return NextResponse.json(
      { error: 'Solo un SuperAdmin puede crear usuarios con rol SuperAdmin.' },
      { status: 403 }
    );
  }

  const existente = await buscarUsuarioPorEmail(email);
  if (existente) {
    return NextResponse.json({ error: 'Ese email ya existe en Usuarios.' }, { status: 409 });
  }

  await crearUsuario({ email, nombre, roles, password });
  await registrarAccion(actor.email, actor.nombre, 'Creó usuario', `${email} (${roles.join(', ')})${password ? ' — con contraseña asignada' : ''}`);

  return NextResponse.json({ ok: true });
})
