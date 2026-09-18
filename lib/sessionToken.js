import crypto from 'crypto';

// Duración de una sesión: 10 horas desde que se creó el token, sin importar el rol.
// (Antes el cliente dejaba a Admin/SuperAdmin sin vencimiento — eso sigue siendo la
// comodidad del lado del navegador, pero el servidor ahora SIEMPRE corta acá, para
// cualquier rol, sin excepción.)
const SESSION_MAX_AGE_MS = 10 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    // Nunca firmar/verificar sesiones en producción sin un secreto real configurado —
    // antes acá había un fallback fijo ('dev-secret-cambiar-en-produccion') que, de
    // olvidarse la variable de entorno, dejaba a CUALQUIERA falsificar una sesión válida.
    throw new Error(
      'Falta configurar SESSION_SECRET en las variables de entorno de Vercel. ' +
      'No se puede iniciar sesión ni validar ninguna sesión existente sin este secreto en producción.'
    );
  }
  // Solo en desarrollo local (NODE_ENV !== 'production') se tolera no tenerlo configurado,
  // para no trabar el trabajo del día a día — nunca debería llegar a pasar en producción.
  console.warn('⚠️ SESSION_SECRET no está configurado — usando un secreto temporal SOLO válido para desarrollo local.');
  return 'solo-desarrollo-local-nunca-en-produccion';
}

/**
 * El token queda atado al PasswordHash vigente en el momento de crearlo. Si la
 * contraseña cambia después (la cambia el propio usuario, se la resetea un Admin, o se
 * asigna por primera vez), el hash guardado en el Sheet cambia — y como verificarToken
 * compara contra el hash ACTUAL (no el viejo), cualquier token emitido antes de ese
 * cambio deja de ser válido automáticamente, sin necesidad de una lista de tokens
 * revocados aparte.
 */
export function crearToken(email, passwordHash) {
  const payload = JSON.stringify({ email, passwordHash: passwordHash || '', iat: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const firma = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${firma}`;
}

/**
 * Devuelve { email, passwordHash, iat } si el token es válido (firma correcta y no
 * vencido), o null si es inválido, está vencido, o corrupto. NO chequea acá si la
 * contraseña cambió — eso lo hace requireUsuario, que es quien tiene el dato actual
 * del usuario a mano.
 */
export function verificarToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, firma] = token.split('.');
  if (!payloadB64 || !firma) return null;

  let firmaEsperada;
  try {
    firmaEsperada = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
  } catch {
    // Sin SESSION_SECRET en producción, ninguna sesión puede considerarse válida.
    return null;
  }

  // Comparación en tiempo constante — evita filtrar información de la firma correcta
  // a través de cuánto tarda la comparación (timing attack).
  const bufFirma = Buffer.from(firma);
  const bufEsperada = Buffer.from(firmaEsperada);
  if (bufFirma.length !== bufEsperada.length) return null;
  if (!crypto.timingSafeEqual(bufFirma, bufEsperada)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (!payload.email || !payload.iat) return null;
    if (Date.now() - payload.iat > SESSION_MAX_AGE_MS) return null; // sesión vencida
    return payload;
  } catch {
    return null;
  }
}
