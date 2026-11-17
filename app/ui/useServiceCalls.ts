'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { type ServiceCall, type ResolutionType, type ServiceCallSettings } from '../../lib/service-call';

// Shared AudioContext with user-gesture unlock for continuous bell
let sharedAudioCtx: AudioContext | null = null;
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

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

/**
 * Web Audio Chime synthesizer:
 * Crisp, pleasant 2-tone bell chime (880Hz E5 -> 659Hz E4).
 * Works 100% locally without external sound files that might 404.
 */
export function playServiceBellChime() {
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

    // Second tone (659.25 Hz - E5) starting slightly later
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
    // Browser may require user gesture
  }
}

export function useServiceCalls() {
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [settings, setSettings] = useState<ServiceCallSettings | null>(null);
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/service-call/live', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as any;
      if (data.ok && Array.isArray(data.calls)) {
        setCalls(data.calls);
        if (data.settings) setSettings(data.settings);

        // Check for newly arrived CREATED calls to ring chime
        const currentPendingIds = new Set<string>(
          data.calls
            .filter((c: ServiceCall) => c.status === 'CREATED')
            .map((c: ServiceCall) => String(c.id))
        );

        let hasNew = false;
        for (const id of currentPendingIds) {
          if (!prevPendingIdsRef.current.has(id)) {
            hasNew = true;
            break;
          }
        }
        prevPendingIdsRef.current = currentPendingIds;

        if (hasNew && (data.settings?.sound_alert_enabled ?? true)) {
          playServiceBellChime();
        }
      }
    } catch {
      // Keep state on network glitch
    }
  }, []);

  // Continuous bell ringing as long as any un-dismissed call is in 'CREATED' status
  const continuousRingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasCreatedCalls = calls.some((c) => c.status === 'CREATED' && !dismissedCallIds.has(c.id));
    const soundEnabled = settings?.sound_alert_enabled ?? true;

    if (hasCreatedCalls && soundEnabled) {
      if (!continuousRingRef.current) {
        playServiceBellChime();
        continuousRingRef.current = setInterval(() => {
          playServiceBellChime();
        }, 3000);
      }
    } else {
      if (continuousRingRef.current) {
        clearInterval(continuousRingRef.current);
        continuousRingRef.current = null;
      }
    }

    return () => {
      if (continuousRingRef.current) {
        clearInterval(continuousRingRef.current);
        continuousRingRef.current = null;
      }
    };
  }, [calls, settings, dismissedCallIds]);

  // Adaptive interval: 3.5s if open calls exist, 12s if idle
  const hasOpenCalls = useMemo(
    () => calls.some((c) => ['CREATED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)),
    [calls]
  );

  useEffect(() => {
    fetchLive();
    const intervalMs = hasOpenCalls ? 3500 : 12000;
    pollTimerRef.current = setInterval(fetchLive, intervalMs);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
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
    dismissBanner,
    acknowledgeCall,
    startCall,
    completeCall,
    cancelCall,
    createProxyCall,
    reload: fetchLive,
  };
}
