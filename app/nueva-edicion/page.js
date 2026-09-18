'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { CURSOS, cursoPorCodigo, colorCurso, generarCalendario, fechaFinEstimada, nombreCurso } from '../../lib/cursosLogic';

const labelCls = 'text-xs text-textSec font-medium block mb-1.5';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20';
const inputErrCls = 'w-full bg-bg border border-dangerText rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-dangerText/20';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm shadow-accentPurple/20 transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
const btnSecCls = 'bg-transparent border border-border rounded-lg px-5 py-2.5 text-sm font-medium text-textSec transition-colors hover:border-accentTeal hover:text-text';

function Seccion({ titulo, descripcion, children }) {
  return (
    <div className="border-b border-border pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
      <h2 className="text-sm font-semibold mb-0.5">{titulo}</h2>
      {descripcion && <p className="text-xs text-textMuted mb-3.5">{descripcion}</p>}
      {!descripcion && <div className="mb-3.5" />}
      {children}
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
    <div className="max-w-[680px] mx-auto px-6 pb-16 pt-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Nueva edición</h1>
        <p className="text-textSec text-sm">Creá y configurá una nueva edición del programa.</p>
      </div>

      {error && <p className="text-dangerText text-sm mb-4 bg-dangerBg/40 border border-border rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={crear} className="bg-surface2 border border-border rounded-2xl p-5 sm:p-6 shadow-sm shadow-black/10" data-tour="nueva-edicion-form">
        <Seccion titulo="Información general" descripcion="Qué se cursa y quién lo dicta.">
          <div className="flex flex-col gap-4">
            <Campo label="Programa / curso" requerido>
              <select
                value={curso}
                onChange={(e) => { setCurso(e.target.value); setDocenteEmail(''); }}
                className={inputCls}
              >
                {CURSOS.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.nombre} {c.ondemand ? '(a demanda)' : `(${c.totalClases} clases)`}</option>
                ))}
              </select>
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
                  <p className="text-textMuted text-[11px] mt-1">Nadie del roster tiene este curso marcado como propio todavía — se puede asignar después.</p>
                )}
              </Campo>
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Fechas" descripcion="El calendario completo se genera solo a partir de la primera clase.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Fecha de la primera clase" requerido error={erroresCampo.fechaInicio}>
              <input
                type="date" value={fechaInicio}
                onChange={(e) => { setFechaInicio(e.target.value); setErroresCampo((p) => ({ ...p, fechaInicio: undefined })); }}
                className={erroresCampo.fechaInicio ? inputErrCls : inputCls}
              />
            </Campo>
            <Campo label="Fecha de finalización (estimada)">
              <div className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-textSec">
                {fechaFinPreview || '— Elegí la fecha de inicio —'}
              </div>
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="Configuración" descripcion="Staff de apoyo y ajustes propios del curso elegido.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Staff">
              <select value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className={inputCls}>
                <option value="">— Sin asignar todavía —</option>
                {staffDisponible.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
              </select>
              {staffDisponible.length === 0 && (
                <p className="text-textMuted text-[11px] mt-1">
                  Todavía nadie en el roster tiene marcado el rol Staff — se puede sumar desde{' '}
                  <Link href="/docentes" className="underline text-accentTeal">Docentes y Staff</Link>.
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

        <div className="bg-bg border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`w-2 h-2 rounded-full ${color.dot}`} />
            <p className="text-xs font-semibold text-textSec">Resumen</p>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
            <p className="text-textMuted">Nombre</p>
            <p className="font-medium">{nombreCurso(curso)} — Edición {numero || '—'}</p>
            <p className="text-textMuted">Curso</p>
            <p><span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>{nombreCurso(curso)}</span></p>
            <p className="text-textMuted">Docente</p>
            <p className="font-medium">{docenteNombre || '— Sin asignar —'}</p>
            <p className="text-textMuted">Staff</p>
            <p className="font-medium">{staffNombre || '— Sin asignar —'}</p>
            <p className="text-textMuted">Fecha de inicio</p>
            <p className="font-medium">{fechaInicio || '—'}</p>
            <p className="text-textMuted">Fecha de finalización</p>
            <p className="font-medium">{fechaFinPreview || '—'}</p>
          </div>

          {calendarioPreview && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-textMuted mb-1.5">
                Se van a generar <strong className="text-text">{calendarioPreview.length} clases</strong>
                {cursoInfo && cursoInfo.totalClases === 48 && !totalOverride && ' (3 cuatrimestres de 16, con 2 semanas de receso entre cada uno)'}.
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {calendarioPreview.slice(0, 12).map((c) => (
                  <span key={c.numero} className="text-[10.5px] bg-surface2 border border-border rounded px-1.5 py-0.5 text-textMuted">
                    #{c.numero} {c.fecha}
                  </span>
                ))}
                {calendarioPreview.length > 12 && (
                  <span className="text-[10.5px] text-textMuted px-1.5 py-0.5">+{calendarioPreview.length - 12} más…</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button type="submit" disabled={guardando} className={btnCls}>
            {guardando ? 'Creando…' : 'Crear edición'}
          </button>
          <Link href="/ediciones" className={btnSecCls}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
