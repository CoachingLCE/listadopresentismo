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

  const puedeVerComo = usuarioReal ? puedeVerComoOtro(usuarioReal) : false;

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
    <div className="max-w-[1440px] mx-auto px-6 pt-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <Link href="/ediciones" className="flex items-center gap-2 shrink-0">
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
              <option value="">👁 Ver como…</option>
              {personas.map((p) => (
                <option key={p.email} value={p.email}>{p.nombre} ({p.roles.join(', ')})</option>
              ))}
            </select>
          )}
          <ThemeSelector />
          {usuarioReal && (
            <div className="text-right text-xs leading-tight">
              <p className="font-semibold">{usuarioReal.nombre}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCambiandoPassword(true)} className="text-textMuted underline">Contraseña</button>
                <button onClick={logout} className="text-textMuted underline">Salir</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="animacion-iluminar bg-gradient-to-br from-accentPurple/10 to-accentTeal/5 border border-accentPurple/20 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accentPurple to-accentMagenta flex items-center justify-center text-white text-sm shrink-0">🧭</span>
        <div>
          <p className="text-[13px] font-semibold text-text">Acompañamos, observamos e intervenimos.</p>
          <p className="text-[11.5px] text-textSec leading-snug mt-0.5">
            El seguimiento del presentismo nos permite conocer la participación de nuestros estudiantes, identificar
            tempranamente situaciones que requieren atención y tomar decisiones oportunas para acompañar sus
            trayectorias.
          </p>
        </div>
      </div>

      <PausaSemanal />

      {verComo && (
        <div className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white text-xs font-semibold rounded-lg px-3.5 py-2 mb-3 flex items-center justify-between gap-2 flex-wrap">
          <span>👁 Viendo como: {verComo.nombre} ({verComo.roles.join(', ')}) — modo solo lectura, no se guarda nada.</span>
          <button onClick={salirVerComo} className="underline shrink-0">Salir del modo vista</button>
        </div>
      )}

      <nav className="mb-5 flex items-center gap-1.5 flex-wrap">
        {links.map((l) => itemNav(l.href, l.label, pathname))}
      </nav>

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
      <TourGuiado />
    </div>
  );
}
