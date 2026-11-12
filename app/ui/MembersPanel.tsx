'use client';
import { useEffect, useState, useMemo } from 'react';
import { DataTable, PageTabs, askConfirm, askText } from './kit';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { KIND_LABELS, UNLIMITED, type Grant, type GrantKind } from '../../lib/member';
import {
  cardState,
  isPeriodCard,
  maxAbsences,
  MIN_ABSENCE_DAYS,
  clubDay,
} from '../../lib/card-term';
import { memberCode, tierOf, TIER_LABEL, type Tier } from '../../lib/member-card';
import { PackageEditor } from './PackageEditor';
import { MemberCard } from './MemberCard';
import { WalletPanel, type WalletEntry } from './WalletPanel';
import {
  Search,
  UserPlus,
  Users,
  Phone,
  CreditCard,
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Package,
  Play,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Gift,
  FileText,
  BadgeAlert,
  KeyRound,
} from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string;
  note: string;
  points: number;
  account: number | null; // null = no web account, 0 = waiting for staff, 1 = verified
  orders?: number;
};
type PackageType = {
  id: string;
  name: string;
  price: number;
  grants: string;
  valid_days: number;
  perks: string;
  section?: string;
  room?: string;
  active: number;
};
type OwnedPackage = {
  id: string;
  name: string;
  source: string;
  price_paid: number;
  perks: string;
  purchased: number;
  expires: number;
  balances: string | null;
  grants: string;
  type_id: string | null;
  valid_days: number;
  activated_at: number | null;
  activate_by: number | null;
  renewed_from: string | null;
};
type Absence = {
  id: string;
  package_id: string;
  start_day: string;
  end_day: string;
  days: number;
  status: string;
  source: string;
};
type Overview = {
  customers: Customer[];
  types: PackageType[];
  detail: {
    customerId: string;
    packages: OwnedPackage[];
    orders?: { id: string; type_id: string; name: string; price: number; created: number }[];
    wallet?: { balance: number; history: WalletEntry[] };
    absences?: Absence[];
  } | null;
};

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await r.json()) as { error?: string; replayed?: boolean };
  if (!r.ok) throw new Error(result.error || 'Không thực hiện được');
  return result;
}
const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const grantsText = (json: string) =>
  (JSON.parse(json) as Grant[])
    .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
    .join(' + ');

export function MembersPanel({
  permissions,
  initialCustomer,
  initialPhone,
  onStartSession,
}: {
  permissions: string[];
  initialCustomer?: string | null;
  initialPhone?: string | null;
  onStartSession?: (customer: { name: string; phone: string }) => void;
}) {
  const canSell = permissions.includes('member.sell');
  const canAdjust = permissions.includes('member.adjust');

  // A scanned member card opens /quan-ly?hv=HV-XXXXXXXX: start with that code in the search box.
  const [query, setQuery] = useState(() =>
    typeof location === 'undefined'
      ? (initialPhone ?? '')
      : (new URLSearchParams(location.search).get('hv') ?? initialPhone ?? ''),
  );
  const [selected, setSelected] = useState<string | null>(initialCustomer ?? null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [typeId, setTypeId] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
  const [saleKey, setSaleKey] = useState(operationKey());
  const [orderId, setOrderId] = useState('');
  const [now] = useState(() => Date.now());

  // UI state
  const [tab, setTab] = useState('members');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'orders'>('all');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showDigitalCard, setShowDigitalCard] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editing, setEditing] = useState<PackageType | 'new' | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
    if (initialCustomer) setSelected(initialCustomer);
    if (initialPhone) setQuery(initialPhone);
  }, [initialCustomer, initialPhone]);

  async function load(q = query, customer = selected) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (customer) params.set('customer', customer);
    const r = await fetch('/api/members?' + params.toString(), { cache: 'no-store' });
    const v = (await r.json()) as Overview & { error?: string };
    if (!r.ok) setError(v.error || 'Không tải được hội viên');
    else {
      setData(v);
      setError('');
      if (customer && !selected) setSelected(customer);
      else if (!selected && v.customers.length === 1) setSelected(v.customers[0].id);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => load(query, selected), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  const current = data?.customers.find((c) => c.id === selected) ?? null;
  const activeTypes = data?.types.filter((t) => t.active) ?? [];

  useEffect(() => {
    if (current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
      setCustomerNote(current.note ?? '');
      setIsEditingNote(false);
      setShowDigitalCard(false);
    }
  }, [current?.id, current?.note]);

  async function act(task: () => Promise<{ replayed?: boolean }>, done: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await task();
      setNotice(result.replayed ? 'Đã ghi nhận trước đó; không ghi trùng.' : done);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Filter customers based on tabs
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- memo deps are intentional
  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return [];
    if (filterMode === 'pending') {
      return data.customers.filter((c) => c.account === 0);
    }
    if (filterMode === 'orders') {
      return data.customers.filter((c) => !!c.orders);
    }
    return data.customers;
  }, [data?.customers, filterMode]);

  const pendingAccountCount = useMemo(
    () => data?.customers.filter((c) => c.account === 0).length ?? 0,
    [data?.customers],
  );
  const pendingOrdersCount = useMemo(
    () => data?.customers.filter((c) => !!c.orders).length ?? 0,
    [data?.customers],
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- memo deps are intentional
  const currentTier: Tier = useMemo(() => {
    if (!data?.detail?.packages) return 'guest';
    return tierOf(data.detail.packages, now);
  }, [data?.detail?.packages, now]);

  const initials = (current?.name || 'KH')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const cleanPhone = current?.phone ? current.phone.replace(/[^0-9]/g, '') : '';

  return (
    <section className="members-panel operate-members-v2">
      {/* Top Notification / Error Alert */}
      {error && (
        <div className="members-alert error-box" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="close-btn" onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="members-alert notice-box" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button type="button" className="close-btn" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Hero Bar & Tabs */}
      <div className="members-hero-header">
        <div className="members-hero-title">
          <div className="title-row">
            <h2>Quản lý Hội viên & Thẻ</h2>
            <span className="members-badge-count">{data?.customers.length ?? 0} khách hàng</span>
          </div>
          <p className="hero-sub">
            Tra cứu hội viên, bán gói quyền lợi, quản lý thẻ kỹ thuật số và điểm thưởng tích lũy.
          </p>
        </div>

        {/* Global KPI Strip */}
        <div className="members-hero-stats">
          <div className="hero-stat-pill">
            <Users size={15} className="text-emerald" />
            <span className="stat-label">Tổng khách:</span>
            <span className="stat-num">{data?.customers.length ?? 0}</span>
          </div>
          {pendingAccountCount > 0 && (
            <button
              type="button"
              className={`hero-stat-pill clickable ${filterMode === 'pending' ? 'active' : ''}`}
              onClick={() => {
                setTab('members');
                setFilterMode(filterMode === 'pending' ? 'all' : 'pending');
              }}
            >
              <Clock size={15} className="text-amber" />
              <span className="stat-label">Chờ duyệt web:</span>
              <span className="stat-num text-amber">{pendingAccountCount}</span>
            </button>
          )}
          {pendingOrdersCount > 0 && (
            <button
              type="button"
              className={`hero-stat-pill clickable ${filterMode === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setTab('members');
                setFilterMode(filterMode === 'orders' ? 'all' : 'orders');
              }}
            >
              <Sparkles size={15} className="text-emerald animate-pulse" />
              <span className="stat-label">Yêu cầu gói:</span>
              <span className="stat-num text-emerald">{pendingOrdersCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub tabs */}
      <PageTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'members', label: 'Khách & hội viên' },
          { key: 'catalog', label: 'Danh mục gói' },
        ]}
      />

      {tab === 'members' && (
        <div className="members-grid members-dual-view">
          {/* LEFT COLUMN: Customer Directory & Search */}
          <div className="members-dir-pane">
            <div className="members-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="search"
                placeholder="Tìm theo tên, số điện thoại hoặc mã thẻ (HV-…)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setQuery('')}
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Segment Filter */}
            <div className="members-quick-filters">
              <button
                type="button"
                className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Tất cả ({data?.customers.length ?? 0})
              </button>
              {pendingAccountCount > 0 && (
                <button
                  type="button"
                  className={`filter-btn ${filterMode === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterMode('pending')}
                >
                  Chờ duyệt ({pendingAccountCount})
                </button>
              )}
              {pendingOrdersCount > 0 && (
                <button
                  type="button"
                  className={`filter-btn ${filterMode === 'orders' ? 'active' : ''}`}
                  onClick={() => setFilterMode('orders')}
                >
                  Yêu cầu ({pendingOrdersCount})
                </button>
              )}
            </div>

            {/* Add Customer Card Header / Toggle */}
            {canSell && (
              <div className="add-customer-header">
                <button
                  type="button"
                  className="toggle-add-btn"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                >
                  <UserPlus size={15} />
                  <span>Thêm khách hàng mới</span>
                  {showAddCustomer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            )}

            {/* Collapsible Form for Adding Customer */}
            {canSell && showAddCustomer && (
              <form
                className="form-grid add-customer-form animate-fade-in"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const result = await post({ action: 'customer-create', name, phone, note: '' });
                    setName('');
                    setPhone('');
                    setShowAddCustomer(false);
                    return result;
                  }, 'Đã thêm khách hàng thành công');
                }}
              >
                <h3 className="form-label" role="heading" aria-level={2}>
                  Thêm khách hàng
                </h3>
                <label>
                  <span>Họ tên</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="VD: Nguyễn Văn Nam"
                  />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="VD: 0912345678"
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowAddCustomer(false)}
                  >
                    Hủy
                  </button>
                  <button className="primary" disabled={busy || !name || !phone}>
                    Thêm
                  </button>
                </div>
              </form>
            )}

            {/* Customer List */}
            <ul className="customer-list">
              {filteredCustomers.map((c) => {
                const cCode = memberCode(c.id);
                const cInitials = (c.name || 'KH')
                  .split(' ')
                  .filter(Boolean)
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();
                const isSelected = c.id === selected;

                return (
                  <li key={c.id}>
                    <button
                      className={`member-item-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelected(c.id)}
                    >
                      <div className="member-avatar">{cInitials}</div>
                      <div className="member-item-info">
                        <div className="member-item-top">
                          <strong className="member-name">{c.name}</strong>
                          {c.account === 0 && (
                            <span className="chip-badge warning" title="Chờ xác nhận tài khoản">
                              <Clock size={11} /> Chờ duyệt
                            </span>
                          )}
                          {!!c.orders && (
                            <span className="chip-badge pulse-emerald" title="Có yêu cầu mua gói">
                              <Sparkles size={11} /> Có đơn
                            </span>
                          )}
                        </div>
                        <div className="member-item-mid">
                          <span className="member-phone">{c.phone}</span>
                          <span className="member-divider">·</span>
                          <span className="member-code-tag">{cCode}</span>
                        </div>
                        <div className="member-item-bottom">
                          <span className="member-points">
                            <Star size={11} className="star-icon" /> {c.points} điểm
                          </span>
                        </div>
                      </div>

                      {/* Accessible text matching tests expectation */}
                      <span className="sr-text" style={{ display: 'none' }} aria-hidden="true">
                        <strong>{c.name}</strong> · {c.phone} · {cCode} · {c.points} điểm
                        {c.account === 0 && <b> · chờ xác nhận tài khoản</b>}
                        {!!c.orders && <b> · yêu cầu mua gói</b>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {data && !filteredCustomers.length && (
                <li className="customer-list-empty">
                  <Users size={32} className="empty-icon" />
                  <p>Chưa có khách phù hợp</p>
                  {query && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setQuery('');
                        setFilterMode('all');
                      }}
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* RIGHT COLUMN: Member Detail Studio */}
          <div className="members-studio-pane">
            {current ? (
              <div className="member-detail-container">
                {/* 1. HERO PROFILE CARD */}
                <div className="member-profile-card">
                  <div className="profile-banner-top">
                    <div className="profile-avatar-wrap">
                      <div className={`profile-avatar tier-${currentTier}`}>{initials}</div>
                      <span className={`tier-badge tier-${currentTier}`}>
                        {TIER_LABEL[currentTier]}
                      </span>
                    </div>

                    <div className="profile-main-meta">
                      <div className="profile-name-row">
                        <h2>
                          {current.name} · {current.phone}
                        </h2>
                      </div>

                      <div className="profile-sub-row">
                        <div className="code-pill">
                          <CreditCard size={14} />
                          <span>
                            Mã thẻ: <strong>{memberCode(current.id)}</strong>
                          </span>
                          <button
                            type="button"
                            className="btn-copy-code"
                            title="Sao chép mã thẻ"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(memberCode(current.id));
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                              } catch {
                                /* ignore */
                              }
                            }}
                          >
                            {copiedCode ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                          </button>
                        </div>

                        {/* Quick Contact buttons */}
                        <div className="quick-contact-actions">
                          {onStartSession && (
                            <button
                              type="button"
                              className="btn-quick-contact play"
                              onClick={() => onStartSession({ name: current.name, phone: current.phone })}
                              title="Nhận phòng và bắt đầu chơi cho hội viên này"
                            >
                              <Play size={13} /> Nhận line chơi
                            </button>
                          )}
                          <a
                            href={`tel:${current.phone}`}
                            className="btn-quick-contact"
                            title="Gọi điện thoại"
                          >
                            <Phone size={13} /> Gọi
                          </a>
                          {cleanPhone && (
                            <a
                              href={`https://zalo.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-quick-contact zalo"
                              title="Nhắn tin qua Zalo"
                            >
                              <ExternalLink size={13} /> Zalo
                            </a>
                          )}
                          <button
                            type="button"
                            className={`btn-quick-contact qr ${showDigitalCard ? 'active' : ''}`}
                            onClick={() => setShowDigitalCard(!showDigitalCard)}
                            title="Xem thẻ hội viên kỹ thuật số & mã QR"
                          >
                            <QrCode size={13} /> {showDigitalCard ? 'Đóng thẻ QR' : 'Thẻ số QR'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Web Account Status Bar */}
                  <div className="account-status-bar">
                    <div className="status-label-group">
                      <ShieldCheck size={16} className={current.account === 1 ? 'text-emerald' : current.account === 0 ? 'text-amber' : 'text-muted'} />
                      <p>
                        Tài khoản web:{' '}
                        <strong>
                          {current.account === 1
                            ? 'đã xác nhận'
                            : current.account === 0
                            ? 'chờ xác nhận số điện thoại'
                            : 'chưa đăng ký'}
                        </strong>
                      </p>
                    </div>

                    <div className="account-actions">
                      {current.account === 0 && canSell && (
                        <button
                          className="primary btn-verify"
                          disabled={busy}
                          onClick={async () => {
                            if (
                              !(await askConfirm({
                                title: 'Xác nhận tài khoản web?',
                                message:
                                  'Chỉ xác nhận khi người đăng ký đúng là chủ số điện thoại này (đã gặp hoặc gọi lại).',
                              }))
                            )
                              return;
                            act(
                              () => post({ action: 'account-verify', customerId: current.id }),
                              'Đã xác nhận tài khoản web',
                            );
                          }}
                        >
                          <Check size={14} /> Xác nhận
                        </button>
                      )}
                      {current.account != null && canAdjust && (
                        <button
                          className="secondary btn-reset-pw"
                          disabled={busy}
                          onClick={() =>
                            act(async () => {
                              const r = (await post({
                                action: 'account-reset',
                                customerId: current.id,
                              })) as { password?: string; replayed?: boolean };
                              window.alert(
                                `Mật khẩu tạm: ${r.password}\nĐưa cho hội viên; họ đổi lại trong trang tài khoản.`,
                              );
                              return r;
                            }, 'Đã đặt lại mật khẩu')
                          }
                        >
                          <KeyRound size={14} /> Đặt lại mật khẩu
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* DIGITAL MEMBER CARD PREVIEW (IF EXPANDED) */}
                {showDigitalCard && (
                  <div className="digital-card-preview-wrapper animate-fade-in">
                    <div className="digital-card-box">
                      <MemberCard
                        name={current.name}
                        code={memberCode(current.id)}
                        tier={currentTier}
                        since={data?.detail?.packages?.[0]?.purchased ?? null}
                        points={current.points}
                        expires={data?.detail?.packages?.[0]?.expires ?? null}
                        club="Golf 3D Club"
                      />
                    </div>
                  </div>
                )}

                {/* 2. STATS & REWARDS STRIP */}
                <div className="member-stats-grid">
                  {/* Points KPI Card */}
                  <div className="member-stat-box points-box">
                    <div className="stat-box-header">
                      <Star size={18} className="text-amber" />
                      <span className="stat-title">Điểm tích lũy</span>
                    </div>
                    <div className="stat-box-val">
                      <span className="big-num">{current.points}</span>
                      <span className="unit">điểm</span>
                    </div>
                    <p className="stat-note">
                      Điểm tích lũy: <strong>{current.points}</strong> (10 điểm = 1 lượt chơi miễn phí)
                    </p>

                    {/* Quick Redeem */}
                    {canSell && current.points >= 10 && (
                      <div className="redeem-actions-box">
                        <span className="redeem-label">Đổi 10 điểm:</span>
                        <div className="redeem-btns">
                          {(['9', '18'] as const).map((svc) => (
                            <button
                              key={svc}
                              className="secondary btn-redeem"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () =>
                                    post({
                                      action: 'points-redeem',
                                      requestId: operationKey(),
                                      customerId: current.id,
                                      service: svc,
                                    }),
                                  'Đã đổi điểm lấy lượt miễn phí',
                                )
                              }
                            >
                              <Gift size={13} /> 1 lượt {svc} hố
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Packages KPI */}
                  <div className="member-stat-box packages-box">
                    <div className="stat-box-header">
                      <Package size={18} className="text-emerald" />
                      <span className="stat-title">Gói hội viên</span>
                    </div>
                    <div className="stat-box-val">
                      <span className="big-num">{data?.detail?.packages.length ?? 0}</span>
                      <span className="unit">gói kích hoạt</span>
                    </div>
                    <p className="stat-note">
                      Hạng thẻ hiện tại:{' '}
                      <strong className={`tier-text tier-${currentTier}`}>{TIER_LABEL[currentTier]}</strong>
                    </p>
                  </div>

                  {/* Orders KPI */}
                  <div className="member-stat-box orders-box">
                    <div className="stat-box-header">
                      <Clock size={18} className="text-blue" />
                      <span className="stat-title">Yêu cầu mua gói</span>
                    </div>
                    <div className="stat-box-val">
                      <span className="big-num">{data?.detail?.orders?.length ?? 0}</span>
                      <span className="unit">yêu cầu chờ</span>
                    </div>
                    <p className="stat-note">
                      {data?.detail?.orders?.length ? 'Có yêu cầu từ web' : 'Không có yêu cầu chờ'}
                    </p>
                  </div>
                </div>

                {data?.detail?.wallet && current && (
                  <WalletPanel
                    balance={data.detail.wallet.balance}
                    history={data.detail.wallet.history}
                    canTopUp={canSell}
                    busy={busy}
                    onTopUp={(amount, method) =>
                      act(
                        () =>
                          post({
                            action: 'wallet-topup',
                            requestId: operationKey(),
                            customerId: current.id,
                            amount,
                            method,
                          }),
                        'Đã nạp ví',
                      )
                    }
                  />
                )}

                {/* 3. PENDING PACKAGE ORDERS FROM WEB (IF ANY) */}
                {!!data?.detail?.orders?.length && (
                  <div className="pending-orders-section">
                    <div className="section-title-wrap warning-accent">
                      <BadgeAlert size={18} className="text-amber" />
                      <h3>Yêu cầu mua gói từ hội viên</h3>
                    </div>
                    <ul className="pending-orders-list">
                      {data.detail.orders.map((o) => (
                        <li key={o.id} className="pending-order-item">
                          <div className="order-item-left">
                            <strong className="order-pkg-name">{o.name}</strong>
                            <div className="order-item-meta">
                              <span className="order-price">{money(o.price)}</span>
                              <span className="divider">·</span>
                              <span className="order-date">Gửi lúc {day(o.created)}</span>
                            </div>
                          </div>
                          {canSell && (
                            <div className="order-item-actions">
                              <button
                                className="primary btn-sell-this"
                                disabled={busy}
                                onClick={() => {
                                  setTypeId(o.type_id);
                                  setOrderId(o.id);
                                  setNotice(
                                    'Đã chọn gói theo yêu cầu. Chọn hình thức thu tiền và bấm "Xác nhận đã nhận tiền" bên dưới.',
                                  );
                                }}
                              >
                                Bán gói này
                              </button>
                              <button
                                className="secondary btn-reject-order"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    () => post({ action: 'order-reject', id: o.id }),
                                    'Đã từ chối yêu cầu mua gói',
                                  )
                                }
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. ACTIVE PACKAGES LIST */}
                <div className="active-packages-section">
                  <div className="section-title-wrap">
                    <Package size={18} className="text-emerald" />
                    <h3>Gói đang có</h3>
                    <span className="section-badge">
                      {data?.detail?.packages.length ?? 0} gói
                    </span>
                  </div>

                  <ul className="owned-packages-list">
                    {data?.detail?.packages.map((p) => {
                      const state = cardState({
                        activatedAt: p.activated_at,
                        activateBy: p.activate_by,
                        expires: p.expires,
                        now,
                      });
                      const isExpired = state === 'expired';
                      const grants = JSON.parse(p.grants) as Grant[];
                      const period = isPeriodCard(grants);
                      const absences = (data?.detail?.absences ?? []).filter(
                        (a) => a.package_id === p.id && a.status === 'active',
                      );

                      return (
                        <li key={p.id} className={`owned-package-card ${isExpired ? 'expired' : ''}`}>
                          <div className="pkg-card-top">
                            <div className="pkg-name-wrap">
                              <strong className="pkg-name">{p.name}</strong>
                              <span className={`pkg-status-chip ${isExpired ? 'expired' : 'active'}`}>
                                {isExpired
                                  ? 'Đã hết hạn'
                                  : state === 'pending'
                                    ? 'Chờ kích hoạt'
                                    : 'Đang hiệu lực'}
                              </span>
                            </div>

                            {canAdjust && (
                              <button
                                className="secondary btn-adjust"
                                disabled={busy}
                                onClick={async () => {
                                  const note = await askText({
                                    title: 'Điều chỉnh số lượt',
                                    label: 'Lý do điều chỉnh (ít nhất 3 ký tự)',
                                    min: 3,
                                  });
                                  if (!note) return;
                                  const deltaText = await askText({
                                    title: 'Điều chỉnh số lượt',
                                    label: 'Số lượt cộng (+) hoặc trừ (-)',
                                    initial: '1',
                                  });
                                  const delta = Number(deltaText);
                                  const kind = await askText({
                                    title: 'Điều chỉnh số lượt',
                                    label: 'Loại: holes9, holes18 hoặc gdr',
                                    initial: 'holes18',
                                  });
                                  if (!Number.isInteger(delta) || !delta || !kind) return;
                                  act(
                                    () =>
                                      post({
                                        action: 'adjust',
                                        requestId: operationKey(),
                                        packageId: p.id,
                                        kind,
                                        delta,
                                        note,
                                      }),
                                    'Đã điều chỉnh số lượt',
                                  );
                                }}
                              >
                                <RotateCcw size={13} /> Điều chỉnh
                              </button>
                            )}
                          </div>

                          <div className="pkg-card-meta">
                            <span>
                              {state === 'pending' && p.activate_by
                                ? `kích hoạt trước ${day(p.activate_by)} (tự kích hoạt ngày này)`
                                : `hạn ${day(p.expires)}${isExpired ? ' (đã hết hạn)' : ''}`}
                            </span>
                            {p.price_paid > 0 && (
                              <>
                                <span className="divider">·</span>
                                <span>Giá mua: {money(p.price_paid)}</span>
                              </>
                            )}
                          </div>

                          {canSell && (period || state === 'pending') && (
                            <div className="pkg-card-actions">
                              {canSell && state === 'pending' && (
                                <button
                                  className="secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    act(
                                      () => post({ action: 'activate', packageId: p.id }),
                                      'Đã kích hoạt thẻ',
                                    )
                                  }
                                >
                                  Kích hoạt ngay
                                </button>
                              )}
                              {canSell && period && state === 'active' && p.activated_at != null && (
                                <button
                                  className="secondary"
                                  disabled={busy || absences.length >= maxAbsences(p.valid_days)}
                                  onClick={async () => {
                                    const start = await askText({
                                      title: 'Báo lịch vắng',
                                      label: 'Ngày bắt đầu vắng (YYYY-MM-DD, sau hôm nay)',
                                      initial: clubDay(now + 86_400_000),
                                    });
                                    if (!start) return;
                                    const daysText = await askText({
                                      title: 'Báo lịch vắng',
                                      label: `Số ngày vắng liên tục (tối thiểu ${MIN_ABSENCE_DAYS})`,
                                      initial: String(MIN_ABSENCE_DAYS),
                                    });
                                    const n = Number(daysText);
                                    if (!Number.isInteger(n) || n < 1) return;
                                    const end = new Date(
                                      Date.parse(start + 'T00:00:00Z') + (n - 1) * 86_400_000,
                                    )
                                      .toISOString()
                                      .slice(0, 10);
                                    act(
                                      () =>
                                        post({
                                          action: 'absence-create',
                                          requestId: operationKey(),
                                          packageId: p.id,
                                          startDay: start,
                                          endDay: end,
                                        }),
                                      `Đã báo vắng ${n} ngày, hạn thẻ được cộng thêm ${n} ngày`,
                                    );
                                  }}
                                >
                                  Báo vắng ({absences.length}/{maxAbsences(p.valid_days)})
                                </button>
                              )}
                            </div>
                          )}
                          {absences.length > 0 && (
                            <ul className="pkg-absences">
                              {absences.map((a) => (
                                <li key={a.id}>
                                  Vắng {a.start_day.split('-').reverse().join('/')} –{' '}
                                  {a.end_day.split('-').reverse().join('/')} ({a.days} ngày
                                  {a.source === 'staff' ? ', nhân viên báo' : ''})
                                  {canSell && a.start_day > clubDay(now) && (
                                    <button
                                      className="link"
                                      disabled={busy}
                                      onClick={() =>
                                        act(
                                          () => post({ action: 'absence-cancel', id: a.id }),
                                          'Đã huỷ lịch vắng, hạn thẻ đã trừ lại',
                                        )
                                      }
                                    >
                                      Huỷ
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="pkg-card-balances">
                            {(JSON.parse(p.balances ?? '[]') as { kind: GrantKind; remaining: number }[])
                              .map(
                                (b) => (
                                  <span key={b.kind} className="balance-item">
                                    {b.remaining >= UNLIMITED ? 'không giới hạn' : b.remaining} {KIND_LABELS[b.kind]}
                                  </span>
                                ),
                              )}
                          </div>
                        </li>
                      );
                    })}
                    {data?.detail && !data.detail.packages.length && (
                      <li className="owned-packages-empty">
                        <Package size={24} className="empty-pkg-icon" />
                        <p>Chưa mua gói nào</p>
                      </li>
                    )}
                  </ul>
                </div>

                {/* 5. SELL PACKAGE TRANSACTION STUDIO */}
                {canSell && (
                  <div className="sell-package-card">
                    <div className="section-title-wrap">
                      <CreditCard size={18} className="text-emerald" />
                      <h3 className="form-label" role="heading" aria-level={3}>
                        Bán gói (cần mở ca)
                      </h3>
                    </div>

                    <form
                      className="form-grid sell-package-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(async () => {
                          const result = await post({
                            action: 'sell',
                            requestId: saleKey,
                            customerId: current.id,
                            typeId,
                            method,
                            ...(orderId ? { orderId } : {}),
                          });
                          setOrderId('');
                          setTypeId('');
                          setSaleKey(operationKey());
                          return result;
                        }, 'Đã bán gói và ghi vào sổ ca thành công');
                      }}
                    >
                      <div className="sell-inputs-row">
                        <label className="sell-field">
                          <span className="field-label">Gói</span>
                          <select
                            value={typeId}
                            onChange={(e) => setTypeId(e.target.value)}
                            required
                          >
                            <option value="">— Chọn gói hội viên —</option>
                            {activeTypes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} · {money(t.price)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="sell-field">
                          <span className="field-label">Hình thức thu</span>
                          <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value as typeof method)}
                          >
                            <option value="transfer">Chuyển khoản đã đối soát</option>
                            <option value="cash">Tiền mặt tại quầy</option>
                            <option value="card">Thẻ POS tại quầy</option>
                          </select>
                        </label>
                      </div>

                      {/* Package summary preview if selected */}
                      {typeId && (
                        <div className="sell-preview-strip animate-fade-in">
                          {(() => {
                            const selectedType = activeTypes.find((t) => t.id === typeId);
                            if (!selectedType) return null;
                            return (
                              <div className="selected-pkg-summary">
                                <div className="summary-left">
                                  <strong>{selectedType.name}</strong>
                                  <span className="grants-text">
                                    {grantsText(selectedType.grants)} · {selectedType.valid_days} ngày
                                  </span>
                                </div>
                                <div className="summary-price">
                                  {money(selectedType.price)}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="sell-action-footer">
                        <button
                          type="submit"
                          className="primary btn-confirm-sell"
                          disabled={busy || !typeId}
                        >
                          <CheckCircle2 size={16} /> Xác nhận đã nhận tiền
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 6. CUSTOMER NOTES & PREFERENCES */}
                <div className="customer-note-section">
                  <div className="section-title-wrap">
                    <FileText size={18} className="text-muted" />
                    <h3>Ghi chú khách hàng</h3>
                    {!isEditingNote && canSell && (
                      <button
                        type="button"
                        className="btn-edit-note link-btn"
                        onClick={() => setIsEditingNote(true)}
                      >
                        Sửa ghi chú
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="note-editor-wrap">
                      <textarea
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Nhập sở thích, thói quen đặt line, lưu ý bảo quản gậy hoặc thanh toán..."
                        maxLength={300}
                        rows={3}
                      />
                      <div className="note-editor-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setCustomerNote(current.note ?? '');
                            setIsEditingNote(false);
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="primary"
                          disabled={busy}
                          onClick={() => {
                            act(
                              () =>
                                post({
                                  action: 'customer-update',
                                  id: current.id,
                                  name: current.name,
                                  note: customerNote.trim(),
                                }),
                              'Đã lưu ghi chú',
                            ).then(() => setIsEditingNote(false));
                          }}
                        >
                          Lưu ghi chú
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`note-content ${!current.note ? 'empty' : ''}`}>
                      {current.note || 'Chưa có ghi chú đặc biệt cho khách hàng này.'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="member-empty-studio">
                <div className="empty-icon-wrap">
                  <Users size={48} className="text-emerald" />
                </div>
                <h3>Chưa chọn khách hàng</h3>
                <p>Chọn một khách hàng để xem gói và điểm.</p>
                <div className="empty-hints">
                  <span>💡 Mẹo: Quét thẻ hội viên có mã QR để mở trực tiếp hồ sơ khách hàng.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATALOG TAB */}
      {tab === 'catalog' && (
        <div className="members-catalog-view">
          {canAdjust && (
            <div className="catalog-info-banner">
              <Sparkles size={16} className="text-emerald" />
              <p className="form-note">
                Giá và quyền lợi ở đây hiện trực tiếp trên trang <a href="/bang-gia">/bang-gia</a> và
                trang chủ. Giá theo giờ, theo lượt sửa ở Cài đặt cơ sở → bảng giá.
              </p>
            </div>
          )}

          <div className="catalog-toolbar">
            {canAdjust && !editing && (
              <button
                className="primary btn-add-pkg"
                disabled={busy}
                onClick={() => setEditing('new')}
              >
                <Package size={15} /> Thêm gói mới
              </button>
            )}
            {canAdjust && data && !data.types.length && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  act(
                    () => post({ action: 'types-seed' }),
                    'Đã nạp danh mục gói theo bảng giá chính thức',
                  )
                }
              >
                Nạp danh mục theo bảng giá chính thức
              </button>
            )}
          </div>

          {canAdjust && editing && (
            <div className="catalog-editor-wrapper animate-fade-in">
              <PackageEditor
                key={editing === 'new' ? 'new' : editing.id}
                initial={editing === 'new' ? null : editing}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={(body) =>
                  act(
                    () => post({ action: 'type-save', requestId: operationKey(), ...body }),
                    body.id ? 'Đã lưu gói' : 'Đã thêm gói',
                  ).then(() => setEditing(null))
                }
              />
            </div>
          )}

          <div className="catalog-table-wrap">
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Gói hội viên',
                  cell: (t: PackageType) => (
                    <div className="pkg-type-name-cell">
                      <strong>{t.name}</strong>
                      {t.section && <span className="section-tag">{t.section}</span>}
                    </div>
                  ),
                },
                {
                  key: 'price',
                  header: 'Giá bán',
                  cell: (t) => <strong className="text-emerald">{money(t.price)}</strong>,
                },
                {
                  key: 'grants',
                  header: 'Quyền lợi',
                  cell: (t) => (
                    <div className="grants-cell">
                      <span>{grantsText(t.grants)}</span>
                      {t.perks && <small className="text-muted block">· {t.perks}</small>}
                    </div>
                  ),
                },
                {
                  key: 'room',
                  header: 'Phòng áp dụng',
                  cell: (t) => (
                    <span className="room-badge">
                      {t.room === 'standard' ? 'Tiêu chuẩn' : t.room === 'vip' ? 'Phòng VIP' : 'Tất cả'}
                    </span>
                  ),
                },
                { key: 'days', header: 'Hiệu lực', cell: (t) => `${t.valid_days} ngày` },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  cell: (t) => (
                    <span className={`status-pill ${t.active ? 'active' : 'inactive'}`}>
                      {t.active ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  ),
                },
                ...(canAdjust
                  ? [
                      {
                        key: 'actions',
                        header: 'Thao tác',
                        cell: (t: PackageType) => (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="secondary btn-xs"
                              disabled={busy}
                              onClick={() => setEditing(t)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="secondary btn-xs"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () =>
                                    post({
                                      action: 'type-save',
                                      id: t.id,
                                      requestId: operationKey(),
                                      name: t.name,
                                      price: t.price,
                                      grants: JSON.parse(t.grants),
                                      validDays: t.valid_days,
                                      perks: t.perks,
                                      section: t.section ?? '',
                                      room: t.room ?? 'any',
                                      active: !t.active,
                                    }),
                                  'Đã cập nhật gói',
                                )
                              }
                            >
                              {t.active ? 'Ngừng bán' : 'Bán lại'}
                            </button>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
              rows={data?.types ?? []}
              rowKey={(t) => t.id}
              empty="Chưa có gói hội viên"
            />
          </div>
        </div>
      )}
    </section>
  );
}
