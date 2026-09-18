// Constantes puras de Estudiantes — separadas de datosEstudiantes.js para poder
// importarlas también desde componentes de cliente (que no pueden depender de
// 'googleapis', usado por lib/sheets.js).
//
// Estados posibles de un estudiante (dato que carga Académico/Coordinación/SuperAdmin a
// mano, no se calcula solo) — separado de la ALERTA de seguimiento, que sí se calcula
// sola a partir del presentismo (ver lib/alertas.js).
export const ESTADOS_ESTUDIANTE = ['Regular', 'Asincronico', 'Baja', 'CambioEdicion'];
