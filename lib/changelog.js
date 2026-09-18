// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '0.3.2',
    fecha: '2026-09-18',
    cambios: [
      'El estado de la edición (Próxima/Activa/Finalizada) ya no depende de un valor cargado a mano: se calcula solo comparando las fechas de inicio y fin con la fecha de hoy. "Suspendida" sigue siendo manual (un botón Suspender/Reactivar). Se actualizó en Ediciones, Cargar asistencia, la ficha de la edición y Reportes.',
      'Listado de presentismo: el encabezado de cada clase ahora tiene jerarquía visual según su fecha — muy apagado a partir de los 30 días, tono intermedio entre 1 y 29 días, bien destacado (con "HOY") el día de hoy, y un tono distinto para las clases futuras.',
      'Al marcar "Baja" o "Asincrónico" en una clase puntual, el Estado general del estudiante se actualiza solo (antes había que cambiarlo aparte a mano). Una vez que el estudiante está en "Baja", los casilleros de clases nuevas quedan bloqueados — no tiene sentido seguir completando asistencia de alguien que ya se dio de baja (los casilleros ya cargados se pueden seguir corrigiendo).',
      'Se agregó más espacio debajo de la grilla del Listado de presentismo — quedaba demasiado pegada al borde inferior de la pantalla.',
      'Ediciones: SuperAdmin ahora puede borrar una edición completa (con sus clases, estudiantes y presentismo) desde un ícono 🗑 en cada tarjeta, con confirmación antes de borrar. Es irreversible.',
      'Seguimiento: se sacó el campo "Área" — ahora queda registrado solo quién hizo el registro (la persona logueada), sin tener que elegirlo a mano. El campo "Motivo" ahora se ve ordenado alfabéticamente y con un color fijo por motivo, tanto al cargar como en la lista de registros. Al abrir /seguimiento desde el link de un estudiante puntual, el título de la pantalla pasa a ser el nombre de ese estudiante.',
      'Nueva edición: los nombres de los programas/cursos ahora se ven en negrita en el selector.',
      'La pantalla de "Docentes" pasó a llamarse "Equipo docente" (en el menú y en el título de la pantalla).',
      'Equipo docente: SuperAdmin ahora puede crearle la contraseña de acceso al sistema a cada persona directamente desde su ficha del listado (sin ir a Accesos), o cambiársela si ya tenía una.',
      'Docentes y Staff: el listado ahora se muestra colapsado (solo el nombre) y se expande al hacer clic para ver el resto de la info; queda ordenado alfabéticamente; el encabezado dice "Listado" en vez de "Roster"; y al escribir un nombre que ya existe en el roster se avisa "duplicado".',
      'El botón de novedades (badge de versión) ahora se ve solo para SuperAdmin y Académico/Coordinación, y quedó ubicado arriba del botón de ayuda para que no se superpongan.',
      'La tarjeta institucional debajo del logo tiene una animación sutil de "encendido" de izquierda a derecha la primera vez que se ve.',
      'Se corrigió un error en Reportes que hacía referencia a un estado de edición que ya no existía (podía romper el filtro y el badge de estado en la tabla).'
    ]
  },
  {
    version: '0.3.1',
    fecha: '2026-09-18',
    cambios: [
      'Alertas automáticas por mail: todos los días se revisan las mismas alertas de Reportes (ausentismo ≥50% en una clase, bajas ≥30% o presentismo <70% en una edición) y se manda un solo mail con las nuevas a SuperAdmin/Coordinación/Académico. No repite un aviso ya mandado. Hace falta cargar GMAIL_USER, GMAIL_APP_PASSWORD y CRON_SECRET en Vercel, y crear la pestaña "AlertasEnviadas" en el Sheet — ver SETUP.md.'
    ]
  },
  {
    version: '0.3.0',
    fecha: '2026-09-18',
    cambios: [
      'Reportes: rediseño completo en un panel de análisis — filtros agrupados (curso, docente, estado, rango de fechas) con "Aplicar/Limpiar filtros" y chips de filtros activos, KPIs (estudiantes, presentes, ausentes, % de asistencia), gráficos (presentes vs. ausentes, evolución de asistencia, presentismo por edición) y exportación a Excel. La información y la lógica de alertas no cambiaron.',
      '"Seguimiento de Asistencia" (dentro de cada edición) ahora es un dashboard: tarjetas de indicadores con ícono y color por estado, anillo de % de presentismo, gráfico de distribución y de evolución. Se muestra un estado vacío claro cuando todavía no hay asistencia cargada.',
      '"Listado de presentismo" (grilla de cada edición): buscador de estudiante, filtro rápido por estado (Regular/Asincrónico/Baja/Cambio de edición), referencias de color, indicador lateral según el nivel de alerta y barra de % de asistencia por fila.',
      'Nueva edición: pantalla reorganizada en secciones (Información general, Fechas, Configuración) con validaciones junto a cada campo y un resumen antes de crear.',
      'Ediciones: cada curso tiene un color propio (badge + indicador lateral) para reconocerlo de un vistazo, y "Solo activas" ahora es un chip interactivo.',
      'Docentes y Staff: ahora se puede marcar el rol de cada persona (Docente y/o Staff) — los selectores de Docente y de Staff en Nueva edición y en la ficha de la edición ya usan ese rol en vez de mostrar a todo el roster en los dos lados. Importante: para que el rol se guarde en tu Google Sheet hace falta agregar una columna "Roles" en la pestaña "Docentes" (ver aviso más abajo).',
      'Cargar asistencia: acceso secundario "📊 Información de la edición" hacia la ficha de la edición elegida, y un estado "✓ Asistencia guardada" junto al título.',
      'La bajada institucional debajo del logo ahora es una tarjeta con ícono y texto más jerarquizado ("Acompañamos, observamos e intervenimos…").',
      'Se corrigió que el botón de ayuda y el badge de versión quedaban superpuestos en la esquina inferior — el badge de versión ahora va abajo a la izquierda.'
    ]
  },
  {
    version: '0.2.2',
    fecha: '2026-09-18',
    cambios: [
      'Historial rediseñado como en Seguimiento Lead Estudiante (/auditoria): cada usuario tiene un color propio (siempre el mismo), cada acción se agrupa por categoría con su color e ícono (Edición, Docente, Estudiante, Seguimiento, Usuario, Ingreso, Intento fallido) con chips para filtrar, más filtros de usuario, rango de fechas y búsqueda libre, y un botón para exportar a Excel.'
    ]
  },
  {
    version: '0.2.1',
    fecha: '2026-09-18',
    cambios: [
      'Rediseño visual completo de "Docentes y Staff": tarjetas con avatar de iniciales, los cursos ahora son chips en vez de checkboxes, buscador por nombre/email en el roster, y mejores estados hover/focus en botones e inputs. Es solo estético — no cambia qué datos se guardan ni cómo.'
    ]
  },
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
