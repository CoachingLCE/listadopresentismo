// Pasos del recorrido guiado ("❓ Necesito ayuda") para Presentismo ILCE.
// Cada paso: { id, pagina, selector, titulo, texto, accion }.
// `pagina` es la ruta donde vive el elemento (el tour navega solo si hace falta).
// `selector` es un data-tour puesto a propósito en las páginas de app/.

export const TOUR_PASOS = [
  {
    id: 'bienvenida',
    pagina: '/ediciones',
    selector: null,
    titulo: '¡Bienvenido a Presentismo ILCE!',
    texto: 'Acá llevás el presentismo de cada edición: quién dio clase, quién faltó, y un registro de seguimiento para intervenir a tiempo.'
  },
  {
    id: 'ediciones-buscar',
    pagina: '/ediciones',
    selector: '[data-tour="ediciones-buscar"]',
    titulo: 'Buscar una edición',
    texto: 'Escribí acá para filtrar las ediciones por curso o por nombre del docente.'
  },
  {
    id: 'ediciones-nueva',
    pagina: '/ediciones',
    selector: '[data-tour="ediciones-nueva"]',
    titulo: 'Crear una edición nueva',
    texto: 'Acá arrancás una edición: elegís el curso, la fecha de la primera clase y el docente — el calendario completo se genera solo.',
    accion: 'Visible solo para Coordinación/SuperAdmin.'
  },
  {
    id: 'nueva-edicion-form',
    pagina: '/nueva-edicion',
    selector: '[data-tour="nueva-edicion-form"]',
    titulo: 'Datos de la edición',
    texto: 'Elegí el curso (los "a demanda" te dejan poner la cantidad de clases a mano), la fecha de inicio, y el docente y staff asignados.'
  },
  {
    id: 'docentes-agregar',
    pagina: '/docentes',
    selector: '[data-tour="docentes-agregar"]',
    titulo: 'Agregar al roster',
    texto: 'Sumá un docente o staff nuevo con su nombre, email y los cursos que dicta — después vas a poder asignarlo a una edición.',
    accion: 'Visible solo para Coordinación/SuperAdmin.'
  },
  {
    id: 'estudiantes-buscar',
    pagina: '/estudiantes',
    selector: '[data-tour="estudiantes-buscar"]',
    titulo: 'Buscar un estudiante',
    texto: 'Encontrá a un estudiante por nombre en cualquier edición. Para cargar una lista nueva de estudiantes, entrá a la edición correspondiente.'
  },
  {
    id: 'carga-edicion',
    pagina: '/carga',
    selector: '[data-tour="carga-edicion"]',
    titulo: 'Cargar asistencia',
    texto: 'Elegí la edición y la clase, y marcá presente/ausente a cada estudiante — es la carga rápida de todos los días.'
  },
  {
    id: 'seguimiento-form',
    pagina: '/seguimiento',
    selector: '[data-tour="seguimiento-form"]',
    titulo: 'Registrar un seguimiento',
    texto: 'Dejá anotado acá cualquier incidencia o contacto con un estudiante (inasistencias, motivos, próximos pasos) para que quede en la app.',
    accion: 'Visible solo para Coordinación/SuperAdmin.'
  },
  {
    id: 'historial-titulo',
    pagina: '/historial',
    selector: '[data-tour="historial-titulo"]',
    titulo: 'Historial de cambios',
    texto: 'Acá queda registrada toda la actividad importante: ediciones creadas, presentismo cargado, seguimientos y cambios de usuarios.'
  },
  {
    id: 'accesos-nuevo',
    pagina: '/accesos',
    selector: '[data-tour="accesos-nuevo"]',
    titulo: 'Agregar una persona al sistema',
    texto: 'Cargá el email, nombre y rol (SuperAdmin, Coordinación, Académico, Docente o Staff) de quien necesite entrar — si no le ponés contraseña, la puede poner ella misma desde /setup-password.',
    accion: 'Visible solo para SuperAdmin/Coordinación.'
  },
  {
    id: 'reportes',
    pagina: '/reportes',
    selector: null,
    titulo: 'Reportes',
    texto: 'Comparación de presentismo entre ediciones, con chips para filtrar por curso y por fecha, y alertas automáticas cuando una clase tuvo mucho ausentismo o una edición tiene muchas bajas.',
    accion: 'Visible solo para SuperAdmin/Coordinación/Académico.'
  },
  {
    id: 'ver-como',
    pagina: '/ediciones',
    selector: '[data-tour="nav-ver-como"]',
    titulo: 'Ver como otra persona',
    texto: 'Elegí a un docente o a otra persona del sistema para ver exactamente qué pantallas y botones le aparecen a ella — es solo lectura, no se guarda nada mientras estás en este modo.',
    accion: 'Visible solo para SuperAdmin/Coordinación.'
  }
];

export const TAREAS_AYUDA = [
  { id: 'crear-edicion', label: 'Quiero crear una edición nueva', pasoInicial: 'ediciones-nueva' },
  { id: 'cargar-asistencia', label: 'Quiero cargar la asistencia de una clase', pasoInicial: 'carga-edicion' },
  { id: 'agregar-docente', label: 'Quiero agregar un docente al roster', pasoInicial: 'docentes-agregar' },
  { id: 'registrar-seguimiento', label: 'Quiero registrar un seguimiento', pasoInicial: 'seguimiento-form' },
  { id: 'agregar-persona', label: 'Quiero dar de alta a una persona nueva', pasoInicial: 'accesos-nuevo' },
  { id: 'ver-reportes', label: 'Quiero ver los reportes generales', pasoInicial: 'reportes' },
  { id: 'ver-como-otro', label: 'Quiero ver la app como otra persona', pasoInicial: 'ver-como' }
];
