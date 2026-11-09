'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Chips, DataTable, EmptyState, Field, FilterBar, KpiTile, Loading, StatusBadge } from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { call, errText } from './api';
import { useLoad } from './Screens';

type Row = {
  key: string;
  label: string;
  leads: number;
  seeding: number;
  duplicates: number;
  contacted: number;
  won: number;
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  dupRate: number | null;
  contactRate: number | null;
  closeRate: number | null;
};
type Campaign = {
  id: string;
  name: string;
  source: string;
  runner: string;
  budget: number;
  startsOn: string;
  endsOn: string;
  active: boolean;
};
type Data = {
  from: string;
  to: string;
  total: Row;
  bySource: Row[];
  byCampaign: Row[];
  byRunner: Row[];
  campaigns: Campaign[];
  seeding: { phone: string; note: string; created: number }[];
};

const pct = (v: number | null) => (v == null ? '—' : Math.round(v * 1000) / 10 + '%');
const vnd = (v: number | null) => (v == null ? '—' : money(Math.round(v)));
const roas = (v: number | null) => (v == null ? '—' : (Math.round(v * 100) / 100).toLocaleString('vi-VN') + '×');
const todayVn = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

const COLS = (name: string) =>
  [
    { key: 'label', header: name, cell: (r: Row) => <strong>{r.label}</strong> },
    { key: 'leads', header: 'Lead hợp lệ', align: 'right' as const, cell: (r: Row) => r.leads },
    { key: 'dup', header: 'Trùng', align: 'right' as const, hideOnPhone: true, cell: (r: Row) => pct(r.dupRate) },
    { key: 'contact', header: 'Đã liên hệ', align: 'right' as const, hideOnPhone: true, cell: (r: Row) => pct(r.contactRate) },
    { key: 'won', header: 'Chốt', align: 'right' as const, cell: (r: Row) => `${r.won} (${pct(r.closeRate)})` },
    { key: 'spend', header: 'Chi phí', align: 'right' as const, cell: (r: Row) => vnd(r.spend || null) },
    { key: 'cpl', header: 'CPL', align: 'right' as const, hideOnPhone: true, cell: (r: Row) => vnd(r.cpl) },
    { key: 'cpa', header: 'CPA', align: 'right' as const, hideOnPhone: true, cell: (r: Row) => vnd(r.cpa) },
    { key: 'rev', header: 'Doanh thu', align: 'right' as const, cell: (r: Row) => vnd(r.revenue || null) },
    { key: 'roas', header: 'ROAS', align: 'right' as const, cell: (r: Row) => roas(r.roas) },
  ];

/** Marketing for managers: campaigns, daily ad spend, seeding numbers and what each source costs and returns. */
export function MarketingScreen() {
  const [days, setDays] = useState('30');
  const { data, error, reload } = useLoad<Data>(`/api/crm2/marketing?days=${days}`);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [camp, setCamp] = useState({ name: '', source: '', runner: '', budget: '' });
  const [spend, setSpend] = useState({ campaignId: '', day: todayVn(), amount: '', clicks: '', impressions: '' });
  const [seed, setSeed] = useState({ phone: '', note: '' });

  async function act(body: Record<string, unknown>, ok: string, after?: () => void) {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      await call('/api/crm2/marketing', body);
      setMsg(ok);
      after?.();
      await reload();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }
  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const t = data.total;
  const campaignId = spend.campaignId || data.campaigns[0]?.id || '';

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <FilterBar
        right={
          <a className="secondary" href={`/api/crm2/marketing?days=${days}&format=csv`} download>
            <Download size={15} aria-hidden /> Tải CSV
          </a>
        }
      >
        <Chips
          value={days}
          onChange={setDays}
          options={[
            { key: '7', label: '7 ngày' },
            { key: '30', label: '30 ngày' },
            { key: '90', label: '90 ngày' },
          ]}
        />
        <span className="muted">
          {data.from} đến {data.to}
        </span>
      </FilterBar>
      {err && (
        <div className="error-box" role="alert">
          {err}
        </div>
      )}
      {msg && <div role="status">{msg}</div>}

      <section className="ds-tiles" aria-label="Tổng quan marketing">
        <KpiTile label="Lead hợp lệ" value={t.leads} hint={t.seeding ? `${t.seeding} số seeding bị loại` : undefined} />
        <KpiTile label="Chi phí quảng cáo" value={vnd(t.spend || null)} />
        <KpiTile label="CPL (chi phí / lead)" value={vnd(t.cpl)} />
        <KpiTile label="Chốt" value={`${t.won} (${pct(t.closeRate)})`} hint={`CPA ${vnd(t.cpa)}`} />
        <KpiTile label="Doanh thu từ lead" value={vnd(t.revenue || null)} />
        <KpiTile label="ROAS" value={roas(t.roas)} hint={`Trùng ${pct(t.dupRate)} · Liên hệ ${pct(t.contactRate)}`} />
      </section>
      <p className="muted" style={{ margin: 0 }}>
        Doanh thu là tiền đã thu của khách có lead trong kỳ (thanh toán đơn CRM và phiếu chơi đã thu), mỗi khoản chỉ
        tính một lần. Ô &quot;—&quot; nghĩa là chưa tính được (chưa nhập chi phí hoặc chưa có lead).
      </p>

      <h3>Theo nguồn</h3>
      <DataTable label="Hiệu quả theo nguồn" columns={COLS('Nguồn')} rows={data.bySource} rowKey={(r) => r.key} empty="Chưa có lead trong kỳ" />
      <h3>Theo chiến dịch</h3>
      <DataTable
        label="Hiệu quả theo chiến dịch"
        columns={COLS('Chiến dịch')}
        rows={data.byCampaign}
        rowKey={(r) => r.key}
        empty="Chưa có chiến dịch"
        emptyText="Thêm chiến dịch bên dưới, nhập chi phí mỗi ngày để tính CPL và ROAS."
      />
      <h3>Theo người chạy</h3>
      <DataTable label="Kết quả theo người chạy" columns={COLS('Người chạy')} rows={data.byRunner} rowKey={(r) => r.key} empty="Chưa có dữ liệu" />

      <h3>Chiến dịch</h3>
      <form
        className="ds-form-row"
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}
        onSubmit={(e) => {
          e.preventDefault();
          act(
            { action: 'campaign', name: camp.name, source: camp.source, runner: camp.runner, budget: num(camp.budget) },
            'Đã lưu chiến dịch',
            () => setCamp({ name: '', source: '', runner: '', budget: '' }),
          );
        }}
      >
        <Field label="Tên chiến dịch" hint="Trùng với mã chiến dịch của lead (utm/campaign)">
          <input value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Nguồn">
          <input value={camp.source} onChange={(e) => setCamp({ ...camp, source: e.target.value })} placeholder="Facebook, Website, Quảng cáo…" maxLength={100} />
        </Field>
        <Field label="Người chạy">
          <input value={camp.runner} onChange={(e) => setCamp({ ...camp, runner: e.target.value })} maxLength={100} />
        </Field>
        <Field label="Ngân sách (đ)">
          <input inputMode="numeric" value={camp.budget} onChange={(e) => setCamp({ ...camp, budget: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <button className="primary" disabled={busy}>
          Thêm chiến dịch
        </button>
      </form>
      <DataTable
        label="Danh sách chiến dịch"
        rows={data.campaigns}
        rowKey={(c) => c.id}
        empty="Chưa có chiến dịch"
        columns={[
          { key: 'name', header: 'Chiến dịch', cell: (c: Campaign) => <strong>{c.name}</strong> },
          { key: 'source', header: 'Nguồn', cell: (c) => c.source || '—' },
          { key: 'runner', header: 'Người chạy', hideOnPhone: true, cell: (c) => c.runner || '—' },
          { key: 'budget', header: 'Ngân sách', align: 'right', hideOnPhone: true, cell: (c) => vnd(c.budget || null) },
          {
            key: 'state',
            header: 'Trạng thái',
            cell: (c) => <StatusBadge tone={c.active ? 'ok' : 'muted'}>{c.active ? 'Đang chạy' : 'Đã tắt'}</StatusBadge>,
          },
          {
            key: 'act',
            header: 'Thao tác',
            cell: (c) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(
                      {
                        action: 'campaign',
                        id: c.id,
                        name: c.name,
                        source: c.source,
                        runner: c.runner,
                        budget: c.budget,
                        startsOn: c.startsOn,
                        endsOn: c.endsOn,
                        active: !c.active,
                      },
                      c.active ? 'Đã tắt chiến dịch' : 'Đã bật chiến dịch',
                    )
                  }
                >
                  {c.active ? 'Tắt' : 'Bật'}
                </button>
                <button className="secondary" disabled={busy} onClick={() => act({ action: 'campaign-delete', id: c.id }, 'Đã xóa chiến dịch')}>
                  Xóa
                </button>
              </span>
            ),
          },
        ]}
      />

      <h3>Nhập chi phí quảng cáo theo ngày</h3>
      {data.campaigns.length === 0 ? (
        <EmptyState title="Cần có chiến dịch trước" text="Thêm chiến dịch ở trên, rồi nhập chi phí từng ngày." />
      ) : (
        <form
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}
          onSubmit={(e) => {
            e.preventDefault();
            act(
              {
                action: 'spend',
                campaignId,
                day: spend.day,
                amount: num(spend.amount),
                clicks: num(spend.clicks),
                impressions: num(spend.impressions),
              },
              'Đã lưu chi phí (nhập lại cùng ngày sẽ ghi đè)',
              () => setSpend({ ...spend, amount: '', clicks: '', impressions: '' }),
            );
          }}
        >
          <Field label="Chiến dịch">
            <select value={campaignId} onChange={(e) => setSpend({ ...spend, campaignId: e.target.value })}>
              {data.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngày">
            <input type="date" value={spend.day} max={todayVn()} onChange={(e) => setSpend({ ...spend, day: e.target.value })} required />
          </Field>
          <Field label="Chi phí (đ)">
            <input inputMode="numeric" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: e.target.value.replace(/\D/g, '') })} required />
          </Field>
          <Field label="Lượt hiển thị">
            <input inputMode="numeric" value={spend.impressions} onChange={(e) => setSpend({ ...spend, impressions: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Lượt bấm">
            <input inputMode="numeric" value={spend.clicks} onChange={(e) => setSpend({ ...spend, clicks: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <button className="primary" disabled={busy}>
            Lưu chi phí
          </button>
        </form>
      )}

      <h3>Số seeding (loại khỏi chỉ số)</h3>
      <p className="muted" style={{ margin: 0 }}>
        Số nội bộ hoặc số thử. Lead vẫn được tạo để nhân viên thấy, nhưng không tính vào lead hợp lệ, chốt, doanh thu.
      </p>
      <form
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}
        onSubmit={(e) => {
          e.preventDefault();
          act({ action: 'seeding-add', phone: seed.phone, note: seed.note }, 'Đã thêm số seeding', () => setSeed({ phone: '', note: '' }));
        }}
      >
        <Field label="Số điện thoại">
          <input value={seed.phone} onChange={(e) => setSeed({ ...seed, phone: e.target.value })} inputMode="tel" required />
        </Field>
        <Field label="Ghi chú">
          <input value={seed.note} onChange={(e) => setSeed({ ...seed, note: e.target.value })} maxLength={200} />
        </Field>
        <button className="primary" disabled={busy}>
          Thêm số
        </button>
      </form>
      <DataTable
        label="Danh sách số seeding"
        rows={data.seeding}
        rowKey={(s) => s.phone}
        empty="Chưa có số seeding"
        columns={[
          { key: 'phone', header: 'Số', cell: (s: Data['seeding'][number]) => s.phone },
          { key: 'note', header: 'Ghi chú', cell: (s) => s.note || '—' },
          {
            key: 'act',
            header: 'Thao tác',
            cell: (s) => (
              <button className="secondary" disabled={busy} onClick={() => act({ action: 'seeding-remove', phone: s.phone }, 'Đã bỏ số seeding')}>
                Bỏ
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
