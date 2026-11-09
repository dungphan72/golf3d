'use client';
import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  async function load() {
    const r = await fetch('/api/bank', { cache: 'no-store' });
    if (r.ok) setConfigured(((await r.json()) as { configured: boolean }).configured);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
    load();
    setUrl(location.origin + '/api/webhooks/sepay');
  }, []);

  function copyUrl() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
    <section className="settings-section sepay-settings-card">
      <div>
        <span className="eyebrow" style={{ color: '#025c0a', fontWeight: 600 }}>
          <Zap size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
          05 / TỰ ĐỘNG BÁO CÓ TỨC THÌ (SEPAY VIETQR)
        </span>
        <h2>Nhận báo có ngân hàng tự động</h2>
        <p>
          Khi khách quét mã VietQR và hoàn tất chuyển khoản tại quầy hoặc trên web, SePay sẽ bắn thông báo tức thì đến hệ thống. Màn hình thu ngân sẽ tự động cập nhật trạng thái <strong>&quot;Đã nhận tiền&quot;</strong> sau 2 giây mà không cần kiểm tra thủ công app ngân hàng.
        </p>
      </div>

      <div className="sepay-steps-box" style={{
        margin: '16px 0',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            background: '#025c0a',
            color: '#fff',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>1</span>
          <div>
            <strong style={{ fontSize: 13 }}>Đăng ký tài khoản SePay</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#475569' }}>
              Truy cập <a href="https://my.sepay.vn" target="_blank" rel="noreferrer" style={{ color: '#025c0a', textDecoration: 'underline' }}>my.sepay.vn <ExternalLink size={12} style={{ display: 'inline' }} /></a> và liên kết tài khoản ngân hàng của câu lạc bộ.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            background: '#025c0a',
            color: '#fff',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>2</span>
          <div>
            <strong style={{ fontSize: 13 }}>Tạo Webhook trên SePay</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#475569' }}>
              Vào mục <em>Tích hợp Webhook</em> trên SePay, chọn <em>Thêm Webhook mới</em>, dán <strong>Địa chỉ Webhook</strong> bên dưới và chọn kiểu xác thực <strong>API Key</strong>.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            background: '#025c0a',
            color: '#fff',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>3</span>
          <div>
            <strong style={{ fontSize: 13 }}>Nhập Khóa API xác thực</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#475569' }}>
              Nhập cùng mã khóa bảo mật (ít nhất 16 ký tự) vào ô bên dưới và bấm <strong>Lưu khóa</strong>. Hệ thống mã hóa một chiều để xác thực giao dịch an toàn tuyệt đối.
            </p>
          </div>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Địa chỉ Webhook (sao chép dán vào SePay)
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
            <button type="button" className="secondary" onClick={copyUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>
        </label>

        <div className="sepay-status-pill" style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: configured ? '#f0fdf4' : '#fffbeb',
          border: configured ? '1px solid #bbf7d0' : '1px solid #fef08a',
          color: configured ? '#166534' : '#854d0e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
        }}>
          {configured ? <ShieldCheck size={18} color="#16a34a" /> : <Zap size={18} color="#eab308" />}
          <span>
            Trạng thái kết nối SePay:{' '}
            <strong>{configured === null ? 'Đang kiểm tra…' : configured ? 'Đã kích hoạt khóa webhook (Sẵn sàng)' : 'Chưa thiết lập khóa (Đang tắt)'}</strong>
          </span>
        </div>

        <label>
          Khóa API SePay bí mật (tối thiểu 16 ký tự do anh đặt trên SePay)
          <input
            type="password"
            autoComplete="off"
            value={key}
            placeholder="Nhập API Key SePay..."
            minLength={16}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="primary"
            disabled={busy || key.length < 16}
            onClick={() => act({ action: 'set-key', key }, 'Đã lưu khóa bảo mật SePay thành công')}
          >
            Lưu khóa SePay
          </button>
          {configured && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => act({ action: 'clear-key' }, 'Đã tắt nhận báo có tự động')}
            >
              Hủy kết nối SePay
            </button>
          )}
        </div>

        {notice && <p role="status" style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ {notice}</p>}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
