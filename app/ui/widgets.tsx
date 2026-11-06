'use client';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { labels, time, date } from './shared';
import { DataTable } from './kit';

const SOON_MS = 2 * 3_600_000; // a booking within 2 hours turns the line yellow

export type RoomState = 'free' | 'occupied' | 'soon' | 'due' | 'clean';

/** What is going on in one line right now. */
export function roomInfo(roomId: string, bookings: Booking[], now: number) {
  const mine = bookings.filter((b) => b.room === roomId);
  const live = mine.find((b) => ['playing', 'paused'].includes(b.status));
  // A finished session waiting for payment is opened from the card, so the bill can be collected.
  const due = mine.find((b) => b.status === 'finished');
  const clean = mine.find((b) => b.status === 'paid' && b.end > now);
  const next = mine
    .filter((b) => b.status === 'booked' && b.end > now)
    .sort((a, c) => a.start - c.start)[0];
  const soon = !live && !due && next && next.start - now <= SOON_MS ? next : undefined;
  const state: RoomState = live
    ? 'occupied'
    : due
      ? 'due'
      : clean
        ? 'clean'
        : soon
          ? 'soon'
          : 'free';
  return { live, due, next, soon, state };
}

const STATE_FILTER: Record<string, RoomState[]> = {
  all: ['free', 'occupied', 'soon', 'due', 'clean'],
  free: ['free'],
  occupied: ['occupied'],
  soon: ['soon'],
  due: ['due', 'clean'],
};

const hm = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)}g${String(m % 60).padStart(2, '0')}` : `${m} phút`;
};

/** Compact line cards. Playing = red, free = green, due within 2 hours = yellow, waiting = grey. */
export function RoomGrid({
  bookings,
  filter = 'all',
  now,
  onSelect,
  onBook,
  onWalkIn,
}: {
  bookings: Booking[];
  filter?: string;
  now: number;
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
}) {
  return (
    <div className="room-grid">
      {rooms.map((r) => {
        const { live, due, next, soon, state } = roomInfo(r.id, bookings, now);
        if (!STATE_FILTER[filter].includes(state)) return null;
        const open = live ?? due ?? next;
        const chip = live
          ? labels[live.status]
          : due
            ? 'Chờ thanh toán'
            : state === 'clean'
              ? 'Đang dọn'
              : soon
                ? soon.start > now
                  ? `Còn ${Math.max(1, Math.round((soon.start - now) / 60_000))} phút`
                  : 'Khách chưa đến'
                : 'Trống';
        const info = live
          ? `${live.customer} · ${hm(now - (live.started ?? live.start))}`
          : due
            ? `${due.customer}${due.amount != null ? ' · ' + money(due.amount) : ''}`
            : next
              ? `${next.customer} · ${soon ? '' : date(next.start) + ' '}${time(next.start)}`
              : '';
        const canStart = state === 'free' || state === 'soon';
        return (
          <article
            className={'room-card ' + state + (r.vip ? ' vip' : '')}
            key={r.id}
            data-state={state}
          >
            <button
              type="button"
              className="room-hit"
              onClick={() => (open ? onSelect(open) : onBook(r.id))}
            >
              <span className="rc-head">
                <strong>{r.name}</strong>
                {r.left && <em>Tay trái</em>}
                <span className="rc-chip">{chip}</span>
              </span>
              <span className="rc-info">{info || '\u00a0'}</span>
            </button>
            <div className="room-actions">
              {canStart && (
                <button
                  type="button"
                  className="room-walkin"
                  onClick={() => onWalkIn(r.id)}
                  aria-label={`Bắt đầu ${r.name}`}
                >
                  Bắt đầu
                </button>
              )}
              {(canStart || state === 'clean') && (
                <button
                  type="button"
                  className="room-book"
                  onClick={() => onBook(r.id)}
                  aria-label={`Đặt lịch ${r.name}`}
                >
                  Đặt lịch
                </button>
              )}
              {state === 'occupied' && (
                <button type="button" className="room-open" onClick={() => open && onSelect(open)}>
                  Chi tiết
                </button>
              )}
              {state === 'due' && (
                <button type="button" className="room-pay" onClick={() => open && onSelect(open)}>
                  Thu tiền
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function BookingTable({
  bookings,
  onSelect,
  empty = 'Chưa có lượt đặt nào',
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
  empty?: string;
}) {
  return (
    <DataTable
      rows={bookings}
      rowKey={(b) => b.id}
      empty={empty}
      columns={[
        {
          key: 'customer',
          header: 'Khách hàng',
          cell: (b) => (
            <>
              <button className="customer-name" onClick={() => onSelect(b)}>
                {b.customer}
              </button>
              <small>{b.phone}</small>
            </>
          ),
        },
        { key: 'room', header: 'Line', cell: (b) => rooms.find((r) => r.id === b.room)?.name },
        {
          key: 'when',
          header: 'Ngày & giờ',
          cell: (b) => (
            <>
              {date(b.start)} · {time(b.start)}
            </>
          ),
        },
        {
          key: 'service',
          header: 'Dịch vụ',
          cell: (b) => (
            <>
              {b.service === 'gdr' ? 'Luyện tập' : b.service + ' hố'} · {b.people} người
            </>
          ),
        },
        {
          key: 'status',
          header: 'Trạng thái',
          cell: (b) => <span className={'badge ' + b.status}>{labels[b.status]}</span>,
        },
        {
          key: 'amount',
          header: 'Thành tiền',
          align: 'right',
          cell: (b) => (b.amount == null ? '—' : money(b.amount)),
        },
        {
          key: 'open',
          header: '',
          cell: (b) => (
            <button className="icon-btn" aria-label="Mở chi tiết" onClick={() => onSelect(b)}>
              <ChevronRight size={17} />
            </button>
          ),
        },
      ]}
    />
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <CalendarDays size={29} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
