'use client';
import { useState } from 'react';
import { Bell, PhoneCall, CalendarClock, Globe, Wallet } from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { RoomGrid, roomInfo } from './widgets';

const SOON = 60 * 60_000; // a booking due within the hour needs the front desk's attention

type Task = { id: string; icon: typeof Bell; title: string; detail: string; onClick: () => void };

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
    ...(leads && leads.overdue > 0
      ? [
          {
            id: 'lead-overdue',
            icon: PhoneCall,
            title: `${leads.overdue} lead quá 5 phút chưa gọi`,
            detail: 'Gọi ngay để không mất khách',
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
      onClick: () => setFilter('occupied'),
    },
    {
      key: 'unpaid',
      label: 'Chờ thu',
      value: `${unpaid.length} phiếu`,
      onClick: () => onGo('invoices'),
      warn: unpaid.length > 0,
    },
    {
      key: 'today',
      label: 'Lịch hôm nay',
      value: String(todayCount),
      onClick: () => onGo('bookings'),
    },
    ...(canSeeMoney
      ? [
          {
            key: 'money',
            label: 'Thực thu hôm nay',
            value: money(data.todayReceipts),
            onClick: () => onGo('finance'),
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
    <div className="ds-home">
      <div className="ds-statbar">
        {tiles.map(({ key, label, value, onClick, warn }) => (
          <button key={key} className={warn ? 'warn' : ''} onClick={onClick}>
            <small>{label}</small>
            <strong>{value}</strong>
          </button>
        ))}
      </div>
      <div className="ds-home-grid">
        <section className="ds-panel" aria-label="Sơ đồ phòng">
          <div className="ds-panel-head">
            <h2>Sơ đồ line</h2>
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
          <RoomGrid
            bookings={b}
            filter={filter}
            now={now}
            onSelect={onSelect}
            onBook={onBook}
            onWalkIn={onWalkIn}
          />
        </section>
        <aside className="ds-panel ds-tasks" aria-label="Việc cần làm ngay">
          <div className="ds-panel-head">
            <h2>
              Việc cần làm ngay
              {tasks.length > 0 && <b>{tasks.length}</b>}
            </h2>
          </div>
          {tasks.length ? (
            <ul>
              {tasks.map(({ id, icon: Icon, title, detail, onClick }) => (
                <li key={id}>
                  <button onClick={onClick}>
                    <Icon size={18} />
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
