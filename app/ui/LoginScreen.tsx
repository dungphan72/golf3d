'use client';
import { useEffect, useState } from 'react';
import { BRAND } from '../../lib/brand';

export function LoginScreen({ onDone, notice }: { onDone: () => void; notice?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sitesLogin, setSitesLogin] = useState(false);
  useEffect(() => {
    fetch('/api/auth/login')
      .then((r) => r.json() as Promise<{ sitesLogin?: boolean }>)
      .then((v) => setSitesLogin(!!v.sitesLogin))
      .catch(() => {});
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Không đăng nhập được');
      setPassword('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src={BRAND.logo} alt={BRAND.name} width={88} height={88} />
        <h1>{BRAND.name}</h1>
        <p>Đăng nhập để vào không gian làm việc</p>
        {notice && <p className="form-note">{notice}</p>}
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        {sitesLogin && (
          <a className="auth-alt" href="/signin-with-chatgpt?return_to=%2F" target="_top">
            Đăng nhập bằng tài khoản nền tảng (chủ cơ sở)
          </a>
        )}
      </form>
    </div>
  );
}
