'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica, esSuperAdmin } from '../../lib/permisos';
import { nombreCurso, colorCurso } from '../../lib/cursosLogic';
import { estadoCalculado, LABEL_ESTADO_EDICION, BADGE_ESTADO_EDICION, ESTADOS_EDICION_CALCULADOS } from '../../lib/edicionesEstadoCliente';

export default function EdicionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [ediciones, setEdiciones] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  // Antes arrancaba mostrando solo las Activas y había que destildar un botón para ver el
  // resto — el equipo académico necesita ver TODAS las cargadas de entrada, así que ahora
  // arranca en "Todas" y el filtro de estado es para achicar la vista, no al revés.
  const [filtroEstado, setFiltroEstado] = useState('');
  const [cargandoEjemplo, setCargandoEjemplo] = useState(false);
  const [borrandoId, setBorrandoId] = useState('');

  const gestion = tienePermisoGestionAcademica(usuario);
  const superAdmin = esSuperAdmin(usuario);

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

  async function borrarEdicion(e, edicion) {
    e.preventDefault();
    e.stopPropagation();
    const confirmado = window.confirm(
      `¿Borrar definitivamente ${nombreCurso(edicion.curso)} — Edición ${edicion.numero}?\n\nEsto borra también sus clases, estudiantes y presentismo cargado. No se puede deshacer.`
    );
    if (!confirmado) return;
    setBorrandoId(edicion.id);
    setError('');
    try {
      const res = await fetchAutenticado(`/api/ediciones/${edicion.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo borrar la edición.'); return; }
      cargarEdiciones();
    } catch {
      setError('Error de conexión.');
    } finally {
      setBorrandoId('');
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

  // Chips de curso: solo se muestran los cursos que tienen al menos una edición cargada
  // (no los 9 del catálogo completo), con la cantidad de ediciones de cada uno — mismo
  // patrón que los chips de rol en Equipo docente.
  const chipsCurso = useMemo(() => {
    const cuentas = new Map();
    for (const e of ediciones) cuentas.set(e.curso, (cuentas.get(e.curso) || 0) + 1);
    return [...cuentas.entries()]
      .map(([codigo, cantidad]) => ({ codigo, nombre: nombreCurso(codigo), cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [ediciones]);

  // Chips de estado: Todas + una por cada estado calculado que efectivamente tenga
  // ediciones, con su cantidad — reemplaza al viejo botón "Solo activas" (que arrancaba
  // prendido y escondía todo lo que no era Activa de entrada).
  const chipsEstado = useMemo(() => {
    const cuentas = new Map();
    for (const e of ediciones) {
      const est = estadoCalculado(e);
      cuentas.set(est, (cuentas.get(est) || 0) + 1);
    }
    return ESTADOS_EDICION_CALCULADOS
      .filter((est) => cuentas.has(est))
      .map((est) => ({ id: est, label: LABEL_ESTADO_EDICION[est] || est, cantidad: cuentas.get(est) }));
  }, [ediciones]);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return ediciones
      .filter((e) => !filtroEstado || estadoCalculado(e) === filtroEstado)
      .filter((e) => !filtroCurso || e.curso === filtroCurso)
      .filter((e) => !q || nombreCurso(e.curso).toLowerCase().includes(q) || e.docenteNombre.toLowerCase().includes(q) || e.staffNombre.toLowerCase().includes(q))
      .sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
  }, [ediciones, filtro, filtroCurso, filtroEstado]);

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
          type="search" name="filtro-ediciones" autoComplete="off" data-1p-ignore data-lpignore="true"
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
        />
      </div>

      {/* Estado: arranca en "Todas" (antes arrancaba en "Solo activas" y el equipo
          académico no veía las Próximas/Finalizadas/Suspendidas si no destildaba algo). */}
      {chipsEstado.length > 1 && (
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          <button
            type="button" onClick={() => setFiltroEstado('')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              !filtroEstado ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
            }`}
          >
            Todas <span className="opacity-70">{ediciones.length}</span>
          </button>
          {chipsEstado.map((c) => (
            <button
              key={c.id} type="button" onClick={() => setFiltroEstado(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                filtroEstado === c.id ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
              }`}
            >
              {c.label} <span className="opacity-70">{c.cantidad}</span>
            </button>
          ))}
        </div>
      )}

      {chipsCurso.length > 1 && (
        <div className="flex gap-1.5 mb-5 flex-wrap">
          <button
            type="button" onClick={() => setFiltroCurso('')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              !filtroCurso ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
            }`}
          >
            Todos <span className="opacity-70">{ediciones.length}</span>
          </button>
          {chipsCurso.map((c) => (
            <button
              key={c.codigo} type="button" onClick={() => setFiltroCurso(c.codigo)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                filtroCurso === c.codigo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
              }`}
            >
              {c.nombre} <span className="opacity-70">{c.cantidad}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-textMuted text-sm">No hay ediciones para mostrar.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtradas.map((e) => {
            const color = colorCurso(e.curso);
            const estado = estadoCalculado(e);
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
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${BADGE_ESTADO_EDICION[estado] || 'bg-surface text-textMuted'}`}>
                    {LABEL_ESTADO_EDICION[estado] || estado}
                  </span>
                  {superAdmin && (
                    <button
                      type="button"
                      onClick={(ev) => borrarEdicion(ev, e)}
                      disabled={borrandoId === e.id}
                      title="Borrar edición (SuperAdmin)"
                      className="text-textMuted hover:text-dangerText transition-colors text-sm disabled:opacity-50"
                    >
                      {borrandoId === e.id ? '…' : '🗑'}
                    </button>
                  )}
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
