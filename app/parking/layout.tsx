import type { Metadata, Viewport } from 'next';
import '../tokens.css';
import '../globals.css';
import '../ds-global.css';
import '../parking.css';

export const metadata: Metadata = {
  title: 'Bãi Đậu Xe SIGOLF — GoPick 250 Lương Định Của',
  description: 'Đặt chỗ đậu xe thông minh, xem sơ đồ vị trí ô đỗ trực quan, nhận vé QR và đối soát bãi xe GoPick SIGOLF.',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a5c1e',
};

export default function ParkingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pk-isolated-root">
      {children}
    </div>
  );
}
