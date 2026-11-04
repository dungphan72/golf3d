'use client';
import { useEffect, useState } from 'react';
import { money } from '../../lib/club';
import { REQUEST_STATUS_LABELS } from '../../lib/online';

type Info = {
  name: string;
  address: string;
  open: string;
  close: string;
  days: number;
  minLeadMinutes: number;
  vip: boolean;
  maxPeople: number;
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
const storageKey = 'golf3d-request-code';

export default function BookingPage({ slug }: { slug: string }) {
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
        }),
      });
      const v = (await r.json()) as { error?: string; code?: string };
      if (!r.ok || !v.code) throw new Error(v.error || 'Không gửi được yêu cầu');
      localStorage.setItem(storageKey + ':' + slug, v.code);
      setCode(v.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Golf3D</h1>
          <p>{loadError}</p>
        </div>
      </div>
    );
  if (!info) return <div className="auth-screen">Đang tải…</div>;
  return (
    <div className="auth-screen">
      {code && status ? (
        <div className="auth-card">
          <h1>{info.name}</h1>
          <p>
            <strong>{REQUEST_STATUS_LABELS[status.status] ?? status.status}</strong>
          </p>
          <p>
            {SERVICE[status.service]} · {status.vip ? 'phòng VIP' : 'line thường'} · {status.people}{' '}
            người
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
              Nhân viên sẽ liên hệ qua số điện thoại bạn đã nhập để xác nhận. Trang này tự cập nhật.
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
            Dịch vụ
            <select
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
            >
              <option value="18">Chơi 18 hố</option>
              <option value="9">Chơi 9 hố</option>
              <option value="gdr">Luyện tập GDR</option>
            </select>
          </label>
          <label>
            Ngày, giờ bắt đầu (giờ Việt Nam)
            <input
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
            Số người
            <select
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
            Họ và tên
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
          <label>
            Ghi chú (không bắt buộc)
            <input
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
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <p className="form-note">
            Đây là yêu cầu đặt lịch; chỉ có hiệu lực khi nhân viên xác nhận. Đặt trước tối thiểu{' '}
            {info.minLeadMinutes} phút, tối đa {info.days} ngày.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt lịch'}
          </button>
        </form>
      )}
    </div>
  );
}
