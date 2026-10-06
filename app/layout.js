import './globals.css';
import { SessionProvider } from '../lib/useSession';
import { ThemeProvider } from '../lib/ThemeContext';
import VersionBadge from '../components/VersionBadge';
import Nav from '../components/Nav';
import { DialogosProvider } from '../components/Dialogos';

export const metadata = {
  // Dominio de producción: hace que la imagen y el enlace de la vista previa sean absolutos (WhatsApp/Slack/Telegram lo exigen).
  metadataBase: new URL('https://listadopresentismo.vercel.app'),
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png?v=2'
  },
  title: 'Presentismo ILCE',
  description: 'Gestión de asistencia, seguimiento y alertas de estudiantes',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Instituto ILCE',
    title: 'Presentismo ILCE',
    description: 'Gestión de asistencia, seguimiento y alertas de estudiantes',
    url: '/',
    images: [{ url: '/og-image.png?v=1', width: 1200, height: 630, alt: 'Presentismo ILCE — Instituto ILCE' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Presentismo ILCE',
    description: 'Gestión de asistencia, seguimiento y alertas de estudiantes',
    images: ['/og-image.png?v=1']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-bg text-text">
        <ThemeProvider>
          <SessionProvider>
            <DialogosProvider>
              <Nav />
              {children}
              <VersionBadge />
            </DialogosProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
