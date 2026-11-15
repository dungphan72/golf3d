'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { defaults, type Booking } from '../../lib/club';
import FnbPanel from './FnbPanel';
import { BookingForm } from './Forms';
import { SettingsForm, type SettingsTab } from './Forms';
import { SystemSettingsHub } from './SystemSettingsHub';
import { ModernPosFlow } from './ModernPosFlow';
import { PageTabs } from './kit';
import { type Data } from './shared';
import { BookingsHub, HUB_VIEWS } from './BookingsHub';
import { PosBoard } from './PosBoard';
import { AdminReferenceShell, ADMIN_VIEWS } from './AdminReferenceShell';
import { AdminOverview } from './AdminOverview';

import { SessionPanel } from './SessionPanel';
import { LoginScreen } from './LoginScreen';
import { AccountPanel } from './AccountPanel';
import { MembersPanel } from './MembersPanel';
import { SepaySettings } from './SepaySettings';
import { ReportsPanel } from './ReportsPanel';
import { CrmModule } from '../../modules/crm/ui/CrmApp';

import { WalkInDialog } from './WalkInDialog';
import { ContentPanel } from './ContentPanel';
import { useBellSound } from './BellAlerts';
import { FinanceDialog } from './finance/FinanceDialog';
export default function ClubApp() {
  const [openingShift, setOpeningShift] = useState(false);
  const [data, setData] = useState<Data | null>(null),
    // A link from a lead notification (/quan-ly?view=crm&customer=ID) opens the customer's file;
    // a scanned member card (/quan-ly?hv=HV-XXXXXXXX) opens the members screen on that card.
    [deepLink] = useState(() => {
      if (typeof location === 'undefined')
        return { view: 'dashboard', customer: null as string | null };
      const q = new URLSearchParams(location.search);
      const requestedView = q.get('view') === 'crm' ? 'crmx' : q.get('view');
      const view = q.get('hv') ? 'members' : requestedView || 'dashboard';
      return { view, customer: q.get('customer') };
    }),
    deepCustomer = deepLink.customer,
    [view, setView] = useState(ADMIN_VIEWS.has(deepLink.view) ? deepLink.view : 'dashboard'),
    [modal, setModal] = useState(false),
    [bookingRoom, setBookingRoom] = useState('line-1'),
    [bookingCustomer, setBookingCustomer] = useState<{ name?: string; phone?: string } | null>(
      null,
    ),
    [memberTarget, setMemberTarget] = useState<{ id?: string; phone?: string } | null>(null),
    [walkInRoom, setWalkInRoom] = useState<string | null>(null),
    [selected, setSelected] = useState<Booking | null>(null),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(() => Date.now()),
    [leads] = useState<{ overdue: number; waiting: number; queued: number } | undefined>(),
    [crm2, setCrm2] = useState<{ newUnhandled: number; overdueTasks: number } | undefined>(),
    [settingsTab, setSettingsTab] = useState<SettingsTab>('facility'),
    [settingsSub, setSettingsSub] = useState<string>('all');
  const [authState, setAuthState] = useState<'ok' | 'login' | 'change'>('ok');
  async function load() {
    try {
      const r = await fetch('/api/club', { cache: 'no-store' });
      const v = (await r.json()) as Data & { error?: string };
      if (r.status === 401) {
        setAuthState('login');
        return;
      }
      if (r.status === 403 && v.error?.includes('mật khẩu tạm thời')) {
        setAuthState('change');
        return;
      }
      if (!r.ok) throw new Error(v.error || 'Không tải được dữ liệu');
      setAuthState('ok');
      setData(v);
      setError('');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const id = setInterval(() => {
      load();
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(id);
  }, []);
  const canSeeLeads = !!data?.permissions?.includes('crm.view');
  useEffect(() => {
    if (!canSeeLeads) return;
    let live = true;
    const poll = async () => {
      try {
        // The CRM module: new leads nobody has called yet, and tasks past their time.
        const r = await fetch('/api/crm2/overview', { cache: 'no-store' });
        if (!r.ok) return;
        const v = (await r.json()) as { newUnhandled?: number; overdueTasks?: number };
        if (live) setCrm2({ newUnhandled: v.newUnhandled ?? 0, overdueTasks: v.overdueTasks ?? 0 });
      } catch {
        /* same: no alert */
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [canSeeLeads]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  async function mutate(value: Record<string, unknown>) {
    setBusy(true);
    try {
      const payment = value.action === 'pay';
      const body = payment
        ? {
            action: 'pay',
            bookingId: value.id,
            method: value.method,
            requestId: value.requestId,
            expectedAmount: value.expectedAmount,
            ...(value.bankTxId ? { bankTxId: value.bankTxId } : {}),
          }
        : value;
      const r = await fetch(payment ? '/api/finance' : '/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await r.json()) as { error?: string; replayed?: boolean };
      if (!r.ok) throw new Error(result.error);
      await load();
      setToast(result.replayed ? 'Đã ghi nhận trước đó; không ghi trùng.' : 'Đã lưu thay đổi');
      return true;
    } catch (e) {
      await load();
      setToast(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const c = data?.config ?? defaults,
    b = data?.bookings ?? [];
  const ringing = data ? data.requests.filter((x) => x.status === 'new').length : null;
  const onRing = useCallback(
    (n: number) => setToast(n > 1 ? `${n} khách đang gọi phục vụ` : 'Có khách gọi phục vụ'),
    [],
  );
  useBellSound(ringing, onRing);
  const needs: Record<string, string> = {
    finance: 'finance.view',
    reports: 'finance.view',
    content: 'settings.manage',
    settings: 'settings.manage',
    members: 'member.view',
    crm: 'crm.view',
    crmx: 'crm.view',
    online: 'booking.create',
    marketing: 'crm.view',
  };
  const allowed = (key: string) =>
    !needs[key] || !data?.permissions || data.permissions.includes(needs[key]);
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setData(null);
    setAuthState('login');
  }
  function go(v: string) {
    setView(ADMIN_VIEWS.has(v) && allowed(v) ? v : 'dashboard');
  }
  const chosen = selected ? (b.find((x) => x.id === selected.id) ?? selected) : null;
  if (authState === 'login') return <LoginScreen onDone={load} />;
  if (authState === 'change')
    return (
      <div className="auth-screen">
        <AccountPanel forced onChanged={load} onLogout={signOut} />
      </div>
    );
  const visibleNav = (key: string) => allowed(key);
  const bookRoom = (r: string) => {
    setBookingRoom(r);
    setModal(true);
  };
  const handleCrmNavigate = (
    targetView: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => {
    if (targetView === 'members') {
      setMemberTarget({ id: extra?.customerId, phone: extra?.phone });
      go('members');
    } else if (targetView === 'rooms') {
      setBookingRoom(extra?.room || 'line-1');
      setBookingCustomer({ name: extra?.name, phone: extra?.phone });
      setModal(true);
      go('rooms');
    } else {
      go(targetView);
    }
  };
  return (
    <div className="ar-app">
      <AdminReferenceShell
        view={view}
        data={data}
        error={error}
        visible={visibleNav}
        settingsSub={settingsSub}
        onSelectSettingsSub={(sub) => {
          setSettingsSub(sub);
          go('settings');
        }}
        onGo={go}
        onSelect={setSelected}
        onLogout={signOut}
      >
        <div className={view === 'dashboard' ? 'ar-content' : (view === 'settings' ? 'ar-settings-wrap' : (view === 'rooms' ? 'ar-pos-wrap' : 'ds-root ar-legacy-content'))}>
          {error && (
            <div className="error-box" role="alert">
              {error}
              <button onClick={load}>Thử lại</button>
              {error.includes('đăng nhập') && (
                <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
                  Đăng nhập
                </a>
              )}
            </div>
          )}
          {!data && !error ? (
            <div className="loading">Đang tải dữ liệu…</div>
          ) : (
            <>
              {view === 'dashboard' && data && (
                <AdminOverview
                  data={data}
                  now={now}
                  canSeeMoney={allowed('finance')}
                  onGo={go}
                  onBook={bookRoom}
                  onSelect={setSelected}
                />
              )}
              {view === 'rooms' && data && (
                <ModernPosFlow
                  data={data}
                  now={now}
                  canSeeMoney={allowed('finance')}
                  onGo={go}
                  onMutate={mutate}
                  onRefresh={load}
                />
              )}
              {HUB_VIEWS.includes(view as (typeof HUB_VIEWS)[number]) && data && (
                <BookingsHub
                  view={view}
                  onView={go}
                  data={data}
                  canOnline={allowed('online')}
                  onSelect={setSelected}
                  onChanged={load}
                />
              )}
              {view === 'fnb' && <FnbPanel onChanged={load} />}
              {view === 'content' && allowed('content') && <ContentPanel />}
              {view === 'settings' && allowed('settings') && (
                <SystemSettingsHub
                  config={c}
                  busy={busy}
                  data={data}
                  activeSub={settingsSub}
                  onSelectSub={setSettingsSub}
                  onSave={(v) => mutate({ action: 'settings', value: v })}
                  onGo={go}
                  onChanged={load}
                />
              )}
              {view === 'reports' && allowed('reports') && <ReportsPanel />}
              {view === 'members' && allowed('members') && (
                <MembersPanel
                  permissions={data?.permissions ?? []}
                  initialCustomer={memberTarget?.id}
                  initialPhone={memberTarget?.phone}
                  onStartSession={(cust) => {
                    setBookingCustomer({ name: cust.name, phone: cust.phone });
                    setBookingRoom('line-1');
                    setModal(true);
                    go('rooms');
                  }}
                />
              )}
              {(view === 'crmx' || view === 'marketing') && allowed('crmx') && (
                <CrmModule
                  key={view}
                  permissions={data?.permissions ?? []}
                  initialTab={
                    view === 'marketing' ? 'marketing' : deepCustomer ? 'files' : 'overview'
                  }
                  onNavigate={handleCrmNavigate}
                />
              )}
            </>
          )}
        </div>
      </AdminReferenceShell>
      <div className="ds-root ar-dialog-root">
        {openingShift && (
          <FinanceDialog
            kind="open"
            busy={busy}
            notice=""
            onClose={() => setOpeningShift(false)}
            onSave={async (value) => {
              setBusy(true);
              try {
                const response = await fetch('/api/finance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(value),
                });
                const result = (await response.json()) as { error?: string };
                if (!response.ok) throw new Error(result.error || 'Chưa mở được ca');
                await load();
                setOpeningShift(false);
                setToast('Đã mở ca bán hàng');
                return true;
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Chưa mở được ca');
                return false;
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {modal && (
          <BookingForm
            initialRoom={bookingRoom}
            initialCustomer={bookingCustomer?.name}
            initialPhone={bookingCustomer?.phone}
            config={c}
            busy={busy}
            onClose={() => {
              setModal(false);
              setBookingCustomer(null);
            }}
            onSave={async (v) => {
              if (await mutate({ action: 'book', ...v })) {
                setModal(false);
                setBookingCustomer(null);
              }
            }}
          />
        )}
        {walkInRoom && (
          <WalkInDialog
            room={walkInRoom}
            busy={busy}
            onClose={() => setWalkInRoom(null)}
            onStart={async (v) => {
              if (await mutate({ action: 'walkin', ...v })) setWalkInRoom(null);
            }}
          />
        )}
        {chosen && (
          <SessionPanel
            key={chosen.id}
            permissions={data?.permissions ?? []}
            onRefresh={load}
            bank={{
              bin: c.bankBin ?? '',
              account: c.bankAccount ?? '',
              holder: c.bankHolder ?? '',
            }}
            canPay={!!data?.activeShift}
            onOpenShift={() => {
              setSelected(null);
              setOpeningShift(true);
            }}
            booking={chosen}
            now={now}
            busy={busy}
            onClose={() => setSelected(null)}
            onAction={async (action, extra = {}) => {
              await mutate({ action, id: chosen.id, ...extra });
            }}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
            <button onClick={() => setToast('')} aria-label="Đóng thông báo">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
