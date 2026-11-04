import type { Metadata } from 'next';
import './globals.css';
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
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
