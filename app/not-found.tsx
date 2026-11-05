import Link from 'next/link';
import { BRAND } from '../lib/brand';

export const metadata = { title: 'Không tìm thấy trang — ' + BRAND.name, robots: { index: false } };

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: 24,
        background: '#f3f6f2',
        color: '#1d2d24',
      }}
    >
      <div>
        <h1 style={{ fontSize: 56, margin: 0, color: '#165a3c' }}>404</h1>
        <p style={{ fontSize: 18, margin: '8px 0 24px' }}>Không tìm thấy trang bạn cần.</p>
        <Link
          href="/"
          style={{
            background: '#165a3c',
            color: '#fff',
            padding: '11px 22px',
            borderRadius: 8,
            fontWeight: 650,
          }}
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
