import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoGestionAcademica } from '../../../../lib/permisos';
import { crearEdicionConCalendario, leerClasesDeEdicion } from '../../../../lib/datosEdiciones';
import { agregarEstudiantesBulk, leerEstudiantesDeEdicion, actualizarEstudiante } from '../../../../lib/datosEstudiantes';
import { appendRows } from '../../../../lib/sheets';
import { registrarAccion } from '../../../../lib/auditoria';

const NOMBRES_EJEMPLO = Array.from({ length: 10 }, (_, i) => `Alumno ${i + 1} (prueba)`);

// POST /api/ediciones/ejemplo -> crea una edición de Coaching Ontológico de prueba, con 10
// estudiantes de ejemplo y presentismo ya cargado (variado a propósito: presentes,
// ausentes, justificados, asincrónico, CC y una baja) para poder ver de una cómo se ve
// la grilla, el resumen de asistencia y las alertas de Reportes con datos reales.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoGestionAcademica(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const hoy = new Date();
  const fechaInicio = new Date(hoy.getTime() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const numero = `DEMO-${Date.now().toString(36).slice(-4)}`;

  const { id } = await crearEdicionConCalendario({
    curso: 'CO',
    numero,
    fechaInicio,
    docenteEmail: '', docenteNombre: '', staffEmail: '', staffNombre: '',
    creadoPor: usuario.email
  });

  await agregarEstudiantesBulk(id, NOMBRES_EJEMPLO);

  const [clases, estudiantes] = await Promise.all([leerClasesDeEdicion(id), leerEstudiantesDeEdicion(id)]);
  const hoyISO = hoy.toISOString().slice(0, 10);
  const clasesDadas = clases.filter((c) => c.fecha && c.fecha <= hoyISO);

  const ahora = new Date().toISOString();
  const filas = [];
  estudiantes.forEach((est, i) => {
    clasesDadas.forEach((clase, ci) => {
      let estado = 'P';
      if (ci === 0) estado = i < 5 ? 'A' : 'P'; // primera clase: 50% de ausentismo, para ver la alerta funcionando
      else if (i === 1 && ci === 1) estado = 'A';
      else if (i === 4 && ci === 1) estado = 'AJ';
      else if (i === 6 && ci === 2) estado = 'Asinc';
      else if (i === 8 && ci === 3) estado = 'CC';
      else if (i === 9 && ci >= 4) return; // este alumno queda de baja a partir de acá

      filas.push({
        Id: `pres-${est.id}-${clase.id}`,
        EstudianteId: est.id,
        ClaseId: clase.id,
        EdicionId: id,
        Estado: estado,
        Notas: '',
        ModificadoPor: usuario.email,
        FechaModificacion: ahora
      });
    });
  });
  if (filas.length > 0) await appendRows('Presentismo', filas);

  // Alumno 10 queda dado de baja, para que se vea el % de bajas en el resumen y en Reportes.
  const ultimo = estudiantes[9];
  if (ultimo) await actualizarEstudiante(ultimo._rowIndex, { estado: 'Baja' });

  await registrarAccion(usuario.email, usuario.nombre, 'Creó edición de ejemplo', `Coaching Ontológico DEMO (${estudiantes.length} estudiantes de prueba)`);

  return NextResponse.json({ ok: true, id });
})
