import type { Metadata, Viewport } from 'next';
import AppLauncherClient from './AppLauncherClient';
import '../tokens.css';
import '../globals.css';
import '../ds-global.css';
import '../admin-reference.css';
import '../parking.css';
import './app-launcher.css';

export const metadata: Metadata = {
  title: 'SiGolf — Mở ứng dụng',
  description: 'Chọn Tài khoản của tôi, Bãi đậu xe hoặc Quản lý cơ sở SiGolf.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SiGolf',
  },
  icons: {
    icon: [{ url: '/favicon-64.png', sizes: '64x64', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a5c1e',
};

export default function AppPage() {
  return <AppLauncherClient />;
}
