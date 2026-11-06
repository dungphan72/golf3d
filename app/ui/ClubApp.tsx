'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, Search, X } from 'lucide-react';
import { rooms, defaults, type Booking } from '../../lib/club';
import FinancePanel from './FinancePanel';
import FnbPanel from './FnbPanel';
import StockPanel from './StockPanel';
import { BookingForm } from './Forms';
import { SettingsForm } from './Forms';
import { time, type Data } from './shared';
import { BookingTable, Empty } from './widgets';
import { HomeBoard } from './HomeBoard';
import { BottomBar, NAV_LABEL, Sidebar, TopBar } from './AdminShell';
import { CustomerHome } from './CustomerHome';
import { SessionPanel } from './SessionPanel';
import { LoginScreen } from './LoginScreen';
import { AccountPanel } from './AccountPanel';
import { StaffPanel } from './StaffPanel';
import { AuditPanel } from './AuditPanel';
import { MembersPanel } from './MembersPanel';
import { SepaySettings } from './SepaySettings';
import { OnlineRequests } from './OnlineRequests';
import { CoachingPanel } from './CoachingPanel';
import { ReportsPanel } from './ReportsPanel';
import { CrmPanel } from './CrmPanel';
import { WalkInDialog } from './WalkInDialog';
export default function ClubApp() {
  const [data, setData] = useState<Data | null>(null),
    // A link from a lead notification (/quan-ly?view=crm&customer=ID) opens the customer's file.
    [deepLink] = useState(() => {
      if (typeof location === 'undefined')
        return { view: 'rooms', customer: null as string | null };
      const q = new URLSearchParams(location.search);
      return { view: q.get('view') === 'crm' ? 'crm' : 'rooms', customer: q.get('customer') };
    }),
    deepCustomer = deepLink.customer,
    [view, setView] = useState(deepLink.view),
    [mode, setMode] = useState('staff'),
    [modal, setModal] = useState(false),
    [bookingRoom, setBookingRoom] = useState('line-1'),
    [walkInRoom, setWalkInRoom] = useState<string | null>(null),
    [selected, setSelected] = useState<Booking | null>(null),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [now, setNow] = useState(() => Date.now()),
    [mobile, setMobile] = useState(false);
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
  const needs: Record<string, string> = {
    finance: 'finance.view',
    reports: 'finance.view',
    settings: 'settings.manage',
    staff: 'staff.manage',
    audit: 'staff.manage',
    members: 'member.view',
    crm: 'crm.view',
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
    support: pending.length,
    online: data?.onlinePending ?? 0,
    invoices: b.filter((x) => x.status === 'finished').length,
  };
  const visibleNav = (key: string) => allowed(key);
  const bookRoom = (r: string) => {
    setBookingRoom(r);
    setModal(true);
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
      />
      <div className="ds-body">
        <TopBar
          title={mode === 'customer' ? 'Xem như khách hàng' : (NAV_LABEL[view] ?? 'Sơ đồ phòng')}
          connection={error ? 'Mất kết nối' : data ? 'Trực tuyến' : 'Đang kết nối…'}
          online={!error && !!data}
          bookings={b}
          pending={pending.length}
          onMenu={() => setMobile(true)}
          onBook={openBooking}
          onRefresh={load}
          onSupport={() => {
            setMode('staff');
            go('support');
          }}
          onPick={setSelected}
        />
        <main className="ds-main">
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
                  {view === 'rooms' && data && (
                    <HomeBoard
                      data={data}
                      now={now}
                      canSeeMoney={allowed('finance')}
                      onSelect={setSelected}
                      onBook={bookRoom}
                      onWalkIn={setWalkInRoom}
                      onGo={go}
                    />
                  )}
                  {view === 'bookings' && (
                    <>
                      <div className="toolbar">
                        <div className="search">
                          <Search size={17} />
                          <input
                            aria-label="Tìm lịch đặt"
                            placeholder="Tìm tên, điện thoại…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                        <span className="muted">{b.length} lượt đặt</span>
                      </div>
                      <BookingTable
                        bookings={b.filter((x) =>
                          (x.customer + ' ' + x.phone).toLowerCase().includes(search.toLowerCase()),
                        )}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                  {view === 'invoices' && (
                    <>
                      <div className="info-strip">
                        Phiếu thanh toán nội bộ · Kết nối hóa đơn điện tử chưa được cấu hình.
                      </div>
                      <BookingTable
                        bookings={b.filter((x) => ['finished', 'paid'].includes(x.status))}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                  {view === 'support' && (
                    <div className="support-list">
                      {data?.requests.length ? (
                        data.requests.map((r) => {
                          const booking = b.find((x) => x.id === r.booking);
                          return (
                            <article className="support-card" key={r.id}>
                              <span className="support-icon">
                                <Bell size={23} />
                              </span>
                              <div>
                                <h3>{r.kind}</h3>
                                <p>
                                  {rooms.find((x) => x.id === booking?.room)?.name} ·{' '}
                                  {booking?.customer} · {time(r.created)}
                                </p>
                                <span className={'badge ' + r.status}>
                                  {r.status === 'new'
                                    ? 'Chờ tiếp nhận'
                                    : r.status === 'received'
                                      ? 'Đang xử lý'
                                      : 'Hoàn thành'}
                                </span>
                              </div>
                              {r.status !== 'done' && (
                                <button
                                  className="primary"
                                  disabled={busy}
                                  onClick={() =>
                                    mutate({
                                      action: 'request-update',
                                      id: r.id,
                                      status: r.status === 'new' ? 'received' : 'done',
                                    })
                                  }
                                >
                                  {r.status === 'new' ? 'Tiếp nhận' : 'Hoàn thành'}
                                </button>
                              )}
                            </article>
                          );
                        })
                      ) : (
                        <Empty
                          title="Mọi yêu cầu đã được chăm sóc"
                          text="Yêu cầu hỗ trợ từ phiên chơi sẽ xuất hiện tại đây."
                        />
                      )}
                    </div>
                  )}
                  {view === 'stock' && <StockPanel />}
                  {view === 'fnb' && <FnbPanel onChanged={load} />}
                  {view === 'finance' && allowed('finance') && <FinancePanel onChanged={load} />}
                  {view === 'settings' && allowed('settings') && (
                    <>
                      <SettingsForm
                        config={c}
                        busy={busy}
                        onSave={(v) => mutate({ action: 'settings', value: v })}
                      />
                      <SepaySettings />
                    </>
                  )}
                  {view === 'online' && allowed('online') && <OnlineRequests onChanged={load} />}
                  {view === 'reports' && allowed('reports') && <ReportsPanel />}
                  {view === 'coaching' && allowed('coaching') && (
                    <CoachingPanel permissions={data?.permissions ?? []} />
                  )}
                  {view === 'members' && allowed('members') && (
                    <MembersPanel permissions={data?.permissions ?? []} />
                  )}
                  {view === 'crm' && allowed('crm') && (
                    <CrmPanel
                      permissions={data?.permissions ?? []}
                      initialCustomer={deepCustomer}
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
          view={view}
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
          config={c}
          busy={busy}
          onClose={() => setModal(false)}
          onSave={async (v) => {
            if (await mutate({ action: 'book', ...v })) setModal(false);
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
