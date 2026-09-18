// Constantes puras de Seguimiento — separadas de datosSeguimiento.js para poder
// importarlas también desde componentes de cliente (que no pueden depender de
// 'googleapis', usado por lib/sheets.js).
export const AREAS_SEGUIMIENTO = ['Depto academico', 'Depto administrativo', 'Docente'];
export const MOTIVOS_SEGUIMIENTO = [
  'Ausencia', 'Seguimiento', 'Cambio a asincronico', 'Cambio de edicion', 'En progreso de baja',
  'Certificacion', 'Reincorporacion', 'Problema academico', 'Problema personal',
  'Problema de horarios', 'Economico', 'Otro'
];
export const ESTADOS_SEGUIMIENTO = ['Pendiente', 'EnRevision', 'Resuelto'];
