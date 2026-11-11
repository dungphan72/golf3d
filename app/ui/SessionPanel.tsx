'use client';
import { useFood, FoodReceipt, SessionOrdering } from './SessionFood';
import { useRef, useState } from 'react';
import { Bell, Play, Pause, Square, Printer, QrCode, CreditCard, Check, X, MessageCircle } from 'lucide-react';
import { rooms, money, quote, wholeQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import type { Bill } from '../../lib/pricing';
import { labels, time, date } from './shared';
import { DialogHeading, ModalDialog, StatusBadge, type Tone } from './kit';
import { useBill, BillAdjustments, DiscountForm, CashPay, RefundForm } from './BillTools';
import { PackageRedeem } from './session/PackageRedeem';
import { type Bank, TransferPanel } from './session/TransferPanel';
import { SplitPay } from './session/SplitPay';
import { generateK80Html, printK80Receipt, formatBillZaloText, sendBillToZalo } from '../../lib/thermal-receipt';

const STATUS_TONE: Record<string, Tone> = {
  booked: 'info',
  playing: 'ok',
  paused: 'warn',
  finished: 'warn',
  paid: 'ok',
  cancelled: 'muted',
};

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

  const [zaloNotice, setZaloNotice] = useState('');
  const roomName = rooms.find((r) => r.id === b.room)?.name ?? b.room;

  const handlePrint = () => {
    const html = generateK80Html({
      booking: b,
      quote: q,
      bill,
      roomName,
      food: food.data,
    });
    printK80Receipt(html);
  };

  const handleZalo = async () => {
    const text = formatBillZaloText({
      booking: b,
      quote: q,
      bill,
      roomName,
      food: food.data,
    });
    await sendBillToZalo({
      phone: b.phone,
      billText: text,
      onNotify: (msg) => {
        setZaloNotice(msg);
        setTimeout(() => setZaloNotice(''), 6000);
      },
    });
  };
  return (
    <ModalDialog label="Chi tiết phiên chơi" onClose={onClose} className="session">
      <DialogHeading onClose={onClose}>
        {rooms.find((r) => r.id === b.room)?.name}{' '}
        <StatusBadge tone={STATUS_TONE[b.status] ?? 'muted'}>{labels[b.status]}</StatusBadge>
      </DialogHeading>
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
              <button
                className="primary"
                disabled={busy}
                aria-label="Bắt đầu chơi"
                onClick={() => onAction('start')}
              >
                <Play size={17} />
                Bắt đầu
              </button>
              <button className="secondary" disabled={busy} onClick={() => onAction('cancel')}>
                <X size={16} />
                Hủy lịch
              </button>
            </>
          )}
          {b.status === 'paused' && (
            <button className="secondary" disabled={busy} onClick={() => onAction('resume')}>
              <Play size={16} />
              Tiếp tục
            </button>
          )}
          {['playing', 'paused'].includes(b.status) && (
            <button
              className="primary"
              disabled={busy}
              aria-label="Kết thúc chơi"
              onClick={() => onAction('finish')}
            >
              <Square size={17} />
              Kết thúc
            </button>
          )}
          {b.status === 'playing' && (
            <button
              aria-label="Tạm dừng do sự cố"
              className="secondary"
              disabled={busy}
              onClick={() => onAction('pause')}
            >
              <Pause size={16} />
              Tạm dừng
            </button>
          )}
        </div>
      )}
      {quoteError ? (
        <div className="info-strip" role="alert">
          {quoteError}. Có thể kết thúc phiên để ghi nhận thời gian; chưa thể thanh toán cho đến khi giá được xử lý.
        </div>
      ) : (
        <div className="bill">
          <h3 className="bill-screen-title">{b.status === 'paid' ? 'Phiếu thanh toán' : 'Tạm tính'}</h3>
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
        </div>
      )}
      {food.error && (
        <div className="info-strip" role="alert">
          {food.error}
        </div>
      )}
      {!foodVerified && (
        <div className="info-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Đang kiểm tra đơn món...</span>
          <button className="secondary" onClick={food.reload} style={{ height: 30, fontSize: 12 }}>
            Tải lại
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
          Còn {pendingFood} món chưa phục vụ.
        </div>
      )}
      {b.status === 'finished' && (
        <section className="sp-pay" aria-label="Thu tiền">
          <div className="sp-pay-head">
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Thu tiền</h3>
              <span style={{ fontSize: 12, color: 'var(--ds-muted)' }}>{rooms.find((r) => r.id === b.room)?.name}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small style={{ display: 'block', fontSize: 11, color: 'var(--ds-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Cần thu</small>
              <strong>{b.amount == null ? '—' : money(b.amount)}</strong>
            </div>
          </div>
          {!canPay ? (
            <div className="info-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Cần mở ca trước khi thu tiền.</span>
              <button className="secondary" onClick={onOpenShift} style={{ height: 32, fontSize: 13 }}>
                Mở ca
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
              <div className="pay-methods">
                <CashPay bookingId={b.id} disabled={cannotPay} onPay={() => payAs('cash')} />
                <button
                  className="primary"
                  disabled={cannotPay}
                  onClick={() => payAs('transfer')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <QrCode size={18} />
                  Chuyển khoản
                </button>
                <button
                  className="primary"
                  disabled={cannotPay}
                  onClick={() => payAs('card')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <CreditCard size={18} />
                  Quẹt thẻ
                </button>
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
                <button
                  type="button"
                  aria-label="In phiếu"
                  className="secondary"
                  disabled={!!quoteError || !foodVerified}
                  onClick={handlePrint}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, fontSize: 13 }}
                >
                  <Printer size={15} /> In phiếu
                </button>
                <button
                  type="button"
                  aria-label="Gửi Zalo"
                  className="secondary"
                  disabled={!!quoteError}
                  onClick={handleZalo}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, fontSize: 13 }}
                >
                  <MessageCircle size={15} /> Gửi Zalo
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {b.status === 'paid' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: 8, margin: '12px 0', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={18} color="#059669" />
            <div>
              <strong style={{ color: '#065f46', fontSize: 14 }}>Đã thanh toán</strong>
              <div style={{ fontSize: 12, color: '#047857' }}>
                {b.payment
                  ? `Hình thức: ${b.payment === 'cash' ? 'Tiền mặt' : b.payment === 'transfer' ? 'Chuyển khoản' : b.payment === 'card' ? 'Quẹt thẻ' : b.payment === 'wallet' ? 'Ví hội viên' : 'Gói hội viên'}`
                  : 'Đã hoàn tất'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="secondary"
              aria-label="Gửi Zalo"
              onClick={handleZalo}
              style={{ height: 32, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <MessageCircle size={14} /> Gửi Zalo
            </button>
            <button
              type="button"
              className="secondary"
              aria-label="In phiếu"
              onClick={handlePrint}
              style={{ height: 32, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Printer size={14} /> In phiếu
            </button>
          </div>
        </div>
      )}
      {zaloNotice && (
        <div
          role="status"
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            margin: '8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} color="#2563eb" />
          <span>{zaloNotice}</span>
        </div>
      )}
      {b.status === 'paid' && b.payment === 'package' && permissions.includes('billing.refund') && (
        <div className="info-strip" style={{ fontSize: 12.5 }}>
          Phiếu thanh toán bằng gói. Để hoàn giờ cho khách, vào mục Hội viên để điều chỉnh gói.
        </div>
      )}
      {b.status === 'paid' && bill && permissions.includes('billing.refund') && (
        <RefundForm bookingId={b.id} bill={bill} onDone={refreshAll} />
      )}
      {['playing', 'paused'].includes(b.status) && (
        <div className="support-actions">
          <h3>Hỗ trợ tại phòng</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['Nhân viên hỗ trợ', 'Gọi nhân viên'],
              ['Hỗ trợ thiết bị', 'Thiết bị'],
              ['Yêu cầu khác', 'Khác'],
            ].map(([kind, shortLabel]) => (
              <button
                disabled={busy}
                className="secondary"
                key={kind}
                aria-label={kind}
                onClick={() => onAction('support', { kind })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Bell size={15} />
                {shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
