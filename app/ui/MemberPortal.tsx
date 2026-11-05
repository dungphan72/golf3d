'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from '../../lib/brand';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../lib/member';
import { PACKAGE_ROOM_LABELS, type PackageRoom } from '../../lib/package-use';

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
};
type Overview = {
  profile: { name: string; phone: string; email: string; verified: boolean };
  club?: { name: string; address: string };
  points?: number;
  packages?: Pack[];
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
  requests?: { service: string; vip: number; people: number; start: number; status: string }[];
};

const SERVICE: Record<string, string> = { gdr: 'Luyện tập', '9': 'Game 9 hố', '18': 'Game 18 hố' };
const BOOKING_STATUS: Record<string, string> = {
  booked: 'Đã đặt',
  playing: 'Đang chơi',
  paused: 'Đang chơi',
  finished: 'Đã chơi',
  paid: 'Đã chơi',
};
const REQUEST_STATUS: Record<string, string> = {
  pending: 'Chờ câu lạc bộ xác nhận',
  confirmed: 'Đã xác nhận',
};
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
    : `${b.remaining} ${KIND_LABELS[b.kind].toLowerCase()}`;

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const v = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}

function AuthForms({ onDone, first }: { onDone: () => void; first: 'login' | 'register' }) {
  const [mode, setMode] = useState(first);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', website: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await call(
        mode === 'login'
          ? { action: 'login', phone: form.phone, password: form.password }
          : { action: 'register', ...form },
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="mp-card mp-auth" onSubmit={submit}>
      <div className="mp-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => setMode('login')}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => setMode('register')}
        >
          Đăng ký hội viên
        </button>
      </div>
      {mode === 'register' && (
        <label>
          <input
            aria-label="Họ và tên"
            placeholder="Họ và tên"
            value={form.name}
            onChange={set('name')}
            minLength={2}
            maxLength={100}
            required
          />
        </label>
      )}
      <label>
        <input
          aria-label="Số điện thoại"
          placeholder="Số điện thoại"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          required
        />
      </label>
      {mode === 'register' && (
        <label>
          <input
            aria-label="Email (không bắt buộc)"
            placeholder="Email (không bắt buộc)"
            type="email"
            value={form.email}
            onChange={set('email')}
          />
        </label>
      )}
      <label>
        <input
          aria-label="Mật khẩu"
          placeholder={mode === 'register' ? 'Mật khẩu (ít nhất 8 ký tự)' : 'Mật khẩu'}
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={form.password}
          onChange={set('password')}
          minLength={mode === 'register' ? 8 : undefined}
          required
        />
      </label>
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px' }}
        value={form.website}
        onChange={set('website')}
      />
      {error && (
        <div className="mp-error" role="alert">
          {error}
        </div>
      )}
      {mode === 'register' && (
        <p className="mp-note">
          Số điện thoại là tên đăng nhập. Sau khi đăng ký, câu lạc bộ sẽ xác nhận số điện thoại của
          bạn để mở thẻ và giờ chơi.
        </p>
      )}
      <button className="mp-primary" disabled={busy}>
        {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </button>
      {mode === 'login' && (
        <p className="mp-note">
          Quên mật khẩu? Gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a> để được cấp lại.
        </p>
      )}
    </form>
  );
}

function Settings({ data, onSaved }: { data: Overview; onSaved: () => void }) {
  const [name, setName] = useState(data.profile.name);
  const [email, setEmail] = useState(data.profile.email);
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
    <section className="mp-card" id="cai-dat">
      <h2>Thông tin tài khoản</h2>
      {msg && <p role="status">{msg}</p>}
      {error && (
        <div className="mp-error" role="alert">
          {error}
        </div>
      )}
      <div className="mp-two">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => call({ action: 'profile', name, email }), 'Đã lưu thông tin');
          }}
        >
          <label>
            Họ và tên
            <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </label>
          <label>
            Số điện thoại
            <input value={data.profile.phone} disabled />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="mp-secondary">Lưu thông tin</button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await call({ action: 'password', current, next });
              setCurrent('');
              setNext('');
            }, 'Đã đổi mật khẩu');
          }}
        >
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </label>
          <button className="mp-secondary">Đổi mật khẩu</button>
        </form>
      </div>
    </section>
  );
}

export default function MemberPortal({ registerFirst = false }: { registerFirst?: boolean }) {
  const [data, setData] = useState<Overview | null>(null);
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const [now] = useState(() => Date.now());
  const mounted = useRef(true);
  const load = useCallback(async () => {
    const r = await fetch('/api/member', { cache: 'no-store' });
    if (!mounted.current) return;
    if (r.status === 401) {
      setState('out');
      setData(null);
      return;
    }
    if (r.ok) {
      setData((await r.json()) as Overview);
      setState('in');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  if (state === 'loading') return <div className="mp-wrap">Đang tải…</div>;
  if (state === 'out' || !data)
    return (
      <div className="mp-wrap">
        <AuthForms onDone={load} first={registerFirst ? 'register' : 'login'} />
      </div>
    );

  const packs = data.packages ?? [];
  const live = packs.filter((p) => p.expires >= now);
  const total = (kind: GrantKind) =>
    live.reduce((n, p) => n + (p.balances.find((b) => b.kind === kind)?.remaining ?? 0), 0);
  const hours = total('gdr');
  const upcoming = (data.bookings ?? []).filter((b) => b.start >= now);
  const past = (data.bookings ?? []).filter((b) => b.start < now);
  const logout = async () => {
    await call({ action: 'logout' });
    load();
  };

  return (
    <div className="mp-wrap">
      <header className="mp-head">
        <div>
          <p className="mp-kicker">Tài khoản hội viên</p>
          <h1>Xin chào, {data.profile.name}</h1>
          <p className="mp-note">{data.profile.phone}</p>
        </div>
        <button className="mp-secondary" onClick={logout}>
          Đăng xuất
        </button>
      </header>

      {!data.profile.verified ? (
        <section className="mp-card" role="status">
          <h2>Đang chờ câu lạc bộ xác nhận</h2>
          <p>
            Tài khoản đã tạo. Để bảo vệ thẻ và giờ chơi của bạn, nhân viên cần xác nhận số điện
            thoại <strong>{data.profile.phone}</strong> thuộc về bạn. Hãy ghé câu lạc bộ hoặc gọi{' '}
            <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>; ngay khi được xác nhận, thẻ, giờ
            chơi và lịch sử sẽ hiện tại đây.
          </p>
        </section>
      ) : (
        <>
          <div className="mp-tiles">
            <div className="mp-card">
              <span>Giờ chơi còn lại</span>
              <strong>{hours >= UNLIMITED ? 'Không giới hạn' : hours}</strong>
            </div>
            <div className="mp-card">
              <span>Lượt 9 hố / 18 hố</span>
              <strong>
                {total('holes9')} / {total('holes18')}
              </strong>
            </div>
            <div className="mp-card">
              <span>Điểm tích lũy</span>
              <strong>{data.points ?? 0}</strong>
            </div>
            <div className="mp-card">
              <span>Thẻ đang dùng</span>
              <strong>{live.length}</strong>
            </div>
          </div>

          <section className="mp-card" id="the">
            <div className="mp-row">
              <h2>Thẻ và gói của tôi</h2>
              <a className="mp-secondary" href="/thanh-vien">
                Mua thêm gói
              </a>
            </div>
            {packs.length ? (
              <div className="mp-packs">
                {packs.map((p) => {
                  const expired = p.expires < now;
                  const empty = p.balances.length > 0 && p.balances.every((b) => b.remaining <= 0);
                  return (
                    <article key={p.id} className={expired || empty ? 'mp-pack off' : 'mp-pack'}>
                      <h3>{p.name}</h3>
                      <span className="mp-chip">
                        {expired ? 'Hết hạn' : empty ? 'Đã dùng hết' : 'Đang dùng'}
                      </span>
                      <ul>
                        {p.balances.map((b) => (
                          <li key={b.kind}>
                            Còn <strong>{left(b)}</strong>
                          </li>
                        ))}
                        <li>
                          Hạn dùng:{' '}
                          {p.expires - p.purchased >= 3650 * 86_400_000 * 0.99
                            ? 'Không thời hạn'
                            : day(p.expires)}
                        </li>
                        <li>
                          Áp dụng: {PACKAGE_ROOM_LABELS[p.room as PackageRoom] ?? 'Tất cả phòng'}
                        </li>
                        {p.perks && <li>{p.perks}</li>}
                      </ul>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p>
                Bạn chưa có thẻ hay gói nào. Xem <a href="/thanh-vien">thẻ hội viên</a> hoặc đến câu
                lạc bộ để đăng ký.
              </p>
            )}
          </section>

          <section className="mp-card" id="lich">
            <div className="mp-row">
              <h2>Lịch chơi sắp tới</h2>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="mp-primary" href="/#dat-cho">
                Đặt lịch mới
              </a>
            </div>
            <ul className="mp-list">
              {(data.requests ?? []).map((r) => (
                <li key={r.start + r.service}>
                  <strong>{SERVICE[r.service]}</strong> · {r.vip ? 'Phòng VIP' : 'Phòng tiêu chuẩn'}{' '}
                  · {when(r.start)} <em>{REQUEST_STATUS[r.status]}</em>
                </li>
              ))}
              {upcoming.map((b) => (
                <li key={b.id}>
                  <strong>{SERVICE[b.service]}</strong> · {b.room} · {when(b.start)}{' '}
                  <em>{BOOKING_STATUS[b.status] ?? b.status}</em>
                </li>
              ))}
              {!upcoming.length && !(data.requests ?? []).length && <li>Chưa có lịch sắp tới</li>}
            </ul>
          </section>

          <section className="mp-card" id="gio-choi">
            <h2>Giờ chơi đã dùng</h2>
            <ul className="mp-list">
              {(data.usage ?? []).map((u) => (
                <li key={u.created + u.package}>
                  {u.start ? when(u.start) : day(u.created)} · {u.service ? SERVICE[u.service] : ''}{' '}
                  {u.room && `· ${u.room}`} ·{' '}
                  <strong>
                    −{u.units} {KIND_LABELS[u.kind].toLowerCase()}
                  </strong>{' '}
                  <em>{u.package}</em>
                </li>
              ))}
              {!(data.usage ?? []).length && <li>Chưa dùng giờ từ thẻ hay gói nào</li>}
            </ul>
          </section>

          <section className="mp-card" id="lich-su">
            <h2>Lịch sử đến chơi</h2>
            <ul className="mp-list">
              {past.map((b) => (
                <li key={b.id}>
                  {when(b.start)} · {SERVICE[b.service]} · {b.room} · {b.people} người
                </li>
              ))}
              {!past.length && <li>Chưa có lượt chơi nào</li>}
            </ul>
          </section>
        </>
      )}

      <Settings data={data} onSaved={load} />
    </div>
  );
}
