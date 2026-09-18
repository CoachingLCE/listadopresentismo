import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoAccesos, tienePermisoGestionarAdmins } from '../../../lib/permisos';
import { listarUsuarios, crearUsuario, puedeAsignarRoles, rolesValidos, buscarUsuarioPorEmail } from '../../../lib/gestionUsuarios';
import { leerHistorialCompleto } from '../../../lib/datosHistorial';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(actor)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const [usuarios, historial] = await Promise.all([listarUsuarios(), leerHistorialCompleto()]);

  const conUltimoLogin = usuarios.map((u) => {
    const ultimo = historial.find((h) => h.accion === 'Inició sesión' && h.email?.toLowerCase() === u.email?.toLowerCase());
    return { ...u, ultimoLogin: ultimo ? ultimo.fecha : '' };
  });

  return NextResponse.json({ usuarios: conUltimoLogin });
})

export const POST = conManejo(async (request) => {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(actor)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { email, nombre, roles, password } = body;

  if (!email || !nombre || !rolesValidos(roles)) {
    return NextResponse.json({ error: 'Faltan datos o los roles no son válidos.' }, { status: 400 });
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
