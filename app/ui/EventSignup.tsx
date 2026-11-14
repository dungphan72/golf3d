'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';

/** Public sign-up form for an event. Name and phone are enough; the club calls to confirm. */
export default function EventSignup({ postId }: { postId: string }) {
  const [form, setForm] = useState({ name: '', phone: '', note: '', website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'already'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    setError('');
    try {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, ...form }),
      });
      const v = (await r.json()) as { error?: string; already?: boolean };
      if (!r.ok) throw new Error(v.error || 'Chưa gửi được đăng ký');
      setState(v.already ? 'already' : 'done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState('idle');
    }
  }

  if (state === 'done' || state === 'already')
    return (
      <div className="sg-signup sg-signup--ok" id="dang-ky" role="status">
        <Check size={26} />
        <div>
          <strong>{state === 'already' ? 'Số điện thoại này đã đăng ký rồi' : 'Đã nhận đăng ký của bạn'}</strong>
          <p>Câu lạc bộ sẽ gọi để xác nhận. Hẹn gặp bạn tại sự kiện.</p>
        </div>
      </div>
    );

  return (
    <form className="sg-signup" id="dang-ky" onSubmit={submit}>
      <h2>Đăng ký tham gia</h2>
      <label>
        Họ và tên
        <input
          value={form.name}
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label>
        Số điện thoại
        <input
          type="tel"
          value={form.phone}
          autoComplete="tel"
          required
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      <label>
        Ghi chú (không bắt buộc)
        <input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
        <p className="sg-signup-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="sg-btn" disabled={state === 'busy'}>
        {state === 'busy' ? 'Đang gửi…' : 'Gửi đăng ký'}
      </button>
    </form>
  );
}
