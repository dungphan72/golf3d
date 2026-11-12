'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { href: '/', label: 'Trang chủ', match: (p: string) => p === '/' || p === '' },
  { href: '/bang-gia', label: 'Bảng giá', match: (p: string) => p.startsWith('/bang-gia') },
  { href: '/#dat-cho', label: 'Đặt chỗ', match: (p: string) => p.startsWith('/book'), cta: true },
  { href: '/thanh-vien', label: 'Gói thẻ', match: (p: string) => p.startsWith('/thanh-vien') },
  { href: '/tai-khoan', label: 'Khách hàng', match: (p: string) => p.startsWith('/tai-khoan') },
];

export default function MobileAppNavBar() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/quan-ly') || pathname.startsWith('/api') || pathname.startsWith('/goi/')) {
    return null;
  }
  const onHome = pathname === '/' || pathname === '';

  return (
    <nav className="mnav" aria-label="Điều hướng di động">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`${t.cta ? 'cta' : ''} ${t.match(pathname) ? 'on' : ''}`.trim()}
          aria-current={t.match(pathname) ? 'page' : undefined}
          onClick={(e) => {
            if (t.cta && onHome) {
              const el = document.getElementById('dat-cho');
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
