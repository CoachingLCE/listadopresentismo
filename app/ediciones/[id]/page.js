'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoCargarAsistencia, tienePermisoEscribirNotasEstudiante, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { nombreCurso, colorCurso } from '../../../lib/cursosLogic';
import { ESTADOS_PRESENTISMO, LABEL_PRESENTISMO, COLOR_PRESENTISMO, COLOR_PRESENTISMO_HEX, calcularPorcentaje, calcularResumenPresentismo, agruparPresentismoPorClase } from '../../../lib/presentismoCalculo';
import { calcularAlerta, COLOR_ALERTA, COLOR_ESTADO } from '../../../lib/alertas';
import { ESTADOS_ESTUDIANTE } from '../../../lib/estudiantesCliente';
import { estadoCalculado, LABEL_ESTADO_EDICION, BADGE_ESTADO_EDICION } from '../../../lib/edicionesEstadoCliente';
import { DistribucionEstados, LineaEvolucion } from '../../../components/reportes/Graficos';

// Jerarquía visual de fechas en la grilla: pasadas hace 30+ días (apagado/gris — historial),
// pasadas hace 1-29 días (tono secundario), hoy (la más destacada, con chip "HOY") y futuras
// (tono distinto, sutil). Se aplica solo al encabezado de cada columna, no a toda la fila.
function estiloFechaClase(fechaISO, hoyISO) {
  if (!fechaISO) return { clase: 'text-textMuted', esHoy: false };
  const dias = Math.round((new Date(hoyISO + 'T00:00:00') - new Date(fechaISO + 'T00:00:00')) / (24 * 60 * 60 * 1000));
  if (dias === 0) return { clase: 'text-accentPurple font-bold', esHoy: true, fondo: 'bg-accentPurple/10' };
  if (dias > 0 && dias < 30) return { clase: 'text-textSec font-medium', esHoy: false };
  if (dias >= 30) return { clase: 'text-textMuted', esHoy: false };
  return { clase: 'text-infoText', esHoy: false }; // futura
}

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

const ICONO_INDICADOR = {
  totalPresentes: { icono: '🟢', label: 'Presentes', bg: 'bg-successBg', text: 'text-successText' },
  totalAusentes: { icono: '🔴', label: 'Ausentes', bg: 'bg-dangerBg', text: 'text-dangerText' },
  totalAusentesJustificados: { icono: '🟡', label: 'Aus. justificados', bg: 'bg-warningBg', text: 'text-warningText' },
  totalAsincronicos: { icono: '🔵', label: 'Asincrónicos', bg: 'bg-infoBg', text: 'text-infoText' },
  totalCC: { icono: '🟣', label: 'CC', bg: 'bg-accentMagenta/15', text: 'text-accentMagenta' },
  totalBajasClase: { icono: '⚫', label: 'Bajas', bg: 'bg-surface', text: 'text-textMuted' }
};

const FILTROS_ESTADO_ESTUDIANTE = [
  { valor: '', label: 'Todos', icono: '', titulo: 'Mostrar todos los estudiantes, sin filtrar por estado.' },
  { valor: 'Regular', label: 'Regular', icono: '🟢', titulo: 'Estudiantes que están cursando con normalidad.' },
  { valor: 'Asincronico', label: 'Asincrónico', icono: '🟡', titulo: 'Estudiantes que están cursando de forma asincrónica.' },
  { valor: 'Baja', label: 'Baja', icono: '🔴', titulo: 'Estudiantes que dejaron de cursar.' },
  { valor: 'CambioEdicion', label: 'Cambio edición', icono: '🔵', titulo: 'Estudiantes que se incorporaron o cursan distinto (por ejemplo, se inscribieron después del inicio).' }
];

function AnilloPresentismo({ pct }) {
  if (pct === null) {
    return (
      <div className="w-14 h-14 rounded-full border-4 border-border flex items-center justify-center text-xs text-textMuted font-semibold shrink-0">—</div>
    );
  }
  const color = pct >= 70 ? 'rgb(var(--color-successText))' : 'rgb(var(--color-dangerText))';
  const circ = 2 * Math.PI * 24;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
        <circle cx="28" cy="28" r="24" fill="none" stroke="rgb(var(--color-border))" strokeWidth="5" />
        <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">{pct}%</div>
    </div>
  );
}

export default function EdicionDetallePage() {
  const { id } = useParams();
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [datos, setDatos] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [docentes, setDocentes] = useState([]);
  const [textoBulk, setTextoBulk] = useState('');
  const [cargandoBulk, setCargandoBulk] = useState(false);
  const [estudianteAbierto, setEstudianteAbierto] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [dashboardAbierto, setDashboardAbierto] = useState(true);

  const gestion = usuario ? tienePermisoGestionAcademica(usuario) : false;
  const puedeCargar = usuario ? tienePermisoCargarAsistencia(usuario) : false;
  const puedeNotas = usuario ? tienePermisoEscribirNotasEstudiante(usuario) : false;

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) { cargarDetalle(); if (gestion) cargarDocentes(); }
  }, [usuario, id]);

  async function cargarDetalle() {
    setCargandoDatos(true);
    setError('');
    try {
      const res = await fetchAutenticado(`/api/ediciones/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setDatos(data);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoDatos(false);
    }
  }

  async function cargarDocentes() {
    try {
      const res = await fetchAutenticado('/api/docentes');
      const data = await res.json();
      if (res.ok) setDocentes(data.docentes);
    } catch {}
  }

  async function guardarEdicion(cambios) {
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado(`/api/ediciones/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje('Guardado.');
      cargarDetalle();
    } catch {
      setError('Error de conexión.');
    }
  }

  async function cargarEstudiantesBulk(e) {
    e.preventDefault();
    const nombres = textoBulk.split('\n').map((n) => n.trim()).filter(Boolean);
    if (nombres.length === 0) return;
    setCargandoBulk(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/estudiantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edicionId: id, nombres })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`${data.cantidad} estudiantes cargados.`);
      setTextoBulk('');
      cargarDetalle();
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoBulk(false);
    }
  }

  async function marcarPresentismo(estudianteId, claseId, estado) {
    // Optimista: actualiza en pantalla antes de que vuelva la respuesta. Ojo: NO se recarga
    // toda la pantalla acá (antes se hacía un cargarDetalle() completo para "Baja"/"Asinc",
    // que tira abajo toda la tabla al esqueleto de carga y da la sensación de que el click
    // "no tomó" o se perdió el scroll horizontal). En vez de eso, replicamos en el estado
    // local exactamente la misma regla que aplica el servidor (ver /api/presentismo):
    // "Baja" o "Asinc" en una clase puntual también actualiza el Estado general del
    // estudiante, y una "Baja" ya cargada nunca se pisa con un "Asinc" posterior.
    setDatos((prev) => {
      if (!prev) return prev;
      const otras = prev.presentismo.filter((p) => !(p.estudianteId === estudianteId && p.claseId === claseId));
      const presentismo = [...otras, { estudianteId, claseId, edicionId: id, estado, notas: '' }];
      let estudiantes = prev.estudiantes;
      if (estado === 'Baja' || estado === 'Asinc') {
        const nuevoEstado = estado === 'Baja' ? 'Baja' : 'Asincronico';
        estudiantes = prev.estudiantes.map((e) =>
          e.id === estudianteId && e.estado !== 'Baja' && e.estado !== nuevoEstado
            ? { ...e, estado: nuevoEstado }
            : e
        );
      }
      return { ...prev, presentismo, estudiantes };
    });
    try {
      await fetchAutenticado('/api/presentismo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteId, claseId, edicionId: id, estado })
      });
    } catch {
      setError('No se pudo guardar ese casillero — probá de nuevo.');
    }
  }

  async function actualizarEstudiante(estudianteId, cambios) {
    setError('');
    try {
      const res = await fetchAutenticado(`/api/estudiantes/${estudianteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      cargarDetalle();
    } catch {
      setError('Error de conexión.');
    }
  }

  const hoyISO = new Date().toISOString().slice(0, 10);
  const clasesDadas = useMemo(() => (datos?.clases || []).filter((c) => c.fecha && c.fecha <= hoyISO), [datos, hoyISO]);

  function registrosDe(estudianteId) {
    return (datos?.presentismo || []).filter((p) => p.estudianteId === estudianteId);
  }

  // Docente: solo roster con rol "Docente" y que dicta este curso. Staff: solo roster con
  // rol "Staff", sin filtrar por curso (mismo criterio que en Nueva edición).
  const docentesDelCurso = useMemo(
    () => (datos ? docentes.filter((d) => (d.roles || ['Docente']).includes('Docente') && d.cursos.includes(datos.edicion.curso)) : []),
    [datos, docentes]
  );
  const staffDisponible = useMemo(
    () => docentes.filter((d) => (d.roles || ['Docente']).includes('Staff')),
    [docentes]
  );

  const resumen = useMemo(
    () => (datos ? calcularResumenPresentismo(datos.estudiantes, datos.presentismo, clasesDadas) : null),
    [datos, clasesDadas]
  );

  const porClase = useMemo(
    () => (datos ? agruparPresentismoPorClase(clasesDadas, datos.presentismo) : []),
    [datos, clasesDadas]
  );

  const puntosEvolucion = useMemo(
    () => porClase.map((c) => ({ fecha: c.fecha, porcentaje: c.porcentaje, presentes: c.presentes, ausentes: c.ausentes })),
    [porClase]
  );

  const estudiantesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos?.estudiantes || [])
      .filter((e) => !q || e.nombre.toLowerCase().includes(q))
      .filter((e) => !filtroEstado || e.estado === filtroEstado);
  }, [datos, busqueda, filtroEstado]);

  if (cargando || !usuario || cargandoDatos) {
    return (
      <div className="max-w-[1300px] mx-auto px-6 pt-10">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-4 w-40 bg-surface2 rounded" />
          <div className="h-6 w-72 bg-surface2 rounded" />
          <div className="h-32 w-full bg-surface2 rounded-2xl mt-4" />
          <div className="h-48 w-full bg-surface2 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (error && !datos) return <div className="max-w-[1300px] mx-auto px-6 pt-10 text-dangerText text-sm">{error}</div>;
  if (!datos) return null;

  const { edicion, clases, estudiantes } = datos;
  const color = colorCurso(edicion.curso);
  const hayAsistenciaCargada = (datos.presentismo || []).length > 0;
  const estado = estadoCalculado(edicion, hoyISO);

  return (
    <div className="max-w-[1300px] mx-auto px-6 pb-24 pt-10">
      <Link href="/ediciones" className="text-textMuted text-xs underline">← Volver a ediciones</Link>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>{nombreCurso(edicion.curso)}</span>
        <h1 className="text-xl">Edición {edicion.numero}</h1>
        <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ${BADGE_ESTADO_EDICION[estado] || 'bg-surface text-textMuted'}`}>
          {LABEL_ESTADO_EDICION[estado] || estado}
        </span>
      </div>
      <p className="text-textSec text-sm mb-5 mt-1">{edicion.fechaInicio} → {edicion.fechaFin} · {clases.length} clases</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      {gestion && (
        <div className="bg-surface2 border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="text-xs text-textSec block mb-1">Docente</label>
            <select defaultValue={edicion.docenteEmail} onChange={(e) => guardarEdicion({ docenteEmail: e.target.value })} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {docentesDelCurso.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs text-textSec block mb-1">Staff</label>
            <select defaultValue={edicion.staffEmail} onChange={(e) => guardarEdicion({ staffEmail: e.target.value })} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {staffDisponible.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs text-textSec block mb-1">
              Estado <span className="text-textMuted font-normal">(se calcula solo según las fechas)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2 py-1.5 rounded-lg font-semibold ${BADGE_ESTADO_EDICION[estado] || 'bg-surface text-textMuted'}`}>
                {LABEL_ESTADO_EDICION[estado] || estado}
              </span>
              {estado === 'Suspendida' ? (
                <button type="button" onClick={() => guardarEdicion({ estado: 'Activa' })} className={btnSecCls}>Reactivar edición</button>
              ) : (
                <button type="button" onClick={() => guardarEdicion({ estado: 'Suspendida' })} className={btnSecCls}>Suspender edición</button>
              )}
            </div>
          </div>
        </div>
      )}

      {gestion && (
        <details className="bg-surface2 border border-border rounded-2xl p-4 mb-6">
          <summary className="text-sm font-semibold cursor-pointer">➕ Cargar estudiantes (pegar lista, uno por línea)</summary>
          <form onSubmit={cargarEstudiantesBulk} className="mt-3 flex flex-col gap-2.5">
            <textarea value={textoBulk} onChange={(e) => setTextoBulk(e.target.value)} rows={6} placeholder={'Juan Pérez\nMaría García\n…'} className={inputCls} />
            <button type="submit" disabled={cargandoBulk} className={`${btnCls} self-start`}>{cargandoBulk ? 'Cargando…' : 'Cargar estudiantes'}</button>
          </form>
        </details>
      )}

      {/* ---------- Listado de Presentismo ---------- */}
      {estudiantes.length === 0 ? (
        <p className="text-textMuted text-sm">Todavía no hay estudiantes cargados en esta edición.</p>
      ) : (
        <div className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-sm font-semibold">Listado de presentismo</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar estudiante…"
                type="text" name="filtro-estudiantes" autoComplete="off" data-1p-ignore data-lpignore="true"
                className="bg-surface2 border border-border rounded-lg px-3 py-1.5 text-xs w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {FILTROS_ESTADO_ESTUDIANTE.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltroEstado(f.valor)}
                title={f.titulo}
                className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                  filtroEstado === f.valor
                    ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
                    : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
                }`}
              >
                {f.icono} {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-3 text-[10.5px] text-textMuted items-center">
            <span className="font-semibold text-textSec">Referencias:</span>
            {ESTADOS_PRESENTISMO.map((e) => (
              <span key={e} className="flex items-center gap-1 cursor-help" title={LABEL_PRESENTISMO[e]}>
                <span className={`w-3 h-3 rounded-full inline-block ${(COLOR_PRESENTISMO[e] || '').split(' ')[0]}`} /> {e}
              </span>
            ))}
          </div>

          {estudiantesFiltrados.length === 0 ? (
            <p className="text-textMuted text-sm bg-surface2 border border-border rounded-xl p-4">No hay estudiantes que coincidan con la búsqueda o el filtro elegido.</p>
          ) : (
          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="border-collapse text-xs w-full">
              <thead>
                <tr className="bg-surface2">
                  <th className="sticky left-0 z-10 bg-surface2 text-left px-3 py-2.5 border-b border-border min-w-[220px] font-semibold">Estudiante</th>
                  <th className="sticky left-[220px] z-10 bg-surface2 text-left px-2 py-2.5 border-b border-r border-border min-w-[80px] font-semibold">Estado</th>
                  <th className="text-left px-2 py-2.5 border-b border-border min-w-[80px] font-semibold">Alerta</th>
                  <th className="text-left px-2 py-2.5 border-b border-border min-w-[70px] font-semibold">% Asist.</th>
                  {clases.map((c) => {
                    const est = estiloFechaClase(c.fecha, hoyISO);
                    return (
                      <th
                        key={c.id}
                        className={`px-1.5 py-2.5 border-b-2 border-l border-border text-center min-w-[54px] font-normal ${est.clase} ${est.esHoy ? `${est.fondo} border-b-accentPurple` : 'border-b-border'}`}
                      >
                        #{c.numero}<br />{c.fecha.slice(5)}
                        {est.esHoy && <><br /><span className="text-[9px] font-bold">HOY</span></>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {estudiantesFiltrados.map((est) => {
                  const registros = registrosDe(est.id);
                  const ordenados = clases.map((c) => registros.find((r) => r.claseId === c.id) || { claseId: c.id, estado: '' })
                    .filter((r) => r.estado);
                  const porcentaje = calcularPorcentaje(registros, clasesDadas);
                  const alerta = calcularAlerta(ordenados, porcentaje);
                  const colorEstado = COLOR_ESTADO[est.estado] || {};
                  const colorAlerta = COLOR_ALERTA[alerta];
                  const barraLateral = alerta === 'Riesgo' ? 'border-l-dangerText' : alerta === 'Atencion' ? 'border-l-warningText' : 'border-l-successText';
                  return (
                    <tr key={est.id} className={`odd:bg-bg even:bg-surface2/40 hover:bg-accentTeal/5 transition-colors border-l-2 ${barraLateral}`}>
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 border-b border-border font-medium max-w-[220px]">
                        {/* relative + ancho fijo: así el nombre largo (o el panel de abajo) nunca
                            "empuja" el ancho real de esta columna — si lo hiciera, la columna
                            Estado (fija en left-[220px]) quedaría mal alineada o tapada. */}
                        <div className="relative">
                          <button onClick={() => setEstudianteAbierto(estudianteAbierto === est.id ? null : est.id)} className="text-left hover:underline truncate block max-w-[190px]" title={est.nombre}>
                            {est.nombre}
                          </button>
                          {estudianteAbierto === est.id && (
                            <PanelEstudiante
                              estudiante={est}
                              gestion={gestion}
                              puedeNotas={puedeNotas}
                              edicionId={id}
                              onActualizar={(cambios) => actualizarEstudiante(est.id, cambios)}
                              onCerrar={() => setEstudianteAbierto(null)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="sticky left-[220px] z-10 bg-inherit px-2 py-2 border-b border-r border-border">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${colorEstado.bg} ${colorEstado.text}`}>
                          {est.estado}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b border-border">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colorAlerta.bg} ${colorAlerta.text}`}>
                          {alerta}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b border-border">
                        {porcentaje === null ? (
                          <span className="text-textMuted">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${porcentaje >= 70 ? 'text-successText' : 'text-dangerText'}`}>{porcentaje}%</span>
                            <span className="w-8 h-1 rounded-full bg-border overflow-hidden inline-block">
                              <span className={`h-1 block ${porcentaje >= 70 ? 'bg-successText' : 'bg-dangerText'}`} style={{ width: `${porcentaje}%` }} />
                            </span>
                          </div>
                        )}
                      </td>
                      {clases.map((c) => {
                        const reg = registros.find((r) => r.claseId === c.id);
                        const estado = reg?.estado || '';
                        // Una vez que el estudiante está en "Baja", no tiene sentido seguir
                        // completando clases nuevas — se bloquean los casilleros vacíos (los
                        // que ya tienen una marca cargada se pueden seguir corrigiendo).
                        const bloqueadoPorBaja = est.estado === 'Baja' && !estado;
                        return (
                          <td key={c.id} className="border-b border-l border-border p-0.5 text-center">
                            <select
                              disabled={!puedeCargar || bloqueadoPorBaja}
                              title={bloqueadoPorBaja ? 'Estudiante dado de baja — no se cargan clases nuevas.' : undefined}
                              value={estado}
                              onChange={(ev) => marcarPresentismo(est.id, c.id, ev.target.value)}
                              style={estado ? { backgroundColor: COLOR_PRESENTISMO_HEX[estado]?.bg, color: COLOR_PRESENTISMO_HEX[estado]?.text } : undefined}
                              className="w-full text-[10.5px] rounded px-0.5 py-1 border-0 text-center disabled:opacity-40 disabled:cursor-not-allowed bg-transparent text-textMuted"
                            >
                              <option value="" style={{ backgroundColor: 'rgb(var(--color-surface2))', color: 'rgb(var(--color-textMuted))' }}>·</option>
                              {ESTADOS_PRESENTISMO.map((e) => (
                                <option key={e} value={e} style={{ backgroundColor: COLOR_PRESENTISMO_HEX[e].bg, color: COLOR_PRESENTISMO_HEX[e].text }}>{e}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* ---------- Seguimiento de Asistencia ---------- */}
      {estudiantes.length > 0 && (
        <div className="bg-surface2 border border-border rounded-2xl p-4 sm:p-5 mb-6">
          <button type="button" onClick={() => setDashboardAbierto((v) => !v)} className="w-full text-left flex items-center justify-between gap-2 group">
            <div>
              <h2 className="text-base font-semibold mb-0.5 group-hover:text-accentTeal transition-colors">Seguimiento de Asistencia</h2>
              <p className="text-textMuted text-xs">Visualizá rápidamente la asistencia, ausencias y evolución de los estudiantes.</p>
            </div>
            <span className="text-textMuted text-xs shrink-0">{dashboardAbierto ? '▲ Colapsar' : '▼ Ver'}</span>
          </button>

          {dashboardAbierto && (!hayAsistenciaCargada ? (
            <div className="text-center py-8 bg-bg border border-dashed border-border rounded-xl">
              <p className="text-sm font-medium text-textSec mb-1">Todavía no hay registros de asistencia</p>
              <p className="text-xs text-textMuted">Cuando se carguen asistencias, vas a poder ver las métricas y evolución acá.</p>
            </div>
          ) : (
            <>
              {/* Indicadores por estado */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
                {Object.entries(ICONO_INDICADOR).map(([campo, cfg]) => (
                  <div key={campo} className={`rounded-xl border border-border p-3 ${cfg.bg}`}>
                    <p className="text-[11px] text-textSec font-medium flex items-center gap-1">{cfg.icono} {cfg.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${cfg.text}`}>{resumen[campo]}</p>
                  </div>
                ))}
              </div>

              {/* Métricas generales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                <div className="bg-bg border border-border rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-textMuted">Estudiantes</p>
                    <p className="text-2xl font-bold">{resumen.cantidadEstudiantes}</p>
                  </div>
                </div>
                <div className="bg-bg border border-border rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-textMuted">Presentismo</p>
                    <p className="text-2xl font-bold">{resumen.porcentajePresentismo === null ? '—' : `${resumen.porcentajePresentismo}%`}</p>
                  </div>
                  <AnilloPresentismo pct={resumen.porcentajePresentismo} />
                </div>
                <div className="bg-bg border border-border rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-textMuted">Bajas</p>
                    <p className={`text-2xl font-bold ${resumen.porcentajeBajas > 0 ? 'text-dangerText' : ''}`}>{resumen.porcentajeBajas}%</p>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-bg border border-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-textSec mb-3">Distribución de asistencia</p>
                  <DistribucionEstados resumen={resumen} />
                </div>
                <div className="bg-bg border border-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-textSec mb-3">Evolución del presentismo</p>
                  <LineaEvolucion puntos={puntosEvolucion} />
                </div>
              </div>
            </>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelEstudiante({ estudiante, gestion, puedeNotas, edicionId, onActualizar, onCerrar }) {
  const [estado, setEstado] = useState(estudiante.estado);
  const [obs, setObs] = useState(estudiante.observaciones || '');

  return (
    <div className="absolute z-20 top-full left-0 mt-2 mb-1 p-3 bg-bg border border-border rounded-lg shadow-lg w-[320px] font-normal">
      {gestion && (
        <div className="mb-2">
          <label className="text-[10.5px] text-textSec block mb-1">Estado del estudiante</label>
          <div className="flex gap-1.5 flex-wrap">
            {ESTADOS_ESTUDIANTE.map((s) => (
              <button
                key={s} type="button"
                onClick={() => { setEstado(s); onActualizar({ estado: s }); }}
                className={`text-[10.5px] px-2 py-1 rounded-full border ${estado === s ? 'bg-accentPurple text-white border-transparent' : 'border-border text-textSec'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {puedeNotas && (
        <div className="mb-2">
          <label className="text-[10.5px] text-textSec block mb-1">Observaciones</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} className="w-full bg-surface2 border border-border rounded-lg px-2 py-1.5 text-[11px]" />
          <button type="button" onClick={() => onActualizar({ observaciones: obs })} className={`${btnSecCls} mt-1.5`}>Guardar observaciones</button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <Link href={`/seguimiento?estudianteId=${estudiante.id}&edicionId=${edicionId}`} className="text-[10.5px] text-accentTeal underline">
          + Registrar seguimiento
        </Link>
        <button type="button" onClick={onCerrar} className="text-[10.5px] text-textMuted">Cerrar</button>
      </div>
    </div>
  );
}
