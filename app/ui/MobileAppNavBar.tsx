'use client';
import { usePathname } from 'next/navigation';
import { CalendarDays, Car, Crown, Home, Trophy, UserRound } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Trang chủ', icon: Home, match: (p: string) => p === '/' || p === '' },
  {
    href: '/#dat-cho-nhanh',
    label: 'Đặt sân',
    icon: CalendarDays,
    match: (p: string) => p.startsWith('/book'),
    cta: true,
  },
  {
    href: '/parking',
    label: 'Đậu xe',
    icon: Car,
    match: (p: string) => p.startsWith('/parking'),
  },
  {
    href: '/thanh-vien',
    label: 'Hội viên',
    icon: Crown,
    match: (p: string) => p.startsWith('/thanh-vien'),
  },
  {
    href: '/tai-khoan',
    label: 'Tài khoản',
    icon: UserRound,
    match: (p: string) => p.startsWith('/tai-khoan'),
  },
];

export default function MobileAppNavBar() {
  const pathname = usePathname() || '';
  if (
    pathname.startsWith('/quan-ly') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/goi/') ||
    pathname.startsWith('/parking') ||
    pathname === '/app' ||
    pathname.startsWith('/app/')
  ) {
    return null;
  }
  const onHome = pathname === '/' || pathname === '';

  return (
    <nav className="mnav" aria-label="Điều hướng di động">
      {TABS.map((t) => {
        const IconComponent = t.icon;
        const isActive = t.match(pathname);
        return (
          // Plain anchors: on touch phones the framework Link swallowed the tap (it cancels the click, then
          // its client-side navigation failed), so the bar did nothing. A normal link always works.
          <a
            key={t.href}
            href={t.href}
            className={`${t.cta ? 'cta' : ''} ${isActive ? 'on' : ''}`.trim()}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              if (t.cta && onHome) {
                const el = document.getElementById('dat-cho-nhanh');
                if (el) {
                  e.preventDefault();
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
          >
            <span className="mnav-ic">
              <IconComponent size={22} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
            </span>
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
