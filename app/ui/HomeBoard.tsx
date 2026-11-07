'use client';
import { useState, useMemo } from 'react';
import {
  Bell,
  PhoneCall,
  CalendarClock,
  Globe,
  Wallet,
  Grid2X2,
  CalendarDays,
  Crown,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Activity,
  Layers,
  Clock,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { RoomGrid, roomInfo } from './widgets';
import { BayTimeline } from './BayTimeline';

const SOON = 60 * 60_000; // a booking due within the hour needs the front desk's attention

type Task = {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  category: 'payment' | 'booking' | 'support' | 'crm' | 'online';
  categoryLabel: string;
  onClick: () => void;
};

/** The first screen: today's numbers, every line at a glance, and what needs doing right now. */
export function HomeBoard({
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
  const [filter, setFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState<'all' | 'standard' | 'vip'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  const b = data.bookings;
  const playing = b.filter((x) => ['playing', 'paused'].includes(x.status));
  const unpaid = b.filter((x) => x.status === 'finished');
  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const todayCount = b.filter(
    (x) => x.status !== 'cancelled' && x.start >= dayStart && x.start < dayStart + 86_400_000,
  ).length;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  const occupancyRate = Math.round((playing.length / rooms.length) * 100);

  const tasks: Task[] = [
    ...unpaid.map((x) => ({
      id: 'pay-' + x.id,
      icon: Wallet,
      title: `Thu tiền · ${x.customer}`,
      detail: `${roomName(x.room)}${x.amount != null ? ' · ' + money(x.amount) : ''}`,
      category: 'payment' as const,
      categoryLabel: 'Chờ thu tiền',
      onClick: () => onSelect(x),
    })),
    ...b
      .filter((x) => x.status === 'booked' && x.start <= now + SOON && x.end > now)
      .sort((a, c) => a.start - c.start)
      .map((x) => ({
        id: 'soon-' + x.id,
        icon: CalendarClock,
        title: `${x.start < now ? 'Khách đặt chưa đến' : 'Sắp đến'} · ${x.customer}`,
        detail: `${roomName(x.room)} · ${time(x.start)}`,
        category: 'booking' as const,
        categoryLabel: x.start < now ? 'Quá giờ hẹn' : 'Khách sắp đến',
        onClick: () => onSelect(x),
      })),
    ...data.requests
      .filter((r) => r.status !== 'done')
      .map((r) => {
        const booking = b.find((x) => x.id === r.booking);
        return {
          id: 'req-' + r.id,
          icon: Bell,
          title: `Khách cần hỗ trợ · ${r.kind}`,
          detail: `${roomName(booking?.room ?? '')} · ${booking?.customer ?? ''}`,
          category: 'support' as const,
          categoryLabel: 'Hỗ trợ tại line',
          onClick: () => onGo('support'),
        };
      }),
    ...(leads && leads.overdue > 0
      ? [
          {
            id: 'lead-overdue',
            icon: PhoneCall,
            title: `${leads.overdue} lead quá 5 phút chưa gọi`,
            detail: 'Gọi ngay để không mất khách',
            category: 'crm' as const,
            categoryLabel: 'Lead khẩn cấp',
            onClick: () => onGo('crm'),
          },
        ]
      : []),
    ...(leads && leads.waiting > 0
      ? [
          {
            id: 'lead-waiting',
            icon: PhoneCall,
            title: `${leads.waiting} lead mới đang chờ gọi`,
            detail:
              leads.queued > 0 ? `${leads.queued} lead chưa có người trực` : 'Trong hạn gọi 5 phút',
            category: 'crm' as const,
            categoryLabel: 'Lead mới',
            onClick: () => onGo('crm'),
          },
        ]
      : []),
    ...(crm2 && crm2.newUnhandled > 0
      ? [
          {
            id: 'crm2-new',
            icon: PhoneCall,
            title: `${crm2.newUnhandled} lead mới ở CRM chưa liên hệ`,
            detail: 'Mở CRM để gọi khách',
            category: 'crm' as const,
            categoryLabel: 'CRM mới',
            onClick: () => onGo('crmx'),
          },
        ]
      : []),
    ...(crm2 && crm2.overdueTasks > 0
      ? [
          {
            id: 'crm2-overdue',
            icon: PhoneCall,
            title: `${crm2.overdueTasks} việc CRM quá hạn`,
            detail: 'Xem trong Việc của tôi',
            category: 'crm' as const,
            categoryLabel: 'CRM quá hạn',
            onClick: () => onGo('crmx'),
          },
        ]
      : []),
    ...((data.onlinePending ?? 0) > 0
      ? [
          {
            id: 'online',
            icon: Globe,
            title: `${data.onlinePending} yêu cầu đặt lịch online chờ xác nhận`,
            detail: 'Bấm để xem và xác nhận',
            category: 'online' as const,
            categoryLabel: 'Đặt web',
            onClick: () => onGo('online'),
          },
        ]
      : []),
  ];

  const counts: Record<string, number> = { free: 0, occupied: 0, soon: 0, due: 0 };
  for (const r of rooms) {
    const st = roomInfo(r.id, b, now).state;
    counts[st === 'clean' ? 'due' : st]++;
  }

  return (
    <div className="ds-home operate-home-cockpit">
      {/* 1. OPERATIONS KPI STATBAR */}
      <div className="ds-statbar operate-statbar">
        {/* KPI 1: Occupancy */}
        <button
          type="button"
          className="kpi-card occupancy-kpi"
          onClick={() => setFilter('occupied')}
        >
          <div className="kpi-icon-wrap emerald">
            <Activity size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label-row">
              <span className="kpi-label">Đang chơi</span>
              <span className="kpi-badge emerald">{occupancyRate}% lấp đầy</span>
            </div>
            <strong className="kpi-val">
              {playing.length}/{rooms.length} <small>line</small>
            </strong>
            <div className="kpi-progress-bar">
              <div
                className="kpi-progress-fill emerald"
                style={{ width: `${Math.min(100, Math.max(8, occupancyRate))}%` }}
              />
            </div>
          </div>
        </button>

        {/* KPI 2: Unpaid Tickets */}
        <button
          type="button"
          className={`kpi-card unpaid-kpi ${unpaid.length > 0 ? 'warn' : ''}`}
          onClick={() => onGo('invoices')}
        >
          <div className={`kpi-icon-wrap ${unpaid.length > 0 ? 'amber pulse' : 'slate'}`}>
            <Wallet size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label-row">
              <span className="kpi-label">Chờ thu</span>
              {unpaid.length > 0 && <span className="kpi-badge amber">Cần chốt hóa đơn</span>}
            </div>
            <strong className="kpi-val">
              {unpaid.length} <small>phiếu</small>
            </strong>
            <span className="kpi-hint">
              {unpaid.length > 0 ? 'Khách chơi xong chưa thanh toán' : 'Không có công nợ chờ'}
            </span>
          </div>
        </button>

        {/* KPI 3: Bookings Today */}
        <button
          type="button"
          className="kpi-card today-kpi"
          onClick={() => onGo('bookings')}
        >
          <div className="kpi-icon-wrap blue">
            <CalendarClock size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label-row">
              <span className="kpi-label">Lịch hôm nay</span>
              <span className="kpi-badge blue">Hôm nay</span>
            </div>
            <strong className="kpi-val">
              {todayCount} <small>lượt đặt</small>
            </strong>
            <span className="kpi-hint">Tổng lượt đặt line trong ngày</span>
          </div>
        </button>

        {/* KPI 4: Today Revenue (if authorized) */}
        {canSeeMoney && (
          <button
            type="button"
            className="kpi-card revenue-kpi"
            onClick={() => onGo('finance')}
          >
            <div className="kpi-icon-wrap gold">
              <Sparkles size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-label-row">
                <span className="kpi-label">Thực thu hôm nay</span>
                <span className="kpi-badge gold">Sổ ca</span>
              </div>
              <strong className="kpi-val text-gold">{money(data.todayReceipts)}</strong>
              <span className="kpi-hint">Đã đối soát ghi nhận ca trực</span>
            </div>
          </button>
        )}
      </div>

      {/* 2. MAIN COCKPIT: BAY MAP & PRIORITY TASKS */}
      <div className="ds-home-grid">
        <section className="ds-panel operate-map-panel" aria-label="Sơ đồ phòng">
          <div className="ds-panel-head operate-panel-header">
            <div className="head-title-wrap">
              <h2>Sơ đồ line</h2>
              <span className="bay-count-badge">12 line mô phỏng</span>
            </div>

            {/* View Mode & Area Controls */}
            <div className="operate-controls-cluster">
              {/* View Switcher: Grid vs Timeline */}
              <div className="view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
                <button
                  type="button"
                  className={`btn-mode ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Chế độ thẻ line trực quan"
                >
                  <Grid2X2 size={15} />
                  <span>Lưới thẻ</span>
                </button>
                <button
                  type="button"
                  className={`btn-mode ${viewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => setViewMode('timeline')}
                  title="Chế độ dòng thời gian Gantt theo line"
                >
                  <CalendarDays size={15} />
                  <span>Dòng thời gian</span>
                </button>
              </div>

              {/* Area Switcher: All vs Standard vs VIP */}
              <div className="area-filter-toggle" role="group" aria-label="Phân khu">
                <button
                  type="button"
                  className={`btn-area ${areaFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setAreaFilter('all')}
                >
                  Tất cả ({rooms.length})
                </button>
                <button
                  type="button"
                  className={`btn-area ${areaFilter === 'standard' ? 'active' : ''}`}
                  onClick={() => setAreaFilter('standard')}
                >
                  Line thường (10)
                </button>
                <button
                  type="button"
                  className={`btn-area vip ${areaFilter === 'vip' ? 'active' : ''}`}
                  onClick={() => setAreaFilter('vip')}
                >
                  <Crown size={12} /> VIP (2)
                </button>
              </div>

              {/* Status Segment Filter: strictly preserving test attributes */}
              <div className="ds-seg" role="group" aria-label="Lọc theo trạng thái">
                {(
                  [
                    ['all', 'Tất cả', rooms.length, ''],
                    ['free', 'Trống', counts.free, 'free'],
                    ['occupied', 'Đang chơi', counts.occupied, 'inplay'],
                    ['soon', 'Sắp có khách', counts.soon, 'reserved'],
                    ['due', 'Chờ thu / dọn', counts.due, 'cleaning'],
                  ] as const
                ).map(([v, t, n, dot]) => (
                  <button
                    key={v}
                    aria-pressed={filter === v}
                    className={filter === v ? 'active' : ''}
                    onClick={() => setFilter(v)}
                  >
                    {dot && <i className={'dot ' + dot} />}
                    {t} · {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Render Active View */}
          {viewMode === 'grid' ? (
            <RoomGrid
              bookings={b}
              filter={filter}
              areaFilter={areaFilter}
              now={now}
              onSelect={onSelect}
              onBook={onBook}
              onWalkIn={onWalkIn}
            />
          ) : (
            <BayTimeline
              bookings={b}
              now={now}
              filter={filter}
              areaFilter={areaFilter}
              onSelect={onSelect}
              onBook={onBook}
              onWalkIn={onWalkIn}
            />
          )}
        </section>

        {/* 3. PRIORITY TASKS SIDEBAR */}
        <aside className="ds-panel ds-tasks operate-tasks-panel" aria-label="Việc cần làm ngay">
          <div className="ds-panel-head">
            <div className="task-header-title">
              <h2>
                Việc cần làm ngay
                {tasks.length > 0 && <b>{tasks.length}</b>}
              </h2>
            </div>
          </div>

          {tasks.length ? (
            <ul className="operate-task-list">
              {tasks.map(({ id, icon: Icon, title, detail, category, categoryLabel, onClick }) => (
                <li key={id} className={`task-item category-${category}`}>
                  <button type="button" onClick={onClick} className="task-item-btn">
                    <div className={`task-icon-circle ${category}`}>
                      <Icon size={16} />
                    </div>
                    <div className="task-text-body">
                      <div className="task-title-line">
                        <strong className="task-title">{title}</strong>
                        <span className={`task-category-pill ${category}`}>{categoryLabel}</span>
                      </div>
                      <small className="task-detail">{detail}</small>
                    </div>
                    <ChevronRight size={14} className="task-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ds-tasks-empty-state">
              <div className="empty-check-wrap">
                <CheckCircle2 size={36} className="text-emerald" />
              </div>
              <h4>Không có việc nào đang chờ</h4>
              <p>Mọi yêu cầu, thanh toán và cuộc gọi đều đã hoàn tất.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
