// Catálogo de cursos/formaciones de Presentismo ILCE — mismos cursos que ya se manejan
// en Cronograma ILCE / Salas Zoom, para que el nombre de cada uno sea consistente entre
// apps. Coaching Ontológico es el único con 48 clases divididas en 3 cuatrimestres de 16
// con receso de 2 semanas entre cada bloque — el resto tiene 16 clases corridas, una por
// semana, sin receso. Los cursos marcados "ondemand" no tienen una cadencia semanal fija:
// se crea la edición igual, pero las clases se cargan a mano en vez de generarse solas.
export const CURSOS = [
  { codigo: 'CO', nombre: 'Coaching Ontológico', totalClases: 48, ondemand: false },
  { codigo: 'CE', nombre: 'Coaching Educativo', totalClases: 16, ondemand: false },
  { codigo: 'CEQUI', nombre: 'Coaching de Equipos', totalClases: 16, ondemand: false },
  { codigo: 'CDEP', nombre: 'Coaching Deportivo', totalClases: 16, ondemand: false },
  { codigo: 'CV', nombre: 'Coaching Vocacional', totalClases: 16, ondemand: false },
  { codigo: 'OR', nombre: 'Oratoria', totalClases: 16, ondemand: false },
  { codigo: 'INMOB', nombre: 'Coaching Inmobiliario', totalClases: 12, ondemand: true },
  { codigo: 'COPY', nombre: 'Copywriting para redes sociales', totalClases: 8, ondemand: true },
  { codigo: 'FPF', nombre: 'Formación para formadores', totalClases: 10, ondemand: true }
];

// Identidad visual por curso — un color fijo por código (nunca reasignado dinámicamente),
// reutilizando los mismos tokens de marca que ya existen en toda la app (nada de paleta
// nueva). Con 9 cursos y 7 tonos "de marca" disponibles, dos pares se repiten — por eso
// el color SIEMPRE va acompañado del nombre del curso como texto, nunca solo del color.
export const CURSO_COLOR = {
  CO: { dot: 'bg-accentPurple', badge: 'bg-accentPurple/15 text-accentPurple', borde: 'border-l-accentPurple' },
  CE: { dot: 'bg-infoText', badge: 'bg-infoBg text-infoText', borde: 'border-l-infoText' },
  CEQUI: { dot: 'bg-successText', badge: 'bg-successBg text-successText', borde: 'border-l-successText' },
  CDEP: { dot: 'bg-warningText', badge: 'bg-warningBg text-warningText', borde: 'border-l-warningText' },
  CV: { dot: 'bg-accentTeal', badge: 'bg-accentTeal/15 text-accentTeal', borde: 'border-l-accentTeal' },
  OR: { dot: 'bg-accentMagenta', badge: 'bg-accentMagenta/15 text-accentMagenta', borde: 'border-l-accentMagenta' },
  INMOB: { dot: 'bg-accentPurple', badge: 'bg-accentPurple/15 text-accentPurple', borde: 'border-l-accentPurple' },
  COPY: { dot: 'bg-infoText', badge: 'bg-infoBg text-infoText', borde: 'border-l-infoText' },
  FPF: { dot: 'bg-accentTeal', badge: 'bg-accentTeal/15 text-accentTeal', borde: 'border-l-accentTeal' }
};
const COLOR_DEFAULT = { dot: 'bg-textMuted', badge: 'bg-surface text-textMuted', borde: 'border-l-border' };

export function colorCurso(codigo) {
  return CURSO_COLOR[codigo] || COLOR_DEFAULT;
}

export function cursoPorCodigo(codigo) {
  return CURSOS.find((c) => c.codigo === codigo) || null;
}

export function nombreCurso(codigo) {
  return cursoPorCodigo(codigo)?.nombre || codigo;
}

const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;

/**
 * Calcula el cuatrimestre (1/2/3) de una clase de Coaching Ontológico según su número
 * (1-48) — ver misma lógica en Cronograma ILCE (lib/salasLogic.js). Para el resto de los
 * cursos (16 clases, un solo bloque) no aplica: devuelve null.
 */
export function cuatrimestreDeClase(codigo, numeroClase) {
  const curso = cursoPorCodigo(codigo);
  if (!curso || curso.totalClases !== 48) return null;
  return Math.min(Math.ceil(numeroClase / 16), 3) || 1;
}

/**
 * Genera el calendario completo de una edición: un array de { numero, fecha, esReceso,
 * cuatrimestre } a partir de la fecha de la primera clase. Para Coaching Ontológico
 * intercala 2 semanas de receso después de la clase 16 y de la clase 32 (no cuentan
 * como clase, son informativas para el calendario). Para el resto, son totalClases
 * clases corridas, una por semana.
 */
export function generarCalendario(codigo, fechaInicioISO, totalClasesOverride) {
  const curso = cursoPorCodigo(codigo);
  const total = totalClasesOverride || curso?.totalClases || 16;
  const inicio = new Date(fechaInicioISO + 'T00:00:00');
  const clases = [];
  let fecha = new Date(inicio);

  if (curso && curso.totalClases === 48 && !totalClasesOverride) {
    let numero = 1;
    for (let bloque = 0; bloque < 3; bloque++) {
      for (let i = 0; i < 16; i++) {
        clases.push({ numero, fecha: isoDe(fecha), esReceso: false, cuatrimestre: bloque + 1 });
        numero++;
        fecha = new Date(fecha.getTime() + MS_SEMANA);
      }
      if (bloque < 2) {
        fecha = new Date(fecha.getTime() + 2 * MS_SEMANA);
      }
    }
  } else {
    for (let i = 1; i <= total; i++) {
      clases.push({ numero: i, fecha: isoDe(fecha), esReceso: false, cuatrimestre: null });
      fecha = new Date(fecha.getTime() + MS_SEMANA);
    }
  }
  return clases;
}

function isoDe(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fecha estimada de fin de cursada (última clase) a partir de la fecha de inicio. */
export function fechaFinEstimada(codigo, fechaInicioISO, totalClasesOverride) {
  const cal = generarCalendario(codigo, fechaInicioISO, totalClasesOverride);
  return cal.length ? cal[cal.length - 1].fecha : fechaInicioISO;
}
