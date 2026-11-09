'use client';
import { BRAND } from '../../lib/brand';
import { MapPin, Phone, Clock, MessageCircle, CalendarCheck, Shield, User, Lock, ArrowUpRight } from 'lucide-react';

interface ClubFooterProps {
  hours: string;
}

export default function ClubFooter({ hours }: ClubFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="fw-luxury-footer" aria-label="Chân trang">
      <div className="fw-footer-clean">
        {/* Brand & Identity */}
        <div className="fw-footer-brand-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="Saigon Golf 3D Club" width={52} height={52} className="fw-footer-logo-img" />
          <div className="fw-footer-title-wrap">
            <h3>{BRAND.name}</h3>
            <span className="fw-footer-subtitle">Hệ Thống Golf 3D Foresight Sports GC3 USA</span>
          </div>
        </div>

        {/* Essential Info: Address, Hours, Hotline */}
        <div className="fw-footer-info-bar">
          <div className="fw-footer-info-item">
            <MapPin size={18} className="text-gold" />
            <span>{BRAND.address}</span>
          </div>
          <div className="fw-footer-info-item">
            <Clock size={18} className="text-gold" />
            <span>Mở cửa: <strong>{hours}</strong> mỗi ngày</span>
          </div>
          <div className="fw-footer-info-item">
            <Phone size={18} className="text-gold" />
            <a href={`tel:${BRAND.hotline}`}>Hotline: <strong>{BRAND.hotline}</strong></a>
          </div>
        </div>

        {/* Prominent Booking Action Buttons */}
        <div className="fw-footer-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- same-page anchor needs a plain link */}
          <a href="/#dat-cho" className="fw-footer-btn primary">
            <CalendarCheck size={18} />
            <span>Đặt Chỗ Ngay Trực Tuyến</span>
            <ArrowUpRight size={16} />
          </a>
          <a href={`tel:${BRAND.hotline}`} className="fw-footer-btn call">
            <Phone size={18} />
            <span>Gọi Hotline: {BRAND.hotline}</span>
          </a>
          <a
            href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fw-footer-btn zalo"
          >
            <MessageCircle size={18} />
            <span>Zalo Hỗ Trợ 24/7</span>
          </a>
        </div>

        {/* Discreet Member & Staff Links */}
        <div className="fw-footer-sub-links">
          <a href="/tai-khoan" className="fw-footer-pill-link">
            <User size={14} />
            <span>Cổng Hội Viên</span>
          </a>
          <a href="/quan-ly" className="fw-footer-pill-link staff">
            <Lock size={14} />
            <span>Dành cho nhân viên</span>
          </a>
        </div>

        {/* Minimal Copyright & Badges */}
        <div className="fw-footer-copyright">
          <span>© {currentYear} {BRAND.name}. Bảo lưu mọi quyền.</span>
          <span className="fw-footer-divider">·</span>
          <span><Shield size={13} /> Foresight Sports Certified</span>
          <span className="fw-footer-divider">·</span>
          <span>Bình Trưng, TP. Hồ Chí Minh</span>
        </div>
      </div>
    </footer>
  );
}
