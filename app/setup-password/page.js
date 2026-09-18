'use client';
import { useState } from 'react';

export default function SetupPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje(null);
    setCargando(true);
    try {
      const res = await fetch('/api/auth/bootstrap-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, bootstrapKey })
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'Algo salió mal.' });
      } else {
        setMensaje({ tipo: 'ok', texto: 'Contraseña asignada. Ya podés ir a /login y entrar.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión.' });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex justify-center pt-24 px-6 min-h-screen">
      <div className="w-96 bg-surface2 border border-border rounded-2xl p-7 h-fit">
        <h2 className="text-center text-[17px] font-semibold mb-1">Asignar primera contraseña</h2>
        <p className="text-center text-textSec text-xs mb-5">
          Solo funciona para un usuario que todavía no tiene contraseña asignada en el Sheet.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="text-xs text-textSec block mb-1">Tu email (tal cual está en la pestaña Usuarios)</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm mb-3"
          />
          <label className="text-xs text-textSec block mb-1">Nueva contraseña (mínimo 8 caracteres)</label>
          <input
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm mb-3"
          />
          <label className="text-xs text-textSec block mb-1">Llave de arranque (SETUP_BOOTSTRAP_KEY de Vercel)</label>
          <input
            type="password" required value={bootstrapKey} onChange={(e) => setBootstrapKey(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm mb-4"
          />
          {mensaje && (
            <p className={`text-xs mb-3 ${mensaje.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>
              {mensaje.texto}
            </p>
          )}
          <button
            type="submit" disabled={cargando}
            className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Asignar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
