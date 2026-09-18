// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '0.2.0',
    fecha: '2026-09-18',
    cambios: [
      'Botón "❓ Necesito ayuda" con un recorrido guiado por toda la app (o por una tarea puntual: crear edición, cargar asistencia, agregar docente, etc.).',
      'La bajada de "listado de presentismo…" ahora va debajo del logo, como una frase institucional, en vez de un cartel en la pantalla de Ediciones.',
      'Nuevo curso: Formación para formadores (a demanda, como Coaching Inmobiliario y Copywriting).',
      '"Ver como": SuperAdmin y Coordinación pueden previsualizar la app tal cual la ve otra persona (por ejemplo un docente puntual) desde un selector arriba a la derecha — es de solo lectura, no se puede guardar nada mientras está activo.',
      'Nuevo bloque "Seguimiento de Asistencia" en la ficha de cada edición: totales de presentes, ausentes, ausentes justificados, asincrónicos, CC y bajas, más cantidad de estudiantes y % de bajas y de presentismo.',
      'Nueva sección "Reportes" (SuperAdmin/Coordinación/Académico): compara todas las ediciones con chips para filtrar por curso y por fecha, tabla ordenable, y alertas automáticas cuando una clase tuvo mucho ausentismo o una edición tiene muchas bajas o presentismo bajo.',
      'Botón "🧪 Cargar edición de ejemplo" en Ediciones: crea una edición de Coaching Ontológico con 10 estudiantes de prueba y presentismo variado ya cargado, para ver de una cómo se ve todo (colores, resumen, alertas) sin cargar nada a mano.',
      'En Docentes, "Agregar al roster" ahora dice "Agregar docente al listado".'
    ]
  },
  {
    version: '0.1.1',
    fecha: '2026-09-18',
    cambios: [
      'Se agregó el logo oficial de Instituto ILCE (estaba roto porque los archivos de imagen no se habían subido al repositorio).',
      'Se agregó una bajada explicando el propósito del listado de presentismo en la pantalla de Ediciones.'
    ]
  },
  {
    version: '0.1.0',
    fecha: '2026-09-18',
    cambios: [
      'Primera versión: login y roles (SuperAdmin, Coordinación, Académico, Docente, Staff), Ediciones (listado, detalle con grilla de presentismo por clase, nueva edición con generador automático de calendario), Docentes, Estudiantes (búsqueda + estado + observaciones), Carga rápida de asistencia, Seguimiento (registro de incidencias) e Historial de acciones.'
    ]
  }
];
