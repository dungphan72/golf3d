'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon, type IconName } from './Icon';

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean; cta?: boolean }[] = [
  { href: '/', label: 'Trang chủ', icon: 'home', match: (p: string) => p === '/' || p === '' },
  { href: '/#dat-cho', label: 'Đặt line', icon: 'event', match: (p: string) => p.startsWith('/book'), cta: true },
  { href: '/tin-tuc', label: 'Giải đấu', icon: 'trophy', match: (p: string) => p.startsWith('/tin-tuc') },
  { href: '/thanh-vien', label: 'Hội viên', icon: 'crown', match: (p: string) => p.startsWith('/thanh-vien') },
  { href: '/tai-khoan', label: 'Tài khoản', icon: 'person', match: (p: string) => p.startsWith('/tai-khoan') },
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
          <span className="mnav-ic">
            <Icon name={t.icon} size={22} />
          </span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
