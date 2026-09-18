'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerSeguimiento } from '../../lib/permisos';
import { MOTIVOS_SEGUIMIENTO, ESTADOS_SEGUIMIENTO } from '../../lib/datosSeguimientoCliente';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const badgeEstado = {
  Pendiente: 'bg-warningBg text-warningText',
  EnRevision: 'bg-infoBg text-infoText',
  Resuelto: 'bg-successBg text-successText'
};

// Un color fijo por motivo (nunca reasignado), cada uno distinto — en hex directo porque
// el <select> nativo del navegador no respeta clases de Tailwind en cada <option> (Chrome
// solo pinta background-color/color inline u por className simple, y si se lo aplicamos
// solo al <select> termina pintando TODAS las opciones de la lista abierta igual). La
// lista de motivos ya está ordenada alfabéticamente más abajo.
const MOTIVO_COLOR = {
  Ausencia: { bg: '#3a1414', text: '#f87171' },
  Certificacion: { bg: '#0f2e22', text: '#4ade80' },
  'Cambio a asincronico': { bg: '#0f1f33', text: '#60a5fa' },
  'Cambio de edicion': { bg: '#0e2e2c', text: '#2dd4bf' },
  Economico: { bg: '#33210b', text: '#fbbf24' },
  'En progreso de baja': { bg: '#2e1a3d', text: '#c084fc' },
  Otro: { bg: '#1c2138', text: '#9aa1c2' },
  'Problema academico': { bg: '#2f1233', text: '#e879f9' },
  'Problema de horarios': { bg: '#1a2e40', text: '#38bdf8' },
  'Problema personal': { bg: '#331a2a', text: '#f472b6' },
  Reincorporacion: { bg: '#1a2e1c', text: '#86efac' },
  Seguimiento: { bg: '#241a3d', text: '#a78bfa' }
};
const MOTIVOS_ORDENADOS = [...MOTIVOS_SEGUIMIENTO].sort((a, b) => a.localeCompare(b, 'es'));

export default function SeguimientoPage() {
  return (
    <Suspense fallback={null}>
      <SeguimientoContenido />
    </Suspense>
  );
}

function SeguimientoContenido() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const [seguimientos, setSeguimientos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [estudiante, setEstudiante] = useState(null);
  // estudianteId/edicionId arrancan con lo que venga en la URL (por ejemplo, al entrar
  // desde "+ Registrar seguimiento" en una edición puntual), pero después se pueden
  // cambiar desde el buscador de acá abajo sin recargar la página.
  const [estudianteId, setEstudianteId] = useState(params.get('estudianteId') || '');
  const [edicionId, setEdicionId] = useState(params.get('edicionId') || '');

  const [busquedaEst, setBusquedaEst] = useState('');
  const [resultadosEst, setResultadosEst] = useState([]);
  const [buscandoEst, setBuscandoEst] = useState(false);

  const gestion = usuario ? tienePermisoVerSeguimiento(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !gestion)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && gestion) cargarSeguimientos();
  }, [usuario, estudianteId, edicionId]);

  useEffect(() => {
    if (!usuario || !gestion || !estudianteId) { setEstudiante(null); return; }
    fetchAutenticado(`/api/estudiantes/${estudianteId}`)
      .then((res) => res.json())
      .then((data) => setEstudiante(data.estudiante || null))
      .catch(() => {});
  }, [usuario, gestion, estudianteId]);

  // Buscador de estudiante (solo corre cuando todavía no hay uno elegido): reusa el mismo
  // endpoint de /estudiantes, que ya filtra por lo que cada usuario puede ver (un Docente
  // solo va a encontrar acá a sus propios estudiantes).
  useEffect(() => {
    if (!usuario || !gestion || estudianteId) return;
    const q = busquedaEst.trim();
    if (q === '') { setResultadosEst([]); return; }
    setBuscandoEst(true);
    const espera = setTimeout(() => {
      fetchAutenticado(`/api/estudiantes?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setResultadosEst(data.estudiantes || []))
        .catch(() => setResultadosEst([]))
        .finally(() => setBuscandoEst(false));
    }, 300);
    return () => clearTimeout(espera);
  }, [usuario, gestion, estudianteId, busquedaEst]);

  function elegirEstudiante(es) {
    setEstudianteId(es.id);
    setEdicionId(es.edicionId);
    setBusquedaEst('');
    setResultadosEst([]);
    router.replace(`/seguimiento?estudianteId=${es.id}&edicionId=${es.edicionId}`, { scroll: false });
  }

  function cambiarEstudiante() {
    setEstudianteId('');
    setEdicionId('');
    setEstudiante(null);
    setMotivo('');
    setObservaciones('');
    router.replace('/seguimiento', { scroll: false });
  }

  async function cargarSeguimientos() {
    setCargandoLista(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (estudianteId) qs.set('estudianteId', estudianteId);
      if (edicionId) qs.set('edicionId', edicionId);
      const res = await fetchAutenticado(`/api/seguimiento?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setSeguimientos(data.seguimientos);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  async function crear(e) {
    e.preventDefault();
    setError(''); setMensaje('');
    if (!estudianteId) { setError('Elegí un estudiante primero.'); return; }
    if (!motivo) { setError('Elegí un motivo.'); return; }
    try {
      const res = await fetchAutenticado('/api/seguimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteId, edicionId, motivo, observaciones })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje('Seguimiento registrado.');
      setMotivo('');
      setObservaciones('');
      cargarSeguimientos();
    } catch {
      setError('Error de conexión.');
    }
  }

  async function actualizarEstado(id, estado) {
    setError('');
    try {
      const res = await fetchAutenticado(`/api/seguimiento/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      cargarSeguimientos();
    } catch {
      setError('Error de conexión.');
    }
  }

  if (cargando || !usuario || !gestion) return null;

  return (
    <div className="max-w-[800px] mx-auto px-6 pb-16 pt-10">
      <div className="flex items-center gap-2.5 flex-wrap mb-1">
        <h1 className="text-xl">{estudiante ? estudiante.nombre : 'Seguimiento'}</h1>
        {estudiante && (
          <button type="button" onClick={cambiarEstudiante} className="text-[11px] text-accentTeal underline">
            Cambiar estudiante
          </button>
        )}
      </div>
      <p className="text-textSec text-sm mb-5">
        {estudiante
          ? 'Registro de incidencias y contacto con este estudiante — para que quede en la app, no solo en un mail.'
          : 'Registro de incidencias y contacto con estudiantes — para que quede en la app, no solo en un mail.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      {!estudianteId ? (
        <div className="bg-surface2 border border-border rounded-2xl p-5 mb-6" data-tour="seguimiento-form">
          <h2 className="text-sm font-semibold mb-1">➕ Nuevo registro</h2>
          <p className="text-textSec text-xs mb-3">Primero elegí de qué estudiante cargado es el registro.</p>
          <input
            value={busquedaEst} onChange={(e) => setBusquedaEst(e.target.value)}
            type="search" placeholder="Buscar estudiante por nombre…" autoComplete="off"
            className={inputCls}
          />
          {busquedaEst.trim() !== '' && (
            <div className="flex flex-col gap-1.5 mt-2.5 max-h-64 overflow-y-auto">
              {buscandoEst ? (
                <p className="text-textSec text-xs px-1">Buscando…</p>
              ) : resultadosEst.length === 0 ? (
                <p className="text-textMuted text-xs px-1">No se encontraron estudiantes.</p>
              ) : (
                resultadosEst.map((es) => (
                  <button
                    key={es.id} type="button" onClick={() => elegirEstudiante(es)}
                    className="text-left bg-surface border border-border rounded-lg px-3 py-2 text-sm hover:border-accentTeal transition-colors"
                  >
                    <span className="font-medium">{es.nombre}</span>
                    <span className="text-textSec text-xs ml-2">{es.edicionCurso} — Edición {es.edicionNumero}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={crear} className="bg-surface2 border border-border rounded-2xl p-5 mb-6 flex flex-col gap-2.5" data-tour="seguimiento-form">
          <h2 className="text-sm font-semibold mb-1">➕ Nuevo registro</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-textSec block mb-1">Registrado por</label>
              <p className={`${inputCls} bg-surface text-textSec flex items-center`}>{usuario?.nombre}</p>
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Motivo</label>
              <select
                value={motivo} onChange={(e) => setMotivo(e.target.value)}
                style={motivo ? { backgroundColor: (MOTIVO_COLOR[motivo] || {}).bg, color: (MOTIVO_COLOR[motivo] || {}).text } : undefined}
                className="w-full border border-border rounded-lg px-2.5 py-2 text-sm font-medium"
              >
                <option value="" disabled>Seleccionar…</option>
                {MOTIVOS_ORDENADOS.map((m) => (
                  <option key={m} value={m} style={{ backgroundColor: MOTIVO_COLOR[m].bg, color: MOTIVO_COLOR[m].text }}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className={inputCls} />
          </div>
          <button type="submit" className={`${btnCls} self-start`}>Registrar</button>
        </form>
      )}

      <h2 className="text-sm font-semibold mb-3">Registros ({seguimientos.length})</h2>
      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : seguimientos.length === 0 ? (
        <p className="text-textMuted text-sm">No hay registros todavía.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {seguimientos.map((s) => (
            <div key={s.id} className="bg-surface2 border border-border rounded-xl p-3.5">
              <div className="flex justify-between items-start flex-wrap gap-2 mb-1.5">
                <div>
                  <p className="text-sm font-semibold">
                    <span
                      className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold mr-1.5 align-middle"
                      style={{ backgroundColor: (MOTIVO_COLOR[s.motivo] || {}).bg || 'rgb(var(--color-surface))', color: (MOTIVO_COLOR[s.motivo] || {}).text || 'rgb(var(--color-textMuted))' }}
                    >
                      {s.motivo}
                    </span>
                  </p>
                  <p className="text-[11px] text-textMuted mt-1">
                    {s.fecha} · Registrado por {s.responsable}
                    {s.edicionCurso && ` · ${s.edicionCurso} — Edición ${s.edicionNumero}`}
                  </p>
                </div>
                <select value={s.estado} onChange={(e) => actualizarEstado(s.id, e.target.value)} className={`text-[11px] px-2 py-1 rounded-full font-semibold border-0 ${badgeEstado[s.estado]}`}>
                  {ESTADOS_SEGUIMIENTO.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {s.observaciones && <p className="text-xs text-textSec">{s.observaciones}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
