'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { COLOR_ESTADO } from '../../lib/alertas';

export default function EstudiantesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) buscar();
  }, [usuario]);

  async function buscar(e) {
    if (e) e.preventDefault();
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado(`/api/estudiantes?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo buscar.'); return; }
      setEstudiantes(data.estudiantes);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Estudiantes</h1>
      <p className="text-textSec text-sm mb-5">Buscá un estudiante por nombre en todas las ediciones que podés ver. Para cargar una lista nueva, entrá a la edición correspondiente.</p>

      <form onSubmit={buscar} className="flex gap-2 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre del estudiante…" className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm" />
        <button type="submit" className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold">Buscar</button>
      </form>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : estudiantes.length === 0 ? (
        <p className="text-textMuted text-sm">No se encontraron estudiantes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {estudiantes.map((es) => (
            <Link key={es.id} href={`/ediciones/${es.edicionId}`} className="bg-surface2 border border-border rounded-xl p-3 flex justify-between items-center hover:border-accentTeal transition-colors">
              <div>
                <p className="text-sm font-medium">{es.nombre}</p>
                <p className="text-xs text-textSec">{es.edicionCurso} — Edición {es.edicionNumero}</p>
              </div>
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${(COLOR_ESTADO[es.estado] || {}).bg} ${(COLOR_ESTADO[es.estado] || {}).text}`}>
                {es.estado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
