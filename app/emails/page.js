'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerReportes } from '../../lib/permisos';

const NIVEL_BADGE = {
  clase: 'bg-infoBg text-infoText',
  edicion: 'bg-warningBg text-warningText'
};
const NIVEL_LABEL = { clase: 'Clase puntual', edicion: 'Edición' };

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function EmailsPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');
  const [verPlantilla, setVerPlantilla] = useState(false);
  const [envioAbiertoId, setEnvioAbiertoId] = useState(null);
  const [busquedaRegistro, setBusquedaRegistro] = useState('');

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

  const registro = datos?.registro || [];
  const registroFiltrado = useMemo(() => {
    if (!busquedaRegistro.trim()) return registro;
    const q = busquedaRegistro.trim().toLowerCase();
    return registro.filter((r) => `${r.asunto} ${r.destinatarios.join(' ')}`.toLowerCase().includes(q));
  }, [registro, busquedaRegistro]);

  if (cargando || !usuario || !puede) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Emails</h1>
      <p className="text-textSec text-sm mb-5">Qué mails automáticos manda el sistema, y el registro real de cada envío.</p>

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
                las variables de entorno de Vercel, y crear la pestaña &quot;AlertasEnviadas&quot; (y opcionalmente
                &quot;EmailsEnviados&quot;, para el registro de abajo) en el Google Sheet — los pasos exactos están en SETUP.md.
              </p>
            </div>
          ) : (
            <div className="bg-successBg/40 border border-successText/30 rounded-2xl p-4 mb-6">
              <p className="text-sm font-semibold text-successText">✓ El envío automático está configurado</p>
              <p className="text-xs text-textSec mt-1">Los viernes a la mañana se revisa esto solo y, si hay alertas nuevas de la semana, se manda un mail — no hace falta hacer nada acá.</p>
            </div>
          )}

          {/* Definición de los mails automáticos — por ahora hay uno solo (el resumen semanal
              de alertas de Reportes, los viernes), armado como tabla para que se vea igual
              que en las otras apps de ILCE. "Ver mail" muestra la info recién al hacer clic. */}
          <div className="mb-8">
            <p className="text-sm font-semibold mb-2.5">Mails automáticos que genera el sistema</p>
            <div className="bg-surface2 border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-textMuted text-xs border-b border-border">
                    <th className="px-4 py-2.5 font-medium">Cuándo se envía</th>
                    <th className="px-3 py-2.5 font-medium">A quién</th>
                    <th className="px-3 py-2.5 font-medium">Asunto</th>
                    <th className="px-3 py-2.5 font-medium">Tipo</th>
                    <th className="px-3 py-2.5 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-3 text-xs">Los viernes 9am (automático), si hay alertas nuevas</td>
                    <td className="px-3 py-3">
                      {datos.destinatarios.length === 0 ? (
                        <span className="text-textMuted text-xs">Nadie configurado todavía</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {datos.destinatarios.map((email) => (
                            <span key={email} className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-textSec">{email}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">{datos.vistaPrevia?.asunto || <span className="text-textMuted">— (sin alertas para armar un ejemplo)</span>}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-infoBg text-infoText whitespace-nowrap">Resumen de alertas</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {datos.vistaPrevia && (
                        <button onClick={() => setVerPlantilla((v) => !v)} className="text-xs text-accentTeal hover:underline font-medium whitespace-nowrap">
                          {verPlantilla ? 'Ocultar' : 'Ver mail →'}
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              {verPlantilla && datos.vistaPrevia && (
                <div className="border-t border-border">
                  <div className="px-4 py-2.5 border-b border-border bg-bg/40">
                    <p className="text-[11px] text-textMuted">Para: {datos.destinatarios.join(', ') || '—'}</p>
                    <p className="text-xs font-semibold mt-0.5">{datos.vistaPrevia.asunto}</p>
                  </div>
                  <div className="p-4 bg-white" dangerouslySetInnerHTML={{ __html: datos.vistaPrevia.html }} />
                </div>
              )}
            </div>
          </div>

          <ListaAlertas titulo="Pendientes de aviso" items={datos.pendientes} vacio="No hay alertas nuevas en este momento." />
          <ListaAlertas titulo="Ya avisadas" items={datos.enviadas} vacio="Todavía no se mandó ningún aviso." />

          {/* Registro real de mails que salieron de verdad (lib/emailsEnviados.js) — distinto
              de "Ya avisadas" de arriba, que es la lista de alertas puntuales, no de envíos. */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
              <p className="text-sm font-semibold">Registro de envíos <span className="text-textMuted font-normal">({registro.length})</span></p>
              <input
                value={busquedaRegistro} onChange={(e) => setBusquedaRegistro(e.target.value)}
                placeholder="🔎 Buscar…" type="search" autoComplete="off"
                className="bg-surface2 border border-border rounded-lg px-3 py-1.5 text-xs w-56 focus:outline-none focus:border-accentTeal"
              />
            </div>
            {registro.length === 0 ? (
              <p className="text-textMuted text-sm bg-surface2 border border-border rounded-xl p-4">Todavía no se mandó ningún mail.</p>
            ) : registroFiltrado.length === 0 ? (
              <p className="text-textMuted text-sm bg-surface2 border border-border rounded-xl p-4">Nada coincide con esa búsqueda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {registroFiltrado.map((r) => {
                  const abierto = envioAbiertoId === r.id;
                  return (
                    <div key={r.id} className="bg-surface2 border border-border rounded-xl overflow-hidden">
                      <button onClick={() => setEnvioAbiertoId(abierto ? null : r.id)} className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.asunto || '(sin asunto)'}</p>
                          <p className="text-xs text-textMuted truncate">{formatearFecha(r.fecha)} · {r.destinatarios.join(', ') || '—'}{r.cantidadAlertas !== '' ? ` · ${r.cantidadAlertas} alerta(s)` : ''}</p>
                        </div>
                        <span className="text-xs text-accentTeal font-medium shrink-0">{abierto ? 'Ocultar' : 'Ver mail →'}</span>
                      </button>
                      {abierto && (
                        <div className="border-t border-border p-4 bg-white" dangerouslySetInnerHTML={{ __html: r.html || '<p style="color:#888">Sin contenido guardado.</p>' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
