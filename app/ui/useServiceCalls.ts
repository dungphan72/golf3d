'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { type ServiceCall, type ResolutionType, type ServiceCallSettings } from '../../lib/service-call';

// =====================================================================
// 1. DUAL AUDIO ENGINE: HTML5 AUDIO + WEB AUDIO CHIME
// =====================================================================

let sharedAudioCtx: AudioContext | null = null;
let sharedBellAudio: HTMLAudioElement | null = null;
let audioPrimed = false;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => undefined);
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function getBellAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedBellAudio) {
      sharedBellAudio = new Audio('/service-bell.wav');
      sharedBellAudio.preload = 'auto';
    }
    return sharedBellAudio;
  } catch {
    return null;
  }
}

// User-gesture unlock to allow background tab audio playback
export function primeAudio() {
  if (audioPrimed) return;
  audioPrimed = true;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }
    const audio = getBellAudio();
    if (audio) {
      audio.load();
    }
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  const onFirstInteraction = () => {
    primeAudio();
    window.removeEventListener('click', onFirstInteraction);
    window.removeEventListener('keydown', onFirstInteraction);
    window.removeEventListener('touchstart', onFirstInteraction);
    window.removeEventListener('pointerdown', onFirstInteraction);
  };
  window.addEventListener('click', onFirstInteraction, { once: true });
  window.addEventListener('keydown', onFirstInteraction, { once: true });
  window.addEventListener('touchstart', onFirstInteraction, { once: true });
  window.addEventListener('pointerdown', onFirstInteraction, { once: true });
}

/**
 * Plays the crisp 2-tone service bell chime:
 * 1. Tries HTML5 Audio element (/service-bell.wav)
 * 2. As robust fallback, synthesizes chime via Web Audio API (880Hz -> 659Hz)
 */
export function playServiceBellChime() {
  primeAudio();

  // 1. Try HTML5 Audio
  let html5Played = false;
  try {
    const audio = getBellAudio();
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            html5Played = true;
          })
          .catch(() => {
            html5Played = false;
          });
      }
    }
  } catch {
    html5Played = false;
  }

  // 2. Synthesize via Web Audio as fallback or companion
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime;

    // First tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second tone (659.25 Hz - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.18);
    gain2.gain.setValueAtTime(0.45, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 1.2);
  } catch {
    // Ignore autoplay limits
  }
}

// Module-level continuous bell timer to prevent overlapping loops if multiple components use this hook
let moduleRingTimer: ReturnType<typeof setInterval> | null = null;
let moduleRingSubscribers = 0;

function startGlobalRinging() {
  if (moduleRingTimer) return;
  playServiceBellChime();
  moduleRingTimer = setInterval(() => {
    playServiceBellChime();
  }, 2800);
}

function stopGlobalRinging() {
  if (moduleRingTimer) {
    clearInterval(moduleRingTimer);
    moduleRingTimer = null;
  }
}

// =====================================================================
// 2. VAPID BASE64 HELPERS FOR PUSH NOTIFICATION SYNC
// =====================================================================

const b64uToBytes = (s: string) => {
  const bin = atob(
    s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (s.length % 4)) % 4),
  );
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const toB64u = (buf: ArrayBuffer | null) =>
  buf
    ? btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '')
    : '';

// =====================================================================
// 3. MAIN HOOK: useServiceCalls
// =====================================================================

export function useServiceCalls() {
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [settings, setSettings] = useState<ServiceCallSettings | null>(null);
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<'granted' | 'default' | 'denied' | 'unsupported'>('default');

  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>('');
  const titleFlashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current live calls from server
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/service-call/live', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as any;
      if (data.ok && Array.isArray(data.calls)) {
        setCalls(data.calls);
        if (data.settings) setSettings(data.settings);

        // Check for newly arrived CREATED calls
        const currentPendingIds = new Set<string>(
          data.calls
            .filter((c: ServiceCall) => c.status === 'CREATED')
            .map((c: ServiceCall) => String(c.id))
        );

        let newlyArrivedCall: ServiceCall | null = null;
        for (const c of data.calls) {
          if (c.status === 'CREATED' && !prevPendingIdsRef.current.has(c.id)) {
            newlyArrivedCall = c;
            break;
          }
        }
        prevPendingIdsRef.current = currentPendingIds;

        // If a new call arrived while document is hidden, show desktop notification
        if (newlyArrivedCall && typeof window !== 'undefined') {
          if (data.settings?.sound_alert_enabled ?? true) {
            playServiceBellChime();
          }

          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const roomName = newlyArrivedCall.room_name || `Line ${newlyArrivedCall.room_id}`;
              const catName = newlyArrivedCall.category_name || 'Gọi phục vụ';
              const notif = new Notification(`🔔 ${roomName} đang gọi phục vụ!`, {
                body: `${catName} - ${newlyArrivedCall.customer_name || 'Khách'}. Nhấn để mở POS ngay.`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'service-call-' + newlyArrivedCall.id,
                requireInteraction: true,
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch {
              // Ignore notification errors
            }
          }
        }
      }
    } catch {
      // Keep state on network glitch
    }
  }, []);

  // -------------------------------------------------------------------
  // A. AUTO-SYNC PUSH SUBSCRIPTION ON LOGIN ("Duy trì đăng nhập là nhận cuộc gọi")
  // -------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushPermission('unsupported');
      return;
    }

    setPushPermission(Notification.permission);

    // If permission is already granted, auto-subscribe silently
    if (Notification.permission === 'granted') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(async (reg) => {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            const keyRes = await fetch('/api/push', { cache: 'no-store' });
            if (!keyRes.ok) return;
            const { publicKey } = (await keyRes.json()) as { publicKey?: string };
            if (!publicKey) return;
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: b64uToBytes(publicKey),
            });
          }
          if (sub) {
            await fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'subscribe',
                endpoint: sub.endpoint,
                p256dh: toB64u(sub.getKey('p256dh')),
                auth: toB64u(sub.getKey('auth')),
              }),
            }).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  // Action to request push permission and enable alerts with 1 tap
  const enablePushAlerts = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    primeAudio();
    playServiceBellChime();

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Trình duyệt này không hỗ trợ thông báo đẩy.');
      setPushPermission('unsupported');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm !== 'granted') {
        if (perm === 'denied') {
          alert('Thông báo đã bị chặn. Vui lòng nhấn vào biểu tượng ổ khóa cạnh thanh địa chỉ để Cho phép (Allow).');
        }
        return false;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyRes = await fetch('/api/push', { cache: 'no-store' });
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) throw new Error('Không lấy được khóa thông báo máy chủ.');

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64uToBytes(publicKey),
        }));

      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: sub.endpoint,
          p256dh: toB64u(sub.getKey('p256dh')),
          auth: toB64u(sub.getKey('auth')),
        }),
      });

      return true;
    } catch (e: any) {
      alert('Không bật được thông báo: ' + (e.message || String(e)));
      return false;
    }
  }, []);

  // -------------------------------------------------------------------
  // B. LISTEN TO SERVICE WORKER WAKEUP MESSAGES
  // -------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SERVICE_CALL_RING' || e.data?.type === 'SERVICE_CALL_FOCUS') {
        fetchLive();
        playServiceBellChime();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [fetchLive]);

  // -------------------------------------------------------------------
  // C. CONTINUOUS BELL RINGING CONTROLLER
  // -------------------------------------------------------------------
  useEffect(() => {
    moduleRingSubscribers++;
    return () => {
      moduleRingSubscribers--;
      if (moduleRingSubscribers <= 0) {
        stopGlobalRinging();
      }
    };
  }, []);

  useEffect(() => {
    const hasCreatedCalls = calls.some((c) => c.status === 'CREATED' && !dismissedCallIds.has(c.id));
    const soundEnabled = settings?.sound_alert_enabled ?? true;

    if (hasCreatedCalls && soundEnabled) {
      startGlobalRinging();
    } else {
      stopGlobalRinging();
    }
  }, [calls, settings, dismissedCallIds]);

  // -------------------------------------------------------------------
  // D. TITLE FLASHING & VISIBILITY CHANGE LISTENER
  // -------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title || 'SiGolf';
    }

    const pendingCalls = calls.filter((c) => c.status === 'CREATED' && !dismissedCallIds.has(c.id));

    if (pendingCalls.length > 0 && document.hidden) {
      if (!titleFlashIntervalRef.current) {
        let isAlt = false;
        const callSummary = pendingCalls[0].room_name || `Line ${pendingCalls[0].room_id}`;
        titleFlashIntervalRef.current = setInterval(() => {
          isAlt = !isAlt;
          document.title = isAlt
            ? `🔔 [${pendingCalls.length} CUỘC GỌI] ${callSummary}!`
            : originalTitleRef.current;
        }, 1000);
      }
    } else {
      if (titleFlashIntervalRef.current) {
        clearInterval(titleFlashIntervalRef.current);
        titleFlashIntervalRef.current = null;
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (titleFlashIntervalRef.current) {
          clearInterval(titleFlashIntervalRef.current);
          titleFlashIntervalRef.current = null;
          if (originalTitleRef.current) {
            document.title = originalTitleRef.current;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (titleFlashIntervalRef.current) {
        clearInterval(titleFlashIntervalRef.current);
        titleFlashIntervalRef.current = null;
      }
    };
  }, [calls, dismissedCallIds]);

  // -------------------------------------------------------------------
  // E. UN-THROTTLED BACKGROUND POLLING (WEB WORKER)
  // -------------------------------------------------------------------
  const hasOpenCalls = useMemo(
    () => calls.some((c) => ['CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)),
    [calls]
  );

  useEffect(() => {
    fetchLive();

    const intervalMs = hasOpenCalls ? 3500 : 10000;
    let worker: Worker | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    try {
      // Inline Web Worker ticker to bypass browser background tab throttling
      const blob = new Blob(
        [
          `let t = null;
           self.onmessage = (e) => {
             if (e.data.action === 'start') {
               if (t) clearInterval(t);
               t = setInterval(() => self.postMessage('tick'), e.data.interval || 3500);
             } else if (e.data.action === 'stop') {
               if (t) clearInterval(t);
               t = null;
             }
           };`,
        ],
        { type: 'application/javascript' }
      );
      worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => {
        fetchLive();
      };
      worker.postMessage({ action: 'start', interval: intervalMs });
    } catch {
      // Fallback for environments where Blob worker is blocked
      fallbackTimer = setInterval(fetchLive, intervalMs);
    }

    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
      }
    };
  }, [fetchLive, hasOpenCalls]);

  // Derived: map of room_id to active call
  const activeCallsByRoom = useMemo(() => {
    const map = new Map<string, ServiceCall>();
    for (const c of calls) {
      if (['CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)) {
        if (!map.has(c.room_id)) {
          map.set(c.room_id, c);
        } else {
          // If already has a call, prioritize CREATED over ACKNOWLEDGED
          const existing = map.get(c.room_id)!;
          if (c.status === 'CREATED' && existing.status !== 'CREATED') {
            map.set(c.room_id, c);
          }
        }
      }
    }
    return map;
  }, [calls]);

  // Banner Call: the oldest un-dismissed CREATED call to highlight in popup
  const bannerCall = useMemo(() => {
    return (
      calls.find((c) => c.status === 'CREATED' && !dismissedCallIds.has(c.id)) ?? null
    );
  }, [calls, dismissedCallIds]);

  const dismissBanner = useCallback((callId: string) => {
    setDismissedCallIds((prev) => new Set(prev).add(callId));
  }, []);

  // Staff action helpers
  const acknowledgeCall = useCallback(
    async (callId: string) => {
      setBusy(true);
      try {
        const res = await fetch('/api/service-call/operate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'acknowledge', callId }),
        });
        const data = (await res.json()) as any;
        if (data.ok) {
          // Optimistically update status to stop ringing and update UI instantly
          setCalls((prev) =>
            prev.map((c) => (c.id === callId ? { ...c, status: 'ACKNOWLEDGED' } : c))
          );
          await fetchLive();
          return true;
        }
        alert(data.error || 'Chưa tiếp nhận được yêu cầu');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchLive]
  );

  const startCall = useCallback(
    async (callId: string) => {
      setBusy(true);
      try {
        const res = await fetch('/api/service-call/operate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', callId }),
        });
        const data = (await res.json()) as any;
        if (data.ok) {
          setCalls((prev) =>
            prev.map((c) => (c.id === callId ? { ...c, status: 'IN_PROGRESS' } : c))
          );
          await fetchLive();
          return true;
        }
        alert(data.error || 'Chưa chuyển trạng thái xử lý');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchLive]
  );

  const completeCall = useCallback(
    async (callId: string, resolutionType: ResolutionType, resolutionNote?: string) => {
      setBusy(true);
      try {
        const res = await fetch('/api/service-call/operate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete', callId, resolutionType, resolutionNote }),
        });
        const data = (await res.json()) as any;
        if (data.ok) {
          setCalls((prev) =>
            prev.map((c) => (c.id === callId ? { ...c, status: 'COMPLETED' } : c))
          );
          await fetchLive();
          return true;
        }
        alert(data.error || 'Chưa hoàn tất được yêu cầu');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchLive]
  );

  const cancelCall = useCallback(
    async (callId: string, reason?: string) => {
      setBusy(true);
      try {
        const res = await fetch('/api/service-call/operate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', callId, reason }),
        });
        const data = (await res.json()) as any;
        if (data.ok) {
          setCalls((prev) =>
            prev.map((c) => (c.id === callId ? { ...c, status: 'CANCELLED' } : c))
          );
          await fetchLive();
          return true;
        }
        alert(data.error || 'Không thể hủy yêu cầu');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchLive]
  );

  const createProxyCall = useCallback(
    async (roomId: string, categoryCode: string, note?: string) => {
      setBusy(true);
      try {
        const res = await fetch('/api/service-call/operate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-proxy', roomId, categoryCode, note }),
        });
        const data = (await res.json()) as any;
        if (data.ok) {
          await fetchLive();
          return true;
        }
        alert(data.error || 'Chưa tạo được yêu cầu');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [fetchLive]
  );

  const pendingCount = useMemo(
    () => calls.filter((c) => c.status === 'CREATED').length,
    [calls]
  );

  return {
    calls,
    activeCallsByRoom,
    bannerCall,
    pendingCount,
    settings,
    busy,
    pushPermission,
    enablePushAlerts,
    dismissBanner,
    acknowledgeCall,
    startCall,
    completeCall,
    cancelCall,
    createProxyCall,
    reload: fetchLive,
  };
}
