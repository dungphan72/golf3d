'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon, type IconName } from './Icon';
import { CalendarDays, Home, Trophy, UserRound, UsersRound } from 'lucide-react';

const HOME_ICONS = [Home, CalendarDays, Trophy, UsersRound, UserRound];

const TABS: {
  href: string;
  label: string;
  icon: IconName;
  match: (p: string) => boolean;
  cta?: boolean;
}[] = [
  { href: '/', label: 'Trang chủ', icon: 'home', match: (p: string) => p === '/' || p === '' },
  {
    href: '/#dat-cho',
    label: 'Đặt line',
    icon: 'event',
    match: (p: string) => p.startsWith('/book'),
    cta: true,
  },
  {
    href: '/tin-tuc',
    label: 'Giải đấu',
    icon: 'trophy',
    match: (p: string) => p.startsWith('/tin-tuc'),
  },
  {
    href: '/thanh-vien',
    label: 'Hội viên',
    icon: 'crown',
    match: (p: string) => p.startsWith('/thanh-vien'),
  },
  {
    href: '/tai-khoan',
    label: 'Tài khoản',
    icon: 'person',
    match: (p: string) => p.startsWith('/tai-khoan'),
  },
];

export default function MobileAppNavBar() {
  const pathname = usePathname() || '';
  if (
    pathname.startsWith('/quan-ly') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/goi/')
  ) {
    return null;
  }
  const onHome = pathname === '/' || pathname === '';

  return (
    <nav className="mnav" aria-label="Điều hướng di động">
      {TABS.map((t, index) => {
        const HomeIcon = HOME_ICONS[index];
        const community = onHome && index === 3;
        return (
          <Link
            key={t.href}
            href={community ? '/tai-khoan' : t.href}
            className={`${t.cta ? 'cta' : ''} ${t.match(pathname) ? 'on' : ''}`.trim()}
            aria-current={t.match(pathname) ? 'page' : undefined}
            onClick={(e) => {
              if (t.cta && onHome) {
                const el = document.getElementById('dat-cho');
                if (el) {
                  e.preventDefault();
                  window.location.hash = 'dat-cho';
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
          >
            <span className="mnav-ic">
              {onHome ? (
                <HomeIcon size={22} aria-hidden="true" />
              ) : (
                <Icon name={t.icon} size={22} />
              )}
            </span>
            {community ? 'Cộng đồng' : onHome && index === 1 ? 'Đặt sân' : t.label}
          </Link>
        );
      })}
    </nav>
  );
}
