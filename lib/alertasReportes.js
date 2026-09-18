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

/**
 * Arma el asunto/HTML/texto plano del mail-resumen de alertas — usado tanto por el cron
 * que las manda de verdad (api/cron/alertas, ahora una vez por semana) como por la
 * pantalla "Emails" que las previsualiza aunque el envío automático todavía no esté
 * configurado. El diseño (header con degradé + tarjeta blanca) sigue el mismo estilo que
 * el mail de Bienvenida de Seguimiento Lead Estudiante, para que se vea igual de prolijo.
 */
export function construirDigestAlertas(alertas) {
  const cantidad = alertas.length;
  const asunto = `⚠ Presentismo ILCE — Resumen semanal (${cantidad} alerta${cantidad === 1 ? '' : 's'})`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f7;padding:24px 12px;margin:0;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e5ef;">
        <div style="background:linear-gradient(135deg,#7c3aed,#c026d3);padding:26px 32px;">
          <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;opacity:.85">Instituto</p>
          <p style="margin:2px 0 0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">ILCE</p>
        </div>
        <div style="padding:28px 32px;">
          <h2 style="margin:0 0 6px;color:#111111;font-size:17px;">⚠ Resumen semanal de alertas</h2>
          <p style="margin:0 0 18px;color:#666666;font-size:13px;">Se detectaron ${cantidad} situación(es) nueva(s) en Reportes esta semana:</p>
          ${alertas.map((a) => `
            <div style="background:#f7f5ff;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
              <p style="margin:0 0 4px;color:#222222;font-size:13.5px;font-weight:600;">${a.texto}</p>
              <p style="margin:0;color:#888888;font-size:12px;">${a.motivo}</p>
            </div>
          `).join('')}
          <p style="margin:22px 0 0;color:#999999;font-size:11.5px;">Este es un aviso automático (los viernes a la mañana) — entrá a Reportes en la app para ver el detalle completo.</p>
        </div>
      </div>
    </div>
  `;
  const text = alertas.map((a) => `${a.texto}\n${a.motivo}`).join('\n\n');
  return { asunto, html, text };
}
