'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { STAFF_MIN_LENGTH } from '../../lib/auth/password';
import '../password-change.css';

const LEVELS = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'] as const;

/** What the new password already satisfies. Only the length is enforced by the server; the rest guide the choice. */
export function passwordChecks(pw: string) {
  return [
    { key: 'len', label: `Tối thiểu ${STAFF_MIN_LENGTH} ký tự`, ok: pw.length >= STAFF_MIN_LENGTH },
    { key: 'upper', label: 'Có chữ hoa (A – Z)', ok: /[A-Z]/.test(pw) },
    { key: 'lower', label: 'Có chữ thường (a – z)', ok: /[a-z]/.test(pw) },
    { key: 'digit', label: 'Có số (0 – 9)', ok: /[0-9]/.test(pw) },
  ];
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  id,
  invalid,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  id: string;
  invalid?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwc-field">
      <label htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </label>
      <div className={'pwc-input' + (invalid ? ' is-invalid' : '')}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={show}
        >
          {show ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
      {hint && (
        <p className="pwc-hint" role="alert">
          {hint}
        </p>
      )}
    </div>
  );
}

function Illustration() {
  return (
    <svg className="pwc-art" viewBox="0 0 360 300" role="img" aria-label="Bảo mật tài khoản bằng mật khẩu">
      <ellipse cx="110" cy="190" rx="86" ry="62" fill="#e6f5e9" />
      <ellipse cx="250" cy="150" rx="96" ry="84" fill="#e6f5e9" />
      <rect x="62" y="64" width="216" height="150" rx="10" fill="#1d8f3b" />
      <rect x="72" y="74" width="196" height="130" rx="5" fill="#f7fbf8" />
      <rect x="30" y="214" width="280" height="14" rx="7" fill="#cfd8e3" />
      <rect x="130" y="214" width="80" height="6" rx="3" fill="#aeb9c6" />
      <path d="M150 128v-18a20 20 0 0 1 40 0v18" fill="none" stroke="#1d8f3b" strokeWidth="9" strokeLinecap="round" />
      <rect x="138" y="124" width="64" height="52" rx="9" fill="#fbbf24" />
      <circle cx="170" cy="146" r="7" fill="#0a5c1e" />
      <rect x="167" y="148" width="6" height="14" rx="3" fill="#0a5c1e" />
      <rect x="116" y="184" width="108" height="20" rx="10" fill="#fff" stroke="#bfe3c8" strokeWidth="2" />
      <text x="170" y="199" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1d8f3b" letterSpacing="3">
        *******
      </text>
      <path d="M248 40h42c6 0 10 4 10 10v34c0 24-18 40-31 46-13-6-31-22-31-46V50c0-6 4-10 10-10z" fill="#22a447" />
      <path d="m255 82 11 11 22-24" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 58 30 52M60 44l-4-14M76 52l6-12" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function PasswordChange({
  onSubmit,
  onCancel,
  note,
}: {
  /** Must reject with an Error whose message is shown to the user. */
  onSubmit: (current: string, next: string) => Promise<void>;
  onCancel?: () => void;
  note?: string;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const checks = useMemo(() => passwordChecks(next), [next]);
  const score = checks.filter((c) => c.ok).length;
  const level = next ? score : 0;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = !!current && checks[0].ok && confirm === next && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pwc" aria-labelledby="pwc-title">
      <div className="pwc-main">
        <Illustration />
        <header className="pwc-head">
          <span className="pwc-lock" aria-hidden="true">
            <Lock size={22} />
          </span>
          <div>
            <h2 id="pwc-title">Đổi mật khẩu</h2>
            <p>Cập nhật mật khẩu đăng nhập để bảo mật tài khoản của bạn.</p>
          </div>
        </header>
        {note && <p className="pwc-note">{note}</p>}

        <form onSubmit={submit} noValidate>
          <Field id="pwc-current" label="Mật khẩu hiện tại" value={current} onChange={setCurrent} autoComplete="current-password" />
          <Field id="pwc-next" label="Mật khẩu mới" value={next} onChange={setNext} autoComplete="new-password" />

          <div className="pwc-meter" aria-live="polite">
            <div className="pwc-bars" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={n <= level ? 'on l' + level : ''} />
              ))}
            </div>
            <span className={'pwc-level l' + level}>{next ? LEVELS[level] : 'Chưa nhập'}</span>
          </div>

          <ul className="pwc-rules">
            {checks.map((c) => (
              <li key={c.key} className={c.ok ? 'ok' : ''}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>

          <Field
            id="pwc-confirm"
            label="Xác nhận mật khẩu mới"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={mismatch}
            hint={mismatch ? 'Mật khẩu xác nhận chưa khớp.' : undefined}
          />

          {error && (
            <div className="pwc-error" role="alert">
              {error}
            </div>
          )}
          {done && (
            <div className="pwc-ok" role="status">
              <CheckCircle2 size={18} aria-hidden="true" /> Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.
            </div>
          )}

          <div className="pwc-actions">
            {onCancel && (
              <button type="button" className="pwc-cancel" onClick={onCancel} disabled={busy}>
                Hủy
              </button>
            )}
            <button type="submit" className="pwc-submit" disabled={!canSubmit}>
              <Lock size={18} aria-hidden="true" />
              {busy ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
