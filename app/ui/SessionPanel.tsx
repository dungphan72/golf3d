'use client';
import { useFood, FoodReceipt, SessionOrdering } from './SessionFood';
import { useEffect, useRef, useState } from 'react';
import { Bell, X, Play, Pause, Square, Printer, Split } from 'lucide-react';
import { rooms, money, quote, wholeQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { vietQrUrl } from '../../lib/bank';
import type { Bill } from '../../lib/pricing';
import { labels, time, date } from './shared';
function PackageRedeem({
  booking,
  money: fmt,
  onChanged,
}: {
  booking: Booking;
  money: (n: number) => string;
  onChanged: () => Promise<void>;
}) {
  type Usable = {
    packages: { id: string; name: string; remaining: number; expires: number; customer: string }[];
    covered: number;
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
          Đã trả phần golf bằng gói ({fmt(data.covered)}). Chỉ thu phần còn lại:{' '}
          <strong>{fmt((booking.amount ?? 0) - data.covered)}</strong>
        </p>
      ) : (
        <>
          <p>Khách có gói dùng được cho phiên này:</p>
          {data.packages.map((p) => (
            <button key={p.id} className="secondary" disabled={busy} onClick={() => redeem(p.id)}>
              Trả bằng gói: {p.name} (còn {p.remaining >= 99999 ? 'không giới hạn' : p.remaining})
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
type Bank = { bin: string; account: string; holder: string };
function TransferPanel({
  booking,
  bank,
  busy,
  onUse,
}: {
  booking: Booking;
  bank: Bank;
  busy: boolean;
  onUse: (txId: string) => void;
}) {
  type Overview = {
    configured: boolean;
    code: string;
    due: number | null;
    transactions: { id: string; amount: number; tx_time: number }[];
  };
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch('/api/bank?booking=' + encodeURIComponent(booking.id), { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<Overview>) : null))
        .then((v) => live && setData(v));
    load();
    const id = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [booking.id]);
  const hasBank = !!bank.bin && !!bank.account;
  if (!data || !hasBank || data.due == null) return null;
  const exact = data.transactions.filter((t) => t.amount === data.due);
  const other = data.transactions.filter((t) => t.amount !== data.due);
  return (
    <div className="info-strip transfer-panel">
      <p>
        <strong>Chuyển khoản {money(data.due)}</strong> · nội dung: <code>{data.code}</code>
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Mã QR chuyển khoản"
        width={220}
        height={220}
        src={vietQrUrl({
          bin: bank.bin,
          account: bank.account,
          holder: bank.holder,
          amount: data.due,
          note: data.code,
        })}
      />
      {exact.map((t) => (
        <button key={t.id} className="primary" disabled={busy} onClick={() => onUse(t.id)}>
          Đã nhận {money(t.amount)} lúc {time(t.tx_time)} — xác nhận thanh toán
        </button>
      ))}
      {other.map((t) => (
        <p key={t.id} role="status">
          Có giao dịch {money(t.amount)} nhưng khác số phải thu {money(data.due!)}; hãy kiểm tra
          lại.
        </p>
      ))}
      {data.configured && !data.transactions.length && (
        <p className="muted">Đang chờ ngân hàng báo có… (tự cập nhật)</p>
      )}
    </div>
  );
}
const PART_METHODS = [
  ['cash', 'Tiền mặt'],
  ['transfer', 'Chuyển khoản'],
  ['card', 'Thẻ'],
] as const;
/** One bill paid with several methods (e.g. part cash, part transfer). Parts must add up to the amount due. */
function SplitPay({
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
        data-tip="Chia nhiều hình thức thanh toán"
        aria-label="Chia nhiều hình thức thanh toán"
        className="secondary icon-only"
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
export function SessionPanel({
  booking: b,
  now,
  busy,
  onClose,
  onAction,
  canPay,
  onOpenShift,
  onRefresh,
  bank,
}: {
  onRefresh: () => Promise<void>;
  bank: Bank;
  canPay: boolean;
  onOpenShift: () => void;
  booking: Booking;
  now: number;
  busy: boolean;
  onClose: () => void;
  onAction: (action: string, extra?: Record<string, string | number>) => Promise<void>;
}) {
  const food = useFood(b.id);
  const pendingFood =
    food.data?.orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length ?? 0;
  const servedFood =
    food.data?.orders.filter((o) => o.status === 'served').reduce((sum, o) => sum + o.total, 0) ??
    0;
  const foodVerified = !!food.data && !food.error && servedFood === (b.food_total ?? 0);
  const paymentKey = useRef(operationKey());
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  const snap = JSON.parse(b.price);
  const seg: Segment[] = JSON.parse(b.segments);
  if (b.status === 'playing' && b.started) seg.push({ start: b.started, end: now });
  let q: Bill = { lines: [], subtotal: 0, fee: 0, vat: 0, total: 0 },
    quoteError = '';
  try {
    q =
      b.status === 'booked' && snap.estimated
        ? snap.estimated
        : b.service === 'gdr'
          ? quote(seg, snap.config, snap.vip)
          : wholeQuote(snap.base, snap.config, b.service as '9' | '18');
  } catch (e) {
    quoteError = e instanceof Error ? e.message : 'Chưa tính được tiền';
  }
  const minutes = seg.reduce((s, x) => s + (x.end - x.start) / 60000, 0);
  return (
    <dialog
      className="native-dialog"
      ref={dialogRef}
      onCancel={onClose}
      aria-label="Chi tiết phiên chơi"
    >
      <section className="modal session">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CHI TIẾT PHIÊN CHƠI</span>
            <h2>
              {rooms.find((r) => r.id === b.room)?.name}{' '}
              <span className={'badge ' + b.status}>{labels[b.status]}</span>
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </div>
        <div className="session-customer">
          <span className="avatar">{b.customer[0]}</span>
          <div>
            <h3>{b.customer}</h3>
            <p>
              {b.phone} · {b.people} người ·{' '}
              {b.service === 'gdr' ? 'Luyện tập GDR' : b.service + ' hố'}
            </p>
          </div>
        </div>
        <div className="session-time">
          <span>
            Lịch hẹn
            <strong>
              {date(b.start)} · {time(b.start)}
            </strong>
          </span>
          <span>
            Thực tế chơi
            <strong>
              {minutes.toFixed(1)} <small>phút</small>
            </strong>
          </span>
        </div>
        {quoteError ? (
          <div className="info-strip" role="alert">
            {quoteError}. Có thể kết thúc phiên để ghi nhận thời gian; chưa thể thanh toán cho đến
            khi giá được xử lý.
          </div>
        ) : (
          <div className="bill">
            <h3>{b.status === 'paid' ? 'PHIẾU THANH TOÁN' : 'CHI TIẾT TẠM TÍNH'}</h3>
            {q.lines.map((l, i) => (
              <div key={i}>
                <span>
                  {l.label}
                  <small>
                    {l.from != null && l.to != null
                      ? `${date(l.from)} ${time(l.from)}–${time(l.to)} · `
                      : ''}
                    {l.minutes.toFixed(2)} phút × {money(l.rate)}/giờ
                  </small>
                </span>
                <strong>{money(Math.round(l.amount))}</strong>
              </div>
            ))}
            {b.service !== 'gdr' && (
              <div>
                <span>Trọn lượt {b.service} hố</span>
                <strong>{money(q.subtotal)}</strong>
              </div>
            )}
            <div>
              <span>Tiền dịch vụ</span>
              <strong>{money(q.subtotal)}</strong>
            </div>
            <div>
              <span>
                Phí dịch vụ (
                {snap.config.feeMode === 'fixed'
                  ? money(snap.config.fee ?? 0)
                  : `${snap.config.fee ?? 0}%`}
                )
              </span>
              <strong>{money(q.fee)}</strong>
            </div>
            <div>
              <span>VAT ({snap.config.vat}%)</span>
              <strong>{money(q.vat)}</strong>
            </div>
            <div>
              <span>Tổng tiền chơi</span>
              <strong>{money(q.total)}</strong>
            </div>
            {food.data && <FoodReceipt data={food.data} />}
            <div className="bill-total">
              <span>Tổng cộng</span>
              <strong>{money(b.amount ?? q.total + (b.food_total ?? 0))}</strong>
            </div>
            <p>
              Giá được lưu tại thời điểm đặt.{' '}
              {snap.config.feeMode === 'fixed'
                ? 'Phí cố định tính một lần mỗi phiên.'
                : 'Phí theo tỷ lệ tiền dịch vụ.'}{' '}
              VAT tính trên tiền dịch vụ cộng phí. Chưa kết nối hóa đơn điện tử.
            </p>
          </div>
        )}
        {food.error && (
          <div className="info-strip" role="alert">
            {food.error}
          </div>
        )}
        {!foodVerified && (
          <div className="info-strip">
            Đang kiểm tra chi tiết đơn món trước khi thanh toán/in phiếu.
            <button className="secondary" onClick={food.reload}>
              Tải lại đơn món
            </button>
          </div>
        )}
        {food.data && (
          <SessionOrdering
            booking={b}
            data={food.data}
            onRefresh={async () => {
              await food.reload();
              await onRefresh();
            }}
          />
        )}
        {pendingFood > 0 && (
          <div className="info-strip">
            Còn {pendingFood} đơn chưa phục vụ hoặc hủy; chưa thể thanh toán.
          </div>
        )}
        <div className="session-buttons">
          {b.status === 'booked' && (
            <>
              <button className="primary" disabled={busy} onClick={() => onAction('start')}>
                <Play size={17} />
                Bắt đầu chơi
              </button>
              <button className="secondary" disabled={busy} onClick={() => onAction('cancel')}>
                Hủy lịch
              </button>
            </>
          )}
          {b.status === 'playing' && (
            <button
              data-tip="Tạm dừng do sự cố"
              aria-label="Tạm dừng do sự cố"
              className="secondary icon-only"
              disabled={busy}
              onClick={() => onAction('pause')}
            >
              <Pause size={16} />
              <span className="btn-label">Tạm dừng do sự cố</span>
            </button>
          )}
          {b.status === 'paused' && (
            <button className="primary" disabled={busy} onClick={() => onAction('resume')}>
              <Play size={16} />
              Tiếp tục
            </button>
          )}
          {['playing', 'paused'].includes(b.status) && (
            <button className="primary" disabled={busy} onClick={() => onAction('finish')}>
              <Square size={16} />
              Kết thúc chơi
            </button>
          )}
          {b.status === 'finished' && !canPay && (
            <div className="info-strip">
              Cần mở ca trước khi thu tiền.
              <button className="secondary" onClick={onOpenShift}>
                Đi đến mở ca
              </button>
            </div>
          )}
          {b.status === 'finished' && canPay && (
            <>
              <PackageRedeem booking={b} money={money} onChanged={onRefresh} />
              <TransferPanel
                booking={b}
                bank={bank}
                busy={busy}
                onUse={(txId) =>
                  onAction('pay', {
                    method: 'transfer',
                    requestId: paymentKey.current,
                    expectedAmount: b.amount!,
                    bankTxId: txId,
                  })
                }
              />
              <SplitPay
                booking={b}
                onChanged={onRefresh}
                disabled={
                  busy || b.amount == null || !!quoteError || !foodVerified || pendingFood > 0
                }
              />
              <p className="muted">Chỉ xác nhận sau khi đã kiểm tra nhận đủ tiền:</p>
              {[
                ['cash', 'Tiền mặt'],
                ['transfer', 'Chuyển khoản đã đối soát'],
                ['card', 'Thẻ tại quầy'],
              ].map(([method, t]) => (
                <button
                  className="primary"
                  disabled={
                    busy || b.amount == null || !!quoteError || !foodVerified || pendingFood > 0
                  }
                  key={method}
                  onClick={() =>
                    onAction('pay', {
                      method,
                      requestId: paymentKey.current,
                      expectedAmount: b.amount!,
                    })
                  }
                >
                  {t}
                </button>
              ))}
            </>
          )}
          {['finished', 'paid'].includes(b.status) && (
            <button
              data-tip="In phiếu"
              aria-label="In phiếu"
              className="secondary icon-only"
              disabled={!!quoteError || !foodVerified}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span className="btn-label">In phiếu</span>
            </button>
          )}
        </div>
        {['playing', 'paused'].includes(b.status) && (
          <div className="support-actions">
            <h3>Gửi yêu cầu hỗ trợ</h3>
            {['Nhân viên hỗ trợ', 'Hỗ trợ thiết bị', 'Yêu cầu khác'].map((kind) => (
              <button
                disabled={busy}
                className="secondary"
                key={kind}
                onClick={() => onAction('support', { kind })}
              >
                <Bell size={16} />
                {kind}
              </button>
            ))}
          </div>
        )}
      </section>
    </dialog>
  );
}
