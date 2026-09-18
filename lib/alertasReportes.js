// Lógica de alertas de Reportes, compartida entre /api/reportes (que las muestra en
// pantalla) y el cron de emails automáticos (que las manda por mail) — así las dos vías
// usan EXACTAMENTE las mismas reglas y nunca se desalinean.
import { leerEdiciones, leerClasesDeEdicion } from './datosEdiciones';
import { leerEstudiantesDeEdicion } from './datosEstudiantes';
import { leerPresentismoDeEdicion } from './datosPresentismo';
import { calcularResumenPresentismo, calcularAusentismoClase } from './presentismoCalculo';
import { nombreCurso } from './cursosLogic';

export const UMBRAL_AUSENTISMO_CLASE = 50; // % de A sobre lo marcado en una clase puntual
export const UMBRAL_BAJAS_EDICION = 30;    // % de estudiantes dados de baja en la edición
export const UMBRAL_PRESENTISMO_BAJO = 70; // % de presentismo general de la edición

/**
 * Recalcula el reporte completo (todas las ediciones, sin filtrar por usuario — el cron de
 * emails corre "como sistema", no como una persona logueada) y devuelve { filas, alertas }.
 * Cada alerta incluye una `clave` estable para poder deduplicar envíos de email: las de
 * clase son "para siempre" (esa clase puntual ya pasó y no cambia), las de edición incluyen
 * la fecha del día para poder volver a avisar si el problema sigue al otro día.
 */
export async function calcularReporteCompleto() {
  const ediciones = await leerEdiciones();
  const hoyISO = new Date().toISOString().slice(0, 10);
  const alertas = [];

  const filas = await Promise.all(ediciones.map(async (edicion) => {
    const [clases, estudiantes, presentismo] = await Promise.all([
      leerClasesDeEdicion(edicion.id),
      leerEstudiantesDeEdicion(edicion.id),
      leerPresentismoDeEdicion(edicion.id)
    ]);
    const clasesDadas = clases.filter((c) => c.fecha && c.fecha <= hoyISO);
    const resumen = calcularResumenPresentismo(estudiantes, presentismo, clasesDadas);
    const etiqueta = `${nombreCurso(edicion.curso)} — Edición ${edicion.numero}`;

    for (const clase of clasesDadas) {
      const registrosClase = presentismo.filter((p) => p.claseId === clase.id);
      const ausentismo = calcularAusentismoClase(registrosClase);
      if (ausentismo !== null && ausentismo >= UMBRAL_AUSENTISMO_CLASE) {
        alertas.push({
          nivel: 'clase',
          clave: `clase:${edicion.id}:${clase.id}`,
          texto: `${etiqueta}: la clase #${clase.numero} (${clase.fecha}) tuvo un ${ausentismo}% de ausentismo.`,
          motivo: `Se prende porque el ausentismo de esa clase fue ≥ ${UMBRAL_AUSENTISMO_CLASE}%.`
        });
      }
    }

    if (resumen.cantidadEstudiantes > 0 && resumen.porcentajeBajas >= UMBRAL_BAJAS_EDICION) {
      alertas.push({
        nivel: 'edicion',
        clave: `bajas:${edicion.id}:${hoyISO}`,
        texto: `${etiqueta}: tiene un ${resumen.porcentajeBajas}% de bajas (${resumen.bajasEstudiantes} de ${resumen.cantidadEstudiantes} estudiantes).`,
        motivo: `Se prende porque el % de bajas de la edición es ≥ ${UMBRAL_BAJAS_EDICION}%.`
      });
    }

    if (resumen.porcentajePresentismo !== null && resumen.porcentajePresentismo < UMBRAL_PRESENTISMO_BAJO) {
      alertas.push({
        nivel: 'edicion',
        clave: `presentismo:${edicion.id}:${hoyISO}`,
        texto: `${etiqueta}: tiene un presentismo general del ${resumen.porcentajePresentismo}%, por debajo de lo esperado.`,
        motivo: `Se prende porque el % de presentismo de la edición es < ${UMBRAL_PRESENTISMO_BAJO}%.`
      });
    }

    return {
      edicion: { ...edicion, nombreCurso: nombreCurso(edicion.curso) },
      resumen,
      clasesDadas: clasesDadas.length,
      clasesTotal: clases.length
    };
  }));

  return { filas, alertas };
}
