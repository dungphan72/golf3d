'use client';
import { useEffect, useRef, useState } from 'react';
import { money } from '../../lib/club';
import { REQUEST_STATUS_LABELS } from '../../lib/online';
import { BRAND } from '../../lib/brand';

type Info = {
  name: string;
  address: string;
  open: string;
  close: string;
  days: number;
  minLeadMinutes: number;
  vip: boolean;
  maxPeople: number;
  captchaSiteKey?: string | null;
};
type Status = {
  status: string;
  service: string;
  vip: boolean;
  people: number;
  start: number;
  minutes: number;
  reason: string;
  total: number | null;
};
const SERVICE: Record<string, string> = {
  gdr: 'Luyện tập GDR',
  '9': 'Chơi 9 hố',
  '18': 'Chơi 18 hố',
};
const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
// A datetime-local value is interpreted as Vietnam time (UTC+7) regardless of the browser zone.
const toMs = (local: string) => Date.parse(local + ':00+07:00');
type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: { sitekey: string; callback: (t: string) => void; 'expired-callback': () => void },
  ) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
/** Cloudflare Turnstile widget; only rendered when the club has configured keys. */
function TurnstileBox({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string>('');
  useEffect(() => {
    let live = true;
    function mount() {
      if (!live || !box.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
      });
    }
    if (window.turnstile) mount();
    else {
      const id = 'turnstile-script';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', mount);
    }
    return () => {
      live = false;
    };
  }, [siteKey, onToken]);
  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);
  return <div ref={box} />;
}
const storageKey = 'golf3d-request-code';

export default function BookingPage({
  slug,
  embedded = false,
}: {
  slug: string;
  embedded?: boolean;
}) {
  const shell = embedded ? 'booking-embed' : 'auth-screen';
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    service: '18',
    vip: false,
    people: 1,
    start: '',
    minutes: 90,
    note: '',
    website: '',
  });
  const [captcha, setCaptcha] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/public/booking?slug=' + encodeURIComponent(slug))
      .then(async (r) => {
        const v = (await r.json()) as Info & { error?: string };
        if (!r.ok) throw new Error(v.error || 'Không tải được thông tin');
        setInfo(v);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the last request on this device
    setCode(localStorage.getItem(storageKey + ':' + slug) ?? '');
  }, [slug]);
  useEffect(() => {
    if (!code) return;
    let live = true;
    const load = () =>
      fetch('/api/public/booking/status?code=' + encodeURIComponent(code))
        .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
        .then((v) => live && setStatus(v));
    load();
    const id = setInterval(load, 20000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: form.name,
          phone: form.phone,
          service: form.service,
          vip: form.vip,
          people: form.people,
          start: toMs(form.start),
          minutes: form.service === 'gdr' ? form.minutes : 0,
          note: form.note,
          website: form.website,
          captcha,
        }),
      });
      const v = (await r.json()) as { error?: string; code?: string };
      if (!r.ok || !v.code) throw new Error(v.error || 'Không gửi được yêu cầu');
      localStorage.setItem(storageKey + ':' + slug, v.code);
      setCode(v.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCaptchaReset((n) => n + 1);
      setCaptcha('');
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    const r = await fetch('/api/public/booking/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!r.ok) setError(((await r.json()) as { error?: string }).error ?? 'Không hủy được');
    else {
      setError('');
      setStatus((s) => (s ? { ...s, status: 'cancelled' } : s));
    }
  }
  function again() {
    localStorage.removeItem(storageKey + ':' + slug);
    setCode('');
    setStatus(null);
  }

  if (loadError)
    return (
      <div className={shell}>
        <div className="auth-card">
          <h1>{BRAND.name}</h1>
          <p>{loadError}</p>
          <p className="hotline">
            Hotline: <a href={'tel:' + BRAND.hotline}>{BRAND.hotline}</a>
          </p>
        </div>
      </div>
    );
  if (!info) return <div className={shell}>Đang tải…</div>;
  return (
    <div className={shell}>
      <div className="booking-wrap">
        {!embedded && (
          <div className="banner-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.banner} alt={BRAND.name} width={1600} height={640} />
          </div>
        )}
        {code && status ? (
          <div className="auth-card">
            <h1>{info.name}</h1>
            <p>
              <strong>{REQUEST_STATUS_LABELS[status.status] ?? status.status}</strong>
            </p>
            <p>
              {SERVICE[status.service]} · {status.vip ? 'phòng VIP' : 'line thường'} ·{' '}
              {status.people} người
              <br />
              {when(status.start)}
              {status.total != null && (
                <>
                  <br />
                  Tạm tính: {money(status.total)} (chưa gồm F&B)
                </>
              )}
            </p>
            {status.status === 'pending' && (
              <p className="form-note">
                Nhân viên sẽ liên hệ qua số điện thoại bạn đã nhập để xác nhận. Trang này tự cập
                nhật.
              </p>
            )}
            {status.status === 'confirmed' && (
              <p className="form-note">Hẹn gặp bạn tại {info.address}.</p>
            )}
            {status.status === 'rejected' && status.reason && <p>Lý do: {status.reason}</p>}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            {status.status === 'pending' && (
              <button className="secondary" onClick={cancel}>
                Hủy yêu cầu
              </button>
            )}
            {status.status !== 'pending' && (
              <button className="primary" onClick={again}>
                Đặt lịch khác
              </button>
            )}
          </div>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <h1>{info.name}</h1>
            <p>
              {info.address} · mở cửa {info.open}–{info.close}
            </p>
            <label>
              <select
                aria-label="Dịch vụ"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              >
                <option value="18">Chơi 18 hố</option>
                <option value="9">Chơi 9 hố</option>
                <option value="gdr">Luyện tập GDR</option>
              </select>
            </label>
            <label>
              <input
                aria-label="Ngày, giờ bắt đầu (giờ Việt Nam)"
                title="Ngày, giờ bắt đầu (giờ Việt Nam)"
                type="datetime-local"
                step={900}
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                required
              />
            </label>
            {form.service === 'gdr' && (
              <label>
                Thời lượng
                <select
                  value={form.minutes}
                  onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
                >
                  {[60, 90, 120, 150, 180].map((n) => (
                    <option key={n} value={n}>
                      {n} phút
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <select
                aria-label="Số người"
                value={form.people}
                onChange={(e) => setForm({ ...form, people: Number(e.target.value) })}
              >
                {Array.from({ length: info.maxPeople }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} người
                  </option>
                ))}
              </select>
            </label>
            {info.vip && (
              <label>
                <span>Phòng VIP riêng tư</span>
                <input
                  type="checkbox"
                  checked={form.vip}
                  onChange={(e) => setForm({ ...form, vip: e.target.checked })}
                />
              </label>
            )}
            <label>
              <input
                aria-label="Họ và tên"
                placeholder="Họ và tên"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label>
              <input
                aria-label="Số điện thoại"
                placeholder="Số điện thoại"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label>
              <input
                aria-label="Ghi chú (không bắt buộc)"
                placeholder="Ghi chú (không bắt buộc)"
                value={form.note}
                maxLength={300}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            {/* Honeypot: invisible to people, tempting to bots. */}
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px' }}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            {info.captchaSiteKey && (
              <TurnstileBox
                siteKey={info.captchaSiteKey}
                onToken={setCaptcha}
                resetKey={captchaReset}
              />
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <p className="form-note">
              Đây là yêu cầu đặt lịch; chỉ có hiệu lực khi nhân viên xác nhận. Đặt trước tối thiểu{' '}
              {info.minLeadMinutes} phút, tối đa {info.days} ngày.
            </p>
            <button className="primary" disabled={busy || (!!info.captchaSiteKey && !captcha)}>
              {busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt lịch'}
            </button>
          </form>
        )}
        {!embedded && (
          <p className="hotline">
            Hotline: <a href={'tel:' + BRAND.hotline}>{BRAND.hotline}</a> · Đặt lịch:{' '}
            {BRAND.website}
          </p>
        )}
      </div>
    </div>
  );
}
