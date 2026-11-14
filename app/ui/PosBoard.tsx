'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flag,
  Grid2X2,
  List,
  Monitor,
  PhoneCall,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { rooms, money, type Booking, type Segment } from '../../lib/club';
import { time, type Data } from './shared';
import { roomInfo } from './widgets';
import { BayTimeline } from './BayTimeline';
import { DialogHeading, ModalDialog } from './kit';

const SOON = 60 * 60_000; // a booking due within the hour needs the front desk's attention
const DAY = 86_400_000;
const VN = 7 * 3_600_000;

type Tab = 'all' | 'standard' | 'vip' | 'left';
type LineState = ReturnType<typeof roomInfo>['state'] | 'maintenance';

/** Ticks every second so running timers move; the data itself reloads every 15 s. */
function useTick(ms = 1000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** Played time of a session: closed segments plus the one that is running. */
export function playedMs(b: Booking, at: number) {
  let total = 0;
  try {
    for (const s of JSON.parse(b.segments) as Segment[]) total += s.end - s.start;
  } catch {
    /* a broken segment list shows as 0 instead of breaking the board */
  }
  if (b.status === 'playing' && b.started) total += Math.max(0, at - b.started);
  return total;
}

export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

type Task = {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  tone: 'pay' | 'soon' | 'help' | 'lead';
  onClick: () => void;
};

export function PosBoard({
  data,
  now,
  canSeeMoney,
  leads,
  crm2,
  selectedRoom,
  onSelect,
  onBook,
  onWalkIn,
  onGo,
  onMaintenance,
}: {
  data: Data;
  now: number;
  canSeeMoney: boolean;
  leads?: { overdue: number; waiting: number; queued: number };
  crm2?: { newUnhandled: number; overdueTasks: number };
  selectedRoom?: string;
  onSelect: (b: Booking) => void;
  onBook: (room: string) => void;
  onWalkIn: (room: string) => void;
  onGo: (view: string) => void;
  /** Puts a line under maintenance (on) or back in service (off). Resolves true when saved. */
  onMaintenance: (room: string, on: boolean, reason: string) => Promise<boolean>;
}) {
  const tick = useTick();
  const [maintOpen, setMaintOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [mode, setMode] = useState<'grid' | 'timeline'>('grid');
  const b = data.bookings;
  const name = (data.user.split('@')[0] || 'bạn').trim();
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  const under = useMemo(
    () => new Map((data.maintenance ?? []).map((m) => [m.room, m])),
    [data.maintenance],
  );
  const bays = useMemo(
    () =>
      rooms.map((r) => {
        const info = roomInfo(r.id, b, now);
        // A line with a guest or an unpaid bill keeps showing that; otherwise maintenance wins.
        const state: LineState = under.has(r.id) && !info.live && !info.due ? 'maintenance' : info.state;
        return { room: r, info, state };
      }),
    [b, now, under],
  );
  const dayStart = Math.floor((now + VN) / DAY) * DAY - VN;
  const today = new Date(now + VN);
  const todayLabel = `${String(today.getUTCDate()).padStart(2, '0')}/${String(today.getUTCMonth() + 1).padStart(2, '0')}/${today.getUTCFullYear()}`;

  const playedToday = b.filter(
    (x) =>
      ['playing', 'paused', 'finished', 'paid'].includes(x.status) &&
      (x.started ?? x.start) >= dayStart &&
      (x.started ?? x.start) < dayStart + DAY,
  ).length;
  const inUse = bays.filter(({ state }) => state === 'occupied').length;
  const fill = rooms.length ? Math.round((inUse / rooms.length) * 100) : 0;

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'all', label: 'Tất cả', n: rooms.length },
    { key: 'standard', label: 'Line tiêu chuẩn', n: rooms.filter((r) => !r.vip).length },
    { key: 'vip', label: 'Phòng VIP', n: rooms.filter((r) => r.vip).length },
    { key: 'left', label: 'Line tay trái', n: rooms.filter((r) => r.left).length },
  ];
  const shown = bays.filter(({ room }) =>
    tab === 'all' ? true : tab === 'vip' ? room.vip : tab === 'left' ? room.left : !room.vip,
  );
  // VIP rooms lead the grid, as in the mock-up.
  const ordered = [...shown].sort((m, n) => Number(n.room.vip) - Number(m.room.vip));

  const tasks: Task[] = useMemo(() => {
    const list: Task[] = [];
    for (const x of b.filter((y) => y.status === 'finished'))
      list.push({
        id: 'pay-' + x.id,
        icon: Wallet,
        title: `Thu tiền · ${x.customer}`,
        detail: `${roomName(x.room)}${x.amount != null ? ' · ' + money(x.amount) : ''}`,
        tone: 'pay',
        onClick: () => onSelect(x),
      });
    for (const x of b
      .filter((y) => y.status === 'booked' && y.start <= now + SOON && y.end > now)
      .sort((m, n) => m.start - n.start))
      list.push({
        id: 'soon-' + x.id,
        icon: CalendarClock,
        title: `${x.start < now ? 'Quá giờ hẹn' : 'Sắp đến'} · ${x.customer}`,
        detail: `${roomName(x.room)} · ${time(x.start)}`,
        tone: 'soon',
        onClick: () => onSelect(x),
      });
    for (const r of (data.requests ?? []).filter((q) => q.status !== 'done')) {
      const booking = b.find((x) => x.id === r.booking);
      list.push({
        id: 'req-' + r.id,
        icon: Bell,
        title: `Hỗ trợ · ${r.kind}`,
        detail: `${roomName(booking?.room ?? '')} · ${booking?.customer ?? ''}`,
        tone: 'help',
        onClick: () => onGo('support'),
      });
    }
    if (leads && leads.overdue > 0)
      list.push({
        id: 'lead-overdue',
        icon: PhoneCall,
        title: `${leads.overdue} lead quá 5 phút chưa gọi`,
        detail: 'Gọi ngay để chốt lịch thử line',
        tone: 'lead',
        onClick: () => onGo('crmx'),
      });
    return list;
    // roomName is a pure lookup over the static room list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, now, data.requests, leads, onSelect, onGo]);

  const upcoming = b
    .filter((x) => x.status === 'booked' && x.start >= dayStart && x.start < dayStart + DAY)
    .sort((m, n) => m.start - n.start)
    .slice(0, 6);

  const kpis = [
    { icon: Users, tone: 'ok', label: 'Lượt chơi', value: String(playedToday), foot: 'hôm nay' },
    {
      icon: BarChart3,
      tone: 'ok',
      label: 'Doanh thu',
      value: canSeeMoney ? money(data.todayReceipts) : '—',
      foot: 'đã thu trong ngày',
    },
    { icon: Activity, tone: 'warn', label: 'Tỷ lệ lấp đầy', value: `${fill}%`, foot: `${inUse}/${rooms.length} line đang chơi` },
    {
      icon: CalendarDays,
      tone: 'ok',
      label: 'Đơn đặt mới',
      value: String(data.onlinePending ?? 0),
      foot: crm2?.newUnhandled ? `${crm2.newUnhandled} lead mới` : 'chờ xác nhận',
    },
  ];

  return (
    <div className="pos-board">
      <section className="pos-greet">
        <div>
          <h1>Chào {name}!</h1>
          <p>Quản lý hoạt động line golf 3D hôm nay</p>
        </div>
        <span className="pos-date">
          <CalendarDays size={20} />
          Hôm nay, {todayLabel}
        </span>
      </section>

      <section className="pos-kpis" aria-label="Chỉ số hôm nay">
        {kpis.map((k) => (
          <article key={k.label} className="pos-kpi">
            <i className={'pos-kpi-ic ' + k.tone}>
              <k.icon size={26} strokeWidth={1.8} />
            </i>
            <div>
              <span>{k.label}</span>
              <b>{k.value}</b>
              <small>{k.foot}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="pos-map" aria-label="Sơ đồ phòng và line">
        <header className="pos-map-head">
          <h2>
            <Monitor size={26} strokeWidth={1.8} />
            Sơ đồ phòng / Line
          </h2>
          <div className="pos-tabs" role="tablist" aria-label="Lọc theo khu vực">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? 'on' : ''}
                onClick={() => setTab(t.key)}
              >
                {t.label} ({t.n})
              </button>
            ))}
          </div>
          <button type="button" className="pos-maint-btn" onClick={() => setMaintOpen(true)}>
            <Wrench size={18} /> Bảo trì line
          </button>
          <div className="pos-mode" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={mode === 'grid' ? 'on' : ''}
              aria-label="Xem dạng lưới"
              title="Dạng lưới"
              onClick={() => setMode('grid')}
            >
              <Grid2X2 size={20} />
            </button>
            <button
              type="button"
              className={mode === 'timeline' ? 'on' : ''}
              aria-label="Xem dạng dòng thời gian"
              title="Dòng thời gian"
              onClick={() => setMode('timeline')}
            >
              <List size={20} />
            </button>
          </div>
        </header>

        {mode === 'grid' ? (
          <div className="pos-lines">
            {ordered.map(({ room, info, state }) => {
              const session = info.live ?? info.due ?? info.soon;
              const selected = selectedRoom === room.id;
              const label =
                state === 'occupied'
                  ? 'Đang sử dụng'
                  : state === 'due'
                    ? 'Chờ thu tiền'
                    : state === 'soon'
                      ? 'Đặt trước'
                      : state === 'clean'
                        ? 'Vừa thanh toán'
                        : state === 'maintenance'
                          ? 'Bảo trì'
                          : 'Trống';
              const body = (
                <>
                  {room.vip ? <Crown className="pos-crown" size={22} /> : <Flag className="pos-flag" size={30} strokeWidth={1.7} />}
                  <strong>{room.left ? `${room.name} · tay trái` : room.name}</strong>
                  <span className={'pos-state ' + state}>
                    <i />
                    {label}
                  </span>
                  {session && <small className="pos-who">{session.customer}</small>}
                  {state === 'occupied' && info.live && (
                    <em className="pos-timer">{clock(playedMs(info.live, tick))}</em>
                  )}
                  {state === 'maintenance' && under.get(room.id)?.reason && (
                    <small className="pos-who">{under.get(room.id)!.reason}</small>
                  )}
                  {state === 'soon' && info.soon && <em className="pos-timer soft">{time(info.soon.start)}</em>}
                  {state === 'due' && info.due?.amount != null && canSeeMoney && (
                    <em className="pos-timer soft">{money(info.due.amount)}</em>
                  )}
                </>
              );
              return (
                <div
                  key={room.id}
                  className={`pos-line ${state}${room.vip ? ' vip' : ''}${selected ? ' selected' : ''}`}
                >
                  <button
                    type="button"
                    className="pos-line-main"
                    aria-label={
                      state === 'maintenance'
                        ? `${room.name}: Bảo trì. Quản lý bảo trì`
                        : session
                          ? `${room.name}: ${label}. POS tính tiền`
                          : `${room.name}: Trống. Vào chơi ngay`
                    }
                    onClick={() =>
                      state === 'maintenance'
                        ? setMaintOpen(true)
                        : session
                          ? onSelect(session)
                          : onWalkIn(room.id)
                    }
                  >
                    {body}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <BayTimeline
            bookings={b}
            now={now}
            filter="all"
            areaFilter={tab === 'vip' ? 'vip' : tab === 'standard' ? 'standard' : 'all'}
            onSelect={onSelect}
            onBook={onBook}
            onWalkIn={onWalkIn}
          />
        )}

        <ul className="pos-legend" aria-label="Chú thích trạng thái">
          <li>
            <i className="free" />
            Trống
          </li>
          <li>
            <i className="occupied" />
            Đang sử dụng
          </li>
          <li>
            <i className="soon" />
            Đặt trước
          </li>
          <li>
            <i className="due" />
            Chờ thu tiền
          </li>
          <li>
            <i className="maint" />
            Bảo trì
          </li>
        </ul>
      </section>

      <section className="pos-lower">
        <section className="pos-card" aria-label="Việc cần làm ngay">
          <h2>
            Việc cần làm ngay {tasks.length > 0 && <b className="pos-badge">{tasks.length}</b>}
          </h2>
          {tasks.length ? (
            <ul className="pos-tasks">
              {tasks.map(({ id, icon: Icon, title, detail, tone, onClick }) => (
                <li key={id}>
                  <button type="button" onClick={onClick}>
                    <i className={'pos-task-ic ' + tone}>
                      <Icon size={18} />
                    </i>
                    <span>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pos-empty">
              <CheckCircle2 size={22} /> Không có việc nào đang chờ.
            </p>
          )}
        </section>
        <section className="pos-card" aria-label="Lịch đặt hôm nay">
          <h2>Lịch đặt còn lại hôm nay</h2>
          {upcoming.length ? (
            <ul className="pos-tasks">
              {upcoming.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => onSelect(x)}>
                    <i className="pos-task-ic soon pos-time">{time(x.start)}</i>
                    <span>
                      <strong>{x.customer}</strong>
                      <small>
                        {roomName(x.room)} · {x.people} người
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pos-empty">Chưa có lịch đặt nào trong phần còn lại của ngày.</p>
          )}
          <button type="button" className="pos-link" onClick={() => onGo('bookings')}>
            Xem tất cả lịch đặt <ChevronRight size={15} />
          </button>
        </section>
      </section>
      {maintOpen && (
        <MaintenanceDialog data={data} onClose={() => setMaintOpen(false)} onToggle={onMaintenance} />
      )}
    </div>
  );
}

/** Take lines out of service or bring them back. A line with a guest or an unpaid bill cannot be taken out. */
function MaintenanceDialog({
  data,
  onClose,
  onToggle,
}: {
  data: Data;
  onClose: () => void;
  onToggle: (room: string, on: boolean, reason: string) => Promise<boolean>;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const under = new Map((data.maintenance ?? []).map((m) => [m.room, m]));
  return (
    <ModalDialog label="Bảo trì line" onClose={onClose} locked={!!busy} className="pos-maint">
      <DialogHeading onClose={onClose}>Bảo trì line</DialogHeading>
      <p className="form-note">
        Line đang bảo trì không nhận khách vào chơi hay đặt trước. Bật lại khi sửa xong.
      </p>
      <ul className="pos-maint-list">
        {rooms.map((r) => {
          const row = under.get(r.id);
          const occupied = data.bookings.some(
            (x) => x.room === r.id && ['playing', 'paused', 'finished'].includes(x.status),
          );
          return (
            <li key={r.id} className={row ? 'on' : ''}>
              <div>
                <strong>{r.name}</strong>
                <small>
                  {row
                    ? `Đang bảo trì từ ${time(row.since)}${row.reason ? ' · ' + row.reason : ''}`
                    : occupied
                      ? 'Đang có khách hoặc chờ thu tiền'
                      : 'Đang hoạt động'}
                </small>
              </div>
              {!row ? (
                <input
                  aria-label={`Lý do bảo trì ${r.name}`}
                  placeholder="Lý do (không bắt buộc)"
                  value={reasons[r.id] ?? ''}
                  maxLength={200}
                  disabled={occupied}
                  onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                />
              ) : (
                <span />
              )}
              <button
                type="button"
                className={row ? 'secondary' : 'primary'}
                disabled={!!busy || (!row && occupied)}
                onClick={async () => {
                  setBusy(r.id);
                  await onToggle(r.id, !row, reasons[r.id] ?? '');
                  setBusy('');
                }}
              >
                {row ? 'Hoạt động trở lại' : 'Chuyển sang bảo trì'}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalDialog>
  );
}
