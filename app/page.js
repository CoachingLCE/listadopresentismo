'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

export default function HomePage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    router.replace(usuario ? '/ediciones' : '/login');
  }, [cargando, usuario, router]);

  return null;
}
