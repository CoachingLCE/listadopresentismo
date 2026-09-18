'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerReportes } from '../../lib/permisos';
import { CURSOS } from '../../lib/cursosLogic';

const chipCls = (activo) =>
  `text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
    activo
      ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
      : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
  }`;

export default function ReportesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [filas, setFilas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');

  const [cursosFiltro, setCursosFiltro] = useState([]); // vacío = todos
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
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

  const filasFiltradas = useMemo(() => {
    let r = filas;
    if (cursosFiltro.length > 0) r = r.filter((f) => cursosFiltro.includes(f.edicion.curso));
    if (desde) r = r.filter((f) => f.edicion.fechaInicio >= desde);
    if (hasta) r = r.filter((f) => f.edicion.fechaInicio <= hasta);
    const orden2 = [...r].sort((a, b) => {
      const va = a.resumen[orden.campo] ?? a.edicion[orden.campo] ?? 0;
      const vb = b.resumen[orden.campo] ?? b.edicion[orden.campo] ?? 0;
      if (typeof va === 'string') return orden.asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return orden.asc ? va - vb : vb - va;
    });
    return orden2;
  }, [filas, cursosFiltro, desde, hasta, orden]);

  const alertasVisibles = useMemo(() => {
    const etiquetas = new Set(filasFiltradas.map((f) => `${f.edicion.nombreCurso} — Edición ${f.edicion.numero}`));
    return alertas.filter((a) => [...etiquetas].some((e) => a.texto.startsWith(e)));
  }, [alertas, filasFiltradas]);

  const kpis = useMemo(() => {
    const n = filasFiltradas.length;
    const totalEstudiantes = filasFiltradas.reduce((s, f) => s + f.resumen.cantidadEstudiantes, 0);
    const conPresentismo = filasFiltradas.filter((f) => f.resumen.porcentajePresentismo !== null);
    const promPresentismo = conPresentismo.length
      ? Math.round(conPresentismo.reduce((s, f) => s + f.resumen.porcentajePresentismo, 0) / conPresentismo.length)
      : null;
    const promBajas = n ? Math.round(filasFiltradas.reduce((s, f) => s + f.resumen.porcentajeBajas, 0) / n) : 0;
    return { n, totalEstudiantes, promPresentismo, promBajas };
  }, [filasFiltradas]);

  function toggleCurso(codigo) {
    setCursosFiltro((prev) => prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]);
  }

  function ordenarPor(campo) {
    setOrden((prev) => prev.campo === campo ? { campo, asc: !prev.asc } : { campo, asc: true });
  }

  function presetFecha(dias) {
    if (dias === null) { setDesde(''); setHasta(''); return; }
    const hoy = new Date();
    const inicio = new Date(hoy.getTime() - dias * 24 * 60 * 60 * 1000);
    setDesde(inicio.toISOString().slice(0, 10));
    setHasta('');
  }

  if (cargando || !usuario || !puede) return null;

  const columnas = [
    { campo: 'nombreCurso', label: 'Curso', deEdicion: true },
    { campo: 'porcentajePresentismo', label: '% Presentismo' },
    { campo: 'totalPresentes', label: 'Presentes' },
    { campo: 'totalAusentes', label: 'Ausentes' },
    { campo: 'totalAusentesJustificados', label: 'Aus. Justif.' },
    { campo: 'totalAsincronicos', label: 'Asincr.' },
    { campo: 'totalCC', label: 'CC' },
    { campo: 'cantidadEstudiantes', label: 'Estudiantes' },
    { campo: 'porcentajeBajas', label: '% Bajas' }
  ];

  return (
    <div className="max-w-[1300px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Reportes</h1>
      <p className="text-textSec text-sm mb-5">Comparación de presentismo entre ediciones, con alertas automáticas de ausentismo y bajas.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {alertasVisibles.length > 0 && (
        <div className="bg-warningBg border border-border rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2 text-warningText">⚠ Alertas ({alertasVisibles.length})</h2>
          <div className="flex flex-col gap-2">
            {alertasVisibles.map((a, i) => (
              <div key={i} className="text-xs bg-bg border border-border rounded-lg px-3 py-2">
                <p className="text-warningText font-medium">{a.texto}</p>
                <p className="text-textMuted mt-0.5">{a.motivo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-surface2 border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{kpis.n}</p>
              <p className="text-[11px] text-textMuted">Ediciones</p>
            </div>
            <div className="bg-surface2 border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{kpis.totalEstudiantes}</p>
              <p className="text-[11px] text-textMuted">Estudiantes</p>
            </div>
            <div className="bg-successBg border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-successText">{kpis.promPresentismo === null ? '—' : `${kpis.promPresentismo}%`}</p>
              <p className="text-[11px] text-textMuted">Presentismo prom.</p>
            </div>
            <div className="bg-dangerBg border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-dangerText">{kpis.promBajas}%</p>
              <p className="text-[11px] text-textMuted">Bajas prom.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <button className={chipCls(cursosFiltro.length === 0)} onClick={() => setCursosFiltro([])}>Todos los cursos</button>
            {cursosPresentes.map((c) => (
              <button key={c.codigo} className={chipCls(cursosFiltro.includes(c.codigo))} onClick={() => toggleCurso(c.codigo)}>
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <button className={chipCls(!desde && !hasta)} onClick={() => presetFecha(null)}>Todas las fechas</button>
            <button className={chipCls(false)} onClick={() => presetFecha(30)}>Últimos 30 días</button>
            <button className={chipCls(false)} onClick={() => presetFecha(90)}>Últimos 3 meses</button>
            <span className="text-textMuted text-xs mx-1">o elegí un rango:</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs" />
            <span className="text-textMuted text-xs">a</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs" />
          </div>

          {filasFiltradas.length === 0 ? (
            <p className="text-textMuted text-sm">No hay ediciones que coincidan con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="border-collapse text-xs w-full">
                <thead>
                  <tr className="bg-surface2">
                    {columnas.map((c) => (
                      <th
                        key={c.campo}
                        onClick={() => ordenarPor(c.deEdicion ? c.campo : c.campo)}
                        className="text-left px-3 py-2 border-b border-border font-semibold cursor-pointer whitespace-nowrap hover:text-accentTeal"
                      >
                        {c.label} {orden.campo === c.campo ? (orden.asc ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.map((f) => (
                    <tr key={f.edicion.id} className="odd:bg-bg even:bg-surface2/40">
                      <td className="px-3 py-2 border-b border-border font-medium whitespace-nowrap">
                        {f.edicion.nombreCurso} — Ed. {f.edicion.numero}
                      </td>
                      <td className="px-3 py-2 border-b border-border font-semibold">
                        {f.resumen.porcentajePresentismo === null ? '—' : `${f.resumen.porcentajePresentismo}%`}
                      </td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.totalPresentes}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.totalAusentes}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.totalAusentesJustificados}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.totalAsincronicos}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.totalCC}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.cantidadEstudiantes}</td>
                      <td className="px-3 py-2 border-b border-border">{f.resumen.porcentajeBajas}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
