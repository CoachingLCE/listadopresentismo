'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '../lib/useSession';
import { tienePermisoGestionAcademica, tienePermisoVerHistorial, tienePermisoAccesos, tienePermisoVerReportes, tienePermisoVerSeguimiento, puedeVerComoOtro } from '../lib/permisos';
import ThemeSelector from './ThemeSelector';
import CambiarPasswordModal from './CambiarPasswordModal';
import Logo from './Logo';
import TourGuiado from './TourGuiado';
import PausaSemanal from './PausaSemanal';

function link(href, label) {
  return { href, label };
}

// ---- Barra lateral (escritorio) -------------------------------------------------------------
// Pedido de Diego (04/10/2026): navegación "más estética y prolija". En pantallas grandes (>= lg)
// los destinos pasan a una barra lateral fija; en tablet siguen los botones en fila y en celular el
// menú desplegable.
const ICONOS = {
  ediciones: <><path d="m12 2 10 5-10 5L2 7l10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
  nueva: <><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></>,
  equipo: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  estudiantes: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  asistencia: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  zoom: <><path d="m22 8-6 4 6 4V8z" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
  seguimiento: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  reportes: <path d="M12 20V10M18 20V4M6 20v-4" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  reloj: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  llave: <><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /><circle cx="7.5" cy="15.5" r="5.5" /></>
};
const ICONO_POR_RUTA = {
  '/ediciones': 'ediciones', '/nueva-edicion': 'nueva', '/docentes': 'equipo', '/estudiantes': 'estudiantes', '/carga': 'asistencia',
  '/credenciales-zoom': 'zoom', '/seguimiento': 'seguimiento', '/reportes': 'reportes', '/emails': 'mail', '/historial': 'reloj', '/accesos': 'llave'
};
function Icono({ nombre, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {ICONOS[nombre]}
    </svg>
  );
}
function ItemLateral({ href, label, pathname }) {
  const activo = pathname === href;
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      className={`relative flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] transition-colors ${
        activo ? 'bg-accentPurple/15 text-accentMagenta font-semibold' : 'text-textSec hover:text-text hover:bg-surface2 font-medium'
      }`}>
      {activo && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accentMagenta" />}
      <Icono nombre={ICONO_POR_RUTA[href]} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function itemNav(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-8 flex items-center px-3.5 rounded-lg text-[13px] font-medium border whitespace-nowrap transition-colors ${
        pathname === href
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
          : 'bg-surface2 border-border text-textSec hover:text-text hover:border-accentTeal'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const { usuario, usuarioReal, logout, fetchAutenticado, verComo, entrarVerComo, salirVerComo } = useSession();
  const pathname = usePathname();
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const puedeVerComo = usuarioReal ? puedeVerComoOtro(usuarioReal) : false;

  // Deja lugar a la barra lateral en pantallas grandes (ver .con-menu-lateral en globals.css).
  useEffect(() => {
    document.body.classList.add('con-menu-lateral');
    return () => document.body.classList.remove('con-menu-lateral');
  }, []);

  // En celular el menú se cierra solo al cambiar de pantalla, y con Esc.
  useEffect(() => { setMenuAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarConEsc = (ev) => { if (ev.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('keydown', cerrarConEsc);
    return () => document.removeEventListener('keydown', cerrarConEsc);
  }, [menuAbierto]);

  useEffect(() => {
    if (!puedeVerComo) return;
    fetchAutenticado('/api/personas-vista')
      .then((res) => res.json())
      .then((data) => setPersonas(data.personas || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeVerComo]);

  if (!usuarioReal || pathname === '/login' || pathname === '/setup-password') return null;

  const gestion = tienePermisoGestionAcademica(usuario);
  const historial = tienePermisoVerHistorial(usuario);
  const accesos = tienePermisoAccesos(usuario);
  const reportes = tienePermisoVerReportes(usuario);
  const seguimiento = tienePermisoVerSeguimiento(usuario);

  const links = [
    link('/ediciones', 'Ediciones'),
    gestion && link('/nueva-edicion', 'Nueva edición'),
    gestion && link('/docentes', 'Equipo docente'),
    gestion && link('/estudiantes', 'Estudiantes'),
    link('/carga', 'Cargar asistencia'),
    link('/credenciales-zoom', 'Credenciales Zoom'),
    seguimiento && link('/seguimiento', 'Seguimiento'),
    reportes && link('/reportes', 'Reportes'),
    reportes && link('/emails', 'Emails'),
    historial && link('/historial', 'Historial'),
    accesos && link('/accesos', 'Accesos')
  ].filter(Boolean);

  function onCambiarVerComo(email) {
    if (!email) { salirVerComo(); return; }
    const persona = personas.find((p) => p.email === email);
    if (persona) entrarVerComo(persona);
  }

  return (
    <>
    {/* BARRA LATERAL — solo escritorio (>= lg) */}
    <aside aria-label="Navegación principal" className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col border-r border-border bg-surface no-print">
      <div className="px-5 pt-5 pb-4">
        <Link href="/ediciones" aria-label="Ir a Ediciones"><Logo height={30} /></Link>
        <p className="mt-1.5 text-[12px] font-semibold tracking-[0.14em] uppercase text-textMuted">Presentismo</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {links.map((l) => <ItemLateral key={l.href} href={l.href} label={l.label} pathname={pathname} />)}
      </nav>
      {usuarioReal && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="w-9 h-9 rounded-full bg-accentPurple/15 text-accentMagenta font-bold flex items-center justify-center text-[14px] shrink-0">
              {(usuarioReal.nombre || '?').trim().charAt(0).toUpperCase()}
            </span>
            <p className="text-[13px] font-semibold leading-tight truncate min-w-0 flex-1">{usuarioReal.nombre}</p>
          </div>
          <div className="mt-2 flex gap-4 text-[12px]">
            <button onClick={() => setCambiandoPassword(true)} className="text-textMuted hover:text-text underline">Contraseña</button>
            <button onClick={logout} className="text-textMuted hover:text-text underline">Salir</button>
          </div>
        </div>
      )}
    </aside>

    <div className="max-w-[1440px] mx-auto px-6 pt-4 flex flex-col">
      <div className="order-1 flex items-center justify-between lg:justify-end mb-3 gap-3 flex-wrap">
        <Link href="/ediciones" className="flex items-center gap-2 shrink-0 lg:hidden">
          <Logo height={28} />
          <span className="text-sm font-bold text-textMuted">Presentismo</span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {puedeVerComo && (
            <select
              data-tour="nav-ver-como"
              value={verComo?.email || ''}
              onChange={(e) => onCambiarVerComo(e.target.value)}
              className="h-8 bg-surface2 border border-border rounded-lg px-2 text-xs text-textSec max-w-[160px]"
              title="Previsualizar la app como otra persona (solo lectura)"
            >
              <option value="">Ver como…</option>
              {personas.map((p) => (
                <option key={p.email} value={p.email}>{p.nombre} ({p.roles.join(', ')})</option>
              ))}
            </select>
          )}
          <ThemeSelector />
          {usuarioReal && (
            <div className="text-right text-xs leading-tight lg:hidden">
              <p className="font-semibold">{usuarioReal.nombre}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCambiandoPassword(true)} className="text-textMuted underline">Contraseña</button>
                <button onClick={logout} className="text-textMuted underline">Salir</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="order-4 md:order-2 animacion-iluminar bg-gradient-to-br from-accentPurple/10 to-accentTeal/5 border border-accentPurple/20 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accentPurple to-accentMagenta flex items-center justify-center text-white text-sm shrink-0"></span>
        <div>
          <p className="text-[13px] font-semibold text-text">Acompañamos, observamos e intervenimos.</p>
          <p className="text-[12px] text-textSec leading-snug mt-0.5">
            El seguimiento del presentismo nos permite conocer la participación de nuestros estudiantes, identificar
            tempranamente situaciones que requieren atención y tomar decisiones oportunas para acompañar sus
            trayectorias.
          </p>
        </div>
      </div>

      <div className="order-5 md:order-3">
        <PausaSemanal />
      </div>

      {verComo && (
        <div className="order-2 md:order-4 bg-gradient-to-r from-accentPurple to-accentMagenta text-white text-xs font-semibold rounded-lg px-3.5 py-2 mb-3 flex items-center justify-between gap-2 flex-wrap">
          <span> Viendo como: {verComo.nombre} ({verComo.roles.join(', ')}) — modo solo lectura, no se guarda nada.</span>
          <button onClick={salirVerComo} className="underline shrink-0">Salir del modo vista</button>
        </div>
      )}

      <nav className="mb-5 order-3 md:order-5" aria-label="Principal">
        {/* Pantallas medianas y grandes: todos los botones en una fila */}
        <div className="hidden md:flex lg:hidden items-center gap-1.5 flex-wrap">
          {links.map((l) => itemNav(l.href, l.label, pathname))}
        </div>

        {/* Celular: un solo botón con la pantalla actual que despliega la lista (antes eran 11 botones apilados) */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            className="w-full h-11 flex items-center justify-between px-4 rounded-xl bg-surface2 border border-border text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              {(links.find((l) => l.href === pathname) || links[0]).label}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${menuAbierto ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {menuAbierto && (
            <div className="mt-2 grid gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`h-11 flex items-center px-3.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white'
                      : 'text-textSec hover:bg-surface2 hover:text-text'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
      <TourGuiado />
    </div>
    </>
  );
}
