'use client';
import { useState } from 'react';
import { useSession } from '../lib/useSession';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

export default function CambiarPasswordModal({ onCerrar }) {
  const { fetchAutenticado } = useSession();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setMsg(null);
    if (passwordNueva.length < 8) { setMsg({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres.' }); return; }
    if (passwordNueva !== confirmar) { setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' }); return; }
    setCargando(true);
    try {
      const res = await fetchAutenticado('/api/auth/cambiar-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordActual, passwordNueva })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada.' });
      setPasswordActual(''); setPasswordNueva(''); setConfirmar('');
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Cambiar mi contraseña</h3>
        <form onSubmit={guardar}>
          <label className="text-xs text-textSec block mb-1">Contraseña actual (si ya tenías una)</label>
          <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={`${inputCls} mb-3`} />
          <label className="text-xs text-textSec block mb-1">Contraseña nueva (mínimo 8 caracteres)</label>
          <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} className={`${inputCls} mb-3`} />
          <label className="text-xs text-textSec block mb-1">Confirmar contraseña nueva</label>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={`${inputCls} mb-3`} />
          {msg && <p className={`text-xs mb-3 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnSecCls} onClick={onCerrar}>Cerrar</button>
            <button type="submit" className={btnCls} disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
