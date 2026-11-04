'use client';
import { useEffect, useState } from 'react';

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/bank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const v = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
}

/** Webhook key for SePay. The key is only ever hashed on the server; it cannot be read back. */
export function SepaySettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');

  async function load() {
    const r = await fetch('/api/bank', { cache: 'no-store' });
    if (r.ok) setConfigured(((await r.json()) as { configured: boolean }).configured);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    setUrl(location.origin + '/api/webhooks/sepay');
  }, []);
  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await call(body);
      setNotice(done);
      setKey('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section">
      <div>
        <span className="eyebrow">05 / CHUYỂN KHOẢN TỰ ĐỘNG (SEPAY)</span>
        <h2>Nhận báo có từ ngân hàng</h2>
        <p>
          Trong SePay, tạo webhook gọi tới địa chỉ bên dưới, kiểu xác thực <b>API Key</b> với khóa
          do anh tự đặt, rồi nhập cùng khóa đó vào đây. Hệ thống chỉ lưu bản băm của khóa. Tiền về
          chỉ được ghi sổ khi nhân viên xác nhận ở hộp thanh toán.
        </p>
      </div>
      <div className="form-grid">
        <label>
          Địa chỉ webhook
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <p>
          Trạng thái:{' '}
          <strong>
            {configured === null ? '…' : configured ? 'Đã cấu hình khóa' : 'Chưa cấu hình'}
          </strong>
        </p>
        <label>
          Khóa API (tối thiểu 16 ký tự)
          <input
            type="password"
            autoComplete="off"
            value={key}
            minLength={16}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary"
          disabled={busy || key.length < 16}
          onClick={() => act({ action: 'set-key', key }, 'Đã lưu khóa SePay')}
        >
          Lưu khóa
        </button>
        {configured && (
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => act({ action: 'clear-key' }, 'Đã tắt nhận báo có tự động')}
          >
            Tắt
          </button>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
