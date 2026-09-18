// Registro real de los mails-resumen que el sistema mandó de verdad (no solo qué alertas
// ya se avisaron — lib/alertasEnviadas.js — sino el envío en sí: cuándo, a quién, con qué
// asunto y qué contenido), para poder verlos después en la pantalla "Emails" tal como
// quedaron. Pestaña "EmailsEnviados" — columnas: Fecha, Destinatarios, Asunto, Html,
// CantidadAlertas. Si la pestaña todavía no existe en el Sheet, se trata como "vacía" en
// vez de romper — se crea a mano una vez (ver SETUP.md), y mientras tanto la app funciona
// igual, solo que sin historial para mostrar.
import { readSheet, appendRow } from './sheets';

export async function registrarEnvioMail({ destinatarios, asunto, html, cantidadAlertas }) {
  await appendRow('EmailsEnviados', {
    Fecha: new Date().toISOString(),
    Destinatarios: (destinatarios || []).join(', '),
    Asunto: asunto || '',
    Html: html || '',
    CantidadAlertas: cantidadAlertas ?? ''
  });
}

export async function leerEmailsEnviados() {
  try {
    const filas = await readSheet('EmailsEnviados');
    return filas
      .map((f) => ({
        id: f._rowIndex,
        fecha: f.Fecha || '',
        destinatarios: (f.Destinatarios || '').split(',').map((s) => s.trim()).filter(Boolean),
        asunto: f.Asunto || '',
        html: f.Html || '',
        cantidadAlertas: f.CantidadAlertas || ''
      }))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  } catch {
    return [];
  }
}
