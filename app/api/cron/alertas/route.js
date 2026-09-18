import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { calcularReporteCompleto } from '../../../../lib/alertasReportes';
import { leerClavesEnviadas, marcarComoEnviada } from '../../../../lib/alertasEnviadas';
import { listarUsuarios } from '../../../../lib/gestionUsuarios';
import { tienePermisoVerReportes } from '../../../../lib/permisos';
import { enviarMail } from '../../../../lib/mailer';

// GET /api/cron/alertas — pensado para que lo llame Vercel Cron (ver vercel.json) una vez
// por día. Recalcula las alertas de Reportes (misma lógica que ve la pantalla), manda UN
// solo mail con las que todavía no se avisaron, y las marca como enviadas.
//
// Protegido con CRON_SECRET: hay que llamarlo con ?secret=... o con el header
// "Authorization: Bearer <CRON_SECRET>" (así lo manda Vercel Cron solo). Sin ese secreto
// configurado en las variables de entorno, el endpoint no hace nada (por seguridad).
export const GET = conManejo(async (request) => {
  const secretEsperado = process.env.CRON_SECRET;
  if (!secretEsperado) {
    return NextResponse.json({ error: 'Falta configurar CRON_SECRET en las variables de entorno.' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  const secretHeader = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secretQuery = new URL(request.url).searchParams.get('secret') || '';
  if (secretHeader !== secretEsperado && secretQuery !== secretEsperado) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { alertas } = await calcularReporteCompleto();
  const yaEnviadas = await leerClavesEnviadas();
  const nuevas = alertas.filter((a) => !yaEnviadas.has(a.clave));

  if (nuevas.length === 0) {
    return NextResponse.json({ ok: true, nuevas: 0, mensaje: 'No hay alertas nuevas para avisar.' });
  }

  const usuarios = await listarUsuarios();
  const destinatarios = usuarios
    .filter((u) => u.activo && tienePermisoVerReportes(u))
    .map((u) => u.email)
    .filter(Boolean);

  if (destinatarios.length === 0) {
    return NextResponse.json({ ok: true, nuevas: nuevas.length, mensaje: 'Hay alertas nuevas pero no hay destinatarios (SuperAdmin/Coordinación/Académico) con email.' });
  }

  const html = `
    <div style="font-family:sans-serif;color:#111">
      <h2 style="margin-bottom:4px">⚠ Alertas de Presentismo ILCE</h2>
      <p style="color:#555;font-size:13px">Se detectaron ${nuevas.length} situación(es) nueva(s) en Reportes:</p>
      <ul style="padding-left:18px">
        ${nuevas.map((a) => `<li style="margin-bottom:10px"><strong>${a.texto}</strong><br/><span style="color:#777;font-size:12px">${a.motivo}</span></li>`).join('')}
      </ul>
      <p style="color:#999;font-size:11px">Este es un aviso automático — entrá a Reportes en la app para ver el detalle completo.</p>
    </div>
  `;
  const text = nuevas.map((a) => `${a.texto}\n${a.motivo}`).join('\n\n');

  let enviado = false;
  let errorEnvio = null;
  try {
    await enviarMail({ to: destinatarios.join(', '), subject: `⚠ Presentismo ILCE — ${nuevas.length} alerta(s) nueva(s)`, html, text });
    enviado = true;
  } catch (err) {
    errorEnvio = err.message;
  }

  // Se marcan como enviadas solo si el mail salió bien — si falló (por ejemplo, todavía no
  // se configuró GMAIL_USER/GMAIL_APP_PASSWORD), se vuelven a intentar en la próxima corrida.
  if (enviado) {
    for (const a of nuevas) await marcarComoEnviada(a.clave);
  }

  return NextResponse.json({
    ok: enviado,
    nuevas: nuevas.length,
    destinatarios,
    error: errorEnvio
  });
})
