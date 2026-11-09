'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Receipt, CalendarCheck, Crown, User } from 'lucide-react';

export default function MobileAppNavBar() {
  const pathname = usePathname() || '';

  // Never show on admin / staff screen or API endpoints
  if (pathname.startsWith('/quan-ly') || pathname.startsWith('/api') || pathname.startsWith('/goi/')) {
    return null;
  }

  const isHome = pathname === '/' || pathname === '';
  const isPricing = pathname.startsWith('/bang-gia');
  const isBooking = pathname.startsWith('/book');
  const isMembership = pathname.startsWith('/thanh-vien');
  const isMemberPortal = pathname.startsWith('/tai-khoan');

  const handleBookingClick = (e: React.MouseEvent) => {
    if (isHome && typeof document !== 'undefined') {
      const el = document.getElementById('dat-cho');
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="app-mobile-nav" aria-label="Thanh điều hướng di động">
      <div className="app-nav-bar">
        {/* Tab 1: Trang Chủ */}
        <Link
          href="/"
          className={`app-nav-tab ${isHome && !isBooking ? 'active' : ''}`}
        >
          <div className="app-nav-icon-wrap">
            <Home size={20} strokeWidth={isHome && !isBooking ? 2.4 : 1.8} />
          </div>
          <span className="app-nav-text">Trang Chủ</span>
          {isHome && !isBooking && <span className="app-nav-dot"></span>}
        </Link>

        {/* Tab 2: Bảng Giá */}
        <Link
          href="/bang-gia"
          className={`app-nav-tab ${isPricing ? 'active' : ''}`}
        >
          <div className="app-nav-icon-wrap">
            <Receipt size={20} strokeWidth={isPricing ? 2.4 : 1.8} />
          </div>
          <span className="app-nav-text">Bảng Giá</span>
          {isPricing && <span className="app-nav-dot"></span>}
        </Link>

        {/* Tab 3: Đặt Chỗ (Center Elevated FAB) */}
        <Link
          href="/#dat-cho"
          className="app-nav-fab-btn"
          onClick={handleBookingClick}
        >
          <div className="app-fab-circle">
            <CalendarCheck size={22} strokeWidth={2.4} />
          </div>
          <span className="app-fab-text">Đặt Chỗ</span>
        </Link>

        {/* Tab 4: Gói Thẻ */}
        <Link
          href="/thanh-vien"
          className={`app-nav-tab ${isMembership ? 'active' : ''}`}
        >
          <div className="app-nav-icon-wrap">
            <Crown size={20} strokeWidth={isMembership ? 2.4 : 1.8} />
          </div>
          <span className="app-nav-text">Gói Thẻ</span>
          {isMembership && <span className="app-nav-dot"></span>}
        </Link>

        {/* Tab 5: Hội Viên */}
        <Link
          href="/tai-khoan"
          className={`app-nav-tab ${isMemberPortal ? 'active' : ''}`}
        >
          <div className="app-nav-icon-wrap">
            <User size={20} strokeWidth={isMemberPortal ? 2.4 : 1.8} />
            <span className="app-pro-tag">VIP</span>
          </div>
          <span className="app-nav-text">Hội Viên</span>
          {isMemberPortal && <span className="app-nav-dot"></span>}
        </Link>
      </div>
    </nav>
  );
}
