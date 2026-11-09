'use client';
import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';
import { BRAND } from '../../lib/brand';

interface MobileStickyBarProps {
  bookHref: string;
  bookLabel: string;
}

export default function MobileStickyBar({ bookHref, bookLabel }: MobileStickyBarProps) {
  const handleBook = (e: React.MouseEvent) => {
    if (bookHref.startsWith('#')) {
      e.preventDefault();
      const el = document.getElementById(bookHref.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fw-mobile-sticky-bar" aria-label="Tác vụ nhanh trên di động">
      <a
        href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`}
        className="fw-mobile-btn zalo"
        target="_blank"
        rel="noopener noreferrer"
        title="Nhắn tin qua Zalo"
      >
        <MessageCircle size={18} />
        <span>Chat Zalo</span>
      </a>

      <a
        href={`tel:${BRAND.hotline}`}
        className="fw-mobile-btn phone"
        title="Gọi hotline"
      >
        <Phone size={18} />
        <span>Gọi điện</span>
      </a>

      <a
        href={bookHref}
        className="fw-mobile-btn primary-book"
        onClick={handleBook}
        title="Đặt lịch giữ chỗ"
      >
        <CalendarCheck size={18} />
        <span>{bookLabel}</span>
      </a>
    </nav>
  );
}
