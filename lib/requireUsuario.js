import { verificarToken } from './sessionToken';
import { findUsuario } from './auth';
import { puedeVerComoOtro } from './permisos';
import { leerDocentesCombinados } from './datosDocentes';

/**
 * Verifica el header Authorization: Bearer <token> de un request.
 * Devuelve el usuario ACTUAL (releído del Sheet, no lo que mandó el cliente)
 * o null si el token es inválido, vencido, el usuario no existe, está desactivado,
 * o la contraseña cambió después de que se emitió este token (sesión invalidada).
 *
 * "Ver como" (modo vista, solo lectura): si quien hace el pedido puede ver como otra
 * persona (SuperAdmin/Coordinación) y manda el header `X-Ver-Como` con un email, en un
 * GET le devolvemos el usuario OBJETIVO en vez del real — así toda la lógica de permisos
 * y de filtrado (qué ediciones ve, qué botones aparecen) funciona exactamente igual que
 * si esa persona estuviera logueada, sin tocar cada ruta. Nunca aplica a POST/PATCH/DELETE
 * (ahí siempre se usa el usuario real), así que un cambio nunca puede hacerse "como" otra
 * persona, aunque el cliente lo intente.
 */
export async function requireUsuario(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verificarToken(token);
  if (!payload) return null;

  const usuarioReal = await findUsuario(payload.email);
  if (!usuarioReal || !usuarioReal.activo) return null;

  if (payload.passwordHash !== usuarioReal.passwordHash) return null;

  const verComoEmail = (request.headers.get('x-ver-como') || '').trim().toLowerCase();
  if (verComoEmail && request.method === 'GET' && puedeVerComoOtro(usuarioReal)) {
    const objetivo = await resolverUsuarioVista(verComoEmail);
    if (objetivo) return { ...objetivo, _vistaComoReal: usuarioReal.email };
  }

  return usuarioReal;
}

/** Busca a la persona a "ver como": primero entre los usuarios con login (Usuarios),
 * y si no está ahí, en el roster de Docentes (la mayoría de los docentes no tienen
 * usuario propio) — a estos últimos se los trata como rol Docente. */
async function resolverUsuarioVista(email) {
  const usuario = await findUsuario(email);
  if (usuario && usuario.activo) return usuario;

  const docentes = await leerDocentesCombinados();
  const docente = docentes.find((d) => d.email === email);
  if (docente) return { email: docente.email, nombre: docente.nombre, roles: ['Docente'], activo: true };

  return null;
}
