'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoGestionRosterDocentes } from '../../lib/permisos';
import { CURSOS } from '../../lib/cursosLogic';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

export default function DocentesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [docentes, setDocentes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cursos, setCursos] = useState([]);

  const gestion = usuario ? tienePermisoGestionAcademica(usuario) : false;
  const puedeRoster = usuario ? tienePermisoGestionRosterDocentes(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !gestion)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && gestion) cargarDocentes();
  }, [usuario]);

  async function cargarDocentes() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/docentes');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setDocentes(data.docentes);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  function toggleCurso(codigo) {
    setCursos((prev) => prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]);
  }

  async function agregar(e) {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado('/api/docentes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, cursos })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`${nombre} agregado/a al roster.`);
      setNombre(''); setEmail(''); setCursos([]);
      cargarDocentes();
    } catch {
      setError('Error de conexión.');
    }
  }

  async function actualizar(docenteEmail, cambios) {
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado(`/api/docentes/${encodeURIComponent(docenteEmail)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje('Actualizado.');
      cargarDocentes();
    } catch {
      setError('Error de conexión.');
    }
  }

  if (cargando || !usuario || !gestion) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Docentes y Staff</h1>
      <p className="text-textSec text-sm mb-5">
        Roster de personas disponibles para asignar a ediciones.
        {!puedeRoster && ' Solo Coordinación y SuperAdmin pueden agregar o dar de baja personas del roster.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      {puedeRoster && (
        <div className="bg-surface2 border border-border rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">➕ Agregar al roster</h2>
          <form onSubmit={agregar} className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-textSec block mb-1">Nombre</label>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-textSec block mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-textSec block mb-1.5">Cursos que dicta</label>
              <div className="flex gap-3 flex-wrap">
                {CURSOS.map((c) => (
                  <label key={c.codigo} className="text-xs flex gap-1 items-center">
                    <input type="checkbox" checked={cursos.includes(c.codigo)} onChange={() => toggleCurso(c.codigo)} />
                    {c.nombre}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <button type="submit" className={btnCls}>Agregar</button>
            </div>
          </form>
        </div>
      )}

      <h2 className="text-sm font-semibold mb-3">Roster ({docentes.length})</h2>
      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {docentes.map((d) => (
            <FilaDocente key={d.email} d={d} puedeRoster={puedeRoster} onActualizar={actualizar} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaDocente({ d, puedeRoster, onActualizar }) {
  const [cursos, setCursos] = useState(d.cursos);

  function toggleCurso(codigo) {
    const nuevos = cursos.includes(codigo) ? cursos.filter((c) => c !== codigo) : [...cursos, codigo];
    setCursos(nuevos);
  }

  return (
    <div className="bg-surface2 border border-border rounded-xl p-3.5">
      <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
        <div>
          <span className="font-semibold text-sm">{d.nombre}</span>
          <span className="text-textSec text-xs ml-2">{d.email}</span>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap mb-2">
        {CURSOS.map((c) => (
          <label key={c.codigo} className="text-[11px] flex gap-1 items-center text-textSec">
            <input type="checkbox" disabled={!puedeRoster} checked={cursos.includes(c.codigo)} onChange={() => toggleCurso(c.codigo)} />
            {c.nombre}
          </label>
        ))}
      </div>
      {puedeRoster && (
        <div className="flex gap-2">
          <button className={btnSecCls} onClick={() => onActualizar(d.email, { cursos })}>Guardar cursos</button>
          <button className={btnSecCls} onClick={() => onActualizar(d.email, { activo: false })}>Dar de baja</button>
        </div>
      )}
    </div>
  );
}
