'use client';
import { useState, useMemo } from 'react';
import {
  Bell,
  PhoneCall,
  CalendarClock,
  Wallet,
  Grid2X2,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Plus,
  Play,
  ReceiptText,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { roomInfo } from './widgets';
import { BayTimeline } from './BayTimeline';
import { OwnerProfileCard } from './RightInsightPanel';

const SOON = 60 * 60_000; // a booking due within the hour needs the front desk's attention

type Task = {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  category: 'payment' | 'booking' | 'support' | 'crm';
  categoryLabel: string;
  onClick: () => void;
};

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
  const [filter, setFilter] = useState<'all' | 'occupied' | 'free' | 'due' | 'soon'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  const b = data.bookings;
  const unpaid = b.filter((x) => x.status === 'finished');

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  // Calculate live state for all 10 bays
  const allBayStates = useMemo(() => {
    return rooms.map((r) => ({
      room: r,
      info: roomInfo(r.id, b, now),
    }));
  }, [b, now]);

  // Operational Counts
  const counts = useMemo(() => {
    let free = 0;
    let occupied = 0;
    let soon = 0;
    let due = 0;
    for (const item of allBayStates) {
      if (item.info.state === 'occupied') occupied++;
      else if (item.info.state === 'free') free++;
      else if (item.info.state === 'soon') soon++;
      else if (item.info.state === 'due' || item.info.state === 'clean') due++;
    }
    return { free, occupied, soon, due };
  }, [allBayStates]);

  // Filtered bays
  const visibleBays = useMemo(() => {
    return allBayStates.filter(({ info }) => {
      if (filter === 'occupied') return info.state === 'occupied';
      if (filter === 'free') return info.state === 'free';
      if (filter === 'soon') return info.state === 'soon';
      if (filter === 'due') return info.state === 'due' || info.state === 'clean';
      return true;
    });
  }, [allBayStates, filter]);

  // Priority Tasks
  const tasks: Task[] = useMemo(() => {
    const list: Task[] = [];

    // 1. Chờ thu tiền (Finished bookings)
    for (const x of unpaid) {
      list.push({
        id: 'pay-' + x.id,
        icon: Wallet,
        title: `Thu tiền · ${x.customer}`,
        detail: `${roomName(x.room)}${x.amount != null ? ' · ' + money(x.amount) : ''}`,
        category: 'payment',
        categoryLabel: 'Chờ thu tiền',
        onClick: () => onSelect(x),
      });
    }

    // 2. Khách sắp đến / quá giờ
    const soonBookings = b
      .filter((x) => x.status === 'booked' && x.start <= now + SOON && x.end > now)
      .sort((m, n) => m.start - n.start);

    for (const x of soonBookings) {
      list.push({
        id: 'soon-' + x.id,
        icon: CalendarClock,
        title: `${x.start < now ? 'Quá giờ hẹn' : 'Sắp đến'} · ${x.customer}`,
        detail: `${roomName(x.room)} · ${time(x.start)}`,
        category: 'booking',
        categoryLabel: x.start < now ? 'Quá giờ' : 'Sắp đến',
        onClick: () => onSelect(x),
      });
    }

    // 3. Khách cần hỗ trợ tại phòng
    if (data.requests) {
      for (const r of data.requests.filter((req) => req.status !== 'done')) {
        const booking = b.find((x) => x.id === r.booking);
        list.push({
          id: 'req-' + r.id,
          icon: Bell,
          title: `Hỗ trợ · ${r.kind}`,
          detail: `${roomName(booking?.room ?? '')} · ${booking?.customer ?? ''}`,
          category: 'support',
          categoryLabel: 'Hỗ trợ line',
          onClick: () => onGo('support'),
        });
      }
    }

    // 4. CRM Lead khẩn cấp
    if (leads && leads.overdue > 0) {
      list.push({
        id: 'lead-overdue',
        icon: PhoneCall,
        title: `${leads.overdue} lead quá 5 phút chưa gọi`,
        detail: 'Gọi ngay để chốt lịch thử sân',
        category: 'crm',
        categoryLabel: 'Lead nóng',
        onClick: () => onGo('crmx'),
      });
    }

    return list;
  }, [unpaid, b, now, data.requests, leads, onSelect, onGo]);

  return (
    <div className="modern-asymmetric-cockpit">
      {/* ========================================================================= */}
      {/* 1. LEFT MAIN COLUMN: BẢN ĐỒ SÂN 3D (10 LINE PHÒNG MÔ PHỎNG) */}
      {/* ========================================================================= */}
      <div className="cockpit-main-column">
        {/* Compact Single Operational Bar */}
        <div
          style={{
            background: '#ffffff',
            padding: '12px 16px',
            borderRadius: 5,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: View Mode (Chỉ icon) & Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* View Mode: Only Icons */}
            <div className="view-mode-toggle" role="group" aria-label="Chế độ hiển thị">
              <button
                type="button"
                className={`btn-mode ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Chế độ lưới thẻ 10 phòng"
                style={{ width: 34, height: 32, padding: 0, justifyContent: 'center' }}
              >
                <Grid2X2 size={16} />
              </button>
              <button
                type="button"
                className={`btn-mode ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => setViewMode('timeline')}
                title="Chế độ dòng thời gian Gantt theo line"
                style={{ width: 34, height: 32, padding: 0, justifyContent: 'center' }}
              >
                <CalendarDays size={16} />
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="gcd-bays-filter-pills" style={{ margin: 0 }}>
              <button
                type="button"
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                Tất cả ({rooms.length})
              </button>
              <button
                type="button"
                className={filter === 'occupied' ? 'active' : ''}
                onClick={() => setFilter('occupied')}
              >
                Đang chơi ({counts.occupied})
              </button>
              <button
                type="button"
                className={filter === 'free' ? 'active' : ''}
                onClick={() => setFilter('free')}
              >
                Trống ({counts.free})
              </button>
              {counts.due > 0 && (
                <button
                  type="button"
                  className={filter === 'due' ? 'active' : ''}
                  onClick={() => setFilter('due')}
                >
                  Chờ tính tiền ({counts.due})
                </button>
              )}
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="primary"
              onClick={() => onBook(rooms[0]?.id || '')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} /> Đặt trước
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => onWalkIn(rooms[0]?.id || '')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Play size={14} /> Khách vào chơi
            </button>
          </div>
        </div>

        {/* 10-Bay Interactive Grid (Same as Dashboard's clean cards) */}
        {viewMode === 'grid' ? (
          <div className="gcd-bays-interactive-grid" style={{ marginTop: 0 }}>
            {visibleBays.map(({ room, info }) => {
              const isOccupied = info.state === 'occupied';
              const isDue = info.state === 'due' || info.state === 'clean';
              const isSoon = info.state === 'soon';
              const isVip = room.vip;

              return (
                <div
                  key={room.id}
                  className={`gcd-bay-item-card ${info.state} ${isVip ? 'vip' : ''}`}
                >
                  <div className="bay-item-header">
                    <div className="bay-id-wrap">
                      <strong className="bay-number">{room.name}</strong>
                      <span className={`bay-badge ${isVip ? 'vip' : 'std'}`}>
                        {isVip ? 'VIP GC3' : 'Tiêu chuẩn'}
                      </span>
                    </div>
                    <span className={`bay-status-pill ${info.state}`}>
                      {isOccupied ? 'Đang chơi' : isDue ? 'Chờ thu tiền' : isSoon ? 'Sắp có hẹn' : 'Trống'}
                    </span>
                  </div>

                  <div className="bay-item-body">
                    {isOccupied && info.live ? (
                      <>
                        <div className="bay-player-info">
                          <span className="lbl">Khách chơi:</span>
                          <strong className="val">{info.live.customer}</strong>
                        </div>
                        <div className="bay-time-info">
                          Vào lúc: <strong>{time(info.live.start)}</strong>
                        </div>
                        <button
                          type="button"
                          className="bay-btn pay"
                          onClick={() => onSelect(info.live!)}
                        >
                          <ReceiptText size={13} /> POS tính tiền
                        </button>
                      </>
                    ) : isDue && info.due ? (
                      <>
                        <div className="bay-player-info">
                          <span className="lbl">Khách:</span>
                          <strong className="val">{info.due.customer}</strong>
                        </div>
                        <div className="bay-time-info text-amber">
                          Đã chơi xong
                        </div>
                        <button
                          type="button"
                          className="bay-btn pay"
                          onClick={() => onSelect(info.due!)}
                        >
                          <ReceiptText size={13} /> POS tính tiền
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="bay-empty-hint">Sẵn sàng nhận khách</div>
                        <div className="bay-actions-split">
                          <button
                            type="button"
                            className="bay-btn walkin"
                            onClick={() => onWalkIn(room.id)}
                          >
                            <Play size={12} /> Vào chơi
                          </button>
                          <button
                            type="button"
                            className="bay-btn book"
                            onClick={() => onBook(room.id)}
                          >
                            <Plus size={12} /> Đặt trước
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <BayTimeline
            bookings={b}
            now={now}
            filter={filter}
            areaFilter="all"
            onSelect={onSelect}
            onBook={onBook}
            onWalkIn={onWalkIn}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT COLUMN: 1. CHỦ CƠ SỞ  ->  2. VIỆC CẦN LÀM NGAY (NGAY DƯỚI)       */}
      {/* ========================================================================= */}
      <aside className="right-insight-panel" aria-label="Bảng tiện ích & việc cần làm">
        {/* Item 1: Chủ cơ sở (Profile Card) */}
        <OwnerProfileCard
          user={data?.user ?? ''}
          role={data?.role ?? ''}
          bookings={b}
          now={now}
        />

        {/* Item 2: Việc cần làm ngay (Immediately below Chủ cơ sở) */}
        <div className="ds-panel ds-tasks operate-tasks-panel" role="region" aria-label="Việc cần làm ngay">
          <div className="ds-panel-head">
            <div className="task-header-title">
              <h2>
                Việc cần làm ngay
                {tasks.length > 0 && <b>{tasks.length}</b>}
              </h2>
            </div>
          </div>

          {tasks.length > 0 ? (
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
        </div>
      </aside>
    </div>
  );
}
