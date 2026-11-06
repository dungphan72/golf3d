'use client';
import { useCallback, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { askConfirm } from '../kit';
import { call, stamp } from './shared';

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
    subject: string;
    status: string;
    last_error: string;
    created: number;
  }[];
};
export function ChannelsView({ manager }: { manager: boolean }) {
  const [d, setD] = useState<Channels | null>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState<{ kind: string; value: string } | null>(null);
  const [copied, setCopied] = useState('');
  const load = useCallback(async () => {
    try {
      setD((await call('/api/crm/channels')) as unknown as Channels);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);
  if (!d) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  const copy = async (text: string, id: string) => {
    await navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };
  const count = (status: string) =>
    d.counts.filter((c) => c.status === status).reduce((n, c) => n + c.n, 0);
  return (
    <div className="crm-flows">
      <h3>Kênh nhận lead và gửi tin</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kênh</th>
              <th>Hướng</th>
              <th>Trạng thái</th>
              <th>Còn thiếu</th>
            </tr>
          </thead>
          <tbody>
            {d.channels.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.label}</strong>
                  <br />
                  <small>{c.note}</small>
                </td>
                <td>{c.direction === 'in' ? 'Nhận lead' : 'Gửi tin'}</td>
                <td>
                  <span className={'crm-chip ' + (c.configured ? 'seg-loyal' : 'seg-lapsing')}>
                    {c.configured ? 'Sẵn sàng' : 'Cần cấu hình'}
                  </span>
                </td>
                <td>{c.needs.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Địa chỉ webhook</h3>
      <ul className="crm-timeline">
        {Object.entries(d.urls).map(([k, u]) => (
          <li key={k}>
            <strong>{k}</strong>: <code>{u}</code>{' '}
            <button className="secondary" onClick={() => copy(u, k)}>
              {copied === k ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </li>
        ))}
      </ul>
      {manager && (
        <div className="crm-actions">
          {(['website', 'ads'] as const).map((kind) => (
            <button
              key={kind}
              className="secondary"
              onClick={async () => {
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
                  const v = (await call('/api/crm/channels', {
                    action: 'rotate',
                    kind,
                  })) as unknown as { token: string };
                  setToken({ kind, value: v.token });
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {d.tokens[kind] ? 'Tạo lại' : 'Tạo'} mã webhook{' '}
              {kind === 'website' ? 'Website (3dgolf.vn)' : 'Quảng cáo'}
            </button>
          ))}
        </div>
      )}
      {token && (
        <div className="crm-avail" role="status">
          <p>
            Mã webhook {token.kind === 'website' ? 'Website' : 'Quảng cáo'} (chỉ hiện một lần, hãy
            lưu lại; gửi trong header <code>x-lead-token</code>):
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lúc</th>
              <th>Kênh</th>
              <th>Gửi cho</th>
              <th>Loại</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {d.recent.slice(0, 30).map((m) => (
              <tr key={m.id}>
                <td>{stamp(m.created)}</td>
                <td>{m.channel}</td>
                <td>
                  {m.audience === 'staff' ? 'Nhân viên' : 'Khách'} · {m.recipient}
                </td>
                <td>{m.kind}</td>
                <td>
                  {m.status}
                  {m.last_error ? ` (${m.last_error})` : ''}
                </td>
              </tr>
            ))}
            {!d.recent.length && (
              <tr>
                <td colSpan={5}>Chưa có tin nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
