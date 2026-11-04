'use client';
import { useEffect, useState } from 'react';
import {
  Flag,
  LayoutDashboard,
  CalendarDays,
  Grid2X2,
  ReceiptText,
  Settings,
  ChevronDown,
  ArrowUpRight,
  Plus,
  Search,
  Bell,
  MapPin,
  ArrowRight,
  Check,
  Headphones,
  UtensilsCrossed,
  Wallet,
  Menu,
  X,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  Play,
  ChevronRight,
  Users,
  LogOut,
  Award,
  Globe,
  GraduationCap,
} from 'lucide-react';
import { rooms, defaults, money, type Booking } from '../../lib/club';
import FinancePanel from './FinancePanel';
import FnbPanel from './FnbPanel';
import StockPanel from './StockPanel';
import { BookingForm } from './Forms';
import { SettingsForm } from './Forms';
import Link from 'next/link';
import { time, date, type Data } from './shared';
import { Stat, RoomGrid, BookingTable, Empty, Roadmap } from './widgets';
import { CustomerHome } from './CustomerHome';
import { SessionPanel } from './SessionPanel';
import { LoginScreen } from './LoginScreen';
import { AccountPanel } from './AccountPanel';
import { StaffPanel } from './StaffPanel';
import { MembersPanel } from './MembersPanel';
import { OnlineRequests } from './OnlineRequests';
import { CoachingPanel } from './CoachingPanel';
export default function ClubApp() {
  const [data, setData] = useState<Data | null>(null),
    [view, setView] = useState('overview'),
    [mode, setMode] = useState('staff'),
    [modal, setModal] = useState(false),
    [bookingRoom, setBookingRoom] = useState('line-1'),
    [selected, setSelected] = useState<Booking | null>(null),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState('all'),
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
    active = b.filter((x) => ['playing', 'paused'].includes(x.status)),
    pending = data?.requests.filter((x) => x.status !== 'done') ?? [];
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10),
    todayBookings = b.filter(
      (x) => new Date(x.start + 7 * 3600000).toISOString().slice(0, 10) === today,
    );
  const revenue = data?.todayReceipts ?? 0;
  const navigation = [
    ['overview', 'Tổng quan', LayoutDashboard],
    ['rooms', 'Sơ đồ phòng', Grid2X2],
    ['bookings', 'Lịch đặt', CalendarDays],
    ['invoices', 'Hóa đơn', ReceiptText],
    ['finance', 'Ca & sổ tiền', Wallet],
    ['fnb', 'Thực đơn & bếp', UtensilsCrossed],
    ['stock', 'Kho F&B', Grid2X2],
    ['online', 'Đặt online', Globe],
    ['coaching', 'Huấn luyện', GraduationCap],
    ['members', 'Hội viên', Award],
    ['support', 'Yêu cầu hỗ trợ', Headphones],
    ['roadmap', 'Lộ trình hệ thống', BookOpen],
    ['settings', 'Cài đặt cơ sở', Settings],
    ['staff', 'Nhân viên', Users],
    ['account', 'Tài khoản', ShieldCheck],
  ] as const;
  const needs: Record<string, string> = {
    finance: 'finance.view',
    settings: 'settings.manage',
    staff: 'staff.manage',
    members: 'member.view',
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
  const titles: Record<string, string> = {
    overview: 'Một ngày chơi tốt lành.',
    rooms: 'Không gian & phiên chơi',
    bookings: 'Lịch đặt sân',
    invoices: 'Hóa đơn & thanh toán',
    finance: 'Đối soát rõ ràng, bàn giao an tâm.',
    fnb: 'Món ngon, phục vụ đúng lúc.',
    stock: 'Kho rõ ràng, phục vụ an tâm.',
    online: 'Yêu cầu đặt lịch từ khách',
    coaching: 'Lịch dạy của huấn luyện viên',
    members: 'Hội viên, gói và điểm thưởng',
    support: 'Trung tâm hỗ trợ',
    roadmap: 'Lộ trình phát triển',
    settings: 'Thiết lập cơ sở',
    staff: 'Nhân viên & phân quyền',
    account: 'Tài khoản của bạn',
  };
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
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobile ? 'mobile-open' : '')}>
        <Link className="brand" href="/" aria-label="Golf3D trang chủ">
          <span className="brand-mark">
            <Flag size={23} />
          </span>
          <span>
            GOLF<span className="gold">3D</span>
            <small>CLUB MANAGEMENT</small>
          </span>
        </Link>
        <button className="location-switch" onClick={() => go('settings')}>
          <span className="location-icon">
            <MapPin size={17} />
          </span>
          <span>
            Bình Trưng<small>Cơ sở đầu tiên</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav>
          {navigation
            .filter(([key]) => allowed(key))
            .map(([key, label, Icon]) => (
              <button
                key={key}
                className={view === key ? 'nav-item selected' : 'nav-item'}
                onClick={() => go(key)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {key === 'support' && pending.length > 0 && (
                  <b className="count">{pending.length}</b>
                )}
                {key === 'online' && (data?.onlinePending ?? 0) > 0 && (
                  <b className="count">{data?.onlinePending}</b>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="club-note">
            <Flag size={21} />
            <p>
              Chơi tốt hơn.
              <br />
              Vận hành thông minh hơn.
            </p>
            <span>GOLF3D WORKSPACE · V0.5.4</span>
          </div>
          <button
            className="nav-item"
            onClick={() => {
              setMode(mode === 'staff' ? 'customer' : 'staff');
              go('overview');
            }}
          >
            <ArrowUpRight size={18} />
            {mode === 'staff' ? 'Trải nghiệm khách hàng' : 'Về trang quản lý'}
          </button>
          <div className="profile">
            <span className="avatar">D</span>
            <div>
              <strong>{data?.user?.split('@')[0] || 'Chủ cơ sở'}</strong>
              <small>Không gian riêng tư</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Mở menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>Golf3D</span>
            <ChevronRight size={14} />
            <strong>
              {mode === 'customer'
                ? 'Trải nghiệm khách hàng'
                : navigation.find((x) => x[0] === view)?.[1]}
            </strong>
          </div>
          <div className="top-actions">
            <span className="connection">
              <i />
              {error ? 'Cần kiểm tra kết nối' : data ? 'Đồng bộ trực tuyến' : 'Đang kết nối…'}
            </span>
            <button className="icon-btn" aria-label="Tải lại" onClick={load}>
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-btn notification"
              aria-label="Yêu cầu hỗ trợ"
              onClick={() => go('support')}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <span className="avatar small">D</span>
          </div>
        </header>
        <div className="pilot">
          <span>
            <ShieldCheck size={14} /> BẢN THỬ NỘI BỘ
          </span>
          <p>Dữ liệu được lưu trên máy chủ. Chưa mở nhận khách công khai.</p>
          <button onClick={() => go('roadmap')}>
            Xem tiến độ <ArrowUpRight size={13} />
          </button>
        </div>
        <main>
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
            <div className="loading">Đang tải không gian Golf3D…</div>
          ) : (
            <>
              {mode === 'customer' ? (
                <>
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
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        {view === 'overview' ? 'GOLF3D / CLUB OPERATIONS' : 'GOLF3D / WORKSPACE'}
                      </div>
                      <h1>{titles[view]}</h1>
                      <p>
                        {view === 'overview'
                          ? 'Mọi hoạt động tại cơ sở, trong một tầm nhìn.'
                          : view === 'settings'
                            ? 'Thiết lập chính sách trước khi mở cửa đón khách.'
                            : 'Quản lý liền mạch, phục vụ trọn vẹn.'}
                      </p>
                    </div>
                    <div className="heading-actions">
                      <span className="date-display">
                        <CalendarDays size={16} />
                        {new Date(now).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                      <button className="primary" onClick={openBooking}>
                        <Plus size={18} />
                        Tạo lịch đặt
                      </button>
                    </div>
                  </div>
                  {view === 'overview' && (
                    <>
                      <div className="stats">
                        <Stat
                          title="Thực thu hôm nay"
                          value={money(revenue)}
                          sub="Theo thời điểm thu · sổ tiền v0.3"
                          icon={<Wallet size={20} />}
                        />
                        <Stat
                          title="Phòng đang sử dụng"
                          value={`${active.length}`}
                          suffix="/ 12"
                          sub={`${12 - active.length} phòng / line chưa chạy phiên`}
                          icon={<Grid2X2 size={20} />}
                        />
                        <Stat
                          title="Lịch đặt hôm nay"
                          value={`${todayBookings.filter((x) => x.status !== 'cancelled').length}`}
                          sub="Tổng lượt đã ghi nhận"
                          icon={<CalendarDays size={20} />}
                        />
                        <Stat
                          title="Yêu cầu đang chờ"
                          value={`${pending.length}`}
                          sub="Hỗ trợ khách tại cơ sở"
                          icon={<Headphones size={20} />}
                        />
                      </div>
                      <div className="overview-grid">
                        <div>
                          <div className="section-heading">
                            <h2>
                              Sơ đồ phòng & line tập <span>12</span>
                            </h2>
                            <button onClick={() => go('rooms')}>
                              Xem tất cả <ArrowRight size={15} />
                            </button>
                          </div>
                          <div className="legend">
                            <span>
                              <i className="free" />
                              Trống
                            </span>
                            <span>
                              <i className="inplay" />
                              Đang chơi
                            </span>
                            <span>
                              <i className="reserved" />
                              Đã đặt
                            </span>
                            <span>
                              <i className="cleaning" />
                              Đang dọn
                            </span>
                          </div>
                          <RoomGrid
                            bookings={b}
                            filter="all"
                            now={now}
                            onSelect={(x) => setSelected(x)}
                            onBook={(r) => {
                              setBookingRoom(r);
                              setModal(true);
                            }}
                          />
                        </div>
                        <aside className="right-column">
                          <div className="daily-card">
                            <span className="eyebrow">YOUR NEXT GREAT SHOT</span>
                            <h2>
                              Mỗi cú swing.
                              <br />
                              Một trải nghiệm.
                            </h2>
                            <div className="golf-art">
                              <div className="orbit o1" />
                              <div className="orbit o2" />
                              <div className="green" />
                              <span className="pole" />
                              <span className="flag" />
                              <span className="ball" />
                            </div>
                            <span className="art-caption">GOLF3D · BÌNH TRƯNG</span>
                          </div>
                          <div className="quick-card">
                            <h3>Sẵn sàng đón khách?</h3>
                            <p>Hoàn tất giờ hoạt động, sức chứa và thuế/phí để bắt đầu đặt thử.</p>
                            <button onClick={() => go('settings')}>
                              Thiết lập cơ sở <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </aside>
                      </div>
                      <div className="section-heading">
                        <h2>Lịch sắp tới</h2>
                        <button onClick={() => go('bookings')}>
                          Quản lý lịch đặt <ArrowRight size={15} />
                        </button>
                      </div>
                      <BookingTable
                        bookings={b
                          .filter((x) => x.status === 'booked')
                          .sort((a, b) => a.start - b.start)
                          .slice(0, 5)}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                  {view === 'rooms' && (
                    <>
                      <div className="toolbar">
                        <div className="tabs">
                          {[
                            ['all', 'Tất cả · 12'],
                            ['standard', 'Line thường · 10'],
                            ['vip', 'Phòng VIP · 2'],
                          ].map(([v, t]) => (
                            <button
                              key={v}
                              className={filter === v ? 'active' : ''}
                              onClick={() => setFilter(v)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <span className="muted">Cập nhật mỗi 15 giây</span>
                      </div>
                      <RoomGrid
                        bookings={b}
                        filter={filter}
                        now={now}
                        onSelect={setSelected}
                        onBook={(r) => {
                          setBookingRoom(r);
                          setModal(true);
                        }}
                      />
                    </>
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
                    <SettingsForm
                      config={c}
                      busy={busy}
                      onSave={(v) => mutate({ action: 'settings', value: v })}
                    />
                  )}
                  {view === 'roadmap' && <Roadmap audit={data?.audit ?? []} />}
                  {view === 'online' && allowed('online') && <OnlineRequests onChanged={load} />}
                  {view === 'coaching' && allowed('coaching') && (
                    <CoachingPanel permissions={data?.permissions ?? []} />
                  )}
                  {view === 'members' && allowed('members') && (
                    <MembersPanel permissions={data?.permissions ?? []} />
                  )}
                  {view === 'staff' && allowed('staff') && (
                    <StaffPanel actorRole={data?.role ?? ''} />
                  )}
                  {view === 'account' && <AccountPanel onChanged={load} onLogout={signOut} />}
                </>
              )}
            </>
          )}
          <footer>
            <span>
              GOLF3D <i /> Play. Connect. Repeat.
            </span>
            <span>250 Lương Đình Của · Bình Trưng, TP.HCM</span>
          </footer>
        </main>
        <nav className="bottom-nav">
          {[
            ['overview', 'Trang chủ', LayoutDashboard],
            ['bookings', 'Lịch đặt', CalendarDays],
            ['rooms', 'Đang chơi', Flag],
            ['support', 'Hỗ trợ', Headphones],
            ['finance', 'Ca & quỹ', Wallet],
          ].map(([v, t, I]) => {
            const Icon = I as typeof Flag;
            return (
              <button
                key={String(v)}
                className={view === v ? 'active' : ''}
                onClick={() => {
                  setMode('staff');
                  go(String(v));
                }}
              >
                <Icon size={21} />
                <span>{String(t)}</span>
              </button>
            );
          })}
        </nav>
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
      {chosen && (
        <SessionPanel
          onRefresh={load}
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
