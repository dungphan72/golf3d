'use client';
import { useState } from 'react';
import {
  Bell,
  CalendarClock,
  Globe,
  Wallet,
  Grid2X2,
  CircleDollarSign,
  CalendarDays,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { RoomGrid } from './widgets';

const SOON = 60 * 60_000; // a booking due within the hour needs the front desk's attention

type Task = { id: string; icon: typeof Bell; title: string; detail: string; onClick: () => void };

/** The first screen: today's numbers, every line at a glance, and what needs doing right now. */
export function HomeBoard({
  data,
  now,
  canSeeMoney,
  onSelect,
  onBook,
  onWalkIn,
  onGo,
}: {
  data: Data;
  now: number;
  canSeeMoney: boolean;
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
  onGo: (view: string) => void;
}) {
  const [filter, setFilter] = useState('all');
  const b = data.bookings;
  const playing = b.filter((x) => ['playing', 'paused'].includes(x.status));
  const unpaid = b.filter((x) => x.status === 'finished');
  const dayStart = Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000;
  const todayCount = b.filter(
    (x) => x.status !== 'cancelled' && x.start >= dayStart && x.start < dayStart + 86_400_000,
  ).length;
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  const tasks: Task[] = [
    ...unpaid.map((x) => ({
      id: 'pay-' + x.id,
      icon: Wallet,
      title: `Thu tiền · ${x.customer}`,
      detail: `${roomName(x.room)}${x.amount != null ? ' · ' + money(x.amount) : ''}`,
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
          onClick: () => onGo('support'),
        };
      }),
    ...((data.onlinePending ?? 0) > 0
      ? [
          {
            id: 'online',
            icon: Globe,
            title: `${data.onlinePending} yêu cầu đặt lịch online chờ xác nhận`,
            detail: 'Bấm để xem và xác nhận',
            onClick: () => onGo('online'),
          },
        ]
      : []),
  ];

  const tiles = [
    {
      key: 'playing',
      label: 'Đang chơi',
      value: `${playing.length}/${rooms.length}`,
      icon: Grid2X2,
      onClick: () => setFilter('all'),
    },
    {
      key: 'unpaid',
      label: 'Chờ thanh toán',
      value: String(unpaid.length),
      icon: CircleDollarSign,
      onClick: () => onGo('invoices'),
      warn: unpaid.length > 0,
    },
    {
      key: 'today',
      label: 'Lịch hôm nay',
      value: String(todayCount),
      icon: CalendarDays,
      onClick: () => onGo('bookings'),
    },
    ...(canSeeMoney
      ? [
          {
            key: 'money',
            label: 'Thực thu hôm nay',
            value: money(data.todayReceipts),
            icon: Wallet,
            onClick: () => onGo('finance'),
          },
        ]
      : []),
  ];

  return (
    <div className="ds-home">
      <div className="ds-tiles">
        {tiles.map(({ key, label, value, icon: Icon, onClick, warn }) => (
          <button key={key} className={'ds-tile' + (warn ? ' warn' : '')} onClick={onClick}>
            <span className="ds-tile-icon">
              <Icon size={22} />
            </span>
            <span className="ds-tile-text">
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          </button>
        ))}
      </div>
      <div className="ds-home-grid">
        <section className="ds-home-rooms" aria-label="Sơ đồ phòng">
          <div className="ds-toolbar">
            <div className="ds-seg" role="tablist">
              {(
                [
                  ['all', `Tất cả · ${rooms.length}`],
                  ['standard', `Line tiêu chuẩn · ${rooms.filter((r) => !r.vip).length}`],
                  ['vip', `Phòng VIP · ${rooms.filter((r) => r.vip).length}`],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={filter === v}
                  className={filter === v ? 'active' : ''}
                  onClick={() => setFilter(v)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="ds-legend">
              <span>
                <i className="free" />
                Trống
              </span>
              <span>
                <i className="inplay" />
                Đang chơi
              </span>
              <span>
                <i className="reserved" />
                Khách đặt trong 2 giờ
              </span>
              <span>
                <i className="cleaning" />
                Chờ thanh toán / dọn
              </span>
            </div>
          </div>
          <RoomGrid
            bookings={b}
            filter={filter}
            now={now}
            onSelect={onSelect}
            onBook={onBook}
            onWalkIn={onWalkIn}
          />
        </section>
        <aside className="ds-tasks" aria-label="Việc cần làm ngay">
          <h2>
            Việc cần làm ngay
            {tasks.length > 0 && <b>{tasks.length}</b>}
          </h2>
          {tasks.length ? (
            <ul>
              {tasks.map(({ id, icon: Icon, title, detail, onClick }) => (
                <li key={id}>
                  <button onClick={onClick}>
                    <Icon size={20} />
                    <span>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-tasks-empty">Không có việc nào đang chờ. Mọi thứ đã xong.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
