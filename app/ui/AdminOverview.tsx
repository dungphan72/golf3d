'use client';
import { useEffect, useState } from 'react';
import { auditDetailText } from '../../lib/audit-text';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Crown,
  Eye,
  Gem,
  ReceiptText,
  Settings,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, type Data } from './shared';
import { PwaInstallCard } from './PwaInstallPrompt';
type Report = { days: { day: string; cash: number; transfer: number; card: number }[] };
const vnDay = (ms: number) => new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
const status: Record<string, string> = {
  playing: 'Đang chơi',
  paused: 'Tạm dừng',
  booked: 'Sắp tới',
  finished: 'Chờ thanh toán',
  paid: 'Hoàn thành',
};
/** Axis label in millions: 0, 0,3M, 1M… (a whole number is shown without decimals). */
function axisMoney(v: number) {
  if (v <= 0) return '0';
  const m = v / 1_000_000;
  return (Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',')) + 'M';
}

export function AdminOverview({
  data,
  now,
  canSeeMoney,
  onGo,
  onBook,
  onSelect,
}: {
  data: Data;
  now: number;
  canSeeMoney: boolean;
  onGo: (v: string) => void;
  onBook: (r: string) => void;
  onSelect: (b: Booking) => void;
}) {
  const [metric, setMetric] = useState<'revenue' | 'bookings' | 'members'>('revenue'),
    [filter, setFilter] = useState('all'),
    [report, setReport] = useState<Report | null>(null),
    [reportError, setReportError] = useState(''),
    [retry, setRetry] = useState(0);
  const today = vnDay(now),
    from = vnDay(now - 6 * 86400000);
  useEffect(() => {
    if (!canSeeMoney) return;
    const controller = new AbortController();
    fetch(`/api/reports?from=${from}&to=${today}`, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Chưa tải được doanh thu.');
        return (await r.json()) as Report;
      })
      .then((r) => {
        setReport(r);
        setReportError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setReportError(e.message);
      });
    return () => controller.abort();
  }, [today, from, canSeeMoney, data.todayReceipts, retry]);
  const bookings = data.bookings
    .filter((b) => vnDay(b.start) === today && b.status !== 'cancelled')
    .sort((a, b) => a.start - b.start);
  const active = data.bookings.filter((b) => ['playing', 'paused'].includes(b.status));
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = vnDay(now - (6 - i) * 86400000),
      d = report?.days.find((d) => d.day === day),
      counts = data.dashboardDays?.find((d) => d.day === day);
    return {
      day,
      revenue: d ? d.cash + d.transfer + d.card : 0,
      bookings: counts?.bookings ?? 0,
      members: counts?.members ?? 0,
    };
  });
  const values = days.map((d) =>
      metric === 'revenue' ? d.revenue : metric === 'bookings' ? d.bookings : d.members,
    ),
    max = Math.max(metric === 'revenue' ? 1000000 : 1, ...values) * 1.15;
  const minimum = Math.min(0, ...values);
  const chartY = (value: number) => 190 - ((value - minimum) / (max - minimum)) * 150;
  const baseline = chartY(0);
  const revenue = days.reduce((n, d) => n + d.revenue, 0);
  const chartPoints = values.map((v, i) => `${65 + i * 77},${chartY(v)}`).join(' ');
  const lineBookings = days
    .map(
      (d, i) =>
        `${65 + i * 77},${190 - (d.bookings / Math.max(1, ...days.map((x) => x.bookings))) * 110}`,
    )
    .join(' ');
  const filtered = bookings.filter(
    (b) =>
      filter === 'all' ||
      (filter === 'playing' && ['playing', 'paused'].includes(b.status)) ||
      (filter === 'booked' && b.status === 'booked') ||
      (filter === 'done' && ['finished', 'paid'].includes(b.status)),
  );
  const roomStates = rooms.map((room) => {
    const playing = active.find((b) => b.room === room.id),
      booked = bookings.find((b) => b.room === room.id && b.status === 'booked' && b.end > now),
      maintenance = data.maintenance?.find((m) => m.room === room.id);
    return {
      ...room,
      booking: playing || booked,
      kind: maintenance ? 'maintenance' : playing ? 'playing' : booked ? 'booked' : 'empty',
      maintenance,
    };
  });
  const kpis = [
    {
      label: 'Doanh thu hôm nay',
      value: canSeeMoney ? money(data.todayReceipts) : '—',
      icon: Coins,
      tone: 'green',
      hint: 'Đã thu trong ngày',
      view: 'reports',
    },
    {
      label: 'Lượt đặt sân',
      value: data.summary?.bookings ?? bookings.length,
      icon: CalendarDays,
      tone: 'blue',
      hint: 'Lịch đặt hôm nay',
      view: 'bookings',
    },
    {
      label: 'Khách hàng',
      value: data.summary?.customers ?? '—',
      icon: Users,
      tone: 'gold',
      hint: 'Khách hàng trong hệ thống',
      view: 'crmx',
    },
    {
      label: 'Hội viên',
      value: data.summary?.members ?? '—',
      icon: Gem,
      tone: 'purple',
      hint: 'Có gói còn hạn',
      view: 'members',
    },
  ];
  return (
    <div className="ao-dashboard">
      <div className="ao-mobile-heading">
        <div>
          <h1>Xin chào, {data.user.split('@')[0] || 'Admin'}</h1>
          <p>Tổng quan hoạt động hôm nay</p>
        </div>
        <span>
          <CalendarDays />
          Hôm nay, {new Date(now).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
        </span>
      </div>
      <PwaInstallCard />
      <div className="ao-kpis">
        {kpis.map(({ label, value, icon: I, tone, hint, view }) => (
          <button className={'ao-kpi ao-tone-' + tone} key={label} onClick={() => onGo(view)}>
            <span className="ao-kpi-icon">
              <I />
            </span>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              <em>{hint}</em>
            </span>
          </button>
        ))}
      </div>
      <div className="ao-middle">
        <section className="ao-panel ao-chart">
          <header>
            <h2>Doanh thu 7 ngày gần nhất</h2>
            <div className="ao-chart-legend">
              <span>● Doanh thu</span>
              <span>● Lượt đặt sân</span>
            </div>
          </header>
          <div className="ao-chart-mobile-summary">
            <strong>
              {metric === 'revenue'
                ? canSeeMoney && report
                  ? money(revenue)
                  : '—'
                : values.reduce((n, v) => n + v, 0).toLocaleString('vi-VN')}
            </strong>
            <div className="ao-chart-tabs">
              {(['revenue', 'bookings', 'members'] as const).map((v) => (
                <button className={metric === v ? 'on' : ''} key={v} onClick={() => setMetric(v)}>
                  {v === 'revenue' ? 'Doanh thu' : v === 'bookings' ? 'Lượt đặt' : 'Hội viên'}
                </button>
              ))}
            </div>
          </div>
          {reportError && metric === 'revenue' ? (
            <p className="ao-empty" role="alert">
              {reportError}
              <button onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
            </p>
          ) : !canSeeMoney && metric === 'revenue' ? (
            <p className="ao-empty">Bạn không có quyền xem doanh thu.</p>
          ) : (
            <svg
              className="ao-chart-svg"
              viewBox="0 0 600 230"
              role="img"
              aria-label={
                metric === 'revenue'
                  ? 'Doanh thu trong 7 ngày'
                  : metric === 'bookings'
                    ? 'Lượt đặt sân trong 7 ngày'
                    : 'Hội viên mua gói trong 7 ngày'
              }
            >
              <defs>
                <linearGradient id="ao-bars" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#16a23a" />
                  <stop offset="1" stopColor="#a4e3aa" />
                </linearGradient>
                <linearGradient id="ao-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#41ba5f" stopOpacity=".45" />
                  <stop offset="1" stopColor="#41ba5f" stopOpacity=".06" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line x1="45" x2="567" y1={190 - i * 38} y2={190 - i * 38} stroke="#e4eaf2" />
                  <text x="34" y={195 - i * 38} textAnchor="end" fontSize="13" fill="#43536b">
                    {metric === 'revenue'
                      ? axisMoney(minimum + ((max - minimum) * i) / 4)
                      : Math.round(minimum + ((max - minimum) * i) / 4)}
                  </text>
                </g>
              ))}
              <g className="ao-desktop-bars">
                {days.map((d, i) => (
                  <rect
                    key={d.day}
                    x={38 + i * 77}
                    y={Math.min(chartY(d.revenue), baseline)}
                    width="52"
                    height={Math.abs(chartY(d.revenue) - baseline)}
                    fill="url(#ao-bars)"
                    rx="6"
                  >
                    <title>
                      {d.day}: {money(d.revenue)}
                    </title>
                  </rect>
                ))}
                <polyline points={lineBookings} fill="none" stroke="#ffd000" strokeWidth="3" />
                {days.map((d, i) => (
                  <circle
                    key={d.day}
                    cx={65 + i * 77}
                    cy={190 - (d.bookings / Math.max(1, ...days.map((x) => x.bookings))) * 110}
                    r="4"
                    fill="white"
                    stroke="#ffca00"
                    strokeWidth="3"
                  />
                ))}
              </g>
              <g className="ao-mobile-line">
                <polygon
                  points={`65,${baseline} ${chartPoints} 527,${baseline}`}
                  fill="url(#ao-area)"
                />
                <polyline points={chartPoints} fill="none" stroke="#009515" strokeWidth="3" />
                {values.map((v, i) => (
                  <circle
                    key={i}
                    cx={65 + i * 77}
                    cy={chartY(v)}
                    r="4"
                    fill="white"
                    stroke="#009515"
                    strokeWidth="2"
                  >
                    <title>
                      {days[i].day}: {metric === 'revenue' ? money(v) : v}
                    </title>
                  </circle>
                ))}
              </g>
              {days.map((d, i) => (
                <text
                  key={d.day}
                  x={65 + i * 77}
                  y="216"
                  textAnchor="middle"
                  fontSize="13"
                  fill="#43536b"
                >
                  {d.day.slice(8)}/{d.day.slice(5, 7)}
                </text>
              ))}
            </svg>
          )}
        </section>
        <section className="ao-panel ao-rooms">
          <header>
            <h2>
              Trạng thái sân ({rooms.length}) <small>– 10 Line tiêu chuẩn & 2 Phòng VIP</small>
            </h2>
            <button onClick={() => onGo('rooms')}>
              <Settings />
              Quản lý sân
            </button>
          </header>
          <div className="ao-room-grid">
            {roomStates.map((r) => {
              const I =
                r.kind === 'maintenance'
                  ? Wrench
                  : r.vip
                    ? Crown
                    : r.kind === 'empty'
                      ? CheckCircle2
                      : CalendarDays;
              return (
                <button
                  key={r.id}
                  className={`ao-room ${r.kind}${r.vip ? ' vip' : ''}`}
                  onClick={() => (r.booking ? onSelect(r.booking) : onGo('rooms'))}
                >
                  <I />
                  <span>
                    <strong>{r.vip ? r.name.replace(' ', '') : 'L' + r.id.split('-')[1]}</strong>
                    <b>
                      {r.kind === 'maintenance'
                        ? 'Bảo trì'
                        : r.kind === 'playing'
                          ? 'Đang chơi'
                          : r.kind === 'booked'
                            ? 'Đặt trước'
                            : 'Trống'}
                    </b>
                    {r.booking && (
                      <small>
                        <Clock3 />
                        {time(r.booking.start)} – {time(r.booking.end)}
                      </small>
                    )}
                    {r.maintenance && <small>{r.maintenance.reason || 'Đang bảo trì'}</small>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ao-room-legend">
            <span>● Đang chơi: {roomStates.filter((r) => r.kind === 'playing').length}</span>
            <span>● Đặt trước: {roomStates.filter((r) => r.kind === 'booked').length}</span>
            <span>● Trống: {roomStates.filter((r) => r.kind === 'empty').length}</span>
          </div>
        </section>
      </div>
      <div className="ao-lower">
        <section className="ao-panel ao-bookings">
          <header>
            <h2>Lịch đặt sân hôm nay</h2>
            <div className="ao-filters">
              {[
                { key: 'all', label: 'Tất cả', n: bookings.length },
                {
                  key: 'playing',
                  label: 'Đang chơi',
                  n: bookings.filter((b) => ['playing', 'paused'].includes(b.status)).length,
                },
                {
                  key: 'booked',
                  label: 'Sắp tới',
                  n: bookings.filter((b) => b.status === 'booked').length,
                },
                {
                  key: 'done',
                  label: 'Hoàn thành',
                  n: bookings.filter((b) => ['finished', 'paid'].includes(b.status)).length,
                },
              ].map((f) => (
                <button
                  key={f.key}
                  className={filter === f.key ? 'on' : ''}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} ({f.n})
                </button>
              ))}
            </div>
          </header>
          <div className="ao-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Sân/Phòng</th>
                  <th>Khách hàng</th>
                  <th>Gói dịch vụ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 6).map((b) => (
                  <tr key={b.id}>
                    <td>
                      {time(b.start)} – {time(b.end)}
                    </td>
                    <td>
                      <span className={b.room.startsWith('vip') ? 'ao-bay vip' : 'ao-bay'}>
                        {b.room.startsWith('vip')
                          ? b.room.toUpperCase().replace('-', '')
                          : 'L' + b.room.split('-')[1]}
                      </span>
                    </td>
                    <td>{b.customer}</td>
                    <td>{b.service === 'gdr' ? 'Tập theo giờ' : `${b.service} hố`}</td>
                    <td>
                      <span className={'ao-table-status ' + b.status}>
                        ● {status[b.status] || b.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => onSelect(b)} aria-label={`Xem đặt sân ${b.customer}`}>
                        <Eye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="ao-empty">Không có lịch đặt sân trong bộ lọc này.</p>
            )}
          </div>
        </section>
        <section className="ao-panel ao-activity">
          <header>
            <h2>Hoạt động gần đây</h2>
            <button onClick={() => onGo('bookings')}>
              Xem tất cả <ArrowRight />
            </button>
          </header>
          <div>
            {data.audit.slice(0, 4).map((a) => (
              <div className="ao-activity-row" key={a.id}>
                <span className="ao-activity-icon">
                  <ReceiptText />
                </span>
                <time>{time(a.created)}</time>
                <span>
                  <strong>{a.action}</strong>
                  <small>{auditDetailText(a.detail)}</small>
                </span>
              </div>
            ))}
            {!data.audit.length && <p className="ao-empty">Chưa có hoạt động gần đây.</p>}
          </div>
        </section>
        <section className="ao-panel ao-quick">
          <header>
            <h2>Thao tác nhanh</h2>
          </header>
          <div>
            {[
              {
                icon: CalendarDays,
                label: 'Đặt sân',
                mobile: 'Tạo đặt sân',
                go: () => onBook('line-1'),
              },
              {
                icon: UserPlus,
                label: 'Thêm khách hàng',
                mobile: 'Bán hàng (POS)',
                go: () => onGo('crmx'),
                mobileGo: () => onGo('rooms'),
              },
              {
                icon: Gem,
                label: 'Tạo hội viên',
                mobile: 'Thêm hội viên',
                go: () => onGo('members'),
              },
              {
                icon: ReceiptText,
                label: 'Lập hóa đơn',
                mobile: 'Xem báo cáo',
                go: () => onGo('rooms'),
                mobileGo: () => onGo('reports'),
              },
            ].map(({ icon: I, label, mobile, go, mobileGo }) => (
              <button
                key={label}
                onClick={() => {
                  if (window.matchMedia('(max-width: 1100px)').matches && mobileGo) mobileGo();
                  else go();
                }}
              >
                <I />
                <span className="ao-quick-desktop">{label}</span>
                <span className="ao-quick-mobile">{mobile}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
