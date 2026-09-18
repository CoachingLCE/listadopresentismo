'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoGestionAcademica } from '../../lib/permisos';
import { CURSOS, cursoPorCodigo, generarCalendario, fechaFinEstimada } from '../../lib/cursosLogic';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';

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
  const docentesDelCurso = useMemo(() => docentes.filter((d) => d.cursos.includes(curso)), [docentes, curso]);

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

  async function crear(e) {
    e.preventDefault();
    setError('');
    if (!numero || !fechaInicio) { setError('Completá el número de edición y la fecha de inicio.'); return; }
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
    <div className="max-w-[760px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Nueva edición</h1>
      <p className="text-textSec text-sm mb-5">Elegí el curso y la fecha de la primera clase — el calendario completo se genera solo.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      <form onSubmit={crear} className="bg-surface2 border border-border rounded-2xl p-5 flex flex-col gap-3.5" data-tour="nueva-edicion-form">
        <div>
          <label className={labelCls}>Curso</label>
          <select value={curso} onChange={(e) => { setCurso(e.target.value); setDocenteEmail(''); setStaffEmail(''); }} className={inputCls}>
            {CURSOS.map((c) => (
              <option key={c.codigo} value={c.codigo}>{c.nombre} {c.ondemand ? '(a demanda)' : `(${c.totalClases} clases)`}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Número de edición</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 24" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fecha de la primera clase</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} />
          </div>
        </div>

        {cursoInfo?.ondemand && (
          <div>
            <label className={labelCls}>Cantidad de clases (curso a demanda, sin cadencia fija)</label>
            <input type="number" min="1" value={totalOverride} onChange={(e) => setTotalOverride(e.target.value)} placeholder={String(cursoInfo.totalClases)} className={inputCls} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Docente</label>
            <select value={docenteEmail} onChange={(e) => setDocenteEmail(e.target.value)} className={inputCls}>
              <option value="">— Sin asignar todavía —</option>
              {docentesDelCurso.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Staff</label>
            <select value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className={inputCls}>
              <option value="">— Sin asignar todavía —</option>
              {docentes.map((d) => <option key={d.email} value={d.email}>{d.nombre}</option>)}
            </select>
          </div>
        </div>

        {calendarioPreview && (
          <div className="bg-bg border border-border rounded-xl p-3.5">
            <p className="text-xs text-textSec mb-2">
              Se van a generar <strong>{calendarioPreview.length} clases</strong>, de {fechaInicio} a {fechaFinPreview}
              {cursoInfo && cursoInfo.totalClases === 48 && !totalOverride && ' (3 cuatrimestres de 16, con 2 semanas de receso entre cada uno)'}.
            </p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
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

        <button type="submit" disabled={guardando} className={`${btnCls} self-start`}>
          {guardando ? 'Creando…' : 'Crear edición'}
        </button>
      </form>
    </div>
  );
}
