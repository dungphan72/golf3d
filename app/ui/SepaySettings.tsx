'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { money } from '../../lib/club';

type BankTx = {
  id: string;
  amount: number;
  content: string;
  account: string;
  tx_time: number;
  code: string | null;
  status: 'received' | 'used' | 'ignored';
  booking_id: string | null;
};

async function call(body: Record<string, unknown>) {
  const r = await fetch('/api/bank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const v = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}

/** Webhook & Transaction Gateway for SePay (https://my.sepay.vn). */
export function SepaySettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<BankTx[]>([]);
  const [key, setKey] = useState('');
  const [showKeyPlain, setShowKeyPlain] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/bank', { cache: 'no-store' });
      if (r.ok) {
        const v = (await r.json()) as { configured: boolean; transactions?: BankTx[] };
        setConfigured(v.configured);
        setTransactions(v.transactions ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
    load();
    setUrl(location.origin + '/api/webhooks/sepay');
  }, []);

  function copyWebhookUrl() {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function generateRandomApiKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let random = 'sepay_sigolf_';
    for (let i = 0; i < 24; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setKey(random);
    setShowKeyPlain(true);
    navigator.clipboard.writeText(random);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  }

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await call(body);
      setNotice(done);
      if (body.action === 'set-key') setKey('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="settings-section sepay-settings-card"
      style={{
        marginTop: 20,
        paddingTop: 20,
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            className="eyebrow"
            style={{
              color: '#059669',
              fontWeight: 700,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Zap size={14} /> CỔNG THANH TOÁN TỰ ĐỘNG SEPAY (MY.SEPAY.VN)
          </span>
          <h3 style={{ margin: '4px 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Kết nối Webhook & Đối soát giao dịch tự động từ my.sepay.vn
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', maxWidth: 680 }}>
            Khi khách quét mã QR tại quầy POS hoặc trên web, <strong>my.sepay.vn</strong> sẽ bắn
            Webhook báo có tức thì về hệ thống. Hóa đơn có mã <code>SGG...</code> sẽ tự động khớp số
            tiền sau 2 giây mà không cần chụp màn hình chuyển khoản.
          </p>
        </div>

        <a
          href="https://my.sepay.vn"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: '#059669',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Mở trang quản trị my.sepay.vn <ExternalLink size={14} />
        </a>
      </div>

      {/* 3 Steps Guide */}
      <div
        className="sepay-steps-box"
        style={{
          margin: '14px 0',
          padding: 14,
          background: '#f8fafc',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span
            style={{
              background: '#059669',
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
            }}
          >
            1
          </span>
          <div>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>Liên kết ngân hàng trên SePay</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#475569' }}>
              Đăng nhập{' '}
              <a
                href="https://my.sepay.vn"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#059669', fontWeight: 600, textDecoration: 'underline' }}
              >
                https://my.sepay.vn
              </a>{' '}
              và thêm tài khoản ngân hàng của CLB.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span
            style={{
              background: '#059669',
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
            }}
          >
            2
          </span>
          <div>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>Cấu hình URL Webhook</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#475569' }}>
              Vào mục <em>Tích hợp Webhooks</em> trên <code>my.sepay.vn</code>, dán{' '}
              <strong>Địa chỉ nhận Webhook</strong> bên dưới, chọn xác thực <strong>API Key</strong>.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span
            style={{
              background: '#059669',
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
            }}
          >
            3
          </span>
          <div>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>Đồng bộ Khóa API Key</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#475569' }}>
              Bấm <strong>Tạo khóa tự động</strong> hoặc nhập khóa API từ SePay (tối thiểu 16 ký tự)
              và bấm <strong>Lưu khóa SePay</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook & Key Config */}
      <div className="ar-form-grid" style={{ gap: 12 }}>
        <div className="ar-field ar-form-grid-full">
          <label>Địa chỉ nhận Webhook SePay (Sao chép dán vào https://my.sepay.vn)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, background: '#f8fafc' }}
            />
            <button
              type="button"
              className="ar-btn-secondary"
              onClick={copyWebhookUrl}
              style={{ whiteSpace: 'nowrap' }}
            >
              {copiedUrl ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
              {copiedUrl ? 'Đã sao chép URL' : 'Sao chép URL'}
            </button>
          </div>
        </div>

        <div className="ar-field ar-form-grid-full">
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: configured ? '#f0fdf4' : '#fffbeb',
              border: configured ? '1px solid #bbf7d0' : '1px solid #fef08a',
              color: configured ? '#166534' : '#854d0e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 13.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {configured ? (
                <ShieldCheck size={18} color="#16a34a" />
              ) : (
                <Zap size={18} color="#eab308" />
              )}
              <span>
                Trạng thái cổng <strong>my.sepay.vn</strong>:{' '}
                <strong>
                  {configured === null
                    ? 'Đang kiểm tra…'
                    : configured
                      ? 'Đã kích hoạt Webhook API Key (Sẵn sàng nhận báo có tự động)'
                      : 'Chưa thiết lập khóa API Key'}
                </strong>
              </span>
            </div>
            <button
              type="button"
              className="ar-btn-secondary"
              disabled={busy}
              onClick={() =>
                act(
                  {
                    action: 'simulate-tx',
                    amount: 450000,
                    content: 'SGGTEST2026 chuyen khoan test SePay',
                  },
                  'Đã gửi giao dịch kiểm thử SePay (450.000 ₫ · SGGTEST2026) thành công!',
                )
              }
              style={{ padding: '5px 10px', fontSize: 12 }}
            >
              <Sparkles size={13} /> Gửi giao dịch Test SePay
            </button>
          </div>
        </div>

        <div className="ar-field ar-form-grid-full">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <label style={{ margin: 0 }}>
              Khóa API Key bảo mật SePay (tối thiểu 16 ký tự, dùng chung trên my.sepay.vn)
            </label>
            <button
              type="button"
              onClick={generateRandomApiKey}
              style={{
                border: 'none',
                background: 'none',
                color: '#059669',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <KeyRound size={13} /> Tạo khóa ngẫu nhiên & Sao chép
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type={showKeyPlain ? 'text' : 'password'}
              autoComplete="off"
              value={key}
              placeholder="Nhập hoặc bấm 'Tạo khóa ngẫu nhiên' (tối thiểu 16 ký tự)..."
              minLength={16}
              onChange={(e) => setKey(e.target.value)}
              style={{ flex: 1, fontFamily: showKeyPlain ? 'monospace' : 'inherit' }}
            />
            <button
              type="button"
              className="ar-btn-primary"
              disabled={busy || key.length < 16}
              onClick={() =>
                act({ action: 'set-key', key }, 'Đã lưu khóa API Key cổng SePay thành công!')
              }
            >
              Lưu khóa SePay
            </button>
            {configured && (
              <button
                type="button"
                className="ar-btn-secondary"
                disabled={busy}
                onClick={() => act({ action: 'clear-key' }, 'Đã ngắt khóa Webhook SePay')}
              >
                Ngắt kết nối
              </button>
            )}
          </div>
          {copiedKey && (
            <small style={{ color: '#059669', fontWeight: 600 }}>
              ✓ Đã tạo và sao chép khóa vào bộ nhớ tạm. Hãy dán khóa này vào mục API Key trên
              my.sepay.vn và bấm &ldquo;Lưu khóa SePay&rdquo;.
            </small>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#dcfce7',
            color: '#166534',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          ✓ {notice}
        </div>
      )}
      {error && (
        <div className="error-box" role="alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      {/* Recent SePay Webhook Transactions Table */}
      <div style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 13.5, color: '#0f172a' }}>
            Nhật ký giao dịch báo có từ SePay gần đây ({transactions.length})
          </strong>
          <button
            type="button"
            className="ar-btn-secondary"
            onClick={load}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            <RefreshCw size={12} /> Làm mới
          </button>
        </div>

        <table className="ar-settings-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Số tiền</th>
              <th>Mã đơn (SGG)</th>
              <th>Nội dung chuyển khoản</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 8).map((tx) => (
              <tr key={tx.id}>
                <td>
                  {new Date(tx.tx_time).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>
                  <strong style={{ color: '#059669' }}>{money(tx.amount)}</strong>
                </td>
                <td>
                  {tx.code ? (
                    <code
                      style={{
                        background: '#ecfdf5',
                        color: '#047857',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      {tx.code}
                    </code>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.content}
                </td>
                <td>
                  {tx.status === 'used' ? (
                    <span className="ar-badge-status ar-badge-success">
                      <CheckCircle2 size={12} style={{ display: 'inline' }} /> Đã gạch nợ
                    </span>
                  ) : tx.status === 'ignored' ? (
                    <span className="ar-badge-status ar-badge-warning">Đã bỏ qua</span>
                  ) : (
                    <span className="ar-badge-status ar-badge-info">Chờ khớp đơn</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {tx.status === 'received' && (
                    <button
                      type="button"
                      className="ar-btn-secondary"
                      disabled={busy}
                      style={{ padding: '3px 8px', fontSize: 11.5 }}
                      onClick={() =>
                        act({ action: 'ignore', id: tx.id }, 'Đã đánh dấu bỏ qua giao dịch')
                      }
                    >
                      <XCircle size={12} /> Bỏ qua
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>
                  Chưa có giao dịch báo có nào. Bấm &ldquo;Gửi giao dịch Test SePay&rdquo; để kiểm
                  tra luồng nhận tiền tự động.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
