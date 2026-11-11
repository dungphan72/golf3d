'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { defaults, type Booking } from '../../lib/club';
import FinancePanel from './FinancePanel';
import FnbPanel from './FnbPanel';
import { BookingForm } from './Forms';
import { SettingsForm, type SettingsTab } from './Forms';
import { PageTabs } from './kit';
import { type Data } from './shared';
import { BookingsHub, HUB_VIEWS, InvoiceList, SupportList } from './BookingsHub';
import { HomeBoard } from './HomeBoard';
import { DashboardView } from './DashboardView';
import { BottomBar, AppHeader, NAV_LABEL, NAV_PARENT, Sidebar } from './AdminShell';
import { CustomerHome } from './CustomerHome';
import { SessionPanel } from './SessionPanel';
import { LoginScreen } from './LoginScreen';
import { AccountPanel } from './AccountPanel';
import { StaffPanel } from './StaffPanel';
import { AuditPanel } from './AuditPanel';
import { MembersPanel } from './MembersPanel';
import { SepaySettings } from './SepaySettings';
import { CoachingPanel } from './CoachingPanel';
import { ReportsPanel } from './ReportsPanel';
import { CrmModule } from '../../modules/crm/ui/CrmApp';

import { WalkInDialog } from './WalkInDialog';
import LandingCmsPanel from './LandingCmsPanel';
import { useBellSound } from './BellAlerts';
export default function ClubApp() {
  const [data, setData] = useState<Data | null>(null),
    // A link from a lead notification (/quan-ly?view=crm&customer=ID) opens the customer's file;
    // a scanned member card (/quan-ly?hv=HV-XXXXXXXX) opens the members screen on that card.
    [deepLink] = useState(() => {
      if (typeof location === 'undefined')
        return { view: 'dashboard', customer: null as string | null };
      const q = new URLSearchParams(location.search);
      const requestedView = q.get('view');
      const view = q.get('hv') ? 'members' : (requestedView || 'dashboard');
      return { view, customer: q.get('customer') };
    }),
    deepCustomer = deepLink.customer,
    [view, setView] = useState(deepLink.view),
    [mode, setMode] = useState('staff'),
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
    [leads] = useState<
      { overdue: number; waiting: number; queued: number } | undefined
    >(),
    [crm2, setCrm2] = useState<{ newUnhandled: number; overdueTasks: number } | undefined>(),
    [mobile, setMobile] = useState(false),
    [settingsTab, setSettingsTab] = useState<SettingsTab>('facility');
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
    b = data?.bookings ?? [],
    pending = data?.requests.filter((x) => x.status !== 'done') ?? [];
  const ringing = data ? data.requests.filter((x) => x.status === 'new').length : null;
  const onRing = useCallback(
    (n: number) => setToast(n > 1 ? `${n} khách đang gọi phục vụ` : 'Có khách gọi phục vụ'),
    [],
  );
  useBellSound(ringing, onRing);
  const needs: Record<string, string> = {
    finance: 'finance.view',
    reports: 'finance.view',
    landing: 'settings.manage',
    settings: 'settings.manage',
    staff: 'staff.manage',
    audit: 'staff.manage',
    members: 'member.view',
    crm: 'crm.view',
    crmx: 'crm.view',
    online: 'booking.create',
    coaching: 'coach.view',
  };
  const allowed = (key: string) =>
    !needs[key] || !data?.permissions || data.permissions.includes(needs[key]);
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setData(null);
    setAuthState('login');
  }
  function go(v: string) {
    setView(v);
    setMobile(false);
  }
  const openBooking = () => {
    setBookingRoom('line-1');
    setModal(true);
  };
  const chosen = selected ? (b.find((x) => x.id === selected.id) ?? selected) : null;
  if (authState === 'login') return <LoginScreen onDone={load} />;
  if (authState === 'change')
    return (
      <div className="auth-screen">
        <AccountPanel forced onChanged={load} onLogout={signOut} />
      </div>
    );
  const badges: Record<string, number> = {
    bookings: data?.onlinePending ?? 0,
    support: pending.length,
    invoices: b.filter((x) => x.status === 'finished').length,
  };
  const visibleNav = (key: string) => allowed(key);
  const bookRoom = (r: string) => {
    setBookingRoom(r);
    setModal(true);
  };
  const handleCrmNavigate = (
    targetView: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => {
    setMode('staff');
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
    <div className="app-shell ds-root">
      <Sidebar
        open={mobile}
        view={view}
        visible={visibleNav}
        badges={badges}
        user={data?.user ?? ''}
        role={data?.role ?? ''}
        onGo={(key) => {
          setMode('staff');
          go(key);
        }}
        onClose={() => setMobile(false)}
        onCustomerView={() => {
          setMode('customer');
          setMobile(false);
        }}
        onLogout={signOut}
      />
      <div className="ds-body">
        <a className="ds-skip" href="#noi-dung">
          Bỏ qua đến nội dung
        </a>
        <AppHeader
          title={
            mode === 'customer'
              ? 'Xem như khách hàng'
              : (NAV_LABEL[NAV_PARENT[view] ?? view] ?? NAV_LABEL.account)
          }
          view={view}
          visible={visibleNav}
          badges={badges}
          user={data?.user ?? ''}
          role={data?.role ?? ''}
          connection={error ? 'Mất kết nối' : data ? 'Trực tuyến' : 'Đang kết nối…'}
          online={!error && !!data}
          bookings={b}
          pending={pending.length}
          onGo={(key) => {
            setMode('staff');
            go(key);
          }}
          onMenu={() => setMobile(true)}
          onBook={openBooking}
          onRefresh={load}
          onSupport={() => {
            setMode('staff');
            go('support');
          }}
          onPick={setSelected}
          onCustomerView={() => setMode('customer')}
          onLogout={signOut}
        />
        <main className="ds-main" id="noi-dung" tabIndex={-1}>
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
              {mode === 'customer' ? (
                <>
                  <div className="ds-banner">
                    <span>Bạn đang xem giao diện của khách hàng.</span>
                    <button onClick={() => setMode('staff')}>Về trang quản lý</button>
                  </div>
                  <CustomerHome
                    onBook={openBooking}
                    onSession={() => {
                      setMode('staff');
                      go('rooms');
                    }}
                    config={c}
                  />
                </>
              ) : (
                <>
                  {view === 'dashboard' && data && (
                    <DashboardView
                      data={data}
                      now={now}
                      canSeeMoney={allowed('finance')}
                      leads={leads}
                      crm2={crm2}
                      onSelect={setSelected}
                      onBook={bookRoom}
                      onWalkIn={setWalkInRoom}
                      onGo={go}
                    />
                  )}
                  {view === 'rooms' && data && (
                    <HomeBoard
                      data={data}
                      now={now}
                      canSeeMoney={allowed('finance')}
                      leads={leads}
                      crm2={crm2}
                      onSelect={setSelected}
                      onBook={bookRoom}
                      onWalkIn={setWalkInRoom}
                      onGo={go}
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
                  {view === 'support' && data && (
                    <SupportList data={data} busy={busy} onMutate={mutate} />
                  )}
                  {view === 'invoices' && <InvoiceList bookings={b} onSelect={setSelected} />}
                  {view === 'fnb' && <FnbPanel onChanged={load} />}
                  {view === 'finance' && allowed('finance') && <FinancePanel onChanged={load} />}
                  {view === 'landing' && allowed('landing') && <LandingCmsPanel />}
                  {view === 'settings' && allowed('settings') && (
                    <>
                      <PageTabs
                        value={settingsTab}
                        onChange={(k) => setSettingsTab(k as SettingsTab)}
                        tabs={[
                          { key: 'facility', label: 'Cơ sở' },
                          { key: 'price', label: 'Giá' },
                          { key: 'promo', label: 'Khuyến mãi' },
                          { key: 'booking', label: 'Đặt lịch' },
                          { key: 'payment', label: 'Thanh toán' },
                        ]}
                      />
                      <SettingsForm
                        config={c}
                        busy={busy}
                        tab={settingsTab}
                        onSave={(v) => mutate({ action: 'settings', value: v })}
                      />
                      {settingsTab === 'payment' && <SepaySettings />}
                    </>
                  )}
                  {view === 'reports' && allowed('reports') && <ReportsPanel />}
                  {view === 'coaching' && allowed('coaching') && (
                    <CoachingPanel permissions={data?.permissions ?? []} />
                  )}
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
                  {(view === 'crmx' || view === 'crm') && allowed('crmx') && (
                    <CrmModule
                      key={view}
                      permissions={data?.permissions ?? []}
                      initialTab={deepCustomer ? 'files' : 'overview'}
                      onNavigate={handleCrmNavigate}
                    />
                  )}
                  {view === 'staff' && allowed('staff') && (
                    <StaffPanel actorRole={data?.role ?? ''} />
                  )}
                  {view === 'audit' && allowed('audit') && <AuditPanel />}
                  {view === 'account' && <AccountPanel onChanged={load} onLogout={signOut} />}
                </>
              )}
            </>
          )}
        </main>
        <BottomBar
          view={NAV_PARENT[view] ?? view}
          badges={badges}
          onGo={(key) => {
            setMode('staff');
            go(key);
          }}
          onMore={() => setMobile(true)}
        />
      </div>
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
          permissions={data?.permissions ?? []}
          onRefresh={load}
          bank={{ bin: c.bankBin ?? '', account: c.bankAccount ?? '', holder: c.bankHolder ?? '' }}
          canPay={!!data?.activeShift}
          onOpenShift={() => {
            setSelected(null);
            go('finance');
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
  );
}
