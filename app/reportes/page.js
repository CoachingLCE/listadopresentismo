'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerReportes } from '../../lib/permisos';
import { CURSOS, nombreCurso, colorCurso } from '../../lib/cursosLogic';
import { estadoCalculado, LABEL_ESTADO_EDICION, BADGE_ESTADO_EDICION, ESTADOS_EDICION_CALCULADOS } from '../../lib/edicionesEstadoCliente';
import { BarraPresentesAusentes, BarrasPorEdicion, LineaEvolucion } from '../../components/reportes/Graficos';

const chipCls = (activo) =>
  `text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
    activo
      ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
      : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
  }`;

const FILTROS_VACIOS = { cursos: [], docente: '', estado: '', desde: '', hasta: '' };

/** Agrupa el desglose por clase (ya viene calculado por edición desde la API) en un solo
 * eje de fechas, sumando entre todas las ediciones filtradas — no inventa ningún dato: son
 * los mismos registros de presentismo, solo reagregados por fecha en vez de por edición. */
function evolucionPorFecha(filas) {
  const mapa = new Map();
  filas.forEach((f) => {
    (f.porClase || []).forEach((c) => {
      if (!c.fecha) return;
      const acc = mapa.get(c.fecha) || { fecha: c.fecha, presentes: 0, ausentes: 0, justificados: 0 };
      acc.presentes += c.presentes;
      acc.ausentes += c.ausentes;
      acc.justificados += c.ausentesJustificados;
      mapa.set(c.fecha, acc);
    });
  });
  return Array.from(mapa.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((a) => {
      const base = a.presentes + a.ausentes + a.justificados;
      return {
        fecha: a.fecha, presentes: a.presentes, ausentes: a.ausentes,
        porcentaje: base ? Math.round(((a.presentes + a.justificados) / base) * 100) : null
      };
    });
}

export default function ReportesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [filas, setFilas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  // Filtros "borrador" (lo que se está tocando) vs. "aplicados" (lo que realmente filtra la
  // pantalla) — así el usuario arma varios cambios y los aplica de una sola vez.
  const [borrador, setBorrador] = useState(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS);
  const [orden, setOrden] = useState({ campo: 'porcentajePresentismo', asc: true });

  const puede = usuario ? tienePermisoVerReportes(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !puede)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && puede) cargar();
  }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/reportes');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar el reporte.'); return; }
      setFilas(data.filas);
      setAlertas(data.alertas);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoDatos(false);
    }
  }

  const cursosPresentes = useMemo(
    () => CURSOS.filter((c) => filas.some((f) => f.edicion.curso === c.codigo)),
    [filas]
  );
  const docentesPresentes = useMemo(
    () => [...new Set(filas.map((f) => f.edicion.docenteNombre).filter(Boolean))].sort(),
    [filas]
  );

  const filasFiltradas = useMemo(() => {
    let r = filas;
    if (aplicados.cursos.length > 0) r = r.filter((f) => aplicados.cursos.includes(f.edicion.curso));
    if (aplicados.docente) r = r.filter((f) => f.edicion.docenteNombre === aplicados.docente);
    if (aplicados.estado) r = r.filter((f) => estadoCalculado(f.edicion) === aplicados.estado);
    if (aplicados.desde) r = r.filter((f) => f.edicion.fechaInicio >= aplicados.desde);
    if (aplicados.hasta) r = r.filter((f) => f.edicion.fechaInicio <= aplicados.hasta);
    return [...r].sort((a, b) => {
      const va = a.resumen[orden.campo] ?? a.edicion[orden.campo] ?? 0;
      const vb = b.resumen[orden.campo] ?? b.edicion[orden.campo] ?? 0;
      if (typeof va === 'string') return orden.asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return orden.asc ? va - vb : vb - va;
    });
  }, [filas, aplicados, orden]);

  const alertasVisibles = useMemo(() => {
    const etiquetas = new Set(filasFiltradas.map((f) => `${f.edicion.nombreCurso} — Edición ${f.edicion.numero}`));
    return alertas.filter((a) => [...etiquetas].some((e) => a.texto.startsWith(e)));
  }, [alertas, filasFiltradas]);

  const kpis = useMemo(() => {
    const n = filasFiltradas.length;
    const totalEstudiantes = filasFiltradas.reduce((s, f) => s + f.resumen.cantidadEstudiantes, 0);
    const totalPresentes = filasFiltradas.reduce((s, f) => s + f.resumen.totalPresentes, 0);
    const totalAusentes = filasFiltradas.reduce((s, f) => s + f.resumen.totalAusentes, 0);
    const totalJustificados = filasFiltradas.reduce((s, f) => s + f.resumen.totalAusentesJustificados, 0);
    const base = totalPresentes + totalAusentes + totalJustificados;
    const pctAsistencia = base ? Math.round(((totalPresentes + totalJustificados) / base) * 100) : null;
    return { n, totalEstudiantes, totalPresentes, totalAusentes, pctAsistencia };
  }, [filasFiltradas]);

  const puntosEvolucion = useMemo(() => evolucionPorFecha(filasFiltradas), [filasFiltradas]);

  const chipsActivos = useMemo(() => {
    const chips = [];
    aplicados.cursos.forEach((c) => chips.push({ tipo: 'curso', valor: c, label: nombreCurso(c) }));
    if (aplicados.docente) chips.push({ tipo: 'docente', valor: aplicados.docente, label: `Docente: ${aplicados.docente}` });
    if (aplicados.estado) chips.push({ tipo: 'estado', valor: aplicados.estado, label: `Estado: ${aplicados.estado}` });
    if (aplicados.desde) chips.push({ tipo: 'desde', valor: aplicados.desde, label: `Desde ${aplicados.desde}` });
    if (aplicados.hasta) chips.push({ tipo: 'hasta', valor: aplicados.hasta, label: `Hasta ${aplicados.hasta}` });
    return chips;
  }, [aplicados]);

  function quitarChip(chip) {
    setAplicados((prev) => {
      const siguiente = { ...prev };
      if (chip.tipo === 'curso') siguiente.cursos = prev.cursos.filter((c) => c !== chip.valor);
      else if (chip.tipo === 'docente') siguiente.docente = '';
      else if (chip.tipo === 'estado') siguiente.estado = '';
      else if (chip.tipo === 'desde') siguiente.desde = '';
      else if (chip.tipo === 'hasta') siguiente.hasta = '';
      setBorrador(siguiente);
      return siguiente;
    });
  }

  function toggleCursoBorrador(codigo) {
    setBorrador((prev) => ({
      ...prev,
      cursos: prev.cursos.includes(codigo) ? prev.cursos.filter((c) => c !== codigo) : [...prev.cursos, codigo]
    }));
  }

  function aplicarFiltros() {
    setAplicados(borrador);
  }
  function limpiarFiltros() {
    setBorrador(FILTROS_VACIOS);
    setAplicados(FILTROS_VACIOS);
  }

  function ordenarPor(campo) {
    setOrden((prev) => prev.campo === campo ? { campo, asc: !prev.asc } : { campo, asc: true });
  }

  async function exportar() {
    setExportando(true);
    try {
      const XLSX = await import('xlsx');
      const filasExport = filasFiltradas.map((f) => ({
        Curso: f.edicion.nombreCurso,
        Edición: f.edicion.numero,
        Estado: LABEL_ESTADO_EDICION[estadoCalculado(f.edicion)] || f.edicion.estado,
        Docente: f.edicion.docenteNombre || '',
        '% Presentismo': f.resumen.porcentajePresentismo ?? '',
        Presentes: f.resumen.totalPresentes,
        Ausentes: f.resumen.totalAusentes,
        'Aus. Justif.': f.resumen.totalAusentesJustificados,
        Asincr: f.resumen.totalAsincronicos,
        CC: f.resumen.totalCC,
        Estudiantes: f.resumen.cantidadEstudiantes,
        '% Bajas': f.resumen.porcentajeBajas
      }));
      const hoja = XLSX.utils.json_to_sheet(filasExport);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Reportes');
      XLSX.writeFile(libro, `reportes-presentismo-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportando(false);
    }
  }

  if (cargando || !usuario || !puede) return null;

  const columnas = [
    { campo: 'nombreCurso', label: 'Curso', deEdicion: true },
    { campo: 'porcentajePresentismo', label: '% Presentismo', num: true },
    { campo: 'totalPresentes', label: 'Presentes', num: true },
    { campo: 'totalAusentes', label: 'Ausentes', num: true },
    { campo: 'totalAusentesJustificados', label: 'Aus. Justif.', num: true },
    { campo: 'totalAsincronicos', label: 'Asincr.', num: true },
    { campo: 'totalCC', label: 'CC', num: true },
    { campo: 'cantidadEstudiantes', label: 'Estudiantes', num: true },
    { campo: 'porcentajeBajas', label: '% Bajas', num: true }
  ];

  return (
    <div className="max-w-[1300px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Reportes</h1>
      <p className="text-textSec text-sm mb-5">Panel de análisis del presentismo: comparación entre ediciones, evolución en el tiempo y alertas automáticas.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoDatos ? (
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-10 w-full bg-surface2 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface2 rounded-xl" />)}
          </div>
          <div className="h-64 w-full bg-surface2 rounded-2xl" />
        </div>
      ) : filas.length === 0 ? (
        <p className="text-textMuted text-sm bg-surface2 border border-border rounded-2xl p-5">Todavía no hay ediciones para reportar.</p>
      ) : (
        <>
          {/* ---------- Filtros ---------- */}
          <div className="bg-surface2 border border-border rounded-2xl p-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-textSec block mb-1 font-medium">Curso</label>
                <div className="flex gap-1.5 flex-wrap">
                  <button className={chipCls(borrador.cursos.length === 0)} onClick={() => setBorrador((p) => ({ ...p, cursos: [] }))}>Todos</button>
                  {cursosPresentes.map((c) => (
                    <button key={c.codigo} className={chipCls(borrador.cursos.includes(c.codigo))} onClick={() => toggleCursoBorrador(c.codigo)}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1 font-medium">Docente</label>
                <select
                  value={borrador.docente} onChange={(e) => setBorrador((p) => ({ ...p, docente: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="">Todos</option>
                  {docentesPresentes.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1 font-medium">Estado de la edición</label>
                <select
                  value={borrador.estado} onChange={(e) => setBorrador((p) => ({ ...p, estado: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="">Todos</option>
                  {ESTADOS_EDICION_CALCULADOS.map((s) => <option key={s} value={s}>{LABEL_ESTADO_EDICION[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-textSec block mb-1 font-medium">Rango de fechas (inicio de edición)</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={borrador.desde} onChange={(e) => setBorrador((p) => ({ ...p, desde: e.target.value }))} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs w-full" />
                  <span className="text-textMuted text-xs">a</span>
                  <input type="date" value={borrador.hasta} onChange={(e) => setBorrador((p) => ({ ...p, hasta: e.target.value }))} className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs w-full" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={aplicarFiltros} className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-xs font-semibold">Aplicar filtros</button>
              <button onClick={limpiarFiltros} className="bg-transparent text-textSec border border-border rounded-lg px-3 py-2 text-xs">Limpiar filtros</button>
              <button
                onClick={exportar} disabled={exportando}
                className="ml-auto text-textMuted text-xs underline hover:text-textSec disabled:opacity-50"
              >
                {exportando ? 'Exportando…' : 'Exportar ↓'}
              </button>
            </div>
            {chipsActivos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                {chipsActivos.map((chip) => (
                  <span key={`${chip.tipo}-${chip.valor}`} className="text-[11px] bg-bg border border-border rounded-full pl-2.5 pr-1.5 py-1 flex items-center gap-1.5">
                    {chip.label}
                    <button onClick={() => quitarChip(chip)} className="text-textMuted hover:text-dangerText">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ---------- Alertas (subdued) ---------- */}
          {alertasVisibles.length > 0 && (
            <div className="bg-surface2 border border-border border-l-[3px] border-l-warningText rounded-2xl p-4 mb-5">
              <h2 className="text-xs font-semibold mb-2 text-textSec">⚠ Alertas automáticas ({alertasVisibles.length})</h2>
              <div className="flex flex-col gap-1.5">
                {alertasVisibles.map((a, i) => (
                  <div key={i} className="text-xs bg-bg border border-border rounded-lg px-3 py-2">
                    <p className="text-warningText font-medium">{a.texto}</p>
                    <p className="text-textMuted mt-0.5">{a.motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filasFiltradas.length === 0 ? (
            <p className="text-textMuted text-sm bg-surface2 border border-border rounded-2xl p-5">No hay ediciones que coincidan con estos filtros — probá ajustarlos o limpiarlos.</p>
          ) : (
            <>
              {/* ---------- KPIs ---------- */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-surface2 border border-border rounded-xl p-3">
                  <p className="text-lg font-bold">{kpis.totalEstudiantes}</p>
                  <p className="text-[11px] text-textMuted">Total de estudiantes</p>
                </div>
                <div className="bg-surface2 border border-border rounded-xl p-3">
                  <p className="text-lg font-bold text-successText">{kpis.totalPresentes}</p>
                  <p className="text-[11px] text-textMuted">Presentes</p>
                </div>
                <div className="bg-surface2 border border-border rounded-xl p-3">
                  <p className="text-lg font-bold text-dangerText">{kpis.totalAusentes}</p>
                  <p className="text-[11px] text-textMuted">Ausentes</p>
                </div>
                <div className="bg-surface2 border border-border rounded-xl p-3">
                  <p className="text-lg font-bold">{kpis.pctAsistencia === null ? '—' : `${kpis.pctAsistencia}%`}</p>
                  <p className="text-[11px] text-textMuted">Porcentaje de asistencia</p>
                </div>
              </div>

              {/* ---------- Gráficos ---------- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-surface2 border border-border rounded-2xl p-4">
                  <p className="text-xs font-semibold text-textSec mb-3">Presentes vs. ausentes</p>
                  <BarraPresentesAusentes presentes={kpis.totalPresentes} ausentes={kpis.totalAusentes} />
                </div>
                <div className="bg-surface2 border border-border rounded-2xl p-4">
                  <p className="text-xs font-semibold text-textSec mb-3">Evolución de asistencia</p>
                  <LineaEvolucion puntos={puntosEvolucion} />
                </div>
                <div className="bg-surface2 border border-border rounded-2xl p-4 lg:col-span-2">
                  <p className="text-xs font-semibold text-textSec mb-3">Presentismo por edición / curso</p>
                  <BarrasPorEdicion filas={filasFiltradas} />
                </div>
              </div>

              {/* ---------- Tabla ---------- */}
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="border-collapse text-xs w-full">
                  <thead>
                    <tr className="bg-surface2">
                      {columnas.map((c) => (
                        <th
                          key={c.campo}
                          onClick={() => ordenarPor(c.campo)}
                          className={`px-3 py-2.5 border-b border-border font-semibold cursor-pointer whitespace-nowrap hover:text-accentTeal ${c.num ? 'text-right' : 'text-left'}`}
                        >
                          {c.label} {orden.campo === c.campo ? (orden.asc ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((f) => {
                      const color = colorCurso(f.edicion.curso);
                      const bajo = f.resumen.porcentajePresentismo !== null && f.resumen.porcentajePresentismo < 70;
                      return (
                        <tr key={f.edicion.id} className="odd:bg-bg even:bg-surface2/40 hover:bg-accentTeal/5 transition-colors">
                          <td className="px-3 py-2.5 border-b border-border font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                              <span>{f.edicion.nombreCurso} — Ed. {f.edicion.numero}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${BADGE_ESTADO_EDICION[estadoCalculado(f.edicion)] || 'bg-surface text-textMuted'}`}>
                                {LABEL_ESTADO_EDICION[estadoCalculado(f.edicion)] || f.edicion.estado}
                              </span>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 border-b border-border text-right font-semibold ${f.resumen.porcentajePresentismo === null ? 'text-textMuted' : bajo ? 'text-dangerText' : 'text-successText'}`}>
                            {f.resumen.porcentajePresentismo === null ? '—' : `${f.resumen.porcentajePresentismo}%`}
                          </td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.totalPresentes}</td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.totalAusentes}</td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.totalAusentesJustificados}</td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.totalAsincronicos}</td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.totalCC}</td>
                          <td className="px-3 py-2.5 border-b border-border text-right">{f.resumen.cantidadEstudiantes}</td>
                          <td className={`px-3 py-2.5 border-b border-border text-right ${f.resumen.porcentajeBajas >= 30 ? 'text-dangerText font-semibold' : ''}`}>{f.resumen.porcentajeBajas}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
