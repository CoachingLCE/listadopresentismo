import { verificarToken } from './sessionToken';
import { findUsuario } from './auth';

/**
 * Verifica el header Authorization: Bearer <token> de un request.
 * Devuelve el usuario ACTUAL (releído del Sheet, no lo que mandó el cliente)
 * o null si el token es inválido, vencido, el usuario no existe, está desactivado,
 * o la contraseña cambió después de que se emitió este token (sesión invalidada).
 */
export async function requireUsuario(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verificarToken(token);
  if (!payload) return null;

  const usuario = await findUsuario(payload.email);
  if (!usuario || !usuario.activo) return null;

  if (payload.passwordHash !== usuario.passwordHash) return null;

  return usuario;
}
