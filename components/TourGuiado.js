'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TOUR_PASOS, TAREAS_AYUDA } from '../lib/tourSteps';

export default function TourGuiado() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [activo, setActivo] = useState(false);
  const [pasoId, setPasoId] = useState(null);
  const [modoTarea, setModoTarea] = useState(false);
  const [rect, setRect] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const idx = pasoId ? TOUR_PASOS.findIndex((p) => p.id === pasoId) : -1;
  const pasoActual = idx >= 0 ? TOUR_PASOS[idx] : null;
  const total = TOUR_PASOS.length;

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
    setPasoId(TOUR_PASOS[0].id);
  }
  function iniciarTarea(tarea) {
    setMenuAbierto(false);
    setModoTarea(true);
    setActivo(true);
    setPasoId(tarea.pasoInicial);
  }
  function siguiente() {
    if (modoTarea) { cerrar(); return; }
    const next = TOUR_PASOS[idx + 1];
    if (!next) { cerrar(); return; }
    setPasoId(next.id);
  }
  function anterior() {
    const prev = TOUR_PASOS[idx - 1];
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
        className="fixed bottom-5 right-5 z-[90] bg-gradient-to-r from-accentPurple to-accentMagenta text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity no-print"
      >
        ❓ Necesito ayuda
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
            <p className="text-[11px] text-textMuted mb-1.5 font-semibold">O elegí una tarea puntual:</p>
            <div className="flex flex-col gap-1">
              {TAREAS_AYUDA.map((t) => (
                <button
                  key={t.id}
                  className="text-left text-xs text-textSec hover:text-text bg-bg border border-border rounded-lg px-2.5 py-1.5"
                  onClick={() => iniciarTarea(t)}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
        {!esFinal && <p className="text-[11px] text-textMuted mb-1.5 font-semibold">{idx + 1} de {total}</p>}
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
