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
    wallet?: {
      customer: string;
      balance: number;
      amount: number;
      enough: boolean;
      payable: boolean;
      paid: number;
    } | null;
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
  const wallet = data?.wallet && data.wallet.payable ? data.wallet : null;
  if (!data || (!data.packages.length && !data.covered && !wallet)) return null;
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
  async function payWallet() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wallet-pay', bookingId: booking.id }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || 'Không trả được bằng ví');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="info-strip" style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 8 }}>
      {data.covered > 0 ? (
        <p style={{ margin: 0, fontSize: 13 }}>
          Đã trừ gói: <strong>{fmt(data.covered)}</strong> · Còn lại:{' '}
          <strong style={{ color: 'var(--ds-green-dark)' }}>{fmt((booking.amount ?? 0) - data.covered)}</strong>
        </p>
      ) : (
        <>
          {wallet && (
            <div style={{ marginBottom: data.packages.length ? 8 : 0 }}>
              <button
                className="secondary"
                disabled={busy || !wallet.enough}
                title={wallet.enough ? undefined : 'Số dư ví không đủ cho cả phiếu'}
                onClick={payWallet}
                style={{ height: 32, fontSize: 12.5, padding: '0 10px' }}
              >
                Trả bằng ví ({fmt(wallet.balance)}){wallet.enough ? '' : ' · không đủ'}
              </button>
            </div>
          )}
          {data.packages.length > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Gói hội viên khả dụng:</div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.packages.map((p) => (
              <button
                key={p.id}
                className="secondary"
                disabled={busy || !p.enough}
                title={p.enough ? undefined : 'Gói không đủ giờ cho phiên này'}
                onClick={() => redeem(p.id)}
                style={{ height: 32, fontSize: 12.5, padding: '0 10px' }}
              >
                Dùng gói: {p.name} ({p.remaining >= 99999 ? '∞' : `${p.remaining}h`}){p.enough ? '' : ' · thiếu giờ'}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <div className="error-box" role="alert" style={{ marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
