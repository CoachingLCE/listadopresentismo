import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoVerReportes, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { leerEdiciones, filtrarEdicionesPorUsuario, leerClasesDeEdicion } from '../../../lib/datosEdiciones';
import { leerEstudiantesDeEdicion } from '../../../lib/datosEstudiantes';
import { leerPresentismoDeEdicion } from '../../../lib/datosPresentismo';
import { calcularResumenPresentismo, calcularAusentismoClase } from '../../../lib/presentismoCalculo';
import { nombreCurso } from '../../../lib/cursosLogic';

const UMBRAL_AUSENTISMO_CLASE = 50; // % de A sobre lo marcado en una clase puntual
const UMBRAL_BAJAS_EDICION = 30;    // % de estudiantes dados de baja en la edición
const UMBRAL_PRESENTISMO_BAJO = 70; // % de presentismo general de la edición

// GET /api/reportes -> { filas: [{ edicion, resumen, clasesDadas, clasesTotal }], alertas: [...] }
// Reporte general con métricas por edición (para SuperAdmin/Coordinación/Académico) y
// alertas automáticas de ausentismo por clase / bajas o presentismo bajo por edición.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerReportes(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const todas = await leerEdiciones();
  const ediciones = filtrarEdicionesPorUsuario(todas, usuario, esRolLimitadoAEdicionesPropias(usuario));
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

    // Alerta por clase: % de ausentismo de esa clase puntual.
    for (const clase of clasesDadas) {
      const registrosClase = presentismo.filter((p) => p.claseId === clase.id);
      const ausentismo = calcularAusentismoClase(registrosClase);
      if (ausentismo !== null && ausentismo >= UMBRAL_AUSENTISMO_CLASE) {
        alertas.push({
          nivel: 'clase',
          texto: `${etiqueta}: la clase #${clase.numero} (${clase.fecha}) tuvo un ${ausentismo}% de ausentismo.`,
          motivo: `Se prende porque el ausentismo de esa clase fue ≥ ${UMBRAL_AUSENTISMO_CLASE}%.`
        });
      }
    }

    // Alerta por edición: % de bajas.
    if (resumen.cantidadEstudiantes > 0 && resumen.porcentajeBajas >= UMBRAL_BAJAS_EDICION) {
      alertas.push({
        nivel: 'edicion',
        texto: `${etiqueta}: tiene un ${resumen.porcentajeBajas}% de bajas (${resumen.bajasEstudiantes} de ${resumen.cantidadEstudiantes} estudiantes).`,
        motivo: `Se prende porque el % de bajas de la edición es ≥ ${UMBRAL_BAJAS_EDICION}%.`
      });
    }

    // Alerta por edición: presentismo general bajo.
    if (resumen.porcentajePresentismo !== null && resumen.porcentajePresentismo < UMBRAL_PRESENTISMO_BAJO) {
      alertas.push({
        nivel: 'edicion',
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

  return NextResponse.json({ filas, alertas });
})
