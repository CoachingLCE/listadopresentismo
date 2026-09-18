import { readSheet } from './sheets';

export async function leerHistorialCompleto() {
  const filas = await readSheet('Historial');
  return filas.filter((f) => f.Fecha).map((f) => ({
    fecha: f.Fecha, email: f.Email, usuario: f.Usuario, accion: f.Accion, detalle: f.Detalle
  })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
