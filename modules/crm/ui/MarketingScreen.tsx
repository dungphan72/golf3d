'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Card,
  Chips,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  KpiTile,
  Loading,
  PageTabs,
  StatusBadge,
} from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { call, errText } from './api';
import { BlockedScreen } from './BlockedScreen';
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

type Seed = { phone: string; note: string; created: number };

type Data = {
  from: string;
  to: string;
  total: Row;
  bySource: Row[];
  byCampaign: Row[];
  byRunner: Row[];
  byService?: Row[];
  campaigns: Campaign[];
  seeding: Seed[];
};

const pct = (v: number | null) => (v == null ? '—' : Math.round(v * 1000) / 10 + '%');
const vnd = (v: number | null) => (v == null ? '—' : money(Math.round(v)));
const roas = (v: number | null) => (v == null ? '—' : (Math.round(v * 100) / 100).toLocaleString('vi-VN') + '×');
const todayVn = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const digits = (v: string) => v.replace(/\D/g, '');
const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

const COLS = (name: string) => [
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

type Tab = 'reports' | 'campaigns' | 'seeding' | 'blocked';

/** Marketing for managers: source/campaign results (CPL, CPA, ROAS), campaigns with daily ad spend, seeding and blocked numbers. */
export function MarketingScreen() {
  const [tab, setTab] = useState<Tab>('reports');
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

  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;

  const t = data.total;
  const campaignId = spend.campaignId || data.campaigns[0]?.id || '';

  const seedingCard = (
    <Card title="Số seeding" sub="Số nội bộ hoặc số thử. Lead vẫn được tạo cho nhân viên thấy, nhưng không tính vào lead hợp lệ, chốt, doanh thu.">
      <form
        className="crm-actions"
        onSubmit={(e) => {
          e.preventDefault();
          void act({ action: 'seeding-add', phone: seed.phone, note: seed.note }, 'Đã thêm số seeding', () =>
            setSeed({ phone: '', note: '' }),
          );
        }}
      >
        <Field label="Số điện thoại">
          <input value={seed.phone} onChange={(e) => setSeed({ ...seed, phone: e.target.value })} inputMode="tel" placeholder="0912345678" required />
        </Field>
        <Field label="Ghi chú">
          <input value={seed.note} onChange={(e) => setSeed({ ...seed, note: e.target.value })} maxLength={200} placeholder="SĐT test của nhân viên marketing" />
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
        emptyText="Thêm số điện thoại nội bộ hoặc số test để loại khỏi báo cáo."
        columns={[
          { key: 'phone', header: 'Số điện thoại', cell: (s: Seed) => <strong className="tnum">{s.phone}</strong> },
          { key: 'note', header: 'Ghi chú', cell: (s: Seed) => s.note || '—' },
          {
            key: 'act',
            header: '',
            cell: (s: Seed) => (
              <button className="secondary" disabled={busy} onClick={() => void act({ action: 'seeding-remove', phone: s.phone }, 'Đã bỏ số seeding')}>
                Bỏ
              </button>
            ),
          },
        ]}
      />
    </Card>
  );

  return (
    <>
      <PageTabs
        value={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'reports', label: 'Hiệu quả nguồn' },
          { key: 'campaigns', label: 'Chiến dịch & chi phí' },
          { key: 'seeding', label: 'Số seeding', count: data.seeding.length },
          { key: 'blocked', label: 'Số bị chặn' },
        ]}
      />
      {err && (
        <div className="error-box" role="alert">
          {err}
        </div>
      )}
      {msg && (
        <div role="status" className="notice-box">
          {msg}
        </div>
      )}

      {tab === 'reports' && (
        <>
          <FilterBar
            right={
              <a className="secondary" href={`/api/crm2/marketing?days=${days}&format=csv`} download>
                <Download size={15} aria-hidden /> Xuất CSV
              </a>
            }
          >
            <Chips
              value={days}
              onChange={setDays}
              options={[
                { key: '7', label: '7 ngày qua' },
                { key: '30', label: '30 ngày qua' },
                { key: '90', label: '90 ngày qua' },
              ]}
            />
            <span className="muted">
              Từ <strong>{data.from}</strong> đến <strong>{data.to}</strong>
            </span>
          </FilterBar>
          <section className="ds-tiles" aria-label="Tổng quan marketing">
            <KpiTile label="Lead hợp lệ" value={t.leads} hint={t.seeding ? `Đã loại ${t.seeding} số seeding` : 'Lead thật từ các kênh'} />
            <KpiTile label="Chi phí quảng cáo" value={vnd(t.spend || null)} hint="Tổng tiền đã chi" />
            <KpiTile label="CPL" value={vnd(t.cpl)} hint={t.cpl ? 'Chi phí cho một lead hợp lệ' : 'Chưa có chi phí'} />
            <KpiTile label="Đơn chốt" value={`${t.won} (${pct(t.closeRate)})`} hint={`CPA: ${vnd(t.cpa)}`} />
            <KpiTile label="Doanh thu từ lead" value={vnd(t.revenue || null)} hint="Tiền đã thu từ đơn CRM và phiếu chơi" />
            <KpiTile label="ROAS" value={roas(t.roas)} hint={`Trùng số ${pct(t.dupRate)} · Đã liên hệ ${pct(t.contactRate)}`} />
          </section>
          <p className="muted">
            Doanh thu tính từ tiền đã thu của khách có lead trong kỳ, mỗi khoản ghi nhận một lần. Ô “—” nghĩa là chưa đủ dữ liệu.
          </p>
          <Card title="Theo nguồn">
            <DataTable label="Hiệu quả theo nguồn" columns={COLS('Nguồn')} rows={data.bySource} rowKey={(r) => r.key} empty="Chưa có lead trong kỳ" />
          </Card>
          <Card title="Theo chiến dịch">
            <DataTable
              label="Hiệu quả theo chiến dịch"
              columns={COLS('Chiến dịch')}
              rows={data.byCampaign}
              rowKey={(r) => r.key}
              empty="Chưa có chiến dịch trong kỳ"
              emptyText="Tạo chiến dịch và nhập chi phí để xem CPL, CPA và ROAS."
            />
          </Card>
          <Card title="Theo người chạy">
            <DataTable label="Kết quả theo người chạy" columns={COLS('Người chạy')} rows={data.byRunner} rowKey={(r) => r.key} empty="Chưa có dữ liệu người chạy" />
          </Card>
          {data.byService && data.byService.length > 0 && (
            <Card title="Theo dịch vụ quan tâm">
              <DataTable label="Hiệu quả theo dịch vụ" columns={COLS('Dịch vụ / gói')} rows={data.byService} rowKey={(r) => r.key} empty="Chưa có dữ liệu" />
            </Card>
          )}
        </>
      )}

      {tab === 'campaigns' && (
        <>
          <Card title="Khai báo chiến dịch" sub="Tên trùng với utm_campaign hoặc mã chiến dịch của quảng cáo.">
            <form
              className="crm-actions"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  { action: 'campaign', name: camp.name, source: camp.source, runner: camp.runner, budget: num(camp.budget) },
                  'Đã lưu chiến dịch',
                  () => setCamp({ name: '', source: '', runner: '', budget: '' }),
                );
              }}
            >
              <Field label="Tên chiến dịch">
                <input value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} required minLength={2} maxLength={120} placeholder="Trai-nghiem-99k-2026" />
              </Field>
              <Field label="Nguồn quảng cáo">
                <input value={camp.source} onChange={(e) => setCamp({ ...camp, source: e.target.value })} placeholder="Facebook, Google, TikTok…" maxLength={100} />
              </Field>
              <Field label="Người chạy">
                <input value={camp.runner} onChange={(e) => setCamp({ ...camp, runner: e.target.value })} maxLength={100} />
              </Field>
              <Field label="Ngân sách (đ)">
                <input inputMode="numeric" value={camp.budget} onChange={(e) => setCamp({ ...camp, budget: digits(e.target.value) })} />
              </Field>
              <button className="primary" disabled={busy}>
                Thêm chiến dịch
              </button>
            </form>
            <DataTable
              label="Danh sách chiến dịch"
              rows={data.campaigns}
              rowKey={(c) => c.id}
              empty="Chưa có chiến dịch nào"
              columns={[
                { key: 'name', header: 'Chiến dịch', cell: (c: Campaign) => <strong>{c.name}</strong> },
                { key: 'source', header: 'Nguồn', cell: (c: Campaign) => c.source || '—' },
                { key: 'runner', header: 'Người chạy', hideOnPhone: true, cell: (c: Campaign) => c.runner || '—' },
                { key: 'budget', header: 'Ngân sách', align: 'right', hideOnPhone: true, cell: (c: Campaign) => vnd(c.budget || null) },
                {
                  key: 'state',
                  header: 'Trạng thái',
                  cell: (c: Campaign) => <StatusBadge tone={c.active ? 'ok' : 'muted'}>{c.active ? 'Đang chạy' : 'Đã tắt'}</StatusBadge>,
                },
                {
                  key: 'act',
                  header: '',
                  cell: (c: Campaign) => (
                    <span className="crm-actions">
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            { action: 'campaign', id: c.id, name: c.name, source: c.source, runner: c.runner, budget: c.budget, startsOn: c.startsOn, endsOn: c.endsOn, active: !c.active },
                            c.active ? 'Đã tắt chiến dịch' : 'Đã bật chiến dịch',
                          )
                        }
                      >
                        {c.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button className="secondary" disabled={busy} onClick={() => void act({ action: 'campaign-delete', id: c.id }, 'Đã xóa chiến dịch')}>
                        Xóa
                      </button>
                    </span>
                  ),
                },
              ]}
            />
          </Card>
          <Card title="Chi phí quảng cáo theo ngày" sub="Nhập lại cùng một ngày sẽ ghi đè.">
            {data.campaigns.length === 0 ? (
              <EmptyState title="Cần có chiến dịch trước" text="Thêm chiến dịch ở trên trước khi nhập chi phí." />
            ) : (
              <form
                className="crm-actions"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(
                    { action: 'spend', campaignId, day: spend.day, amount: num(spend.amount), clicks: num(spend.clicks), impressions: num(spend.impressions) },
                    'Đã lưu chi phí quảng cáo (nhập lại cùng ngày sẽ ghi đè)',
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
                <Field label="Ngày chạy">
                  <input type="date" value={spend.day} max={todayVn()} onChange={(e) => setSpend({ ...spend, day: e.target.value })} required />
                </Field>
                <Field label="Chi phí (đ)">
                  <input inputMode="numeric" value={spend.amount} onChange={(e) => setSpend({ ...spend, amount: digits(e.target.value) })} required />
                </Field>
                <Field label="Lượt hiển thị">
                  <input inputMode="numeric" value={spend.impressions} onChange={(e) => setSpend({ ...spend, impressions: digits(e.target.value) })} />
                </Field>
                <Field label="Lượt bấm">
                  <input inputMode="numeric" value={spend.clicks} onChange={(e) => setSpend({ ...spend, clicks: digits(e.target.value) })} />
                </Field>
                <button className="primary" disabled={busy}>
                  Lưu chi phí
                </button>
              </form>
            )}
          </Card>
        </>
      )}

      {tab === 'seeding' && seedingCard}
      {tab === 'blocked' && <BlockedScreen />}
    </>
  );
}
