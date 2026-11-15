'use client';
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import { useState } from 'react';
import {
  AlertCircle,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Phone,
  UserRound,
} from 'lucide-react';
import { BRAND } from '../../lib/brand';
import '../auth-reference.css';
export default function MemberAuth({
  onDone,
  first,
}: {
  onDone: () => void;
  first: 'login' | 'register';
}) {
  const [mode, setMode] = useState(first),
    [phone, setPhone] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [website, setWebsite] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function change(next: 'login' | 'register') {
    setMode(next);
    setError('');
    setPassword('');
    setConfirm('');
    setShow(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const clean = phone.replace(/[\s.-]/g, '');
    if (!/^(?:0|\+?84)\d{8,10}$/.test(clean)) {
      setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Mật khẩu cần tối thiểu 8 ký tự.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { action: 'login', phone: clean, password }
            : { action: 'register', name: name.trim(), phone: clean, email: '', password, website },
        ),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Chưa thể đăng nhập. Vui lòng thử lại.');
      try {
        if (remember) localStorage.setItem('sigolf-login-phone', clean);
        else localStorage.removeItem('sigolf-login-phone');
      } catch {
        // Storage may be unavailable; authentication has already succeeded.
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-header">
        <a className="auth-brand" href="/">
          <img src={BRAND.logo} alt="" />
          <strong>
            Saigon Indoor
            <br />
            Golf Club
          </strong>
        </a>
        <nav aria-label="Điều hướng">
          <a href="/">Trang chủ</a>
          <a href="/#dat-cho">Đặt sân</a>
          <a href="/bang-gia">Bảng giá</a>
          <a href="/thanh-vien">Hội viên</a>
          <a href="/tin-tuc">Giải đấu</a>
          <a href="/tin-tuc">Tin tức</a>
        </nav>
        <a className="auth-phone" href={`tel:${BRAND.hotline}`}>
          <Phone />
          0877 834 888
        </a>
        <button className="auth-header-login" onClick={() => change('login')}>
          <UserRound />
          Đăng nhập
        </button>
      </header>
      <main className="auth-stage">
        <aside className="auth-art">
          <img
            src="/img/auth/hero.webp"
            alt="Hội viên Saigon Indoor Golf Club. Đăng nhập để đặt sân, quản lý gói giờ và nhận ưu đãi. Không gian Golf 3D Foresight GC3."
          />
        </aside>
        <section
          className={'auth-card ' + (mode === 'register' ? 'is-register' : '')}
          aria-label="Tài khoản hội viên"
        >
          <div className="auth-mobile-art" />
          <div className="auth-identity">
            <a href="/" aria-label="Về trang chủ">
              <img src={BRAND.logo} alt="Saigon Indoor Golf Club" />
            </a>
            <h2>Saigon Indoor Golf Club</h2>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={mode === t}
                aria-controls="auth-form-panel"
                id={'auth-tab-' + t}
                onClick={() => change(t)}
              >
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
          <div className="auth-intro">
            <h1>{mode === 'login' ? 'Đăng nhập hội viên' : 'Đăng ký hội viên'}</h1>
            <p>
              {mode === 'login'
                ? 'Để đặt sân, quản lý gói giờ và nhận ưu đãi đặc quyền dành cho hội viên.'
                : 'Tạo tài khoản để đặt sân, theo dõi giờ chơi và nhận ưu đãi tại câu lạc bộ.'}
            </p>
          </div>
          <form
            id="auth-form-panel"
            role="tabpanel"
            aria-labelledby={'auth-tab-' + mode}
            onSubmit={submit}
            className="auth-form"
            aria-busy={busy}
          >
            {mode === 'register' && (
              <label className="auth-field">
                <UserRound />
                <span className="auth-sr">Họ và tên</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <label className="auth-field">
              <UserRound />
              <span className="auth-sr">Số điện thoại</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại"
                autoComplete="tel"
                maxLength={20}
                required
                disabled={busy}
              />
            </label>
            <label className="auth-field">
              <LockKeyhole />
              <span className="auth-sr">Mật khẩu</span>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mật khẩu (ít nhất 8 ký tự)' : 'Mật khẩu'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={show}
              >
                {show ? <Eye /> : <EyeOff />}
              </button>
            </label>
            {mode === 'register' && (
              <label className="auth-field">
                <LockKeyhole />
                <span className="auth-sr">Xác nhận mật khẩu</span>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Xác nhận mật khẩu"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <input
              className="auth-honey"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="auth-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (e.target.checked && !phone) {
                      try {
                        setPhone(localStorage.getItem('sigolf-login-phone') || '');
                      } catch {}
                    }
                  }}
                />
                Ghi nhớ số điện thoại
              </label>
              <a href={`tel:${BRAND.hotline}`}>Quên mật khẩu?</a>
            </div>
            {error && (
              <p className="auth-error" role="alert">
                <AlertCircle />
                {error}
              </p>
            )}
            <button className="auth-submit" disabled={busy} type="submit">
              <LogIn />
              {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>
          <div className="auth-social">
            <p>
              <span>Hoặc đăng nhập nhanh bằng</span>
            </p>
            <div>
              {['Google', 'Apple', 'Zalo'].map((provider) => (
                <button
                  type="button"
                  key={provider}
                  aria-label={`Đăng nhập bằng ${provider}`}
                  onClick={() =>
                    setError(
                      `Đăng nhập bằng ${provider} chưa được kết nối. Vui lòng dùng số điện thoại.`,
                    )
                  }
                >
                  {provider === 'Google' ? (
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#FFC107"
                        d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32.5 14l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
                      />
                      <path
                        fill="#FF3D00"
                        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32.5 14l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
                      />
                      <path
                        fill="#4CAF50"
                        d="m24 44 14-5.4-6.2-5.2a12 12 0 0 1-18.9-5.1l-6.6 5.1A20 20 0 0 0 24 44Z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-3.5 5.4l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
                      />
                    </svg>
                  ) : provider === 'Apple' ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17 12.3c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.8 1.1 1.6 2.2 2.8 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1 2.7-2.1c.9-1.3 1.2-2.5 1.2-2.6-.1 0-2.6-1-2.6-3.9ZM14.7 6.2c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.9 1 .1 2.1-.5 2.8-1.3Z" />
                    </svg>
                  ) : (
                    <span className="auth-zalo">Zalo</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="auth-join"
            onClick={() => change(mode === 'login' ? 'register' : 'login')}
          >
            <span className="auth-crown">
              <Crown />
            </span>
            <span>
              <strong>{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</strong>
              <small>
                {mode === 'login'
                  ? 'Đăng ký để trở thành hội viên và nhận nhiều ưu đãi hấp dẫn.'
                  : 'Đăng nhập để tiếp tục trải nghiệm tại Saigon Indoor Golf Club.'}
              </small>
            </span>
            <ChevronRight />
          </button>
        </section>
      </main>
    </div>
  );
}
