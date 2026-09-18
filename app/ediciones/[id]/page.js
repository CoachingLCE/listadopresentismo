'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoCargarAsistencia, tienePermisoEscribirNotasEstudiante, esRolLimitadoAEdicionesPropias } from '../../../lib/permisos';
import { nombreCurso } from '../../../lib/cursosLogic';
import { ESTADOS_PRESENTISMO, COLOR_PRESENTISMO, calcularPorcentaje, calcularResumenPresentismo } from '../../../lib/presentismoCalculo';
import { calcularAlerta, COLOR_ALERTA, COLOR_ESTADO } from '../../../lib/alertas';
import { ESTADOS_ESTUDIANTE } from '../../../lib/estudiantesCliente';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

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
    // Optimista: actualiza en pantalla antes de que vuelva la respuesta.
    setDatos((prev) => {
      if (!prev) return prev;
      const otras = prev.presentismo.filter((p) => !(p.estudianteId === estudianteId && p.claseId === claseId));
      return { ...prev, presentismo: [...otras, { estudianteId, claseId, edicionId: id, estado, notas: '' }] };
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

  const docentesDelCurso = useMemo(
    () => (datos ? docentes.filter((d) => d.cursos.includes(datos.edicion.curso)) : []),
    [datos, docentes]
  );

  const resumen = useMemo(
    () => (datos ? calcularResumenPresentismo(datos.estudiantes, datos.presentismo, clasesDadas) : null),
    [datos, clasesDadas]
  );

  if (cargando || !usuario || cargandoDatos) return <div className="max-w-[1300px] mx-auto px-6 pt-10 text-textSec text-sm">Cargando…</div>;
  if (error && !datos) return <div className="max-w-[1300px] mx-auto px-6 pt-10 text-dangerText text-sm">{error}</div>;
  if (!datos) return null;

  const { edicion, clases, estudiantes } = datos;

  return (
    <div className="max-w-[1300px] mx-auto px-6 pb-16 pt-10">
      <Link href="/ediciones" className="text-textMuted text-xs underline">← Volver a ediciones</Link>
      <h1 className="text-xl mt-1 mb-1">{nombreCurso(edicion.curso)} — Edición {edicion.numero}</h1>
      <p className="text-textSec text-sm mb-5">{edicion.fechaInicio} → {edicion.fechaFin} · {clases.length} clases · {edicion.estado}</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      {resumen && estudiantes.length > 0 && (
        <div className="bg-surface2 border border-border rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3 text-center bg-infoBg text-infoText rounded-lg py-1.5">Seguimiento de Asistencia</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm mb-3">
            <p className="text-textSec">Total Presentes</p><p className="font-semibold text-successText">{resumen.totalPresentes}</p>
            <p className="text-textSec">Total Ausentes</p><p className="font-semibold text-dangerText">{resumen.totalAusentes}</p>
            <p className="text-textSec">Total Ausentes justificados</p><p className="font-semibold text-warningText">{resumen.totalAusentesJustificados}</p>
            <p className="text-textSec">Total de asincrónicos</p><p className="font-semibold text-infoText">{resumen.totalAsincronicos}</p>
            <p className="text-textSec">CC</p><p className="font-semibold text-textMuted">{resumen.totalCC}</p>
            <p className="text-textSec">Bajas</p><p className="font-semibold text-textMuted">{resumen.totalBajasClase}</p>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-border">
            <span className="text-xs bg-bg border border-border rounded-lg px-2.5 py-1.5">Cantidad de estudiantes: <strong>{resumen.cantidadEstudiantes}</strong></span>
            <span className="text-xs bg-dangerBg text-dangerText rounded-lg px-2.5 py-1.5">Porcentaje de bajas: <strong>{resumen.porcentajeBajas}%</strong></span>
            <span className="text-xs bg-successBg text-successText rounded-lg px-2.5 py-1.5">
              Porcentaje de presentismo: <strong>{resumen.porcentajePresentismo === null ? '—' : `${resumen.porcentajePresentismo}%`}</strong>
            </span>
          </div>
        </div>
      )}

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
              {docentes.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-textSec block mb-1">Estado de la edición</label>
            <select defaultValue={edicion.estado} onChange={(e) => guardarEdicion({ estado: e.target.value })} className={inputCls}>
              {['Activa', 'Finalizada', 'Suspendida'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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

      {estudiantes.length === 0 ? (
        <p className="text-textMuted text-sm">Todavía no hay estudiantes cargados en esta edición.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="border-collapse text-xs w-full">
            <thead>
              <tr className="bg-surface2">
                <th className="sticky left-0 bg-surface2 text-left px-3 py-2 border-b border-border min-w-[220px]">Estudiante</th>
                <th className="text-left px-2 py-2 border-b border-border min-w-[70px]">Estado</th>
                <th className="text-left px-2 py-2 border-b border-border min-w-[70px]">Alerta</th>
                <th className="text-left px-2 py-2 border-b border-border min-w-[55px]">%</th>
                {clases.map((c) => (
                  <th key={c.id} className="px-1.5 py-2 border-b border-border border-l border-border text-center min-w-[54px] font-normal text-textMuted">
                    #{c.numero}<br />{c.fecha.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est) => {
                const registros = registrosDe(est.id);
                const ordenados = clases.map((c) => registros.find((r) => r.claseId === c.id) || { claseId: c.id, estado: '' })
                  .filter((r) => r.estado);
                const porcentaje = calcularPorcentaje(registros, clasesDadas);
                const alerta = calcularAlerta(ordenados, porcentaje);
                return (
                  <tr key={est.id} className="odd:bg-bg even:bg-surface2/40">
                    <td className="sticky left-0 bg-inherit px-3 py-1.5 border-b border-border font-medium">
                      <button onClick={() => setEstudianteAbierto(estudianteAbierto === est.id ? null : est.id)} className="text-left hover:underline">
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
                    </td>
                    <td className="px-2 py-1.5 border-b border-border">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${(COLOR_ESTADO[est.estado] || {}).bg} ${(COLOR_ESTADO[est.estado] || {}).text}`}>
                        {est.estado}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-border">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${COLOR_ALERTA[alerta].bg} ${COLOR_ALERTA[alerta].text}`}>
                        {alerta}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-border text-textSec">{porcentaje === null ? '—' : `${porcentaje}%`}</td>
                    {clases.map((c) => {
                      const reg = registros.find((r) => r.claseId === c.id);
                      const estado = reg?.estado || '';
                      return (
                        <td key={c.id} className="border-b border-l border-border p-0.5 text-center">
                          <select
                            disabled={!puedeCargar}
                            value={estado}
                            onChange={(ev) => marcarPresentismo(est.id, c.id, ev.target.value)}
                            className={`w-full text-[10.5px] rounded px-0.5 py-1 border-0 text-center ${estado ? COLOR_PRESENTISMO[estado] : 'bg-transparent text-textMuted'}`}
                          >
                            <option value="">·</option>
                            {ESTADOS_PRESENTISMO.map((e) => <option key={e} value={e}>{e}</option>)}
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
  );
}

function PanelEstudiante({ estudiante, gestion, puedeNotas, edicionId, onActualizar, onCerrar }) {
  const [estado, setEstado] = useState(estudiante.estado);
  const [obs, setObs] = useState(estudiante.observaciones || '');

  return (
    <div className="mt-2 mb-1 p-3 bg-bg border border-border rounded-lg w-[320px] font-normal">
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
