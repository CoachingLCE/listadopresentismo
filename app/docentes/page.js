'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoGestionRosterDocentes } from '../../lib/permisos';
import { CURSOS } from '../../lib/cursosLogic';

const ROLES_ROSTER = ['Docente', 'Staff'];
const ROL_ICONO = { Docente: '🎓', Staff: '🧩' };
const ROL_BADGE = { Docente: 'bg-infoBg text-infoText', Staff: 'bg-warningBg text-warningText' };

const inputCls = 'w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20 placeholder:text-textMuted';
const labelCls = 'text-xs text-textSec font-medium block mb-1.5';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm shadow-accentPurple/20 transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
const btnSecCls = 'bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-textSec transition-colors hover:border-accentTeal hover:text-text active:scale-[0.98]';
const btnDangerCls = 'bg-transparent border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-textMuted transition-colors hover:border-dangerText hover:text-dangerText hover:bg-dangerBg/40 active:scale-[0.98]';

// Colores de avatar, elegidos entre los tokens ya definidos en la app (sin agregar
// paleta nueva) — se asignan por hash del email, así cada persona siempre tiene el mismo.
const AVATAR_ESTILOS = [
  'bg-successBg text-successText',
  'bg-infoBg text-infoText',
  'bg-warningBg text-warningText',
  'bg-dangerBg text-dangerText'
];

function estiloAvatar(clave) {
  let hash = 0;
  for (const ch of clave || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_ESTILOS[hash % AVATAR_ESTILOS.length];
}

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
}

function ChipCurso({ activo, disabled, onClick, children }) {
  return (
    <button
      type="button" disabled={disabled} onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
        disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.97]'
      } ${
        activo
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent shadow-sm shadow-accentPurple/20'
          : 'bg-bg border-border text-textMuted hover:border-accentTeal hover:text-textSec'
      }`}
    >
      {children}
    </button>
  );
}

export default function DocentesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [docentes, setDocentes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cursos, setCursos] = useState([]);
  const [roles, setRoles] = useState(['Docente']);

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

  function toggleRolNuevo(rol) {
    setRoles((prev) => {
      const siguiente = prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol];
      return siguiente.length > 0 ? siguiente : prev; // siempre al menos un rol
    });
  }

  async function agregar(e) {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado('/api/docentes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, cursos, roles })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`${nombre} agregado/a al roster.`);
      setNombre(''); setEmail(''); setCursos([]); setRoles(['Docente']);
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

  const docentesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return docentes;
    return docentes.filter((d) => d.nombre.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
  }, [docentes, busqueda]);

  if (cargando || !usuario || !gestion) return null;

  return (
    <div className="max-w-[960px] mx-auto px-6 pb-16 pt-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Docentes y Staff</h1>
        <p className="text-textSec text-sm">
          Roster de personas disponibles para asignar a ediciones.
          {!puedeRoster && ' Solo Coordinación y SuperAdmin pueden agregar o dar de baja personas del roster.'}
        </p>
      </div>

      {error && <p className="text-dangerText text-sm mb-3 bg-dangerBg/40 border border-border rounded-lg px-3 py-2">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3 bg-successBg/40 border border-border rounded-lg px-3 py-2">{mensaje}</p>}

      {puedeRoster && (
        <div
          className="bg-surface2 border border-border rounded-2xl p-5 sm:p-6 mb-8 shadow-sm shadow-black/10"
          data-tour="docentes-agregar"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accentPurple to-accentMagenta flex items-center justify-center text-white text-sm font-bold shrink-0">+</span>
            <h2 className="text-sm font-semibold">Agregar docente al listado</h2>
          </div>
          <form onSubmit={agregar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre</label>
                <input required placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" required placeholder="nombre@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Rol</label>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES_ROSTER.map((r) => (
                  <ChipCurso key={r} activo={roles.includes(r)} onClick={() => toggleRolNuevo(r)}>
                    {ROL_ICONO[r]} {r}
                  </ChipCurso>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Cursos que dicta</label>
              <div className="flex gap-1.5 flex-wrap">
                {CURSOS.map((c) => (
                  <ChipCurso key={c.codigo} activo={cursos.includes(c.codigo)} onClick={() => toggleCurso(c.codigo)}>
                    {c.nombre}
                  </ChipCurso>
                ))}
              </div>
              <p className="text-[11px] text-textMuted mt-1.5">Si la persona es solo Staff, puede dejarse sin cursos.</p>
            </div>
            <div>
              <button type="submit" className={btnCls}>Agregar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-sm font-semibold text-textSec">Roster <span className="text-text">({docentesFiltrados.length})</span></h2>
        <input
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm w-full sm:w-64 transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20 placeholder:text-textMuted"
        />
      </div>

      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : docentesFiltrados.length === 0 ? (
        <p className="text-textMuted text-sm">No se encontró nadie con ese nombre o email.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {docentesFiltrados.map((d) => (
            <FilaDocente key={d.email} d={d} puedeRoster={puedeRoster} onActualizar={actualizar} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaDocente({ d, puedeRoster, onActualizar }) {
  const [cursos, setCursos] = useState(d.cursos);
  const [roles, setRoles] = useState(d.roles || ['Docente']);
  const huboCambiosCursos = cursos.length !== d.cursos.length || cursos.some((c) => !d.cursos.includes(c));
  const rolesActuales = d.roles || ['Docente'];
  const huboCambiosRoles = roles.length !== rolesActuales.length || roles.some((r) => !rolesActuales.includes(r));
  const huboCambios = huboCambiosCursos || huboCambiosRoles;

  function toggleCurso(codigo) {
    const nuevos = cursos.includes(codigo) ? cursos.filter((c) => c !== codigo) : [...cursos, codigo];
    setCursos(nuevos);
  }

  function toggleRol(rol) {
    setRoles((prev) => {
      const siguiente = prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol];
      return siguiente.length > 0 ? siguiente : prev; // siempre al menos un rol
    });
  }

  return (
    <div className="bg-surface2 border border-border rounded-2xl p-4 sm:p-5 transition-colors hover:border-accentTeal/40">
      <div className="flex items-start gap-3.5 flex-wrap sm:flex-nowrap">
        <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${estiloAvatar(d.email)}`}>
          {iniciales(d.nombre)}
        </span>

        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-tight">{d.nombre}</p>
            {rolesActuales.map((r) => (
              <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ROL_BADGE[r] || 'bg-surface text-textMuted'}`}>
                {ROL_ICONO[r] || ''} {r}
              </span>
            ))}
          </div>
          <p className="text-textMuted text-xs mt-0.5">{d.email}</p>

          <div className="mt-3">
            <p className="text-[10.5px] text-textMuted font-medium mb-1">Rol</p>
            <div className="flex gap-1.5 flex-wrap">
              {ROLES_ROSTER.map((r) => (
                <ChipCurso key={r} activo={roles.includes(r)} disabled={!puedeRoster} onClick={() => toggleRol(r)}>
                  {ROL_ICONO[r]} {r}
                </ChipCurso>
              ))}
            </div>
          </div>

          <div className="mt-2.5">
            <p className="text-[10.5px] text-textMuted font-medium mb-1">Cursos que dicta</p>
            <div className="flex gap-1.5 flex-wrap">
              {CURSOS.map((c) => (
                <ChipCurso key={c.codigo} activo={cursos.includes(c.codigo)} disabled={!puedeRoster} onClick={() => toggleCurso(c.codigo)}>
                  {c.nombre}
                </ChipCurso>
              ))}
            </div>
          </div>
        </div>

        {puedeRoster && (
          <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end mt-3 sm:mt-0">
            <button
              className={`${btnSecCls} ${huboCambios ? 'border-accentTeal text-text' : 'opacity-60'}`}
              disabled={!huboCambios}
              onClick={() => onActualizar(d.email, { cursos, roles })}
            >
              Guardar cambios
            </button>
            <button className={btnDangerCls} onClick={() => onActualizar(d.email, { activo: false })}>Dar de baja</button>
          </div>
        )}
      </div>
    </div>
  );
}
