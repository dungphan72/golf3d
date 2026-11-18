'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Download, X, Share, PlusSquare, Monitor, CheckCircle2, ChevronRight, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'sigolf_pwa_dismissed_until';
const INSTALLED_KEY = 'sigolf_pwa_installed';
const SNOOZE_DAYS = 7;

interface PwaContextType {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  hasDeferredPrompt: boolean;
  showCard: boolean;
  showModal: boolean;
  openInstall: () => void;
  closeModal: () => void;
  dismissCard: () => void;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isStandalone: false,
  isIos: false,
  hasDeferredPrompt: false,
  showCard: false,
  showModal: false,
  openInstall: () => {},
  closeModal: () => {},
  dismissCard: () => {},
});

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Initialize environment detection & service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // 2. Detect iOS / iPadOS
    const ua = window.navigator.userAgent;
    const isAppleIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(isAppleIos);

    // 3. Register service worker for PWA install eligibility
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 4. If already standalone or marked installed, don't show card
    if (standalone || localStorage.getItem(INSTALLED_KEY) === 'true') {
      setShowCard(false);
      return;
    }

    // 5. Check 7-day snooze
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (!dismissedUntil || Number(dismissedUntil) <= Date.now()) {
      setShowCard(true);
    }

    // 6. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Ensure card is visible if not snoozed
      const snoozed = localStorage.getItem(DISMISS_KEY);
      if (!snoozed || Number(snoozed) <= Date.now()) {
        setShowCard(true);
      }
    };

    // 7. Listen for appinstalled
    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setDeferredPrompt(null);
      setShowCard(false);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Action: Open installation or guide
  const openInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem(INSTALLED_KEY, 'true');
          setShowCard(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  }, [deferredPrompt]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Action: Dismiss card for 7 days
  const dismissCard = useCallback(() => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {}
    setShowCard(false);
  }, []);

  const value: PwaContextType = {
    canInstall: !isStandalone,
    isStandalone,
    isIos,
    hasDeferredPrompt: !!deferredPrompt,
    showCard: showCard && !isStandalone,
    showModal,
    openInstall,
    closeModal,
    dismissCard,
  };

  return (
    <PwaContext.Provider value={value}>
      {children}
      {showModal && <PwaInstallModal isIos={isIos} onClose={closeModal} />}
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaContext);
}

/**
 * Thẻ nhắc cài đặt nằm trong nội dung trang Tổng quan
 * Không che nút POS, không fixed/floating để tránh gián đoạn thao tác tại quầy.
 */
export function PwaInstallCard() {
  const { showCard, hasDeferredPrompt, isIos, openInstall, dismissCard } = usePwaInstall();

  if (!showCard) return null;

  return (
    <div className="ao-install-card" role="region" aria-label="Nhắc cài đặt ứng dụng SiGolf">
      <div className="ao-install-card-left">
        <div className="ao-install-icon-wrap">
          <img
            src="/icon-192.png"
            alt="SiGolf"
            className="ao-install-app-icon"
            width={48}
            height={48}
          />
          <span className="ao-install-app-badge">PWA</span>
        </div>

        <div className="ao-install-card-info">
          <div className="ao-install-card-title">
            Thêm SiGolf vào màn hình chính
          </div>
          <p className="ao-install-card-desc">
            Mở nhanh tài khoản, lịch đặt sân và vé đậu xe.
          </p>
        </div>
      </div>

      <div className="ao-install-card-actions">
        <button
          type="button"
          className="ao-install-btn-primary"
          onClick={openInstall}
        >
          <Download size={15} />
          <span>Cài SiGolf</span>
        </button>

        <button
          type="button"
          className="ao-install-btn-dismiss"
          onClick={dismissCard}
          title="Nhắc lại sau 7 ngày"
        >
          Để sau
        </button>

        <button
          type="button"
          className="ao-install-btn-close"
          onClick={dismissCard}
          aria-label="Đóng thông báo (nhắc lại sau 7 ngày)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Hướng dẫn cài đặt chi tiết theo trình duyệt (Safari iPhone/iPad & Chrome/Edge)
 */
export function PwaInstallModal({ isIos, onClose }: { isIos: boolean; onClose: () => void }) {
  return (
    <div className="ao-install-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ao-install-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ao-install-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-192.png" alt="SiGolf" width={36} height={36} style={{ borderRadius: 8 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0a5c1e' }}>Cài đặt ứng dụng SiGolf</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Mở trực tiếp https://sigolf.vn/quan-ly</div>
            </div>
          </div>
          <button type="button" className="ao-install-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="ao-install-modal-body">
          {isIos ? (
            /* Hướng dẫn Safari trên iPhone / iPad */
            <div className="ao-install-steps">
              <div className="ao-install-step-item">
                <div className="ao-install-step-num">1</div>
                <div className="ao-install-step-content">
                  <div>
                    Nhấn vào nút <strong>Chia sẻ</strong> (biểu tượng{' '}
                    <span className="ao-ios-share-badge">
                      <Share size={13} style={{ display: 'inline', verticalAlign: -2 }} />
                    </span>{' '}
                    hoặc ô vuông có mũi tên lên) trên thanh công cụ Safari.
                  </div>
                  <div className="ao-install-step-hint">Nằm ở thanh công cụ đáy màn hình iPhone hoặc góc trên iPad.</div>
                </div>
              </div>

              <div className="ao-install-step-item">
                <div className="ao-install-step-num">2</div>
                <div className="ao-install-step-content">
                  <div>
                    Cuộn danh sách menu xuống và chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                  </div>
                  <div className="ao-install-step-hint">Biểu tượng dấu cộng <PlusSquare size={13} style={{ display: 'inline', verticalAlign: -2 }} /> nằm trong menu tùy chọn.</div>
                </div>
              </div>

              <div className="ao-install-step-item">
                <div className="ao-install-step-num">3</div>
                <div className="ao-install-step-content">
                  <div>
                    Kiểm tra tên hiển thị là <strong>SiGolf</strong>, sau đó nhấn <strong>Thêm</strong> (Add) ở góc trên bên phải.
                  </div>
                  <div className="ao-install-step-hint">Biểu tượng SiGolf sẽ xuất hiện trên màn hình chính của bạn.</div>
                </div>
              </div>
            </div>
          ) : (
            /* Hướng dẫn Chrome / Edge / Android */
            <div className="ao-install-steps">
              <div className="ao-install-step-item">
                <div className="ao-install-step-num">1</div>
                <div className="ao-install-step-content">
                  <div>
                    Nhấn vào biểu tượng <strong>Cài đặt</strong> trên thanh địa chỉ URL hoặc mở menu <strong>⋮ (3 chấm)</strong> của trình duyệt.
                  </div>
                </div>
              </div>

              <div className="ao-install-step-item">
                <div className="ao-install-step-num">2</div>
                <div className="ao-install-step-content">
                  <div>
                    Chọn <strong>"Cài đặt SiGolf"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong> (Install App).
                  </div>
                </div>
              </div>

              <div className="ao-install-step-item">
                <div className="ao-install-step-num">3</div>
                <div className="ao-install-step-content">
                  <div>
                    Nhấn <strong>Cài đặt</strong> để xác nhận. Biểu tượng <strong>SiGolf</strong> sẽ mở trực tiếp trang quản lý.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="ao-install-modal-benefit">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>Mở toàn màn hình độc lập (Standalone), không bị thanh địa chỉ che khuất.</span>
          </div>
        </div>

        <div className="ao-install-modal-footer">
          <button type="button" className="ao-install-modal-btn" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Màn hình chờ kiểm tra phiên làm việc SiGolf (tránh nháy menu quản trị)
 */
export function SiGolfLoadingScreen() {
  return (
    <div className="ar-auth-loading">
      <div className="ar-auth-loading-card">
        <img
          src="/icon-192.png"
          alt="SiGolf"
          width={64}
          height={64}
          style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 4px 12px rgba(10, 92, 30, 0.15)' }}
        />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0a5c1e', letterSpacing: 0.5, marginBottom: 6 }}>
          SiGolf
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Hệ thống quản lý phòng Golf 3D & Bãi xe
        </div>
        <div className="ar-auth-spinner" />
        <div style={{ fontSize: 13, color: '#0a5c1e', fontWeight: 600, marginTop: 14 }}>
          Đang kiểm tra phiên làm việc…
        </div>
      </div>
    </div>
  );
}
