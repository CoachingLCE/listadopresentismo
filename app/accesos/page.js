'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

const ROLES_DISPONIBLES = ['SuperAdmin', 'Coordinacion', 'Academico', 'Docente', 'Staff'];
const ROLES_RESERVADOS = ['SuperAdmin'];

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

export default function AccesosPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRoles, setNuevoRoles] = useState(['Docente']);
  const [nuevoPassword, setNuevoPassword] = useState('');

  const esSuperAdmin = (usuario?.roles || []).includes('SuperAdmin');

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarUsuarios();
  }, [usuario]);

  async function cargarUsuarios() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/usuarios');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar la lista.'); return; }
      setUsuarios(data.usuarios);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  function tocaReservado(roles) {
    return roles.some((r) => ROLES_RESERVADOS.includes(r));
  }

  async function crear(e) {
    e.preventDefault();
    setError(''); setMensaje('');
    if (nuevoPassword && nuevoPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres (o dejala vacía para que la persona la asigne después).');
      return;
    }
    try {
      const res = await fetchAutenticado('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevoEmail, nombre: nuevoNombre, roles: nuevoRoles, password: nuevoPassword || undefined })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`Usuario ${nuevoEmail} creado.${nuevoPassword ? ' Ya puede entrar con la contraseña que pusiste.' : ' Todavía sin contraseña — puede asignarla desde /setup-password.'}`);
      setNuevoEmail(''); setNuevoNombre(''); setNuevoRoles(['Docente']); setNuevoPassword('');
      cargarUsuarios();
    } catch {
      setError('Error de conexión.');
    }
  }

  async function actualizar(email, cambios) {
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado(`/api/usuarios/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return { ok: false, error: data.error }; }
      setMensaje(`${email} actualizado.`);
      await cargarUsuarios();
      return { ok: true };
    } catch {
      setError('Error de conexión.');
      return { ok: false, error: 'Error de conexión.' };
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Accesos</h1>
      <p className="text-textSec text-sm mb-5">
        Gestioná quién entra a Presentismo ILCE y con qué rol.
        {!esSuperAdmin && ' Como no sos SuperAdmin, no podés crear ni editar usuarios SuperAdmin.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      <div className="bg-surface2 border border-border rounded-2xl p-5 mb-6" data-tour="accesos-nuevo">
        <h2 className="text-sm font-semibold mb-3">➕ Nuevo usuario</h2>
        <form onSubmit={crear} className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs text-textSec block mb-1">Email</label>
            <input type="email" required value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Nombre</label>
            <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-textSec block mb-1">Contraseña (opcional, mínimo 8 caracteres)</label>
            <input
              type="text" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)}
              placeholder="Dejala vacía para que la persona la asigne ella misma desde /setup-password"
              className={inputCls}
            />
            {nuevoPassword.length > 0 && nuevoPassword.length < 8 && (
              <p className="text-dangerText text-[11px] mt-1">La contraseña tiene que tener al menos 8 caracteres (le faltan {8 - nuevoPassword.length}).</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-textSec block mb-1.5">Rol</label>
            <div className="flex gap-4 flex-wrap">
              {ROLES_DISPONIBLES.map((rol) => {
                const bloqueado = ROLES_RESERVADOS.includes(rol) && !esSuperAdmin;
                return (
                  <label key={rol} className={`text-sm flex gap-1.5 items-center ${bloqueado ? 'text-textMuted' : 'text-text'}`}>
                    <input type="radio" name="rolNuevo" disabled={bloqueado} checked={nuevoRoles.includes(rol)} onChange={() => setNuevoRoles([rol])} />
                    {rol}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="col-span-2">
            <button type="submit" className={btnCls}>Crear usuario</button>
          </div>
        </form>
      </div>

      <h2 className="text-sm font-semibold mb-3">Usuarios ({usuarios.length})</h2>
      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {usuarios.map((u) => (
            <FilaUsuario
              key={u.email}
              u={u}
              puedeEditar={!tocaReservado(u.roles) || esSuperAdmin}
              onActualizar={actualizar}
            />
          ))}
        </div>
      )}

      <div className="bg-surface2 border border-border rounded-2xl p-5 mt-6">
        <h2 className="text-sm font-semibold mb-3">¿Qué puede hacer cada rol?</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-textSec">SuperAdmin</p>
            <p className="text-xs text-textMuted">Ve y edita todo, sin excepción — incluida la gestión de otros usuarios SuperAdmin.</p>
          </div>
          <div>
            <p className="font-semibold text-textSec">Coordinación</p>
            <p className="text-xs text-textMuted">Igual que SuperAdmin en lo académico: crea ediciones, carga estudiantes, edita estados, ve el Historial de acciones — y además puede agregar o sacar docentes/staff del sistema.</p>
          </div>
          <div>
            <p className="font-semibold text-textSec">Académico</p>
            <p className="text-xs text-textMuted">Igual que Coordinación (crea ediciones, asigna docente/staff ya cargados, carga estudiantes, edita estados, seguimiento), pero no puede agregar ni sacar docentes del sistema, ni ver el Historial de acciones.</p>
          </div>
          <div>
            <p className="font-semibold text-textSec">Docente</p>
            <p className="text-xs text-textMuted">Ve solo las ediciones que tiene asignadas. Puede cargar/modificar presentismo y escribir observaciones sobre los estudiantes del listado.</p>
          </div>
          <div>
            <p className="font-semibold text-textSec">Staff</p>
            <p className="text-xs text-textMuted">Ve solo las ediciones que tiene asignadas. Puede cargar/modificar presentismo, pero no escribir observaciones sobre estudiantes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function rolMasAlto(roles) {
  for (const r of ROLES_DISPONIBLES) if (roles.includes(r)) return r;
  return roles[0] || 'Docente';
}

function FilaUsuario({ u, puedeEditar, onActualizar }) {
  const [rol, setRol] = useState(rolMasAlto(u.roles));
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [avisoRol, setAvisoRol] = useState(null); // { ok, texto } | null

  // Si el guardado falló (o lo hizo otra persona desde otra pestaña), el radio
  // vuelve a reflejar el rol REAL apenas se refresca la lista — así el fallo se
  // ve enseguida en vez de quedar "pegado" en lo último que se clickeó.
  useEffect(() => {
    setRol(rolMasAlto(u.roles));
  }, [u.roles.join(',')]);

  async function guardarRol() {
    setGuardandoRol(true);
    setAvisoRol(null);
    const resultado = await onActualizar(u.email, { roles: [rol] });
    setGuardandoRol(false);
    setAvisoRol(
      resultado.ok
        ? { ok: true, texto: '✓ Rol guardado' }
        : { ok: false, texto: resultado.error || 'No se pudo guardar.' }
    );
  }

  return (
    <div className="bg-surface2 border border-border rounded-xl p-3.5">
      <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
        <div>
          <span className="font-semibold text-sm">{u.nombre}</span>
          <span className="text-textSec text-xs ml-2">{u.email}</span>
        </div>
        <span className={`text-[11.5px] ${u.activo ? 'text-successText' : 'text-dangerText'}`}>
          {u.activo ? '● Activo' : '● Desactivado'} {!u.tieneContrasena && '· sin contraseña asignada'}
        </span>
      </div>

      {!puedeEditar ? (
        <p className="text-xs text-textMuted">Solo un SuperAdmin puede editar este usuario.</p>
      ) : (
        <div className="flex flex-wrap gap-3.5 items-center">
          {ROLES_DISPONIBLES.map((r) => (
            <label key={r} className="text-xs flex gap-1 items-center">
              <input type="radio" name={`rol-${u.email}`} checked={rol === r} onChange={() => setRol(r)} />
              {r}
            </label>
          ))}
          <div className="flex flex-col gap-1">
            <button className={btnSecCls} onClick={guardarRol} disabled={guardandoRol}>
              {guardandoRol ? 'Guardando…' : 'Guardar rol'}
            </button>
            {avisoRol && (
              <p className={`text-[11px] ${avisoRol.ok ? 'text-successText' : 'text-dangerText'}`}>{avisoRol.texto}</p>
            )}
          </div>
          <button className={btnSecCls} onClick={() => onActualizar(u.email, { activo: !u.activo })}>
            {u.activo ? 'Desactivar' : 'Reactivar'}
          </button>
          <div className="flex flex-col gap-1">
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'} placeholder="Nueva contraseña (min 8)" value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="bg-bg border border-border rounded-lg pl-2 pr-7 py-1.5 text-xs w-44"
              />
              <button
                type="button" onClick={() => setVerPassword((v) => !v)}
                title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-text text-xs leading-none"
              >
                {verPassword ? '🙈' : '👁'}
              </button>
            </div>
            {nuevaPassword.length > 0 && nuevaPassword.length < 8 && (
              <p className="text-dangerText text-[11px]">La contraseña tiene que tener al menos 8 caracteres (le faltan {8 - nuevaPassword.length}).</p>
            )}
          </div>
          <button
            className={btnSecCls}
            onClick={() => { onActualizar(u.email, { nuevaPassword }); setNuevaPassword(''); }}
            disabled={nuevaPassword.length > 0 && nuevaPassword.length < 8}
          >
            Resetear contraseña
          </button>
        </div>
      )}
    </div>
  );
}
