import { NextResponse } from 'next/server';

/**
 * Envuelve un handler de API route (GET/POST/PATCH/DELETE) para que, si algo falla
 * adentro (Sheet sin la pestaña correcta, columna faltante, credenciales mal puestas, etc.),
 * el cliente reciba un JSON con un mensaje entendible en vez de que la request se caiga
 * con un error crudo (lo que en el navegador se ve como "Error de conexión").
 */
export function conManejo(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error('Error en API route:', err);
      const detalle = err?.message || 'Error desconocido';
      return NextResponse.json(
        {
          error: `Error del servidor: ${detalle}. Revisá que el Google Sheet tenga todas las pestañas y columnas exactas (ver SETUP.md), y que las variables de entorno de Vercel estén bien cargadas.`
        },
        { status: 500 }
      );
    }
  };
}
