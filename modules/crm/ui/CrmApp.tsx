'use client';
import { CareTasksView } from './CareTasks';
import { ViewLogScreen } from './ViewLogScreen';
import { BlockedScreen } from './BlockedScreen';
import { MarketingSpace } from './CampaignsScreen';
import { CareCustomersView } from './CareCustomers';
import { ReportScreen } from './ReportScreen';
import { CARE_RULES, type CareSettings } from '../core/care';
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Users,
  Target,
  GitFork,
  PhoneCall,
  Sparkles,
  Package,
  Layers,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  Share2,
} from 'lucide-react';
import { Chips, Loading, PageTabs } from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { call, errText, type Staff } from './api';
import { ChannelsScreen } from './ChannelsScreen';
import { LeadDetail } from './LeadDetail';
import { SalesStaffManager } from './SalesStaffManager';
import { LeadDistributionScreen } from './LeadDistributionScreen';
import {
  AppointmentsScreen,
  CustomersScreen,
  HoldsScreen,
  LeadsScreen,
  OrdersScreen,
  OverviewScreen,
  PoolScreen,
  TasksScreen,
  WorkScreen,
  useLoad,
  type Shared,
} from './Screens';

type Settings = {
  slaMinutes: number;
  holdHours: number;
  pool: {
    claimQuotaPerDay: number;
    recallHours: number;
    autoRecall: boolean;
    intakeMode: 'AUTO' | 'POOL';
  };
  calls: {
    retryHours: number[];
    thinkDays: number;
    interestedHours: number;
    metFollowUpHours: number;
  };
  workHours: { enabled: boolean; days: number[]; start: number; end: number };
  appointments: { requireApproval: boolean };
  afterSales: { enabled: boolean };
  notifyAssignEmail: boolean;
  care: CareSettings;
  websiteLeads: 'LEGACY' | 'CRM2';
  zaloLeads: 'LEGACY' | 'CRM2';
  facebookLeads: 'LEGACY' | 'CRM2';
  adsLeads: 'LEGACY' | 'CRM2';
  [k: string]: unknown;
};
type StaffExtra = {
  userId: string;
  team: string;
  isLeader: number;
  extension: string;
  zaloId: string;
  notifyEmail: string;
};
type Config = {
  settings: Settings;
  staff: Staff[];
  staffExtra: StaffExtra[];
  cron: { value: Record<string, unknown>; updated: number } | null;
  me: string;
  role: string;
};
type Product = {
  code: string;
  name: string;
  listPrice: number;
  limited: number;
  active: number;
  held: number;
};

/** The person's own switch: off while they are away, new leads go to colleagues or the pool. */
function DutyToggle() {
  const { data, error, reload } = useLoad<{ onDuty: boolean }>('/api/crm2/duty');
  if (!data) return error ? <span className="muted">{error}</span> : null;
  return (
    <div className="crm-top-bar">
      <div className="crm-brand-badge">
        <span className="crm-brand-icon">⛳</span>
        <span>CRM Saigon Golf 3D</span>
        <span className="crm-chip seg-loyal" style={{ margin: 0, fontSize: '11px' }}>
          Bán hàng & CSKH
        </span>
      </div>
      <div className="crm-duty">
        <button
          type="button"
          className={`crm-duty-btn ${data.onDuty ? 'active' : 'inactive'}`}
          aria-pressed={data.onDuty}
          onClick={async () => {
            await call('/api/crm2/duty', { onDuty: !data.onDuty });
            await reload();
          }}
        >
          <span className="crm-pulse-dot" />
          <span>{data.onDuty ? 'Đang trực: nhận lead mới' : 'Đang nghỉ: không nhận lead mới'}</span>
        </button>
      </div>
    </div>
  );
}

/** UI Helpers for CRM Settings */

function Switch({
  checked,
  onChange,
  'aria-label': ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  return (
    <label className="crm-switch-wrap">
      <input
        type="checkbox"
        className="crm-switch-input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="crm-switch-slider" />
    </label>
  );
}

function SettingRow({
  title,
  desc,
  children,
  badge,
}: {
  title: string;
  desc?: ReactNode;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="crm-setting-row">
      <div className="crm-setting-info">
        <div className="crm-setting-title-wrap">
          <span className="crm-setting-title">{title}</span>
          {badge}
        </div>
        {desc && <div className="crm-setting-desc">{desc}</div>}
      </div>
      <div className="crm-setting-ctrl">{children}</div>
    </div>
  );
}

function InputAffix({
  value,
  onChange,
  affix,
  placeholder,
  ariaLabel,
  width = 80,
}: {
  value: string | number;
  onChange: (val: string) => void;
  affix: string;
  placeholder?: string;
  ariaLabel?: string;
  width?: number;
}) {
  return (
    <div className="crm-input-affix" style={{ width: width + 55 }}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width }}
      />
      <span className="crm-input-affix-tag">{affix}</span>
    </div>
  );
}

function renderSampleMessage(tmpl: string) {
  if (!tmpl) return <span className="muted">Chưa có nội dung tin nhắn mẫu.</span>;
  const sample = tmpl
    .replace(/\{ten\}/g, 'anh Nam')
    .replace(/\{cs\}/g, 'Saigon Golf 3D')
    .replace(/\{goi\}/g, 'Gói Hội viên 18 hố')
    .replace(/\{han\}/g, '20/11/2026')
    .replace(/\{con\}/g, '5 buổi')
    .replace(/\{ngay\}/g, '06/11')
    .replace(/\{so_ngay\}/g, '30')
    .replace(/\{diem\}/g, '250');
  return <span>&ldquo;{sample}&rdquo;</span>;
}

/** Quản lý đội ngũ Sales: Thêm, sửa, xóa, phân quyền vai trò, định tuyến máy lẻ & nhận lead. */
function StaffTable({
  s,
  setS,
  data,
  reload,
}: {
  s: Settings;
  setS: (s: Settings) => void;
  data: Config;
  reload: () => Promise<void>;
}) {
  type Mgr = ComponentProps<typeof SalesStaffManager>;
  return (
    <SalesStaffManager
      s={s as unknown as Mgr['s']}
      setS={setS as unknown as Mgr['setS']}
      data={data as unknown as Mgr['data']}
      reload={reload}
    />
  );
}

function ConfigScreen() {
  const { data, error, reload, setError } = useLoad<Config>('/api/crm2/config');
  const products = useLoad<{ products: Product[] }>('/api/crm2/sales?view=products');
  const [s, setS] = useState<Settings | null>(null);
  const [retry, setRetry] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<'all' | 'staff' | 'intake' | 'channels' | 'pipeline' | 'care' | 'products'>('all');
  const [p, setP] = useState({ code: '', name: '', listPrice: '', limited: false });
  const [initial, setInitial] = useState('');

  useEffect(() => {
    if (data && !s) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
      setS(data.settings);
      const rStr = data.settings.calls.retryHours.join(', ');
      setRetry(rStr);
      setInitial(JSON.stringify({ s: data.settings, retry: rStr }));
    }
  }, [data, s]);

  const num = (v: string, d: number) => (v === '' ? 0 : Number.isFinite(Number(v)) ? Number(v) : d);

  const isDirty = useMemo(() => {
    if (!s || !initial) return false;
    return initial !== JSON.stringify({ s, retry });
  }, [s, retry, initial]);

  const reset = useCallback(() => {
    if (!data) return;
    setS(data.settings);
    const rStr = data.settings.calls.retryHours.join(', ');
    setRetry(rStr);
    setMsg('');
  }, [data]);

  const save = useCallback(async () => {
    if (!s) return;
    setSaving(true);
    setMsg('');
    try {
      const next = {
        ...s,
        calls: {
          ...s.calls,
          retryHours: retry
            .split(/[ ,]+/)
            .map(Number)
            .filter((n) => n > 0)
            .slice(0, 3),
        },
      };
      const r = await call<{ settings: Settings }>('/api/crm2/config', { settings: next });
      setS(r.settings);
      const rStr = r.settings.calls.retryHours.join(', ');
      setRetry(rStr);
      setInitial(JSON.stringify({ s: r.settings, retry: rStr }));
      setMsg('Đã lưu cấu hình');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  }, [s, retry, setError]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!s) return <Loading />;

  const show = (sec: string) => section === 'all' || section === sec;

  const SECTIONS = [
    { key: 'all' as const, label: 'Tất cả thiết lập', desc: 'Xem toàn bộ cài đặt', icon: Layers },
    { key: 'staff' as const, label: 'Đội ngũ sales', desc: 'Nhân sự & kênh liên lạc', icon: Users },
    { key: 'intake' as const, label: 'Tiếp nhận & SLA', desc: 'Chia lead & kho số', icon: Target },
    { key: 'channels' as const, label: 'Định tuyến kênh', desc: 'Website, Zalo, FB, Ads', icon: GitFork },
    { key: 'pipeline' as const, label: 'Bán hàng & Giờ làm', desc: 'Gọi lại, lịch hẹn, giữ chỗ', icon: PhoneCall },
    { key: 'care' as const, label: 'Chăm sóc tự động', desc: `${CARE_RULES.length} kịch bản & hạng VIP`, icon: Sparkles },
    { key: 'products' as const, label: 'Dịch vụ & Gói', desc: 'Bảng giá & sản phẩm', icon: Package },
  ];

  return (
    <div className="settings-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {/* Sticky Header with Action Bar */}
      <div className="crm-settings-header">
        <div className="crm-settings-title-group">
          <span className="crm-settings-breadcrumb">Hệ thống / Thiết lập CRM</span>
          <h3>Thiết lập & Cấu hình CRM</h3>
        </div>
        <div className="crm-settings-actions">
          {saving ? (
            <span className="crm-status-pill saving">
              <span className="dot" /> Đang lưu...
            </span>
          ) : msg ? (
            <span className="crm-status-pill saved" role="status">
              <CheckCircle2 size={13} /> {msg}
            </span>
          ) : isDirty ? (
            <span className="crm-status-pill dirty">
              <span className="dot" /> Thay đổi chưa lưu
            </span>
          ) : (
            <span className="crm-status-pill saved">
              <CheckCircle2 size={13} /> Đã đồng bộ
            </span>
          )}

          {isDirty && (
            <button
              type="button"
              className="secondary"
              onClick={reset}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <RotateCcw size={14} style={{ marginRight: 4 }} /> Khôi phục
            </button>
          )}

          <button
            type="button"
            className="primary"
            disabled={saving}
            onClick={save}
            style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={14} /> Lưu cấu hình <span style={{ opacity: 0.7, fontSize: '11px' }}>(Ctrl+S)</span>
          </button>
        </div>
      </div>

      {/* Main Settings Two-Column Layout */}
      <div className="crm-settings-layout">
        {/* Left Navigation Sidebar */}
        <nav className="crm-settings-nav" aria-label="Danh mục thiết lập">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = section === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                className={`crm-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSection(sec.key)}
              >
                <div className="crm-nav-icon">
                  <Icon size={16} />
                </div>
                <div className="crm-nav-text">
                  <span className="crm-nav-label">{sec.label}</span>
                  <span className="crm-nav-desc">{sec.desc}</span>
                </div>
                {sec.key === 'staff' && data?.staff && (
                  <span className="crm-nav-badge">{data.staff.length}</span>
                )}
                {sec.key === 'care' && (
                  <span className="crm-nav-badge">5</span>
                )}
                {sec.key === 'products' && (products.data?.products?.length ?? 0) > 0 && (
                  <span className="crm-nav-badge">{products.data?.products.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Settings Content */}
        <div className="crm-settings-content">
          {/* Section 1: Staff */}
          {show('staff') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>
                    <Users size={18} style={{ color: 'var(--kv-blue, #1f7a4d)' }} />
                    Đội ngũ Sales & Phân quyền vai trò
                  </h3>
                  <p>Thêm, sửa, xóa, phân quyền vai trò kinh doanh, cấu hình máy lẻ & cơ chế nhận lead tự động.</p>
                </div>
              </div>
              <StaffTable s={s} setS={setS} data={data!} reload={reload} />
            </section>
          )}

          {/* Section 2: Intake & SLA */}
          {show('intake') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>
                    <Target size={18} style={{ color: 'var(--kv-blue, #1f7a4d)' }} />
                    Quy tắc chia lead & Kho số
                  </h3>
                  <p>Thiết lập phương thức phân bổ, thời hạn cam kết gọi lần đầu (SLA) và cơ chế thu hồi lead bỏ quên.</p>
                </div>
              </div>

              <div className="crm-subhead">1. Phân bổ & Cam kết phản hồi (SLA)</div>
              <div>
                <SettingRow
                  title="Thời hạn liên hệ lần đầu (SLA)"
                  desc="Thời gian tối đa nhân viên phải thực hiện cuộc gọi đầu tiên kể từ lúc nhận được lead."
                >
                  <InputAffix
                    value={s.slaMinutes}
                    affix="phút"
                    placeholder="5"
                    onChange={(v) => setS({ ...s, slaMinutes: num(v, s.slaMinutes) })}
                  />
                </SettingRow>

                <SettingRow
                  title="Chế độ tiếp nhận lead mới"
                  desc="Tự động phân bổ xoay vòng cho nhân sự đang trực hoặc chuyển vào kho số chung để tự nhận."
                >
                  <select
                    style={{ height: 36, fontSize: 13, minWidth: 220 }}
                    value={s.pool.intakeMode}
                    onChange={(e) =>
                      setS({ ...s, pool: { ...s.pool, intakeMode: e.target.value as 'AUTO' | 'POOL' } })
                    }
                  >
                    <option value="AUTO">Tự động chia đều cho nhân viên trực ca</option>
                    <option value="POOL">Đưa vào kho số chung để nhân viên tự nhận</option>
                  </select>
                </SettingRow>

                <SettingRow
                  title="Hạn mức nhận lead kho số"
                  desc="Số lượng lead tối đa mỗi nhân viên được phép nhận trong 1 ngày từ kho số chung."
                >
                  <InputAffix
                    value={s.pool.claimQuotaPerDay}
                    affix="lead / ngày"
                    placeholder="50"
                    onChange={(v) =>
                      setS({
                        ...s,
                        pool: { ...s.pool, claimQuotaPerDay: num(v, s.pool.claimQuotaPerDay) },
                      })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Tự động thu hồi lead bị bỏ quên"
                  desc="Chuyển lead về kho số chung nếu nhân viên không thực hiện cuộc gọi đầu tiên đúng hạn."
                >
                  <Switch
                    checked={s.pool.autoRecall}
                    onChange={(checked) =>
                      setS({ ...s, pool: { ...s.pool, autoRecall: checked } })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Thời hạn thu hồi về kho số"
                  desc="Thời gian tối đa sau khi chia lead mà không có bất kỳ tương tác hoặc cập nhật nào."
                >
                  <InputAffix
                    value={s.pool.recallHours}
                    affix="giờ"
                    placeholder="48"
                    onChange={(v) =>
                      setS({
                        ...s,
                        pool: { ...s.pool, recallHours: num(v, s.pool.recallHours) },
                      })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Gửi Email thông báo khi có lead mới"
                  desc="Tự động gửi email thông báo kèm thông tin liên hệ ngay khi lead được gán cho nhân sự."
                >
                  <Switch
                    checked={s.notifyAssignEmail}
                    onChange={(checked) => setS({ ...s, notifyAssignEmail: checked })}
                  />
                </SettingRow>
              </div>
            </section>
          )}

          {/* Section 3: Channel Routing */}
          {show('channels') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>
                    <GitFork size={18} style={{ color: 'var(--kv-blue, #1f7a4d)' }} />
                    Định tuyến các kênh tiếp nhận
                  </h3>
                  <p>Chọn hệ thống tiếp nhận khách hàng cho từng cổng thông tin và kênh quảng cáo trực tuyến.</p>
                </div>
              </div>

              <div className="crm-channel-grid">
                <div className="crm-channel-card">
                  <div className="crm-channel-card-top">
                    <div className="crm-channel-card-icon" style={{ color: '#16a34a' }}>
                      <Globe size={18} />
                    </div>
                    <div>
                      <div className="crm-channel-card-title">Form Website (3dgolf.vn)</div>
                      <small className="muted">Biểu mẫu đặt lịch & tư vấn online</small>
                    </div>
                  </div>
                  <p className="crm-channel-desc">
                    Khách đăng ký qua form trang chủ hoặc trang giá. Tự động gắn nguồn và dịch vụ quan tâm.
                  </p>
                </div>

                <div className="crm-channel-card">
                  <div className="crm-channel-card-top">
                    <div className="crm-channel-card-icon" style={{ color: '#0284c7' }}>
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <div className="crm-channel-card-title">Tin nhắn Zalo OA</div>
                      <small className="muted">Zalo Official Account</small>
                    </div>
                  </div>
                  <p className="crm-channel-desc">
                    Khách nhắn Zalo không có SĐT: các tin cùng khách gộp vào 1 lead theo Zalo ID trong ghi chú.
                  </p>
                </div>

                <div className="crm-channel-card">
                  <div className="crm-channel-card-top">
                    <div className="crm-channel-card-icon" style={{ color: '#2563eb' }}>
                      <Share2 size={18} />
                    </div>
                    <div>
                      <div className="crm-channel-card-title">Facebook & Instagram Lead Ads</div>
                      <small className="muted">Biểu mẫu tức thì (Instant Forms)</small>
                    </div>
                  </div>
                  <p className="crm-channel-desc">
                    Chiến dịch và Form ID Facebook được gắn tự động; chống trùng lặp lead khi Facebook gửi lại.
                  </p>
                </div>

                <div className="crm-channel-card">
                  <div className="crm-channel-card-top">
                    <div className="crm-channel-card-icon" style={{ color: '#e11d48' }}>
                      <Target size={18} />
                    </div>
                    <div>
                      <div className="crm-channel-card-title">Quảng cáo đa kênh (Google, TikTok)</div>
                      <small className="muted">Webhook Zapier, Make & Google Ads</small>
                    </div>
                  </div>
                  <p className="crm-channel-desc">
                    Tên nền tảng (tiktok, google, v.v.) được ghi nhận là nguồn chiến dịch trong hồ sơ khách.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Pipeline, Calls & Work Hours */}
          {show('pipeline') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>
                    <PhoneCall size={18} style={{ color: 'var(--kv-blue, #1f7a4d)' }} />
                    Quy trình bán hàng, Cuộc gọi & Lịch hẹn
                  </h3>
                  <p>Cấu hình lịch tự động nhắc gọi lại theo kết quả liên hệ, giờ làm việc và quy định đặt hẹn.</p>
                </div>
              </div>

              <div className="crm-subhead">1. Hạn xử lý theo kết quả cuộc gọi</div>
              <div>
                <SettingRow
                  title="Gọi lại khi không nghe máy (giờ, tối đa 3 lần)"
                  desc="Khoảng cách giờ giữa các lần gọi hụt (VD: 2, 24, 48). Sau 3 lần tự động chuyển trạng thái."
                >
                  <input
                    style={{ height: 36, width: 140, fontSize: 13, textAlign: 'center', fontWeight: 600 }}
                    value={retry}
                    onChange={(e) => setRetry(e.target.value)}
                    placeholder="2, 24, 48"
                  />
                </SettingRow>

                <SettingRow
                  title="Khách hẹn suy nghĩ thêm"
                  desc="Thời gian tạo tác vụ liên hệ lại khi khách đang cân nhắc gói tập."
                >
                  <InputAffix
                    value={s.calls.thinkDays}
                    affix="ngày"
                    placeholder="2"
                    onChange={(v) =>
                      setS({
                        ...s,
                        calls: { ...s.calls, thinkDays: num(v, s.calls.thinkDays) },
                      })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Có nhu cầu cao, hẹn tư vấn tiếp"
                  desc="Thời gian hệ thống nhắc sales bám sát khách hàng tiềm năng."
                >
                  <InputAffix
                    value={s.calls.interestedHours}
                    affix="giờ"
                    placeholder="24"
                    onChange={(v) =>
                      setS({
                        ...s,
                        calls: { ...s.calls, interestedHours: num(v, s.calls.interestedHours) },
                      })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Bám sát sau khi gặp trực tiếp"
                  desc="Thời gian liên hệ lại sau khi khách đã đến phòng tập trải nghiệm hoặc gặp tư vấn."
                >
                  <InputAffix
                    value={s.calls.metFollowUpHours}
                    affix="giờ"
                    placeholder="48"
                    onChange={(v) =>
                      setS({
                        ...s,
                        calls: { ...s.calls, metFollowUpHours: num(v, s.calls.metFollowUpHours) },
                      })
                    }
                  />
                </SettingRow>
              </div>

              <div className="crm-subhead">2. Giờ làm việc, lịch hẹn & giữ chỗ</div>
              <div>
                <SettingRow
                  title="Chỉ tính thời hạn SLA trong giờ làm việc"
                  desc="Đồng hồ đếm ngược SLA và tác vụ sẽ tạm dừng ngoài giờ làm việc và ngày nghỉ."
                >
                  <Switch
                    checked={s.workHours.enabled}
                    onChange={(checked) =>
                      setS({ ...s, workHours: { ...s.workHours, enabled: checked } })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Khung giờ hoạt động phòng tập"
                  desc="Thời gian bắt đầu và kết thúc ca làm việc hàng ngày của studio."
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InputAffix
                      value={Math.round(s.workHours.start / 60)}
                      affix="h sáng"
                      width={45}
                      onChange={(v) =>
                        setS({ ...s, workHours: { ...s.workHours, start: num(v, 8) * 60 } })
                      }
                    />
                    <span className="muted">đến</span>
                    <InputAffix
                      value={Math.round(s.workHours.end / 60)}
                      affix="h tối"
                      width={45}
                      onChange={(v) =>
                        setS({ ...s, workHours: { ...s.workHours, end: num(v, 18) * 60 } })
                      }
                    />
                  </div>
                </SettingRow>

                <SettingRow
                  title="Lịch hẹn cần Quản lý duyệt"
                  desc="Các lịch hẹn do tư vấn viên tạo cần được người quản lý xác nhận phòng tập trước khi chốt."
                >
                  <Switch
                    checked={s.appointments.requireApproval}
                    onChange={(checked) =>
                      setS({ ...s, appointments: { requireApproval: checked } })
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Thời gian giữ phòng mặc định"
                  desc="Thời gian hệ thống tự động khóa giữ chỗ phòng tập khi khách đặt hẹn trước."
                >
                  <InputAffix
                    value={s.holdHours}
                    affix="giờ"
                    placeholder="24"
                    onChange={(v) => setS({ ...s, holdHours: num(v, s.holdHours) })}
                  />
                </SettingRow>

                <SettingRow
                  title="Tự động tạo việc chăm sóc sau bán"
                  desc="Hệ thống tự lên lịch gọi thăm hỏi khách hàng sau khi mua gói vào ngày thứ 3, 30 và 90."
                >
                  <Switch
                    checked={s.afterSales.enabled}
                    onChange={(checked) =>
                      setS({ ...s, afterSales: { enabled: checked } })
                    }
                  />
                </SettingRow>
              </div>
            </section>
          )}

          {/* Section 5: Care Automation */}
          {show('care') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>
                    <Sparkles size={18} style={{ color: 'var(--kv-blue, #1f7a4d)' }} />
                    Chăm sóc khách hàng tự động & Hạng VIP
                  </h3>
                  <p>Thiết lập tiêu chuẩn thăng hạng VIP và {CARE_RULES.length} kịch bản chăm sóc golfer theo chu kỳ & sự kiện.</p>
                </div>
              </div>

              <div className="crm-subhead">1. Tiêu chuẩn khách hàng thân thiết</div>
              <SettingRow
                title="Ngưỡng chi tiêu thăng hạng VIP"
                desc="Tự động gắn nhãn VIP trong hồ sơ khi tổng số tiền khách đã thanh toán đạt hạn mức này (0 = tắt)."
                badge={s.care.vipSpend > 0 ? <span className="crm-badge primary">{money(s.care.vipSpend)}</span> : null}
              >
                <InputAffix
                  value={s.care.vipSpend}
                  affix="₫"
                  width={110}
                  placeholder="50000000"
                  onChange={(v) =>
                    setS({ ...s, care: { ...s.care, vipSpend: num(v, s.care.vipSpend) } })
                  }
                />
              </SettingRow>

              <div className="crm-subhead">2. Kịch bản chăm sóc tự động theo chu kỳ</div>
              <div className="crm-care-grid">
                {CARE_RULES.map((r) => {
                  const rule = s.care.rules[r.id];
                  const tmpl = s.care.templates[r.id] || '';
                  return (
                    <div key={r.id} className={`crm-care-card ${rule.enabled ? 'active' : ''}`}>
                      <div className="crm-care-card-header">
                        <div className="crm-care-title-wrap">
                          <span className="crm-care-title">{r.name}</span>
                          <span className={`crm-badge ${rule.enabled ? 'primary' : 'neutral'}`}>
                            {rule.enabled ? 'Đang kích hoạt' : 'Tạm dừng'}
                          </span>
                        </div>
                        <Switch
                          checked={rule.enabled}
                          aria-label={`Bật kịch bản: ${r.name}`}
                          onChange={(checked) =>
                            setS({
                              ...s,
                              care: {
                                ...s.care,
                                rules: { ...s.care.rules, [r.id]: { ...rule, enabled: checked } },
                              },
                            })
                          }
                        />
                      </div>

                      <p className="crm-care-help">{r.help}</p>

                      {r.param && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f1f4f2', borderBottom: '1px solid #f1f4f2' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.param.label}</span>
                          <InputAffix
                            value={rule.value}
                            affix=""
                            width={50}
                            onChange={(v) =>
                              setS({
                                ...s,
                                care: {
                                  ...s.care,
                                  rules: {
                                    ...s.care.rules,
                                    [r.id]: { ...rule, value: num(v, rule.value) },
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kv-text, #24332b)' }}>
                            Mẫu tin nhắn tự động / gợi ý cho tư vấn viên:
                          </label>
                          <span style={{ fontSize: '11px', color: 'var(--kv-muted, #66756c)' }}>
                            {tmpl.length}/500 ký tự
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={500}
                          style={{ width: '100%', fontSize: '13px', lineHeight: 1.45, padding: '8px 10px', boxSizing: 'border-box' }}
                          value={tmpl}
                          onChange={(e) =>
                            setS({
                              ...s,
                              care: { ...s.care, templates: { ...s.care.templates, [r.id]: e.target.value } },
                            })
                          }
                        />
                      </div>

                      <div className="crm-care-tags">
                        <small className="muted" style={{ fontWeight: 600 }}>Chèn biến nhanh:</small>
                        {[
                          { tag: '{ten}', label: 'Tên khách' },
                          { tag: '{goi}', label: 'Gói/thẻ' },
                          { tag: '{han}', label: 'Hạn thẻ' },
                          { tag: '{con}', label: 'Còn lại' },
                          { tag: '{ngay}', label: 'Ngày hẹn' },
                          { tag: '{so_ngay}', label: 'Số ngày' },
                          { tag: '{diem}', label: 'Điểm tích' },
                        ].map(({ tag, label }) => (
                          <button
                            key={tag}
                            type="button"
                            className="crm-care-tag-btn"
                            title={`Chèn biến ${tag} vào tin nhắn`}
                            onClick={() => {
                              const cur = s.care.templates[r.id] || '';
                              setS({
                                ...s,
                                care: {
                                  ...s.care,
                                  templates: { ...s.care.templates, [r.id]: cur + (cur ? ' ' : '') + tag },
                                },
                              });
                            }}
                          >
                            <Plus size={11} />
                            <code>{tag}</code>
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="crm-care-preview">
                        <strong>Xem trước tin nhắn thực tế:</strong>
                        {renderSampleMessage(tmpl)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 6: Products & Services */}
          {show('products') && (
            <section className="crm-settings-card">
              <div className="crm-settings-card-header">
                <div className="crm-card-title-group">
                  <h3>Danh mục dịch vụ và gói</h3>
                  <p>Bảng sản phẩm CRM phục vụ chốt đơn, giữ chỗ và theo dõi doanh thu.</p>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--ds-line, #dde5de)', borderRadius: 6 }}>
                <table className="crm-product-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Mã gói</th>
                      <th style={{ width: '35%' }}>Tên dịch vụ & gói</th>
                      <th style={{ width: '20%' }}>Giá niêm yết</th>
                      <th style={{ width: '15%' }}>Giới hạn khách</th>
                      <th style={{ width: '15%' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(products.data?.products ?? []).map((x) => (
                      <tr key={x.code}>
                        <td><code>{x.code}</code></td>
                        <td><strong>{x.name}</strong></td>
                        <td style={{ fontWeight: 600, color: 'var(--kv-blue, #1f7a4d)' }}>{money(x.listPrice)}</td>
                        <td>{x.limited ? <span className="crm-badge warning">1 khách / lần</span> : <span className="muted">Không giới hạn</span>}</td>
                        <td>{x.held ? <span className="crm-badge primary">Đang giữ chỗ</span> : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="crm-product-add-bar">
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--kv-text, #24332b)' }}>
                  + Thêm gói dịch vụ mới:
                </span>
                <input
                  aria-label="Mã dịch vụ"
                  placeholder="Mã (VD: GOI-9H)"
                  style={{ height: 34, width: 140, fontSize: 13 }}
                  value={p.code}
                  onChange={(e) => setP({ ...p, code: e.target.value })}
                />
                <input
                  aria-label="Tên dịch vụ"
                  placeholder="Tên dịch vụ"
                  style={{ height: 34, width: 220, fontSize: 13 }}
                  value={p.name}
                  onChange={(e) => setP({ ...p, name: e.target.value })}
                />
                <input
                  aria-label="Giá niêm yết"
                  inputMode="numeric"
                  placeholder="Giá niêm yết (đồng)"
                  style={{ height: 34, width: 160, fontSize: 13 }}
                  value={p.listPrice}
                  onChange={(e) => setP({ ...p, listPrice: e.target.value.replace(/\D/g, '') })}
                />
                <label className="crm-switch-wrap" title="Chỉ một khách giữ">
                  <input
                    type="checkbox"
                    className="crm-switch-input"
                    checked={p.limited}
                    onChange={(e) => setP({ ...p, limited: e.target.checked })}
                  />
                  <span className="crm-switch-slider" />
                </label>
                <span style={{ fontSize: '12.5px', color: 'var(--kv-muted, #66756c)' }}>Chỉ 1 khách giữ</span>
                <button
                  type="button"
                  className="secondary"
                  disabled={!p.code || !p.name}
                  style={{ height: 34, padding: '0 14px', fontSize: '13px' }}
                  onClick={async () => {
                    try {
                      await call('/api/crm2/sales', {
                        action: 'product',
                        code: p.code,
                        name: p.name,
                        listPrice: Number(p.listPrice) || 0,
                        limited: p.limited,
                        active: true,
                      });
                      setP({ code: '', name: '', listPrice: '', limited: false });
                      await products.reload();
                      await reload();
                    } catch (e) {
                      setError(errText(e));
                    }
                  }}
                >
                  Lưu dịch vụ
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function CrmModule({
  permissions,
  initialTab = 'work',
  onNavigate,
}: {
  permissions: string[];
  initialTab?: string;
  onNavigate?: (
    view: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => void;
}) {
  const manager = permissions.includes('crm.manage');
  const [tab, setTab] = useState(initialTab);
  const [space, setSpace] = useState<
    | 'work'
    | 'leads'
    | 'customers'
    | 'appointments'
    | 'care'
    | 'marketing'
    | 'report'
    | 'config'
  >(() => {
    if (initialTab === 'leads' || initialTab === 'pipeline' || initialTab === 'pool' || initialTab === 'overview') return 'leads';
    if (initialTab === 'files' || initialTab === 'customers') return 'customers';
    if (initialTab === 'appointments') return 'appointments';
    if (initialTab === 'care') return 'care';
    if (initialTab === 'marketing') return 'marketing';
    if (initialTab === 'report') return 'report';
    if (initialTab === 'config' || initialTab === 'channels' || initialTab === 'orders' || initialTab === 'viewlog') return 'config';
    return 'work';
  });

  const selectTab = (t: string) => {
    setTab(t);
    if (t === 'work' || t === 'tasks') setSpace('work');
    else if (t === 'care') setSpace('care');
    else if (t === 'marketing') setSpace('marketing');
    else if (t === 'leads' || t === 'pipeline' || t === 'pool' || t === 'overview') setSpace('leads');
    else if (t === 'config' || t === 'channels' || t === 'orders' || t === 'viewlog') setSpace('config');
    else if (t === 'files' || t === 'customers') setSpace('customers');
    else if (t === 'appointments') setSpace('appointments');
    else if (t === 'report') setSpace('report');
    else setSpace('work');
  };

  const onSelectSpace = (s: string) => {
    setSpace(s as typeof space);
    if (s === 'work') {
      if (tab !== 'work' && tab !== 'tasks') setTab('work');
    } else if (s === 'leads') {
      if (tab !== 'leads' && tab !== 'pipeline' && tab !== 'pool' && tab !== 'overview') setTab('leads');
    } else if (s === 'config') {
      if (tab !== 'config' && tab !== 'channels' && tab !== 'orders' && tab !== 'viewlog') setTab('config');
    } else if (s === 'customers') {
      setTab('customers');
    } else {
      setTab(s);
    }
  };

  const [lead, setLead] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [clock, setClock] = useState(0);
  const cfg = useLoad<Config>('/api/crm2/config', 120_000);
  useEffect(() => {
    setClock(Date.now());
    const t = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!clock || !cfg.data)
    return cfg.error ? (
      <div className="error-box" role="alert">
        {cfg.error}
      </div>
    ) : (
      <Loading />
    );
  const shared: Shared = {
    now: clock,
    me: cfg.data.me,
    manager,
    staff: cfg.data.staff,
    open: setLead,
    onNavigate,
  };
  if (lead)
    return (
      <section className="crm-panel" aria-label="CRM">
        <LeadDetail
          id={lead}
          now={clock}
          me={cfg.data.me}
          manager={manager}
          staff={cfg.data.staff}
          onClose={() => {
            setLead(null);
            setBump((b) => b + 1);
          }}
          onChanged={() => setBump((b) => b + 1)}
          onOpenCustomer={(id) => {
            setLead(null);
            setFocus(id);
            setSpace('customers');
            setTab('customers');
          }}
          onNavigate={onNavigate}
        />
      </section>
    );
  return (
    <section className="crm-panel" aria-label="CRM">
      <DutyToggle />
      <PageTabs
        value={space}
        onChange={onSelectSpace}
        tabs={[
          { key: 'work', label: 'Bàn làm việc' },
          { key: 'leads', label: 'Lead & Phễu' },
          { key: 'customers', label: 'Khách hàng' },
          { key: 'appointments', label: 'Lịch hẹn' },
          { key: 'care', label: 'Chăm sóc khách' },
          { key: 'marketing', label: 'Marketing', hidden: !manager },
          { key: 'report', label: 'Báo cáo', hidden: !manager },
          { key: 'config', label: 'Cấu hình', hidden: !manager },
        ]}
      />
      <div key={space}>
        {space === 'work' && <WorkScreen s={shared} />}
        {space === 'leads' && (
          <>
            <PageTabs
              sub
              value={tab}
              onChange={selectTab}
              tabs={[
                { key: 'leads', label: 'Danh sách lead' },
                { key: 'distribute', label: 'Chia lead (Máy chia data)' },
                { key: 'pipeline', label: 'Pipeline' },
                { key: 'pool', label: 'Kho số' },
                { key: 'overview', label: 'Tổng quan phễu' },
              ]}
            />
            {tab === 'leads' && <LeadsScreen s={shared} board={false} />}
            {tab === 'distribute' && <LeadDistributionScreen s={shared} />}
            {tab === 'pipeline' && <LeadsScreen s={shared} board />}
            {tab === 'pool' && <PoolScreen s={shared} />}
            {tab === 'overview' && <OverviewScreen cron={cfg.data.cron} manager={manager} />}
          </>
        )}
        {space === 'customers' && (
          <CareCustomersView key={focus ?? 'all'} focus={focus} onNavigate={onNavigate} />
        )}
        {space === 'appointments' && <AppointmentsScreen s={shared} />}
        {space === 'care' && (
          <CareTasksView
            s={shared}
            onOpenCustomer={(id) => {
              setFocus(id);
              setSpace('customers');
              setTab('customers');
            }}
          />
        )}
        {space === 'marketing' && manager && <MarketingSpace />}
        {space === 'report' && manager && <ReportScreen />}
        {space === 'config' && manager && (
          <>
            <PageTabs
              sub
              value={tab}
              onChange={selectTab}
              tabs={[
                { key: 'config', label: 'Cài đặt chung' },
                { key: 'channels', label: 'Kênh & tích hợp' },
                { key: 'orders', label: 'Đơn bán & Giữ chỗ' },
                { key: 'viewlog', label: 'Nhật ký xem số' },
                { key: 'blocked', label: 'Số bị chặn' },
              ]}
            />
            {tab === 'config' && <ConfigScreen />}
            {tab === 'channels' && <ChannelsScreen />}
            {tab === 'orders' && <OrdersScreen s={shared} />}
            {tab === 'viewlog' && <ViewLogScreen onOpenLead={setLead} />}
            {tab === 'blocked' && <BlockedScreen />}
          </>
        )}
      </div>
    </section>
  );
}
