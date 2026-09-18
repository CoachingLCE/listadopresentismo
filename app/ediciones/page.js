'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { nombreCurso, colorCurso } from '../../lib/cursosLogic';

// Estado de la edición — un concepto totalmente distinto al color del curso: acá el
// color siempre significa lo mismo (verde = activa) sin importar qué se esté cursando.
const badgeEstado = {
  Activa: 'bg-successBg text-successText',
  Finalizada: 'bg-surface text-textMuted',
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
  const [cargandoEjemplo, setCargandoEjemplo] = useState(false);

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

  async function cargarEjemplo() {
    setCargandoEjemplo(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/ediciones/ejemplo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo crear la edición de ejemplo.'); return; }
      router.push(`/ediciones/${data.id}`);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoEjemplo(false);
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
          <div className="flex gap-2 flex-wrap h-fit">
            <button
              onClick={cargarEjemplo} disabled={cargandoEjemplo}
              className="bg-transparent text-textSec border border-border rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              title="Crea una edición de Coaching Ontológico con 10 estudiantes de prueba y presentismo ya cargado, para ver cómo se ve la app con datos."
            >
              {cargandoEjemplo ? 'Creando…' : '🧪 Cargar edición de ejemplo'}
            </button>
            <Link href="/nueva-edicion" data-tour="ediciones-nueva" className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold h-fit">
              + Nueva edición
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center" data-tour="ediciones-buscar">
        <input
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por curso o docente…"
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
        />
        <button
          type="button"
          onClick={() => setSoloActivas((v) => !v)}
          className={`h-[38px] text-sm px-3.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
            soloActivas
              ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
              : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
          }`}
        >
          {soloActivas ? '✓' : ''} Solo activas
        </button>
      </div>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-textMuted text-sm">No hay ediciones para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtradas.map((e) => {
            const color = colorCurso(e.curso);
            return (
              <Link
                key={e.id} href={`/ediciones/${e.id}`}
                className={`bg-surface2 border border-border border-l-[3px] ${color.borde} rounded-xl p-4 flex justify-between items-center flex-wrap gap-3 hover:border-accentTeal transition-colors group`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color.dot}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${color.badge}`}>{nombreCurso(e.curso)}</span>
                      <p className="font-semibold text-sm">Edición {e.numero}</p>
                    </div>
                    <p className="text-textSec text-xs mt-1">
                      {e.fechaInicio} → {e.fechaFin || '?'} · {e.totalClases} clases
                      {e.docenteNombre && ` · Docente: ${e.docenteNombre}`}
                      {e.staffNombre && ` · Staff: ${e.staffNombre}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${badgeEstado[e.estado] || 'bg-surface text-textMuted'}`}>
                    {e.estado}
                  </span>
                  <span className="text-xs text-accentTeal font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Ver edición →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
