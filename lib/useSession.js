'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SessionContext = createContext(null);
const STORAGE_KEY = 'presentismo_ilce_sesion';
const ROLES_SIN_VENCIMIENTO = ['SuperAdmin', 'Coordinacion'];

// Devuelve el timestamp de hoy a las 23:59:59, en milisegundos.
function finDelDia() {
  const f = new Date();
  f.setHours(23, 59, 59, 999);
  return f.getTime();
}

function leerSesionGuardada() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const datos = JSON.parse(raw);
    if (datos._expira && Date.now() > datos._expira) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { _expira, ...resto } = datos;
    return resto;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const guardado = leerSesionGuardada();
    if (guardado) {
      setUsuario(guardado.usuario);
      setToken(guardado.token);
    }
    setCargando(false);

    const intervalo = setInterval(() => {
      if (!leerSesionGuardada()) {
        setUsuario(null);
        setToken(null);
      }
    }, 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  function login(datosUsuario, tokenNuevo, mantenerSesion) {
    setUsuario(datosUsuario);
    setToken(tokenNuevo);

    const sinVencimiento = (datosUsuario.roles || []).some((r) => ROLES_SIN_VENCIMIENTO.includes(r));
    const paraGuardar = sinVencimiento
      ? { usuario: datosUsuario, token: tokenNuevo }
      : { usuario: datosUsuario, token: tokenNuevo, _expira: finDelDia() };

    const storage = sinVencimiento || mantenerSesion ? window.localStorage : window.sessionStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(paraGuardar));
  }

  function logout() {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /** fetch que agrega automáticamente el token de sesión — usar para TODAS las llamadas a /api */
  async function fetchAutenticado(url, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && url !== '/api/auth/login') {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      setUsuario(null);
      setToken(null);
      router.push('/login?vencida=1');
    }
    return res;
  }

  return (
    <SessionContext.Provider value={{ usuario, token, login, logout, cargando, fetchAutenticado }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
