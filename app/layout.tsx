import type { Metadata, Viewport } from 'next';
import './globals.css';
import './kiotviet.css';
import './mobile.css';
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
      <body>{children}</body>
    </html>
  );
}
