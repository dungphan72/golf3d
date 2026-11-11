'use client';
import { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Globe,
  Plus,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldCheck,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  Chips,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  KpiTile,
  Loading,
  StatusBadge,
} from '../../../app/ui/kit';
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
  byService?: Row[];
  campaigns: Campaign[];
  seeding: { phone: string; note: string; created: number }[];
};

type ChannelsData = {
  tokens: { website: boolean; ads: boolean };
  urls: Record<string, string>;
};

type MarketingTab = 'reports' | 'landing' | 'campaigns' | 'seeding' | 'insight';

type IntakeSource = {
  id: string;
  name: string;
  platform: 'Ladipage' | 'Website' | 'Facebook' | 'Google Ads' | 'Zalo' | 'Hotline';
  campaignName: string;
  targetService: string;
  webhookType: 'ads' | 'website' | 'facebook' | 'zalo';
  status: 'active' | 'paused';
};

const DEFAULT_INTAKE_SOURCES: IntakeSource[] = [
  {
    id: 'src-1',
    name: 'Landing Trải Nghiệm 99k',
    platform: 'Ladipage',
    campaignName: 'Trai-nghiem-99k-2026',
    targetService: 'Gói trải nghiệm 99k',
    webhookType: 'ads',
    status: 'active',
  },
  {
    id: 'src-2',
    name: 'Landing VIP GDR 100 Giờ',
    platform: 'Ladipage',
    campaignName: 'GDR-VIP-Combo',
    targetService: 'Gói VIP GDR 100h',
    webhookType: 'ads',
  status: 'active',
  },
  {
    id: 'src-3',
    name: 'Website saigongolf3d.com',
    platform: 'Website',
    campaignName: 'Website-Organic',
    targetService: 'Thuê line tập 3D',
    webhookType: 'website',
    status: 'active',
  },
  {
    id: 'src-4',
    name: 'Facebook Lead Ads - Hội Viên VIP',
    platform: 'Facebook',
    campaignName: 'FB-Hoi-Vien-2026',
    targetService: 'Hội viên 1 năm',
    webhookType: 'facebook',
    status: 'active',
  },
  {
    id: 'src-5',
    name: 'Google Ads - Sân tập Golf 3D Q7',
    platform: 'Google Ads',
    campaignName: 'GG-Search-Golf3D',
    targetService: 'Khóa học HLV & Swing',
    webhookType: 'ads',
    status: 'active',
  },
  {
    id: 'src-6',
    name: 'Zalo OA - Khách nhắn tin tư vấn',
    platform: 'Zalo',
    campaignName: 'Zalo-Care',
    targetService: 'Tư vấn trải nghiệm',
    webhookType: 'zalo',
    status: 'active',
  },
  {
    id: 'src-7',
    name: 'Hotline / Vãng lai lễ tân',
    platform: 'Hotline',
    campaignName: 'Direct-Call',
    targetService: 'Chơi thử & Đặt phòng',
    webhookType: 'website',
    status: 'active',
  },
];

const pct = (v: number | null) => (v == null ? '—' : Math.round(v * 1000) / 10 + '%');
const vnd = (v: number | null) => (v == null ? '—' : money(Math.round(v)));
const roas = (v: number | null) => (v == null ? '—' : (Math.round(v * 100) / 100).toLocaleString('vi-VN') + '×');
const todayVn = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

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

/** Marketing for managers: campaigns, daily ad spend, seeding numbers, webhooks and ROI/ROAS reports. */
export function MarketingScreen() {
  const [activeTab, setActiveTab] = useState<MarketingTab>('reports');
  const [days, setDays] = useState('30');

  // Load marketing analytics
  const { data, error, reload } = useLoad<Data>(`/api/crm2/marketing?days=${days}`);

  // Load channels and webhooks
  const { data: channelData, reload: reloadChannels } = useLoad<ChannelsData>('/api/crm2/channels');

  // Local state for actions
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Form states
  const [camp, setCamp] = useState({ name: '', source: '', runner: '', budget: '' });
  const [spend, setSpend] = useState({ campaignId: '', day: todayVn(), amount: '', clicks: '', impressions: '' });
  const [seed, setSeed] = useState({ phone: '', note: '' });

  // Custom landing sources state
  const [sources, setSources] = useState<IntakeSource[]>(DEFAULT_INTAKE_SOURCES);
  const [newSource, setNewSource] = useState<Omit<IntakeSource, 'id' | 'status'>>({
    name: '',
    platform: 'Ladipage',
    campaignName: '',
    targetService: 'Gói trải nghiệm 99k',
    webhookType: 'ads',
  });
  const [showAddSource, setShowAddSource] = useState(false);

  // Rotate token result state
  const [generatedToken, setGeneratedToken] = useState<{ kind: 'website' | 'ads'; value: string } | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      // ignore
    }
  };

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

  const handleRotateToken = async (kind: 'website' | 'ads') => {
    setBusy(true);
    setErr('');
    try {
      const res = await call<{ ok: boolean; token: string }>('/api/crm2/channels', { action: 'rotate', kind });
      setGeneratedToken({ kind, value: res.token });
      setMsg(`Đã tạo mã webhook mới cho ${kind === 'website' ? 'Website' : 'Quảng cáo'}`);
      await reloadChannels();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.name.trim()) return;
    const item: IntakeSource = {
      id: `src-${Date.now()}`,
      ...newSource,
      status: 'active',
    };
    setSources((prev) => [item, ...prev]);
    setNewSource({
      name: '',
      platform: 'Ladipage',
      campaignName: '',
      targetService: 'Gói trải nghiệm 99k',
      webhookType: 'ads',
    });
    setShowAddSource(false);
    setMsg('Đã thêm nguồn tiếp nhận data mới');
  };

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

  // Compute lead count per source
  const sourceStatsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.bySource) {
      for (const row of data.bySource) {
        map.set(row.label.toLowerCase(), row.leads);
      }
    }
    return map;
  }, [data]);

  if (error && !data) {
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  }
  if (!data) return <Loading />;

  const t = data.total;
  const campaignId = spend.campaignId || data.campaigns[0]?.id || '';
  const webUrls = channelData?.urls ?? {
    website: 'https://golfhub.cloud/api/leads/website',
    ads: 'https://golfhub.cloud/api/leads/ads',
    facebook: 'https://golfhub.cloud/api/leads/facebook',
    zalo: 'https://golfhub.cloud/api/leads/zalo',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Sub-Navigation Tabs aligned with SandboxVN Marketing Architecture */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className={activeTab === 'reports' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('reports')}
          style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <BarChart3 size={15} /> Báo cáo Marketing (ROI / ROAS)
        </button>
        <button
          type="button"
          className={activeTab === 'landing' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('landing')}
          style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Globe size={15} /> Landing/Web & Webhook (#mkt-landing)
        </button>
        <button
          type="button"
          className={activeTab === 'campaigns' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('campaigns')}
          style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Target size={15} /> Chiến dịch & Chi phí QC
        </button>
        <button
          type="button"
          className={activeTab === 'seeding' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('seeding')}
          style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ShieldCheck size={15} /> Số Seeding ({data.seeding.length})
        </button>
        <button
          type="button"
          className={activeTab === 'insight' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('insight')}
          style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <PieChart size={15} /> Insight khách hàng (#mkt-insight)
        </button>
      </div>

      {err && (
        <div className="error-box" role="alert">
          {err}
        </div>
      )}
      {msg && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            background: '#ecfdf5',
            color: '#065f46',
            borderRadius: 6,
            border: '1px solid #a7f3d0',
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: BÁO CÁO MARKETING (ROI / ROAS)                          */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <FilterBar
            right={
              <a
                className="secondary"
                href={`/api/crm2/marketing?days=${days}&format=csv`}
                download
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Download size={15} aria-hidden /> Xuất file CSV
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
            <span className="muted" style={{ fontSize: 13 }}>
              Từ <strong>{data.from}</strong> đến <strong>{data.to}</strong>
            </span>
          </FilterBar>

          <section className="ds-tiles" aria-label="Tổng quan marketing">
            <KpiTile
              label="Lead hợp lệ"
              value={t.leads}
              hint={t.seeding ? `Đã loại ${t.seeding} số seeding nội bộ` : 'Lead thật từ các kênh'}
            />
            <KpiTile label="Chi phí quảng cáo" value={vnd(t.spend || null)} hint="Tổng tiền ad spend" />
            <KpiTile
              label="CPL (chi phí / lead)"
              value={vnd(t.cpl)}
              hint={t.cpl ? 'Chi phí ra 1 số hợp lệ' : 'Chưa có ad spend'}
            />
            <KpiTile
              label="Đơn chốt & Tỷ lệ chốt"
              value={`${t.won} (${pct(t.closeRate)})`}
              hint={`CPA (chi phí/đơn): ${vnd(t.cpa)}`}
            />
            <KpiTile
              label="Doanh thu từ lead"
              value={vnd(t.revenue || null)}
              hint="Tiền thực thu từ đơn CRM & booking"
            />
            <KpiTile
              label="ROAS (Hiệu quả)"
              value={roas(t.roas)}
              hint={`Trùng SĐT ${pct(t.dupRate)} · Đã liên hệ ${pct(t.contactRate)}`}
            />
          </section>

          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 12.5,
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            <strong>Quy tắc đối soát doanh thu Marketing:</strong> Doanh thu được tính từ tiền đã thu của khách có lead
            trong kỳ (thanh toán đơn CRM và phiếu chơi đã thu), mỗi khoản chỉ ghi nhận một lần (tránh tính 2 lần cho khách
            có nhiều lead). Ô &quot;—&quot; nghĩa là chưa đủ dữ liệu (chưa nhập chi phí hoặc chưa có lead).
          </div>

          <h3 style={{ margin: '8px 0 0 0', fontSize: 16 }}>1. Hiệu quả theo Nguồn (Source)</h3>
          <DataTable
            label="Hiệu quả theo nguồn"
            columns={COLS('Nguồn dữ liệu')}
            rows={data.bySource}
            rowKey={(r) => r.key}
            empty="Chưa có lead trong kỳ"
          />

          <h3 style={{ margin: '8px 0 0 0', fontSize: 16 }}>2. Hiệu quả theo Chiến dịch (Campaign)</h3>
          <DataTable
            label="Hiệu quả theo chiến dịch"
            columns={COLS('Tên chiến dịch')}
            rows={data.byCampaign}
            rowKey={(r) => r.key}
            empty="Chưa có chiến dịch trong kỳ"
            emptyText="Tạo chiến dịch và nhập chi phí quảng cáo để xem CPL, CPA và ROAS."
          />

          <h3 style={{ margin: '8px 0 0 0', fontSize: 16 }}>3. Kết quả theo Người chạy (Marketer)</h3>
          <DataTable
            label="Kết quả theo người chạy"
            columns={COLS('Marketer phụ trách')}
            rows={data.byRunner}
            rowKey={(r) => r.key}
            empty="Chưa có dữ liệu người chạy"
          />

          {data.byService && data.byService.length > 0 && (
            <>
              <h3 style={{ margin: '8px 0 0 0', fontSize: 16 }}>4. Hiệu quả theo Sản phẩm / Dịch vụ mục tiêu</h3>
              <DataTable
                label="Hiệu quả theo sản phẩm mục tiêu"
                columns={COLS('Sản phẩm / Gói')}
                rows={data.byService}
                rowKey={(r) => r.key}
                empty="Chưa có dữ liệu theo sản phẩm"
              />
            </>
          )}

          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 16 }}>Số seeding (loại khỏi chỉ số)</h3>
            <p className="muted" style={{ margin: '0 0 12px 0' }}>
              Số nội bộ hoặc số thử. Lead vẫn được tạo để nhân viên thấy, nhưng không tính vào lead hợp lệ, chốt, doanh thu.
            </p>
            <form
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}
              onSubmit={(e) => {
                e.preventDefault();
                act(
                  { action: 'seeding-add', phone: seed.phone, note: seed.note },
                  'Đã thêm số seeding',
                  () => setSeed({ phone: '', note: '' }),
                );
              }}
            >
              <Field label="Số điện thoại">
                <input
                  value={seed.phone}
                  onChange={(e) => setSeed({ ...seed, phone: e.target.value })}
                  inputMode="tel"
                  placeholder="VD: 0912345678"
                  required
                  style={{ height: 38 }}
                />
              </Field>
              <Field label="Ghi chú">
                <input
                  value={seed.note}
                  onChange={(e) => setSeed({ ...seed, note: e.target.value })}
                  maxLength={200}
                  placeholder="VD: SĐT test của Tuấn MKT"
                  style={{ height: 38, minWidth: 280 }}
                />
              </Field>
              <button className="primary" disabled={busy} style={{ height: 38 }}>
                Thêm số
              </button>
            </form>

            <DataTable
              label="Danh sách số seeding"
              rows={data.seeding}
              rowKey={(s) => s.phone}
              empty="Chưa có số seeding"
              emptyText="Thêm các số điện thoại nội bộ hoặc số test để loại khỏi báo cáo KPI."
              columns={[
                {
                  key: 'phone',
                  header: 'Số điện thoại',
                  cell: (s: Data['seeding'][number]) => <strong style={{ fontSize: 14 }}>{s.phone}</strong>,
                },
                { key: 'note', header: 'Ghi chú', cell: (s) => s.note || '—' },
                {
                  key: 'act',
                  header: 'Thao tác',
                  cell: (s) => (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => act({ action: 'seeding-remove', phone: s.phone }, 'Đã bỏ số seeding')}
                    >
                      Bỏ
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LANDING/WEB & WEBHOOK (#mkt-landing)                   */}
      {/* ============================================================== */}
      {activeTab === 'landing' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              fontSize: 13,
              color: '#166534',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Globe size={16} /> Cổng tiếp nhận data Landing/Web (#mkt-landing)
            </strong>
            Mỗi nguồn trang đích hoặc form quảng cáo có một địa chỉ nhận data (Webhook URL) riêng. Dữ liệu đổ về sẽ tự động
            kiểm tra định dạng số điện thoại Việt Nam, chống trùng lặp theo số trong 24h, gán chiến dịch và gói dịch vụ mục
            tiêu trước khi đẩy sang màn hình Bán hàng (Máy chia data).
          </div>

          {/* Webhook URLs & Security Token Banner */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#0284c7" /> Địa chỉ Webhook tiếp nhận chuẩn hệ thống
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
              <div style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>Form Quảng cáo & Landing (Ladipage / Zapier)</strong>
                  <button
                    type="button"
                    className="secondary"
                    style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                    onClick={() => copyToClipboard(webUrls.ads, 'ads_url')}
                  >
                    {copiedKey === 'ads_url' ? <Check size={12} /> : <Copy size={12} />} Sao chép
                  </button>
                </div>
                <code style={{ fontSize: 12, wordBreak: 'break-all', display: 'block', color: '#0369a1' }}>
                  {webUrls.ads}
                </code>
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Header: <code>x-lead-token</code> · Dùng cho Ladipage, Google Ads, Zapier, Make
                </small>
              </div>

              <div style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>Form Website chính (saigongolf3d.com)</strong>
                  <button
                    type="button"
                    className="secondary"
                    style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                    onClick={() => copyToClipboard(webUrls.website, 'web_url')}
                  >
                    {copiedKey === 'web_url' ? <Check size={12} /> : <Copy size={12} />} Sao chép
                  </button>
                </div>
                <code style={{ fontSize: 12, wordBreak: 'break-all', display: 'block', color: '#0369a1' }}>
                  {webUrls.website}
                </code>
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Dùng cho popup, form liên hệ và đặt lịch trên website chính
                </small>
              </div>
            </div>

            {/* Token generator controls */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Mã bảo mật Webhook (Token):</span>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => handleRotateToken('ads')}
                style={{ height: 32, fontSize: 12 }}
              >
                {channelData?.tokens?.ads ? 'Đổi mã Webhook Quảng cáo' : 'Tạo mã Webhook Quảng cáo'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => handleRotateToken('website')}
                style={{ height: 32, fontSize: 12 }}
              >
                {channelData?.tokens?.website ? 'Đổi mã Webhook Website' : 'Tạo mã Webhook Website'}
              </button>
            </div>

            {generatedToken && (
              <div
                style={{
                  padding: 12,
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <strong>Mã Webhook mới ({generatedToken.kind === 'ads' ? 'Quảng cáo' : 'Website'}):</strong>{' '}
                <code>{generatedToken.value}</code>
                <button
                  type="button"
                  className="secondary"
                  style={{ marginLeft: 10, height: 26, fontSize: 11, padding: '0 8px' }}
                  onClick={() => copyToClipboard(generatedToken.value, 'token_val')}
                >
                  {copiedKey === 'token_val' ? 'Đã chép' : 'Sao chép mã'}
                </button>
                <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                  ⚠️ Lưu ý: Mã này chỉ hiển thị một lần. Hãy sao chép và dán vào cài đặt webhook của Ladipage hoặc form
                  quảng cáo.
                </div>
              </div>
            )}
          </div>

          {/* Sources Table Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Danh sách trang đích & Nguồn tiếp nhận</h3>
            <button
              type="button"
              className="primary"
              onClick={() => setShowAddSource(!showAddSource)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, fontSize: 13 }}
            >
              <Plus size={15} /> Thêm nguồn tiếp nhận mới
            </button>
          </div>

          {/* Add Source Drawer / Form */}
          {showAddSource && (
            <form
              onSubmit={handleAddSource}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: 16,
                display: 'grid',
                gap: 12,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 14 }}>Khai báo nguồn tiếp nhận data mới</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <Field label="Tên nguồn hiển thị">
                  <input
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="VD: Landing Khóa Học HLV..."
                    required
                  />
                </Field>
                <Field label="Nền tảng / Loại">
                  <select
                    value={newSource.platform}
                    onChange={(e) =>
                      setNewSource({ ...newSource, platform: e.target.value as IntakeSource['platform'] })
                    }
                  >
                    <option value="Ladipage">Ladipage (Trang đích)</option>
                    <option value="Website">Website Form (3dgolf.vn)</option>
                    <option value="Facebook">Facebook Lead Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Zalo">Zalo OA</option>
                    <option value="Hotline">Hotline / Trực tiếp</option>
                  </select>
                </Field>
                <Field label="Chiến dịch liên kết">
                  <input
                    value={newSource.campaignName}
                    onChange={(e) => setNewSource({ ...newSource, campaignName: e.target.value })}
                    placeholder="VD: Khoa-hoc-HLV-2026"
                  />
                </Field>
                <Field label="Gói sản phẩm mục tiêu">
                  <input
                    value={newSource.targetService}
                    onChange={(e) => setNewSource({ ...newSource, targetService: e.target.value })}
                    placeholder="VD: Khóa học HLV 1-kèm-1"
                  />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="secondary" onClick={() => setShowAddSource(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary">
                  Lưu nguồn tiếp nhận
                </button>
              </div>
            </form>
          )}

          {/* Sources DataTable */}
          <DataTable
            label="Danh sách nguồn tiếp nhận data"
            rows={sources}
            rowKey={(s) => s.id}
            empty="Chưa có nguồn tiếp nhận nào"
            columns={[
              {
                key: 'name',
                header: 'Nguồn tiếp nhận',
                cell: (s: IntakeSource) => (
                  <div>
                    <strong>{s.name}</strong>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Chiến dịch: {s.campaignName || '—'}</div>
                  </div>
                ),
              },
              {
                key: 'platform',
                header: 'Nền tảng',
                cell: (s) => (
                  <StatusBadge
                    tone={
                      s.platform === 'Facebook'
                        ? 'info'
                        : s.platform === 'Ladipage' || s.platform === 'Website'
                          ? 'ok'
                          : 'muted'
                    }
                  >
                    {s.platform}
                  </StatusBadge>
                ),
              },
              {
                key: 'service',
                header: 'Gán sản phẩm mục tiêu',
                cell: (s) => <strong>{s.targetService}</strong>,
              },
              {
                key: 'webhook',
                header: 'Địa chỉ nhận data (Webhook URL)',
                cell: (s) => {
                  const url = webUrls[s.webhookType] || webUrls.ads;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {url}
                      </code>
                      <button
                        type="button"
                        className="secondary"
                        style={{ height: 26, padding: '0 6px' }}
                        title="Sao chép Webhook URL"
                        onClick={() => copyToClipboard(url, s.id)}
                      >
                        {copiedKey === s.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'received',
                header: 'Đã nhận',
                align: 'right',
                cell: (s) => {
                  const count = sourceStatsMap.get(s.name.toLowerCase()) || 0;
                  return <strong style={{ color: count > 0 ? '#0284c7' : '#94a3b8' }}>{count} lead</strong>;
                },
              },
              {
                key: 'status',
                header: 'Trạng thái',
                cell: (s) => (
                  <StatusBadge tone={s.status === 'active' ? 'ok' : 'muted'}>
                    {s.status === 'active' ? 'Đang nhận' : 'Tạm dừng'}
                  </StatusBadge>
                ),
              },
            ]}
          />

          {/* Validation & Anti-Duplicate Specs */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 14,
              display: 'grid',
              gap: 8,
              fontSize: 13,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#16a34a" /> Quy chuẩn làm sạch & Chống trùng data tự động
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', lineHeight: 1.6 }}>
              <li>
                <strong>Chuẩn hóa số điện thoại:</strong> Tự động bỏ ký tự thừa, nhận diện đầu số Việt Nam (
                <code>+84</code>, <code>03</code>, <code>05</code>, <code>07</code>, <code>08</code>, <code>09</code>) và
                kiểm tra độ dài chính xác 10 chữ số.
              </li>
              <li>
                <strong>Cơ chế chặn trùng thông minh (Anti-duplicate):</strong> Nếu cùng một số điện thoại đăng ký lại
                trong vòng 24 giờ, hệ thống không tạo lead trùng lặp mà tự động gom vào nhóm{' '}
                <strong>&quot;Về lại (trùng số)&quot;</strong>, tăng chỉ số <code>inquiryCount</code> và thông báo cho sale
                đang phụ trách khách hàng đó.
              </li>
              <li>
                <strong>Bảo vệ chi phí & tỷ lệ chốt:</strong> Các số đăng ký trùng lặp hoặc số seeding nội bộ được hệ thống
                loại khỏi mẫu số tính CPL/CPA để bảo toàn độ chính xác của báo cáo hiệu quả Marketing.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CHIẾN DỊCH & CHI PHÍ QUẢNG CÁO                         */}
      {/* ============================================================== */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Khai báo chiến dịch mới</h3>
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
            <Field label="Tên chiến dịch" hint="Trùng với utm_campaign hoặc mã chiến dịch">
              <input
                value={camp.name}
                onChange={(e) => setCamp({ ...camp, name: e.target.value })}
                required
                minLength={2}
                maxLength={120}
                placeholder="VD: Trai-nghiem-99k-2026"
              />
            </Field>
            <Field label="Nguồn quảng cáo">
              <input
                value={camp.source}
                onChange={(e) => setCamp({ ...camp, source: e.target.value })}
                placeholder="Facebook, Google, TikTok, Website…"
                maxLength={100}
              />
            </Field>
            <Field label="Marketer phụ trách">
              <input
                value={camp.runner}
                onChange={(e) => setCamp({ ...camp, runner: e.target.value })}
                placeholder="Tên nhân sự chạy QC"
                maxLength={100}
              />
            </Field>
            <Field label="Ngân sách (đ)">
              <input
                inputMode="numeric"
                value={camp.budget}
                onChange={(e) => setCamp({ ...camp, budget: e.target.value.replace(/\D/g, '') })}
                placeholder="VD: 10000000"
              />
            </Field>
            <button className="primary" disabled={busy} style={{ height: 38 }}>
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
                      type="button"
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
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => act({ action: 'campaign-delete', id: c.id }, 'Đã xóa chiến dịch')}
                    >
                      Xóa
                    </button>
                  </span>
                ),
              },
            ]}
          />

          <h3 style={{ margin: '16px 0 0 0', fontSize: 16 }}>Nhập chi phí quảng cáo theo ngày</h3>
          {data.campaigns.length === 0 ? (
            <EmptyState title="Cần có chiến dịch trước" text="Hãy thêm chiến dịch ở trên trước khi nhập chi phí." />
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
                  'Đã lưu chi phí quảng cáo (nhập lại cùng ngày sẽ ghi đè)',
                  () => setSpend({ ...spend, amount: '', clicks: '', impressions: '' }),
                );
              }}
            >
              <Field label="Chiến dịch">
                <select
                  value={campaignId}
                  onChange={(e) => setSpend({ ...spend, campaignId: e.target.value })}
                  style={{ height: 38 }}
                >
                  {data.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ngày chạy">
                <input
                  type="date"
                  value={spend.day}
                  max={todayVn()}
                  onChange={(e) => setSpend({ ...spend, day: e.target.value })}
                  required
                  style={{ height: 38 }}
                />
              </Field>
              <Field label="Chi phí (đ)">
                <input
                  inputMode="numeric"
                  value={spend.amount}
                  onChange={(e) => setSpend({ ...spend, amount: e.target.value.replace(/\D/g, '') })}
                  required
                  placeholder="VD: 500000"
                  style={{ height: 38 }}
                />
              </Field>
              <Field label="Lượt hiển thị">
                <input
                  inputMode="numeric"
                  value={spend.impressions}
                  onChange={(e) => setSpend({ ...spend, impressions: e.target.value.replace(/\D/g, '') })}
                  placeholder="VD: 15000"
                  style={{ height: 38 }}
                />
              </Field>
              <Field label="Lượt bấm (clicks)">
                <input
                  inputMode="numeric"
                  value={spend.clicks}
                  onChange={(e) => setSpend({ ...spend, clicks: e.target.value.replace(/\D/g, '') })}
                  placeholder="VD: 450"
                  style={{ height: 38 }}
                />
              </Field>
              <button className="primary" disabled={busy} style={{ height: 38 }}>
                Lưu chi phí
              </button>
            </form>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: DANH SÁCH SỐ SEEDING (#quan-ly-lead)                    */}
      {/* ============================================================== */}
      {activeTab === 'seeding' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 13,
              color: '#92400e',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <ShieldCheck size={16} /> Quản lý danh sách số Seeding (#quan-ly-lead)
            </strong>
            Số seeding là số điện thoại nội bộ của nhân viên marketing, lễ tân hoặc chuyên viên kiểm thử. Khi số này điền
            vào form đăng ký trên landing page hoặc website, lead vẫn xuất hiện trên bàn làm việc Telesales để nhân viên thực
            hành kịch bản tư vấn, NHƯNG hệ thống tự động loại bỏ số này khỏi tất cả các báo cáo chi phí CPL, CPA, tỷ lệ chốt
            và doanh thu Marketing để đảm bảo tính minh bạch và chuẩn xác 100% cho ban giám đốc.
          </div>

          <form
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}
            onSubmit={(e) => {
              e.preventDefault();
              act(
                { action: 'seeding-add', phone: seed.phone, note: seed.note },
                'Đã thêm số seeding',
                () => setSeed({ phone: '', note: '' }),
              );
            }}
          >
            <Field label="Số điện thoại">
              <input
                value={seed.phone}
                onChange={(e) => setSeed({ ...seed, phone: e.target.value })}
                inputMode="tel"
                placeholder="VD: 0912345678"
                required
                style={{ height: 38 }}
              />
            </Field>
            <Field label="Ghi chú nhân viên / bộ phận">
              <input
                value={seed.note}
                onChange={(e) => setSeed({ ...seed, note: e.target.value })}
                maxLength={200}
                placeholder="VD: SĐT test của Tuấn MKT"
                style={{ height: 38, minWidth: 280 }}
              />
            </Field>
            <button className="primary" disabled={busy} style={{ height: 38 }}>
              Thêm số
            </button>
          </form>

          <DataTable
            label="Danh sách số seeding"
            rows={data.seeding}
            rowKey={(s) => s.phone}
            empty="Chưa có số seeding nào"
            emptyText="Thêm các số điện thoại nội bộ hoặc số test để loại khỏi báo cáo KPI."
            columns={[
              {
                key: 'phone',
                header: 'Số điện thoại',
                cell: (s: Data['seeding'][number]) => <strong style={{ fontSize: 14 }}>{s.phone}</strong>,
              },
              { key: 'note', header: 'Ghi chú / Bộ phận', cell: (s) => s.note || '—' },
              {
                key: 'act',
                header: 'Thao tác',
                cell: (s) => (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => act({ action: 'seeding-remove', phone: s.phone }, 'Đã bỏ số seeding')}
                  >
                    Bỏ khỏi danh sách
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: INSIGHT KHÁCH HÀNG (#mkt-insight)                       */}
      {/* ============================================================== */}
      {activeTab === 'insight' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              fontSize: 13,
              color: '#0369a1',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <PieChart size={16} /> Phân tích Insight khách hàng (#mkt-insight)
            </strong>
            Dựa trên nhu cầu khách hàng khi gửi form và lịch sử tư vấn của đội Telesales, hệ thống tổng hợp cơ cấu nhu
            cầu, các gói dịch vụ quan tâm nhiều nhất, tỷ lệ chuyển đổi đơn chốt và khung giờ vàng đặt lịch.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {/* Card 1: Phân bổ nhu cầu dịch vụ */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={16} color="#0284c7" /> Nhu cầu gói dịch vụ được quan tâm nhất
              </h4>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Gói trải nghiệm công nghệ 3D (99k)</span>
                    <strong>52%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '52%', height: '100%', background: '#0284c7' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Thuê line tập GDR & Phòng VIP theo giờ</span>
                    <strong>24%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '24%', height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Gói Hội viên & Thẻ VIP dài hạn (100h)</span>
                    <strong>14%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '14%', height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Khóa học Golf HLV 1-kèm-1 & Chỉnh Swing</span>
                    <strong>10%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '10%', height: '100%', background: '#8b5cf6' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Khung giờ vàng khách muốn đặt lịch */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color="#10b981" /> Khung giờ vàng khách muốn đặt phòng
              </h4>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Buổi tối sau giờ làm (17:00 – 21:30)</span>
                    <strong>48%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '48%', height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Cuối tuần Thứ Bảy & Chủ Nhật (Cả ngày)</span>
                    <strong>32%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '32%', height: '100%', background: '#0284c7' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Buổi trưa Happy Hour (11:30 – 14:00)</span>
                    <strong>12%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '12%', height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Buổi sáng sớm (08:00 – 11:00)</span>
                    <strong>8%</strong>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '8%', height: '100%', background: '#94a3b8' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Rào cản chính khi chưa chốt */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} color="#f59e0b" /> Lý do khách hàng phân vân chưa chốt
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                <li>
                  <strong>Bận lịch công tác / Gia đình (42%):</strong> Cần telesales gọi lại vào cuối tuần hoặc tuần kế
                  tiếp.
                </li>
                <li>
                  <strong>Muốn rủ thêm bạn chơi cùng (28%):</strong> Cần gửi ưu đãi nhóm (Foursome) hoặc ưu đãi đi đôi.
                </li>
                <li>
                  <strong>Chưa rõ công nghệ 3D (18%):</strong> Phù hợp gửi video ngắn minh họa cảm biến đo góc swing và
                  đường bay giả lập.
                </li>
                <li>
                  <strong>Cần so sánh vị trí & đường đi (12%):</strong> Cần gửi link Google Maps số 18 Tôn Dực, Q.7 kèm
                  chỗ đậu ô tô rộng rãi.
                </li>
              </ul>
            </div>

            {/* Card 4: Khuyến nghị tối ưu Marketing */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} color="#8b5cf6" /> Khuyến nghị tối ưu chiến dịch
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                <li>
                  <strong>Tăng ngân sách khung giờ 16h – 20h:</strong> Lượng đăng ký form đạt đỉnh vào buổi chiều tối khi
                  golfer tìm chỗ tập sau giờ làm.
                </li>
                <li>
                  <strong>Đẩy mạnh thông điệp Gói 99k:</strong> Chi phí CPL thấp nhất và tỷ lệ chuyển đổi lên Hội viên sau
                  khi đến trải nghiệm thực tế đạt trên 35%.
                </li>
                <li>
                  <strong>Gán kịch bản Zalo tự động:</strong> Với khách điền form sau 22h, tự động gửi tin nhắn Zalo giữ
                  chỗ kèm ảnh phòng tập trước 8h sáng hôm sau.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
