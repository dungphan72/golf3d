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
      >
        <Split size={16} />
        <span className="btn-label">Chia nhiều hình thức thanh toán</span>
      </button>
    );
  return (
    <div className="info-strip">
      <p>
        <strong>Chia thanh toán</strong>
        {due != null && <> · cần thu {money(due)}</>}
      </p>
      {PART_METHODS.map(([method, label]) => (
        <label key={method}>
          {label}
          <input
            inputMode="numeric"
            value={amounts[method] ?? ''}
            onChange={(e) =>
              setAmounts({ ...amounts, [method]: e.target.value.replace(/\D/g, '') })
            }
          />
        </label>
      ))}
      {due != null && (
        <p role="status">
          Đã nhập {money(total)} ·{' '}
          {total === due
            ? 'đủ'
            : total < due
              ? `còn thiếu ${money(due - total)}`
              : `thừa ${money(total - due)}`}
          {bankTx && ' · tự gắn giao dịch ngân hàng đã báo có'}
        </p>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button className="primary" disabled={disabled || busy || !valid} onClick={submit}>
        Xác nhận đã nhận đủ tiền
      </button>
      <button className="secondary" disabled={busy} onClick={() => setOpen(false)}>
        Đóng
      </button>
    </div>
  );
}
