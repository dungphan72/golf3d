'use client';
import { useEffect, useRef, useState } from 'react';
import { BellRing, Smartphone, Volume2, VolumeX } from 'lucide-react';

const SOUND_KEY = 'bell-sound';
const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    return true;
  }
};

let ctx: AudioContext | null = null;
/** Two short tones; browsers only allow audio after the page has had a click or key press. */
function ding() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    [880, 1175].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.35, t + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.4);
      o.connect(g).connect(ctx!.destination);
      o.start(t + i * 0.22);
      o.stop(t + i * 0.22 + 0.45);
    });
  } catch {
    /* no audio available: the badge and toast still show */
  }
}

/** Rings when the number of requests waiting for a first response goes up (not on the first load). */
export function useBellSound(waiting: number | null, onRing: (n: number) => void) {
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (waiting == null) return;
    if (last.current != null && waiting > last.current) {
      if (readSound()) ding();
      onRing(waiting - last.current);
    }
    last.current = waiting;
  }, [waiting, onRing]);
  useEffect(() => {
    const wake = () => {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);
}

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

/** Sound on/off for this device, plus phone push notifications (works with the screen locked). */
export function BellSettings() {
  const [sound, setSound] = useState(true);
  const [push, setPush] = useState<'unknown' | 'on' | 'off' | 'unsupported' | 'blocked'>('unknown');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read device state once on mount */
    setSound(readSound());
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPush('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPush('blocked');
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setPush(sub ? 'on' : 'off'))
      .catch(() => setPush('off'));
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    } catch {
      /* the choice just does not persist */
    }
    if (next) ding();
  }

  async function enablePush() {
    setBusy(true);
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPush(perm === 'denied' ? 'blocked' : 'off');
        throw new Error('Bạn chưa cho phép thông báo trên trình duyệt này');
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push');
      const { publicKey } = (await keyRes.json()) as { publicKey?: string; error?: string };
      if (!keyRes.ok || !publicKey) throw new Error('Không lấy được khóa thông báo');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64uToBytes(publicKey),
      });
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: sub.endpoint,
          p256dh: toB64u(sub.getKey('p256dh')),
          auth: toB64u(sub.getKey('auth')),
        }),
      });
      if (!res.ok) throw new Error('Không lưu được đăng ký thông báo');
      setPush('on');
      setMsg('Đã bật. Điện thoại này sẽ nhận thông báo khi khách bấm chuông.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Không bật được thông báo');
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPush('off');
      setMsg('Đã tắt thông báo đẩy trên thiết bị này.');
    } catch {
      setMsg('Không tắt được thông báo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bell-settings">
      <button type="button" className="secondary" aria-pressed={sound} onClick={toggleSound}>
        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        Âm chuông: {sound ? 'Bật' : 'Tắt'}
      </button>
      {push === 'unsupported' ? (
        <span className="muted">Trình duyệt này không hỗ trợ thông báo đẩy.</span>
      ) : push === 'blocked' ? (
        <span className="muted">
          Thông báo đang bị chặn. Hãy cho phép thông báo cho trang này trong cài đặt trình duyệt.
        </span>
      ) : (
        <button
          type="button"
          className="secondary"
          aria-pressed={push === 'on'}
          disabled={busy || push === 'unknown'}
          onClick={push === 'on' ? disablePush : enablePush}
        >
          {push === 'on' ? <BellRing size={16} /> : <Smartphone size={16} />}
          Thông báo đẩy: {push === 'on' ? 'Bật' : 'Tắt'}
        </button>
      )}
      {msg && (
        <span role="status" className="muted">
          {msg}
        </span>
      )}
    </div>
  );
}
