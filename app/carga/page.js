'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { nombreCurso } from '../../lib/cursosLogic';
import { ESTADOS_PRESENTISMO, COLOR_PRESENTISMO } from '../../lib/presentismoCalculo';

export default function CargaPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [ediciones, setEdiciones] = useState([]);
  const [edicionId, setEdicionId] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [claseId, setClaseId] = useState('');
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState({});
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarEdiciones();
  }, [usuario]);

  useEffect(() => {
    if (edicionId) cargarDetalle(edicionId);
    setGuardadoOk(false);
  }, [edicionId]);

  async function cargarEdiciones() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/ediciones');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      const activas = (data.ediciones || []).filter((e) => e.estado === 'Activa');
      setEdiciones(activas);
      if (activas.length === 1) setEdicionId(activas[0].id);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  async function cargarDetalle(id) {
    setCargandoDetalle(true);
    setError('');
    try {
      const res = await fetchAutenticado(`/api/ediciones/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setDetalle(data);
      const hoyISO = new Date().toISOString().slice(0, 10);
      const proxima = data.clases.find((c) => c.fecha >= hoyISO) || data.clases[data.clases.length - 1];
      setClaseId(proxima?.id || '');
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function marcar(estudianteId, estado) {
    setGuardando((g) => ({ ...g, [estudianteId]: true }));
    setDetalle((prev) => {
      if (!prev) return prev;
      const otras = prev.presentismo.filter((p) => !(p.estudianteId === estudianteId && p.claseId === claseId));
      return { ...prev, presentismo: [...otras, { estudianteId, claseId, edicionId, estado }] };
    });
    try {
      await fetchAutenticado('/api/presentismo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteId, claseId, edicionId, estado })
      });
      setGuardadoOk(true);
    } catch {
      setError('No se pudo guardar — probá de nuevo.');
    } finally {
      setGuardando((g) => ({ ...g, [estudianteId]: false }));
    }
  }

  const claseActual = useMemo(() => detalle?.clases.find((c) => c.id === claseId), [detalle, claseId]);
  const estudiantesActivos = useMemo(() => (detalle?.estudiantes || []).filter((e) => e.estado !== 'Baja'), [detalle]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[760px] mx-auto px-6 pb-16 pt-10">
      <div className="flex items-center gap-2.5 flex-wrap mb-1">
        <h1 className="text-xl">Cargar asistencia</h1>
        {guardadoOk && (
          <span className="text-[11px] text-successText bg-successBg rounded-full px-2 py-0.5 font-semibold">✓ Asistencia guardada</span>
        )}
      </div>
      <p className="text-textSec text-sm mb-5">Elegí la edición y la clase, y marcá a cada estudiante.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : ediciones.length === 0 ? (
        <p className="text-textMuted text-sm">No tenés ninguna edición activa asignada.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5" data-tour="carga-edicion">
            <div>
              <label className="text-xs text-textSec block mb-1">Edición</label>
              <select value={edicionId} onChange={(e) => setEdicionId(e.target.value)} className="w-full bg-surface2 border border-border rounded-lg px-2.5 py-2 text-sm">
                <option value="">— Elegí una —</option>
                {ediciones.map((e) => <option key={e.id} value={e.id}>{nombreCurso(e.curso)} — Edición {e.numero}</option>)}
              </select>
            </div>
            {detalle && (
              <div>
                <label className="text-xs text-textSec block mb-1">Clase</label>
                <select value={claseId} onChange={(e) => setClaseId(e.target.value)} className="w-full bg-surface2 border border-border rounded-lg px-2.5 py-2 text-sm">
                  {detalle.clases.map((c) => <option key={c.id} value={c.id}>#{c.numero} — {c.fecha}</option>)}
                </select>
              </div>
            )}
          </div>

          {edicionId && (
            <Link
              href={`/ediciones/${edicionId}`}
              className="flex items-center justify-between gap-3 bg-surface2/60 border border-border rounded-xl px-3.5 py-2.5 mb-5 hover:border-accentTeal/50 transition-colors group"
            >
              <div>
                <p className="text-xs text-textSec font-medium">📊 Información de la edición</p>
                <p className="text-[11px] text-textMuted">Consultá el seguimiento y los indicadores de esta edición.</p>
              </div>
              <span className="text-[11px] text-accentTeal font-medium whitespace-nowrap shrink-0">Ver información →</span>
            </Link>
          )}

          {cargandoDetalle ? (
            <p className="text-textSec text-sm">Cargando estudiantes…</p>
          ) : detalle && claseActual && (
            estudiantesActivos.length === 0 ? (
              <p className="text-textMuted text-sm">No hay estudiantes cargados en esta edición.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {estudiantesActivos.map((est) => {
                  const reg = detalle.presentismo.find((p) => p.estudianteId === est.id && p.claseId === claseId);
                  const estado = reg?.estado || '';
                  return (
                    <div key={est.id} className="bg-surface2 border border-border rounded-xl p-3 flex justify-between items-center flex-wrap gap-2">
                      <span className="text-sm font-medium">{est.nombre}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {ESTADOS_PRESENTISMO.map((e) => (
                          <button
                            key={e} type="button" disabled={guardando[est.id]}
                            onClick={() => marcar(est.id, e)}
                            className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${estado === e ? COLOR_PRESENTISMO[e] + ' border-transparent' : 'border-border text-textMuted'}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
