// Lógica PURA de presentismo (sin tocar Sheets) — separada de datosPresentismo.js para
// poder importarla también desde componentes de cliente (esos NO pueden importar nada que
// dependa de 'googleapis', que es una librería solo de Node/servidor).

// Estados posibles de una clase puntual para un estudiante (ver leyenda del mockup):
// P Presente · A Ausente · AJ Ausente Justificado · Asinc Asincrónico (de esa clase) ·
// SI Sesión individual · CC se incorporó/cursa distinto (inscribió después) · Baja
export const ESTADOS_PRESENTISMO = ['P', 'A', 'AJ', 'Asinc', 'SI', 'CC', 'Baja'];

export const COLOR_PRESENTISMO = {
  P: 'bg-successBg text-successText',
  A: 'bg-dangerBg text-dangerText',
  AJ: 'bg-warningBg text-warningText',
  Asinc: 'bg-infoBg text-infoText',
  SI: 'bg-infoBg text-infoText',
  CC: 'bg-surface text-textMuted',
  Baja: 'bg-surface text-textMuted'
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
