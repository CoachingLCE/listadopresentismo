import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { puedeVerComoOtro } from '../../../lib/permisos';
import { listarUsuarios } from '../../../lib/gestionUsuarios';
import { leerDocentesCombinados } from '../../../lib/datosDocentes';

// Lista de personas que se pueden usar en "Ver como" — usuarios con login (menos otros
// SuperAdmin, para no poder "verse como" alguien con más permisos) + el roster de
// Docentes/Staff que todavía no tiene usuario propio.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!puedeVerComoOtro(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const [usuarios, docentes] = await Promise.all([listarUsuarios(), leerDocentesCombinados()]);

  const deUsuarios = usuarios
    .filter((u) => u.activo !== false && !(u.roles || []).includes('SuperAdmin'))
    .map((u) => ({ email: u.email.toLowerCase(), nombre: u.nombre, roles: u.roles }));

  const emailsYaListados = new Set(deUsuarios.map((p) => p.email));
  const deDocentes = docentes
    .filter((d) => !emailsYaListados.has(d.email))
    .map((d) => ({ email: d.email, nombre: d.nombre, roles: ['Docente'] }));

  const personas = [...deUsuarios, ...deDocentes].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return NextResponse.json({ personas });
})
