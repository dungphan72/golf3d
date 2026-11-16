'use client';
import { askConfirm } from './kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Tag } from 'lucide-react';
import { money } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { discountFromPercent, changeDue, type BillInfo } from '../../lib/billing';

const METHOD_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' } as const;
type Method = keyof typeof METHOD_LABELS;

/** Discount, payments and refunds of a bill; reloads when the booking status changes. */
export function useBill(bookingId: string, status: string) {
  const [bill, setBill] = useState<BillInfo | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/billing?booking=' + encodeURIComponent(bookingId), {
      cache: 'no-store',
    });
    if (r.ok) setBill(((await r.json()) as { bill: BillInfo }).bill);
  }, [bookingId]);
  useEffect(() => {
    if (['finished', 'paid'].includes(status)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and when the status changes
      load();
    }
  }, [load, status]);
  return { bill, reload: load };
}

/** Extra receipt lines: the discount before payment, refunds after. */
export function BillAdjustments({ bill }: { bill: BillInfo | null }) {
  if (!bill) return null;
  return (
    <>
      {bill.discount && (
        <div>
          <span>
            Giảm giá
            <small>{bill.discount.reason}</small>
          </span>
          <strong>−{money(bill.discount.amount)}</strong>
        </div>
      )}
      {bill.refunds.map((r) => (
        <div key={r.id}>
          <span>
            Đã hoàn ({METHOD_LABELS[r.method]})<small>{r.note}</small>
          </span>
          <strong>−{money(r.amount)}</strong>
        </div>
      ))}
    </>
  );
}

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/billing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const v = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}

/** Manager discount on a finished, unpaid bill: a percentage or a fixed amount, with a reason. */
export function DiscountForm({
  bookingId,
  amount,
  onDone,
}: {
  bookingId: string;
  amount: number;
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const discount = Math.round(Number(value || 0));
  const valid = discount > 0 && discount < amount && reason.trim().length >= 3;
  if (!open)
    return (
      <button
        className="secondary"
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, fontSize: 13 }}
      >
        <Tag size={15} /> Giảm giá
      </button>
    );
  return (
    <div
      className="info-strip"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        padding: '14px 16px',
        borderRadius: 5,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13.5 }}>Giảm giá phiếu</strong>
        <span style={{ fontSize: 12.5, color: 'var(--ds-muted)' }}>Cần thu: {money(amount)}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[5, 10, 20].map((p) => (
          <button
            key={p}
            className="secondary"
            type="button"
            style={{ height: 30, padding: '0 10px', fontSize: 12.5 }}
            onClick={() => setValue(String(discountFromPercent(amount, p)))}
          >
            {p}%
          </button>
        ))}
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, width: '100%' }}>
        <span>Số tiền giảm (đồng)</span>
        <input
          inputMode="numeric"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, width: '100%' }}>
        <span>Lý do (bắt buộc)</span>
        <input
          value={reason}
          maxLength={300}
          placeholder="Khách thân thiết, ưu đãi giờ vàng..."
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {discount > 0 && discount < amount && (
        <p role="status" style={{ margin: '6px 0', fontSize: 13 }}>
          Sau giảm: <strong style={{ color: 'var(--ds-green-dark)' }}>{money(amount - discount)}</strong>
        </p>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="primary"
          disabled={!valid || busy}
          aria-label="Ghi giảm giá"
          style={{ height: 34, fontSize: 13, padding: '0 14px' }}
          onClick={async () => {
            if (
              !(await askConfirm({
                title: `Giảm ${money(discount)} cho phiếu này?`,
                confirmLabel: 'Ghi giảm giá',
              }))
            )
              return;
            setBusy(true);
            setError('');
            try {
              await post({ action: 'discount', bookingId, amount: discount, reason: reason.trim() });
              setOpen(false);
              setValue('');
              setReason('');
              await onDone();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Áp dụng
        </button>
        <button className="secondary" style={{ height: 34, fontSize: 13, padding: '0 14px' }} onClick={() => setOpen(false)}>
          Đóng
        </button>
      </div>
    </div>
  );
}

/** Cash payment helper: the amount the customer hands over and the change to give back. */
export function CashPay({
  bookingId,
  disabled,
  onPay,
}: {
  bookingId: string;
  disabled: boolean;
  onPay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState<number | null>(null);
  const [tendered, setTendered] = useState('');
  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch('/api/bank?booking=' + encodeURIComponent(bookingId), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ due: number | null }>) : null))
      .then((v) => live && setDue(v?.due ?? null));
    return () => {
      live = false;
    };
  }, [open, bookingId]);
  if (!open)
    return (
      <button
        className="primary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Banknote size={18} />
        Tiền mặt
      </button>
    );
  const given = tendered === '' ? (due ?? 0) : Number(tendered);
  const enough = due != null && given >= due;
  return (
    <div
      className="info-strip cash-pay-box"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 5,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 14 }}>Thu tiền mặt</strong>
        {due != null && (
          <span style={{ fontSize: 12.5, color: 'var(--ds-muted)' }}>
            Cần thu: <strong style={{ color: 'var(--ds-text)' }}>{money(due)}</strong>
          </span>
        )}
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, width: '100%' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ds-muted)', fontWeight: 500 }}>Khách đưa (đồng)</span>
        <input
          inputMode="numeric"
          placeholder={due != null ? String(due) : ''}
          value={tendered}
          onChange={(e) => setTendered(e.target.value.replace(/\D/g, ''))}
          autoFocus
          style={{ height: 38, fontSize: 15, fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
        />
      </label>
      <div style={{ display: 'flex', gap: 6, margin: '2px 0', flexWrap: 'wrap' }}>
        {[100_000, 200_000, 500_000].map((n) => (
          <button
            key={n}
            className="secondary"
            type="button"
            style={{ height: 30, padding: '0 12px', fontSize: 12.5 }}
            onClick={() => setTendered(String(n))}
          >
            {n === 100_000 ? '100k' : n === 200_000 ? '200k' : '500k'}
          </button>
        ))}
        <button
          className="secondary"
          type="button"
          style={{ height: 30, padding: '0 12px', fontSize: 12.5 }}
          onClick={() => setTendered(due != null ? String(due) : '')}
        >
          Vừa đủ
        </button>
      </div>
      {due != null && (
        <div role="status" style={{ margin: '4px 0', fontSize: 13.5 }}>
          {enough ? (
            <span style={{ color: 'var(--ds-green-dark)', fontWeight: 600 }}>
              Tiền thối: <strong style={{ fontSize: 16 }}>{money(changeDue(given, due))}</strong>
            </span>
          ) : (
            <span style={{ color: '#dc2626' }}>
              Còn thiếu: <strong>{money(due - given)}</strong>
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="primary"
          disabled={disabled || !enough}
          onClick={onPay}
          aria-label="Đã nhận đủ tiền mặt"
          style={{ flex: 1, height: 36, fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Xác nhận thu
        </button>
        <button
          className="secondary"
          style={{ height: 36, fontSize: 13, padding: '0 16px' }}
          onClick={() => setOpen(false)}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

/** Manager refund of a paid bill, back to the method it was paid with. */
export function RefundForm({
  bookingId,
  bill,
  onDone,
}: {
  bookingId: string;
  bill: BillInfo;
  onDone: () => Promise<void>;
}) {
  const key = useRef(operationKey());
  const remaining = (['cash', 'transfer', 'card'] as Method[])
    .map((m) => ({
      method: m,
      left:
        bill.payments.filter((p) => p.method === m).reduce((n, p) => n + p.amount, 0) -
        bill.refunds.filter((r) => r.method === m).reduce((n, r) => n + r.amount, 0),
    }))
    .filter((r) => r.left > 0);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>(remaining[0]?.method ?? 'cash');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!remaining.length) return null;
  const max = remaining.find((r) => r.method === method)?.left ?? 0;
  const amount = Math.round(Number(value || 0));
  const valid = amount > 0 && amount <= max && reason.trim().length >= 3;
  if (!open)
    return (
      <button
        className="secondary"
        onClick={() => setOpen(true)}
        style={{ height: 34, fontSize: 13 }}
      >
        Hoàn tiền
      </button>
    );
  return (
    <div
      className="info-strip"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        padding: '14px 16px',
        borderRadius: 5,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13.5 }}>Hoàn tiền cho khách</strong>
        <span style={{ fontSize: 12.5, color: 'var(--ds-muted)' }}>Tối đa: {money(max)}</span>
      </div>
      <label>
        <span>Hình thức</span>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as Method);
            setValue('');
          }}
        >
          {remaining.map((r) => (
            <option key={r.method} value={r.method}>
              {METHOD_LABELS[r.method]} ({money(r.left)})
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, width: '100%' }}>
        <span>Số tiền hoàn (đồng)</span>
        <input
          inputMode="numeric"
          placeholder={String(max)}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, width: '100%' }}>
        <span>Lý do (bắt buộc)</span>
        <input
          value={reason}
          maxLength={300}
          placeholder="Lỗi máy, bớt giờ chơi..."
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="primary"
          disabled={!valid || busy}
          aria-label="Xác nhận hoàn tiền"
          style={{ height: 34, fontSize: 13, padding: '0 14px' }}
          onClick={async () => {
            if (
              !(await askConfirm({
                title: `Hoàn ${money(amount)} (${METHOD_LABELS[method]}) cho khách?`,
                confirmLabel: 'Hoàn tiền',
                danger: true,
              }))
            )
              return;
            setBusy(true);
            setError('');
            try {
              await post({
                action: 'refund',
                requestId: key.current,
                bookingId,
                method,
                amount,
                reason: reason.trim(),
              });
              key.current = operationKey();
              setOpen(false);
              setValue('');
              setReason('');
              await onDone();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Hoàn tiền
        </button>
        <button className="secondary" style={{ height: 34, fontSize: 13, padding: '0 14px' }} onClick={() => setOpen(false)}>
          Đóng
        </button>
      </div>
    </div>
  );
}
