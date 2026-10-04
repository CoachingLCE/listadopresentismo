'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';
import {
  tienePermisoGestionAcademica, tienePermisoGestionRosterDocentes, tienePermisoVerSeguimiento,
  tienePermisoVerHistorial, tienePermisoAccesos, tienePermisoVerReportes, puedeVerComoOtro
} from '../lib/permisos';
import { TOUR_PASOS, TAREAS_AYUDA } from '../lib/tourSteps';
import { APP_VERSION } from '../lib/version';

export default function TourGuiado() {
  // Ojo: `usuario` acá ya es el usuario EFECTIVO (ver lib/useSession.js) — mientras alguien
  // está en modo "Ver como", es la persona que se está mirando, no quien la está mirando.
  // Por eso el recorrido/tareas se filtran solos según a quién se está viendo.
  const { usuario } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [activo, setActivo] = useState(false);
  const [pasoId, setPasoId] = useState(null);
  const [modoTarea, setModoTarea] = useState(false);
  const [rect, setRect] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const CHEQUEOS = useMemo(() => ({
    gestion: () => tienePermisoGestionAcademica(usuario),
    puedeRoster: () => tienePermisoGestionRosterDocentes(usuario),
    seguimiento: () => tienePermisoVerSeguimiento(usuario),
    historial: () => tienePermisoVerHistorial(usuario),
    accesos: () => tienePermisoAccesos(usuario),
    reportes: () => tienePermisoVerReportes(usuario),
    verComo: () => puedeVerComoOtro(usuario)
  }), [usuario]);
  const permitido = useCallback((p) => !p.requiere || (CHEQUEOS[p.requiere]?.() ?? true), [CHEQUEOS]);
  const pasos = useMemo(() => TOUR_PASOS.filter(permitido), [permitido]);
  const tareas = useMemo(() => TAREAS_AYUDA.filter(permitido), [permitido]);

  const idx = pasoId ? pasos.findIndex((p) => p.id === pasoId) : -1;
  const pasoActual = idx >= 0 ? pasos[idx] : null;
  const total = pasos.length;

  const ubicarElemento = useCallback(() => {
    if (!pasoActual || !pasoActual.selector) { setRect(null); return; }
    const el = document.querySelector(pasoActual.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setRect(null);
    }
  }, [pasoActual]);

  // Si el paso vive en otra página, navegar para allá; si no, buscar el elemento en el
  // DOM (con un par de reintentos cortos, porque la página recién montada puede tardar
  // un instante en renderizar el contenido real).
  useEffect(() => {
    if (!activo || !pasoActual) return;
    if (pasoActual.pagina && pasoActual.pagina !== pathname) {
      setBuscando(true);
      router.push(pasoActual.pagina);
      return;
    }
    setBuscando(false);
    let intentos = 0;
    const id = setInterval(() => {
      intentos++;
      const listo = !pasoActual.selector || document.querySelector(pasoActual.selector);
      if (listo || intentos > 20) {
        clearInterval(id);
        ubicarElemento();
      }
    }, 100);
    return () => clearInterval(id);
  }, [activo, pasoActual, pathname, router, ubicarElemento]);

  useEffect(() => {
    if (!activo) return;
    const onCambio = () => ubicarElemento();
    window.addEventListener('resize', onCambio);
    window.addEventListener('scroll', onCambio, true);
    return () => { window.removeEventListener('resize', onCambio); window.removeEventListener('scroll', onCambio, true); };
  }, [activo, ubicarElemento]);

  function iniciarCompleto() {
    setMenuAbierto(false);
    setModoTarea(false);
    setActivo(true);
    setPasoId(pasos[0].id);
  }
  function iniciarTarea(tarea) {
    setMenuAbierto(false);
    setModoTarea(true);
    setActivo(true);
    setPasoId(tarea.pasoInicial);
  }
  function siguiente() {
    if (modoTarea) { cerrar(); return; }
    const next = pasos[idx + 1];
    if (!next) { cerrar(); return; }
    setPasoId(next.id);
  }
  function anterior() {
    const prev = pasos[idx - 1];
    if (prev) setPasoId(prev.id);
  }
  function cerrar() {
    setActivo(false);
    setPasoId(null);
    setRect(null);
  }

  return (
    <>
      <button
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Necesito ayuda"
        aria-expanded={menuAbierto}
        className="fixed bottom-16 right-5 z-[90] h-12 w-12 sm:w-auto sm:px-4 justify-center bg-surface text-text border border-border text-sm font-semibold rounded-full shadow-lg flex items-center gap-2 hover:bg-surface2 transition-colors no-print"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accentMagenta shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
        </svg>
        <span className="hidden sm:inline">Necesito ayuda</span>
      </button>

      {menuAbierto && !activo && (
        <div className="fixed inset-0 z-[91] flex items-end justify-end p-5" onClick={() => setMenuAbierto(false)}>
          <div className="bg-surface2 border border-border rounded-2xl p-4 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-1">Te mostramos cómo funciona Presentismo ILCE</h3>
            <p className="text-xs text-textSec mb-3">Vamos a recorrer juntos las principales funciones de la aplicación.</p>
            <button
              className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-3 py-2 text-sm font-semibold mb-3"
              onClick={iniciarCompleto}
            >
              Comenzar recorrido
            </button>
            <p className="text-[12px] text-textMuted mb-1.5 font-semibold">O elegí una tarea puntual:</p>
            <div className="flex flex-col gap-1">
              {tareas.map((t) => (
                <button
                  key={t.id}
                  className="text-left text-xs text-textSec hover:text-text bg-bg border border-border rounded-lg px-2.5 py-1.5"
                  onClick={() => iniciarTarea(t)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              className="mt-3 w-full flex items-center justify-between text-left text-[13px] text-textSec hover:text-text border-t border-border pt-3"
              onClick={() => {
                setMenuAbierto(false);
                window.dispatchEvent(new Event('ilce:novedades'));
              }}
            >
              <span>Novedades de la app</span>
              <span className="text-textMuted">v{APP_VERSION}</span>
            </button>
          </div>
        </div>
      )}

      {activo && pasoActual && (
        <TourOverlay
          paso={pasoActual}
          idx={idx}
          total={total}
          rect={rect}
          buscando={buscando}
          modoTarea={modoTarea}
          onSiguiente={siguiente}
          onAnterior={anterior}
          onSalir={cerrar}
        />
      )}
    </>
  );
}

function TourOverlay({ paso, idx, total, rect, buscando, modoTarea, onSiguiente, onAnterior, onSalir }) {
  const esFinal = idx === total - 1;

  const tooltipStyle = useMemo(() => {
    if (typeof window === 'undefined' || !rect) return null;
    const anchoTooltip = 320;
    const altoAprox = 220;
    const debajo = rect.top + rect.height + altoAprox < window.innerHeight;
    const top = debajo ? rect.top + rect.height + 14 : Math.max(14, rect.top - 14 - altoAprox);
    const left = Math.min(Math.max(14, rect.left), window.innerWidth - anchoTooltip - 14);
    return { top, left, width: anchoTooltip };
  }, [rect]);

  return (
    <div className="fixed inset-0 z-[95]">
      {rect ? (
        <>
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top - 6, left: 0, width: Math.max(0, rect.left - 6), height: rect.height + 12 }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top - 6, left: rect.left + rect.width + 6, right: 0, height: rect.height + 12 }} onClick={onSalir} />
          <div className="fixed bg-black/70 transition-all duration-200" style={{ top: rect.top + rect.height + 6, left: 0, right: 0, bottom: 0 }} onClick={onSalir} />
          <div
            className="fixed rounded-lg ring-2 ring-accentTeal pointer-events-none transition-all duration-200"
            style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 4px rgba(45,212,191,0.25)' }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/70" onClick={onSalir} />
      )}

      <div
        className="fixed bg-surface2 border border-border rounded-2xl p-4 shadow-2xl"
        style={tooltipStyle || { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320 }}
      >
        {!esFinal && <p className="text-[12px] text-textMuted mb-1.5 font-semibold">{idx + 1} de {total}</p>}
        <h3 className="text-sm font-semibold mb-1.5">{paso.titulo}</h3>
        {buscando ? (
          <p className="text-xs text-textSec mb-3">Cargando…</p>
        ) : (
          <>
            <p className="text-xs text-textSec mb-1.5">{paso.texto}</p>
            {paso.accion && <p className="text-xs text-textMuted mb-3">{paso.accion}</p>}
          </>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <button className="text-xs text-textMuted" onClick={onSalir}>Salir</button>
          <div className="flex gap-1.5">
            {idx > 0 && !modoTarea && (
              <button className="bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs" onClick={onAnterior}>← Atrás</button>
            )}
            <button className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={onSiguiente}>
              {esFinal || modoTarea ? 'Listo' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
