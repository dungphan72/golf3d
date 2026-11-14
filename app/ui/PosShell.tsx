'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  Globe,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import type { Booking } from '../../lib/club';
import { BRAND } from '../../lib/brand';
import { GlobalSearch, NAV_GROUPS, NAV_PARENT } from './AdminShell';

/** Desktop side menu: the same entries as the mobile menu, styled as the POS mock-up. */
export function PosSidebar({
  view,
  visible,
  badges,
  onGo,
}: {
  view: string;
  visible: (key: string) => boolean;
  badges: Record<string, number>;
  onGo: (key: string) => void;
}) {
  const active = NAV_PARENT[view] ?? view;
  return (
    <aside className="pos-side" aria-label="Menu chính">
      <nav className="pos-nav">
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => visible(i.key));
          if (!items.length) return null;
          return (
            <div className="pos-nav-group" key={g.label}>
              <p className="pos-nav-label">{g.label}</p>
              {items.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={'pos-nav-item' + (active === key ? ' on' : '')}
                  aria-current={active === key ? 'page' : undefined}
                  onClick={() => onGo(key)}
                >
                  <Icon size={21} strokeWidth={1.8} />
                  <span>{label}</span>
                  {(badges[key] ?? 0) > 0 && <b className="pos-count">{badges[key]}</b>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="pos-club-card">
        <svg viewBox="0 0 240 92" aria-hidden="true" focusable="false">
          <path d="M0 92V62c34-26 70-30 104-12 26 14 58 12 82-4 20-12 40-12 54-4v50z" fill="#0a5c1e" />
          <path d="M0 92V74c40-22 82-26 120-8 30 14 78 12 120-6v32z" fill="#fcb000" opacity="0.92" />
          <path d="M0 92V82c44-14 92-14 140-2 40 10 70 6 100-2v14z" fill="#0f7a2c" />
          <circle cx="152" cy="14" r="5" fill="#0a5c1e" />
          <path d="M152 20v22m0 0-9 14m9-14 10 12M143 28l-10 6m19-6 14-8" stroke="#0a5c1e" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </svg>
        <ul>
          <li>
            <MapPin size={18} />
            <span>{BRAND.address}</span>
          </li>
          <li>
            <Phone size={18} />
            <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
          </li>
          <li>
            <Globe size={18} />
            <span>{BRAND.website}</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

/** Top bar: brand, search, and the counter's quick actions. */
export function PosTopbar({
  title,
  user,
  role,
  online,
  connection,
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
  user: string;
  role: string;
  online: boolean;
  connection: string;
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
  const name = user.split('@')[0] || 'Chủ cơ sở';
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);
  // Counter shortcuts: Ctrl+K or "/" jumps to search, "n" starts a booking. Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.pos-search input')?.focus();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.pos-search input')?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onBook();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBook]);
  return (
    <header className="pos-top">
      <h1 className="ds-title">{title}</h1>
      <button type="button" className="pos-iconbtn pos-burger" aria-label="Mở menu" onClick={onMenu}>
        <Menu size={24} />
      </button>
      <Link className="pos-brand" href="/quan-ly" aria-label={BRAND.name + ' — trang chủ'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo} alt="" width={52} height={52} />
        <span>
          <b>{BRAND.name}</b>
          <small>Hệ thống POS – Đặt line &amp; quản lý vận hành</small>
        </span>
      </Link>
      <div className="pos-search">
        <div className="pos-search-field">
          <GlobalSearch bookings={bookings} onPick={onPick} />
        </div>
        <kbd>Ctrl + K</kbd>
      </div>
      <div className="pos-actions">
        <button type="button" className="pos-new" aria-label="Đặt lịch" onClick={onBook} title="Đặt lịch (N)">
          <Plus size={18} />
          <span>Tạo booking</span>
        </button>
        <span className={'pos-conn' + (online ? ' on' : '')} title={connection}>
          <i />
          <span>{connection}</span>
        </span>
        <button type="button" className="pos-iconbtn pos-refresh" aria-label="Tải lại" title="Tải lại" onClick={onRefresh}>
          <RefreshCw size={20} />
        </button>
        <button
          type="button"
          className="pos-iconbtn pos-bell"
          aria-label="Yêu cầu hỗ trợ"
          title="Yêu cầu hỗ trợ"
          onClick={onSupport}
        >
          <Bell size={23} />
          {pending > 0 && <b>{pending}</b>}
        </button>
        <button
          type="button"
          className="pos-iconbtn pos-help"
          aria-label="Trợ giúp"
          title="Trợ giúp"
          onClick={() => onGo('support')}
        >
          <HelpCircle size={23} />
        </button>
        <button
          type="button"
          className="pos-iconbtn pos-apps"
          aria-label="Tất cả màn hình"
          title="Tất cả màn hình"
          onClick={onMenu}
        >
          <LayoutGrid size={23} />
        </button>
        <div className="pos-user" ref={box}>
          <button
            type="button"
            className="pos-user-btn"
            aria-expanded={menu}
            aria-haspopup="menu"
            onClick={() => setMenu(!menu)}
          >
            <span className="pos-avatar">{(name[0] ?? 'D').toUpperCase()}</span>
            <ChevronDown size={18} />
          </button>
          {menu && (
            <div className="pos-user-menu" role="menu">
              <div className="pos-user-head">
                <strong>{name}</strong>
                {role && <small>{role}</small>}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onGo('account');
                }}
              >
                <ShieldCheck size={17} /> Tài khoản
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onCustomerView();
                }}
              >
                <Globe size={17} /> Xem như khách hàng
              </button>
              {onLogout && (
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenu(false);
                    onLogout();
                  }}
                >
                  <LogOut size={17} /> Đăng xuất
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
