'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Bell,
  CalendarDays,
  ChartColumn,
  Globe,
  GraduationCap,
  Grid2X2,
  Headphones,
  HeartHandshake,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { rooms, type Booking } from '../../lib/club';
import { BRAND } from '../../lib/brand';
import { labels, time, date } from './shared';

type Icon = typeof Grid2X2;
export type NavItem = { key: string; label: string; icon: Icon };
export type NavGroup = { label: string; items: NavItem[] };

/** The staff menu, grouped by what the person is doing. Each screen appears exactly once. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { key: 'rooms', label: 'Sơ đồ phòng', icon: Grid2X2 },
      { key: 'bookings', label: 'Lịch đặt', icon: CalendarDays },
      { key: 'online', label: 'Đặt online', icon: Globe },
      { key: 'support', label: 'Yêu cầu hỗ trợ', icon: Headphones },
    ],
  },
  {
    label: 'Bán hàng',
    items: [
      { key: 'invoices', label: 'Hóa đơn', icon: ReceiptText },
      { key: 'fnb', label: 'Thực đơn & bếp', icon: UtensilsCrossed },
      { key: 'stock', label: 'Kho', icon: Package },
    ],
  },
  {
    label: 'Khách hàng',
    items: [
      { key: 'crm', label: 'Chăm sóc KH', icon: HeartHandshake },
      { key: 'members', label: 'Hội viên', icon: Award },
      { key: 'coaching', label: 'Huấn luyện', icon: GraduationCap },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { key: 'finance', label: 'Ca & sổ tiền', icon: Wallet },
      { key: 'reports', label: 'Báo cáo', icon: ChartColumn },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { key: 'settings', label: 'Cài đặt cơ sở', icon: Settings },
      { key: 'staff', label: 'Nhân viên', icon: Users },
      { key: 'audit', label: 'Nhật ký', icon: ScrollText },
      { key: 'account', label: 'Tài khoản', icon: ShieldCheck },
    ],
  },
];

export const NAV_LABEL: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

export function Sidebar({
  open,
  view,
  visible,
  badges,
  user,
  role,
  onGo,
  onClose,
  onCustomerView,
}: {
  open: boolean;
  view: string;
  visible: (key: string) => boolean;
  badges: Record<string, number>;
  user: string;
  role: string;
  onGo: (key: string) => void;
  onClose: () => void;
  onCustomerView: () => void;
}) {
  return (
    <>
      {open && <div className="ds-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={'ds-side' + (open ? ' open' : '')} aria-label="Menu chính">
        <div className="ds-side-head">
          <Link className="ds-brand" href="/quan-ly" aria-label={BRAND.name + ' — trang chủ'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={40} height={40} />
            <span>
              {BRAND.short}
              <small>{BRAND.sub}</small>
            </span>
          </Link>
          <button className="ds-iconbtn ds-close" aria-label="Đóng menu" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <nav className="ds-nav">
          {NAV_GROUPS.map((g) => {
            const items = g.items.filter((i) => visible(i.key));
            if (!items.length) return null;
            return (
              <div className="ds-group" key={g.label}>
                <div className="ds-group-label">{g.label}</div>
                {items.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={'ds-nav-item' + (view === key ? ' selected' : '')}
                    aria-current={view === key ? 'page' : undefined}
                    onClick={() => onGo(key)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    {(badges[key] ?? 0) > 0 && <b className="ds-badge">{badges[key]}</b>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="ds-side-foot">
          <button className="ds-link" onClick={onCustomerView}>
            Xem như khách hàng
          </button>
          <div className="ds-user">
            <span className="ds-avatar">{(user[0] ?? 'D').toUpperCase()}</span>
            <div>
              <strong>{user.split('@')[0] || 'Chủ cơ sở'}</strong>
              {role && <small>{role}</small>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/** Finds a customer or booking by name, phone or room and opens it. */
export function GlobalSearch({
  bookings,
  onPick,
}: {
  bookings: Booking[];
  onPick: (b: Booking) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return bookings
      .filter((b) => {
        const roomName = rooms.find((r) => r.id === b.room)?.name ?? '';
        return `${b.customer} ${b.phone} ${roomName}`.toLowerCase().includes(t);
      })
      .sort((a, b) => b.start - a.start)
      .slice(0, 7);
  }, [q, bookings]);
  const pick = (b: Booking) => {
    onPick(b);
    setQ('');
    setOpen(false);
  };
  return (
    <div className="ds-search">
      <Search size={18} />
      <input
        aria-label="Tìm khách hoặc phiếu"
        placeholder="Tìm khách, số điện thoại, line…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) pick(results[0]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="ds-search-results" role="listbox">
          {results.length ? (
            results.map((b) => (
              <button key={b.id} role="option" aria-selected="false" onMouseDown={() => pick(b)}>
                <span>
                  <strong>{b.customer}</strong>
                  <small>
                    {b.phone || 'Không có số'} · {rooms.find((r) => r.id === b.room)?.name} ·{' '}
                    {date(b.start)} {time(b.start)}
                  </small>
                </span>
                <em className={'badge ' + b.status}>{labels[b.status]}</em>
              </button>
            ))
          ) : (
            <p>Không thấy kết quả</p>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar({
  title,
  connection,
  online,
  bookings,
  pending,
  onMenu,
  onBook,
  onRefresh,
  onSupport,
  onPick,
}: {
  title: string;
  connection: string;
  online: boolean;
  bookings: Booking[];
  pending: number;
  onMenu: () => void;
  onBook: () => void;
  onRefresh: () => void;
  onSupport: () => void;
  onPick: (b: Booking) => void;
}) {
  return (
    <header className="ds-top">
      <button className="ds-iconbtn ds-menu" aria-label="Mở menu" onClick={onMenu}>
        <Menu size={24} />
      </button>
      <h1>{title}</h1>
      <GlobalSearch bookings={bookings} onPick={onPick} />
      <div className="ds-top-actions">
        <button className="ds-primary" aria-label="Đặt lịch" onClick={onBook}>
          <Plus size={19} />
          <span>Đặt lịch</span>
        </button>
        <span className={'ds-conn' + (online ? ' on' : '')} title={connection}>
          <i />
          <span>{connection}</span>
        </span>
        <button className="ds-iconbtn" aria-label="Tải lại" title="Tải lại" onClick={onRefresh}>
          <RefreshCw size={19} />
        </button>
        <button
          className="ds-iconbtn ds-bell"
          aria-label="Yêu cầu hỗ trợ"
          title="Yêu cầu hỗ trợ"
          onClick={onSupport}
        >
          <Bell size={20} />
          {pending > 0 && <b>{pending}</b>}
        </button>
      </div>
    </header>
  );
}

/** Phone / tablet tab bar: the four things done all day, and "Thêm" for the rest of the menu. */
export function BottomBar({
  view,
  badges,
  onGo,
  onMore,
}: {
  view: string;
  badges: Record<string, number>;
  onGo: (key: string) => void;
  onMore: () => void;
}) {
  const main: NavItem[] = [
    { key: 'rooms', label: 'Phòng', icon: Grid2X2 },
    { key: 'bookings', label: 'Lịch đặt', icon: CalendarDays },
    { key: 'invoices', label: 'Thu tiền', icon: Wallet },
  ];
  return (
    <nav className="ds-bottom" aria-label="Thao tác nhanh">
      {main.map(({ key, label, icon: Icon }) => (
        <button key={key} className={view === key ? 'active' : ''} onClick={() => onGo(key)}>
          <Icon size={22} />
          <span>{label}</span>
          {(badges[key] ?? 0) > 0 && <b>{badges[key]}</b>}
        </button>
      ))}
      <button onClick={onMore}>
        <MoreHorizontal size={22} />
        <span>Thêm</span>
      </button>
    </nav>
  );
}
