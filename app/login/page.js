'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import Logo from '../../components/Logo';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContenido />
    </Suspense>
  );
}

function LoginContenido() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sesionVencida = searchParams.get('vencida') === '1';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      login(data.usuario, data.token, mantenerSesion);
      router.push('/ediciones');
    } catch (err) {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex justify-center pt-24 px-6 min-h-screen">
      <div className="w-80 bg-surface2 border border-border rounded-2xl p-7 h-fit">
        <div className="flex justify-center mb-3"><Logo height={44} /></div>
        <p className="text-center text-textSec text-sm mb-5">Presentismo ILCE — ingresá con tu usuario y contraseña</p>
        {sesionVencida && (
          <div className="bg-infoBg text-infoText rounded-lg px-3 py-2.5 text-xs mb-4 text-center">
            Tu sesión venció (por seguridad, duran 10 horas) — volvé a entrar.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label className="text-xs text-textSec block mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@institutoilce.com"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3"
          />
          <label className="text-xs text-textSec block mb-1">Contraseña</label>
          <div className="relative mb-3">
            <input
              type={verPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 pr-9 text-sm"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted text-xs"
            >
              {verPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-textSec mb-4">
            <input type="checkbox" checked={mantenerSesion} onChange={(e) => setMantenerSesion(e.target.checked)} />
            Mantener sesión abierta
          </label>
          {error && <p className="text-dangerText text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-textMuted text-[11px] mt-4">
          ¿Todavía no tenés contraseña? <a href="/setup-password" className="underline">Asignar la primera acá</a>
        </p>
      </div>
    </div>
  );
}
