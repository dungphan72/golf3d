'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const DISMISS_SESSION_KEY = 'sigolf_pwa_dismissed';
const DISMISS_SNOOZE_KEY = 'sigolf_pwa_dismissed_until';
const INSTALLED_KEY = 'sigolf_pwa_installed';
const SNOOZE_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaFloatingInstallBanner() {
  const pathname = usePathname() || '';
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMounted(true);

    // 1. Detect standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // 2. Check if already installed
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return;

    // 3. Check session dismiss and 7-day snooze
    if (sessionStorage.getItem(DISMISS_SESSION_KEY) === '1') return;
    const snoozedUntil = localStorage.getItem(DISMISS_SNOOZE_KEY);
    if (snoozedUntil && Number(snoozedUntil) > Date.now()) return;

    // 4. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isAppleIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(isAppleIos);

    // 5. Register service worker for PWA eligibility
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 6. Listen for beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 7. Listen for appinstalled
    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setDeferredPrompt(null);
      setIsVisible(false);
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 8. Slide in banner smoothly after brief 1.5s delay (matching crm.khaidien.vn)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  // Handle "Cài ngay" button click
  const handleInstallClick = useCallback(async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem(INSTALLED_KEY, 'true');
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowIosGuide(true);
      }
      return;
    }

    // Browser did not expose beforeinstallprompt (e.g. desktop or non-Chrome), show guide
    setShowIosGuide(true);
  }, [deferredPrompt, isIos]);

  // Handle dismiss (Close 'X')
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
      const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_SNOOZE_KEY, String(until));
    } catch {}
  }, []);

  // Suppress banner on sensitive routes like active ticket checkout
  if (!isMounted) return null;
  if (pathname.startsWith('/parking/ticket')) return null;

  return (
    <>
      {/* Floating PWA Install Banner — Styled exactly per crm.khaidien.vn */}
      <div
        id="yadcrm-pwa-install"
        className={`yadcrm-pwa-install sg-pwa-install ${isVisible ? 'is-visible' : ''}`}
        hidden={!isVisible}
        role="region"
        aria-label="Tạo như một ứng dụng SiGolf"
      >
        <button
          type="button"
          className="yadcrm-pwa-dismiss sg-pwa-dismiss"
          aria-label="Đóng"
          onClick={handleDismiss}
        >
          ×
        </button>

        <div className="yadcrm-pwa-icon sg-pwa-icon">
          <img src="/icon-192.png" alt="SiGolf" width={48} height={48} />
        </div>

        <div className="yadcrm-pwa-copy sg-pwa-copy">
          <strong>Tạo như một ứng dụng</strong>
          <span>Mở SiGolf nhanh từ màn hình điện thoại.</span>
        </div>

        <button
          type="button"
          className="yadcrm-pwa-install-btn sg-pwa-install-btn"
          onClick={handleInstallClick}
        >
          Cài ngay
        </button>
      </div>

      {/* iOS Safari Guide Bottom Sheet (Matching crm.khaidien.vn) */}
      <div
        id="yadcrm-pwa-ios-guide"
        className={`yadcrm-pwa-guide sg-pwa-guide ${showIosGuide ? 'is-visible' : ''}`}
        hidden={!showIosGuide}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowIosGuide(false);
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Hướng dẫn cài đặt SiGolf trên màn hình chính"
      >
        <div className="yadcrm-pwa-guide-card sg-pwa-guide-card">
          <button
            type="button"
            className="yadcrm-pwa-guide-close sg-pwa-guide-close"
            aria-label="Đóng"
            onClick={() => setShowIosGuide(false)}
          >
            ×
          </button>
          <strong>Thêm SiGolf vào Màn hình chính</strong>
          <p>
            {isIos ? (
              <>
                Trên iPhone/iPad, Safari không cho website tự cài. Hãy chọn <b>Chia sẻ</b> (biểu tượng ⎋ hoặc ô vuông mũi tên lên) → <b>Thêm vào Màn hình chính</b>.
              </>
            ) : (
              <>
                Hãy mở menu trình duyệt (biểu tượng <b>⋮ 3 chấm</b> ở góc trên/dưới) và chọn <b>"Cài đặt ứng dụng"</b> hoặc <b>"Thêm vào màn hình chính"</b>.
              </>
            )}
          </p>
          <button
            type="button"
            className="yadcrm-pwa-guide-ok sg-pwa-guide-ok"
            onClick={() => setShowIosGuide(false)}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </>
  );
}
