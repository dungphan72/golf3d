'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import {
  cardState,
  isPeriodCard,
  maxAbsences,
  MIN_ABSENCE_DAYS,
  clubDay,
} from '../../lib/card-term';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../lib/member';
import { PACKAGE_ROOM_LABELS, type PackageRoom } from '../../lib/package-use';
import { type Rank, TIER_LABEL } from '../../lib/member-card';
import { MemberCard } from './MemberCard';
import { MemberShell, type MemberTab, type Reminder } from './MemberShell';
import { MemberHome } from './MemberHome';
import MemberAuth from './MemberAuth';
import {
  Phone,
  Lock,
  User,
  Sparkles,
  Calendar,
  Clock,
  Crown,
  CreditCard,
  LogOut,
  CheckCircle2,
  AlertCircle,
  History,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  PlusCircle,
  LayoutDashboard,
  Receipt,
  MessageCircle,
  PhoneCall,
  Flame,
  ArrowRight,
} from 'lucide-react';

type Balance = { kind: GrantKind; remaining: number };
type Pack = {
  id: string;
  name: string;
  source: string;
  perks: string;
  room: string;
  purchased: number;
  expires: number;
  balances: Balance[];
  valid_days?: number;
  activated_at?: number | null;
  activate_by?: number | null;
  grants?: string;
};
type PortalAbsence = {
  id: string;
  package_id: string;
  start_day: string;
  end_day: string;
  days: number;
  status: string;
};
export type Overview = {
  profile: { name: string; phone: string; email: string; verified: boolean };
  club?: { name: string; address: string };
  code?: string;
  rank?: Rank;
  activity?: {
    at: number;
    kind: 'wallet' | 'package' | 'points';
    title: string;
    money?: number;
    paid?: number;
    points?: number;
  }[];
  benefits?: string[];
  promotions?: {
    id: string;
    name: string;
    description: string;
    benefit: string;
    condition: string;
    auto: boolean;
  }[];
  since?: number | null;
  points?: number;
  wallet?: number;
  packages?: Pack[];
  absences?: PortalAbsence[];
  usage?: {
    created: number;
    kind: GrantKind;
    units: number;
    package: string;
    start: number | null;
    room: string;
    service: string | null;
  }[];
  bookings?: {
    id: string;
    room: string;
    service: string;
    people: number;
    start: number;
    end: number;
    status: string;
  }[];
  requests?: {
    id: string;
    service: string;
    vip: number;
    people: number;
    guests: number;
    start: number;
    status: string;
  }[];
  catalog?: {
    id: string;
    name: string;
    price: number;
    room: string;
    section: string;
    valid_days?: number;
  }[];
  orders?: { id: string; name: string; price: number; created: number }[];
  booking?: { enabled: boolean; vip: boolean; services: string[]; days: number };
};

const SERVICE: Record<string, string> = {
  gdr: 'Luyện tập Driving Range (GDR)',
  '9': 'Game 9 Hố 3D Thực Tế',
  '18': 'Game 18 Hố 3D Thực Tế',
};

const BOOKING_STATUS: Record<string, string> = {
  booked: 'Đã giữ line',
  playing: 'Đang chơi',
  paused: 'Tạm nghỉ',
  finished: 'Hoàn tất',
  paid: 'Đã thanh toán',
};

const REQUEST_STATUS: Record<string, string> = {
  pending: 'Chờ lễ tân xác nhận',
  confirmed: 'Đã xác nhận',
};

const toMs = (local: string) => Date.parse(local + ':00+07:00');
const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const left = (b: Balance) =>
  b.remaining >= UNLIMITED
    ? 'Không giới hạn'
    : `${b.remaining} ${KIND_LABELS[b.kind]?.toLowerCase() ?? 'giờ'}`;

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const v = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(v.error ?? 'Thao tác chưa thành công. Vui lòng thử lại.');
  return v;
}

/** 2. Fast Booking Form inside Member Portal */
function BookForm({
  info,
  onDone,
}: {
  info: NonNullable<Overview['booking']>;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    service: (info.services[0] ?? 'gdr') as 'gdr' | '9' | '18',
    vip: false,
    guests: 1,
    start: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Default to tomorrow 14:00 if not chosen
  useEffect(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(14, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T14:00`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
    setForm((prev) => ({ ...prev, start: local }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSent(false);
    const startMs = toMs(form.start);
    if (!startMs || Number.isNaN(startMs) || startMs <= Date.now()) {
      setError('Vui lòng chọn thời gian chơi hợp lệ trong tương lai.');
      return;
    }
    setBusy(true);
    try {
      await call({
        action: 'book',
        service: form.service,
        vip: form.vip,
        guests: Number(form.guests) || 1,
        start: startMs,
        note: form.note,
      });
      setSent(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mp-book-pro" onSubmit={submit}>
      <div className="mp-book-head">
        <div className="mp-book-title">
          <Calendar size={18} className="text-gold" />
          <span>Đặt Lịch Giữ Line / Phòng 3D Nhanh</span>
        </div>
        <span className="mp-book-badge">Hội viên ưu tiên</span>
      </div>

      <div className="mp-book-grid">
        <label className="mp-field-label">
          <span>Hình thức trải nghiệm</span>
          <select
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value as 'gdr' | '9' | '18' })}
          >
            {info.services.map((s) => (
              <option key={s} value={s}>
                {SERVICE[s] || s}
              </option>
            ))}
          </select>
        </label>

        <label className="mp-field-label">
          <span>Ngày & Giờ chơi dự kiến</span>
          <input
            type="datetime-local"
            step={900}
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            required
          />
        </label>

        <label className="mp-field-label">
          <span>Số người chơi (Flight)</span>
          <div className="mp-guest-picker">
            {[1, 2, 4].map((g) => (
              <button
                key={g}
                type="button"
                className={`mp-tag-btn ${form.guests === g ? 'active' : ''}`}
                onClick={() => setForm({ ...form, guests: g })}
              >
                {g} người
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={20}
              placeholder="Khác"
              className="mp-guest-input"
              value={form.guests}
              onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })}
            />
          </div>
        </label>

        <label className="mp-field-label">
          <span>Ghi chú thêm</span>
          <input
            value={form.note}
            maxLength={250}
            placeholder="Ví dụ: Cần mượn gậy tay trái, chuẩn bị trà ấm..."
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
      </div>

      {info.vip && (
        <label className="mp-check">
          <input
            type="checkbox"
            checked={form.vip}
            onChange={(e) => setForm({ ...form, vip: e.target.checked })}
          />
          <Crown size={15} className="text-gold" />
          <span>Ưu tiên xếp Phòng VIP riêng tư (dành riêng cho tiếp khách & thi đấu kín)</span>
        </label>
      )}

      {error && (
        <div className="mp-error" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {sent && (
        <div className="mp-success" role="status">
          <CheckCircle2 size={16} />
          <span>
            Đã gửi yêu cầu giữ line thành công! Lễ tân CLB sẽ gọi điện xác nhận trong 5 phút.
          </span>
        </div>
      )}

      <div className="mp-book-actions">
        <button className="mp-btn-action primary" disabled={busy}>
          {busy ? 'Đang gửi…' : 'Xác Nhận Đặt Lịch Chơi'}
        </button>
      </div>
    </form>
  );
}

/** 3. Profile & Password Settings */
function Settings({ data, onSaved }: { data: Overview; onSaved: () => void }) {
  const [name, setName] = useState(data.profile.name);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function run(task: () => Promise<unknown>, done: string) {
    setError('');
    setMsg('');
    try {
      await task();
      setMsg(done);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mp-card" id="cai-dat">
      <h2>
        <ShieldCheck size={20} />
        <span>Cài Đặt Tài Khoản & Bảo Mật</span>
      </h2>
      <p className="mp-card-desc">
        Quản lý thông tin hồ sơ Golfer và mật khẩu đăng nhập cổng hội viên.
      </p>

      {msg && (
        <div className="mp-success">
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="mp-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="mp-settings-grid">
        {/* Profile Info */}
        <form
          className="mp-settings-col"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => call({ action: 'profile', name, email: '' }),
              'Đã cập nhật họ và tên thành công',
            );
          }}
        >
          <h3>
            <User size={16} className="text-gold" />
            <span>Thông Tin Hội Viên</span>
          </h3>
          <label>
            <span>Họ và tên hiển thị</span>
            <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </label>
          <label>
            <span>Số điện thoại (Mã định danh duy nhất)</span>
            <input
              value={data.profile.phone}
              disabled
              title="Số điện thoại tài khoản không thể tự đổi trên web"
            />
          </label>
          <button className="mp-btn-save" type="submit">
            Lưu Thay Đổi
          </button>
        </form>

        {/* Change Password */}
        <form
          className="mp-settings-col"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await call({ action: 'password', current, next });
              setCurrent('');
              setNext('');
            }, 'Đã cập nhật mật khẩu mới thành công');
          }}
        >
          <h3>
            <Lock size={16} className="text-gold" />
            <span>Đổi Mật Khẩu</span>
          </h3>
          <label>
            <span>Mật khẩu hiện tại</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Nhập mật khẩu đang dùng"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Mật khẩu mới</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </label>
          <button className="mp-btn-save" type="submit">
            Cập Nhật Mật Khẩu
          </button>
        </form>
      </div>

      <div className="mp-support-box">
        <div className="mp-support-info">
          <strong>Cần hỗ trợ về tài khoản hoặc gói thẻ?</strong>
          <span>Đội ngũ quản lý hội viên luôn sẵn sàng giải đáp 24/7</span>
        </div>
        <div className="mp-support-btns">
          <a href={`tel:${BRAND.hotline}`} className="mp-btn-action primary">
            <PhoneCall size={14} />
            <span>Gọi Hotline {BRAND.hotline}</span>
          </a>
          <a
            href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mp-btn-action ghost"
          >
            <MessageCircle size={14} />
            <span>Nhắn Zalo CLB</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/** 4. Main Executive Member Portal Dashboard */
export default function MemberPortal({
  registerFirst = false,
  publicOverview,
}: {
  registerFirst?: boolean;
  publicOverview?: Overview;
}) {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const [activeTab, setActiveTab] = useState<MemberTab>('overview');
  const [now, setNow] = useState(() => Date.now());
  const [copiedCode, setCopiedCode] = useState(false);
  const [bookingExpanded, setBookingExpanded] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const mounted = useRef(true);

  const load = useCallback(async () => {
    const r = await fetch('/api/member', { cache: 'no-store' });
    if (!mounted.current) return;
    if (!r.ok) return;
    const v = (await r.json()) as Overview & { signedOut?: boolean };
    if (!mounted.current) return;
    if (v.signedOut) {
      setState('out');
      setData(null);
      return;
    }
    setData(v);
    setState('in');
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  if (state === 'loading') {
    return (
      <div className="mp-wrap" style={{ textAlign: 'center', padding: '10rem 1rem' }}>
        <Sparkles size={36} className="mp-spinner text-gold" style={{ margin: '0 auto 1.2rem' }} />
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
          Đang tải bảng điều khiển hội viên…
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Đồng bộ dữ liệu thẻ, gói cước và lịch chơi
        </p>
      </div>
    );
  }

  if (state === 'out' || !data) {
    if (publicOverview) {
      const navigate = (tab: MemberTab) => {
        if (tab === 'overview' || tab === 'packages') setActiveTab(tab);
        else if (tab === 'booking') router.push('/#dat-cho');
        else router.push('/tai-khoan');
      };
      return (
        <MemberShell
          tab={activeTab}
          onTab={navigate}
          name="Khách"
          signedOut
          tier="guest"
          reminders={[]}
          onBook={() => navigate('booking')}
          onLogout={() => router.push('/tai-khoan')}
        >
          <div className={activeTab === 'packages' ? 'mr-guest-packages' : ''}>
            <MemberHome data={publicOverview} now={now} tier="guest" onTab={navigate} />
          </div>
        </MemberShell>
      );
    }
    return <MemberAuth onDone={load} first={registerFirst ? 'register' : 'login'} />;
  }

  const act = async (task: () => Promise<unknown>, done: string) => {
    try {
      await task();
      window.alert(done);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Không thực hiện được');
    }
  };
  const packs = data.packages ?? [];
  const live = packs.filter((p) => p.expires >= now);
  const total = (kind: GrantKind) =>
    live.reduce((n, p) => n + (p.balances.find((b) => b.kind === kind)?.remaining ?? 0), 0);
  const hours = total('gdr');
  const holes9Count = total('holes9');
  const holes18Count = total('holes18');
  const upcoming = (data.bookings ?? []).filter((b) => b.start >= now);
  const past = (data.bookings ?? []).filter((b) => b.start < now);
  const nextSession = upcoming[0] || (data.requests ?? [])[0];

  const logout = async () => {
    await call({ action: 'logout' });
    load();
  };

  const initialLetter = data.profile.name.charAt(data.profile.name.lastIndexOf(' ') + 1) || 'G';
  const tier = data.rank?.tier ?? (packs.some((p) => p.expires >= now) ? 'member' : 'guest');

  // Until staff confirm the phone number belongs to this person, show no card, code, packages or history.
  if (!data.profile.verified) {
    return (
      <div className="mp-wrap">
        <header className="mp-pro-head">
          <div className="mp-golfer-badge">
            <div className="mp-golfer-avatar">
              <span>{initialLetter}</span>
            </div>
            <div className="mp-golfer-details">
              <h1>
                <span>Xin chào, {data.profile.name}</span>
              </h1>
              <div className="mp-phone-chip">
                <Phone size={13} />
                <span>{data.profile.phone}</span>
              </div>
            </div>
          </div>
          <div className="mp-head-actions">
            <button type="button" className="mp-btn-action ghost" onClick={logout}>
              <LogOut size={15} />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </header>
        <section className="mp-card" role="status" style={{ padding: '1.25rem' }}>
          <h2>Đang chờ câu lạc bộ xác nhận</h2>
          <p>
            Tài khoản đã tạo. Để bảo vệ thẻ và giờ chơi của bạn, nhân viên cần xác nhận số điện
            thoại <strong>{data.profile.phone}</strong> thuộc về bạn. Hãy ghé câu lạc bộ hoặc gọi{' '}
            <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>; ngay khi được xác nhận, thẻ, giờ
            chơi và lịch sử sẽ hiện tại đây.
          </p>
        </section>
      </div>
    );
  }

  // Reminders in the bell: bookings in the next day, cards about to expire, orders waiting for the club.
  const reminders: Reminder[] = [
    ...(data.bookings ?? [])
      .filter((b) => b.status === 'booked' && b.start > now && b.start < now + 24 * 3_600_000)
      .map((b) => ({
        id: 'b' + b.id,
        text: `Bạn có lịch chơi lúc ${new Date(b.start).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} hôm nay hoặc ngày mai`,
        tab: 'booking' as const,
      })),
    ...live
      .filter((p) => p.expires < now + 14 * 86_400_000)
      .map((p) => ({ id: 'e' + p.id, text: `${p.name} sắp hết hạn`, tab: 'packages' as const })),
    ...(data.orders ?? []).map((o) => ({
      id: 'o' + o.id,
      text: `Đơn ${o.name} đang chờ câu lạc bộ xác nhận`,
      tab: 'packages' as const,
    })),
  ];

  return (
    <MemberShell
      tab={activeTab}
      onTab={setActiveTab}
      name={data.profile.name}
      tier={tier}
      reminders={reminders}
      onLogout={logout}
      onBook={() => {
        setActiveTab('booking');
        setBookingExpanded(true);
      }}
    >
      {activeTab === 'overview' && (
        <MemberHome data={data} now={now} tier={tier} onTab={setActiveTab} />
      )}
      {activeTab === 'community' && (
        <section className="mp-card">
          <h2>Tìm bạn chơi</h2>
          <p>
            Liên hệ câu lạc bộ để kết nối với golfer cùng lịch tập và tham gia các buổi giao lưu.
          </p>
          <a href={BRAND.zalo} target="_blank" rel="noopener noreferrer">
            Kết nối qua Zalo
          </a>
        </section>
      )}

      {activeTab === 'offers' && (
        <div className="mp-tab-view">
          <section className="mp-card">
            <h2>Ưu đãi của tôi</h2>
            {data.promotions?.length ? (
              <ul className="mps-offers">
                {data.promotions.map((o) => (
                  <li key={o.id}>
                    <h3>{o.name}</h3>
                    <strong>{o.benefit}</strong>
                    <p>{o.condition}</p>
                    {o.description && <p>{o.description}</p>}
                    <small>
                      {o.auto
                        ? 'Tự động áp dụng khi tính tiền'
                        : 'Áp dụng tại quầy, nhân viên xác nhận'}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Hiện chưa có chương trình ưu đãi. Mời bạn quay lại sau.</p>
            )}
          </section>
        </div>
      )}

      {/* TAB CONTENT: BOOKING */}
      {activeTab === 'booking' && (
        <div className="mp-tab-view">
          <section className="mp-card">
            <div className="mp-row">
              <div>
                <h2>
                  <Calendar size={20} />
                  <span>Lịch Chơi & Đặt Chỗ Của Bạn</span>
                </h2>
                <p className="mp-card-desc">
                  Đặt trước phòng VIP hoặc line Driving Range để CLB giữ chỗ tốt nhất cho bạn.
                </p>
              </div>

              {data.booking?.enabled && (
                <button
                  type="button"
                  className="mp-btn-action primary"
                  onClick={() => setBookingExpanded(!bookingExpanded)}
                >
                  <PlusCircle size={15} />
                  <span>{bookingExpanded ? 'Thu Gọn Form' : 'Đặt Line Mới'}</span>
                </button>
              )}
            </div>

            {/* Quick Booking Form */}
            {(bookingExpanded || (!upcoming.length && !(data.requests?.length ?? 0))) &&
              data.booking && (
                <BookForm
                  info={data.booking}
                  onDone={() => {
                    load();
                  }}
                />
              )}

            {/* Pending Requests */}
            {!!(data.requests ?? []).length && (
              <div className="mp-sub-section">
                <h3 className="mp-sub-title">
                  <Clock size={16} className="text-gold" />
                  <span>Yêu Cầu Chờ Lễ Tân CLB Xác Nhận ({data.requests?.length})</span>
                </h3>
                <ul className="mp-list">
                  {(data.requests ?? []).map((r) => (
                    <li key={r.start + r.service} className="mp-list-item">
                      <div>
                        <strong style={{ color: '#fff' }}>{SERVICE[r.service] || r.service}</strong>
                        <div className="mp-item-meta">
                          <span>{r.vip ? '⭐ Phòng VIP riêng tư' : 'Line Tiêu chuẩn'}</span>
                          <span>·</span>
                          <span>{r.guests || r.people} Golfer</span>
                          <span>·</span>
                          <span className="text-gold">Thời gian: {when(r.start)}</span>
                        </div>
                      </div>
                      <div className="mp-item-right">
                        <span className="mp-badge-pending">
                          {REQUEST_STATUS[r.status] || r.status}
                        </span>
                        {r.status === 'pending' && (
                          <button
                            className="mp-link"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  'Bạn có chắc chắn muốn hủy yêu cầu đặt lịch này không?',
                                )
                              )
                                return;
                              try {
                                await call({ action: 'book-cancel', id: r.id });
                              } catch (e) {
                                window.alert(e instanceof Error ? e.message : String(e));
                              }
                              load();
                            }}
                          >
                            Hủy yêu cầu
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmed Upcoming Sessions */}
            <div className="mp-sub-section">
              <h3 className="mp-sub-title">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Lịch Đã Giữ Line Thành Công ({upcoming.length})</span>
              </h3>
              <ul className="mp-list">
                {upcoming.map((b) => (
                  <li key={b.id} className="mp-list-item confirmed">
                    <div>
                      <strong style={{ color: '#fff' }}>{SERVICE[b.service] || b.service}</strong>
                      <div className="mp-item-meta">
                        <span>Phòng: {b.room}</span>
                        <span>·</span>
                        <span>{b.people} Golfer</span>
                        <span>·</span>
                        <span className="text-emerald">Giờ chơi: {when(b.start)}</span>
                      </div>
                    </div>
                    <span className="mp-badge-confirmed">
                      {BOOKING_STATUS[b.status] ?? b.status}
                    </span>
                  </li>
                ))}
                {!upcoming.length && (
                  <li className="mp-list-empty">
                    Hiện chưa có buổi chơi nào được xác nhận. Hãy bấm &ldquo;Đặt Line Mới&rdquo; ở
                    trên để lễ tân chuẩn bị phòng cho bạn.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="mp-tab-view">
          {/* Active Packages */}
          <section className="mp-card">
            <div className="mp-row">
              <div>
                <h2>
                  <CreditCard size={20} />
                  <span>Thẻ & Gói Cước Của Bạn</span>
                </h2>
                <p className="mp-card-desc">
                  Số dư giờ chơi và các đặc quyền hội viên đang có hiệu lực.
                </p>
              </div>
            </div>

            {packs.length ? (
              <div className="mp-packs">
                {packs.map((p) => {
                  const st = cardState({
                    activatedAt: p.activated_at ?? null,
                    activateBy: p.activate_by ?? null,
                    expires: p.expires,
                    now,
                  });
                  const expired = st === 'expired';
                  const period = !!p.grants && isPeriodCard(JSON.parse(p.grants));
                  const myAbs = (data.absences ?? []).filter(
                    (a) => a.package_id === p.id && a.status === 'active',
                  );
                  const limit = maxAbsences(p.valid_days ?? 30);
                  const empty = p.balances.length > 0 && p.balances.every((b) => b.remaining <= 0);
                  return (
                    <article key={p.id} className={expired || empty ? 'mp-pack off' : 'mp-pack'}>
                      <h3>{p.name}</h3>
                      <span className="mp-chip">
                        {expired
                          ? 'Hết hạn'
                          : st === 'pending'
                            ? 'Chờ kích hoạt'
                            : empty
                              ? 'Đã hết giờ'
                              : 'Đang hiệu lực'}
                      </span>
                      <ul>
                        {p.balances.map((b) => (
                          <li key={b.kind}>
                            Số dư còn: <strong>{left(b)}</strong>
                          </li>
                        ))}
                        <li>
                          Hạn sử dụng:{' '}
                          {st === 'pending' && p.activate_by
                            ? `Tự kích hoạt ngày ${day(p.activate_by)} (hoặc khi bạn bắt đầu chơi)`
                            : p.expires - p.purchased >= 3650 * 86_400_000 * 0.99
                              ? 'Không giới hạn thời gian'
                              : day(p.expires)}
                        </li>
                        {myAbs.map((a) => (
                          <li key={a.id}>
                            Lịch vắng: {a.start_day.split('-').reverse().join('/')} –{' '}
                            {a.end_day.split('-').reverse().join('/')} ({a.days} ngày)
                            {a.start_day > clubDay(now) && (
                              <button
                                type="button"
                                className="mp-banner-link"
                                onClick={() =>
                                  act(
                                    () => call({ action: 'absence-cancel', id: a.id }),
                                    'Đã huỷ lịch vắng',
                                  )
                                }
                              >
                                {' '}
                                Huỷ
                              </button>
                            )}
                          </li>
                        ))}
                        <li>
                          Phòng áp dụng:{' '}
                          {PACKAGE_ROOM_LABELS[p.room as PackageRoom] ?? 'Tất cả phòng'}
                        </li>
                        {p.perks && (
                          <li style={{ color: 'var(--gold)' }}>★ Đặc quyền: {p.perks}</li>
                        )}
                      </ul>
                      {(st === 'pending' || (period && st === 'active')) && (
                        <div className="mp-row" style={{ gap: 8, marginTop: 8 }}>
                          {st === 'pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                act(
                                  () => call({ action: 'card-activate', packageId: p.id }),
                                  'Đã kích hoạt thẻ',
                                )
                              }
                            >
                              Kích hoạt ngay
                            </button>
                          )}
                          {period && st === 'active' && (
                            <button
                              type="button"
                              disabled={myAbs.length >= limit}
                              onClick={() => {
                                const start = window.prompt(
                                  'Ngày bắt đầu vắng (YYYY-MM-DD, sau hôm nay)',
                                  clubDay(now + 86_400_000),
                                );
                                if (!start) return;
                                const n = Number(
                                  window.prompt(
                                    `Số ngày vắng liên tục (tối thiểu ${MIN_ABSENCE_DAYS})`,
                                    String(MIN_ABSENCE_DAYS),
                                  ),
                                );
                                if (!Number.isInteger(n) || n < 1) return;
                                const end = new Date(
                                  Date.parse(start + 'T00:00:00Z') + (n - 1) * 86_400_000,
                                )
                                  .toISOString()
                                  .slice(0, 10);
                                act(
                                  () =>
                                    call({
                                      action: 'absence-create',
                                      packageId: p.id,
                                      startDay: start,
                                      endDay: end,
                                    }),
                                  `Đã báo vắng, hạn thẻ được cộng thêm ${n} ngày`,
                                );
                              }}
                            >
                              Báo vắng ({myAbs.length}/{limit})
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mp-empty-card">
                <CreditCard
                  size={40}
                  className="text-gold"
                  style={{ margin: '0 auto 1rem', opacity: 0.7 }}
                />
                <h3>Bạn chưa kích hoạt gói cước nào</h3>
                <p>
                  Khám phá danh mục gói giờ chơi ưu đãi bên dưới hoặc liên hệ quầy thu ngân để nạp
                  giờ chơi với chiết khấu tốt nhất.
                </p>
              </div>
            )}
          </section>

          {/* Package Catalog to purchase */}
          {!!data.catalog?.length && (
            <section className="mp-card" id="mua-goi">
              <div className="mp-row">
                <div>
                  <h2>
                    <PlusCircle size={20} />
                    <span>Mua Thêm Gói Giờ Chơi Ưu Đãi Hội Viên</span>
                  </h2>
                  <p className="mp-card-desc">
                    Đăng ký gói online để nhận thêm quà tặng giờ chơi và điểm thưởng. Thu ngân CLB
                    sẽ kích hoạt ngay cho bạn.
                  </p>
                </div>
              </div>

              {/* Pending Orders */}
              {!!data.orders?.length && (
                <div className="mp-sub-section">
                  <h3 className="mp-sub-title">
                    <Clock size={16} className="text-gold" />
                    <span>Yêu Cầu Mua Gói Đang Chờ Xử Lý ({data.orders.length})</span>
                  </h3>
                  <ul className="mp-list">
                    {data.orders.map((o) => (
                      <li key={o.id} className="mp-list-item">
                        <div>
                          <strong style={{ color: '#fff' }}>{o.name}</strong> ·{' '}
                          <span className="text-gold">{money(o.price)}</span>
                        </div>
                        <div className="mp-item-right">
                          <span className="mp-badge-pending">Chờ thu ngân kích hoạt</span>
                          <button
                            className="mp-link"
                            onClick={async () => {
                              if (!window.confirm('Hủy yêu cầu mua gói này?')) return;
                              try {
                                await call({ action: 'order-cancel', id: o.id });
                              } catch (e) {
                                window.alert(e instanceof Error ? e.message : String(e));
                              }
                              load();
                            }}
                          >
                            Hủy yêu cầu
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Catalog Items */}
              <div className="mp-catalog-grid">
                {data.catalog.map((t) => (
                  <div key={t.id} className="mp-catalog-card">
                    <div className="mp-catalog-badge">Ưu đãi hội viên</div>
                    <h4>{t.name}</h4>
                    <span className="mp-catalog-room">
                      {PACKAGE_ROOM_LABELS[t.room as PackageRoom] ??
                        'Tất cả phòng tiêu chuẩn & VIP'}
                    </span>
                    <div className="mp-catalog-price">{money(t.price)}</div>
                    <button
                      type="button"
                      className="mp-catalog-btn"
                      onClick={async () => {
                        try {
                          await call({ action: 'order', typeId: t.id });
                          window.alert(
                            `Đã gửi yêu cầu đăng ký gói "${t.name}". Lễ tân sẽ liên hệ hỗ trợ thanh toán & nạp giờ!`,
                          );
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : String(e));
                        }
                        load();
                      }}
                    >
                      <span>Đăng Ký Mua Gói</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <div className="mp-tab-view">
          {/* Deductions Ledger */}
          <section className="mp-card">
            <h2>
              <Clock size={20} />
              <span>Nhật Ký Trừ Giờ & Lượt Chơi</span>
            </h2>
            <p className="mp-card-desc">
              Minh bạch mọi lượt trừ giờ chơi từ các thẻ và gói cước của bạn.
            </p>

            <ul className="mp-list">
              {(data.usage ?? []).map((u) => (
                <li key={u.created + u.package} className="mp-list-item">
                  <div>
                    <strong style={{ color: '#fff' }}>{u.package}</strong>
                    <div className="mp-item-meta">
                      <span>{u.start ? when(u.start) : day(u.created)}</span>
                      {u.service && <span>· {SERVICE[u.service] || u.service}</span>}
                      {u.room && <span>· Phòng {u.room}</span>}
                    </div>
                  </div>
                  <div>
                    <span className="mp-deduction-units">
                      −{u.units} {KIND_LABELS[u.kind]?.toLowerCase() ?? 'giờ'}
                    </span>
                  </div>
                </li>
              ))}
              {!(data.usage ?? []).length && (
                <li className="mp-list-empty">
                  Chưa phát sinh lượt trừ giờ nào từ thẻ hoặc gói cước của bạn.
                </li>
              )}
            </ul>
          </section>

          {/* Past Completed Bookings */}
          <section className="mp-card">
            <h2>
              <History size={20} />
              <span>Lịch Sử Các Buổi Chơi Đã Hoàn Tất</span>
            </h2>
            <ul className="mp-list">
              {past.map((b) => (
                <li key={b.id} className="mp-list-item">
                  <div>
                    <strong style={{ color: '#fff' }}>{SERVICE[b.service] || b.service}</strong>
                    <div className="mp-item-meta">
                      <span>Phòng {b.room}</span>
                      <span>·</span>
                      <span>{b.people} người</span>
                    </div>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{when(b.start)}</div>
                </li>
              ))}
              {!past.length && (
                <li className="mp-list-empty">Chưa có lịch sử các buổi chơi trước đây.</li>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="mp-tab-view">
          <Settings data={data} onSaved={load} />
        </div>
      )}
    </MemberShell>
  );
}
