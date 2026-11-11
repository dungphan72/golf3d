'use client';
import { useState } from 'react';
import { Chips, DataTable, Loading } from '../../../app/ui/kit';
import { CAMPAIGN_CHANNELS, SEGMENTS, SEGMENT_NAMES, type CampaignChannel, type CampaignSegment } from '../core/campaigns';
import { call, errText, stamp, toMs } from './api';
import { MarketingScreen } from './MarketingScreen';
import { useLoad } from './Screens';

type Camp = {
  id: string;
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  sendAt: number;
  queued: number;
  cancelled: boolean;
  skipped: { noConsent: number; noContact: number };
  stats: Record<string, number>;
};
type Preview = { recipients: number; skipped: { noConsent: number; noContact: number }; configured: boolean };

const CHANNEL_NAMES: Record<CampaignChannel, string> = { email: 'Email', zalo: 'Zalo OA' };
const STATUS_NAMES: Record<string, string> = { pending: 'Chờ gửi', sent: 'Đã gửi', failed: 'Lỗi', cancelled: 'Đã hủy', expired: 'Hết hạn' };

/** Marketing space: cost/return report and bulk message campaigns. */
export function MarketingSpace() {
  const [tab, setTab] = useState('report');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { key: 'report', label: 'Hiệu quả marketing' },
          { key: 'campaigns', label: 'Chiến dịch tin nhắn' },
        ]}
      />
      {tab === 'report' ? <MarketingScreen /> : <CampaignsScreen />}
    </div>
  );
}

export function CampaignsScreen() {
  const { data, error, reload } = useLoad<{ campaigns: Camp[] }>('/api/crm2/campaigns', 30_000);
  const [f, setF] = useState({ name: '', channel: 'email' as CampaignChannel, segment: 'all' as CampaignSegment, subject: '', body: '', sendAt: '' });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (patch: Partial<typeof f>) => {
    setF({ ...f, ...patch });
    setPreview(null);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <p className="muted" style={{ margin: 0 }}>
        Chỉ gửi cho khách đã đồng ý nhận tin và có email hoặc Zalo ID. Dùng <code>{'{ten}'}</code> để chèn tên khách. Tin
        được xếp hàng và gửi qua cron; kênh chưa cấu hình sẽ chờ tới khi cấu hình xong.
      </p>
      <form
        aria-label="Tạo chiến dịch tin nhắn"
        style={{ display: 'grid', gap: 8, maxWidth: 640 }}
        onSubmit={(e) => e.preventDefault()}
      >
        <input aria-label="Tên chiến dịch" placeholder="Tên chiến dịch" value={f.name} onChange={(e) => change({ name: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="Kênh gửi" value={f.channel} onChange={(e) => change({ channel: e.target.value as CampaignChannel })}>
            {CAMPAIGN_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_NAMES[c]}
              </option>
            ))}
          </select>
          <select aria-label="Nhóm khách" value={f.segment} onChange={(e) => change({ segment: e.target.value as CampaignSegment })}>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_NAMES[s]}
              </option>
            ))}
          </select>
          <input aria-label="Giờ gửi (để trống là gửi ngay)" type="datetime-local" value={f.sendAt} onChange={(e) => change({ sendAt: e.target.value })} />
        </div>
        {f.channel === 'email' && (
          <input aria-label="Tiêu đề email" placeholder="Tiêu đề email" value={f.subject} onChange={(e) => change({ subject: e.target.value })} />
        )}
        <textarea aria-label="Nội dung tin" rows={5} placeholder="Nội dung tin, ví dụ: Chào {ten}, ..." value={f.body} onChange={(e) => change({ body: e.target.value })} />
        {preview && (
          <div role="status">
            Sẽ gửi cho <strong>{preview.recipients}</strong> khách
            {preview.skipped.noConsent + preview.skipped.noContact > 0 &&
              ` (bỏ qua ${preview.skipped.noConsent} khách chưa đồng ý nhận tin, ${preview.skipped.noContact} khách thiếu liên lạc)`}
            .{!preview.configured && ' Kênh này chưa được cấu hình: tin sẽ chờ tới khi cấu hình xong.'}
          </div>
        )}
        {msg && (
          <div className="error-box" role="alert">
            {msg}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => setPreview(await call<Preview>('/api/crm2/campaigns', { action: 'preview', channel: f.channel, segment: f.segment })))
            }
          >
            Đếm người nhận
          </button>
          <button
            type="button"
            disabled={busy || !preview || preview.recipients === 0}
            onClick={() =>
              run(async () => {
                const r = await call<{ queued: number }>('/api/crm2/campaigns', {
                  action: 'send',
                  name: f.name,
                  channel: f.channel,
                  segment: f.segment,
                  subject: f.subject,
                  body: f.body,
                  sendAt: f.sendAt ? toMs(f.sendAt) : null,
                });
                setMsg('');
                setPreview(null);
                setF({ ...f, name: '', subject: '', body: '', sendAt: '' });
                alert(`Đã xếp hàng ${r.queued} tin`);
                reload();
              })
            }
          >
            {f.sendAt ? 'Đặt lịch gửi' : 'Gửi ngay'}
          </button>
        </div>
      </form>
      <h3>Các chiến dịch gần đây</h3>
      <DataTable
        label="Chiến dịch tin nhắn"
        rows={data.campaigns}
        rowKey={(r) => r.id}
        empty="Chưa có chiến dịch nào"
        columns={[
          { key: 'n', header: 'Tên', cell: (r) => <strong>{r.name}</strong> },
          { key: 'c', header: 'Kênh', cell: (r) => CHANNEL_NAMES[r.channel] },
          { key: 's', header: 'Nhóm', cell: (r) => SEGMENT_NAMES[r.segment] },
          { key: 't', header: 'Giờ gửi', cell: (r) => stamp(r.sendAt) },
          {
            key: 'st',
            header: 'Trạng thái từng tin',
            cell: (r) =>
              r.cancelled
                ? 'Đã hủy chiến dịch'
                : Object.entries(r.stats)
                    .map(([k, v]) => `${STATUS_NAMES[k] ?? k}: ${v}`)
                    .join(' · ') || '—',
          },
          {
            key: 'x',
            header: '',
            cell: (r) =>
              r.cancelled ? null : (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => run(async () => { await call('/api/crm2/campaigns', { action: 'cancel', id: r.id }); reload(); })}
                >
                  Hủy tin chưa gửi
                </button>
              ),
          },
        ]}
      />
    </div>
  );
}
