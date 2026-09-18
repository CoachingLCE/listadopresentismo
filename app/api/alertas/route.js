import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoVerReportes } from '../../../lib/permisos';
import { calcularReporteCompleto, construirDigestAlertas } from '../../../lib/alertasReportes';
import { leerClavesEnviadas } from '../../../lib/alertasEnviadas';
import { listarUsuarios } from '../../../lib/gestionUsuarios';

// GET /api/alertas -> pantalla "Emails": muestra qué alertas generarían un mail automático
// y arma la vista previa del mail, SIN mandar nada — el envío de verdad lo hace únicamente
// el cron (api/cron/alertas), una vez que estén configurados GMAIL_USER/GMAIL_APP_PASSWORD
// y CRON_SECRET. Así se puede ver acá cómo van a quedar los mails aunque el envío
// automático todavía no esté prendido.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerReportes(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const [{ alertas }, yaEnviadas, usuarios] = await Promise.all([
    calcularReporteCompleto(),
    leerClavesEnviadas(),
    listarUsuarios()
  ]);

  const alertasConEstado = alertas.map((a) => ({ ...a, yaEnviada: yaEnviadas.has(a.clave) }));
  const pendientes = alertasConEstado.filter((a) => !a.yaEnviada);
  const enviadas = alertasConEstado.filter((a) => a.yaEnviada);

  const destinatarios = usuarios
    .filter((u) => u.activo && tienePermisoVerReportes(u))
    .map((u) => u.email)
    .filter(Boolean);

  const digest = pendientes.length > 0 ? construirDigestAlertas(pendientes) : null;

  const configurado = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.CRON_SECRET);

  return NextResponse.json({ pendientes, enviadas, destinatarios, digest, configurado });
})
