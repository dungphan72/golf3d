'use client';
import { useMemo } from 'react';
import {
  Wallet,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { money } from '../../lib/club';
import type { Booking } from '../../lib/club';

export type RightInsightProps = {
  user: string;
  role: string;
  bookings: Booking[];
  now: number;
  onGo: (view: string) => void;
};

// 1. OWNER / ON-DUTY PROFILE CARD
export function OwnerProfileCard({
  user,
  role,
  bookings,
  now,
}: {
  user: string;
  role: string;
  bookings: Booking[];
  now: number;
}) {
  const currentHour = useMemo(() => {
    const d = new Date(now);
    return (d.getUTCHours() + 7) % 24;
  }, [now]);

  const greeting = useMemo(() => {
    if (currentHour < 12) return 'Chào buổi sáng';
    if (currentHour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, [currentHour]);

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'owner':
        return 'Chủ cơ sở';
      case 'manager':
        return 'Quản lý kinh doanh';
      case 'cashier':
        return 'Thu ngân ca trực';
      case 'sale':
        return 'Tư vấn kinh doanh';
      case 'cskh':
        return 'Chăm sóc hội viên';
      case 'coach':
        return 'Huấn luyện viên PGA';
      default:
        return 'Chủ cơ sở';
    }
  }, [role]);

  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const dayEnd = dayStart + 86_400_000;

  const todayBookings = useMemo(() => {
    return bookings.filter((b) => b.start >= dayStart && b.start < dayEnd && b.status !== 'cancelled');
  }, [bookings, dayStart, dayEnd]);

  const shiftRevenue = useMemo(() => {
    return todayBookings
      .filter((b) => b.amount != null)
      .reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [todayBookings]);

  const progressPercent = Math.min(100, Math.max(0, Math.round(((currentHour - 7) / 15) * 100)));

  const initials = useMemo(() => {
    if (!user) return 'SG';
    const parts = user.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return user.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <div className="insight-card profile-card">
      <div className="profile-header">
        <div className="avatar-ring-wrap">
          <svg className="progress-ring" viewBox="0 0 64 64">
            <circle
              className="progress-ring-bg"
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="3.5"
            />
            <circle
              className="progress-ring-fg"
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="3.5"
              strokeDasharray="175.9"
              strokeDashoffset={175.9 - (175.9 * progressPercent) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="profile-avatar">{initials}</div>
          <div className="ring-badge" title="Thời gian đã qua trong khung giờ mở cửa">{progressPercent}%</div>
        </div>

        <div className="profile-text">
          <div className="profile-eyebrow">
            <span className="live-dot" /> {roleLabel}
          </div>
          <h4 className="profile-title">
            {greeting}, {user || 'Golfer'} ⛳
          </h4>
          <p className="profile-sub">Hệ thống phòng golf 3D Foresight GC3 sẵn sàng phục vụ.</p>
        </div>
      </div>

      <div className="profile-footer-stats">
        <div className="p-stat">
          <span className="p-stat-val">{todayBookings.length}</span>
          <span className="p-stat-lbl">Lượt đặt hôm nay</span>
        </div>
        <div className="p-stat-divider" />
        <div className="p-stat">
          <span className="p-stat-val text-green">{money(shiftRevenue)}</span>
          <span className="p-stat-lbl">Doanh thu tạm tính</span>
        </div>
      </div>
    </div>
  );
}

// 2. HOURLY TRAFFIC CARD (MẬT ĐỘ KHUNG GIỜ)
export function HourlyTrafficCard({
  bookings,
  now,
}: {
  bookings: Booking[];
  now: number;
}) {
  const currentHour = useMemo(() => {
    const d = new Date(now);
    return (d.getUTCHours() + 7) % 24;
  }, [now]);

  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const dayEnd = dayStart + 86_400_000;

  const todayBookings = useMemo(() => {
    return bookings.filter((b) => b.start >= dayStart && b.start < dayEnd && b.status !== 'cancelled');
  }, [bookings, dayStart, dayEnd]);

  const timeBuckets = useMemo(() => {
    const buckets = [
      { label: '08-12h', name: 'Sáng', count: 0, active: currentHour >= 8 && currentHour < 12 },
      { label: '12-15h', name: 'Trưa', count: 0, active: currentHour >= 12 && currentHour < 15 },
      { label: '15-19h', name: 'Chiều', count: 0, active: currentHour >= 15 && currentHour < 19 },
      { label: '19-23h', name: 'Tối', count: 0, active: currentHour >= 19 || currentHour < 8 },
    ];
    for (const b of todayBookings) {
      const bh = (new Date(b.start).getUTCHours() + 7) % 24;
      if (bh >= 8 && bh < 12) buckets[0].count++;
      else if (bh >= 12 && bh < 15) buckets[1].count++;
      else if (bh >= 15 && bh < 19) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets;
  }, [todayBookings, currentHour]);

  const maxBucket = Math.max(1, ...timeBuckets.map((b) => b.count));

  return (
    <div className="insight-card chart-card">
      <div className="insight-card-header">
        <div className="insight-heading-group">
          <span className="insight-eyebrow">MẬT ĐỘ KHUNG GIỜ</span>
          <h4 className="insight-title">Lượt khách trong ngày</h4>
        </div>
        <span className="insight-badge-pill" title="Tổng lượt chơi">
          <Activity size={12} /> {todayBookings.length} lượt
        </span>
      </div>

      <div className="mini-chart-container">
        {timeBuckets.map((b, i) => {
          const heightPercent = Math.max(18, Math.round((b.count / maxBucket) * 100));
          return (
            <div key={i} className={`mini-chart-bar-group ${b.active ? 'active-period' : ''}`}>
              <div className="bar-count-tooltip">{b.count} khách</div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${b.active ? 'bar-active' : ''}`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="bar-label">{b.name}</span>
              <span className="bar-sub">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. ON-DUTY STAFF CARD (ĐỘI NGŨ TRỰC CA)
export function OnDutyStaffCard({
  onGo,
}: {
  onGo: (view: string) => void;
}) {
  return (
    <div className="insight-card staff-card">
      <div className="insight-card-header">
        <div className="insight-heading-group">
          <span className="insight-eyebrow">LỐI TẮT</span>
          <h4 className="insight-title">Việc thường dùng</h4>
        </div>
        <button
          type="button"
          className="insight-link-btn"
          onClick={() => onGo('staff')}
          title="Xem danh sách nhân sự"
        >
          Tất cả <ChevronRight size={13} />
        </button>
      </div>

      <div className="on-duty-list">
        {[
          { key: 'coaching', label: 'Lịch huấn luyện', hint: 'Buổi học và HLV', btn: 'Lịch' },
          { key: 'crmx', label: 'CRM & lead', hint: 'Khách tiềm năng, việc cần làm', btn: 'CRM' },
          { key: 'finance', label: 'Ca & sổ tiền', hint: 'Thu chi và đóng ca', btn: 'Sổ ca' },
        ].map((x) => (
          <div className="on-duty-item" key={x.key}>
            <div className="duty-info">
              <div className="duty-name">{x.label}</div>
              <div className="duty-status">{x.hint}</div>
            </div>
            <button type="button" className="duty-act-btn" onClick={() => onGo(x.key)} title={x.label}>
              {x.btn}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. QUICK FINANCE CARD (KẾT TOÁN CA TRỰC)
export function QuickFinanceCard({
  bookings,
  now,
  onGo,
}: {
  bookings: Booking[];
  now: number;
  onGo: (view: string) => void;
}) {
  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const dayEnd = dayStart + 86_400_000;

  const todayBookings = useMemo(() => {
    return bookings.filter((b) => b.start >= dayStart && b.start < dayEnd && b.status !== 'cancelled');
  }, [bookings, dayStart, dayEnd]);

  const shiftRevenue = useMemo(() => {
    return todayBookings
      .filter((b) => b.amount != null)
      .reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [todayBookings]);

  return (
    <div className="insight-card quick-finance-card">
      <div className="qf-header">
        <div className="qf-icon">
          <Wallet size={16} />
        </div>
        <div>
          <div className="qf-label">KẾT TOÁN CA TRỰC</div>
          <div className="qf-val text-green">{money(shiftRevenue)}</div>
        </div>
      </div>
      <p className="qf-desc">Doanh thu tạm tính ca làm việc từ 08:00 đến hiện tại.</p>
      <button
        type="button"
        className="qf-btn"
        onClick={() => onGo('finance')}
      >
        <span>Xem chi tiết sổ tiền & Đóng ca</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// Full Composite RightInsightPanel (backward-compatible)
export function RightInsightPanel({
  user,
  role,
  bookings,
  now,
  onGo,
}: RightInsightProps) {
  return (
    <aside className="right-insight-panel" aria-label="Bảng tiện ích & thống kê ca trực">
      <OwnerProfileCard user={user} role={role} bookings={bookings} now={now} />
      <HourlyTrafficCard bookings={bookings} now={now} />
      <OnDutyStaffCard onGo={onGo} />
      <QuickFinanceCard bookings={bookings} now={now} onGo={onGo} />
    </aside>
  );
}
