'use client';
import { useFood, FoodReceipt, SessionOrdering } from './SessionFood';
import { useEffect, useRef } from 'react';
import { Bell, X, Play, Pause, Square, Printer } from 'lucide-react';
import { rooms, money, quote, wholeQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import type { Bill } from '../../lib/pricing';
import { labels, time, date } from './shared';
export function SessionPanel({
  booking: b,
  now,
  busy,
  onClose,
  onAction,
  canPay,
  onOpenShift,
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
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
            <button className="secondary" disabled={busy} onClick={() => onAction('pause')}>
              <Pause size={16} />
              Tạm dừng do sự cố
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
              className="secondary"
              disabled={!!quoteError || !foodVerified}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              In phiếu
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
