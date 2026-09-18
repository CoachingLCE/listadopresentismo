'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoGestionRosterDocentes, esSuperAdmin } from '../../lib/permisos';
import { CURSOS, colorCurso } from '../../lib/cursosLogic';

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

// Chip de solo lectura para mostrar los cursos de una persona en la fila compacta del
// listado — usa la misma identidad de color por curso que ya existe en Ediciones, aplicada
// de forma sutil (fondo/texto tenue), nunca como color de fondo de toda la fila.
function ChipCursoIdentidad({ codigo }) {
  const color = colorCurso(codigo);
  const curso = CURSOS.find((c) => c.codigo === codigo);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${color.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
      {curso?.nombre || codigo}
    </span>
  );
}

const FILTROS_ROL = [
  { id: 'todos', label: 'Todos' },
  { id: 'Docente', label: 'Docentes' },
  { id: 'Staff', label: 'Staff' }
];

export default function DocentesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [docentes, setDocentes] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cursos, setCursos] = useState([]);
  const [roles, setRoles] = useState(['Docente']);
  const [usuariosConAcceso, setUsuariosConAcceso] = useState([]);

  const gestion = usuario ? tienePermisoGestionAcademica(usuario) : false;
  const puedeRoster = usuario ? tienePermisoGestionRosterDocentes(usuario) : false;
  const superAdmin = usuario ? esSuperAdmin(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !gestion)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && gestion) cargarDocentes();
  }, [usuario]);

  useEffect(() => {
    if (usuario && superAdmin) cargarAccesos();
  }, [usuario, superAdmin]);

  async function cargarAccesos() {
    try {
      const res = await fetchAutenticado('/api/usuarios');
      const data = await res.json();
      if (res.ok) setUsuariosConAcceso(data.usuarios);
    } catch {}
  }

  // Crea o actualiza la contraseña de acceso al sistema para una persona del roster,
  // directamente desde acá — antes había que ir a Accesos y cargar todo de nuevo a mano.
  async function crearOActualizarAcceso(docente, password) {
    setError(''); setMensaje('');
    const yaExiste = usuariosConAcceso.some((u) => u.email.toLowerCase() === docente.email.toLowerCase());
    try {
      const res = yaExiste
        ? await fetchAutenticado(`/api/usuarios/${encodeURIComponent(docente.email)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevaPassword: password })
          })
        : await fetchAutenticado('/api/usuarios', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: docente.email, nombre: docente.nombre, roles: docente.roles || ['Docente'], password })
          });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return false; }
      setMensaje(yaExiste ? `Contraseña actualizada para ${docente.nombre}.` : `Se creó el acceso al sistema para ${docente.nombre}.`);
      cargarAccesos();
      return true;
    } catch {
      setError('Error de conexión.');
      return false;
    }
  }

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
      setDrawerAbierto(false);
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
      if (!res.ok) { setError(data.error); return false; }
      setMensaje('Actualizado.');
      cargarDocentes();
      return true;
    } catch {
      setError('Error de conexión.');
      return false;
    }
  }

  const nombreDuplicado = useMemo(() => {
    const q = nombre.trim().toLowerCase();
    if (!q) return false;
    return docentes.some((d) => d.nombre.trim().toLowerCase() === q);
  }, [nombre, docentes]);

  const docentesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return docentes
      .filter((d) => !q || d.nombre.toLowerCase().includes(q) || d.email.toLowerCase().includes(q))
      .filter((d) => filtroRol === 'todos' || (d.roles || ['Docente']).includes(filtroRol))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [docentes, busqueda, filtroRol]);

  const contadorRol = useMemo(() => ({
    todos: docentes.length,
    Docente: docentes.filter((d) => (d.roles || ['Docente']).includes('Docente')).length,
    Staff: docentes.filter((d) => (d.roles || ['Docente']).includes('Staff')).length
  }), [docentes]);

  const hayFiltrosActivos = busqueda.trim() || filtroRol !== 'todos';

  if (cargando || !usuario || !gestion) return null;

  return (
    <div className="max-w-[1150px] mx-auto px-6 pb-16 pt-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Equipo docente</h1>
          <p className="text-textSec text-sm">
            Listado de personas disponibles para asignar a ediciones.
            {!puedeRoster && ' Solo Coordinación y SuperAdmin pueden agregar o dar de baja personas del listado.'}
          </p>
        </div>
        {puedeRoster && (
          <button onClick={() => setDrawerAbierto(true)} className={btnCls} data-tour="docentes-agregar">
            + Agregar docente
          </button>
        )}
      </div>

      {error && <p className="text-dangerText text-sm mb-3 bg-dangerBg/40 border border-border rounded-lg px-3 py-2">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3 bg-successBg/40 border border-border rounded-lg px-3 py-2">{mensaje}</p>}

      <div className="flex items-center gap-2 flex-wrap mb-4" data-tour="docentes-buscar">
        <input
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email…"
          // type="search" (en vez de "text") es lo que de verdad evita que Chrome ofrezca
          // autocompletar con un email guardado del navegador — autoComplete="off" solo
          // frena a los gestores de contraseñas, no al autocompletado nativo de direcciones.
          type="search" name="filtro-docentes" autoComplete="off" data-1p-ignore data-lpignore="true"
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px] transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20 placeholder:text-textMuted"
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS_ROL.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroRol(f.id)}
              className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                filtroRol === f.id
                  ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
                  : 'bg-surface2 border-border text-textSec hover:border-accentTeal'
              }`}
            >
              {f.label} <span className={filtroRol === f.id ? 'text-white/80' : 'text-textMuted'}>{contadorRol[f.id]}</span>
            </button>
          ))}
        </div>
        {hayFiltrosActivos && (
          <button onClick={() => { setBusqueda(''); setFiltroRol('todos'); }} className="text-xs text-textMuted hover:text-text underline">
            Limpiar
          </button>
        )}
      </div>

      {cargandoLista ? (
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface2 border border-border animate-pulse" />
          ))}
        </div>
      ) : docentesFiltrados.length === 0 ? (
        <div className="bg-surface2 border border-border rounded-2xl p-8 text-center">
          <p className="text-textSec text-sm">
            {docentes.length === 0
              ? 'Todavía no hay nadie cargado en el listado.'
              : 'No se encontró nadie con ese nombre, email o filtro.'}
          </p>
          {docentes.length > 0 && hayFiltrosActivos && (
            <button onClick={() => { setBusqueda(''); setFiltroRol('todos'); }} className="text-xs text-accentTeal hover:underline mt-2">
              Limpiar búsqueda y filtros
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {docentesFiltrados.map((d) => (
            <FilaDocente
              key={d.email} d={d} puedeRoster={puedeRoster} onActualizar={actualizar}
              superAdmin={superAdmin}
              tieneAcceso={usuariosConAcceso.some((u) => u.email.toLowerCase() === d.email.toLowerCase())}
              onCrearAcceso={(password) => crearOActualizarAcceso(d, password)}
            />
          ))}
        </div>
      )}

      {drawerAbierto && puedeRoster && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/60" onClick={() => setDrawerAbierto(false)} />
          <div className="w-full max-w-md h-full bg-surface2 border-l border-border overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accentPurple to-accentMagenta flex items-center justify-center text-white text-sm font-bold shrink-0">+</span>
              <h2 className="text-sm font-semibold flex-1">Agregar docente al listado</h2>
              <button onClick={() => setDrawerAbierto(false)} className="text-textMuted hover:text-text text-lg leading-none" title="Cerrar">✕</button>
            </div>
            <form onSubmit={agregar} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Nombre</label>
                <input
                  required placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className={nombreDuplicado ? inputCls.replace('border-border', 'border-warningText') : inputCls}
                />
                {nombreDuplicado && (
                  <p className="text-warningText text-[11px] mt-1">⚠ Ya existe alguien con ese nombre en el listado — duplicado.</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" required placeholder="nombre@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
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
              <div className="flex gap-2 pt-1">
                <button type="submit" className={btnCls}>Agregar</button>
                <button type="button" onClick={() => setDrawerAbierto(false)} className={btnSecCls}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaDocente({ d, puedeRoster, onActualizar, superAdmin, tieneAcceso, onCrearAcceso }) {
  const [abierto, setAbierto] = useState(false);
  const [cursos, setCursos] = useState(d.cursos);
  const [roles, setRoles] = useState(d.roles || ['Docente']);
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);

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

  async function guardarCambios() {
    setGuardando(true); setGuardadoOk(false);
    const ok = await onActualizar(d.email, { cursos, roles });
    setGuardando(false);
    if (ok) { setGuardadoOk(true); setTimeout(() => setGuardadoOk(false), 2500); }
  }

  async function crearAcceso() {
    setCreandoAcceso(true);
    const ok = await onCrearAcceso(password);
    setCreandoAcceso(false);
    if (ok) setPassword('');
  }

  return (
    <div className="bg-surface2 border border-border rounded-xl transition-colors hover:border-accentTeal/40">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${estiloAvatar(d.email)}`}>
          {iniciales(d.nombre)}
        </span>

        <div className="flex items-center gap-2 min-w-[160px] shrink-0">
          <p className="font-semibold text-sm leading-tight truncate max-w-[180px]">{d.nombre}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {rolesActuales.map((r) => (
            <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${ROL_BADGE[r] || 'bg-surface text-textMuted'}`}>
              {ROL_ICONO[r] || ''} {r}
            </span>
          ))}
        </div>

        <p className="text-textMuted text-xs truncate hidden sm:block sm:w-48 shrink-0">{d.email}</p>

        <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
          {cursos.slice(0, 3).map((c) => <ChipCursoIdentidad key={c} codigo={c} />)}
          {cursos.length > 3 && <span className="text-[10px] text-textMuted shrink-0">+{cursos.length - 3}</span>}
        </div>

        <span className="text-accentTeal text-xs font-medium shrink-0 whitespace-nowrap">
          {abierto ? 'Cerrar ▲' : 'Editar →'}
        </span>
      </button>

      {abierto && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
            {/* A: Información personal */}
            <div>
              <p className="text-[10.5px] text-textMuted font-semibold uppercase tracking-wide mb-2">Información personal</p>
              <div className="bg-bg border border-border rounded-lg px-3 py-2.5">
                <p className="text-sm font-semibold">{d.nombre}</p>
                <p className="text-textMuted text-xs mt-0.5">{d.email}</p>
              </div>
            </div>

            {/* B: Cursos (+ Rol, van juntos porque definen el mismo tipo de asignación) */}
            <div>
              <p className="text-[10.5px] text-textMuted font-semibold uppercase tracking-wide mb-2">Rol y cursos</p>
              <div className="bg-bg border border-border rounded-lg px-3 py-2.5">
                <p className="text-[10.5px] text-textMuted font-medium mb-1.5">Rol</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {ROLES_ROSTER.map((r) => (
                    <ChipCurso key={r} activo={roles.includes(r)} disabled={!puedeRoster} onClick={() => toggleRol(r)}>
                      {ROL_ICONO[r]} {r}
                    </ChipCurso>
                  ))}
                </div>
                <p className="text-[10.5px] text-textMuted font-medium mb-1.5">Cursos que dicta</p>
                <div className="flex gap-1.5 flex-wrap">
                  {CURSOS.map((c) => (
                    <ChipCurso key={c.codigo} activo={cursos.includes(c.codigo)} disabled={!puedeRoster} onClick={() => toggleCurso(c.codigo)}>
                      {c.nombre}
                    </ChipCurso>
                  ))}
                </div>
              </div>
            </div>

            {/* C: Acceso al sistema — solo SuperAdmin, siempre separado como sección propia */}
            {superAdmin && (
              <div className="md:col-span-2">
                <p className="text-[10.5px] text-textMuted font-semibold uppercase tracking-wide mb-2">Acceso al sistema</p>
                <div className="bg-bg border border-border rounded-lg px-3 py-2.5">
                  <p className="text-xs mb-2">
                    <span className={tieneAcceso ? 'text-successText font-medium' : 'text-textMuted'}>
                      {tieneAcceso ? '● Ya tiene acceso' : '○ Sin acceso todavía'}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input
                        type={verPassword ? 'text' : 'password'}
                        placeholder={tieneAcceso ? 'Nueva contraseña (min 8)' : 'Contraseña (min 8)'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="bg-surface2 border border-border rounded-lg pl-2.5 pr-7 py-1.5 text-xs w-48"
                      />
                      <button
                        type="button" onClick={() => setVerPassword((v) => !v)}
                        title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-text text-xs leading-none"
                      >
                        {verPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button
                      className={btnSecCls}
                      disabled={password.length < 8 || creandoAcceso}
                      onClick={crearAcceso}
                    >
                      {creandoAcceso ? 'Guardando…' : tieneAcceso ? 'Cambiar contraseña' : 'Crear acceso'}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-dangerText text-[11px] mt-1">La contraseña tiene que tener al menos 8 caracteres (le faltan {8 - password.length}).</p>
                  )}
                </div>
              </div>
            )}

            {/* D: Acciones — Guardar cambios (primaria) separada de Dar de baja (destructiva) */}
            {puedeRoster && (
              <div className="md:col-span-2 pt-1 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      className={btnCls}
                      disabled={!huboCambios || guardando}
                      onClick={guardarCambios}
                    >
                      {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    {guardadoOk && <span className="text-successText text-xs font-medium">✓ Guardado</span>}
                    {huboCambios && !guardando && !guardadoOk && <span className="text-textMuted text-xs">Hay cambios sin guardar</span>}
                  </div>
                  <button className={btnDangerCls} onClick={() => onActualizar(d.email, { activo: false })}>
                    Dar de baja
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
