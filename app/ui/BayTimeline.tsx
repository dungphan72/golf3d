'use client';
import { useMemo, useState } from 'react';
import { rooms, money, type Booking } from '../../lib/club';
import { time } from './shared';
import { Crown, User, Clock, Plus, Sparkles, AlertCircle } from 'lucide-react';

const TIMELINE_START_HOUR = 8; // 08:00
const TIMELINE_END_HOUR = 23; // 23:00
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 15 hours
const TOTAL_MS = TOTAL_HOURS * 3_600_000;

export function BayTimeline({
  bookings,
  now,
  filter = 'all',
  areaFilter = 'all',
  onSelect,
  onBook,
  onWalkIn,
}: {
  bookings: Booking[];
  now: number;
  filter?: string;
  areaFilter?: 'all' | 'standard' | 'vip';
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
}) {
  const [hoveredBooking, setHoveredBooking] = useState<Booking | null>(null);

  // Compute start of day in Vietnam GMT+7
  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const timelineStart = dayStart + TIMELINE_START_HOUR * 3_600_000;
  const timelineEnd = dayStart + TIMELINE_END_HOUR * 3_600_000;

  // Filter bays by area
  const displayRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (areaFilter === 'standard' && r.vip) return false;
      if (areaFilter === 'vip' && !r.vip) return false;
      return true;
    });
  }, [areaFilter]);

  // Hours array for headers: 8, 9, 10, ... 22
  const hourMarkers = useMemo(() => {
    const arr = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  // Now indicator position
  const nowPercent = ((now - timelineStart) / TOTAL_MS) * 100;
  const isNowInRange = nowPercent >= 0 && nowPercent <= 100;

  return (
    <div className="bay-timeline-container">
      {/* Timeline Controls & Legend */}
      <div className="bay-timeline-header">
        <div className="bay-timeline-legend">
          <span className="legend-item playing">
            <i className="legend-dot" /> Đang chơi
          </span>
          <span className="legend-item booked">
            <i className="legend-dot" /> Đã đặt trước
          </span>
          <span className="legend-item due">
            <i className="legend-dot" /> Chờ thanh toán
          </span>
          <span className="legend-item paid">
            <i className="legend-dot" /> Đã xong
          </span>
        </div>
        <div className="bay-timeline-hint">
          <span>💡 Bấm vào lượt đặt để xem chi tiết · Bấm vào khoảng trống để đặt lịch</span>
        </div>
      </div>

      <div className="bay-timeline-scroll">
        <div className="bay-timeline-grid">
          {/* Header row: Bay Name column + Hour Markers */}
          <div className="bay-timeline-row header-row">
            <div className="bay-name-cell header-cell">Phòng / Line</div>
            <div className="bay-track header-track">
              {hourMarkers.map((h, i) => (
                <div
                  key={h}
                  className="hour-marker"
                  style={{ left: `${((h - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%` }}
                >
                  <span className="hour-label">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current Time NOW indicator line */}
          {isNowInRange && (
            <div className="timeline-now-line" style={{ left: `calc(130px + ${nowPercent}% * 0.85)` }}>
              <div className="now-badge">
                <Clock size={11} /> {time(now)}
              </div>
            </div>
          )}

          {/* Bay Rows */}
          {displayRooms.map((r) => {
            // Find bookings for this room today within timeline
            const roomBookings = bookings.filter(
              (b) =>
                b.room === r.id &&
                b.status !== 'cancelled' &&
                b.end > timelineStart &&
                b.start < timelineEnd,
            );

            return (
              <div key={r.id} className={`bay-timeline-row ${r.vip ? 'vip-row' : ''}`}>
                {/* Left Bay Header */}
                <div className="bay-name-cell">
                  <div className="bay-title-wrap">
                    <strong className="bay-name">{r.name}</strong>
                    {r.vip && (
                      <span className="bay-tag vip" title="Phòng VIP">
                        <Crown size={11} /> VIP
                      </span>
                    )}
                    {r.left && (
                      <span className="bay-tag left" title="Hỗ trợ người thuận tay trái">
                        Trái
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-quick-book"
                    onClick={() => onWalkIn(r.id)}
                    title={`Vào chơi ngay line ${r.name}`}
                  >
                    <Plus size={12} /> Vào line
                  </button>
                </div>

                {/* Right Track with Hour Grid lines & Booking Blocks */}
                <div
                  className="bay-track"
                  onClick={(e) => {
                    // Only trigger if clicked on track itself, not on a booking block
                    if ((e.target as HTMLElement).closest('.timeline-booking-block')) return;
                    onBook(r.id);
                  }}
                  title={`Bấm để đặt lịch line ${r.name}`}
                >
                  {/* Vertical Hour Grid Lines */}
                  {hourMarkers.map((h) => (
                    <div
                      key={h}
                      className="track-hour-line"
                      style={{ left: `${((h - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%` }}
                    />
                  ))}

                  {/* Booking Blocks */}
                  {roomBookings.map((b) => {
                    const clampedStart = Math.max(timelineStart, b.start);
                    const clampedEnd = Math.min(timelineEnd, b.end);
                    if (clampedEnd <= clampedStart) return null;

                    const leftPercent = ((clampedStart - timelineStart) / TOTAL_MS) * 100;
                    const widthPercent = Math.max(1.5, ((clampedEnd - clampedStart) / TOTAL_MS) * 100);

                    const isPlaying = ['playing', 'paused'].includes(b.status);
                    const isDue = b.status === 'finished';
                    const isBooked = b.status === 'booked';
                    const isPaid = b.status === 'paid';

                    const blockClass = isPlaying
                      ? 'playing'
                      : isDue
                      ? 'due'
                      : isBooked
                      ? 'booked'
                      : 'paid';

                    return (
                      <div
                        key={b.id}
                        className={`timeline-booking-block ${blockClass}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(b);
                        }}
                        onMouseEnter={() => setHoveredBooking(b)}
                        onMouseLeave={() => setHoveredBooking(null)}
                      >
                        <div className="block-content">
                          <strong className="block-customer">{b.customer}</strong>
                          <span className="block-time">
                            {time(b.start)} - {time(b.end)}
                          </span>
                        </div>
                        {isPlaying && <span className="pulse-indicator" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Tooltip when hovering booking */}
      {hoveredBooking && (
        <div className="timeline-tooltip-bar animate-fade-in">
          <div className="tooltip-item">
            <User size={13} className="text-emerald" />
            <strong>{hoveredBooking.customer}</strong>
            <span className="phone">({hoveredBooking.phone})</span>
          </div>
          <div className="tooltip-item">
            <Clock size={13} />
            <span>
              {time(hoveredBooking.start)} - {time(hoveredBooking.end)}
            </span>
          </div>
          <div className="tooltip-item">
            <span className="service-badge">{hoveredBooking.service}</span>
          </div>
          {hoveredBooking.amount != null && (
            <div className="tooltip-item price">
              <strong>{money(hoveredBooking.amount)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
