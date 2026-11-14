'use client';
import { useFood, SessionOrdering } from './SessionFood';
import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  Bell,
  Check,
  CreditCard,
  Crown,
  Flag,
  MessageCircle,
  Monitor,
  Pause,
  Play,
  Plus,
  Printer,
  QrCode,
  Square,
  User,
  X,
} from 'lucide-react';
import { rooms, money, sessionQuote, type Booking, type Segment, type BillPart } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { changeDue } from '../../lib/billing';
import type { Bill, Service } from '../../lib/pricing';
import type { FoodLine } from '../../lib/fnb';
import { labels, time, date } from './shared';
import { useBill, DiscountForm, RefundForm } from './BillTools';
import { PackageRedeem } from './session/PackageRedeem';
import { type Bank, TransferPanel } from './session/TransferPanel';
import { SplitPay } from './session/SplitPay';
import { clock, playedMs } from './PosBoard';
import { generateK80Html, printK80Receipt, formatBillZaloText, sendBillToZalo } from '../../lib/thermal-receipt';

const SERVICE_LABEL: Record<string, string> = { gdr: 'Luyện tập theo giờ', '9': 'Game 9 hố', '18': 'Game 18 hố' };
const PAY_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Quẹt thẻ',
  wallet: 'Ví hội viên',
  package: 'Gói hội viên',
};
type Method = 'cash' | 'transfer' | 'card';
type Tab = 'items' | 'package' | 'other';

/** The POS panel: docked on the right of the board, one session at a time. */
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
  const servedOrders = food.data?.orders.filter((o) => o.status === 'served') ?? [];
  const servedFood = servedOrders.reduce((sum, o) => sum + o.total, 0);
  const foodVerified = !!food.data && !food.error && servedFood === (b.food_total ?? 0);
  const paymentKey = useRef(operationKey());
  const { bill, reload: reloadBill } = useBill(b.id, b.status);
  const refreshAll = async () => {
    await onRefresh();
    await reloadBill();
  };
  const [tab, setTab] = useState<Tab>('items');
  const [method, setMethod] = useState<Method>('cash');
  const [adding, setAdding] = useState(false);
  const [tendered, setTendered] = useState('');
  const [due, setDue] = useState<number | null>(null);
  const [zaloNotice, setZaloNotice] = useState('');
  const [tick, setTick] = useState(() => Date.now());
  const asideRef = useRef<HTMLElement>(null);

  // Running timer, and Escape closes the panel unless a dialog above it is open.
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      if (document.querySelector('dialog[open]')) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  useEffect(() => {
    asideRef.current?.focus();
  }, []);

  const finished = b.status === 'finished';
  const isCash = finished && canPay && method === 'cash';
  useEffect(() => {
    if (!isCash) return;
    let live = true;
    fetch('/api/bank?booking=' + encodeURIComponent(b.id), { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ due: number | null }>) : null))
      .then((v) => live && setDue(v?.due ?? null));
    return () => {
      live = false;
    };
  }, [isCash, b.id, b.amount]);

  const snap = JSON.parse(b.price);
  const seg: Segment[] = JSON.parse(b.segments);
  if (b.status === 'playing' && b.started) seg.push({ start: b.started, end: now });
  let q: Bill & { parts?: BillPart[] } = { lines: [], subtotal: 0, fee: 0, vat: 0, total: 0 },
    quoteError = '';
  try {
    q =
      b.status === 'booked' && snap.estimated
        ? snap.estimated
        : sessionQuote(b.service as Service, seg, snap);
  } catch (e) {
    quoteError = e instanceof Error ? e.message : 'Chưa tính được tiền';
  }
  const cannotPay = busy || b.amount == null || !!quoteError || !foodVerified || pendingFood > 0;
  const payAs = (m: string) =>
    onAction('pay', { method: m, requestId: paymentKey.current, expectedAmount: b.amount! });
  const operating = ['booked', 'playing', 'paused'].includes(b.status);
  const room = rooms.find((r) => r.id === b.room);
  const roomName = room?.name ?? b.room;

  const handlePrint = () =>
    printK80Receipt(generateK80Html({ booking: b, quote: q, bill, roomName, food: food.data }));
  const handleZalo = async () => {
    const text = formatBillZaloText({ booking: b, quote: q, bill, roomName, food: food.data });
    await sendBillToZalo({
      phone: b.phone,
      billText: text,
      onNotify: (msg) => {
        setZaloNotice(msg);
        setTimeout(() => setZaloNotice(''), 6000);
      },
    });
  };

  // Items: the session itself, then every served food/drink line.
  const foodLines = servedOrders.flatMap((o) =>
    (JSON.parse(o.items) as FoodLine[]).map((l, i) => ({ key: o.id + '-' + i, line: l })),
  );
  const foodSum = servedOrders.reduce(
    (s, o) => ({ subtotal: s.subtotal + o.subtotal, fee: s.fee + o.fee, vat: s.vat + o.vat }),
    { subtotal: 0, fee: 0, vat: 0 },
  );
  const subtotal = q.subtotal + foodSum.subtotal;
  const fee = q.fee + foodSum.fee;
  const vat = q.vat + foodSum.vat;
  const total = b.amount ?? q.total + (b.food_total ?? 0);
  const hours = (min: number) => `${+(min / 60).toFixed(2)} giờ`.replace('.', ',');

  const given = tendered === '' ? (due ?? 0) : Number(tendered);
  const enough = due != null && given >= due;
  const canConfirm =
    finished &&
    canPay &&
    !cannotPay &&
    (method === 'cash' ? enough : true);
  const confirmPay = () => {
    if (!canConfirm) return;
    return payAs(method);
  };

  const statusLabel = labels[b.status] ?? b.status;
  const stateTone =
    b.status === 'playing' ? 'on' : b.status === 'paused' || finished ? 'warn' : b.status === 'paid' ? 'on' : 'idle';
  const played = playedMs(b, tick);
  const startedAt = b.started ?? b.start;

  return (
    <aside
      ref={asideRef}
      tabIndex={-1}
      className="pos-dock"
      role="dialog"
      aria-modal="false"
      aria-label="Chi tiết phiên chơi"
    >
      <header className="pos-dock-head">
        <Monitor size={26} strokeWidth={1.8} />
        <h2>POS – {roomName}</h2>
        <button type="button" className="pos-dock-close" aria-label="Đóng" onClick={onClose}>
          <X size={22} />
        </button>
      </header>

      <div className="pos-dock-body">
        <div className="pos-status">
          <span className={'pos-chip ' + stateTone}>
            <i />
            {b.status === 'playing' ? 'Đang sử dụng' : statusLabel}
          </span>
          <span>
            {b.started ? 'Bắt đầu' : 'Lịch hẹn'}: <b>{time(startedAt)}</b>
            {b.started ? '' : ` · ${date(b.start)}`}
          </span>
          {b.started ? (
            <span>
              Thời gian: <b className="pos-clock">{clock(played)}</b>
            </span>
          ) : null}
        </div>

        <div className="pos-customer">
          <span className="pos-cust-ic">{room?.vip ? <Crown size={22} /> : <User size={22} />}</span>
          <div>
            <strong>{b.customer}</strong>
            <small>
              {b.phone ? b.phone + ' | ' : ''}
              {b.people} người · {SERVICE_LABEL[b.service] ?? b.service}
            </small>
          </div>
        </div>

        {operating && (
          <div className="pos-service" role="radiogroup" aria-label="Hình thức chơi">
            {(
              [
                ['gdr', 'Tập theo giờ'],
                ['9', 'Game 9 hố'],
                ['18', 'Game 18 hố'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={b.service === value}
                className={b.service === value ? 'on' : ''}
                disabled={busy || b.service === value}
                onClick={() => onAction('switch-service', { service: value })}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="pos-tabs pos-dock-tabs" role="tablist" aria-label="Nhóm thao tác">
          {(
            [
              ['items', 'Dịch vụ / Sản phẩm'],
              ['package', 'Gói giờ & thẻ'],
              ['other', 'Khác'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'on' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <section aria-label="Hàng hóa và dịch vụ">
            {quoteError ? (
              <div className="pos-note warn" role="alert">
                {quoteError}. Có thể kết thúc phiên để ghi nhận thời gian; chưa thể thanh toán cho đến khi giá được xử lý.
              </div>
            ) : (
              <table className="pos-items">
                <thead>
                  <tr>
                    <th>Tên hàng / Dịch vụ</th>
                    <th>SL</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {q.lines.map((l, i) => (
                    <tr key={'g' + i}>
                      <td>
                        <span className="pos-item-ic">
                          <Flag size={18} />
                        </span>
                        <span>
                          {l.label}
                          {!l.package && l.from != null && l.to != null && (
                            <small>
                              {time(l.from)} – {time(l.to)}
                            </small>
                          )}
                        </span>
                      </td>
                      <td>{l.package ? '1' : hours(l.minutes)}</td>
                      <td>{l.package ? '—' : money(l.rate)}</td>
                      <td>{money(Math.round(l.amount))}</td>
                    </tr>
                  ))}
                  {foodLines.map(({ key, line: l }) => (
                    <tr key={key}>
                      <td>
                        <span className="pos-item-ic food">
                          <Bell size={18} />
                        </span>
                        <span>{l.name}</span>
                      </td>
                      <td>
                        {l.qty} {l.unit}
                      </td>
                      <td>{money(l.price)}</td>
                      <td>{money(l.total)}</td>
                    </tr>
                  ))}
                  {!q.lines.length && q.subtotal > 0 && (
                    <tr>
                      <td>
                        <span className="pos-item-ic">
                          <Flag size={18} />
                        </span>
                        <span>{b.service === 'gdr' ? 'Tiền dịch vụ' : `Trọn lượt ${b.service} hố`}</span>
                      </td>
                      <td>1</td>
                      <td>{money(q.subtotal)}</td>
                      <td>{money(q.subtotal)}</td>
                    </tr>
                  )}
                  {!q.lines.length && q.subtotal === 0 && !foodLines.length && (
                    <tr>
                      <td colSpan={4} className="pos-items-empty">
                        Chưa có khoản nào trên phiếu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {food.error && (
              <div className="pos-note warn" role="alert">
                {food.error}
              </div>
            )}
            {!foodVerified && !food.error && (
              <div className="pos-note">
                Đang kiểm tra đơn món…
                <button type="button" onClick={food.reload}>
                  Tải lại
                </button>
              </div>
            )}
            {pendingFood > 0 && <div className="pos-note">Còn {pendingFood} món chưa phục vụ, chưa tính vào phiếu.</div>}
            {food.data && (
              <>
                <button
                  type="button"
                  className="pos-add"
                  aria-expanded={adding}
                  onClick={() => setAdding(!adding)}
                >
                  <Plus size={20} /> Thêm sản phẩm / dịch vụ
                </button>
                {adding && (
                  <div className="pos-order">
                    <SessionOrdering
                      booking={b}
                      data={food.data}
                      onRefresh={async () => {
                        await food.reload();
                        await onRefresh();
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {tab === 'package' && (
          <section aria-label="Gói giờ và thẻ hội viên">
            {finished && canPay ? (
              <PackageRedeem booking={b} money={money} onChanged={refreshAll} />
            ) : (
              <p className="pos-note">
                {finished
                  ? 'Cần mở ca trước khi dùng gói hoặc ví hội viên.'
                  : 'Gói giờ và ví hội viên dùng được khi phiên đã kết thúc và chờ thanh toán.'}
              </p>
            )}
          </section>
        )}

        {tab === 'other' && (
          <section aria-label="Tác vụ khác" className="pos-other">
            {finished &&
              canPay &&
              permissions.includes('billing.discount') &&
              bill &&
              !bill.discount &&
              !bill.payments.length &&
              b.amount != null &&
              !quoteError && <DiscountForm bookingId={b.id} amount={b.amount} onDone={refreshAll} />}
            {finished && canPay && <SplitPay booking={b} onChanged={refreshAll} disabled={cannotPay} />}
            {(finished || b.status === 'paid') && (
              <button type="button" className="pos-ghost" aria-label="Gửi Zalo" disabled={!!quoteError} onClick={handleZalo}>
                <MessageCircle size={17} /> Gửi Zalo
              </button>
            )}
            {['playing', 'paused'].includes(b.status) && (
              <div className="pos-support">
                <h3>Hỗ trợ tại phòng</h3>
                <div>
                  {[
                    ['Nhân viên hỗ trợ', 'Gọi nhân viên'],
                    ['Hỗ trợ thiết bị', 'Thiết bị'],
                    ['Yêu cầu khác', 'Khác'],
                  ].map(([kind, shortLabel]) => (
                    <button
                      key={kind}
                      type="button"
                      className="pos-ghost"
                      disabled={busy}
                      aria-label={kind}
                      onClick={() => onAction('support', { kind })}
                    >
                      <Bell size={16} />
                      {shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {b.status === 'paid' && b.payment === 'package' && permissions.includes('billing.refund') && (
              <p className="pos-note">
                Phiếu thanh toán bằng gói. Để hoàn giờ cho khách, vào mục Khách hàng để điều chỉnh gói.
              </p>
            )}
            {b.status === 'paid' && bill && permissions.includes('billing.refund') && (
              <RefundForm bookingId={b.id} bill={bill} onDone={refreshAll} />
            )}
            {!finished && b.status !== 'paid' && !['playing', 'paused'].includes(b.status) && (
              <p className="pos-note">Chưa có thao tác khác cho phiên này.</p>
            )}
          </section>
        )}

        {/* Totals */}
        {!quoteError && (
          <dl className="pos-totals">
            <div>
              <dt>Tạm tính</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            {fee > 0 && (
              <div>
                <dt>
                  Phí dịch vụ (
                  {snap.config?.feeMode === 'fixed' ? money(snap.config.fee ?? 0) : `${snap.config?.fee ?? 0}%`})
                </dt>
                <dd>{money(fee)}</dd>
              </div>
            )}
            {vat > 0 && (
              <div>
                <dt>Thuế VAT ({snap.config?.vat ?? 0}%)</dt>
                <dd>{money(vat)}</dd>
              </div>
            )}
            {bill?.discount && (
              <div>
                <dt>
                  Giảm giá <small>{bill.discount.reason}</small>
                </dt>
                <dd>−{money(bill.discount.amount)}</dd>
              </div>
            )}
            {bill?.refunds.map((r) => (
              <div key={r.id}>
                <dt>
                  Đã hoàn ({PAY_LABEL[r.method] ?? r.method}) <small>{r.note}</small>
                </dt>
                <dd>−{money(r.amount)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="pos-total" aria-live="polite">
          <span>Tổng thanh toán</span>
          <strong>{money(total)}</strong>
        </div>

        {/* Payment */}
        {finished && (
          <section className="pos-pay" aria-label="Thu tiền">
            {!canPay ? (
              <div className="pos-note warn">
                Cần mở ca trước khi thu tiền.
                <button type="button" onClick={onOpenShift}>
                  Mở ca
                </button>
              </div>
            ) : (
              <>
                <div className="pos-methods" role="group" aria-label="Hình thức thanh toán">
                  {(
                    [
                      ['cash', 'Tiền mặt', Banknote],
                      ['card', 'Quẹt thẻ', CreditCard],
                      ['transfer', 'Chuyển khoản', QrCode],
                    ] as const
                  ).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={method === key}
                      className={method === key ? 'on' : ''}
                      onClick={() => setMethod(key)}
                    >
                      <Icon size={24} strokeWidth={1.8} />
                      {label}
                    </button>
                  ))}
                  <button type="button" className={tab === 'other' ? 'on' : ''} onClick={() => setTab('other')}>
                    <Plus size={24} strokeWidth={1.8} />
                    Khác
                  </button>
                </div>
                {method === 'cash' && (
                  <div className="pos-cash">
                    <label>
                      <span>Khách đưa (đồng)</span>
                      <input
                        inputMode="numeric"
                        placeholder={due != null ? String(due) : ''}
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value.replace(/\D/g, ''))}
                      />
                    </label>
                    <div className="pos-quick">
                      {[100_000, 200_000, 500_000].map((n) => (
                        <button key={n} type="button" onClick={() => setTendered(String(n))}>
                          {n / 1000}k
                        </button>
                      ))}
                      <button type="button" onClick={() => setTendered(due != null ? String(due) : '')}>
                        Vừa đủ
                      </button>
                    </div>
                    {due != null && (
                      <p role="status" className={enough ? 'ok' : 'short'}>
                        {enough ? (
                          <>
                            Tiền thối: <strong>{money(changeDue(given, due))}</strong>
                          </>
                        ) : (
                          <>
                            Còn thiếu: <strong>{money(due - given)}</strong>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
                {method === 'transfer' && (
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
                )}
                {method === 'card' && <p className="pos-note">Quẹt thẻ ở máy POS, rồi bấm Thanh toán để ghi nhận.</p>}
              </>
            )}
          </section>
        )}

        {b.status === 'paid' && (
          <div className="pos-paid" role="status">
            <Check size={22} />
            <div>
              <strong>Đã thanh toán</strong>
              <small>{b.payment ? `Hình thức: ${PAY_LABEL[b.payment] ?? b.payment}` : 'Đã hoàn tất'}</small>
            </div>
          </div>
        )}
        {zaloNotice && (
          <div className="pos-note" role="status">
            <Check size={16} /> {zaloNotice}
          </div>
        )}
      </div>

      <div className="pos-dock-foot" role="group" aria-label="Thao tác chính">
        {b.status === 'booked' && (
          <>
            <button type="button" className="pos-ghost" disabled={busy} onClick={() => onAction('cancel')}>
              <X size={18} /> Hủy lịch
            </button>
            {date(now) !== date(b.start) && now < b.start - 15 * 60000 ? (
              <span className="pos-foot-note">Lịch đặt ngày {date(b.start)} (chỉ bắt đầu trong ngày hẹn)</span>
            ) : (
              <button
                type="button"
                className="pos-main-btn"
                disabled={busy}
                aria-label="Bắt đầu chơi"
                onClick={() => onAction('start')}
              >
                <Play size={20} /> Bắt đầu
              </button>
            )}
          </>
        )}
        {b.status === 'playing' && (
          <>
            <button
              type="button"
              className="pos-ghost"
              aria-label="Tạm dừng do sự cố"
              disabled={busy}
              onClick={() => onAction('pause')}
            >
              <Pause size={18} /> Tạm dừng
            </button>
            <button
              type="button"
              className="pos-main-btn"
              aria-label="Kết thúc chơi"
              disabled={busy}
              onClick={() => onAction('finish')}
            >
              <Square size={18} /> Kết thúc &amp; tính tiền
            </button>
          </>
        )}
        {b.status === 'paused' && (
          <>
            <button type="button" className="pos-ghost" disabled={busy} onClick={() => onAction('resume')}>
              <Play size={18} /> Tiếp tục
            </button>
            <button
              type="button"
              className="pos-main-btn"
              aria-label="Kết thúc chơi"
              disabled={busy}
              onClick={() => onAction('finish')}
            >
              <Square size={18} /> Kết thúc &amp; tính tiền
            </button>
          </>
        )}
        {finished && (
          <>
            <button
              type="button"
              className="pos-ghost"
              aria-label="In phiếu"
              disabled={!!quoteError || !foodVerified}
              onClick={handlePrint}
            >
              <Printer size={20} /> In tạm tính
            </button>
            {canPay ? (
              <button
                type="button"
                className="pos-main-btn"
                aria-label={method === 'cash' ? 'Đã nhận đủ tiền mặt' : 'Thanh toán'}
                disabled={!canConfirm}
                onClick={confirmPay}
              >
                <Check size={22} /> Thanh toán
              </button>
            ) : (
              <button type="button" className="pos-main-btn" onClick={onOpenShift}>
                Mở ca để thu tiền
              </button>
            )}
          </>
        )}
        {b.status === 'paid' && (
          <button type="button" className="pos-main-btn" aria-label="In phiếu" onClick={handlePrint}>
            <Printer size={20} /> In phiếu
          </button>
        )}
      </div>
    </aside>
  );
}
