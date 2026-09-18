// Estado "visible" de una edición — se calcula solo a partir de sus fechas reales
// (FechaInicio/FechaFin, que ya existen) en vez de depender de un valor cargado a mano.
// La única excepción es "Suspendida": es una decisión administrativa que ninguna fecha
// puede reflejar, así que sigue siendo manual y, cuando está prendida, GANA por sobre el
// cálculo automático. El campo Estado del Sheet no cambia de forma ni de nombre — solo
// pasa a usarse como "¿está suspendida o no?" en vez de guardar Activa/Finalizada a mano.
export const ESTADOS_EDICION_CALCULADOS = ['Proxima', 'Activa', 'Finalizada', 'Suspendida'];

export function estadoCalculado(edicion, hoyISO) {
  if (!edicion) return 'Activa';
  if (edicion.estado === 'Suspendida') return 'Suspendida';
  const hoy = hoyISO || new Date().toISOString().slice(0, 10);
  if (edicion.fechaInicio && hoy < edicion.fechaInicio) return 'Proxima';
  if (edicion.fechaFin && hoy > edicion.fechaFin) return 'Finalizada';
  return 'Activa';
}

export const LABEL_ESTADO_EDICION = {
  Proxima: 'Próxima',
  Activa: 'Activa',
  Finalizada: 'Finalizada',
  Suspendida: 'Suspendida'
};

export const BADGE_ESTADO_EDICION = {
  Proxima: 'bg-infoBg text-infoText',
  Activa: 'bg-successBg text-successText',
  Finalizada: 'bg-surface text-textMuted',
  Suspendida: 'bg-warningBg text-warningText'
};
