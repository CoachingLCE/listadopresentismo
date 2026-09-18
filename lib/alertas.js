// Alerta de seguimiento: se calcula SOLA a partir del presentismo — es independiente del
// Estado del estudiante (Regular/Asincrónico/Baja/Cambio de edición, que se carga a mano).
// Un estudiante puede seguir "Regular" y aun así tener una alerta de Atención/Riesgo.
//
// Reglas iniciales (ajustables a gusto, son un punto de partida razonable a falta de un
// número exacto pedido): Riesgo si tuvo 2+ ausencias SEGUIDAS sin justificar, o si su
// presentismo bajó de 60%. Atención si tuvo 1 ausencia reciente, o su presentismo está
// entre 60% y 75%. El resto, Normal.
export function calcularAlerta(registrosOrdenados, porcentaje) {
  const ultimos = registrosOrdenados.filter((r) => ['P', 'A', 'AJ'].includes(r.estado)).slice(-4);
  let seguidas = 0;
  for (let i = ultimos.length - 1; i >= 0; i--) {
    if (ultimos[i].estado === 'A') seguidas++;
    else break;
  }

  if (seguidas >= 2 || (porcentaje !== null && porcentaje < 60)) return 'Riesgo';
  if (seguidas >= 1 || (porcentaje !== null && porcentaje < 75)) return 'Atencion';
  return 'Normal';
}

export const COLOR_ALERTA = {
  Normal: { bg: 'bg-successBg', text: 'text-successText' },
  Atencion: { bg: 'bg-warningBg', text: 'text-warningText' },
  Riesgo: { bg: 'bg-dangerBg', text: 'text-dangerText' }
};

export const COLOR_ESTADO = {
  Regular: { bg: 'bg-successBg', text: 'text-successText' },
  Asincronico: { bg: 'bg-warningBg', text: 'text-warningText' },
  Baja: { bg: 'bg-dangerBg', text: 'text-dangerText' },
  CambioEdicion: { bg: 'bg-infoBg', text: 'text-infoText' }
};
