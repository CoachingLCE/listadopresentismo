'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { CREDENCIALES_ZOOM_DEFAULT } from '../../lib/credencialesZoomDefaults';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';

// Mismo set de colores de acento que ya usa el resto de la app (ver lib/cursosLogic.js) —
// acá se ciclan por posición solo para diferenciar las salas de un vistazo, no hay un color
// "fijo" por sala como en disponibilidad-zoom (esta app no tiene esa lógica y no hacía falta
// traerla para una tabla de referencia).
const PUNTOS_COLOR = ['bg-accentPurple', 'bg-infoText', 'bg-successText', 'bg-warningText', 'bg-accentTeal', 'bg-accentMagenta', 'bg-accentPurple', 'bg-textMuted'];

// Duplicado tal cual de /credenciales-zoom de disponibilidad-zoom (pedido de Diego,
// 02/10/2026) para que todo el equipo que usa esta app pueda ver el usuario y contraseña de
// cada sala sin tener que entrar a la otra app. Visible para cualquier persona logueada acá,
// sin restricción de rol. A diferencia del original, esta lista es estática (no hay Sheet de
// Zoom conectado en esta app) — ver nota en lib/credencialesZoomDefaults.js.
export default function CredencialesZoomPage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">Credenciales de las salas de Zoom</h1>
      <p className="text-textSec text-sm mb-4">Usuario y contraseña de cada sala, para entrar directo cuando haga falta.</p>

      <div className={boxCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-textSec text-left">
                <th className="p-2">Sala</th><th className="p-2">Usuario</th><th className="p-2">Contraseña</th><th className="p-2">ID de reunión</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {CREDENCIALES_ZOOM_DEFAULT.map((c, i) => (
                <tr key={c.sala} className="border-b border-border">
                  <td className="p-2 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${PUNTOS_COLOR[i % PUNTOS_COLOR.length]} shrink-0`} />
                      {c.sala}
                    </span>
                  </td>
                  <td className="p-2">{c.usuario}</td>
                  <td className="p-2 font-mono">{c.contrasena}</td>
                  <td className="p-2 font-mono">{c.idReunion || '—'}</td>
                  <td className="p-2">
                    <a href="https://zoom.us/signin" target="_blank" rel="noopener noreferrer"
                      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-accentTeal/10 text-accentTeal hover:bg-accentTeal/20 whitespace-nowrap">
                      Abrir ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-textMuted mb-1">
        "Abrir" lleva directo a la pantalla de inicio de sesión de Zoom, en una pestaña nueva — Zoom no permite completar el usuario y la contraseña automáticamente por seguridad, así que hay que pegarlos ahí (los tenés justo al lado, en la tabla).
      </p>
      <p className="text-[11px] text-textMuted">
        Si cambia alguna contraseña, avisale a quien administra disponibilidad-zoom para que la actualice ahí — y también acá, en el código (esta tabla es una copia, no se actualiza sola).
      </p>
    </div>
  );
}
