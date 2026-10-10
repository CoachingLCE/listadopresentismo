import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoVerHistorial } from '../../../lib/permisos';
import { leerHistorialCompleto } from '../../../lib/datosHistorial';
import { paginaDeHistorial } from '../../../lib/historialMeses';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoVerHistorial(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  // Historial MES A MES (pedido de Diego): sin parámetros devuelve solo UN mes (el actual, o el último que tenga movimientos; con `mes=` se
  // pide otro), más la lista de meses con movimientos y cuántos tiene cada uno. Con `todo=1` devuelve todo: lo usa la pantalla cuando hay
  // un filtro o una búsqueda activa (esos filtros se aplican en la pantalla, y tienen que poder encontrar movimientos de cualquier mes).
  const { searchParams } = new URL(request.url);
  const todos = await leerHistorialCompleto();
  const usuarios = [...new Set(todos.map((h) => h.usuario).filter(Boolean))].sort();
  const pagina = paginaDeHistorial({ registros: todos, campoFecha: 'fecha', mes: searchParams.get('mes') || '', todo: searchParams.get('todo') === '1', hayFiltros: false });
  return NextResponse.json({ historial: pagina.registros, meses: pagina.meses, mes: pagina.mes, usuarios });
})
