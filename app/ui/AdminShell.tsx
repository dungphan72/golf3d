'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Contact,
  Award,
  Bell,
  BellRing,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  GraduationCap,
  Globe,
  Grid2X2,
  LayoutDashboard,
  Menu,
  LayoutGrid,
  Plus,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  Megaphone,
  HelpCircle,
  Wallet,
  X,
  LogOut,
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
    label: 'QUẢN LÝ',
    items: [
      { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { key: 'bookings', label: 'Đặt line', icon: CalendarDays },
      { key: 'rooms', label: 'Bán hàng (POS)', icon: Grid2X2 },
      { key: 'invoices', label: 'Hóa đơn', icon: ReceiptText },
      { key: 'members', label: 'Khách hàng', icon: Users },
      { key: 'crmx', label: 'CRM', icon: Megaphone },
      { key: 'fnb', label: 'Thực đơn & kho', icon: UtensilsCrossed },
      { key: 'coaching', label: 'Huấn luyện', icon: GraduationCap },
      { key: 'reports', label: 'Doanh thu & báo cáo', icon: ChartColumn },
    ],
  },
  {
    label: 'HỆ THỐNG',
    items: [
      { key: 'settings', label: 'Cài đặt', icon: Settings },
      { key: 'support', label: 'Trợ giúp', icon: HelpCircle },
      { key: 'staff', label: 'Nhân sự', icon: Users },
      { key: 'finance', label: 'Ca & sổ tiền', icon: Wallet },
      { key: 'landing', label: 'Landing Page', icon: Globe },
      { key: 'audit', label: 'Nhật ký', icon: ScrollText },
      { key: 'account', label: 'Tài khoản', icon: ShieldCheck },
    ],
  },
];

export const NAV_LABEL: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);
/** Screens that live as tabs inside another menu entry: they highlight and title as their parent. */
export const NAV_PARENT: Record<string, string> = {
  online: 'bookings',
  stock: 'fnb',
  crm: 'crmx',
};

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
  onLogout,
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
  onLogout?: () => void;
}) {
  const active = NAV_PARENT[view] ?? view;
  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  // The menu scrolls on its own: keep the current screen's entry in sight instead of leaving it below the fold.
  useEffect(() => {
    asideRef.current?.querySelector('.ds-nav-item.selected')?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <>
      {open && <div className="ds-scrim" onClick={onClose} aria-hidden="true" />}
      <aside ref={asideRef} className={'ds-side' + (open ? ' open' : '')} aria-label="Menu chính">
        <div className="ds-side-head">
          <Link className="ds-brand" href="/quan-ly" aria-label={BRAND.name + ' — trang chủ'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={38} height={38} />
            <span>
              {BRAND.short}
              <small>{BRAND.sub}</small>
            </span>
          </Link>
          <button className="ds-iconbtn ds-close" aria-label="Đóng menu" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <div className="ds-branch-card">
          <div className="ds-branch-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={22} height={22} />
          </div>
          <div className="ds-branch-info">
            <span className="ds-branch-status">ĐANG VẬN HÀNH</span>
            <strong className="ds-branch-name">{BRAND.short}</strong>
          </div>
          <ChevronDown size={14} className="ds-branch-arrow" />
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
                    className={'ds-nav-item' + (active === key ? ' selected' : '')}
                    aria-current={active === key ? 'page' : undefined}
                    onClick={() => onGo(key)}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    {(badges[key] ?? 0) > 0 && <b className="ds-count">{badges[key]}</b>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="ds-side-foot">
          <div className="ds-user-card">
            <span className="ds-user-avatar">
              {(user[0] ?? 'H').toUpperCase()}{user.length > 1 ? (user[1] ?? 'N').toUpperCase() : 'N'}
            </span>
            <div className="ds-user-info">
              <strong className="ds-user-name">{user.split('@')[0] || 'Hoàng Nguyễn'}</strong>
              <span className="ds-user-role">{role || 'Quản trị viên'}</span>
            </div>
            {onLogout && (
              <button
                type="button"
                className="ds-user-logout-btn"
                aria-label="Đăng xuất"
                onClick={onLogout}
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      {open && (
        <div
          className="ds-appmenu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu ứng dụng"
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          <div className="ds-appmenu-grab" aria-hidden="true" />
          <header className="ds-appmenu-head">
            <span className="ds-appmenu-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.logo} alt="" width={32} height={32} />
              <span>
                <strong>{BRAND.short}</strong>
                <small>{(user.split('@')[0] || 'Quản trị viên') + (role ? ' · ' + role : '')}</small>
              </span>
            </span>
            <button ref={closeRef} className="ds-appmenu-close" aria-label="Đóng menu" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
          <div className="ds-appmenu-body">
            {NAV_GROUPS.map((g, gi) => {
              const items = g.items.filter((i) => visible(i.key));
              if (!items.length) return null;
              return (
                <section key={g.label} aria-label={g.label}>
                  <h2 className="ds-appmenu-title">{g.label}</h2>
                  <div className="ds-appmenu-grid">
                    {items.map(({ key, label, icon: Icon }, i) => (
                      <button
                        key={key}
                        className={'ds-app-tile hue-' + ((gi * 5 + i) % 8) + (active === key ? ' selected' : '')}
                        aria-current={active === key ? 'page' : undefined}
                        onClick={() => onGo(key)}
                      >
                        <span className="ds-app-ico">
                          <Icon size={26} />
                          {(badges[key] ?? 0) > 0 && <b className="ds-app-badge">{badges[key]}</b>}
                        </span>
                        <span className="ds-app-label">{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <footer className="ds-appmenu-foot">
            <button type="button" className="ds-app-foot-btn" onClick={onCustomerView}>
              <Globe size={18} /> Xem như khách
            </button>
            {onLogout && (
              <button type="button" className="ds-app-foot-btn danger" onClick={onLogout}>
                <LogOut size={18} /> Đăng xuất
              </button>
            )}
          </footer>
        </div>
      )}
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
        placeholder="Tìm khách hàng, mã đặt line, hóa đơn…"
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

/** A drop-down in the menu bar; closes on outside click or Escape. */
function DropMenu({
  label,
  icon,
  active,
  align = 'left',
  className = 'ds-menu-item',
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  align?: 'left' | 'right';
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="ds-drop" ref={ref}>
      <button
        className={className + (active ? ' selected' : '')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        {icon}
        {label}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className={'ds-drop-list ' + align} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Menu items shown straight on the menu bar; the rest sit under "Quản trị". */
const MAIN_KEYS = [
  'dashboard',
  'bookings',
  'rooms',
  'invoices',
  'members',
  'crmx',
  'reports',
];
const ADMIN_KEYS = ['settings', 'staff', 'audit'];
const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const item = (k: string) => ALL_ITEMS.find((i) => i.key === k)!;

/** Two rows, KiotViet style: utility bar (brand, search, actions) above the menu bar. */
export function AppHeader({
  title,
  view,
  visible,
  badges,
  user,
  role,
  connection,
  online,
  bookings,
  pending,
  onGo,
  onMenu,
  onBook,
  onRefresh,
  onSupport,
  onPick,
  onCustomerView,
  onLogout,
}: {
  title: string;
  view: string;
  visible: (key: string) => boolean;
  badges: Record<string, number>;
  user: string;
  role: string;
  connection: string;
  online: boolean;
  bookings: Booking[];
  pending: number;
  onGo: (key: string) => void;
  onMenu: () => void;
  onBook: () => void;
  onRefresh: () => void;
  onSupport: () => void;
  onPick: (b: Booking) => void;
  onCustomerView: () => void;
  onLogout?: () => void;
}) {
  const active = NAV_PARENT[view] ?? view;
  const admin = ADMIN_KEYS.filter(visible).map(item);
  const name = user.split('@')[0] || 'Chủ cơ sở';
  // Counter shortcuts: "/" jumps to search, "n" starts a booking. Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.ds-search input')?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onBook();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBook]);
  return (
    <header className="ds-head">
      <div className="ds-head-row">
        <button className="ds-iconbtn ds-menu" aria-label="Mở menu" onClick={onMenu}>
          <Menu size={24} />
        </button>
        <Link className="ds-brand" href="/quan-ly" aria-label={BRAND.name + ' — trang chủ'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={34} height={34} />
          <span>
            {BRAND.short}
            <small>{BRAND.sub}</small>
          </span>
        </Link>
        <h1 className="ds-title">{title}</h1>
        <div className="ds-platform-indicator">
          <span>Golf Booking CRM Platform</span>
          <ChevronDown size={13} />
        </div>
        <GlobalSearch bookings={bookings} onPick={onPick} />
        <div className="ds-top-actions">
          <button
            className="ds-primary"
            aria-label="Đặt lịch"
            title="Đặt lịch (N)"
            onClick={onBook}
          >
            <Plus size={19} />
            <span>Tạo booking</span>
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
          {onLogout && (
            <button
              className="ds-iconbtn ds-top-logout-btn"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              onClick={onLogout}
              style={{ color: '#64748b' }}
            >
              <LogOut size={18} />
            </button>
          )}
          <DropMenu
            className="ds-user-btn"
            align="right"
            label={<span className="ds-uname">{name}</span>}
            icon={<span className="ds-avatar">{(name[0] ?? 'D').toUpperCase()}</span>}
          >
            {(close) => (
              <>
                <div className="ds-drop-head">
                  <strong>{name}</strong>
                  {role && <small>{role}</small>}
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    close();
                    onGo('account');
                  }}
                >
                  <ShieldCheck size={17} /> Tài khoản
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    close();
                    onCustomerView();
                  }}
                >
                  <Globe size={17} /> Xem như khách hàng
                </button>
                {onLogout && (
                  <>
                    <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                    <button
                      role="menuitem"
                      onClick={() => {
                        close();
                        onLogout();
                      }}
                      style={{ color: '#dc2626', fontWeight: 600 }}
                    >
                      <LogOut size={17} /> Đăng xuất
                    </button>
                  </>
                )}
              </>
            )}
          </DropMenu>
        </div>
      </div>
      <nav className="ds-menubar" aria-label="Menu chính">
        {MAIN_KEYS.filter(visible).map((k) => {
          const { label, icon: Icon } = item(k);
          return (
            <button
              key={k}
              className={
                'ds-menu-item' +
                (active === k ? ' selected' : '') +
                (k === 'support' && (badges[k] ?? 0) > 0 ? ' ringing' : '')
              }
              aria-current={active === k ? 'page' : undefined}
              onClick={() => onGo(k)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {(badges[k] ?? 0) > 0 && <b className="ds-count">{badges[k]}</b>}
            </button>
          );
        })}
        {admin.length > 0 && (
          <DropMenu
            label="Quản trị"
            icon={<Settings size={18} />}
            active={ADMIN_KEYS.includes(active)}
          >
            {(close) =>
              admin.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="menuitem"
                  className={active === key ? 'selected' : ''}
                  onClick={() => {
                    close();
                    onGo(key);
                  }}
                >
                  <Icon size={17} /> {label}
                </button>
              ))
            }
          </DropMenu>
        )}
      </nav>
    </header>
  );
}

/** Phone / tablet tab bar, like a mobile app: four daily screens and "Menu", which opens the icon grid. */
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
    { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'bookings', label: 'Đặt line', icon: CalendarDays },
    { key: 'rooms', label: 'POS', icon: Grid2X2 },
    { key: 'reports', label: 'Báo cáo', icon: ChartColumn },
  ];
  const inMain = main.some((m) => m.key === view);
  // Entries only reachable through "Menu" (like Thu tiền) still show their count on it.
  const hidden = Object.entries(badges)
    .filter(([k]) => !main.some((m) => m.key === k))
    .reduce((n, [, v]) => n + (v ?? 0), 0);
  return (
    <nav className="ds-bottom" aria-label="Thao tác nhanh">
      {main.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={view === key ? 'active' : ''}
          aria-current={view === key ? 'page' : undefined}
          onClick={() => onGo(key)}
        >
          <Icon size={22} />
          <span>{label}</span>
          {(badges[key] ?? 0) > 0 && <b>{badges[key]}</b>}
        </button>
      ))}
      <button className={inMain ? '' : 'active'} onClick={onMore} aria-haspopup="dialog">
        <LayoutGrid size={22} />
        <span>Menu</span>
        {hidden > 0 && <b>{hidden}</b>}
      </button>
    </nav>
  );
}
