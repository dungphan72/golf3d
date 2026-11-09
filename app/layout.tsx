import type { Metadata, Viewport } from 'next';
import MobileAppNavBar from './ui/MobileAppNavBar';
import './tokens.css';
import './globals.css';
import './admin.css';
export const metadata: Metadata = {
  title: 'Saigon Golf 3D Club — Play. Connect. Repeat.',
  description:
    'Saigon Golf 3D Club — golf 3D Foresight GC3 tại 250 Lương Đình Của, Bình Trưng, TP.HCM. Hotline 0902030185.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon-64.png', sizes: '64x64', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#165a3c',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700&display=swap"
        />
      </head>
      <body>
        {children}
        <MobileAppNavBar />
      </body>
    </html>
  );
}
