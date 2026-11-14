'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { call, errText } from './api';
import { findItem, groupOf, visibleNav, type PageKey } from './crm-nav';

const COLLAPSE_KEY = 'crm-sidebar-collapsed';
const ROLE_LABEL: Record<string, string> = {
  owner: 'Chủ cơ sở',
  manager: 'Quản lý',
  cashier: 'Thu ngân',
  coach: 'HLV',
  cskh: 'CSKH',
  sale: 'Sale',
};

type Hit = { kind: 'lead' | 'customer'; id: string; name: string; phone: string; note: string };

/** Ctrl+K: type a name or phone number, jump to the lead or the customer's record. */
function QuickSearch({
  open,
  onClose,
  onLead,
  onCustomer,
}: {
  open: boolean;
  onClose: () => void;
  onLead: (id: string) => void;
  onCustomer: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset the box each time it opens */
    setQ('');
    setHits([]);
    setSel(0);
    setErr('');
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results
      setHits([]);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const [leads, customers] = await Promise.all([
          call<{ leads?: { id: string; fullName: string; phone: string; stage: string }[] }>(
            `/api/crm2/leads?limit=6&q=${encodeURIComponent(term)}`,
          ),
          call<{ customers?: { id: string; name: string; phone: string }[] }>(
            `/api/crm2/care-customers?q=${encodeURIComponent(term)}`,
          ),
        ]);
        if (!live) return;
        setErr('');
        setHits([
          ...(leads.leads ?? []).map((l) => ({ kind: 'lead' as const, id: l.id, name: l.fullName, phone: l.phone, note: 'Lead' })),
          ...(customers.customers ?? []).slice(0, 6).map((c) => ({ kind: 'customer' as const, id: c.id, name: c.name, phone: c.phone, note: 'Khách hàng' })),
        ]);
        setSel(0);
      } catch (e) {
        if (live) setErr(errText(e));
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  if (!open) return null;
  const pick = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    if (h.kind === 'lead') onLead(h.id);
    else onCustomer(h.id);
  };
  return (
    <div className="crm-ws-modal" role="dialog" aria-modal="true" aria-label="Tìm khách" onClick={onClose}>
      <div className="crm-ws-search" onClick={(e) => e.stopPropagation()}>
        <div className="crm-ws-search-box">
          <Search size={16} />
          <input
            ref={input}
            aria-label="Tìm khách theo tên hoặc số điện thoại"
            placeholder="Tên hoặc số điện thoại…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === 'Enter') pick(hits[sel]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        {err && <div className="crm-ws-search-empty">{err}</div>}
        <ul>
          {hits.map((h, i) => (
            <li key={h.kind + h.id}>
              <button className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => pick(h)}>
                <strong>{h.name}</strong>
                <span>{h.phone}</span>
                <small>{h.note}</small>
              </button>
            </li>
          ))}
        </ul>
        {q.trim().length >= 2 && !hits.length && !err && <div className="crm-ws-search-empty">Không tìm thấy khách nào</div>}
        {q.trim().length < 2 && <div className="crm-ws-search-empty">Nhập ít nhất 2 ký tự</div>}
      </div>
    </div>
  );
}

/**
 * The CRM workspace: grouped vertical menu on the left (collapsible to icons; a drawer on phones), the work area on
 * the right with a page header. Same layout as the TAG-website CRM.
 */
export function CrmShell({
  page,
  onPage,
  manager,
  onBack,
  onLead,
  onCustomer,
  children,
}: {
  page: PageKey;
  onPage: (p: PageKey) => void;
  manager: boolean;
  onBack?: () => void;
  onLead: (id: string) => void;
  onCustomer: (id: string) => void;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [overdue, setOverdue] = useState(0);
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved preference once
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* private mode: stay expanded */
    }
  }, []);
  useEffect(() => {
    let live = true;
    const load = () =>
      call<{ overdueTasks?: number }>('/api/crm2/overview')
        .then((r) => live && setOverdue(r.overdueTasks ?? 0))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    call<{ name?: string; role?: string }>('/api/auth/me')
      .then((r) => setMe({ name: r.name ?? '', role: r.role ?? '' }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const groups = useMemo(() => visibleNav(manager), [manager]);
  useEffect(() => {
    document.querySelector('.crm-ws-side .crm-ws-group button.on')?.scrollIntoView({ block: 'nearest' });
  }, [page, collapsed]);
  const item = findItem(page);
  const name = me?.name ?? '';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(-2).toUpperCase();
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  const go = (p: PageKey) => {
    setDrawer(false);
    onPage(p);
  };

  const nav = (wide: boolean) => (
    <div className="crm-ws-nav">
      <div className={'crm-ws-brand' + (wide ? '' : ' icon')}>
        <span>CRM</span>
        {wide && (
          <div>
            <strong>CRM SaiGon Indoor Golf</strong>
            <small>Quản lý kinh doanh</small>
          </div>
        )}
      </div>
      <button className={'crm-ws-find' + (wide ? '' : ' icon')} onClick={() => setSearching(true)} title="Tìm khách (Ctrl+K)" aria-label="Tìm khách">
        <Search size={16} />
        {wide && (
          <>
            <span>Tìm khách…</span>
            <kbd>Ctrl K</kbd>
          </>
        )}
      </button>
      {onBack && (
        <button className={'crm-ws-back' + (wide ? '' : ' icon')} onClick={onBack} title="Về trang quản lý">
          <ArrowLeft size={16} />
          {wide && 'Về trang quản lý'}
        </button>
      )}
      <nav aria-label="Menu CRM">
        {groups.map((g) => (
          <div key={g.title} className="crm-ws-group">
            {wide ? <div className="crm-ws-group-title">{g.title}</div> : <hr />}
            <ul>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = it.key === page;
                return (
                  <li key={it.key}>
                    <button
                      className={active ? 'on' : ''}
                      aria-current={active ? 'page' : undefined}
                      title={it.label}
                      onClick={() => go(it.key)}
                    >
                      <Icon size={18} />
                      {wide && <span>{it.label}</span>}
                      {it.key === 'care' && overdue > 0 && <em aria-label={`${overdue} việc quá hạn`}>{overdue}</em>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="crm-ws-user">
        <div>
          <span className="avatar">{initials || '?'}</span>
          {wide && (
            <div>
              <strong>{name}</strong>
              <small>{ROLE_LABEL[me?.role ?? ''] ?? me?.role}</small>
            </div>
          )}
        </div>
        <button className="crm-ws-collapse" onClick={toggle} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Thu gọn</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="crm-ws" data-collapsed={collapsed ? '1' : '0'}>
      <aside className="crm-ws-side" aria-label="Điều hướng CRM">{nav(!collapsed)}</aside>
      <div className="crm-ws-bar">
        <button onClick={() => setDrawer(true)} aria-label="Mở menu CRM">
          <Menu size={20} />
        </button>
        <strong>{item?.label ?? 'CRM'}</strong>
        <button onClick={() => setSearching(true)} aria-label="Tìm khách">
          <Search size={20} />
        </button>
      </div>
      {drawer && (
        <div className="crm-ws-drawer" role="dialog" aria-modal="true" aria-label="Menu CRM">
          <div className="crm-ws-scrim" onClick={() => setDrawer(false)} />
          <aside>
            <button className="crm-ws-close" onClick={() => setDrawer(false)} aria-label="Đóng menu">
              <X size={20} />
            </button>
            {nav(true)}
          </aside>
        </div>
      )}
      <main className="crm-ws-main">
        <header className="crm-ws-head">
          <small>{groupOf(page)}</small>
          <h2>{item?.label}</h2>
          {item?.hint && <p>{item.hint}</p>}
        </header>
        <div className="crm-ws-body">{children}</div>
      </main>
      <QuickSearch open={searching} onClose={() => setSearching(false)} onLead={onLead} onCustomer={onCustomer} />
    </div>
  );
}
