'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Car,
  Building2,
  QrCode,
  ChevronRight,
  ShieldCheck,
  Lock,
  WifiOff,
  ExternalLink,
  Sparkles,
  Ticket,
  LogOut,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PwaInstallProvider, PwaInstallCard, usePwaInstall } from '../ui/PwaInstallPrompt';
import type { ParkingTicket } from '../../modules/parking/core/types';

interface StaffInfo {
  name: string;
  email: string;
  role: string;
  tenant: string;
}

interface CustomerInfo {
  name?: string;
  phone?: string;
  cardName?: string;
}

export default function AppLauncherClient() {
  const router = useRouter();

  // Authentication & Data state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [activeTicket, setActiveTicket] = useState<ParkingTicket | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Network listener
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check Staff session, Customer session, and active parking ticket
  useEffect(() => {
    let mounted = true;

    async function checkSessions() {
      // 1. Check Staff Auth
      try {
        const staffRes = await fetch('/api/auth/me', { cache: 'no-store' });
        if (staffRes.ok) {
          const staffData: any = await staffRes.json();
          if (mounted && staffData?.email) {
            setStaff({
              name: staffData.name || staffData.email.split('@')[0],
              email: staffData.email,
              role: staffData.role || 'staff',
              tenant: staffData.tenant || 'gopick',
            });
          }
        }
      } catch {}

      // 2. Check Customer Auth
      try {
        const memberRes = await fetch('/api/member', { cache: 'no-store' });
        if (memberRes.ok) {
          const memberData: any = await memberRes.json();
          if (mounted && memberData?.phone) {
            setCustomer({
              name: memberData.name || '',
              phone: memberData.phone || '',
              cardName: memberData.card?.name,
            });
          }
        }
      } catch {}

      // 3. Check active parking tickets in localStorage
      try {
        const ticketsStr = localStorage.getItem('sigolf_parking_tickets');
        if (ticketsStr) {
          const list: ParkingTicket[] = JSON.parse(ticketsStr);
          if (Array.isArray(list)) {
            const found = list.find((t) => t.status === 'confirmed' || t.status === 'active');
            if (mounted && found) setActiveTicket(found);
          }
        }
      } catch {}

      if (mounted) setCheckingAuth(false);
    }

    checkSessions();

    return () => {
      mounted = false;
    };
  }, []);

  const roleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Chủ cơ sở';
      case 'manager':
        return 'Quản lý';
      case 'cashier':
        return 'Thu ngân';
      case 'coach':
        return 'Huấn luyện viên';
      case 'guard':
      case 'security':
        return 'Bảo vệ';
      case 'cskh':
        return 'CSKH';
      case 'sale':
        return 'Kinh doanh';
      default:
        return 'Nhân viên';
    }
  };

  return (
    <PwaInstallProvider>
      <div className="sg-app-root">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="sg-app-offline-banner" role="alert">
            <WifiOff size={16} />
            <span>Không có kết nối mạng. Dữ liệu sẽ tự động đồng bộ khi có Internet.</span>
          </div>
        )}

        <div className="sg-app-container">
          {/* Header Brand */}
          <header className="sg-app-header">
            <div className="sg-app-logo-wrap">
              <img
                src="/logo.webp"
                alt="SiGolf"
                width={56}
                height={56}
                className="sg-app-logo-img"
              />
            </div>
            <h1 className="sg-app-title">SiGolf</h1>
            <p className="sg-app-subtitle">Nền tảng dịch vụ & Quản lý phòng Golf 3D</p>
          </header>

          {/* Thẻ nhắc cài đặt PWA dùng chung */}
          <div style={{ marginBottom: 14 }}>
            <PwaInstallCard />
          </div>

          {/* Danh sách 3 lựa chọn chính */}
          <nav className="sg-app-menu" aria-label="Lựa chọn ứng dụng">
            {/* LỰA CHỌN 1: TÀI KHOẢN CỦA TÔI */}
            <div
              className="sg-app-card"
              role="button"
              tabIndex={0}
              onClick={() => router.push('/tai-khoan')}
              onKeyDown={(e) => e.key === 'Enter' && router.push('/tai-khoan')}
            >
              <div className="sg-app-card-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <User size={24} />
              </div>

              <div className="sg-app-card-content">
                <div className="sg-app-card-title-row">
                  <div className="sg-app-card-title">Tài khoản của tôi</div>
                  {customer && (
                    <span className="sg-app-badge-customer">
                      {customer.name || customer.phone}
                    </span>
                  )}
                </div>
                <div className="sg-app-card-desc">
                  Xem lịch đặt sân, hạng thẻ hội viên và vé xe của bạn.
                </div>
              </div>

              <div className="sg-app-card-arrow">
                <ChevronRight size={20} />
              </div>
            </div>

            {/* LỰA CHỌN 2: BÃI ĐẬU XE */}
            <div className="sg-app-card-group">
              <div
                className="sg-app-card"
                role="button"
                tabIndex={0}
                onClick={() => router.push('/parking')}
                onKeyDown={(e) => e.key === 'Enter' && router.push('/parking')}
              >
                <div className="sg-app-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <Car size={24} />
                </div>

                <div className="sg-app-card-content">
                  <div className="sg-app-card-title-row">
                    <div className="sg-app-card-title">Bãi đậu xe</div>
                    <span className="sg-app-badge-lot">GoPick 65 ô</span>
                  </div>
                  <div className="sg-app-card-desc">
                    Tìm chỗ trống, đặt ô trước và kiểm soát xe vào/ra bằng QR.
                  </div>
                </div>

                <div className="sg-app-card-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>

              {/* Nút hành động nhanh: Mở vé QR nếu khách có vé đang hiệu lực */}
              {activeTicket && (
                <div
                  className="sg-app-ticket-quick-action"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/parking/ticket/${activeTicket.ticketCode}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="sg-app-ticket-quick-pulse" />
                    <QrCode size={17} color="#16a34a" />
                    <span>
                      Vé xe đang dùng: <strong>Ô {activeTicket.spotCode}</strong> ({activeTicket.licensePlate})
                    </span>
                  </div>
                  <span className="sg-app-ticket-quick-btn">Mở vé QR</span>
                </div>
              )}
            </div>

            {/* LỰA CHỌN 3: QUẢN LÝ CƠ SỞ (CHỈ HIỂN THỊ KHI CÓ QUYỀN NHÂN VIÊN) */}
            {checkingAuth ? (
              <div className="sg-app-card sg-app-card-skeleton">
                <div className="sg-app-skeleton-circle" />
                <div className="sg-app-skeleton-lines">
                  <div className="sg-app-skeleton-line" style={{ width: '50%' }} />
                  <div className="sg-app-skeleton-line" style={{ width: '80%' }} />
                </div>
              </div>
            ) : staff ? (
              <div
                className="sg-app-card sg-app-card-staff"
                role="button"
                tabIndex={0}
                onClick={() => router.push('/quan-ly')}
                onKeyDown={(e) => e.key === 'Enter' && router.push('/quan-ly')}
              >
                <div className="sg-app-card-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <Building2 size={24} />
                </div>

                <div className="sg-app-card-content">
                  <div className="sg-app-card-title-row">
                    <div className="sg-app-card-title">Quản lý cơ sở</div>
                    <span className="sg-app-badge-staff">
                      {roleLabel(staff.role)}
                    </span>
                  </div>
                  <div className="sg-app-card-desc">
                    POS bán hàng, sơ đồ bãi xe, đối soát ca và vận hành.
                  </div>
                </div>

                <div className="sg-app-card-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            ) : null}
          </nav>

          {/* Footer & Liên kết nhân viên */}
          <footer className="sg-app-footer">
            {!staff && !checkingAuth && (
              <a
                href="/quan-ly"
                className="sg-app-staff-login-link"
              >
                <Lock size={13} />
                <span>Đăng nhập nhân viên cơ sở</span>
              </a>
            )}

            {staff && (
              <div style={{ fontSize: 11.5, color: '#64748b', textAlign: 'center', marginTop: 10 }}>
                Đang trực ca: <strong>{staff.name}</strong> ({roleLabel(staff.role)}) ·{' '}
                <a
                  href="/quan-ly"
                  style={{ color: '#0a5c1e', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Vào khu vực quản lý
                </a>
              </div>
            )}

            <div className="sg-app-bottom-brand">
              <a href="/" className="sg-app-website-link">
                <span>Về trang chủ SIGOLF</span>
                <ArrowRight size={13} />
              </a>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Phiên bản ứng dụng SiGolf PWA 2.0 · 250 Lương Định Của
              </div>
            </div>
          </footer>
        </div>
      </div>
    </PwaInstallProvider>
  );
}
