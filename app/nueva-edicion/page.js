'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { CURSOS, cursoPorCodigo, colorCurso, generarCalendario, fechaFinEstimada, nombreCurso } from '../../lib/cursosLogic';
import { estadoCalculado, LABEL_ESTADO_EDICION, BADGE_ESTADO_EDICION } from '../../lib/edicionesEstadoCliente';

const labelCls = 'text-xs text-textSec font-medium block mb-1.5';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20';
const inputErrCls = 'w-full bg-bg border border-dangerText rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-dangerText/20';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm shadow-accentPurple/20 transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
const btnSecCls = 'bg-transparent border border-border rounded-lg px-5 py-2.5 text-sm font-medium text-textSec transition-colors hover:border-accentTeal hover:text-text';

function Seccion({ titulo, descripcion, children }) {
  return (
    <div className="border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <h2 className="text-sm font-semibold mb-0.5">{titulo}</h2>
      {descripcion && <p className="text-[11.5px] text-textMuted mb-3">{descripcion}</p>}
      {!descripcion && <div className="mb-3" />}
      {children}
    </div>
  );
}

// Selector de curso a medida — un <select> nativo no permite poner en negrita solo el
// nombre del curso y dejar "(N clases)"/"(a demanda)" en peso normal (las <option> nativas
// no soportan HTML/estilos parciales adentro), así que este dropdown se arma con divs
// para poder controlar ese detalle.
function SelectorCurso({ value, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const actual = cursoPorCodigo(value);
  const colorActual = colorCurso(value);

  useEffect(() => {
    function onClickFuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    function onEscape(e) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${colorActual.dot}`} />
          <span className="truncate">
            <span className="font-bold">{actual?.nombre}</span>{' '}
            <span className="text-textMuted font-normal">{actual?.ondemand ? '(a demanda)' : `(${actual?.totalClases} clases)`}</span>
          </span>
        </span>
        <span className={`text-textMuted text-xs shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full bg-surface2 border border-border rounded-lg shadow-lg shadow-black/30 max-h-64 overflow-y-auto">
          {CURSOS.map((c) => {
            const col = colorCurso(c.codigo);
            const seleccionado = c.codigo === value;
            return (
              <button
                key={c.codigo}
                type="button"
                onClick={() => { onChange(c.codigo); setAbierto(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  seleccionado ? 'bg-accentPurple/15' : 'hover:bg-bg'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <span className="truncate">
                  <span className="font-bold">{c.nombre}</span>{' '}
                  <span className="text-textMuted font-normal">{c.ondemand ? '(a demanda)' : `(${c.totalClases} clases)`}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Campo({ label, requerido, error, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {requerido && <span className="text-accentMagenta">*</span>}
      </label>
      {children}
      {error && <p className="text-dangerText text-[11px] mt-1">{error}</p>}
    </div>
  );
}

function FilaPreview({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-[11.5px] text-textMuted shrink-0">{label}</span>
      <span className="text-[12.5px] font-medium text-right truncate">{children}</span>
    </div>
  );
}

// Vista previa de la edición a crear — no toca la lógica ni la API, es puramente una
// composición más visual de los mismos datos que ya se calculan en el formulario.
function VistaPrevia({ curso, numero, docenteNombre, staffNombre, fechaInicio, fechaFinPreview, calendarioPreview, cursoInfo, totalOverride }) {
  const [verCalendario, setVerCalendario] = useState(false);
  const color = colorCurso(curso);
  const estado = fechaInicio ? estadoCalculado({ fechaInicio, fechaFin: fechaFinPreview, estado: '' }) : null;

  return (
    <div className="bg-surface2 border border-border rounded-2xl p-5 shadow-sm shadow-black/10">
      <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wide mb-3">Vista previa</p>

      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
          <p className="font-semibold text-sm truncate">{nombreCurso(curso)}</p>
        </div>
        {estado && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${BADGE_ESTADO_EDICION[estado] || 'bg-surface text-textMuted'}`}>
            {LABEL_ESTADO_EDICION[estado] || estado}
          </span>
        )}
      </div>
      <p className="text-textMuted text-xs mb-4">Edición {numero || '—'}</p>

      <div className="flex flex-col">
        <FilaPreview label="Docente">{docenteNombre || '— Sin asignar —'}</FilaPreview>
        <FilaPreview label="Staff">{staffNombre || '— Sin asignar —'}</FilaPreview>
        <FilaPreview label="Fecha de inicio">{fechaInicio || '—'}</FilaPreview>
        <FilaPreview label="Fecha de finalización">{fechaFinPreview || '—'}</FilaPreview>
      </div>

      {calendarioPreview && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-textMuted">
            Se van a generar <strong className="text-text">{calendarioPreview.length} clases</strong>
            {cursoInfo && cursoInfo.totalClases === 48 && !totalOverride && ' (3 cuatrimestres de 16, con receso entre cada uno)'}.
          </p>
          <button
            type="button" onClick={() => setVerCalendario((v) => !v)}
            className="text-accentTeal text-[11px] font-medium mt-1.5 hover:underline"
          >
            {verCalendario ? '▲ Ocultar fechas' : '▼ Ver todas las fechas'}
          </button>
          {verCalendario && (
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto mt-2">
              {calendarioPreview.map((c) => (
                <span key={c.numero} className="text-[10.5px] bg-bg border border-border rounded px-1.5 py-0.5 text-textMuted">
                  #{c.numero} {c.fecha}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NuevaEdicionPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [docentes, setDocentes] = useState([]);
  const [curso, setCurso] = useState('CO');
  const [numero, setNumero] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [totalOverride, setTotalOverride] = useState('');
  const [docenteEmail, setDocenteEmail] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [error, setError] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!cargando && (!usuario || !tienePermisoGestionAcademica(usuario))) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarDocentes();
  }, [usuario]);

  async function cargarDocentes() {
    try {
      const res = await fetchAutenticado('/api/docentes');
      const data = await res.json();
      if (res.ok) setDocentes(data.docentes);
    } catch {}
  }

  const cursoInfo = cursoPorCodigo(curso);
  const color = colorCurso(curso);
  // El selector de Docente lista solo personas con rol "Docente" que dictan este curso;
  // el de Staff lista a quienes tienen rol "Staff" en el roster, sin filtrar por curso
  // (el apoyo de logística no depende de qué se esté cursando).
  const docentesDelCurso = useMemo(
    () => docentes.filter((d) => (d.roles || ['Docente']).includes('Docente') && d.cursos.includes(curso)),
    [docentes, curso]
  );
  const staffDisponible = useMemo(
    () => docentes.filter((d) => (d.roles || ['Docente']).includes('Staff')),
    [docentes]
  );

  const calendarioPreview = useMemo(() => {
    if (!fechaInicio) return null;
    try {
      return generarCalendario(curso, fechaInicio, totalOverride ? parseInt(totalOverride, 10) : undefined);
    } catch {
      return null;
    }
  }, [curso, fechaInicio, totalOverride]);

  const fechaFinPreview = useMemo(() => {
    if (!fechaInicio) return null;
    try {
      return fechaFinEstimada(curso, fechaInicio, totalOverride ? parseInt(totalOverride, 10) : undefined);
    } catch {
      return null;
    }
  }, [curso, fechaInicio, totalOverride]);

  const docenteNombre = docentesDelCurso.find((d) => d.email === docenteEmail)?.nombre;
  const staffNombre = staffDisponible.find((d) => d.email === staffEmail)?.nombre;

  function validar() {
    const errs = {};
    if (!numero.trim()) errs.numero = 'Falta el número de edición.';
    if (!fechaInicio) errs.fechaInicio = 'Elegí la fecha de la primera clase.';
    setErroresCampo(errs);
    return Object.keys(errs).length === 0;
  }

  async function crear(e) {
    e.preventDefault();
    setError('');
    if (!validar()) { setError('Revisá los campos marcados en rojo.'); return; }
    setGuardando(true);
    try {
      const res = await fetchAutenticado('/api/ediciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso, numero, fechaInicio,
          docenteEmail: docenteEmail || undefined,
          staffEmail: staffEmail || undefined,
          totalClasesOverride: totalOverride ? parseInt(totalOverride, 10) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setGuardando(false); return; }
      router.push(`/ediciones/${data.id}`);
    } catch {
      setError('Error de conexión.');
      setGuardando(false);
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[940px] mx-auto px-6 pb-16 pt-10">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Nueva edición</h1>
        <p className="text-textSec text-sm">Creá y configurá una nueva edición del programa.</p>
      </div>

      {error && <p className="text-dangerText text-sm mb-4 bg-dangerBg/40 border border-border rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <form onSubmit={crear} className="bg-surface2 border border-border rounded-2xl p-5 sm:p-6 shadow-sm shadow-black/10" data-tour="nueva-edicion-form">
          <Seccion titulo="Información general">
            <div className="flex flex-col gap-4">
              <Campo label="Programa / curso" requerido>
                <SelectorCurso value={curso} onChange={(codigo) => { setCurso(codigo); setDocenteEmail(''); }} />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Número de edición" requerido error={erroresCampo.numero}>
                  <input
                    value={numero}
                    onChange={(e) => { setNumero(e.target.value); setErroresCampo((p) => ({ ...p, numero: undefined })); }}
                    placeholder="Ej: 24"
                    className={erroresCampo.numero ? inputErrCls : inputCls}
                  />
                </Campo>
                <Campo label="Docente">
                  <select value={docenteEmail} onChange={(e) => setDocenteEmail(e.target.value)} className={inputCls}>
                    <option value="">— Sin asignar todavía —</option>
                    {docentesDelCurso.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
                  </select>
                  {docentesDelCurso.length === 0 && (
                    <p className="text-textMuted text-[11px] mt-1">Nadie del roster tiene este curso marcado como propio todavía.</p>
                  )}
                </Campo>
              </div>
            </div>
          </Seccion>

          <Seccion titulo="Fechas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Fecha de la primera clase" requerido error={erroresCampo.fechaInicio}>
                <input
                  type="date" value={fechaInicio}
                  onChange={(e) => { setFechaInicio(e.target.value); setErroresCampo((p) => ({ ...p, fechaInicio: undefined })); }}
                  className={erroresCampo.fechaInicio ? inputErrCls : inputCls}
                />
                <p className="text-textMuted text-[11px] mt-1">El calendario se genera automáticamente a partir de esta fecha.</p>
              </Campo>
              <Campo label="Fecha de finalización (estimada)">
                <div className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textSec">
                  {fechaFinPreview || '— Elegí la fecha de inicio —'}
                </div>
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Configuración">
            <div className="flex flex-col gap-4">
              <Campo label="Staff">
                <select value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className={inputCls}>
                  <option value="">— Sin asignar todavía —</option>
                  {staffDisponible.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
                </select>
                {staffDisponible.length === 0 && (
                  <p className="text-textMuted text-[11px] mt-1">
                    Todavía nadie en el roster tiene marcado el rol Staff — se puede sumar desde{' '}
                    <Link href="/docentes" className="underline text-accentTeal">Equipo docente</Link>.
                  </p>
                )}
              </Campo>
              {cursoInfo?.ondemand && (
                <Campo label="Cantidad de clases (curso a demanda)">
                  <input
                    type="number" min="1" value={totalOverride} onChange={(e) => setTotalOverride(e.target.value)}
                    placeholder={String(cursoInfo.totalClases)} className={inputCls}
                  />
                </Campo>
              )}
            </div>
          </Seccion>

          <div className="flex items-center gap-2.5 pt-1">
            <button type="submit" disabled={guardando} className={btnCls}>
              {guardando ? 'Creando…' : 'Crear edición'}
            </button>
            <Link href="/ediciones" className={btnSecCls}>Cancelar</Link>
          </div>
        </form>

        <div className="lg:sticky lg:top-6">
          <VistaPrevia
            curso={curso} numero={numero} docenteNombre={docenteNombre} staffNombre={staffNombre}
            fechaInicio={fechaInicio} fechaFinPreview={fechaFinPreview} calendarioPreview={calendarioPreview}
            cursoInfo={cursoInfo} totalOverride={totalOverride}
          />
        </div>
      </div>
    </div>
  );
}
