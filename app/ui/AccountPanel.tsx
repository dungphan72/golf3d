'use client';
import { useEffect, useState } from 'react';
import { PasswordChange } from './PasswordChange';

type Me = {
  name: string;
  email: string;
  role: string;
  via: 'password' | 'sites';
  mustChange: boolean;
  needsPassword: boolean;
};

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}

export function AccountPanel({
  forced = false,
  onChanged,
  onLogout,
}: {
  forced?: boolean;
  onChanged: () => void;
  onLogout: () => void;
}) {
  const [me, setMe] = useState<Me | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then((v) => setMe(v));
  }, []);
  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await task();
      setMessage(done);
      setCurrent('');
      setNext('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (me?.via === 'password' && !me.needsPassword) {
    return (
      <div className="pwc-page">
        <p className="pwc-page-note">
          {me.name} · {me.email}
        </p>
        <PasswordChange
          note={forced ? 'Bạn cần đặt mật khẩu mới trước khi sử dụng hệ thống.' : undefined}
          onSubmit={async (cur, nxt) => {
            await post('/api/auth/password', { action: 'change', current: cur, next: nxt });
            onChanged();
          }}
        />
        <button type="button" className="pwc-logout" onClick={onLogout}>
          Đăng xuất
        </button>
      </div>
    );
  }
  return (
    <section className="account-panel">
      <h2>{forced ? 'Đổi mật khẩu tạm thời' : 'Tài khoản'}</h2>
      {me && (
        <p>
          {me.name} · {me.email} · vai trò: <strong>{me.role}</strong>
        </p>
      )}
      {forced && <p className="form-note">Bạn cần đặt mật khẩu mới trước khi sử dụng hệ thống.</p>}
      {me?.via === 'password' && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => post('/api/auth/password', { action: 'change', current, next }),
              'Đã đổi mật khẩu',
            );
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
            Mật khẩu mới (tối thiểu 8 ký tự)
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Đổi mật khẩu
          </button>
        </form>
      )}
      {me?.needsPassword && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => post('/api/auth/password', { action: 'setup', email, name, password: next }),
              'Đã tạo đăng nhập bằng mật khẩu cho chủ cơ sở',
            );
          }}
        >
          <h3 className="form-label">Tạo đăng nhập bằng mật khẩu cho chủ cơ sở</h3>
          <label>
            Email đăng nhập
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Tên hiển thị
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Mật khẩu (tối thiểu 8 ký tự)
            <input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Tạo đăng nhập
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button className="secondary" onClick={onLogout}>
        Đăng xuất
      </button>
    </section>
  );
}
