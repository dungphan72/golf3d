'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Flag } from 'lucide-react';
import { QUICK_BOOKING_EVENT, type QuickBookingSelection } from './quick-booking-event';

const pad = (n: number) => String(n).padStart(2, '0');
const minutes = (hhmm: string, fallback: number) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback;
};

/** "Đặt line nhanh": picks day, time and room type, then fills the booking form below and scrolls to it. */
export default function QuickBook({
  open,
  close,
  hasVip,
}: {
  open: string;
  close: string;
  hasVip: boolean;
}) {
  // Today in Vietnam (YYYY-MM-DD).
  const [today] = useState(() => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10));
  const [day, setDay] = useState(today);
  const [time, setTime] = useState('');
  const [kind, setKind] = useState<'standard' | 'vip'>('standard');

  // Half-hour starts inside opening hours; "00:00" as closing time means midnight.
  const slots = useMemo(() => {
    const from = minutes(open, 6 * 60);
    let to = minutes(close, 24 * 60);
    if (to <= from) to = 24 * 60;
    const list: string[] = [];
    for (let m = from; m < to; m += 30) list.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    return list;
  }, [open, close]);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const start = `${day}T${time || slots[0] || '09:00'}`;
    const detail: QuickBookingSelection = {
      service: 'gdr',
      vip: kind === 'vip',
      start,
      notice: `Đã chọn ${day.split('-').reverse().join('/')} lúc ${time || slots[0]}. Kiểm tra rồi gửi yêu cầu.`,
    };
    window.dispatchEvent(new CustomEvent(QUICK_BOOKING_EVENT, { detail }));
    document.getElementById('dat-cho')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <form className="sg-quick" onSubmit={go} aria-label="Đặt line nhanh">
      <h2>
        <CalendarDays size={26} strokeWidth={1.8} />
        Đặt line nhanh
      </h2>
      <label>
        <CalendarDays size={20} />
        <span className="sg-sr">Ngày chơi</span>
        <input type="date" value={day} min={today} suppressHydrationWarning onChange={(e) => setDay(e.target.value || today)} required />
      </label>
      <label>
        <Clock size={20} />
        <span className="sg-sr">Giờ bắt đầu</span>
        <select value={time} onChange={(e) => setTime(e.target.value)} aria-label="Giờ bắt đầu">
          <option value="">Chọn khung giờ</option>
          {slots.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Flag size={20} />
        <span className="sg-sr">Loại chỗ</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as 'standard' | 'vip')} aria-label="Loại chỗ">
          <option value="standard">Line tiêu chuẩn</option>
          {hasVip && <option value="vip">Phòng VIP</option>}
        </select>
      </label>
      <button type="submit" className="sg-btn">
        Đặt line ngay
      </button>
    </form>
  );
}
