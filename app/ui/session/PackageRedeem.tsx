'use client';
import { useEffect, useState } from 'react';
import type { Booking } from '../../../lib/club';

export function PackageRedeem({
  booking,
  money: fmt,
  onChanged,
}: {
  booking: Booking;
  money: (n: number) => string;
  onChanged: () => Promise<void>;
}) {
  type Usable = {
    packages: {
      id: string;
      name: string;
      remaining: number;
      expires: number;
      customer: string;
      enough: boolean;
    }[];
    covered: number;
    kind?: string;
    units?: number;
    usedUnits?: number;
  };
  const [data, setData] = useState<Usable | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    fetch('/api/members?usableFor=' + encodeURIComponent(booking.id), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Usable>) : null))
      .then((v) => live && setData(v));
    return () => {
      live = false;
    };
  }, [booking.id, booking.status]);
  if (!data || (!data.packages.length && !data.covered)) return null;
  async function redeem(packageId: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', bookingId: booking.id, packageId }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Không trả được bằng gói');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="info-strip">
      {data.covered > 0 ? (
        <p>
          Đã trả phần golf bằng gói ({fmt(data.covered)}
          {data.kind === 'gdr' && data.usedUnits ? `, trừ ${data.usedUnits} giờ` : ''}). Chỉ thu
          phần còn lại: <strong>{fmt((booking.amount ?? 0) - data.covered)}</strong>
        </p>
      ) : (
        <>
          <p>
            Khách có gói dùng được cho phiên này
            {data.kind === 'gdr' && data.units ? ` (cần trừ ${data.units} giờ)` : ''}:
          </p>
          {data.packages.map((p) => (
            <button
              key={p.id}
              className="secondary"
              disabled={busy || !p.enough}
              title={p.enough ? undefined : 'Gói không còn đủ giờ cho phiên này'}
              onClick={() => redeem(p.id)}
            >
              Trả bằng gói: {p.name} (còn {p.remaining >= 99999 ? 'không giới hạn' : p.remaining}
              {data.kind === 'gdr' ? ' giờ' : ''}){p.enough ? '' : ' · không đủ'}
            </button>
          ))}
        </>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
