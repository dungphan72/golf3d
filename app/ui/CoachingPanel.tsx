'use client';
import { useEffect, useState } from 'react';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { LESSON_STATUS_LABELS } from '../../lib/coaching';

type Coach = { id: string; user_id: string | null; name: string; phone: string; active: number };
type Lesson = {
  id: string;
  coach_id: string;
  coach_name: string;
  customer_name: string;
  phone: string;
  start: number;
  minutes: number;
  status: string;
  price: number | null;
  note: string;
  coach_note: string;
};
type Data = { coaches: Coach[]; lessons: Lesson[]; me: string | null };

const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const toMs = (local: string) => Date.parse(local + ':00+07:00');

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/coaching', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string; replayed?: boolean };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}

export function CoachingPanel({ permissions }: { permissions: string[] }) {
  const canSchedule = permissions.includes('coach.schedule');
  const canManage = permissions.includes('coach.manage');
  const [data, setData] = useState<Data | null>(null);
  const [from] = useState(() => Date.now() - 6 * 3600_000);
  const [coachFilter, setCoachFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    coachId: '',
    customerName: '',
    phone: '',
    start: '',
    minutes: 60,
    price: '',
    note: '',
  });
  const [coachForm, setCoachForm] = useState({ name: '', phone: '' });
  const [key, setKey] = useState(operationKey());

  async function load() {
    const params = new URLSearchParams({
      from: String(from),
      to: String(from + 21 * 86_400_000),
    });
    if (coachFilter) params.set('coach', coachFilter);
    const r = await fetch('/api/coaching?' + params.toString(), { cache: 'no-store' });
    const v = (await r.json()) as Data & { error?: string };
    if (!r.ok) setError(v.error || 'Không tải được lịch dạy');
    else {
      setData(v);
      setError('');
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachFilter]);

  async function act(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const activeCoaches = data?.coaches.filter((c) => c.active) ?? [];
  const mark = (l: Lesson, status: 'done' | 'no_show' | 'cancelled') => {
    const coachNote =
      status === 'cancelled'
        ? ''
        : (window.prompt('Ghi chú buổi học (không bắt buộc):', l.coach_note) ?? '');
    return act(() => post({ action: 'lesson-status', id: l.id, status, coachNote }));
  };
  return (
    <section className="coaching-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {!data?.me && (
        <label>
          Xem lịch của
          <select value={coachFilter} onChange={(e) => setCoachFilter(e.target.value)}>
            <option value="">Tất cả HLV</option>
            {data?.coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.active ? '' : ' (ngừng)'}
              </option>
            ))}
          </select>
        </label>
      )}
      <table>
        <thead>
          <tr>
            <th>Giờ</th>
            <th>HLV</th>
            <th>Học viên</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data?.lessons.map((l) => (
            <tr key={l.id}>
              <td>
                {when(l.start)} · {l.minutes} phút
              </td>
              <td>{l.coach_name}</td>
              <td>
                <strong>{l.customer_name}</strong> · {l.phone}
                {l.price != null && <> · {money(l.price)}</>}
                {l.note && (
                  <>
                    <br />
                    <em>{l.note}</em>
                  </>
                )}
                {l.coach_note && (
                  <>
                    <br />
                    Ghi chú HLV: {l.coach_note}
                  </>
                )}
              </td>
              <td>{LESSON_STATUS_LABELS[l.status] ?? l.status}</td>
              <td>
                {l.status === 'scheduled' && (
                  <>
                    {l.start <= from + 6 * 3600_000 && (
                      <>
                        <button disabled={busy} onClick={() => mark(l, 'done')}>
                          Đã dạy
                        </button>{' '}
                        <button disabled={busy} onClick={() => mark(l, 'no_show')}>
                          Vắng
                        </button>{' '}
                      </>
                    )}
                    {canSchedule && (
                      <button disabled={busy} onClick={() => mark(l, 'cancelled')}>
                        Hủy
                      </button>
                    )}
                  </>
                )}
                {l.status !== 'cancelled' && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      const coachNote = window.prompt('Ghi chú buổi học:', l.coach_note);
                      if (coachNote !== null)
                        act(() => post({ action: 'lesson-note', id: l.id, coachNote }));
                    }}
                  >
                    Ghi chú
                  </button>
                )}
              </td>
            </tr>
          ))}
          {data && !data.lessons.length && (
            <tr>
              <td colSpan={5}>Chưa có buổi học trong 3 tuần tới</td>
            </tr>
          )}
        </tbody>
      </table>
      {canSchedule && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await post({
                action: 'lesson-create',
                requestId: key,
                coachId: form.coachId,
                customerName: form.customerName,
                phone: form.phone,
                start: toMs(form.start),
                minutes: form.minutes,
                price: form.price === '' ? null : Number(form.price),
                note: form.note,
              });
              setKey(operationKey());
              setForm({ ...form, customerName: '', phone: '', note: '', price: '' });
            });
          }}
        >
          <h3 className="form-label">Xếp buổi học</h3>
          <label>
            HLV
            <select
              value={form.coachId}
              onChange={(e) => setForm({ ...form, coachId: e.target.value })}
              required
            >
              <option value="">— Chọn HLV —</option>
              {activeCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giờ bắt đầu (giờ Việt Nam)
            <input
              type="datetime-local"
              step={900}
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              required
            />
          </label>
          <label>
            Thời lượng
            <select
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
            >
              {[30, 45, 60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n} phút
                </option>
              ))}
            </select>
          </label>
          <label>
            Học viên
            <input
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              minLength={2}
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
            Học phí dự kiến (không bắt buộc)
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            Ghi chú
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <button className="primary" disabled={busy}>
            Xếp lịch
          </button>
        </form>
      )}
      {canManage && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await post({ action: 'coach-save', ...coachForm, userId: null, active: true });
              setCoachForm({ name: '', phone: '' });
            });
          }}
        >
          <h3 className="form-label">Thêm HLV</h3>
          <label>
            Họ tên
            <input
              value={coachForm.name}
              onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
              minLength={2}
              required
            />
          </label>
          <label>
            Số điện thoại
            <input
              value={coachForm.phone}
              onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })}
            />
          </label>
          <button className="primary" disabled={busy}>
            Thêm HLV
          </button>
          {data?.coaches.map((c) => (
            <p key={c.id}>
              {c.name} {c.active ? '' : '(ngừng) '}
              <button
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  act(() =>
                    post({
                      action: 'coach-save',
                      id: c.id,
                      name: c.name,
                      phone: c.phone,
                      userId: c.user_id,
                      active: !c.active,
                    }),
                  );
                }}
              >
                {c.active ? 'Ngừng' : 'Kích hoạt'}
              </button>
            </p>
          ))}
        </form>
      )}
    </section>
  );
}
