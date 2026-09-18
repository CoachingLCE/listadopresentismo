// Registro de qué alertas de Reportes ya se mandaron por mail, para no repetir el mismo
// aviso en cada corrida del cron. Pestaña "AlertasEnviadas" — columnas: Clave, FechaEnvio.
// Si la pestaña todavía no existe en el Sheet, se trata como "vacía" (nunca se mandó nada
// todavía) en vez de romper — hay que crearla a mano una vez (ver SETUP.md).
import { readSheet, appendRow } from './sheets';

export async function leerClavesEnviadas() {
  try {
    const filas = await readSheet('AlertasEnviadas');
    return new Set(filas.map((f) => f.Clave).filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function marcarComoEnviada(clave) {
  await appendRow('AlertasEnviadas', {
    Clave: clave,
    FechaEnvio: new Date().toISOString()
  });
}
