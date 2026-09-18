import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoVerHistorial } from '../../../lib/permisos';
import { leerHistorialCompleto } from '../../../lib/datosHistorial';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerHistorial(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const historial = await leerHistorialCompleto();
  return NextResponse.json({ historial });
})
