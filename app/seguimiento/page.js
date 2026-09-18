'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { MOTIVOS_SEGUIMIENTO, ESTADOS_SEGUIMIENTO } from '../../lib/datosSeguimientoCliente';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const badgeEstado = {
  Pendiente: 'bg-warningBg text-warningText',
  EnRevision: 'bg-infoBg text-infoText',
  Resuelto: 'bg-successBg text-successText'
};

// Un color fijo por motivo (nunca reasignado), en el mismo estilo de identidad visual que
// ya se usa para cursos y estados en el resto de la app — la lista de motivos ya está
// ordenada alfabéticamente más abajo, así que estos colores se ven en ese mismo orden.
const MOTIVO_COLOR = {
  Ausencia: 'bg-dangerBg text-dangerText',
  Certificacion: 'bg-successBg text-successText',
  'Cambio a asincronico': 'bg-infoBg text-infoText',
  'Cambio de edicion': 'bg-accentTeal/15 text-accentTeal',
  Economico: 'bg-warningBg text-warningText',
  'En progreso de baja': 'bg-dangerBg text-dangerText',
  Otro: 'bg-surface text-textMuted',
  'Problema academico': 'bg-accentMagenta/15 text-accentMagenta',
  'Problema de horarios': 'bg-warningBg text-warningText',
  'Problema personal': 'bg-accentPurple/15 text-accentPurple',
  Reincorporacion: 'bg-successBg text-successText',
  Seguimiento: 'bg-infoBg text-infoText'
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

  const [motivo, setMotivo] = useState(MOTIVOS_ORDENADOS[0]);
  const [observaciones, setObservaciones] = useState('');
  const [estudiante, setEstudiante] = useState(null);
  const estudianteId = params.get('estudianteId') || '';
  const edicionId = params.get('edicionId') || '';

  const gestion = usuario ? tienePermisoGestionAcademica(usuario) : false;

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
    try {
      const res = await fetchAutenticado('/api/seguimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteId, edicionId, motivo, observaciones })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje('Seguimiento registrado.');
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
      <h1 className="text-xl mb-1">{estudiante ? estudiante.nombre : 'Seguimiento'}</h1>
      <p className="text-textSec text-sm mb-5">
        {estudiante
          ? 'Registro de incidencias y contacto con este estudiante — para que quede en la app, no solo en un mail.'
          : 'Registro de incidencias y contacto con estudiantes — para que quede en la app, no solo en un mail.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

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
              className={`w-full border border-border rounded-lg px-2.5 py-2 text-sm font-medium ${MOTIVO_COLOR[motivo] || 'bg-bg'}`}
            >
              {MOTIVOS_ORDENADOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-textSec block mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className={inputCls} />
        </div>
        <button type="submit" className={`${btnCls} self-start`}>Registrar</button>
      </form>

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
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold mr-1.5 align-middle ${MOTIVO_COLOR[s.motivo] || 'bg-surface text-textMuted'}`}>{s.motivo}</span>
                  </p>
                  <p className="text-[11px] text-textMuted mt-1">{s.fecha} · Registrado por {s.responsable}</p>
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
