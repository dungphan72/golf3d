'use client';
import { useState } from 'react';
import { Check, Copy, Send, RefreshCw } from 'lucide-react';
import { askConfirm, DataTable, EmptyState, Loading, StatusBadge, type Tone } from '../../../app/ui/kit';
import { call, errText, stamp } from './api';
import { useLoad } from './Screens';

type Channels = {
  channels: {
    id: string;
    label: string;
    direction: 'in' | 'out';
    configured: boolean;
    needs: string[];
    note: string;
  }[];
  tokens: { website: boolean; ads: boolean };
  urls: Record<string, string>;
  counts: { channel: string; audience: string; status: string; n: number }[];
  recent: {
    id: string;
    channel: string;
    audience: string;
    kind: string;
    recipient: string;
    status: string;
    last_error: string;
    created: number;
  }[];
};

const URL_LABELS: Record<string, string> = {
  website: 'Form website (3dgolf.vn)',
  ads: 'Form quảng cáo',
  facebook: 'Facebook Lead Ads',
  zalo: 'Zalo OA',
};

const MSG_STATUS_LABELS: Record<string, string> = {
  sent: 'Đã gửi',
  pending: 'Đang chờ',
  failed: 'Thất bại',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
};

const MSG_STATUS_TONE: Record<string, Tone> = {
  sent: 'ok',
  pending: 'info',
  failed: 'warn',
  expired: 'muted',
  cancelled: 'muted',
};

const MSG_KIND_LABELS: Record<string, string> = {
  staff_assigned: 'Báo lead mới cho NV',
  welcome: 'Chào mừng khách mới',
  payment_thanks: 'Cảm ơn thanh toán',
  nps_survey: 'Khảo sát trải nghiệm',
  appointment_reminder: 'Nhắc lịch hẹn',
  booking_info: 'Xác nhận đặt lịch',
  reminder: 'Nhắc giờ chơi',
  winback_invite: 'Mời quay lại',
  package_expiring: 'Gói sắp hết hạn',
  package_hours_low: 'Gói sắp hết giờ',
  birthday_wish: 'Chúc mừng sinh nhật',
  points_expiring: 'Điểm sắp hết hạn',
  thanks: 'Cảm ơn sau chơi',
};

/** Managers: which channels are ready, the webhook addresses, webhook tokens, and what was sent to staff and customers. */
export function ChannelsScreen() {
  const { data, error, reload, setError } = useLoad<Channels>('/api/crm2/channels');
  const [token, setToken] = useState<{ kind: 'website' | 'ads'; value: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingBusy, setTestingBusy] = useState(false);

  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const d = data;
  const copy = async (text: string, id: string) => {
    await navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };
  const count = (status: string) =>
    d.counts.filter((c) => c.status === status).reduce((n, c) => n + c.n, 0);

  const rotate = async (kind: 'website' | 'ads') => {
    if (
      d.tokens[kind] &&
      !(await askConfirm({
        title: 'Tạo mã mới?',
        message: 'Tạo mã mới sẽ làm mã cũ ngừng hoạt động.',
        confirmLabel: 'Tạo mã mới',
      }))
    )
      return;
    try {
      const v = await call<{ token: string }>('/api/crm2/channels', { action: 'rotate', kind });
      setToken({ kind, value: v.token });
      reload();
    } catch (e) {
      setError(errText(e));
    }
  };

  const handleTestSend = async () => {
    if (!testingChannel) return;
    setTestingBusy(true);
    setTestResult(null);
    try {
      const res = await call<{ ok: boolean; message?: string }>('/api/crm2/channels', {
        action: 'test',
        channel: testingChannel,
        recipient: testRecipient,
      });
      setTestResult({ ok: true, msg: res.message || 'Kiểm tra kết nối thành công!' });
      setTestingChannel(null);
      setTestRecipient('');
      reload();
    } catch (e) {
      setTestResult({ ok: false, msg: errText(e) });
    } finally {
      setTestingBusy(false);
    }
  };

  return (
    <div className="settings-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {testResult && (
        <div
          className={testResult.ok ? 'info-strip' : 'error-box'}
          style={{ marginBottom: 16 }}
          role="status"
        >
          {testResult.ok ? '✓ ' : '✕ '}
          {testResult.msg}
        </div>
      )}

      <h3>Kênh nhận lead và gửi tin</h3>
      <DataTable
        label="Kênh nhận lead và gửi tin"
        columns={[
          {
            key: 'channel',
            header: 'Kênh',
            cell: (c: Channels['channels'][number]) => (
              <>
                <strong>{c.label}</strong>
                <small className="show-phone">{c.note}</small>
              </>
            ),
          },
          {
            key: 'dir',
            header: 'Hướng',
            cell: (c) => (c.direction === 'in' ? 'Nhận lead' : 'Gửi tin'),
          },
          {
            key: 'state',
            header: 'Trạng thái',
            cell: (c) => (
              <StatusBadge tone={c.configured ? 'ok' : 'warn'}>
                {c.configured ? 'Sẵn sàng' : 'Cần cấu hình'}
              </StatusBadge>
            ),
          },
          {
            key: 'needs',
            header: 'Mục còn thiếu',
            hideOnPhone: true,
            cell: (c) => (c.needs.length ? <span style={{ color: '#c0392b' }}>{c.needs.join(', ')}</span> : '—'),
          },
          {
            key: 'test',
            header: 'Kiểm tra',
            cell: (c) => {
              if (c.id === 'email-out') {
                return (
                  <button
                    className="secondary"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                    onClick={() => {
                      setTestingChannel('email');
                      setTestRecipient('');
                      setTestResult(null);
                    }}
                  >
                    Gửi thử email
                  </button>
                );
              }
              if (c.id === 'zalo-out') {
                return (
                  <button
                    className="secondary"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                    onClick={() => {
                      setTestingChannel('zalo');
                      setTestRecipient('');
                      setTestResult(null);
                    }}
                  >
                    Gửi thử Zalo
                  </button>
                );
              }
              if (c.id === 'facebook-in') {
                return (
                  <button
                    className="secondary"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                    onClick={() => {
                      setTestingChannel('facebook');
                      handleTestSend();
                    }}
                  >
                    Thử API
                  </button>
                );
              }
              return '—';
            },
          },
        ]}
        rows={d.channels}
        rowKey={(c) => c.id}
        empty="Chưa có kênh"
      />

      {testingChannel && testingChannel !== 'facebook' && (
        <div style={{ background: '#f8faf8', border: '1px solid #c2d6cb', borderRadius: 8, padding: 14, margin: '14px 0' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>
            Kiểm tra kết nối {testingChannel === 'email' ? 'Email' : 'Zalo OA'}
          </h4>
          <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#556b5e' }}>
            {testingChannel === 'email'
              ? 'Nhập địa chỉ email của bạn để gửi 1 thư thử nghiệm xác minh kết nối (không gửi khách thật):'
              : 'Nhập Zalo User ID của bạn để gửi 1 tin thử nghiệm:'}
          </p>
          <div className="crm-actions">
            <input
              type={testingChannel === 'email' ? 'email' : 'text'}
              placeholder={testingChannel === 'email' ? 'nhanvien@example.com' : 'Zalo User ID'}
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <button className="primary" disabled={testingBusy || !testRecipient.trim()} onClick={handleTestSend}>
              {testingBusy ? 'Đang gửi…' : 'Gửi thử ngay'}
            </button>
            <button className="secondary" onClick={() => setTestingChannel(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      <h3>Địa chỉ webhook</h3>
      <ul className="crm-timeline">
        {Object.entries(d.urls).map(([k, u]) => (
          <li key={k}>
            <strong>{URL_LABELS[k] ?? k}</strong>: <code>{u}</code>{' '}
            <button
              className="secondary"
              aria-label={'Sao chép địa chỉ ' + (URL_LABELS[k] ?? k)}
              onClick={() => copy(u, k)}
            >
              {copied === k ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </li>
        ))}
      </ul>
      <h3>Mã webhook</h3>
      <p className="form-note">
        Form website và form quảng cáo gửi kèm mã này trong header <code>x-lead-token</code>.
        Facebook và Zalo không dùng mã: chúng ký yêu cầu bằng khóa cấu hình ở máy chủ.
      </p>
      <div className="crm-actions">
        {(['website', 'ads'] as const).map((kind) => (
          <button key={kind} className="secondary" onClick={() => rotate(kind)}>
            {d.tokens[kind] ? 'Tạo lại' : 'Tạo'} mã webhook{' '}
            {kind === 'website' ? 'Website (3dgolf.vn)' : 'Quảng cáo'}
          </button>
        ))}
      </div>
      {token && (
        <div className="info-strip" role="status">
          <p>
            Mã webhook {token.kind === 'website' ? 'Website' : 'Quảng cáo'} (chỉ hiện một lần, hãy
            lưu lại):
          </p>
          <p className="crm-url">{token.value}</p>
          <button className="secondary" onClick={() => copy(token.value, 'token')}>
            {copied === 'token' ? 'Đã chép' : 'Sao chép mã'}
          </button>
        </div>
      )}
      <h3>Hàng gửi tin (7 ngày qua)</h3>
      <p>
        Đã gửi: <strong>{count('sent')}</strong> · Đang chờ:{' '}
        <strong>{count('pending')}</strong> · Lỗi: <strong>{count('failed')}</strong> · Hết hạn:{' '}
        {count('expired')} · Đã hủy: {count('cancelled')}
      </p>
      {d.recent.length ? (
        <DataTable
          label="Tin đã gửi gần đây"
          columns={[
            {
              key: 'when',
              header: 'Lúc',
              cell: (m: Channels['recent'][number]) => stamp(m.created),
            },
            { key: 'channel', header: 'Kênh', hideOnPhone: true, cell: (m) => m.channel.toUpperCase() },
            {
              key: 'to',
              header: 'Gửi cho',
              cell: (m) => `${m.audience === 'staff' ? 'Nhân viên' : 'Khách'} · ${m.recipient}`,
            },
            { key: 'kind', header: 'Loại tin', hideOnPhone: true, cell: (m) => MSG_KIND_LABELS[m.kind] || m.kind },
            {
              key: 'status',
              header: 'Trạng thái',
              cell: (m) => (
                <span>
                  <StatusBadge tone={MSG_STATUS_TONE[m.status] || 'neutral'}>
                    {MSG_STATUS_LABELS[m.status] || m.status}
                  </StatusBadge>
                  {m.last_error && <small style={{ color: '#c0392b', display: 'block' }}>{m.last_error}</small>}
                </span>
              ),
            },
          ]}
          rows={d.recent.slice(0, 30)}
          rowKey={(m) => m.id}
          empty="Chưa có tin nào"
        />
      ) : (
        <EmptyState title="Chưa có tin nào" />
      )}
    </div>
  );
}
