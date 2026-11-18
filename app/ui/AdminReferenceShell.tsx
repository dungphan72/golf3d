'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from 'react';
import {
  ArrowLeftToLine,
  Bell,
  CalendarDays,
  Car,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Crown,
  Download,
  GraduationCap,
  Grid2X2,
  Home,
  Layers,
  LogOut,
  Menu,
  Megaphone,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { rooms, type Booking } from '../../lib/club';
import type { Data } from './shared';
import { usePwaInstall } from './PwaInstallPrompt';
import '../admin-reference.css';

export const ADMIN_NAV = [
  { key: 'dashboard', label: 'Tổng quan', icon: Home },
  { key: 'bookings', label: 'Đặt sân', icon: CalendarDays },
  { key: 'rooms', label: 'POS & Bán hàng', icon: Store },
  { key: 'parking', label: 'Bãi đậu xe', icon: Car },
  { key: 'crmx', label: 'Khách hàng (CRM)', icon: Users },
  { key: 'members', label: 'Hội viên', icon: Crown },
  { key: 'content', label: 'Giải đấu', icon: Trophy },
  { key: 'coaching', label: 'Huấn luyện', icon: GraduationCap },
  { key: 'fnb', label: 'Sản phẩm & Dịch vụ', icon: Package },
  { key: 'reports', label: 'Báo cáo', icon: ChartNoAxesColumnIncreasing },
  { key: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
];

export const SETTINGS_SUBNAV = [
  { key: 'all', label: 'Tổng hợp' },
  { key: 'facility', label: 'Cơ sở & Khu vực' },
  { key: 'hours', label: 'Giờ hoạt động' },
  { key: 'pricing', label: 'Giá & Thuế' },
  { key: 'packages', label: 'Gói trả trước & Thẻ' },
  { key: 'service_call', label: 'Gọi phục vụ & QR' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'staff', label: 'Tài khoản & Phân quyền' },
  { key: 'integration', label: 'Tích hợp' },
  { key: 'security', label: 'Sao lưu & Bảo mật' },
];

export const CRM_SUBNAV: { key: string; label: string; badge?: number }[] = [
  { key: 'customers', label: 'CRM Khách hàng' },
  { key: 'leads', label: 'Lead tiềm năng' },
  { key: 'opportunities', label: 'Cơ hội & Bán hàng' },
  { key: 'appointments', label: 'Đặt sân & Lịch hẹn' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'tasks', label: 'Công việc' },
];

export const ADMIN_VIEWS = new Set([
  ...ADMIN_NAV.map((n) => n.key),
  'packages',
  'online',
  'marketing',
]);

export function AdminReferenceShell({
  view,
  onGo,
  visible,
  data,
  error,
  settingsSub = 'all',
  onSelectSettingsSub,
  crmSub = 'customers',
  onSelectCrmSub,
  onSelect,
  onLogout,
  children,
}: {
  view: string;
  onGo: (v: string) => void;
  visible: (v: string) => boolean;
  data: Data | null;
  error: string;
  settingsSub?: string;
  onSelectSettingsSub?: (sub: string) => void;
  crmSub?: string;
  onSelectCrmSub?: (sub: string) => void;
  onSelect: (b: Booking) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [more, setMore] = useState(false),
    [bell, setBell] = useState(false),
    [profile, setProfile] = useState(false),
    [search, setSearch] = useState('');
  const { openInstall } = usePwaInstall();
  const active = view === 'online' ? 'bookings' : view === 'marketing' ? 'crmx' : view;
  const nav = ADMIN_NAV.filter((n) => visible(n.key));
  const hits = search.trim()
    ? (data?.bookings
        .filter((b) =>
          `${b.customer} ${b.phone} ${b.id} ${rooms.find((r) => r.id === b.room)?.name}`
            .toLocaleLowerCase('vi')
            .includes(search.toLocaleLowerCase('vi')),
        )
        .slice(0, 5) ?? [])
    : [];
  function go(v: string) {
    onGo(v);
    setMore(false);
    setBell(false);
    setProfile(false);
    setSearch('');
  }
  return (
    <div className={'ar-shell' + (collapsed ? ' ar-collapsed' : '')}>
      <aside className="ar-sidebar">
        <a className="ar-brand" href="/quan-ly">
          <img src={BRAND.logo} alt="Saigon Indoor Golf Club" />
          <strong>
            Saigon Indoor
            <br />
            Golf Club
          </strong>
        </a>
        <button
          className="ar-collapse"
          aria-label="Thu gọn menu"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ArrowLeftToLine />
        </button>
        <nav aria-label="Quản trị hệ thống">
          {nav.map(({ key, label, icon: I }) => (
            <div key={key} className="ar-nav-item-wrap">
              <button
                className={active === key ? 'on' : ''}
                onClick={() => go(key)}
                aria-current={active === key ? 'page' : undefined}
                title={label}
              >
                <I />
                <span>{label}</span>
              </button>
              {key === 'crmx' && active === 'crmx' && (
                <div className="ar-sidebar-submenu">
                  {CRM_SUBNAV.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      className={`ar-sidebar-subitem ${crmSub === sub.key ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCrmSub?.(sub.key);
                      }}
                    >
                      <span className="ar-bullet">•</span>
                      <span>{sub.label}</span>
                      {sub.badge && <span className="ar-sidebar-badge">{sub.badge}</span>}
                    </button>
                  ))}
                </div>
              )}
              {key === 'settings' && active === 'settings' && (
                <div className="ar-sidebar-submenu">
                  {SETTINGS_SUBNAV.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      className={`ar-sidebar-subitem ${settingsSub === sub.key ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSettingsSub?.(sub.key);
                      }}
                    >
                      <span className="ar-bullet">•</span>
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ar-sidebar-footer">
          <img src={BRAND.logo} alt="" className="ar-footer-logo" />
          <div className="ar-footer-text">
            <strong>Saigon Indoor Golf Club</strong>
            <small>250 Lương Định Của, P. Bình Trưng, TP.HCM</small>
          </div>
        </div>
      </aside>
      <div className="ar-workspace">
        <header className="ar-top">
          <div className="ar-mobile-brand">
            <img src={BRAND.logo} alt="" />
            <span>
              <strong>{BRAND.name}</strong>
              <small>Quản trị hệ thống</small>
            </span>
          </div>
          <div className="ar-welcome">
            <h1>
              {view === 'dashboard'
                ? 'Chào mừng, Quản trị viên'
                : ADMIN_NAV.find((n) => n.key === active)?.label}
            </h1>
            <p>Tổng quan hoạt động hôm nay tại Saigon Indoor Golf Club</p>
          </div>
          <div className="ar-search">
            <Search />
            <input
              aria-label="Tìm kiếm chức năng, cài đặt..."
              placeholder="Tìm kiếm chức năng, cài đặt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <div className="ar-pop ar-search-results">
                <button
                  className="ar-search-close"
                  onClick={() => setSearch('')}
                  aria-label="Đóng tìm kiếm"
                >
                  <X />
                </button>
                {hits.length ? (
                  hits.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelect(b);
                        setSearch('');
                      }}
                    >
                      <strong>{b.customer}</strong>
                      <small>
                        {rooms.find((r) => r.id === b.room)?.name} · {b.phone}
                      </small>
                    </button>
                  ))
                ) : (
                  <p>Không tìm thấy đặt sân phù hợp.</p>
                )}
              </div>
            )}
          </div>
          <div className="ar-top-actions">
            <div className="ar-action-wrap">
              <button
                className="ar-icon"
                aria-label="Thông báo"
                aria-expanded={bell}
                onClick={() => {
                  setBell(!bell);
                  setProfile(false);
                }}
              >
                <Bell />
                <span className="ar-bell-dot" />
              </button>
              {bell && (
                <div className="ar-pop">
                  <strong>Thông báo</strong>
                  <p>
                    {error ||
                      ((data?.onlinePending ?? 0) > 0
                        ? `${data?.onlinePending} yêu cầu đặt sân đang chờ xử lý.`
                        : 'Không có thông báo mới.')}
                  </p>
                  {!!data?.onlinePending && (
                    <button onClick={() => go('online')}>Xem yêu cầu đặt sân</button>
                  )}
                </div>
              )}
            </div>
            <button
              className="ar-icon ar-apps"
              aria-label="Menu chức năng"
              onClick={() => setMore(!more)}
            >
              <Grid2X2 />
            </button>
            <div className="ar-action-wrap">
              <button
                className="ar-profile"
                onClick={() => {
                  setProfile(!profile);
                  setBell(false);
                }}
                aria-label="Tài khoản quản trị"
                aria-expanded={profile}
              >
                <span className="ar-avatar">{(data?.user || 'A').slice(0, 1).toUpperCase()}</span>
                <span className="ar-profile-info">
                  <strong>{data?.user || 'Admin'}</strong>
                  <small>{data?.role || 'Quản trị hệ thống'}</small>
                </span>
                <ChevronDown />
              </button>
              {profile && (
                <div className="ar-pop">
                  <strong>{data?.user}</strong>
                  <a
                    href="/app"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      color: '#0a5c1e',
                      fontWeight: 600,
                      fontSize: 13,
                      textDecoration: 'none',
                      borderRadius: 4,
                    }}
                  >
                    <Home size={16} />
                    Về SiGolf (/app)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(false);
                      openInstall();
                    }}
                  >
                    <Download size={16} />
                    Cài SiGolf
                  </button>
                  <button onClick={onLogout}>
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="ar-main" id="noi-dung" tabIndex={-1}>
          {children}
        </main>
      </div>
      <nav className="ar-bottom" aria-label="Điều hướng quản trị">
        {[
          { key: 'dashboard', label: 'Tổng quan', icon: Home },
          { key: 'bookings', label: 'Đặt sân', icon: CalendarDays },
          { key: 'rooms', label: 'POS', icon: Store },
          { key: 'crmx', label: 'Khách hàng', icon: Users },
          { key: 'reports', label: 'Báo cáo', icon: ChartNoAxesColumnIncreasing },
        ]
          .filter((n) => visible(n.key))
          .map(({ key, label, icon: I }) => (
            <button
              key={key}
              className={active === key ? 'on' : ''}
              onClick={() => go(key)}
              aria-current={active === key ? 'page' : undefined}
            >
              <I />
              {label}
            </button>
          ))}
        <button onClick={() => setMore(true)} aria-label="Chức năng khác">
          <Menu />
          Khác
        </button>
      </nav>
      {more && (
        <div className="ar-menu-overlay" onClick={() => setMore(false)}>
          <section
            className="ar-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Chức năng quản trị"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setMore(false)}
          >
            <header>
              <h2>Chức năng quản trị</h2>
              <button onClick={() => setMore(false)} aria-label="Đóng menu">
                <X />
              </button>
            </header>
            <div>
              {nav.map(({ key, label, icon: I }) => (
                <button key={key} onClick={() => go(key)}>
                  <I />
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
