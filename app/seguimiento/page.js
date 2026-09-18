'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { AREAS_SEGUIMIENTO, MOTIVOS_SEGUIMIENTO, ESTADOS_SEGUIMIENTO } from '../../lib/datosSeguimientoCliente';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const badgeEstado = {
  Pendiente: 'bg-warningBg text-warningText',
  EnRevision: 'bg-infoBg text-infoText',
  Resuelto: 'bg-successBg text-successText'
};

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

  const [area, setArea] = useState(AREAS_SEGUIMIENTO[0]);
  const [motivo, setMotivo] = useState(MOTIVOS_SEGUIMIENTO[0]);
  const [observaciones, setObservaciones] = useState('');
  const estudianteId = params.get('estudianteId') || '';
  const edicionId = params.get('edicionId') || '';

  const gestion = usuario ? tienePermisoGestionAcademica(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !gestion)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && gestion) cargarSeguimientos();
  }, [usuario, estudianteId, edicionId]);

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
        body: JSON.stringify({ estudianteId, edicionId, area, motivo, observaciones })
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
      <h1 className="text-xl mb-1">Seguimiento</h1>
      <p className="text-textSec text-sm mb-5">
        Registro de incidencias y contacto con estudiantes — para que quede en la app, no solo en un mail.
        {estudianteId && ' Mostrando lo relacionado a un estudiante puntual.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      <form onSubmit={crear} className="bg-surface2 border border-border rounded-2xl p-5 mb-6 flex flex-col gap-2.5" data-tour="seguimiento-form">
        <h2 className="text-sm font-semibold mb-1">➕ Nuevo registro</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs text-textSec block mb-1">Área</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
              {AREAS_SEGUIMIENTO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Motivo</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
              {MOTIVOS_SEGUIMIENTO.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <p className="text-sm font-semibold">{s.motivo} <span className="text-textMuted font-normal">· {s.area}</span></p>
                  <p className="text-[11px] text-textMuted">{s.fecha} · {s.responsable}</p>
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
