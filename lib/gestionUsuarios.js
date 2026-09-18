import { readSheet, appendRow, patchRow } from './sheets';
import { hashPassword } from './passwords';

const ROLES_VALIDOS = ['SuperAdmin', 'Coordinacion', 'Academico', 'Docente', 'Staff'];
const ROLES_RESERVADOS = ['SuperAdmin'];

/** Lista los usuarios sin exponer el PasswordHash. */
export async function listarUsuarios() {
  const usuarios = await readSheet('Usuarios');
  return usuarios.map((u) => ({
    email: u.Email,
    nombre: u.Nombre,
    roles: (u.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean),
    activo: u.Activo !== 'FALSE',
    tieneContrasena: !!u.PasswordHash,
    fechaCreacion: u.FechaCreacion || '',
    _rowIndex: u._rowIndex
  }));
}

function tocaRolesReservados(roles) {
  return (roles || []).some((r) => ROLES_RESERVADOS.includes(r));
}

/**
 * Valida si `actor` puede aplicar los `rolesDestino` a un usuario.
 * Solo un SuperAdmin puede crear/editar a otro SuperAdmin.
 */
export function puedeAsignarRoles(actor, rolesDestino, tienePermisoGestionarAdmins) {
  if (tocaRolesReservados(rolesDestino) && !tienePermisoGestionarAdmins(actor)) {
    return false;
  }
  return true;
}

export function rolesValidos(roles) {
  return Array.isArray(roles) && roles.length > 0 && roles.every((r) => ROLES_VALIDOS.includes(r));
}

export async function crearUsuario({ email, nombre, roles, password }) {
  await appendRow('Usuarios', {
    Email: email.trim(),
    Nombre: nombre.trim(),
    Roles: roles.join(', '),
    PasswordHash: password ? hashPassword(password) : '',
    Activo: 'TRUE',
    FechaCreacion: new Date().toISOString()
  });
}

export async function actualizarUsuario(rowIndex, cambios) {
  const patch = {};
  if (cambios.roles) patch.Roles = cambios.roles.join(', ');
  if (typeof cambios.activo === 'boolean') patch.Activo = cambios.activo ? 'TRUE' : 'FALSE';
  if (cambios.nuevaPassword) patch.PasswordHash = hashPassword(cambios.nuevaPassword);
  await patchRow('Usuarios', rowIndex, patch);
}

export async function buscarUsuarioPorEmail(email) {
  const usuarios = await readSheet('Usuarios');
  return usuarios.find((u) => (u.Email || '').trim().toLowerCase() === email.trim().toLowerCase()) || null;
}
