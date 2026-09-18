// Lógica PURA de presentismo (sin tocar Sheets) — separada de datosPresentismo.js para
// poder importarla también desde componentes de cliente (esos NO pueden importar nada que
// dependa de 'googleapis', que es una librería solo de Node/servidor).

// Estados posibles de una clase puntual para un estudiante (ver leyenda del mockup):
// P Presente · A Ausente · AJ Ausente Justificado · Asinc Asincrónico (de esa clase) ·
// SI Sesión individual · CC se incorporó/cursa distinto (inscribió después) · Baja
export const ESTADOS_PRESENTISMO = ['P', 'A', 'AJ', 'Asinc', 'SI', 'CC', 'Baja'];

// Texto completo de cada código — se usa como tooltip (title) en la leyenda y en los
// filtros, para que al pasar el mouse se vea qué significa cada uno.
export const LABEL_PRESENTISMO = {
  P: 'Presente',
  A: 'Ausente',
  AJ: 'Ausente justificado',
  Asinc: 'Asincrónico (cursó esa clase de forma asincrónica)',
  SI: 'Sesión individual',
  CC: 'Se incorporó/cursa distinto (se inscribió después del inicio)',
  Baja: 'Baja (dejó de cursar)'
};

// Mismos colores que el Estado general del estudiante (ver COLOR_ESTADO en lib/alertas.js)
// para los códigos que significan lo mismo: Asinc = Asincrónico, Baja = Baja, CC (cambió
// de curso/se incorporó distinto) = Cambio de edición. Así arriba (chips/badges de Estado)
// y abajo (las marcas puntuales por clase) se ven con el mismo color para el mismo concepto.
export const COLOR_PRESENTISMO = {
  P: 'bg-successBg text-successText',
  A: 'bg-dangerBg text-dangerText',
  AJ: 'bg-accentTeal/15 text-accentTeal',
  Asinc: 'bg-warningBg text-warningText',
  SI: 'bg-accentPurple/15 text-accentPurple',
  CC: 'bg-infoBg text-infoText',
  Baja: 'bg-dangerBg text-dangerText'
};

// Misma paleta que COLOR_PRESENTISMO pero en hex directo — hace falta para el <select>
// nativo de "Listado de presentismo": el navegador no respeta clases de Tailwind por
// <option>, y si el color se aplica solo al <select> pinta TODAS las opciones de la lista
// abierta igual (mismo problema que con el <select> de Motivo en Seguimiento).
export const COLOR_PRESENTISMO_HEX = {
  P: { bg: '#0f2e22', text: '#4ade80' },
  A: { bg: '#331414', text: '#f87171' },
  AJ: { bg: '#0e332f', text: '#2dd4bf' },
  Asinc: { bg: '#33210b', text: '#fbbf24' },
  SI: { bg: '#241a3d', text: '#a78bfa' },
  CC: { bg: '#0f1f33', text: '#60a5fa' },
  Baja: { bg: '#331414', text: '#f87171' }
};

/** % de presentismo de un estudiante sobre las clases YA DADAS (con fecha pasada) de su
 * edición — P y AJ cuentan como presente; A no; el resto (Asinc/SI/CC/Baja/sin cargar)
 * no entra en el cálculo porque no es comparable a una ausencia real. */
export function calcularPorcentaje(registros, clasesDadas) {
  const idsClasesDadas = new Set(clasesDadas.map((c) => c.id));
  const relevantes = registros.filter((r) => idsClasesDadas.has(r.claseId) && ['P', 'A', 'AJ'].includes(r.estado));
  if (relevantes.length === 0) return null;
  const presentes = relevantes.filter((r) => r.estado === 'P' || r.estado === 'AJ').length;
  return Math.round((presentes / relevantes.length) * 100);
}

/**
 * Resumen de asistencia de una edición completa (el bloque "Seguimiento de Asistencia"
 * que se muestra en la ficha de la edición y en Reportes): totales por estado sobre las
 * clases ya dadas, cantidad de estudiantes, % de bajas y % de presentismo general.
 */
export function calcularResumenPresentismo(estudiantes, registros, clasesDadas) {
  const idsClasesDadas = new Set((clasesDadas || []).map((c) => c.id));
  const relevantes = (registros || []).filter((r) => idsClasesDadas.has(r.claseId));
  const contar = (estado) => relevantes.filter((r) => r.estado === estado).length;

  const totalPresentes = contar('P');
  const totalAusentes = contar('A');
  const totalAusentesJustificados = contar('AJ');
  const totalAsincronicos = contar('Asinc');
  const totalCC = contar('CC');
  const totalBajasClase = contar('Baja');

  const cantidadEstudiantes = (estudiantes || []).length;
  const bajasEstudiantes = (estudiantes || []).filter((e) => e.estado === 'Baja').length;
  const porcentajeBajas = cantidadEstudiantes ? Math.round((bajasEstudiantes / cantidadEstudiantes) * 100) : 0;

  const basePresentismo = totalPresentes + totalAusentes + totalAusentesJustificados;
  const porcentajePresentismo = basePresentismo
    ? Math.round(((totalPresentes + totalAusentesJustificados) / basePresentismo) * 100)
    : null;

  return {
    totalPresentes, totalAusentes, totalAusentesJustificados, totalAsincronicos, totalCC, totalBajasClase,
    cantidadEstudiantes, bajasEstudiantes, porcentajeBajas, porcentajePresentismo
  };
}

/** % de ausentismo (A / marcados) de UNA clase puntual — para las alertas de Reportes. */
export function calcularAusentismoClase(registrosDeLaClase) {
  const marcados = (registrosDeLaClase || []).filter((r) => ['P', 'A', 'AJ'].includes(r.estado));
  if (marcados.length === 0) return null;
  const ausentes = marcados.filter((r) => r.estado === 'A').length;
  return Math.round((ausentes / marcados.length) * 100);
}

/**
 * Desglose por clase (una fila por clase ya dada) de una edición — la base del gráfico
 * de "Evolución de asistencia" en Reportes. No agrega nada que no exista ya: son los
 * mismos registros de Presentismo que arma calcularResumenPresentismo, solo que acá sin
 * sumarizar entre clases.
 */
export function agruparPresentismoPorClase(clasesDadas, registros) {
  return (clasesDadas || []).map((clase) => {
    const deLaClase = (registros || []).filter((r) => r.claseId === clase.id);
    const contar = (estado) => deLaClase.filter((r) => r.estado === estado).length;
    const presentes = contar('P');
    const ausentes = contar('A');
    const ausentesJustificados = contar('AJ');
    const base = presentes + ausentes + ausentesJustificados;
    const porcentaje = base ? Math.round(((presentes + ausentesJustificados) / base) * 100) : null;
    return { claseId: clase.id, numero: clase.numero, fecha: clase.fecha, presentes, ausentes, ausentesJustificados, porcentaje };
  });
}
