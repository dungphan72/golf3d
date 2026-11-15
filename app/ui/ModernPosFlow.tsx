'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Crown,
  Flag,
  Printer,
  Send,
  SlidersHorizontal,
  User,
  Wallet,
  Wrench,
  X,
  Landmark,
} from 'lucide-react';
import { rooms, money, sessionQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import type { Bill, Service } from '../../lib/pricing';
import type { FoodLine } from '../../lib/fnb';
import type { Data } from './shared';
import { time } from './shared';
import { roomInfo } from './widgets';
import { playedMs, clock } from './PosBoard';
import { useFood, SessionOrdering } from './SessionFood';
import { useBill } from './BillTools';
import { TransferPanel } from './session/TransferPanel';
import {
  generateK80Html,
  printK80Receipt,
  formatBillZaloText,
  sendBillToZalo,
} from '../../lib/thermal-receipt';
import '../pos-flow.css';

type Step = 'map' | 'order' | 'pay' | 'done';
type PayMethod = 'cash' | 'card' | 'transfer';
const PAY_LABEL: Record<PayMethod, string> = {
  cash: 'Tiền mặt',
  card: 'Thẻ ngân hàng',
  transfer: 'Chuyển khoản / QR',
};
const SERVICE_LABEL: Record<string, string> = {
  gdr: 'Luyện tập theo giờ',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};

/**
 * POS flow (reference: "Luồng POS Saigon Indoor Golf Club.png"):
 * 1 line map -> 2 sale (session + real F&B menu) -> 3 payment -> 4 done.
 * Every number comes from the server: session quote, kitchen-served food, the
 * booking amount and the shift ledger payment. Nothing is invented client-side.
 */
export function ModernPosFlow({
  data,
  onMutate,
  onRefresh,
  onOpenSession,
}: {
  data: Data;
  now?: number;
  canSeeMoney?: boolean;
  onGo?: (v: string) => void;
  onMutate: (body: Record<string, unknown>) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onOpenSession?: (b: Booking) => void;
}) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [step, setStep] = useState<Step>('map');
  const [filterTab, setFilterTab] = useState<'all' | 'playing' | 'booked' | 'empty' | 'maintenance'>(
    'all',
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [paid, setPaid] = useState<{ total: number; method: string; at: number } | null>(null);
  const [walkInModal, setWalkInModal] = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const payKey = useRef(operationKey());

  const b: Booking | null = useMemo(
    () => (activeId ? (data.bookings.find((x) => x.id === activeId) ?? null) : null),
    [data.bookings, activeId],
  );
  const food = useFood(b?.id);
  const { bill } = useBill(b?.id ?? '', b?.status ?? '');

  const roomStatuses = useMemo(
    () =>
      rooms.map((r) => {
        const info = roomInfo(r.id, data.bookings, tick);
        const maint = data.maintenance?.find((m) => m.room === r.id) ?? null;
        const state: 'playing' | 'booked' | 'maintenance' | 'empty' = maint
          ? 'maintenance'
          : info.state === 'occupied' || info.state === 'due' || info.state === 'clean'
            ? 'playing'
            : info.state === 'soon'
              ? 'booked'
              : 'empty';
        return { room: r, info, state, maint };
      }),
    [data.bookings, data.maintenance, tick],
  );
  const counts = useMemo(() => {
    const c = { all: rooms.length, playing: 0, booked: 0, empty: 0, maintenance: 0 };
    for (const r of roomStatuses) c[r.state]++;
    return c;
  }, [roomStatuses]);
  const visibleRooms = roomStatuses.filter(({ state }) => filterTab === 'all' || state === filterTab);
  const room = b ? rooms.find((r) => r.id === b.room) : undefined;
  const roomShort = (room?.name ?? b?.room ?? '').replace('Line ', 'L');

  // Session quote (the golf time) plus kitchen-served food, as the server will bill it.
  let q: Bill = { lines: [], subtotal: 0, fee: 0, vat: 0, total: 0 };
  let quoteError = '';
  if (b) {
    try {
      const snap = JSON.parse(b.price);
      const seg: Segment[] = JSON.parse(b.segments);
      if (b.status === 'playing' && b.started) seg.push({ start: b.started, end: tick });
      q =
        b.status === 'booked' && snap.estimated
          ? snap.estimated
          : sessionQuote(b.service as Service, seg, snap);
    } catch (e) {
      quoteError = e instanceof Error ? e.message : 'Chưa tính được tiền';
    }
  }
  const orders = food.data?.orders ?? [];
  const servedOrders = orders.filter((o) => o.status === 'served');
  const pendingFood = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length;
  const servedFood = servedOrders.reduce((s, o) => s + o.total, 0);
  const foodVerified = !!food.data && !food.error && servedFood === (b?.food_total ?? 0);
  const foodLines = servedOrders.flatMap((o) =>
    (JSON.parse(o.items) as FoodLine[]).map((l, i) => ({ key: o.id + '-' + i, line: l })),
  );
  const estimate = q.total + servedFood;
  const total = b?.amount ?? estimate;
  const finished = b?.status === 'finished';
  const operating = !!b && ['booked', 'playing', 'paused'].includes(b.status);
  const canPayNow =
    !!b && finished && b.amount != null && !quoteError && foodVerified && pendingFood === 0;
  const cashIn = Number(tendered.replace(/\D/g, '')) || 0;
  const change = Math.max(0, cashIn - total);
  const quickCash = useMemo(() => {
    const up = (n: number) => Math.ceil(total / n) * n;
    return [...new Set([total, up(100000), up(500000)])].filter((n) => n > 0).slice(0, 3);
  }, [total]);

  // ---------------------------------------------------------------------------
  // Actions (all go to the server; the screen only reflects what comes back)
  // ---------------------------------------------------------------------------
  function open(id: string, to: Step) {
    payKey.current = operationKey();
    setActiveId(id);
    setTendered('');
    setNotice('');
    setPaid(null);
    setPayMethod('cash');
    setStep(to);
  }
  function handleSelectRoom(roomId: string) {
    const rs = roomStatuses.find((x) => x.room.id === roomId);
    if (!rs) return;
    if (rs.maint) {
      setNotice(`${rs.room.name} đang bảo trì${rs.maint.reason ? ': ' + rs.maint.reason : ''}.`);
      return;
    }
    const target = rs.info.live ?? rs.info.due ?? rs.info.soon ?? null;
    if (target) open(target.id, target.status === 'finished' ? 'pay' : 'order');
    else setWalkInModal(roomId);
  }
  async function handleQuickStartWalkIn() {
    if (!walkInModal || saving) return;
    setSaving(true);
    try {
      const ok = await onMutate({
        action: 'walkin',
        room: walkInModal,
        customer: walkInName.trim() || 'Khách vãng lai',
        phone: walkInPhone.trim(),
        people: 1,
        duration: 60,
      });
      if (ok) {
        const roomId = walkInModal;
        setWalkInModal(null);
        setWalkInName('');
        setWalkInPhone('');
        setAwaitRoom(roomId);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }
  // After "vào chơi ngay" the new booking arrives with the next data refresh.
  const [awaitRoom, setAwaitRoom] = useState<string | null>(null);
  useEffect(() => {
    if (!awaitRoom) return;
    const created = data.bookings.find((x) => x.room === awaitRoom && x.status === 'playing');
    if (created) {
      /* eslint-disable react-hooks/set-state-in-effect -- open the session once the refreshed data contains it */
      setAwaitRoom(null);
      open(created.id, 'order');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [awaitRoom, data.bookings]);
  async function handleStart() {
    if (!b || saving) return;
    setSaving(true);
    try {
      await onMutate({ action: 'start', id: b.id });
    } finally {
      setSaving(false);
    }
  }
  async function handleExtend(minutes: number) {
    if (!b || saving) return;
    setSaving(true);
    try {
      await onMutate({ action: 'extend', id: b.id, minutes });
      setExtendModal(false);
    } finally {
      setSaving(false);
    }
  }
  /** "Thanh toán (F9)": stop the clock if still playing, then go to payment. */
  async function handleCheckout() {
    if (!b || saving) return;
    if (finished) {
      setStep('pay');
      return;
    }
    if (b.status === 'booked') {
      setNotice('Hãy bấm "Bắt đầu" trước khi thanh toán.');
      return;
    }
    setSaving(true);
    try {
      if (await onMutate({ action: 'finish', id: b.id })) setStep('pay');
    } finally {
      setSaving(false);
    }
  }
  async function pay(extra: Record<string, unknown> = {}, method: PayMethod = payMethod) {
    if (!b || b.amount == null || !canPayNow || saving) return;
    if (method === 'cash' && cashIn > 0 && cashIn < b.amount) {
      setNotice('Tiền khách đưa chưa đủ.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const ok = await onMutate({
        action: 'pay',
        id: b.id,
        method,
        requestId: payKey.current,
        expectedAmount: b.amount,
        ...extra,
      });
      if (ok) {
        setPaid({ total: b.amount, method: PAY_LABEL[method], at: Date.now() });
        setStep('done');
        if (printReceipt) printNow();
      }
    } finally {
      setSaving(false);
    }
  }
  const quoteForPrint = () => q;
  function printNow() {
    if (!b) return;
    printK80Receipt(
      generateK80Html({
        booking: b,
        quote: quoteForPrint(),
        bill,
        roomName: room?.name ?? b.room,
        food: food.data,
      }),
    );
  }
  async function sendZalo() {
    if (!b) return;
    await sendBillToZalo({
      phone: b.phone,
      billText: formatBillZaloText({
        booking: b,
        quote: q,
        bill,
        roomName: room?.name ?? b.room,
        food: food.data,
      }),
      onNotify: (msg) => setNotice(msg),
    });
  }

  // F9 = checkout from the sale screen.
  useEffect(() => {
    if (step !== 'order') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        void handleCheckout();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, b?.id, b?.status, saving]);

  // If the booking disappears (cancelled elsewhere), show the map again.
  const cur: Step = step !== 'map' && !b ? 'map' : step;

  // ---------------------------------------------------------------------------
  // STEP 1 — line / room map
  // ---------------------------------------------------------------------------
  if (cur === 'map') {
    const todayStr = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return (
      <div className="pos-flow-container">
        {/* Top bar */}
        <div className="pos-map-topbar">
          <div className="pos-map-heading">
            <h1>POS – Sơ đồ line/phòng</h1>
          </div>
          <div className="pos-date-badge">
            <CalendarDays />
            <span>Hôm nay, {todayStr}</span>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="pos-status-filters" role="tablist">
          {[
            { key: 'all', label: `Tất cả (${counts.all})` },
            { key: 'playing', label: `Đang chơi (${counts.playing})` },
            { key: 'booked', label: `Đặt trước (${counts.booked})` },
            { key: 'empty', label: `Trống (${counts.empty})` },
            { key: 'maintenance', label: `Bảo trì (${counts.maintenance})` },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`pos-filter-btn ${filterTab === f.key ? 'active' : ''}`}
              onClick={() => setFilterTab(f.key as typeof filterTab)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 12 Line Cards Grid */}
        <div className="pos-lines-grid">
          {visibleRooms.map(({ room, info, state, maint }) => {
            const isPlaying = state === 'playing';
            const isBooked = state === 'booked';
            const isMaint = state === 'maintenance';

            const shown = info.live ?? info.due ?? null;
            const elapsedMinutes = info.live ? Math.floor(playedMs(info.live, tick) / 60000) : null;

            return (
              <button
                key={room.id}
                type="button"
                className="pos-line-card"
                onClick={() => handleSelectRoom(room.id)}
              >
                <div className="pos-line-card-header">
                  <div className="pos-line-name-wrap">
                    <div
                      className="pos-line-icon"
                      style={{
                        background: isPlaying
                          ? '#f0fdf4'
                          : isBooked
                            ? '#fefce8'
                            : isMaint
                              ? '#fef2f2'
                              : '#f8fafc',
                        color: isPlaying
                          ? '#16a34a'
                          : isBooked
                            ? '#ca8a04'
                            : isMaint
                              ? '#ef4444'
                              : '#94a3b8',
                      }}
                    >
                      {isMaint ? (
                        <Wrench size={20} />
                      ) : room.vip ? (
                        <Crown size={22} className="pos-crown-icon" />
                      ) : (
                        <Flag size={20} />
                      )}
                    </div>
                    <span className="pos-line-name">
                      {room.name.replace('Line ', 'L')}
                      {room.vip && <Crown size={16} className="pos-crown-icon" />}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`pos-status-tag ${
                      isPlaying
                        ? 'pos-state-playing'
                        : isBooked
                          ? 'pos-state-booked'
                          : isMaint
                            ? 'pos-state-maintenance'
                            : 'pos-state-empty'
                    }`}
                  >
                    <span className="pos-status-dot" />
                    {isPlaying
                      ? 'Đang chơi'
                      : isBooked
                        ? 'Đặt trước'
                        : isMaint
                          ? 'Bảo trì'
                          : 'Trống'}
                  </span>
                </div>

                <div className="pos-line-card-body">
                  {isPlaying ? (
                    <div className="pos-line-timer">
                      <Clock size={15} />
                      <span>
                        {elapsedMinutes != null
                          ? `${elapsedMinutes} phút`
                          : 'Chờ thanh toán'}
                      </span>
                    </div>
                  ) : isBooked ? (
                    <span className="pos-line-note">
                      {info.soon ? `${time(info.soon.start)} - ${time(info.soon.end)}` : ''}
                    </span>
                  ) : isMaint ? (
                    <span className="pos-line-note" style={{ color: '#ef4444' }}>
                      {maint?.reason || 'Đang bảo trì'}
                    </span>
                  ) : (
                    <span className="pos-line-note">Sẵn sàng</span>
                  )}

                  {shown?.customer && (
                    <span className="pos-line-customer">{shown.customer}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Walk-In Dialog */}
        {walkInModal && (
          <div className="ar-settings-modal-backdrop" onClick={() => setWalkInModal(null)}>
            <div
              className="ar-settings-modal"
              style={{ maxWidth: '420px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-left">
                  <Flag size={20} color="#16a34a" />
                  <h3 className="ar-modal-header-title">Vào chơi ngay – {rooms.find((r) => r.id === walkInModal)?.name}</h3>
                </div>
                <button className="ar-modal-close-btn" onClick={() => setWalkInModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="ar-modal-body">
                <div className="ar-field">
                  <label>Tên khách hàng</label>
                  <input
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="ar-field">
                  <label>Số điện thoại</label>
                  <input
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="0901234567"
                  />
                </div>
              </div>
              <div className="ar-modal-footer">
                <button
                  type="button"
                  className="ar-btn-secondary"
                  onClick={() => setWalkInModal(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="ar-btn-primary"
                  onClick={handleQuickStartWalkIn}
                >
                  Bắt đầu & Bán hàng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 2 — sale: session, customer, real bill, real F&B menu
  // ---------------------------------------------------------------------------
  if (cur === 'order' && b) {
    const elapsed = b.started || b.status === 'paused' ? playedMs(b, tick) : 0;
    const hours = (min: number) => `${+(min / 60).toFixed(2)} giờ`.replace('.', ',');
    const statusTag =
      b.status === 'playing'
        ? ['pos-state-playing', 'Đang chơi']
        : b.status === 'paused'
          ? ['pos-state-booked', 'Tạm dừng']
          : b.status === 'booked'
            ? ['pos-state-booked', 'Đặt trước']
            : ['pos-state-empty', 'Chờ thanh toán'];
    return (
      <div className="pos-flow-container">
        <div className="pos-order-screen">
          <div className="pos-order-topbar">
            <div className="pos-order-topbar-left">
              <button
                type="button"
                className="pos-back-btn"
                onClick={() => setStep('map')}
                aria-label="Quay lại sơ đồ line"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="pos-order-title">
                Bán hàng – {roomShort}
                <span className={`pos-status-tag ${statusTag[0]}`}>{statusTag[1]}</span>
              </h2>
            </div>
          </div>
          {notice && (
            <div className="error-box" role="status">
              {notice}
            </div>
          )}

          <div className="pos-order-grid">
            <div className="pos-order-left">
              <div className="pos-timer-box">
                <span className="pos-timer-label">Thời gian chơi</span>
                <span className="pos-timer-clock">{clock(elapsed)}</span>
                <div className="pos-timer-sub">
                  <span>Bắt đầu: {time(b.started ?? b.start)}</span>
                  <span>|</span>
                  <span>Dự kiến: {time(b.end)}</span>
                </div>
                <div className="pos-timer-actions">
                  {b.status === 'booked' ? (
                    <button
                      type="button"
                      className="pos-btn-extend"
                      onClick={handleStart}
                      disabled={saving}
                    >
                      Bắt đầu
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pos-btn-extend"
                      onClick={() => setExtendModal(true)}
                      disabled={saving || !operating || b.service !== 'gdr'}
                      title={b.service !== 'gdr' ? 'Chỉ gia hạn lượt luyện tập theo giờ' : undefined}
                    >
                      + Gia hạn
                    </button>
                  )}
                  <button
                    type="button"
                    className="pos-btn-end"
                    onClick={handleCheckout}
                    disabled={saving || b.status === 'booked'}
                  >
                    Kết thúc
                  </button>
                </div>
              </div>

              <div className="pos-customer-card">
                <div className="pos-customer-info">
                  <div className="pos-customer-avatar">
                    {(b.customer || '?').slice(0, 1).toUpperCase() || <User size={16} />}
                  </div>
                  <div className="pos-customer-meta">
                    <strong>{b.customer || 'Khách vãng lai'}</strong>
                    <small>{b.phone || 'Chưa có số điện thoại'}</small>
                  </div>
                </div>
              </div>

              <div className="pos-bill-card">
                <h3 className="pos-bill-title">Dịch vụ sử dụng</h3>
                <div className="pos-bill-items">
                  {quoteError ? (
                    <div className="pos-bill-row">
                      <span className="pos-bill-item-name">{quoteError}</span>
                    </div>
                  ) : (
                    q.lines.map((l, i) => (
                      <div key={i} className="pos-bill-row">
                        <span className="pos-bill-item-name">
                          {SERVICE_LABEL[b.service] ?? 'Chơi golf'}
                          {l.label ? ` · ${l.label}` : ''}
                        </span>
                        <span className="pos-bill-item-qty">{hours(l.minutes)}</span>
                        <span className="pos-bill-item-price">{money(l.amount)}</span>
                      </div>
                    ))
                  )}
                  {foodLines.map(({ key, line }) => (
                    <div key={key} className="pos-bill-row">
                      <span className="pos-bill-item-name">{line.name}</span>
                      <span className="pos-bill-item-qty">x{line.qty}</span>
                      <span className="pos-bill-item-price">{money(line.total)}</span>
                    </div>
                  ))}
                  {pendingFood > 0 && (
                    <div className="pos-bill-row">
                      <span className="pos-bill-item-name">
                        {pendingFood} đơn món đang chuẩn bị – chỉ tính tiền khi đã phục vụ
                      </span>
                    </div>
                  )}
                </div>

                <div className="pos-bill-summary">
                  <div className="pos-summary-line">
                    <span>Tạm tính</span>
                    <span>{money(estimate)}</span>
                  </div>
                  <div className="pos-summary-line">
                    <span>Giảm giá</span>
                    <span>{bill?.discount ? '−' + money(bill.discount.amount) : money(0)}</span>
                  </div>
                  <div className="pos-summary-total">
                    <span>Tổng thanh toán</span>
                    <span className="pos-total-amount">{money(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pos-btn-checkout"
                  onClick={handleCheckout}
                  disabled={saving || b.status === 'booked' || !!quoteError}
                >
                  <CreditCard size={18} />
                  <span>Thanh toán (F9)</span>
                </button>
              </div>
            </div>

            <div className="pos-catalog-card">
              {operating && food.data ? (
                <SessionOrdering booking={b} data={food.data} onRefresh={food.reload} />
              ) : food.error ? (
                <div className="error-box">{food.error}</div>
              ) : (
                <p className="pos-line-note">
                  {operating ? 'Đang tải thực đơn…' : 'Phiên đã kết thúc, không thêm món được.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {extendModal && (
          <div className="ar-settings-modal-backdrop" onClick={() => setExtendModal(false)}>
            <div
              className="ar-settings-modal"
              style={{ maxWidth: '380px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <h3 className="ar-modal-header-title">Gia hạn thêm giờ chơi</h3>
                <button className="ar-modal-close-btn" onClick={() => setExtendModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div
                className="ar-modal-body"
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {[15, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="ar-btn-secondary"
                    style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}
                    disabled={saving}
                    onClick={() => handleExtend(m)}
                  >
                    + {m} phút
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 3 — payment (amount, methods and ledger entry are server-side)
  // ---------------------------------------------------------------------------
  if (cur === 'pay' && b) {
    const blocked = !data.activeShift
      ? 'Chưa mở ca bán hàng. Hãy mở ca trước khi thu tiền.'
      : pendingFood > 0
        ? `Còn ${pendingFood} đơn món chưa phục vụ.`
        : !foodVerified
          ? 'Đang đối chiếu tiền món với bếp…'
          : b.amount == null
            ? 'Phiên chưa chốt tiền.'
            : '';
    return (
      <div className="pos-flow-container">
        <div className="pos-pay-screen">
          <div className="pos-pay-header">
            <button
              type="button"
              className="pos-back-btn"
              onClick={() => setStep('order')}
              aria-label="Quay lại bán hàng"
            >
              <ArrowLeft size={18} />
            </button>
            <h2>Thanh toán – {roomShort}</h2>
          </div>

          <div className="pos-pay-amount-box">
            <span className="pos-pay-amount-label">Tổng thanh toán</span>
            <div className="pos-pay-amount-value">{money(total)}</div>
          </div>

          <div className="pos-method-cards">
            {(
              [
                ['cash', Wallet],
                ['card', CreditCard],
                ['transfer', Landmark],
              ] as const
            ).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                className={`pos-method-card ${payMethod === k ? 'selected' : ''}`}
                onClick={() => setPayMethod(k)}
              >
                <Icon />
                <span>{PAY_LABEL[k]}</span>
              </button>
            ))}
          </div>

          {payMethod === 'transfer' && (
            <TransferPanel
              booking={b}
              bank={{
                bin: data.config.bankBin ?? '',
                account: data.config.bankAccount ?? '',
                holder: data.config.bankHolder ?? '',
              }}
              busy={saving || !canPayNow}
              onUse={(txId) => pay({ bankTxId: txId }, 'transfer')}
            />
          )}

          {payMethod === 'cash' && (
            <>
              <div className="pos-quick-cash-row">
                {quickCash.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`pos-quick-cash-btn ${cashIn === amt ? 'selected' : ''}`}
                    onClick={() => setTendered(String(amt))}
                  >
                    {money(amt)}
                  </button>
                ))}
              </div>
              <div className="pos-calc-box">
                <div className="pos-calc-row">
                  <label htmlFor="pos-cash-in">Khách đưa:</label>
                  <input
                    id="pos-cash-in"
                    inputMode="numeric"
                    value={tendered}
                    placeholder={String(total)}
                    onChange={(e) => setTendered(e.target.value)}
                  />
                </div>
                <div className="pos-calc-row">
                  <label>Tiền thối lại:</label>
                  <span className="pos-change-value">{money(change)}</span>
                </div>
              </div>
            </>
          )}

          <label className="pos-print-checkbox">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
            />
            <span>In hóa đơn sau khi xác nhận</span>
          </label>

          {(blocked || notice) && (
            <div className="error-box" role="status">
              {blocked || notice}
            </div>
          )}

          {payMethod !== 'transfer' && (
            <button
              type="button"
              className="pos-btn-confirm-pay"
              onClick={() => pay()}
              disabled={saving || !canPayNow || !data.activeShift}
            >
              {saving ? 'Đang ghi nhận…' : 'Xác nhận thanh toán'}
            </button>
          )}
          {onOpenSession && (
            <button
              type="button"
              className="pos-btn-print"
              onClick={() => onOpenSession(b)}
              title="Giảm giá, gói hội viên, ví, chia tiền"
            >
              <SlidersHorizontal size={16} />
              <span>Giảm giá / gói hội viên / chia tiền</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 4 — done
  // ---------------------------------------------------------------------------
  if (cur === 'done' && b && paid) {
    return (
      <div className="pos-flow-container">
        <div className="pos-done-screen">
          <div className="pos-done-checkmark">
            <Check />
          </div>
          <h2 className="pos-done-title">Thanh toán thành công!</h2>
          <div className="pos-done-meta-box">
            <div className="pos-done-meta-row">
              <span>Phiên:</span>
              <strong>
                {roomShort} · {b.id.slice(-6).toUpperCase()}
              </strong>
            </div>
            <div className="pos-done-meta-row">
              <span>Tổng tiền:</span>
              <span className="pos-done-price">{money(paid.total)}</span>
            </div>
            <div className="pos-done-meta-row">
              <span>Hình thức:</span>
              <strong>{paid.method}</strong>
            </div>
            <div className="pos-done-meta-row">
              <span>Thời gian:</span>
              <strong>
                {new Date(paid.at).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </div>
          </div>
          {notice && <div className="error-box">{notice}</div>}
          <div className="pos-done-actions">
            <button type="button" className="pos-btn-print" onClick={printNow}>
              <Printer size={16} />
              <span>In hóa đơn</span>
            </button>
            <button type="button" className="pos-btn-zalo" onClick={sendZalo}>
              <Send size={16} />
              <span>Gửi hóa đơn (Zalo)</span>
            </button>
            <button
              type="button"
              className="pos-btn-finish"
              onClick={() => {
                setActiveId(null);
                setStep('map');
              }}
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
