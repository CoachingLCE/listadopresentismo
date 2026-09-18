'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { nombreCurso } from '../../lib/cursosLogic';

const badgeEstado = {
  Activa: 'bg-successBg text-successText',
  Finalizada: 'bg-infoBg text-infoText',
  Suspendida: 'bg-warningBg text-warningText'
};

export default function EdicionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [ediciones, setEdiciones] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [soloActivas, setSoloActivas] = useState(true);

  const gestion = tienePermisoGestionAcademica(usuario);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarEdiciones();
  }, [usuario]);

  async function cargarEdiciones() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/ediciones');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setEdiciones(data.ediciones);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return ediciones
      .filter((e) => !soloActivas || e.estado === 'Activa')
      .filter((e) => !q || nombreCurso(e.curso).toLowerCase().includes(q) || e.docenteNombre.toLowerCase().includes(q) || e.staffNombre.toLowerCase().includes(q))
      .sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  }, [ediciones, filtro, soloActivas]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1100px] mx-auto px-6 pb-16 pt-10">
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl mb-1">Ediciones</h1>
          <p className="text-textSec text-sm">
            {gestion ? 'Todas las ediciones de formaciones activas.' : 'Las ediciones que tenés asignadas.'}
          </p>
        </div>
        {gestion && (
          <Link href="/nueva-edicion" className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold h-fit">
            + Nueva edición
          </Link>
        )}
      </div>

      <p className="text-textSec text-sm bg-surface2 border border-border rounded-lg px-4 py-3 mb-5">
        El listado de presentismo es una herramienta pedagógica que nos permite acompañar de mejor manera a
        nuestros estudiantes, identificando su participación y pudiendo intervenir oportunamente cuando sea
        necesario.
      </p>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por curso o docente…"
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
        />
        <label className="text-sm flex items-center gap-1.5 text-textSec">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} />
          Solo activas
        </label>
      </div>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-textMuted text-sm">No hay ediciones para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtradas.map((e) => (
            <Link
              key={e.id} href={`/ediciones/${e.id}`}
              className="bg-surface2 border border-border rounded-xl p-4 flex justify-between items-center flex-wrap gap-2 hover:border-accentTeal transition-colors"
            >
              <div>
                <p className="font-semibold text-sm">{nombreCurso(e.curso)} — Edición {e.numero}</p>
                <p className="text-textSec text-xs mt-0.5">
                  {e.fechaInicio} → {e.fechaFin || '?'} · {e.totalClases} clases
                  {e.docenteNombre && ` · Docente: ${e.docenteNombre}`}
                  {e.staffNombre && ` · Staff: ${e.staffNombre}`}
                </p>
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${badgeEstado[e.estado] || 'bg-surface text-textMuted'}`}>
                {e.estado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
