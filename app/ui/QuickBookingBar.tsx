'use client';
import { useState } from 'react';
import { Calendar, Clock, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { QUICK_BOOKING_EVENT, type QuickBookingSelection } from './quick-booking-event';

interface QuickBookingBarProps {
  lowestPrice?: number;
  goldTimeText?: string;
}

export default function QuickBookingBar({ lowestPrice, goldTimeText }: QuickBookingBarProps) {
  const [dayType, setDayType] = useState<'today' | 'tomorrow' | 'other'>('today');
  const [slot, setSlot] = useState<'gold' | 'afternoon' | 'evening'>('gold');
  const [service, setService] = useState<'gdr' | '9' | '18'>('gdr');
  const [vip, setVip] = useState(false);
  const [notice, setNotice] = useState('');

  const handleBookClick = () => {
    const ranges = {
      gold: goldTimeText?.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/) ?? [],
      afternoon: ['14:00', '18:00'],
      evening: ['18:00', '22:00'],
    };
    const [from, to] =
      slot === 'gold'
        ? [ranges.gold[1] || '06:00', ranges.gold[2] || '11:00']
        : ranges[slot];
    const date = new Date(Date.now() + (dayType === 'tomorrow' ? 86_400_000 : 0) + 7 * 3600_000)
      .toISOString()
      .slice(0, 10);
    const endsAt = Date.parse(`${date}T${to}:00+07:00`);
    let start = Date.parse(`${date}T${from}:00+07:00`);
    if (dayType === 'today')
      start = Math.ceil(Math.max(start, Date.now() + 60 * 60_000) / 900_000) * 900_000;
    const validStart = dayType !== 'other' && start < endsAt;
    const selection: QuickBookingSelection = {
      service,
      vip,
      start: validStart ? new Date(start + 7 * 3600_000).toISOString().slice(0, 16) : '',
      notice:
        dayType === 'other'
          ? 'Vui lòng chọn ngày và giờ trong biểu mẫu.'
          : validStart
            ? ''
            : 'Khung giờ đã chọn không còn đủ thời gian đặt trước. Vui lòng chọn ngày và giờ khác.',
    };
    setNotice(selection.notice);
    window.dispatchEvent(
      new CustomEvent<QuickBookingSelection>(QUICK_BOOKING_EVENT, { detail: selection }),
    );
    const target = document.getElementById('dat-cho');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fw-quick-booking" data-sc-in>
      <div className="fw-quick-header">
        <div className="fw-quick-badge">
          <Sparkles size={14} />
          <span>Đặt phòng nhanh — Không cần trả trước</span>
        </div>
        {lowestPrice && (
          <div className="fw-quick-hint">
            Giờ vàng chỉ từ <strong>{lowestPrice.toLocaleString('vi-VN')}đ</strong>/giờ
          </div>
        )}
      </div>

      <div className="fw-quick-grid">
        {/* Date Selector */}
        <div className="fw-quick-col">
          <label className="fw-quick-label">
            <Calendar size={15} />
            <span>Ngày chơi</span>
          </label>
          <div className="fw-quick-pills">
            <button
              type="button"
              className={dayType === 'today' ? 'active' : ''}
              onClick={() => setDayType('today')}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={dayType === 'tomorrow' ? 'active' : ''}
              onClick={() => setDayType('tomorrow')}
            >
              Ngày mai
            </button>
            <button
              type="button"
              className={dayType === 'other' ? 'active' : ''}
              onClick={() => setDayType('other')}
            >
              Chọn ngày
            </button>
          </div>
        </div>

        {/* Time Frame */}
        <div className="fw-quick-col">
          <label className="fw-quick-label">
            <Clock size={15} />
            <span>Khung giờ</span>
          </label>
          <div className="fw-quick-pills">
            <button
              type="button"
              className={`pill-gold ${slot === 'gold' ? 'active' : ''}`}
              onClick={() => setSlot('gold')}
              title={goldTimeText || 'T2–T6 06:00 - 11:00 (Giờ vàng)'}
            >
              Giờ vàng (Sáng)
            </button>
            <button
              type="button"
              className={slot === 'afternoon' ? 'active' : ''}
              onClick={() => setSlot('afternoon')}
            >
              Chiều (14h-18h)
            </button>
            <button
              type="button"
              className={slot === 'evening' ? 'active' : ''}
              onClick={() => setSlot('evening')}
            >
              Tối (18h-22h)
            </button>
          </div>
        </div>

        {/* Service */}
        <div className="fw-quick-col">
          <label className="fw-quick-label">
            <Crown size={15} />
            <span>Dịch vụ</span>
          </label>
          <div className="fw-quick-pills">
            <button
              type="button"
              className={service === 'gdr' ? 'active' : ''}
              onClick={() => setService('gdr')}
            >
              Luyện tập
            </button>
            <button
              type="button"
              className={service === '9' ? 'active' : ''}
              onClick={() => setService('9')}
            >
              Game 9 hố
            </button>
            <button
              type="button"
              className={service === '18' ? 'active' : ''}
              onClick={() => setService('18')}
            >
              Game 18 hố
            </button>
          </div>
        </div>

        <div className="fw-quick-col">
          <label className="fw-quick-label">
            <Crown size={15} />
            <span>Loại phòng</span>
          </label>
          <div className="fw-quick-pills">
            <button
              type="button"
              className={!vip ? 'active' : ''}
              onClick={() => setVip(false)}
            >
              Line tiêu chuẩn
            </button>
            <button
              type="button"
              className={`pill-vip ${vip ? 'active' : ''}`}
              onClick={() => setVip(true)}
            >
              Phòng VIP riêng
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <div className="fw-quick-action">
          <button type="button" className="fw-btn-book-quick" onClick={handleBookClick}>
            <span>Điền thông tin đặt lịch</span>
            <ArrowRight size={18} />
          </button>
          {notice && (
            <p className="form-note" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
