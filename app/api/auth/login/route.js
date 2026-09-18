import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { findUsuario } from '../../../../lib/auth';
import { verifyPassword } from '../../../../lib/passwords';
import { registrarAccion } from '../../../../lib/auditoria';
import { crearToken } from '../../../../lib/sessionToken';

// POST /api/auth/login -> { email, password }
export const POST = conManejo(async (request) => {
  const body = await request.json();
  const usuario = await findUsuario(body.email);

  if (!usuario) {
    return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
  }
  if (!usuario.activo) {
    await registrarAccion(body.email, usuario.nombre, 'Intento de login rechazado', 'Usuario desactivado');
    return NextResponse.json(
      { error: 'Tu usuario está desactivado. Pedile a un SuperAdmin que lo reactive.' },
      { status: 403 }
    );
  }
  if (!usuario.passwordHash) {
    return NextResponse.json(
      { error: 'Tu usuario todavía no tiene contraseña asignada. Pedile a un SuperAdmin que te la asigne desde "Accesos", o usá /setup-password si es tu primera vez.' },
      { status: 403 }
    );
  }
  if (!verifyPassword(body.password, usuario.passwordHash)) {
    await registrarAccion(body.email, usuario.nombre, 'Intento de login fallido', 'Contraseña incorrecta');
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  await registrarAccion(body.email, usuario.nombre, 'Inició sesión', '');
  return NextResponse.json({
    usuario: { email: usuario.email, nombre: usuario.nombre, roles: usuario.roles },
    token: crearToken(usuario.email, usuario.passwordHash)
  });
})
