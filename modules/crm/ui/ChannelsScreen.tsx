'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { askConfirm, DataTable, EmptyState, Loading, StatusBadge } from '../../../app/ui/kit';
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

/** Managers: which channels are ready, the webhook addresses, webhook tokens, and what was sent to staff and customers. */
export function ChannelsScreen() {
  const { data, error, reload, setError } = useLoad<Channels>('/api/crm2/channels');
  const [token, setToken] = useState<{ kind: 'website' | 'ads'; value: string } | null>(null);
  const [copied, setCopied] = useState('');
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
  return (
    <div className="settings-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
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
            header: 'Còn thiếu',
            hideOnPhone: true,
            cell: (c) => c.needs.join(', ') || '—',
          },
          { key: 'note', header: 'Ghi chú', hideOnPhone: true, cell: (c) => c.note },
        ]}
        rows={d.channels}
        rowKey={(c) => c.id}
        empty="Chưa có kênh"
      />
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
        Đã gửi: <strong>{count('sent')}</strong> · Đang chờ (kênh chưa cấu hình hoặc chưa đến giờ):{' '}
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
            { key: 'channel', header: 'Kênh', hideOnPhone: true, cell: (m) => m.channel },
            {
              key: 'to',
              header: 'Gửi cho',
              cell: (m) => `${m.audience === 'staff' ? 'Nhân viên' : 'Khách'} · ${m.recipient}`,
            },
            { key: 'kind', header: 'Loại', hideOnPhone: true, cell: (m) => m.kind },
            {
              key: 'status',
              header: 'Trạng thái',
              cell: (m) => m.status + (m.last_error ? ` (${m.last_error})` : ''),
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
