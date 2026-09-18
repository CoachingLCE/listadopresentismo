'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerHistorial } from '../../lib/permisos';

export default function HistorialPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [historial, setHistorial] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');

  const puede = usuario ? tienePermisoVerHistorial(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !puede)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && puede) cargar();
  }, [usuario]);

  async function cargar() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/historial');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar el historial.'); return; }
      setHistorial(data.historial);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  if (cargando || !usuario || !puede) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Historial</h1>
      <p className="text-textSec text-sm mb-5">Registro de acciones relevantes de todos los usuarios.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : historial.length === 0 ? (
        <p className="text-textMuted text-sm">Todavía no hay nada registrado.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {historial.map((h, i) => (
            <div key={i} className="bg-surface2 border border-border rounded-lg px-3.5 py-2.5 text-sm">
              <p><span className="font-semibold">{h.usuario}</span> — {h.accion}{h.detalle ? `: ${h.detalle}` : ''}</p>
              <p className="text-[11px] text-textMuted">{new Date(h.fecha).toLocaleString('es-AR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
