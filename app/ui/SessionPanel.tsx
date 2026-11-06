'use client';
import { useFood, FoodReceipt, SessionOrdering } from './SessionFood';
import { useEffect, useRef } from 'react';
import { Bell, X, Play, Pause, Square, Printer } from 'lucide-react';
import { rooms, money, quote, wholeQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import type { Bill } from '../../lib/pricing';
import { labels, time, date } from './shared';
import { useBill, BillAdjustments, DiscountForm, CashPay, RefundForm } from './BillTools';
import { PackageRedeem } from './session/PackageRedeem';
import { type Bank, TransferPanel } from './session/TransferPanel';
import { SplitPay } from './session/SplitPay';

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
  permissions = [],
}: {
  permissions?: string[];
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
  const { bill, reload: reloadBill } = useBill(b.id, b.status);
  const refreshAll = async () => {
    await onRefresh();
    await reloadBill();
  };
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
  const cannotPay = busy || b.amount == null || !!quoteError || !foodVerified || pendingFood > 0;
  const payAs = (method: string) =>
    onAction('pay', { method, requestId: paymentKey.current, expectedAmount: b.amount! });
  const operating = ['booked', 'playing', 'paused'].includes(b.status);
  return (
    <dialog
      className="native-dialog"
      ref={dialogRef}
      onCancel={onClose}
      aria-label="Chi tiết phiên chơi"
    >
      <section className="modal session">
        <div className="modal-heading">
          <h2>
            {rooms.find((r) => r.id === b.room)?.name}{' '}
            <span className={'badge ' + b.status}>{labels[b.status]}</span>
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </div>
        <div className="sp-summary">
          <span className="avatar">{b.customer[0]}</span>
          <div className="sp-who">
            <h3>{b.customer}</h3>
            <p>
              {b.phone ? b.phone + ' · ' : ''}
              {b.people} người · {b.service === 'gdr' ? 'Luyện tập' : b.service + ' hố'}
            </p>
          </div>
          <dl className="sp-times">
            <div>
              <dt>Lịch hẹn</dt>
              <dd>
                {date(b.start)} · {time(b.start)}
              </dd>
            </div>
            <div>
              <dt>Đã chơi</dt>
              <dd>{Math.round(minutes)} phút</dd>
            </div>
          </dl>
        </div>
        {operating && (
          <div className="sp-actions">
            {b.status === 'booked' && (
              <>
                <button className="primary" disabled={busy} onClick={() => onAction('start')}>
                  <Play size={18} />
                  Bắt đầu chơi
                </button>
                <button className="secondary" disabled={busy} onClick={() => onAction('cancel')}>
                  Hủy lịch
                </button>
              </>
            )}
            {b.status === 'paused' && (
              <button className="secondary" disabled={busy} onClick={() => onAction('resume')}>
                <Play size={17} />
                Tiếp tục
              </button>
            )}
            {['playing', 'paused'].includes(b.status) && (
              <button className="primary" disabled={busy} onClick={() => onAction('finish')}>
                <Square size={18} />
                Kết thúc chơi
              </button>
            )}
            {b.status === 'playing' && (
              <button
                aria-label="Tạm dừng do sự cố"
                className="secondary"
                disabled={busy}
                onClick={() => onAction('pause')}
              >
                <Pause size={17} />
                Tạm dừng do sự cố
              </button>
            )}
          </div>
        )}
        {quoteError ? (
          <div className="info-strip" role="alert">
            {quoteError}. Có thể kết thúc phiên để ghi nhận thời gian; chưa thể thanh toán cho đến
            khi giá được xử lý.
          </div>
        ) : (
          <div className="bill">
            <h3>{b.status === 'paid' ? 'Phiếu thanh toán' : 'Tạm tính'}</h3>
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
            {b.service !== 'gdr' && snap.promo && snap.listBase > snap.base && (
              <>
                <div>
                  <span>Trọn lượt {b.service} hố (giá niêm yết)</span>
                  <strong>{money(snap.listBase)}</strong>
                </div>
                <div>
                  <span>Khuyến mãi: {snap.promo.name}</span>
                  <strong>−{money(snap.listBase - snap.base)}</strong>
                </div>
              </>
            )}
            <div>
              <span>{b.service === 'gdr' ? 'Tiền dịch vụ' : `Trọn lượt ${b.service} hố`}</span>
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
            <BillAdjustments bill={bill} />
            {food.data && <FoodReceipt data={food.data} />}
            <div className="bill-total">
              <span>Tổng cộng</span>
              <strong>{money(b.amount ?? q.total + (b.food_total ?? 0))}</strong>
            </div>
            <details className="bill-note">
              <summary>Cách tính</summary>
              <p>
                Giá được lưu tại thời điểm đặt.{' '}
                {snap.config.feeMode === 'fixed'
                  ? 'Phí cố định tính một lần mỗi phiên.'
                  : 'Phí theo tỷ lệ tiền dịch vụ.'}{' '}
                VAT tính trên tiền dịch vụ cộng phí. Chưa kết nối hóa đơn điện tử.
              </p>
            </details>
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
        {b.status === 'finished' && (
          <section className="sp-pay" aria-label="Thu tiền">
            <div className="sp-pay-head">
              <h3>Thu tiền</h3>
              <strong>{b.amount == null ? '—' : money(b.amount)}</strong>
            </div>
            {!canPay ? (
              <div className="info-strip">
                Cần mở ca trước khi thu tiền.
                <button className="secondary" onClick={onOpenShift}>
                  Đi đến mở ca
                </button>
              </div>
            ) : (
              <>
                <PackageRedeem booking={b} money={money} onChanged={refreshAll} />
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
                <p className="muted">Chỉ bấm sau khi đã nhận đủ tiền.</p>
                <div className="pay-methods">
                  <CashPay bookingId={b.id} disabled={cannotPay} onPay={() => payAs('cash')} />
                  {[
                    ['transfer', 'Chuyển khoản đã đối soát'],
                    ['card', 'Thẻ tại quầy'],
                  ].map(([method, t]) => (
                    <button
                      className="primary"
                      disabled={cannotPay}
                      key={method}
                      onClick={() => payAs(method)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="pay-extras">
                  {permissions.includes('billing.discount') &&
                    bill &&
                    !bill.discount &&
                    !bill.payments.length &&
                    b.amount != null &&
                    !quoteError && (
                      <DiscountForm bookingId={b.id} amount={b.amount} onDone={refreshAll} />
                    )}
                  <SplitPay booking={b} onChanged={refreshAll} disabled={cannotPay} />
                </div>
              </>
            )}
          </section>
        )}
        {b.status === 'paid' &&
          b.payment === 'package' &&
          permissions.includes('billing.refund') && (
            <div className="info-strip">
              Phiếu trả bằng gói. Để hoàn giờ/lượt cho khách, vào Hội viên, chọn khách, bấm
              &quot;Điều chỉnh&quot; trên gói và cộng lại số giờ kèm lý do.
            </div>
          )}
        {b.status === 'paid' && bill && permissions.includes('billing.refund') && (
          <RefundForm bookingId={b.id} bill={bill} onDone={refreshAll} />
        )}
        {['finished', 'paid'].includes(b.status) && (
          <div className="sp-print">
            <button
              aria-label="In phiếu"
              className="secondary"
              disabled={!!quoteError || !foodVerified}
              onClick={() => window.print()}
            >
              <Printer size={17} />
              In phiếu
            </button>
          </div>
        )}
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
