'use client';
import { useState } from 'react';
import { Calendar, Clock, Crown, ArrowRight, Sparkles } from 'lucide-react';

interface QuickBookingBarProps {
  lowestPrice?: number;
  goldTimeText?: string;
}

export default function QuickBookingBar({ lowestPrice, goldTimeText }: QuickBookingBarProps) {
  const [dayType, setDayType] = useState<'today' | 'tomorrow' | 'other'>('today');
  const [slot, setSlot] = useState<'gold' | 'afternoon' | 'evening'>('gold');
  const [service, setService] = useState<'gdr' | 'vip' | 'holes'>('gdr');

  const handleBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('dat-cho');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // If there are inputs in the booking form, we can try to pre-select service or date
      setTimeout(() => {
        const serviceSelect = document.querySelector('select[name="service"]') as unknown as {
          options: ArrayLike<{ text: string; value: string }>;
          value: string;
          dispatchEvent(e: Event): boolean;
        } | null;
        if (serviceSelect) {
          if (service === 'vip') {
            const vipOption = Array.from(serviceSelect.options as ArrayLike<{ text: string; value: string }>).find(o => o.text.toLowerCase().includes('vip'));
            if (vipOption) serviceSelect.value = vipOption.value;
          } else if (service === 'holes') {
            const hOption = Array.from(serviceSelect.options as ArrayLike<{ text: string; value: string }>).find(o => o.value.includes('9') || o.value.includes('18'));
            if (hOption) serviceSelect.value = hOption.value;
          }
          serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 500);
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
              title={goldTimeText || 'Sáng 08:00 - 14:00 (Ưu đãi)'}
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

        {/* Room / Experience Type */}
        <div className="fw-quick-col">
          <label className="fw-quick-label">
            <Crown size={15} />
            <span>Loại phòng & Trải nghiệm</span>
          </label>
          <div className="fw-quick-pills">
            <button
              type="button"
              className={service === 'gdr' ? 'active' : ''}
              onClick={() => setService('gdr')}
            >
              Line Tiêu Chuẩn
            </button>
            <button
              type="button"
              className={service === 'holes' ? 'active' : ''}
              onClick={() => setService('holes')}
            >
              Đấu sân 9/18 hố
            </button>
            <button
              type="button"
              className={`pill-vip ${service === 'vip' ? 'active' : ''}`}
              onClick={() => setService('vip')}
            >
              Phòng VIP riêng
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <div className="fw-quick-action">
          <button type="button" className="fw-btn-book-quick" onClick={handleBookClick}>
            <span>Kiểm tra & Giữ phòng</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
