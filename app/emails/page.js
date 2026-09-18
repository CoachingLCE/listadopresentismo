'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerReportes } from '../../lib/permisos';

const NIVEL_BADGE = {
  clase: 'bg-infoBg text-infoText',
  edicion: 'bg-warningBg text-warningText'
};
const NIVEL_LABEL = { clase: 'Clase puntual', edicion: 'Edición' };

export default function EmailsPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');

  const puede = usuario ? tienePermisoVerReportes(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !puede)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && puede) cargarAlertas();
  }, [usuario]);

  async function cargarAlertas() {
    setCargandoDatos(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/alertas');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar.'); return; }
      setDatos(data);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoDatos(false);
    }
  }

  if (cargando || !usuario || !puede) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Emails automáticos</h1>
      <p className="text-textSec text-sm mb-5">
        Mismas alertas que ves en Reportes (ausentismo alto en una clase, muchas bajas o presentismo bajo en una
        edición), armadas como el mail-resumen que el sistema manda solo una vez por día.
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : !datos ? null : (
        <>
          {!datos.configurado ? (
            <div className="bg-warningBg/40 border border-warningText/30 rounded-2xl p-4 mb-6">
              <p className="text-sm font-semibold text-warningText mb-1">✉ El envío automático todavía no está activo</p>
              <p className="text-xs text-textSec">
                Lo que ves abajo es una vista previa — así van a quedar los mails el día que se manden, pero por
                ahora no sale ninguno. Para prenderlo hace falta cargar <code className="text-[11px]">GMAIL_USER</code>,{' '}
                <code className="text-[11px]">GMAIL_APP_PASSWORD</code> y <code className="text-[11px]">CRON_SECRET</code> en
                las variables de entorno de Vercel, y crear la pestaña &quot;AlertasEnviadas&quot; en el Google Sheet
                (los pasos exactos están en SETUP.md).
              </p>
            </div>
          ) : (
            <div className="bg-successBg/40 border border-successText/30 rounded-2xl p-4 mb-6">
              <p className="text-sm font-semibold text-successText">✓ El envío automático está configurado</p>
              <p className="text-xs text-textSec mt-1">Todos los días se revisa esto solo y, si hay alertas nuevas, se manda un mail — no hace falta hacer nada acá.</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs text-textSec font-medium mb-1.5">Se les avisaría a ({datos.destinatarios.length}):</p>
            {datos.destinatarios.length === 0 ? (
              <p className="text-textMuted text-xs">Todavía no hay nadie con SuperAdmin/Coordinación/Académico y un email cargado en Accesos.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {datos.destinatarios.map((email) => (
                  <span key={email} className="text-[11px] px-2 py-1 rounded-full bg-surface2 border border-border text-textSec">{email}</span>
                ))}
              </div>
            )}
          </div>

          {datos.digest && (
            <div className="mb-8">
              <p className="text-sm font-semibold mb-2">Vista previa del mail</p>
              <div className="bg-surface2 border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-bg/40">
                  <p className="text-[11px] text-textMuted">Para: {datos.destinatarios.join(', ') || '—'}</p>
                  <p className="text-xs font-semibold mt-0.5">{datos.digest.asunto}</p>
                </div>
                <div className="p-4 bg-white" dangerouslySetInnerHTML={{ __html: datos.digest.html }} />
              </div>
            </div>
          )}

          <ListaAlertas titulo="Pendientes de aviso" items={datos.pendientes} vacio="No hay alertas nuevas en este momento." />
          <ListaAlertas titulo="Ya avisadas" items={datos.enviadas} vacio="Todavía no se mandó ningún aviso." />
        </>
      )}
    </div>
  );
}

function ListaAlertas({ titulo, items, vacio }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold mb-2.5">{titulo} <span className="text-textMuted font-normal">({items.length})</span></h2>
      {items.length === 0 ? (
        <p className="text-textMuted text-sm bg-surface2 border border-border rounded-xl p-4">{vacio}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((a) => (
            <div key={a.clave} className="bg-surface2 border border-border rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium">{a.texto}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 whitespace-nowrap ${NIVEL_BADGE[a.nivel] || 'bg-surface text-textMuted'}`}>
                  {NIVEL_LABEL[a.nivel] || a.nivel}
                </span>
              </div>
              <p className="text-xs text-textMuted">{a.motivo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
