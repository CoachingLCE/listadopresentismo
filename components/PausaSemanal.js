'use client';
import { useEffect, useState } from 'react';

// Pequeña invitación cálida a hacer una pausa después de cargar asistencias — NO es
// publicidad del blog, es un complemento del bloque institucional de arriba ("Acompañamos,
// observamos e intervenimos."), que no se toca. Un mensaje distinto por día de la semana,
// fijo durante todo ese día (nada de rotación aleatoria) — se calcula con la fecha LOCAL
// del dispositivo de quien está mirando, no la del servidor.
const LINK_BLOG = 'https://coachingeducativolider.com/blog';

// Index 0-6 = Date.getDay() (0 = domingo).
const MENSAJES = [
  { titulo: '✨ Prepará la semana con una buena idea', texto: 'Antes de empezar una nueva semana, podés tomarte unos minutos para leer, reflexionar y seguir aprendiendo.' },
  { titulo: '☕ Empezá la semana con una pausa', texto: 'Después de cargar las asistencias, regalate unos minutos para leer y empezar la semana con una nueva idea.' },
  { titulo: '🌱 Una pausa también puede ser aprendizaje', texto: 'Ya cargaste las asistencias. Ahora, ¿qué tal si te tomás un café y descubrís algo nuevo?' },
  { titulo: '☕ Mitad de semana, momento para parar', texto: 'Entre una tarea y otra, hacé una pequeña pausa. Tenemos una nota para compartir con vos.' },
  { titulo: '💡 Una idea puede cambiar una mirada', texto: 'Después de registrar las asistencias, hacé una pausa y explorá una nueva perspectiva en nuestro blog.' },
  { titulo: '☕ Cerrá la semana con algo para llevarte', texto: 'Terminá de cargar las asistencias, preparate un café y dedicá unos minutos a seguir aprendiendo.' },
  { titulo: '🌿 Un momento para vos y para aprender', texto: 'Terminá de cargar las asistencias, preparate un mate y dedicá unos minutos a seguir aprendiendo.' }
];

export default function PausaSemanal() {
  // Se calcula recién en el cliente (useEffect) para que sea siempre la fecha local del
  // dispositivo de la persona, y para no arriesgar un mismatch de hidratación si el
  // servidor está en otro huso horario.
  const [dia, setDia] = useState(null);

  useEffect(() => {
    setDia(new Date().getDay());
  }, []);

  if (dia === null) return null;
  const mensaje = MENSAJES[dia];

  return (
    <div className="rounded-xl px-4 py-2.5 mb-4 -mt-1 flex items-start gap-3 bg-surface2/40 border border-border/50">
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-textSec">{mensaje.titulo}</p>
        <p className="text-[11px] text-textMuted leading-snug mt-0.5">
          {mensaje.texto}{' '}
          <a
            href={LINK_BLOG}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accentTeal font-medium hover:underline whitespace-nowrap"
          >
            Leer una nota →
          </a>
        </p>
      </div>
    </div>
  );
}
