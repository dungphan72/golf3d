'use client';
import { Flag, CalendarDays, ArrowUpRight, Plus, ChevronRight } from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { labels, time, date } from './shared';
const SOON_MS = 2 * 3_600_000; // a booking within 2 hours turns the line yellow

/** Line states: playing = red, free = green, a booking within 2 hours = yellow, waiting for payment or cleaning = grey. */
export function RoomGrid({
  bookings,
  filter,
  now,
  onSelect,
  onBook,
  onWalkIn,
}: {
  bookings: Booking[];
  filter: string;
  now: number;
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
}) {
  return (
    <div className="room-grid">
      {rooms
        .filter((r) => filter === 'all' || (filter === 'vip' ? r.vip : !r.vip))
        .map((r) => {
          const live = bookings.find(
            (b) => b.room === r.id && ['playing', 'paused'].includes(b.status),
          );
          // A finished session waiting for payment is opened from the card, so the bill can be collected.
          const due = bookings.find((b) => b.room === r.id && b.status === 'finished');
          const clean = bookings.find(
            (b) => b.room === r.id && ['finished', 'paid'].includes(b.status) && b.end > now,
          );
          const next = bookings
            .filter((b) => b.room === r.id && b.status === 'booked' && b.end > now)
            .sort((a, b) => a.start - b.start)[0];
          const soon = !live && !due && next && next.start - now <= SOON_MS ? next : undefined;
          const state = live ? 'occupied' : due || clean ? 'clean' : soon ? 'soon' : 'free';
          const item = live ?? due ?? next;
          const minutesLeft = soon ? Math.round((soon.start - now) / 60_000) : 0;
          const canWalkIn = state === 'free' || state === 'soon';
          return (
            <article
              className={'room-card ' + state + (r.vip ? ' vip' : '')}
              key={r.id}
              data-state={state}
            >
              <button
                type="button"
                className="room-hit"
                onClick={() => (item ? onSelect(item) : onBook(r.id))}
              >
                <div className="room-top">
                  <span className="room-type">
                    {r.vip ? 'PHÒNG VIP' : r.left ? 'TAY TRÁI' : 'LUYỆN TẬP'}
                  </span>
                  {r.vip ? (
                    <Flag size={17} />
                  ) : (
                    <span className="room-number">{r.id.split('-')[1].padStart(2, '0')}</span>
                  )}
                </div>
                <h3>{r.name}</h3>
                <span className="room-status">
                  {live
                    ? labels[live.status]
                    : due
                      ? 'Chờ thanh toán'
                      : clean
                        ? 'Đang dọn'
                        : soon
                          ? minutesLeft > 0
                            ? `Sắp có khách · còn ${minutesLeft} phút`
                            : 'Khách đặt chưa đến'
                          : 'Trống'}
                </span>
                <div className="room-bottom">
                  {live ? (
                    <>
                      <span>{live.customer}</span>
                      <span>{time(live.start)}</span>
                    </>
                  ) : due ? (
                    <>
                      <span>{due.customer} · bấm để thu tiền</span>
                      <ArrowUpRight size={14} />
                    </>
                  ) : next ? (
                    <>
                      <span>
                        {soon ? `${soon.customer} · ` : 'Có lịch '}
                        {date(next.start)} · {time(next.start)}
                      </span>
                      <ArrowUpRight size={14} />
                    </>
                  ) : (
                    <>
                      <span>
                        {r.vip
                          ? 'Không gian riêng tư'
                          : r.left
                            ? 'Dành cho golfer tay trái'
                            : 'Chọn để đặt lịch'}
                      </span>
                      <Plus size={15} />
                    </>
                  )}
                </div>
              </button>
              <div className="room-actions">
                <button
                  type="button"
                  className="room-walkin"
                  disabled={!canWalkIn}
                  onClick={() => onWalkIn(r.id)}
                  aria-label={`Bắt đầu ${r.name}`}
                >
                  Bắt đầu
                </button>
                <button
                  type="button"
                  className="room-book"
                  onClick={() => onBook(r.id)}
                  aria-label={`Đặt lịch ${r.name}`}
                >
                  Đặt lịch
                </button>
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
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  if (!bookings.length)
    return (
      <Empty
        title="Chưa có lịch trong danh sách"
        text="Tạo lịch đặt đầu tiên để bắt đầu quản lý trải nghiệm tại Saigon Golf 3D Club."
      />
    );
  return (
    <div className="table-wrap">
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Phòng / Line</th>
            <th>Ngày & giờ</th>
            <th>Dịch vụ</th>
            <th>Trạng thái</th>
            <th>Thành tiền</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                <button className="customer-name" onClick={() => onSelect(b)}>
                  {b.customer}
                </button>
                <small>{b.phone}</small>
              </td>
              <td>{rooms.find((r) => r.id === b.room)?.name}</td>
              <td>
                {date(b.start)} · {time(b.start)}
              </td>
              <td>
                {b.service === 'gdr' ? 'Luyện tập' : b.service + ' hố'} · {b.people} người
              </td>
              <td>
                <span className={'badge ' + b.status}>{labels[b.status]}</span>
              </td>
              <td>{b.amount == null ? '—' : money(b.amount)}</td>
              <td>
                <button className="icon-btn" aria-label="Mở chi tiết" onClick={() => onSelect(b)}>
                  <ChevronRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
