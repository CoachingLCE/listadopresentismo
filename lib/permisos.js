// Roles posibles: 'SuperAdmin', 'Coordinacion', 'Academico', 'Docente', 'Staff'
// Un usuario tiene un único rol (selección única, no combinable), igual que en
// Cronograma ILCE.

function tieneAlguno(usuario, roles) {
  if (!usuario || !usuario.roles) return false;
  return usuario.roles.some((r) => roles.includes(r));
}

// Ver la app (cualquier pantalla que le corresponda a su rol) — todos los roles logueados.
export function tienePermisoVer(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion', 'Academico', 'Docente', 'Staff']);
}

// SuperAdmin: ve y edita absolutamente todo, sin excepción.
export function esSuperAdmin(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin']);
}

// Gestión académica de fondo: crear ediciones, asignar docente/staff a una edición
// (de los ya existentes en el roster), cargar/editar el listado de estudiantes, cambiar
// estados, ver reportes institucionales completos. NO incluye agregar/sacar docentes
// del roster general (eso es un permiso aparte, más restrictivo).
export function tienePermisoGestionAcademica(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion', 'Academico']);
}

// Agregar o sacar un docente/staff del roster general del sistema (alta/baja de
// personas, no asignación a una edición puntual). Reservado a Coordinación y SuperAdmin
// — Académico puede asignar a alguien ya cargado, pero no dar de alta o baja a nadie.
export function tienePermisoGestionRosterDocentes(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion']);
}

// Cargar/modificar presentismo de una clase — Docente y Staff (solo de las ediciones
// que tengan asignadas), y también los roles de gestión, por si hace falta cargar en
// ausencia del docente.
export function tienePermisoCargarAsistencia(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion', 'Academico', 'Docente', 'Staff']);
}

// Escribir observaciones/notas sobre un estudiante en el listado de una edición —
// el Docente sí puede, el Staff (según lo pedido) NO.
export function tienePermisoEscribirNotasEstudiante(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion', 'Academico', 'Docente']);
}

// Historial de acciones (auditoría) — solo SuperAdmin y Coordinación pueden verlo.
export function tienePermisoVerHistorial(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion']);
}

// Gestión de accesos (altas de usuarios con login, roles, contraseñas) — reservado a
// SuperAdmin, igual que en Cronograma ILCE.
export function tienePermisoAccesos(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin']);
}

export function tienePermisoGestionarAdmins(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin']);
}

// Un docente/staff solo ve y opera sobre las ediciones que tenga asignadas (activas o
// no) — nunca el listado completo de todas las formaciones. Esta función se usa para
// filtrar qué ediciones le llegan al front, comparando por email de docente/staff
// asignado en cada edición.
export function esRolLimitadoAEdicionesPropias(usuario) {
  return tieneAlguno(usuario, ['Docente', 'Staff']);
}

// Reportes generales (KPIs y comparación entre ediciones, con alertas de ausentismo y
// bajas) — mismos roles que gestión académica: SuperAdmin, Coordinación y Académico.
export function tienePermisoVerReportes(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion', 'Academico']);
}

// "Ver como": previsualizar la app en modo solo lectura como si fuera otra persona
// (por ejemplo un Docente puntual), para revisar qué ve cada rol. Reservado a
// SuperAdmin y Coordinación.
export function puedeVerComoOtro(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin', 'Coordinacion']);
}
