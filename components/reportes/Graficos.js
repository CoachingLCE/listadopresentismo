'use client';
import { useMemo, useRef, useState } from 'react';

// Colores reutilizados de los mismos tokens que ya usa toda la app para "presente" /
// "ausente" (ver COLOR_PRESENTISMO en lib/presentismoCalculo.js) — nunca se inventa una
// paleta nueva para los gráficos, así el significado de cada color es siempre el mismo
// en toda la aplicación.
const VERDE = 'rgb(var(--color-successText))';
const ROJO = 'rgb(var(--color-dangerText))';
const TEAL = 'rgb(var(--color-accentTeal))';
const GRIS = 'rgb(var(--color-border))';

const AMBAR = 'rgb(var(--color-warningText))';
const AZUL = 'rgb(var(--color-infoText))';
const MAGENTA = 'rgb(var(--color-accentMagenta))';
const NEUTRO = 'rgb(var(--color-textMuted))';

const UMBRAL_PRESENTISMO_BAJO = 70;

/** Barra apilada de distribución por estado (Presentes/Ausentes/Justificados/Asincrónicos/
 * CC/Bajas) — usa los mismos totales que ya calcula calcularResumenPresentismo, no inventa
 * categorías nuevas. Solo se muestran los segmentos que tienen datos (>0). */
export function DistribucionEstados({ resumen }) {
  const segmentos = [
    { key: 'totalPresentes', label: 'Presentes', color: VERDE },
    { key: 'totalAusentes', label: 'Ausentes', color: ROJO },
    { key: 'totalAusentesJustificados', label: 'Aus. justificados', color: AMBAR },
    { key: 'totalAsincronicos', label: 'Asincrónicos', color: AZUL },
    { key: 'totalCC', label: 'CC', color: MAGENTA },
    { key: 'totalBajasClase', label: 'Bajas', color: NEUTRO }
  ].map((s) => ({ ...s, valor: resumen[s.key] || 0 })).filter((s) => s.valor > 0);

  const total = segmentos.reduce((s, seg) => s + seg.valor, 0);
  if (total === 0) {
    return <p className="text-textMuted text-sm">Todavía no hay registros de asistencia para mostrar la distribución.</p>;
  }

  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden bg-bg" role="img" aria-label="Distribución de asistencia">
        {segmentos.map((s, i) => {
          const pct = (s.valor / total) * 100;
          return (
            <div
              key={s.key}
              className="flex items-center justify-center text-[10.5px] font-semibold text-white transition-all"
              style={{ width: `${pct}%`, backgroundColor: s.color, marginRight: i < segmentos.length - 1 ? 2 : 0 }}
              title={`${s.label}: ${s.valor} (${Math.round(pct)}%)`}
            >
              {pct >= 12 ? `${Math.round(pct)}%` : ''}
            </div>
          );
        })}
      </div>
      <div className="flex gap-x-4 gap-y-1.5 mt-2.5 text-xs text-textSec flex-wrap">
        {segmentos.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} /> {s.label} ({s.valor})
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barra apilada única: Presentes vs Ausentes (marcados), con leyenda directa abajo —
 * un solo par de valores, por eso no hace falta más que esta barra + su leyenda. */
export function BarraPresentesAusentes({ presentes, ausentes }) {
  const total = presentes + ausentes;
  if (total === 0) {
    return <p className="text-textMuted text-sm">Todavía no hay presentismo cargado en las ediciones filtradas.</p>;
  }
  const pctPresentes = (presentes / total) * 100;
  const pctAusentes = 100 - pctPresentes;
  const anchoPresentesLabel = pctPresentes >= 14; // solo etiqueta adentro si entra cómodo
  const anchoAusentesLabel = pctAusentes >= 14;

  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden bg-bg" role="img" aria-label={`${presentes} presentes, ${ausentes} ausentes`}>
        <div
          className="flex items-center justify-center text-[11px] font-semibold text-white transition-all"
          style={{ width: `${pctPresentes}%`, backgroundColor: VERDE, marginRight: ausentes > 0 ? 2 : 0 }}
          title={`Presentes: ${presentes} (${Math.round(pctPresentes)}%)`}
        >
          {anchoPresentesLabel ? `${Math.round(pctPresentes)}%` : ''}
        </div>
        <div
          className="flex items-center justify-center text-[11px] font-semibold text-white transition-all"
          style={{ width: `${pctAusentes}%`, backgroundColor: ROJO }}
          title={`Ausentes: ${ausentes} (${Math.round(pctAusentes)}%)`}
        >
          {anchoAusentesLabel ? `${Math.round(pctAusentes)}%` : ''}
        </div>
      </div>
      <div className="flex gap-4 mt-2.5 text-xs text-textSec">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: VERDE }} /> Presentes ({presentes})</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded-full inline-block" style={{ backgroundColor: ROJO }} /> Ausentes ({ausentes})</span>
      </div>
    </div>
  );
}

/** Barras horizontales: % de presentismo por edición, con línea de referencia en el
 * umbral de alerta (70%) para que se vea de un vistazo cuáles quedan por debajo. */
export function BarrasPorEdicion({ filas }) {
  const [hover, setHover] = useState(null);
  const conDato = filas.filter((f) => f.resumen.porcentajePresentismo !== null);

  if (conDato.length === 0) {
    return <p className="text-textMuted text-sm">Todavía no hay presentismo cargado en las ediciones filtradas.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        {/* línea de referencia del umbral de alerta */}
        <div
          className="absolute top-0 bottom-0 border-l border-dashed border-warningText/50 pointer-events-none"
          style={{ left: `${UMBRAL_PRESENTISMO_BAJO}%` }}
        />
        <div className="flex flex-col gap-2">
          {conDato.map((f) => {
            const pct = f.resumen.porcentajePresentismo;
            const bajo = pct < UMBRAL_PRESENTISMO_BAJO;
            const key = f.edicion.id;
            return (
              <div
                key={key}
                className="flex items-center gap-2.5 group"
                onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover((h) => (h === key ? null : h))}
              >
                <span className="text-xs text-textSec w-40 shrink-0 truncate" title={`${f.edicion.nombreCurso} — Edición ${f.edicion.numero}`}>
                  {f.edicion.nombreCurso} — Ed. {f.edicion.numero}
                </span>
                <div className="flex-1 h-4 bg-bg rounded-full relative">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: bajo ? ROJO : TEAL }}
                  />
                  {hover === key && (
                    <div className="absolute -top-8 left-0 bg-surface border border-border rounded-lg px-2 py-1 text-[11px] whitespace-nowrap shadow-lg z-10">
                      {f.resumen.totalPresentes} presentes · {f.resumen.totalAusentes} ausentes · {f.resumen.totalAusentesJustificados} justif.
                    </div>
                  )}
                </div>
                <span className={`text-xs font-semibold w-10 text-right shrink-0 ${bajo ? 'text-dangerText' : 'text-text'}`}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-textMuted">┊ línea punteada: umbral de alerta ({UMBRAL_PRESENTISMO_BAJO}%) — pasá el mouse por una barra para ver el detalle.</p>
    </div>
  );
}

/** Línea de evolución del % de presentismo a lo largo de las clases (agregado por
 * fecha entre todas las ediciones filtradas), con crosshair + tooltip al pasar el mouse. */
export function LineaEvolucion({ puntos }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const W = 760, H = 220, PAD_L = 34, PAD_R = 16, PAD_T = 14, PAD_B = 28;
  const anchoUtil = W - PAD_L - PAD_R;
  const altoUtil = H - PAD_T - PAD_B;

  const puntosValidos = useMemo(() => (puntos || []).filter((p) => p.porcentaje !== null), [puntos]);

  const coords = useMemo(() => {
    if (puntosValidos.length === 0) return [];
    return puntosValidos.map((p, i) => ({
      ...p,
      x: PAD_L + (puntosValidos.length === 1 ? anchoUtil / 2 : (i / (puntosValidos.length - 1)) * anchoUtil),
      y: PAD_T + altoUtil - (p.porcentaje / 100) * altoUtil
    }));
  }, [puntosValidos]);

  if (coords.length === 0) {
    return <p className="text-textMuted text-sm">Todavía no hay suficientes clases dadas para mostrar una evolución.</p>;
  }

  const lineaPath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${lineaPath} L${coords[coords.length - 1].x.toFixed(1)},${PAD_T + altoUtil} L${coords[0].x.toFixed(1)},${PAD_T + altoUtil} Z`;
  const yUmbral = PAD_T + altoUtil - (UMBRAL_PRESENTISMO_BAJO / 100) * altoUtil;

  function alMoverMouse(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRelativo = ((e.clientX - rect.left) / rect.width) * W;
    let mejorIdx = 0, mejorDist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - xRelativo);
      if (d < mejorDist) { mejorDist = d; mejorIdx = i; }
    });
    setHoverIdx(mejorIdx);
  }

  const activo = hoverIdx !== null ? coords[hoverIdx] : coords[coords.length - 1];
  const esUltimo = hoverIdx === null;

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseMove={alMoverMouse} onMouseLeave={() => setHoverIdx(null)}>
        {/* ejes Y recesivos */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = PAD_T + altoUtil - (v / 100) * altoUtil;
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={GRIS} strokeWidth="1" />
              <text x={PAD_L - 8} y={y + 3} textAnchor="end" fontSize="9" fill="rgb(var(--color-textMuted))">{v}%</text>
            </g>
          );
        })}
        {/* línea de referencia del umbral */}
        <line x1={PAD_L} x2={W - PAD_R} y1={yUmbral} y2={yUmbral} stroke="rgb(var(--color-warningText))" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />

        <path d={areaPath} fill={TEAL} opacity="0.1" />
        <path d={lineaPath} fill="none" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* crosshair */}
        {hoverIdx !== null && (
          <line x1={coords[hoverIdx].x} x2={coords[hoverIdx].x} y1={PAD_T} y2={PAD_T + altoUtil} stroke={GRIS} strokeWidth="1" />
        )}

        {/* punto final destacado (la etiqueta directa: el extremo) */}
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="4" fill={TEAL} stroke="rgb(var(--color-surface2))" strokeWidth="2" />
        {hoverIdx !== null && (
          <circle cx={coords[hoverIdx].x} cy={coords[hoverIdx].y} r="4" fill={TEAL} stroke="rgb(var(--color-surface2))" strokeWidth="2" />
        )}

        {/* etiqueta directa en el último punto */}
        <text x={coords[coords.length - 1].x} y={coords[coords.length - 1].y - 8} textAnchor="end" fontSize="10" fontWeight="600" fill="rgb(var(--color-text))">
          {coords[coords.length - 1].porcentaje}%
        </text>

        {/* algunas fechas en el eje X (primera, mitad, última) para no saturar */}
        {[0, Math.floor((coords.length - 1) / 2), coords.length - 1].filter((v, i, arr) => arr.indexOf(v) === i).map((i) => (
          <text key={i} x={coords[i].x} y={H - 8} textAnchor="middle" fontSize="9" fill="rgb(var(--color-textMuted))">
            {coords[i].fecha.slice(5)}
          </text>
        ))}
      </svg>

      {activo && (
        <div
          className="absolute bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg pointer-events-none"
          style={{
            left: `${Math.min(Math.max((activo.x / W) * 100, 12), 88)}%`,
            top: 4,
            transform: 'translateX(-50%)'
          }}
        >
          <p className="text-textMuted">{activo.fecha}{esUltimo ? ' (última clase)' : ''}</p>
          <p className="font-semibold text-text">{activo.porcentaje}% de presentismo</p>
          <p className="text-textMuted">{activo.presentes} presentes · {activo.ausentes} ausentes</p>
        </div>
      )}
    </div>
  );
}
