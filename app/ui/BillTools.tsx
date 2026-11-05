'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
            Đã hoàn lại ({METHOD_LABELS[r.method]})<small>{r.note}</small>
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
      <button className="secondary" onClick={() => setOpen(true)}>
        Giảm giá
      </button>
    );
  return (
    <div className="info-strip">
      <p>
        <strong>Giảm giá phiếu</strong> · tiền đang cần thu {money(amount)}
      </p>
      <p>
        {[5, 10, 20].map((p) => (
          <button
            key={p}
            className="secondary"
            type="button"
            onClick={() => setValue(String(discountFromPercent(amount, p)))}
          >
            {p}%
          </button>
        ))}
      </p>
      <label>
        Số tiền giảm (đồng)
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <label>
        Lý do (bắt buộc)
        <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      </label>
      {discount > 0 && discount < amount && (
        <p role="status">
          Sau giảm: <strong>{money(amount - discount)}</strong>. Giảm giá trừ trên tiền chơi (đã gồm
          VAT) và không thể sửa sau khi ghi.
        </p>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button
        className="primary"
        disabled={!valid || busy}
        onClick={async () => {
          if (!window.confirm(`Giảm ${money(discount)} cho phiếu này?`)) return;
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
        Ghi giảm giá
      </button>
      <button className="secondary" onClick={() => setOpen(false)}>
        Đóng
      </button>
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
      <button className="primary" disabled={disabled} onClick={() => setOpen(true)}>
        Tiền mặt
      </button>
    );
  const given = tendered === '' ? (due ?? 0) : Number(tendered);
  const enough = due != null && given >= due;
  return (
    <div className="info-strip">
      <p>
        <strong>Thu tiền mặt</strong>
        {due != null && <> · cần thu {money(due)}</>}
      </p>
      <label>
        Khách đưa (đồng)
        <input
          inputMode="numeric"
          placeholder={due != null ? String(due) : ''}
          value={tendered}
          onChange={(e) => setTendered(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <p>
        {[100_000, 200_000, 500_000].map((n) => (
          <button
            key={n}
            className="secondary"
            type="button"
            onClick={() => setTendered(String(n))}
          >
            {money(n)}
          </button>
        ))}
        <button className="secondary" type="button" onClick={() => setTendered('')}>
          Vừa đủ
        </button>
      </p>
      {due != null && (
        <p role="status">
          {enough ? (
            <>
              Tiền thối: <strong>{money(changeDue(given, due))}</strong>
            </>
          ) : (
            <>Còn thiếu {money(due - given)}</>
          )}
        </p>
      )}
      <button className="primary" disabled={disabled || !enough} onClick={onPay}>
        Đã nhận đủ tiền mặt
      </button>
      <button className="secondary" onClick={() => setOpen(false)}>
        Đóng
      </button>
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
      <button className="secondary" onClick={() => setOpen(true)}>
        Hoàn tiền
      </button>
    );
  return (
    <div className="info-strip">
      <p>
        <strong>Hoàn tiền cho khách</strong> · cần mở ca; tiền mặt trả từ két
      </p>
      <label>
        Hình thức hoàn
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as Method);
            setValue('');
          }}
        >
          {remaining.map((r) => (
            <option key={r.method} value={r.method}>
              {METHOD_LABELS[r.method]} (tối đa {money(r.left)})
            </option>
          ))}
        </select>
      </label>
      <label>
        Số tiền hoàn (đồng)
        <input
          inputMode="numeric"
          placeholder={String(max)}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <label>
        Lý do (bắt buộc)
        <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button
        className="primary"
        disabled={!valid || busy}
        onClick={async () => {
          if (!window.confirm(`Hoàn ${money(amount)} (${METHOD_LABELS[method]}) cho khách?`))
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
        Xác nhận hoàn tiền
      </button>
      <button className="secondary" onClick={() => setOpen(false)}>
        Đóng
      </button>
    </div>
  );
}
