'use client';
import { useState, useMemo } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Users,
  Activity,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { HourlyTrafficCard, OnDutyStaffCard } from './RightInsightPanel';

export function DashboardView({
  data,
  now,
  canSeeMoney,
  leads,
  crm2,
  onSelect,
  onBook,
  onWalkIn,
  onGo,
}: {
  data: Data;
  now: number;
  canSeeMoney: boolean;
  leads?: { overdue: number; waiting: number; queued: number };
  crm2?: { newUnhandled: number; overdueTasks: number };
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
  onGo: (view: string) => void;
}) {
  const b = data.bookings;
  const playing = b.filter((x) => ['playing', 'paused'].includes(x.status));

  // Current Vietnam Date
  const vnDateStr = useMemo(() => {
    const d = new Date(now + 7 * 3600_000);
    const dayOfWeekNames = [
      'CHỦ NHẬT',
      'THỨ HAI',
      'THỨ BA',
      'THỨ TƯ',
      'THỨ NĂM',
      'THỨ SÁU',
      'THỨ BẢY',
    ];
    const dow = dayOfWeekNames[d.getUTCDay()];
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    return `${dow}, ${day} THÁNG ${month}`;
  }, [now]);

  // Generate 7-day strip centered around current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const d = new Date(now + 7 * 3600_000);
    const curDow = d.getUTCDay(); // 0 is Sunday, 1 is Monday
    const mondayOffset = curDow === 0 ? -6 : 1 - curDow;
    const mondayTime = d.getTime() + mondayOffset * 86400_000;

    const list = [];
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(mondayTime + i * 86400_000);
      list.push({
        label: labels[i],
        dayNum: dayDate.getUTCDate(),
        isToday: i === (curDow === 0 ? 6 : curDow - 1),
        fullDate: dayDate,
      });
    }
    return list;
  }, [now]);

  // Initialize selected day to today
  const todayIdx = useMemo(() => {
    const idx = weekDays.findIndex((w) => w.isToday);
    return idx >= 0 ? idx : 0;
  }, [weekDays]);

  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(todayIdx);

  // Day Start of Today
  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const todayBookings = useMemo(() => {
    return b.filter(
      (x) => x.status !== 'cancelled' && x.start >= dayStart && x.start < dayStart + 86_400_000,
    ).sort((m, n) => m.start - n.start);
  }, [b, dayStart]);

  // Bookings for the selected day in week strip
  const selectedDayBookings = useMemo(() => {
    const selDay = weekDays[selectedDayIdx];
    if (!selDay) return todayBookings;
    // fullDate is already shifted to Vietnam time (UTC fields), so rebuild the real start of that day.
    const t = selDay.fullDate;
    const dStart = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - 7 * 3_600_000;
    const dEnd = dStart + 86_400_000;
    return b.filter(
      (x) => x.status !== 'cancelled' && x.start >= dStart && x.start < dEnd,
    ).sort((m, n) => m.start - n.start);
  }, [b, weekDays, selectedDayIdx, todayBookings]);

  // Formatted appointment list
  const displayAppointments = useMemo(() => {
    if (selectedDayBookings.length > 0) {
      return selectedDayBookings.map((item) => {
        const rName = rooms.find((r) => r.id === item.room)?.name ?? item.room;
        const isVip = item.room.startsWith('vip');
        return {
          id: item.id,
          time: time(item.start),
          name: item.customer,
          detail: `${item.phone ? item.phone + ' · ' : ''}${rName}${isVip ? ' (VIP)' : ''}`,
          price: item.amount != null && canSeeMoney ? money(item.amount) : '',
          status: item.status,
          line: rName,
          raw: item,
        };
      });
    }
    return [];
  }, [selectedDayBookings, canSeeMoney]);

  // Formatted revenue display
  const revenueDisplay = useMemo(() => {
    if (!canSeeMoney) return '—';
    return money(data.todayReceipts);
  }, [canSeeMoney, data.todayReceipts]);

  // Tee time utilization rate
  const totalLines = rooms.length;
  const linesInUse = new Set(playing.map((p) => p.room)).size;
  const utilizationPercent = totalLines ? Math.round((linesInUse / totalLines) * 100) : 0;

  // Dynamic Avatar stack from golfers in the club today
  const golferAvatars = useMemo(() => {
    const names = [
      ...playing.map((p) => p.customer),
      ...todayBookings.map((t) => t.customer),
    ].filter(Boolean);
    const unique = Array.from(new Set(names)).slice(0, 4);

    const colors = ['c1', 'c2', 'c3', 'c4'];
    return unique.map((name, i) => {
      const parts = name.trim().split(' ');
      const initials = parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : name.slice(0, 2);
      return {
        initials: initials.toUpperCase(),
        name,
        colorClass: colors[i % colors.length],
      };
    });
  }, [playing, todayBookings]);

  return (
    <div className="golf-crm-dashboard">
      {/* 1. GREETING & WEATHER BANNER */}
      <section className="gcd-hero-strip">
        <div className="gcd-hero-left">
          <span className="gcd-date-eyebrow">{vnDateStr}</span>
          <h1 className="gcd-hero-headline">Tổng quan vận hành hôm nay</h1>
        </div>
        <div className="gcd-weather-card">
          <div className="gcd-weather-icon-wrap">
            <Activity size={26} className="gcd-sun-icon" />
          </div>
          <div className="gcd-weather-info">
            <div className="gcd-weather-temp">
              {linesInUse} / {totalLines}
            </div>
            <div className="gcd-weather-desc">line đang có khách</div>
          </div>
        </div>
      </section>

      {/* 2. 4 TOP KPI METRIC CARDS */}
      <section className="gcd-kpi-grid">
        {/* Card 1: Doanh thu hôm nay */}
        <div
          className="gcd-kpi-card"
          onClick={() => onGo('invoices')}
          role="button"
          tabIndex={0}
          title="Bấm để xem chi tiết hóa đơn & thu ngân"
        >
          <div className="gcd-kpi-header">
            <span className="gcd-kpi-label">DOANH THU HÔM NAY</span>
            <div className="gcd-kpi-icon-box gold">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="gcd-kpi-body">
            <div className="gcd-kpi-main-val">{revenueDisplay}</div>
            <div className="gcd-kpi-foot-row">
              <span className="gcd-trend-text">Tiền đã thu và ghi sổ trong ngày</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tee Time */}
        <div
          className="gcd-kpi-card"
          onClick={() => onGo('rooms')}
          role="button"
          tabIndex={0}
          title="Bấm để mở POS tính tiền"
        >
          <div className="gcd-kpi-header">
            <span className="gcd-kpi-label">LỊCH ĐẶT HÔM NAY</span>
            <div className="gcd-kpi-icon-box green">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="gcd-kpi-body">
            <div className="gcd-kpi-main-val">
              {todayBookings.length} <span className="gcd-val-sub">lượt đặt</span>
            </div>
            <div className="gcd-kpi-progress-wrap">
              <div className="gcd-progress-track">
                <div className="gcd-progress-fill" style={{ width: `${utilizationPercent}%` }} />
              </div>
              <span className="gcd-progress-label">{linesInUse}/{totalLines} line đang chơi ({utilizationPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Khách Check-in */}
        <div
          className="gcd-kpi-card"
          onClick={() => onGo('members')}
          role="button"
          tabIndex={0}
          title="Bấm để xem danh sách hội viên & khách hàng"
        >
          <div className="gcd-kpi-header">
            <span className="gcd-kpi-label">ĐANG CHƠI</span>
            <div className="gcd-kpi-icon-box blue">
              <Users size={18} />
            </div>
          </div>
          <div className="gcd-kpi-body">
            <div className="gcd-kpi-main-val">
              {playing.length} <span className="gcd-val-sub">lượt</span>
            </div>
            <div className="gcd-checkin-foot">
              <span className="gcd-live-status">
                <i className="gcd-pulse-dot" />
                <strong>{playing.length}</strong> lượt đang chơi hoặc tạm dừng
              </span>
              {/* Dynamic Avatar stack */}
              <div className="gcd-avatar-stack">
                {golferAvatars.map((avt) => (
                  <span
                    key={avt.name}
                    className={`gcd-stk-avt ${avt.colorClass}`}
                    title={avt.name}
                  >
                    {avt.initials}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Lead CRM Mới */}
        <div
          className="gcd-kpi-card"
          onClick={() => onGo('crmx')}
          role="button"
          tabIndex={0}
          title="Bấm để mở CRM & phân bổ khách tiềm năng"
        >
          <div className="gcd-kpi-header">
            <span className="gcd-kpi-label">LEAD CRM MỚI</span>
            <div className="gcd-kpi-icon-box coral">
              <Megaphone size={18} />
            </div>
          </div>
          <div className="gcd-kpi-body">
            <div className="gcd-kpi-main-val">
              {crm2?.newUnhandled ?? leads?.waiting ?? 0}{' '}
              <span className="gcd-val-sub">leads</span>
            </div>
            <div className="gcd-crm-foot">
              <span className="gcd-crm-subtext">
                Lead mới chưa xử lý
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN SECTION: 2-COLUMN (62% TEE TIME LIST : 38% MẬT ĐỘ KHUNG GIỜ & ĐỘI NGŨ TRỰC CA) */}
      <section className="gcd-main-layout">
        {/* LEFT / PRIMARY COLUMN: LỊCH HÔM NAY / TEE TIME SẮP TỚI */}
        <div className="gcd-panel gcd-tee-time-panel">
          <div className="gcd-panel-header">
            <div>
              <span className="gcd-panel-eyebrow">LỊCH HÔM NAY</span>
              <h2 className="gcd-panel-title">Tee time sắp tới</h2>
            </div>
            <button
              type="button"
              className="gcd-view-all-btn"
              onClick={() => onGo('bookings')}
            >
              <span>Xem tất cả</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* 7-Day Horizontal Mini Calendar Strip */}
          <div className="gcd-week-strip">
            {weekDays.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                className={`gcd-day-capsule ${selectedDayIdx === idx ? 'active' : ''}`}
                onClick={() => setSelectedDayIdx(idx)}
                title={`Xem lịch ngày ${item.label} ${item.dayNum}`}
              >
                <span className="day-label">{item.label}</span>
                <span className="day-num">{item.dayNum}</span>
              </button>
            ))}
          </div>

          {/* Upcoming Tee Times List */}
          {displayAppointments.length === 0 && (
            <p className="gcd-appt-empty" style={{ padding: '16px', color: '#64748b' }}>
              Chưa có lịch đặt nào trong ngày này.
            </p>
          )}
          <ul className="gcd-appointments-list">
            {displayAppointments.map((appt) => (
              <li
                key={appt.id}
                className="gcd-appt-item"
                onClick={() => {
                  if ('raw' in appt && appt.raw) {
                    onSelect(appt.raw as Booking);
                  } else {
                    onGo('bookings');
                  }
                }}
              >
                <div className="gcd-appt-time-col">
                  <span className="gcd-appt-time">{appt.time}</span>
                </div>
                <div className="gcd-appt-divider-bar" />
                <div className="gcd-appt-info-col">
                  <strong className="gcd-appt-name">{appt.name}</strong>
                  <span className="gcd-appt-detail">{appt.detail}</span>
                </div>
                <div className="gcd-appt-price-col">
                  <span className="gcd-appt-price">{appt.price}</span>
                  <ChevronRight size={14} className="gcd-appt-chevron" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT / SECONDARY COLUMN: MẬT ĐỘ KHUNG GIỜ & ĐỘI NGŨ TRỰC CA */}
        <div className="gcd-dashboard-aside" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HourlyTrafficCard bookings={b} now={now} />
          <OnDutyStaffCard onGo={onGo} />
        </div>
      </section>
    </div>
  );
}
