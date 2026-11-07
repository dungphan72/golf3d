'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, CupSoda, CreditCard, LifeBuoy, UserRound, Check, Loader2 } from 'lucide-react';

type Info = { room: string; active: boolean; kinds: string[] };
type Status = { status: 'new' | 'received' | 'done'; kind: string };
const ICONS: Record<string, typeof Bell> = {
  'Nhân viên hỗ trợ': UserRound,
  'Hỗ trợ thiết bị': LifeBuoy,
  'Gọi đồ uống': CupSoda,
  'Tính tiền / thanh toán': CreditCard,
};
const LABEL = {
  new: 'Đã gửi, nhân viên sẽ đến ngay',
  received: 'Nhân viên đã nhận và đang đến',
  done: 'Đã hoàn thành',
} as const;

/** Guest page behind the QR code on each line: ring the bell, then watch it being picked up. */
export function CallPanel({ slug, room }: { slug: string; room: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState('');
  const [sent, setSent] = useState<{ id: string; kind: string } | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const q = `slug=${encodeURIComponent(slug)}`;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/public/call?${q}&room=${encodeURIComponent(room)}`, { cache: 'no-store' })
      .then(async (r) => {
        const v = (await r.json()) as Info & { error?: string };
        if (!live) return;
        if (r.ok) setInfo(v);
        else setError(v.error || 'Không mở được trang gọi phục vụ');
      })
      .catch(() => live && setError('Không kết nối được. Vui lòng thử lại.'));
    return () => {
      live = false;
    };
  }, [q, room]);

  useEffect(() => {
    if (!sent) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/public/call?${q}&id=${sent.id}`, { cache: 'no-store' });
        if (r.ok) {
          const v = (await r.json()) as Status;
          setStatus(v);
          if (v.status === 'done' && timer.current) clearInterval(timer.current);
        }
      } catch {
        /* keep the last known status */
      }
    };
    void tick();
    timer.current = setInterval(tick, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [sent, q]);

  async function ring(kind: string) {
    setSending(kind);
    setError('');
    try {
      const r = await fetch('/api/public/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, room, kind }),
      });
      const v = (await r.json()) as { error?: string; id?: string };
      if (!r.ok || !v.id) throw new Error(v.error || 'Chưa gửi được yêu cầu');
      setStatus(null);
      setSent({ id: v.id, kind });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gửi được yêu cầu');
    } finally {
      setSending('');
    }
  }

  const done = status?.status === 'done';
  const others = info?.kinds.filter((k) => k !== sent?.kind) ?? [];
  return (
    <main className="call">
      <header>
        <Bell size={28} aria-hidden />
        <h1>{info ? info.room : 'Gọi phục vụ'}</h1>
        <p>Chạm vào yêu cầu bạn cần, nhân viên sẽ đến tận line.</p>
      </header>
      {error && (
        <p className="call-error" role="alert">
          {error}
        </p>
      )}
      {!info && !error && <p className="call-note">Đang tải…</p>}
      {info && !info.active && !sent && (
        <p className="call-note">
          Line này chưa có phiên đang chơi. Vui lòng nhờ nhân viên tại quầy.
        </p>
      )}
      {sent && (
        <section
          className={'call-state ' + (status?.status ?? 'new')}
          role="status"
          aria-live="polite"
        >
          {done ? <Check size={30} /> : <Loader2 size={30} className="spin" />}
          <strong>{sent.kind}</strong>
          <span>{LABEL[status?.status ?? 'new']}</span>
          {done && (
            <button type="button" onClick={() => setSent(null)}>
              Gửi yêu cầu khác
            </button>
          )}
        </section>
      )}
      {info?.active && !sent && (
        <div className="call-grid">
          {info.kinds.map((k) => {
            const Icon = ICONS[k] ?? Bell;
            return (
              <button key={k} type="button" disabled={!!sending} onClick={() => ring(k)}>
                <Icon size={30} aria-hidden />
                {sending === k ? 'Đang gửi…' : k}
              </button>
            );
          })}
        </div>
      )}
      {info?.active && sent && !done && (
        <>
          <p className="call-note">Cần thêm gì khác? Chạm để gửi thêm yêu cầu.</p>
          <div className="call-grid small">
            {others.map((k) => {
              const Icon = ICONS[k] ?? Bell;
              return (
                <button key={k} type="button" disabled={!!sending} onClick={() => ring(k)}>
                  <Icon size={22} aria-hidden />
                  {k}
                </button>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
