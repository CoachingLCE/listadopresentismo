'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { tienePermisoVerHistorial } from '../../lib/permisos';

// Colores distintos por persona, para reconocerla rápido en la lista sin leer el nombre —
// el mismo nombre siempre cae en el mismo color (hash simple sobre una paleta fija). Mismo
// patrón que en /auditoria de Seguimiento Lead Estudiante.
const PALETA_USUARIOS = [
  { bg: 'bg-accentPurple/20', text: 'text-accentPurple' },
  { bg: 'bg-accentTeal/20', text: 'text-accentTeal' },
  { bg: 'bg-successBg', text: 'text-successText' },
  { bg: 'bg-warningBg', text: 'text-warningText' },
  { bg: 'bg-infoBg', text: 'text-infoText' },
  { bg: 'bg-dangerBg', text: 'text-dangerText' },
  { bg: 'bg-accentMagenta/20', text: 'text-accentMagenta' }
];
function colorPorUsuario(nombre) {
  if (!nombre) return PALETA_USUARIOS[0];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) % 997;
  return PALETA_USUARIOS[hash % PALETA_USUARIOS.length];
}

// Categoriza cada acción del historial (ver los `registrarAccion(...)` de la app) — se usa
// tanto para los chips de filtro como para el color/ícono de cada fila.
const CATEGORIAS_ACCION = [
  { id: 'edicion', label: '📚 Edición', icono: '📚 ', clase: 'text-accentPurple font-semibold', test: (a) => a.toLowerCase().includes('edición') },
  { id: 'docente', label: '👨‍🏫 Docente', icono: '👨‍🏫 ', clase: 'text-accentTeal font-medium', test: (a) => a.toLowerCase().includes('docente') },
  { id: 'estudiante', label: '🎓 Estudiante', icono: '🎓 ', clase: 'text-infoText font-medium', test: (a) => a.toLowerCase().includes('estudiante') },
  { id: 'seguimiento', label: '📋 Seguimiento', icono: '📋 ', clase: 'text-warningText font-medium', test: (a) => a.toLowerCase().includes('seguimiento') },
  { id: 'usuario', label: '👤 Usuario', icono: '👤 ', clase: 'text-accentMagenta font-medium', test: (a) => a.toLowerCase().includes('usuario') },
  { id: 'login', label: '🔑 Ingreso', icono: '🔑 ', clase: 'text-successText font-medium', test: (a) => ['inició sesión', 'asignó su primera contraseña', 'cambió su contraseña'].includes(a.toLowerCase()) },
  { id: 'loginFallido', label: '⚠️ Intento fallido', icono: '⚠️ ', clase: 'text-dangerText font-semibold', test: (a) => a.toLowerCase().includes('rechazado') || a.toLowerCase().includes('fallido') }
];
function categoriaAccion(accion) {
  const a = accion || '';
  return CATEGORIAS_ACCION.find((c) => c.test(a)) || null;
}

const filtroCls = 'bg-surface2 border border-border rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:border-accentTeal focus:ring-2 focus:ring-accentTeal/20';

export default function HistorialPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [historial, setHistorial] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');

  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const puede = usuario ? tienePermisoVerHistorial(usuario) : false;

  useEffect(() => {
    if (!cargando && (!usuario || !puede)) router.push('/ediciones');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario && puede) cargar();
  }, [usuario]);

  async function cargar() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/historial');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar el historial.'); return; }
      setHistorial(data.historial);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  async function exportarExcel() {
    const XLSX = await import('xlsx');
    const hoja = XLSX.utils.json_to_sheet(
      registrosFiltrados.map((h) => ({
        Fecha: new Date(h.fecha).toLocaleString('es-AR', { hour12: false }),
        Usuario: h.usuario,
        Accion: h.accion,
        Detalle: h.detalle
      }))
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial');
    XLSX.writeFile(libro, `historial-presentismo-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const usuariosUnicos = useMemo(() => [...new Set(historial.map((h) => h.usuario))].sort(), [historial]);

  const registrosFiltrados = useMemo(() => {
    return historial.filter((h) => {
      if (filtroUsuario && h.usuario !== filtroUsuario) return false;
      if (filtroCategoria && categoriaAccion(h.accion)?.id !== filtroCategoria) return false;
      const fechaISO = (h.fecha || '').slice(0, 10);
      if (desde && fechaISO < desde) return false;
      if (hasta && fechaISO > hasta) return false;
      if (busqueda.trim()) {
        const texto = `${h.usuario} ${h.accion} ${h.detalle}`.toLowerCase();
        if (!texto.includes(busqueda.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [historial, filtroUsuario, filtroCategoria, desde, hasta, busqueda]);

  if (cargando || !usuario || !puede) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1" data-tour="historial-titulo">Historial</h1>
      <p className="text-textSec text-sm mb-5">Registro de acciones relevantes de todos los usuarios.</p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}

      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs text-textSec block mb-1">Usuario</label>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className={filtroCls}>
            <option value="">Todos</option>
            {usuariosUnicos.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-textSec block mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={filtroCls} />
        </div>
        <div>
          <label className="text-xs text-textSec block mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={filtroCls} />
        </div>
        <div>
          <label className="text-xs text-textSec block mb-1">Buscar</label>
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Nombre, acción o detalle…"
            className={`${filtroCls} w-64`}
          />
        </div>
        <button onClick={exportarExcel} className="bg-surface2 border border-border rounded-lg px-4 py-2 text-sm hover:border-accentTeal transition-colors">
          ⬇ Exportar a Excel
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <button
          onClick={() => setFiltroCategoria('')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filtroCategoria === '' ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
          }`}
        >
          Todas
        </button>
        {CATEGORIAS_ACCION.map((c) => (
          <button
            key={c.id} onClick={() => setFiltroCategoria(c.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroCategoria === c.id ? 'bg-accentPurple border-accentPurple text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-surface2 border border-border rounded-2xl p-4">
        {cargandoLista ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="text-textMuted text-sm">Sin registros para este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-textSec text-left border-b border-border">
                  <th className="py-2 pr-3 whitespace-nowrap">Fecha</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Usuario</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Acción</th>
                  <th className="py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((h, i) => {
                  const cat = categoriaAccion(h.accion);
                  const color = colorPorUsuario(h.usuario);
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 pr-3 whitespace-nowrap text-textMuted text-xs">{new Date(h.fecha).toLocaleString('es-AR', { hour12: false })}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>{h.usuario}</span>
                      </td>
                      <td className={`py-2 pr-3 whitespace-nowrap ${cat?.clase || ''}`}>{cat?.icono}{h.accion}</td>
                      <td className="py-2 text-textSec leading-snug">{h.detalle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
