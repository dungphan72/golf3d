'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Crown,
  HelpCircle,
  History,
  Home,
  LogOut,
  LogIn,
  Menu,
  Search,
  Settings,
  Tag,
  Trophy,
  User,
  UsersRound,
  X,
} from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { TIER_LABEL, type Tier } from '../../lib/member-card';

export type MemberTab =
  'overview' | 'booking' | 'packages' | 'history' | 'offers' | 'settings' | 'community';

const NAV: { key: MemberTab | 'events'; label: string; icon: typeof Home }[] = [
  { key: 'overview', label: 'Trang chủ', icon: Home },
  { key: 'booking', label: 'Đặt sân', icon: CalendarDays },
  { key: 'packages', label: 'Gói giờ & Hội viên', icon: Crown },
  { key: 'events', label: 'Giải đấu', icon: Trophy },
  { key: 'community', label: 'Tìm bạn chơi', icon: UsersRound },
  { key: 'history', label: 'Lịch sử & Hóa đơn', icon: History },
  { key: 'offers', label: 'Ưu đãi của tôi', icon: Tag },
  { key: 'settings', label: 'Thông tin tài khoản', icon: Settings },
];

/** Keywords a member can type in the top search box to jump to a screen. */
const SEARCH: [RegExp, MemberTab | 'events'][] = [
  [/lịch sử|hóa đơn|giao dịch|điểm/i, 'history'],
  [/bạn chơi|cộng đồng/i, 'community'],
  [/đặt|line|phòng|lịch/i, 'booking'],
  [/gói|giờ|hội viên|thẻ|ví/i, 'packages'],
  [/giải|sự kiện|đấu/i, 'events'],
  [/ưu đãi|khuyến mãi/i, 'offers'],
  [/tài khoản|mật khẩu|thông tin/i, 'settings'],
];

export type Reminder = { id: string; text: string; tab: MemberTab };

/** The signed-in member's app frame: top bar, side menu (desktop) and bottom tabs (phone). */
export function MemberShell({
  tab,
  onTab,
  name,
  tier,
  reminders,
  onBook,
  onLogout,
  children,
  signedOut = false,
}: {
  tab: MemberTab;
  onTab: (t: MemberTab) => void;
  name: string;
  tier: Tier;
  reminders: Reminder[];
  onBook: () => void;
  onLogout: () => void;
  children: ReactNode;
  signedOut?: boolean;
}) {
  const [bell, setBell] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => () => document.body.classList.remove('mps-menu-open'), []);
  useEffect(() => {
    if (!bell) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setBell(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setBell(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [bell]);

  const go = (key: MemberTab | 'events') => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- plain page load, like the other public links
    if (key === 'events') window.location.href = '/tin-tuc';
    else onTab(key);
  };
  const first = name.trim().split(/\s+/).slice(-1)[0] || 'bạn';

  return (
    <div className="mps">
      <header className="mps-top">
        <button
          type="button"
          className="mps-burger"
          aria-label="Mở menu"
          onClick={() => document.body.classList.toggle('mps-menu-open')}
        >
          <Menu size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="mps-back" href="/" aria-label="Về trang chủ">
          <ArrowLeft size={24} />
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="mps-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={50} height={50} />
          <span>
            <b>{BRAND.name}</b>
            <small>
              Hội viên<span className="desktop-sub"> · Đặt sân · Quản lý gói · Ưu đãi</span>
            </small>
          </span>
        </a>
        <form
          className="mps-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const hit = SEARCH.find(([re]) => re.test(query));
            if (hit) go(hit[1]);
          }}
        >
          <Search size={20} />
          <input
            aria-label="Tìm dịch vụ, đặt sân, giải đấu"
            placeholder="Tìm dịch vụ, đặt sân, giải đấu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="mps-actions" ref={box}>
          <button
            type="button"
            className="mps-icon mps-bell"
            aria-label="Thông báo"
            aria-expanded={bell}
            onClick={() => setBell(!bell)}
          >
            <Bell size={23} />
            {reminders.length > 0 && <b>{reminders.length}</b>}
          </button>
          {bell && (
            <div className="mps-pop" role="dialog" aria-label="Thông báo">
              <strong>Thông báo</strong>
              {reminders.length ? (
                <ul>
                  {reminders.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setBell(false);
                          onTab(r.tab);
                        }}
                      >
                        {r.text}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có thông báo mới.</p>
              )}
            </div>
          )}
          <a
            className="mps-icon mps-help"
            href={`tel:${BRAND.hotline}`}
            aria-label={`Gọi hỗ trợ ${BRAND.hotline}`}
            title={`Gọi ${BRAND.hotline}`}
          >
            <HelpCircle size={23} />
          </a>
          <button
            type="button"
            className="mps-user"
            onClick={() => onTab('settings')}
            aria-label="Thông tin tài khoản"
          >
            <span className="mps-avatar">{(first[0] ?? 'H').toUpperCase()}</span>
            <span className="mps-user-text">
              <b>{name}</b>
              <small>
                {signedOut
                  ? 'Chưa đăng nhập'
                  : ['gold', 'platinum', 'diamond'].includes(tier)
                    ? `Hội viên ${TIER_LABEL[tier]}`
                    : TIER_LABEL[tier]}
              </small>
            </span>
          </button>
        </div>
      </header>

      <div className="mps-body">
        <aside className="mps-side" aria-label="Menu hội viên">
          <nav>
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={'mps-nav' + (tab === key ? ' on' : '')}
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => {
                  document.body.classList.remove('mps-menu-open');
                  go(key);
                }}
              >
                <Icon size={21} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>
          <button type="button" className="mps-nav mps-logout" onClick={onLogout}>
            {signedOut ? (
              <LogIn size={21} strokeWidth={1.8} />
            ) : (
              <LogOut size={21} strokeWidth={1.8} />
            )}
            {signedOut ? 'Đăng nhập' : 'Đăng xuất'}
          </button>
          <button type="button" className="mps-promo" onClick={onBook}>
            <span>
              Đặt line nhanh
              <small>Trải nghiệm Golf 3D đẳng cấp</small>
            </span>
          </button>
        </aside>
        <main className="mps-main" id="noi-dung-hoi-vien">
          {children}
          <p className="sg-sr">Xin chào {first}</p>
        </main>
      </div>

      <nav className="mps-tabs" aria-label="Điều hướng nhanh">
        {(
          [
            ['overview', 'Trang chủ', Home],
            ['booking', 'Đặt sân', CalendarDays],
            ['events', 'Giải đấu', Trophy],
            ['packages', 'Hội viên', Crown],
            ['settings', 'Tài khoản', User],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'on' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => go(key)}
          >
            <span>
              <Icon size={22} />
            </span>
            {label}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="mps-scrim"
        aria-label="Đóng menu"
        onClick={() => document.body.classList.remove('mps-menu-open')}
      >
        <X size={20} />
      </button>
    </div>
  );
}
