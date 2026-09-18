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
  { codigo: 'COPY', nombre: 'Copywriting para redes sociales', totalClases: 8, ondemand: true }
];

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
