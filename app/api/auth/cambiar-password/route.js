import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { hashPassword, verifyPassword } from '../../../../lib/passwords';
import { buscarUsuarioPorEmail } from '../../../../lib/gestionUsuarios';
import { patchRow } from '../../../../lib/sheets';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/auth/cambiar-password -> { passwordActual, passwordNueva }
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { passwordActual, passwordNueva } = await request.json();
  if (!passwordNueva || passwordNueva.length < 8) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }

  const registro = await buscarUsuarioPorEmail(usuario.email);
  if (!registro) return NextResponse.json({ error: 'No se encontró tu usuario.' }, { status: 404 });

  if (registro.PasswordHash) {
    if (!passwordActual || !verifyPassword(passwordActual, registro.PasswordHash)) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
    }
  }

  await patchRow('Usuarios', registro._rowIndex, { PasswordHash: hashPassword(passwordNueva) });
  await registrarAccion(usuario.email, usuario.nombre, 'Cambió su contraseña', '');

  return NextResponse.json({ ok: true });
})
