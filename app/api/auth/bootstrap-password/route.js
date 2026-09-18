import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { readSheet, patchRow } from '../../../../lib/sheets';
import { hashPassword } from '../../../../lib/passwords';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/auth/bootstrap-password -> { email, password, bootstrapKey }
// Solo sirve para asignar la contraseña de un usuario que TODAVÍA no tiene una.
export const POST = conManejo(async (request) => {
  const body = await request.json();
  const { email, password, bootstrapKey } = body;

  const claveEsperada = process.env.SETUP_BOOTSTRAP_KEY;
  if (!claveEsperada) {
    return NextResponse.json(
      { error: 'Falta configurar SETUP_BOOTSTRAP_KEY en las variables de entorno.' },
      { status: 500 }
    );
  }
  if (!bootstrapKey || bootstrapKey !== claveEsperada) {
    return NextResponse.json({ error: 'Llave de arranque incorrecta.' }, { status: 403 });
  }
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Faltan datos, o la contraseña tiene menos de 8 caracteres.' },
      { status: 400 }
    );
  }

  const usuarios = await readSheet('Usuarios');
  const match = usuarios.find(
    (u) => (u.Email || '').trim().toLowerCase() === email.trim().toLowerCase()
  );
  if (!match) {
    return NextResponse.json(
      { error: 'No existe ese email en la pestaña Usuarios. Agregalo primero (Email, Nombre, Roles, Activo=TRUE).' },
      { status: 404 }
    );
  }
  if (match.PasswordHash) {
    return NextResponse.json(
      { error: 'Ese usuario ya tiene una contraseña asignada. Para cambiarla hay que hacerlo desde el panel de Accesos, no con este endpoint.' },
      { status: 409 }
    );
  }

  await patchRow('Usuarios', match._rowIndex, { PasswordHash: hashPassword(password) });
  await registrarAccion(email, match.Nombre, 'Asignó su primera contraseña', '');

  return NextResponse.json({ ok: true });
})
