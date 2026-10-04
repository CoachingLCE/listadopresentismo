import './globals.css';
import { SessionProvider } from '../lib/useSession';
import { ThemeProvider } from '../lib/ThemeContext';
import VersionBadge from '../components/VersionBadge';
import Nav from '../components/Nav';
import { DialogosProvider } from '../components/Dialogos';

export const metadata = {
  title: 'Presentismo ILCE',
  description: 'Gestión de asistencia, seguimiento y alertas de estudiantes'
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
