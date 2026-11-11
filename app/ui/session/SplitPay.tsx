'use client';
import { useEffect, useRef, useState } from 'react';
import { Split } from 'lucide-react';
import { money, type Booking } from '../../../lib/club';
import { operationKey } from '../../../lib/finance';

export const PART_METHODS = [
  ['cash', 'Tiền mặt'],
  ['transfer', 'Chuyển khoản'],
  ['card', 'Thẻ'],
] as const;

/** One bill paid with several methods (e.g. part cash, part transfer). Parts must add up to the amount due. */
export function SplitPay({
  booking,
  disabled,
  onChanged,
}: {
  booking: Booking;
  disabled: boolean;
  onChanged: () => Promise<void>;
}) {
  type Overview = { due: number | null; transactions: { id: string; amount: number }[] };
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef(operationKey());
  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch('/api/bank?booking=' + encodeURIComponent(booking.id), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Overview>) : null))
      .then((v) => live && setData(v));
    return () => {
      live = false;
    };
  }, [open, booking.id]);
  const due = data?.due ?? null;
  const parts = PART_METHODS.map(([method]) => ({
    method,
    amount: Math.round(Number(amounts[method] || 0)),
  })).filter((p) => p.amount > 0);
  const total = parts.reduce((n, p) => n + p.amount, 0);
  const transferPart = parts.find((p) => p.method === 'transfer');
  // A matching transfer already reported by the bank is consumed together with the payment.
  const bankTx = transferPart && data?.transactions.find((t) => t.amount === transferPart.amount);
  const valid = due != null && parts.length >= 2 && total === due;
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay-split',
          bookingId: booking.id,
          requestId: key.current,
          expectedAmount: booking.amount,
          parts: parts.map((p) => ({
            ...p,
            ...(p.method === 'transfer' && bankTx ? { bankTxId: bankTx.id } : {}),
          })),
        }),
      });
      const v = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(v.error || 'Không ghi được thanh toán');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button
        aria-label="Chia nhiều hình thức thanh toán"
        className="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, fontSize: 13 }}
      >
        <Split size={15} />
        <span>Chia tiền</span>
      </button>
    );
  return (
    <div
      className="info-strip"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13.5 }}>Chia thanh toán</strong>
        {due != null && (
          <span style={{ fontSize: 12.5, color: 'var(--ds-muted)' }}>
            Cần thu: <strong style={{ color: 'var(--ds-text)' }}>{money(due)}</strong>
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {PART_METHODS.map(([method, label]) => (
          <label key={method} style={{ margin: 0 }}>
            <span>{label}</span>
            <input
              inputMode="numeric"
              placeholder="0"
              value={amounts[method] ?? ''}
              onChange={(e) =>
                setAmounts({ ...amounts, [method]: e.target.value.replace(/\D/g, '') })
              }
            />
          </label>
        ))}
      </div>
      {due != null && (
        <div role="status" style={{ margin: '8px 0', fontSize: 13 }}>
          Đã nhập: <strong>{money(total)}</strong> ·{' '}
          {total === due ? (
            <span style={{ color: 'var(--ds-green-dark)', fontWeight: 600 }}>Đủ tiền</span>
          ) : total < due ? (
            <span style={{ color: '#dc2626' }}>còn thiếu {money(due - total)}</span>
          ) : (
            <span style={{ color: '#b45309' }}>thừa {money(total - due)}</span>
          )}
          {bankTx && ' · tự gắn giao dịch ngân hàng'}
        </div>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="primary"
          disabled={disabled || busy || !valid}
          onClick={submit}
          aria-label="Xác nhận đã nhận đủ tiền"
          style={{ height: 34, fontSize: 13, padding: '0 14px' }}
        >
          Xác nhận
        </button>
        <button className="secondary" disabled={busy} style={{ height: 34, fontSize: 13, padding: '0 14px' }} onClick={() => setOpen(false)}>
          Đóng
        </button>
      </div>
    </div>
  );
}
