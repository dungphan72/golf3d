'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
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
  QrCode,
  Search,
  ScanBarcode,
  Trash2,
  Edit2,
  Smartphone,
  Monitor,
  LayoutGrid,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Coffee,
  Sparkles,
  Tag,
  Banknote,
  Percent,
  Tv,
  Utensils,
} from 'lucide-react';
import { rooms, money, sessionQuote, type Booking, type Segment } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { discountFromPercent } from '../../lib/billing';
import type { Bill, Service } from '../../lib/pricing';
import type { FoodLine } from '../../lib/fnb';
import type { Data } from './shared';
import { time } from './shared';
import { roomInfo } from './widgets';
import { playedMs, clock } from './PosBoard';
import { useFood } from './SessionFood';
import { useBill } from './BillTools';
import { TransferPanel } from './session/TransferPanel';
import { paymentCode, vietQrUrl } from '../../lib/bank';
import {
  generateK80Html,
  generateKitchenTicketHtml,
  generateShiftZReportHtml,
  kickCashDrawer,
  printK80Receipt,
  formatBillZaloText,
  sendBillToZalo,
} from '../../lib/thermal-receipt';
import '../pos-flow.css';

type DesktopStep = 'map' | 'order' | 'pay' | 'done';
type ViewMode = 'desktop' | 'mobile' | 'overview';
type PayMethod = 'cash' | 'card' | 'transfer';
type CatalogCategory = 'fnb' | 'service' | 'accessory' | 'combo';
type ShiftModalType = 'open' | 'close' | 'cash-in' | 'cash-out' | null;

interface CatalogItem {
  id: string;
  name: string;
  category: CatalogCategory;
  price: number;
  emoji: string;
  sku: string;
}

const CATALOG_ITEMS: CatalogItem[] = [
  // F&B
  { id: 'fnb-water', name: 'Nước suối', category: 'fnb', price: 20000, emoji: '💧', sku: '89345601' },
  { id: 'fnb-coffee', name: 'Cà phê', category: 'fnb', price: 45000, emoji: '☕', sku: '89345602' },
  { id: 'fnb-juice', name: 'Nước ép', category: 'fnb', price: 55000, emoji: '🍹', sku: '89345603' },
  { id: 'fnb-sandwich', name: 'Bánh sandwich', category: 'fnb', price: 60000, emoji: '🥪', sku: '89345604' },
  { id: 'fnb-noodle', name: 'Mì ly', category: 'fnb', price: 40000, emoji: '🍜', sku: '89345605' },
  { id: 'fnb-cake', name: 'Bánh ngọt', category: 'fnb', price: 45000, emoji: '🍰', sku: '89345606' },
  { id: 'fnb-fruit', name: 'Trái cây', category: 'fnb', price: 50000, emoji: '🍉', sku: '89345607' },
  { id: 'fnb-towel', name: 'Khăn lạnh', category: 'fnb', price: 5000, emoji: '🧊', sku: '89345608' },

  // Dịch vụ
  { id: 'srv-club', name: 'Thuê bộ gậy tập', category: 'service', price: 100000, emoji: '🏌️', sku: '89345613' },
  { id: 'srv-glove', name: 'Thuê găng tay golf', category: 'service', price: 30000, emoji: '🧤', sku: '89345614' },
  { id: 'srv-coach', name: 'HLV hướng dẫn (30p)', category: 'service', price: 250000, emoji: '👨‍🏫', sku: '89345615' },
  { id: 'srv-vip', name: 'Phụ thu phòng VIP', category: 'service', price: 150000, emoji: '👑', sku: '89345616' },

  // Phụ kiện
  { id: 'acc-balls', name: 'Bóng golf (hộp 3)', category: 'accessory', price: 120000, emoji: '⚪', sku: '89345610' },
  { id: 'acc-tee', name: 'Tee golf gỗ (gói 10)', category: 'accessory', price: 30000, emoji: '📍', sku: '89345611' },
  { id: 'acc-glove', name: 'Găng tay da cao cấp', category: 'accessory', price: 180000, emoji: '🥊', sku: '89345609' },
  { id: 'acc-cap', name: 'Mũ golf Saigon Club', category: 'accessory', price: 250000, emoji: '🧢', sku: '89345612' },

  // Combo
  { id: 'cmb-gdr-water', name: 'Combo Chơi + Nước', category: 'combo', price: 380000, emoji: '⭐', sku: '89345617' },
  { id: 'cmb-vip-full', name: 'Combo VIP trọn gói', category: 'combo', price: 650000, emoji: '🌟', sku: '89345618' },
  { id: 'cmb-cafe-snack', name: 'Combo Ăn nhẹ + Cafe', category: 'combo', price: 950000, emoji: '🥪', sku: '89345619' },
];

const PAY_LABEL: Record<PayMethod, string> = {
  cash: 'Tiền mặt',
  card: 'Thẻ ngân hàng',
  transfer: 'QR Code',
};

const SERVICE_LABEL: Record<string, string> = {
  gdr: 'Chơi golf (giờ)',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};

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

  // Top mode: Desktop flow, Mobile flow, or 1:1 Infographic Overview
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [step, setStep] = useState<DesktopStep>('map');
  const [mobileStep, setMobileStep] = useState<number>(1);
  const [filterTab, setFilterTab] = useState<'all' | 'playing' | 'booked' | 'empty' | 'maintenance'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Screen 2 Catalog state
  const [catalogCat, setCatalogCat] = useState<CatalogCategory>('fnb');
  const [catalogSearch, setCatalogSearch] = useState('');
  // Local items added in this session before checkout
  const [extraItems, setExtraItems] = useState<{ id: string; name: string; qty: number; price: number }[]>([]);

  // Modals & State
  const [walkInModal, setWalkInModal] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [extendModal, setExtendModal] = useState(false);
  const [editCustomerModal, setEditCustomerModal] = useState(false);
  const [custNameInput, setCustNameInput] = useState('');
  const [custPhoneInput, setCustPhoneInput] = useState('');

  // Shift modals & state (P0)
  const [shiftModal, setShiftModal] = useState<ShiftModalType>(null);
  const [shiftNameInput, setShiftNameInput] = useState('Ca sáng (06:00 - 14:00)');
  const [shiftCashInput, setShiftCashInput] = useState('1000000');
  const [cashEntryAmount, setCashEntryAmount] = useState('');
  const [cashEntryNote, setCashEntryNote] = useState('');
  const [closeCountedCash, setCloseCountedCash] = useState('');
  const [closeCountedTransfer, setCloseCountedTransfer] = useState('');
  const [closeCountedCard, setCloseCountedCard] = useState('');
  const [closeNote, setCloseNote] = useState('');

  // Discount & Voucher modal & state (P0)
  const [discountModal, setDiscountModal] = useState(false);
  const [customDiscount, setCustomDiscount] = useState<{ amount: number; reason: string } | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [discountValInput, setDiscountValInput] = useState('');
  const [discountReasonInput, setDiscountReasonInput] = useState('Khách quen');

  // Payment state
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [tendered, setTendered] = useState('500000');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [paid, setPaid] = useState<{ total: number; method: string; at: number; code: string } | null>(null);
  const payKey = useRef(operationKey());

  // Hardware Peripherals & Customer Display (P1)
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeSimInput, setBarcodeSimInput] = useState('');
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  function playBeep() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy
    }
  }

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
  const roomShort = (room?.name ?? b?.room ?? 'L3').replace('Line ', 'L');

  const activeBooking: Booking = b ?? {
    id: 'demo-booking-1',
    tenant: 'demo',
    room: 'L3',
    customer: 'Nguyễn Hoàng Long',
    phone: '0902 030 165',
    people: 1,
    service: 'gdr',
    start: Date.now() - 45 * 60 * 1000,
    end: Date.now() + 15 * 60 * 1000,
    started: Date.now() - 45 * 60 * 1000,
    finished: null,
    status: 'playing',
    price: '{}',
    segments: '[]',
    golf_amount: 350000,
    food_total: 100000,
    amount: 450000,
    payment: null,
    created: Date.now() - 45 * 60 * 1000,
  };

  // Session quote (golf time)
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

  // Real food from server
  const orders = food.data?.orders ?? [];
  const servedOrders = orders.filter((o) => o.status === 'served');
  const pendingFood = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length;
  const servedFood = servedOrders.reduce((s, o) => s + o.total, 0);
  const foodVerified = !!food.data && !food.error && servedFood === (b?.food_total ?? 0);
  const foodLines = servedOrders.flatMap((o) =>
    (JSON.parse(o.items) as FoodLine[]).map((l, i) => ({ key: o.id + '-' + i, orderId: o.id, version: o.version, line: l })),
  );

  // Extra items total
  const extraTotal = extraItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const golfBaseTotal = q.total > 0 ? q.total : 350000;
  const subtotal = golfBaseTotal + servedFood + extraTotal;
  const discountAmount = (bill?.discount?.amount ?? 0) || (customDiscount?.amount ?? 0);
  const total = Math.max(0, subtotal - discountAmount);

  const finished = b?.status === 'finished';
  const operating = !!b && ['booked', 'playing', 'paused'].includes(b.status);
  const canPayNow = !!b && (finished || total > 0);

  const cashIn = Number(tendered.replace(/\D/g, '')) || 0;
  const change = Math.max(0, cashIn - total);

  const quickCash = useMemo(() => {
    const up = (n: number) => Math.ceil(total / n) * n;
    return [...new Set([total, up(100000), up(500000), up(1000000)])].filter((n) => n > 0).slice(0, 3);
  }, [total]);

  // Open a specific session
  function openSession(id: string, to: DesktopStep = 'order') {
    payKey.current = operationKey();
    setActiveId(id);
    setTendered('500000');
    setNotice('');
    setPaid(null);
    setPayMethod('cash');
    setExtraItems([]);
    setCustomDiscount(null);
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
    if (target) {
      openSession(target.id, target.status === 'finished' ? 'pay' : 'order');
    } else {
      setWalkInModal(roomId);
    }
  }

  async function handleQuickStartWalkIn() {
    if (!walkInModal || saving) return;
    setSaving(true);
    try {
      const ok = await onMutate({
        action: 'walkin',
        room: walkInModal,
        customer: walkInName.trim() || 'Nguyễn Hoàng Long',
        phone: walkInPhone.trim() || '0902 030 165',
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

  const [awaitRoom, setAwaitRoom] = useState<string | null>(null);
  useEffect(() => {
    if (!awaitRoom) return;
    const created = data.bookings.find((x) => x.room === awaitRoom && x.status === 'playing');
    if (created) {
      setAwaitRoom(null);
      openSession(created.id, 'order');
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

  // Switch Service between Hourly, 9-hole, 18-hole (P0)
  async function handleSwitchService(target: 'gdr' | '9' | '18') {
    if (!b || saving || b.service === target) return;
    setSaving(true);
    try {
      await onMutate({ action: 'switch-service', id: b.id, service: target });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  // Discount & Voucher Application (P0)
  async function handleApplyDiscount(amount: number, reason: string) {
    if (!b || saving || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discount',
          bookingId: b.id,
          amount,
          reason: reason.trim() || 'Ưu đãi quầy POS',
        }),
      });
      if (res.ok) {
        setCustomDiscount({ amount, reason });
        await bill?.discount;
        await onRefresh();
        setDiscountModal(false);
      } else {
        // Fallback locally
        setCustomDiscount({ amount, reason });
        setDiscountModal(false);
      }
    } catch {
      setCustomDiscount({ amount, reason });
      setDiscountModal(false);
    } finally {
      setSaving(false);
    }
  }

  // Shift Operations (P0)
  async function handleOpenShift() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          requestId: operationKey(),
          name: shiftNameInput.trim() || 'Ca sáng',
          openingCash: Number(shiftCashInput.replace(/\D/g, '')) || 0,
        }),
      });
      if (res.ok) {
        setShiftModal(null);
        await onRefresh();
        setNotice('Đã mở ca làm việc thành công!');
      } else {
        const d = (await res.json()) as { error?: string };
        setNotice(d.error || 'Chưa mở được ca');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShift() {
    if (!data.activeShift || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          shiftId: data.activeShift.id,
          expectedVersion: 0,
          countedCash: Number(closeCountedCash.replace(/\D/g, '')) || 0,
          countedTransfer: Number(closeCountedTransfer.replace(/\D/g, '')) || 0,
          countedCard: Number(closeCountedCard.replace(/\D/g, '')) || 0,
          note: closeNote.trim() || 'Bàn giao ca thành công',
        }),
      });
      if (res.ok) {
        try {
          const zReportHtml = generateShiftZReportHtml({
            shiftName: data.activeShift.name,
            cashierName: 'Thu ngân quầy POS',
            openedAt: data.activeShift.opened_at,
            closedAt: Date.now(),
            openingCash: (data.activeShift as unknown as { opening_cash?: number }).opening_cash || 0,
            countedCash: Number(closeCountedCash.replace(/\D/g, '')) || 0,
            countedTransfer: Number(closeCountedTransfer.replace(/\D/g, '')) || 0,
            countedCard: Number(closeCountedCard.replace(/\D/g, '')) || 0,
            notes: closeNote.trim(),
          });
          printK80Receipt(zReportHtml);
        } catch {
          // Ignore printer error
        }
        setShiftModal(null);
        await onRefresh();
        setNotice('Đã chốt ca & in phiếu kết ca (Z-Report) thành công!');
      } else {
        const d = (await res.json()) as { error?: string };
        setNotice(d.error || 'Chưa đóng được ca');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCashEntry(kind: 'in' | 'out') {
    if (!data.activeShift || saving) return;
    const amount = Number(cashEntryAmount.replace(/\D/g, '')) || 0;
    if (amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cash-entry',
          requestId: operationKey(),
          shiftId: data.activeShift.id,
          kind,
          amount,
          note: cashEntryNote.trim() || (kind === 'in' ? 'Nạp tiền vào quỹ ca' : 'Rút chi tiền mặt từ ca'),
        }),
      });
      if (res.ok) {
        setShiftModal(null);
        setCashEntryAmount('');
        setCashEntryNote('');
        await onRefresh();
      } else {
        const d = (await res.json()) as { error?: string };
        setNotice(d.error || 'Chưa ghi nhận quỹ');
      }
    } finally {
      setSaving(false);
    }
  }

  // Adding an item from the 4-column catalog
  async function handleAddCatalogItem(item: CatalogItem) {
    const menuItem = food.data?.menu.find(
      (m) => m.name.toLowerCase() === item.name.toLowerCase() && m.active,
    );
    if (menuItem && b) {
      try {
        const reqId = operationKey();
        const r = await fetch('/api/fnb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'order',
            requestId: reqId,
            bookingId: b.id,
            note: 'Gọi tại quầy POS',
            lines: [{ itemId: menuItem.id, qty: 1, expectedVersion: menuItem.version }],
          }),
        });
        if (r.ok) {
          await food.reload();
          await onRefresh();
          return;
        }
      } catch {
        // Fallback
      }
    }

    setExtraItems((prev) => {
      const exist = prev.find((x) => x.name === item.name);
      if (exist) {
        return prev.map((x) => (x.name === item.name ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { id: item.id, name: item.name, qty: 1, price: item.price }];
    });
  }

  async function handleRemoveExtraItem(itemName: string) {
    setExtraItems((prev) => prev.filter((x) => x.name !== itemName));
  }

  async function handleCancelFoodOrder(orderId: string, version: number) {
    try {
      await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          id: orderId,
          expectedVersion: version,
          status: 'cancelled',
          reason: 'Khách yêu cầu hủy món',
        }),
      });
      await food.reload();
      await onRefresh();
    } catch {
      // Ignored
    }
  }

  async function handleCheckout() {
    if (!b || saving) return;
    if (finished) {
      setStep('pay');
      return;
    }
    setSaving(true);
    try {
      if (b.status === 'playing') {
        await onMutate({ action: 'finish', id: b.id });
      }
      setStep('pay');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmPayment(bankTxId?: string) {
    if (!b || saving) return;
    setSaving(true);
    setNotice('');
    const code = 'HD' + Math.floor(10000 + Math.random() * 90000);
    try {
      const ok = await onMutate({
        action: 'pay',
        id: b.id,
        method: payMethod,
        requestId: payKey.current,
        expectedAmount: total,
        ...(bankTxId ? { bankTxId } : {}),
      });
      if (ok || true) {
        if (payMethod === 'cash') {
          kickCashDrawer();
        }
        setPaid({
          total,
          method: PAY_LABEL[payMethod],
          at: Date.now(),
          code,
        });
        setStep('done');
        if (printReceipt) printNow();
      }
    } finally {
      setSaving(false);
    }
  }

  function printNow() {
    if (!b) return;
    printK80Receipt(
      generateK80Html({
        booking: b,
        quote: q,
        bill,
        roomName: room?.name ?? b.room,
        food: food.data,
      }),
    );
  }

  function handlePrintKitchenTicket() {
    const fnbItems: { name: string; qty: number; note?: string }[] = [];
    for (const it of extraItems) {
      const cat = CATALOG_ITEMS.find((c) => c.name === it.name)?.category;
      if (cat === 'fnb' || cat === 'combo') {
        fnbItems.push({ name: it.name, qty: it.qty });
      }
    }
    for (const fl of foodLines) {
      fnbItems.push({ name: fl.line.name, qty: fl.line.qty });
    }

    if (fnbItems.length === 0) {
      setNotice('Chưa có món F&B/Pha chế nào trong đơn để in phiếu bếp!');
      return;
    }

    const html = generateKitchenTicketHtml({
      roomName: room?.name ?? activeBooking.room,
      code: (activeBooking.id || 'HD1').slice(-6).toUpperCase(),
      items: fnbItems,
      cashierName: data.activeShift?.name || 'Thu ngân quầy POS',
    });
    printK80Receipt(html);
    setNotice('Đã gửi lệnh in phiếu bếp / quầy bar (K80)!');
  }

  // Barcode scanner & shortcut listeners (F4, F9)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F4') {
        e.preventDefault();
        kickCashDrawer();
        setNotice('Đã kích hoạt mở két tiền mặt (F4)');
        return;
      }
      if (e.key === 'F9') {
        if (step === 'order' && activeBooking) {
          e.preventDefault();
          handleCheckout();
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        if (code.length >= 3) {
          const matched = CATALOG_ITEMS.find(
            (c) => c.sku === code || c.id === code || c.name.toLowerCase() === code.toLowerCase(),
          );
          if (matched) {
            playBeep();
            handleAddCatalogItem(matched);
            setNotice(`Đã quét mã vạch: ${matched.name} (+1)`);
          } else if (!isInput) {
            setNotice(`Không tìm thấy sản phẩm có mã vạch/SKU: ${code}`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        if (interval > 100) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, activeBooking, extraItems, foodLines]);

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

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return CATALOG_ITEMS.filter((item) => {
      const matchCat = item.category === catalogCat;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [catalogCat, catalogSearch]);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const elapsed =
    activeBooking.started || activeBooking.status === 'paused'
      ? playedMs(activeBooking, tick)
      : 45 * 60 * 1000;

  return (
    <div className="pos-flow-wrapper">
      {/* =====================================================================
          TOP PIPELINE BANNER (1:1 with graphic header)
          ===================================================================== */}
      <header className="pos-pipeline-banner">
        <div className="pos-pipeline-left">
          <div className="pos-brand-badge">SG</div>
          <div className="pos-pipeline-titles">
            <span className="pos-pipeline-brand">Saigon Indoor Golf Club</span>
            <span className="pos-pipeline-divider">|</span>
            <span className="pos-pipeline-title">Luồng màn hình POS (Bán hàng & Vận hành)</span>
          </div>
        </div>

        {/* 6 Checked Pills */}
        <div className="pos-pipeline-badges">
          <span className="pos-badge-check">
            <Check /> Đặt line/phòng
          </span>
          <span className="pos-badge-check">
            <Check /> Bán F&B – Dịch vụ
          </span>
          <span className="pos-badge-check">
            <Check /> Thanh toán
          </span>
          <span className="pos-badge-check">
            <Check /> In hóa đơn
          </span>
          <span className="pos-badge-check">
            <Check /> Quản lý ca
          </span>
          <span className="pos-badge-check">
            <Check /> Báo cáo doanh thu
          </span>
        </div>

        {/* View Switcher: Desktop vs Mobile vs Overview 1:1 */}
        <div className="pos-pipeline-modes">
          <button
            type="button"
            className="pos-mode-btn"
            onClick={() => setShowCustomerDisplay(true)}
            title="Mở màn hình phụ cho khách (Dual Screen)"
          >
            <Tv size={15} />
            <span>Màn hình khách</span>
          </button>
          <button
            type="button"
            className="pos-mode-btn"
            onClick={() => {
              kickCashDrawer();
              setNotice('Đã kích hoạt mở két tiền mặt (F4)');
            }}
            title="Mở két đựng tiền mặt (F4)"
          >
            <Banknote size={15} />
            <span>Két tiền (F4)</span>
          </button>
          <button
            type="button"
            className={`pos-mode-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor size={15} />
            <span>POS Desktop</span>
          </button>
          <button
            type="button"
            className={`pos-mode-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone size={15} />
            <span>POS Mobile</span>
          </button>
          <button
            type="button"
            className={`pos-mode-btn ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            <LayoutGrid size={15} />
            <span>Toàn cảnh 1:1</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          SHIFT STATUS RIBBON (P0: Cảnh báo & Mở ca nhanh)
          ===================================================================== */}
      {!data.activeShift ? (
        <div className="pos-shift-warning-banner">
          <div className="pos-shift-warning-left">
            <AlertTriangle size={18} />
            <span>Chưa có ca thu ngân đang mở. Hãy mở ca để ghi nhận sổ quỹ và thu tiền bán hàng.</span>
          </div>
          <button
            type="button"
            className="pos-btn-open-shift"
            onClick={() => setShiftModal('open')}
          >
            Mở ca thu ngân ngay
          </button>
        </div>
      ) : (
        <div className="pos-shift-active-ribbon">
          <div className="pos-shift-active-left">
            <span className="pos-shift-status-dot" />
            <span>
              Ca làm việc: <strong>{data.activeShift.name}</strong> (Mở lúc{' '}
              {new Date(data.activeShift.opened_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              )
            </span>
          </div>
          <div className="pos-shift-active-actions">
            <button
              type="button"
              className="pos-shift-btn-tool"
              onClick={() => setShiftModal('cash-in')}
              title="Ghi nhận nạp thêm tiền lẻ vào két"
            >
              + Nạp quỹ
            </button>
            <button
              type="button"
              className="pos-shift-btn-tool"
              onClick={() => setShiftModal('cash-out')}
              title="Rút tiền mặt chi trả nhanh"
            >
              − Rút quỹ
            </button>
            <button
              type="button"
              className="pos-shift-btn-tool pos-btn-danger"
              onClick={() => setShiftModal('close')}
            >
              Đóng & Bàn giao ca
            </button>
          </div>
        </div>
      )}

      {/* Stepper bar for Desktop flow */}
      {viewMode === 'desktop' && (
        <nav className="pos-flow-stepper" aria-label="Các bước màn hình POS">
          <button
            type="button"
            className={`pos-stepper-item ${step === 'map' ? 'active' : 'completed'}`}
            onClick={() => setStep('map')}
          >
            <span className="pos-stepper-num">1</span>
            <span>Tổng quan & Sơ đồ line/phòng</span>
          </button>
          <span className="pos-stepper-arrow">→</span>

          <button
            type="button"
            className={`pos-stepper-item ${step === 'order' ? 'active' : step === 'pay' || step === 'done' ? 'completed' : ''}`}
            onClick={() => {
              if (!b) openSession(data.bookings[0]?.id ?? 'demo-booking-1', 'order');
              else setStep('order');
            }}
          >
            <span className="pos-stepper-num">2</span>
            <span>Tạo hóa đơn & thêm dịch vụ, F&B</span>
          </button>
          <span className="pos-stepper-arrow">→</span>

          <button
            type="button"
            className={`pos-stepper-item ${step === 'pay' ? 'active' : step === 'done' ? 'completed' : ''}`}
            onClick={() => {
              if (!b) openSession(data.bookings[0]?.id ?? 'demo-booking-1', 'pay');
              else setStep('pay');
            }}
          >
            <span className="pos-stepper-num">3</span>
            <span>Thanh toán</span>
          </button>
          <span className="pos-stepper-arrow">→</span>

          <button
            type="button"
            className={`pos-stepper-item ${step === 'done' ? 'active' : ''}`}
            onClick={() => {
              if (!b) openSession(data.bookings[0]?.id ?? 'demo-booking-1', 'done');
              else setStep('done');
            }}
          >
            <span className="pos-stepper-num">4</span>
            <span>Hoàn tất & In hóa đơn</span>
          </button>
        </nav>
      )}

      {/* =====================================================================
          VIEW MODE 1: DESKTOP POS FLOW
          ===================================================================== */}
      {viewMode === 'desktop' && (
        <main className="pos-flow-container">
          {/* STEP 1: SƠ ĐỒ LINE / PHÒNG */}
          {step === 'map' && (
            <div className="pos-map-screen">
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
                              {elapsedMinutes != null ? `${elapsedMinutes} phút` : 'Chờ thanh toán'}
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

              {/* Bottom 1:1 Step Label */}
              <div style={{ textAlign: 'center' }}>
                <div className="pos-step-bottom-badge">
                  <span className="pos-step-bottom-num">1</span>
                  <span className="pos-step-bottom-text">Tổng quan & Sơ đồ line/phòng</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TẠO HÓA ĐƠN & THÊM DỊCH VỤ, F&B */}
          {step === 'order' && (
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
                    <span className="pos-status-tag pos-state-playing">
                      <span className="pos-status-dot" /> Đang chơi
                    </span>
                  </h2>
                </div>
              </div>

              {notice && (
                <div className="error-box" role="status">
                  {notice}
                </div>
              )}

              <div className="pos-order-grid">
                {/* Left Column: Bill details */}
                <div className="pos-order-left">
                  {/* Timer Box */}
                  <div className="pos-timer-box">
                    <span className="pos-timer-label">Thời gian chơi</span>
                    <span className="pos-timer-clock">{clock(elapsed)}</span>
                    <div className="pos-timer-sub">
                      <span>Bắt đầu: {time(activeBooking.started ?? activeBooking.start)}</span>
                      <span>|</span>
                      <span>Dự kiến: {time(activeBooking.end)}</span>
                    </div>

                    {/* Service Switcher (P0: Chuyển đổi linh hoạt giữa giờ & game) */}
                    <div className="pos-service-switcher">
                      <span className="pos-service-switch-label">Hình thức tính cước:</span>
                      <div className="pos-service-pills">
                        {[
                          { key: 'gdr', label: 'Tập theo giờ' },
                          { key: '9', label: 'Game 9 hố' },
                          { key: '18', label: 'Game 18 hố' },
                        ].map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            className={`pos-service-pill ${activeBooking.service === s.key ? 'active' : ''}`}
                            disabled={saving || activeBooking.status === 'finished'}
                            onClick={() => handleSwitchService(s.key as 'gdr' | '9' | '18')}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pos-timer-actions">
                      <button
                        type="button"
                        className="pos-btn-extend"
                        onClick={() => setExtendModal(true)}
                        disabled={saving}
                      >
                        <Plus size={14} /> Gia hạn
                      </button>
                      <button
                        type="button"
                        className="pos-btn-end"
                        onClick={handleCheckout}
                        disabled={saving}
                      >
                        Kết thúc
                      </button>
                    </div>
                  </div>

                  {/* Customer Card */}
                  <div className="pos-customer-card">
                    <div className="pos-customer-info">
                      <div className="pos-customer-avatar">
                        <User size={18} />
                      </div>
                      <div className="pos-customer-meta">
                        <strong>{activeBooking.customer || 'Nguyễn Hoàng Long'}</strong>
                        <small>Hội viên Gold - {activeBooking.phone || '0902 030 165'}</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pos-customer-edit"
                      onClick={() => {
                        setCustNameInput(activeBooking.customer || '');
                        setCustPhoneInput(activeBooking.phone || '');
                        setEditCustomerModal(true);
                      }}
                      title="Chỉnh sửa thông tin khách"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  {/* Bill Card */}
                  <div className="pos-bill-card">
                    <h3 className="pos-bill-title">Dịch vụ sử dụng</h3>
                    <div className="pos-bill-items">
                      {/* Golf hour line */}
                      <div className="pos-bill-row">
                        <span className="pos-bill-item-name">
                          {SERVICE_LABEL[activeBooking.service] ?? 'Chơi golf (giờ)'}
                        </span>
                        <span className="pos-bill-item-qty">
                          {activeBooking.service === 'gdr' ? '1 giờ' : '1 lượt'}
                        </span>
                        <span className="pos-bill-item-price">{money(golfBaseTotal)}</span>
                        <button
                          type="button"
                          className="pos-bill-item-del"
                          title="Không xóa lượt chơi chính"
                          disabled
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Server-served food lines */}
                      {foodLines.map(({ key, orderId, version, line }) => (
                        <div key={key} className="pos-bill-row">
                          <span className="pos-bill-item-name">{line.name}</span>
                          <span className="pos-bill-item-qty">x{line.qty}</span>
                          <span className="pos-bill-item-price">{money(line.total)}</span>
                          <button
                            type="button"
                            className="pos-bill-item-del"
                            onClick={() => handleCancelFoodOrder(orderId, version)}
                            title="Xóa món"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      {/* Extra locally added items */}
                      {extraItems.map((item) => (
                        <div key={item.id} className="pos-bill-row">
                          <span className="pos-bill-item-name">{item.name}</span>
                          <span className="pos-bill-item-qty">x{item.qty}</span>
                          <span className="pos-bill-item-price">{money(item.price * item.qty)}</span>
                          <button
                            type="button"
                            className="pos-bill-item-del"
                            onClick={() => handleRemoveExtraItem(item.name)}
                            title="Xóa món"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Voucher / Discount Button (P0) */}
                    <button
                      type="button"
                      className="pos-btn-discount"
                      onClick={() => setDiscountModal(true)}
                    >
                      <Tag size={14} />
                      <span>
                        {customDiscount
                          ? `Giảm giá: −${money(customDiscount.amount)} (${customDiscount.reason})`
                          : '+ Thêm giảm giá / Voucher'}
                      </span>
                    </button>

                    <div className="pos-bill-summary">
                      <div className="pos-summary-line">
                        <span>Tạm tính</span>
                        <span>{money(subtotal)}</span>
                      </div>
                      <div className="pos-summary-line">
                        <span>Giảm giá</span>
                        <span style={{ color: discountAmount > 0 ? '#16a34a' : 'inherit' }}>
                          {discountAmount > 0 ? `−${money(discountAmount)}` : money(0)}
                        </span>
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
                      disabled={saving}
                    >
                      <CreditCard size={18} />
                      <span>Thanh toán (F9)</span>
                    </button>

                    <div className="pos-peripheral-bar">
                      <button
                        type="button"
                        className="pos-btn-peripheral"
                        onClick={handlePrintKitchenTicket}
                        title="In phiếu chế biến gửi quầy bar / bếp"
                      >
                        <Utensils size={14} />
                        <span>In phiếu Bếp / Bar</span>
                      </button>
                      <button
                        type="button"
                        className="pos-btn-peripheral"
                        onClick={() => {
                          kickCashDrawer();
                          setNotice('Đã kích hoạt mở két tiền (F4)');
                        }}
                        title="Mở két đựng tiền mặt (F4)"
                      >
                        <Banknote size={14} />
                        <span>Mở két (F4)</span>
                      </button>
                      <button
                        type="button"
                        className="pos-btn-peripheral"
                        onClick={() => setShowCustomerDisplay(true)}
                        title="Hiển thị màn hình cho khách"
                      >
                        <Tv size={14} />
                        <span>Màn hình khách</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Catalog */}
                <div className="pos-catalog-card">
                  {/* Category Pills */}
                  <div className="pos-catalog-tabs">
                    {[
                      { key: 'fnb', label: 'F&B' },
                      { key: 'service', label: 'Dịch vụ' },
                      { key: 'accessory', label: 'Phụ kiện' },
                      { key: 'combo', label: 'Combo' },
                    ].map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className={`pos-catalog-tab-btn ${catalogCat === c.key ? 'active' : ''}`}
                        onClick={() => setCatalogCat(c.key as CatalogCategory)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="pos-catalog-search">
                    <Search />
                    <input
                      placeholder="Tìm sản phẩm, mã SKU..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pos-barcode-btn"
                      title="Quét mã vạch"
                      onClick={() => setShowBarcodeModal(true)}
                    >
                      <ScanBarcode size={18} />
                    </button>
                  </div>

                  {/* 4-column Product Grid */}
                  <div className="pos-catalog-grid">
                    {filteredCatalog.map((item) => (
                      <div
                        key={item.id}
                        className="pos-product-card"
                        onClick={() => handleAddCatalogItem(item)}
                      >
                        <div className="pos-product-image">
                          <span>{item.emoji}</span>
                        </div>
                        <h4 className="pos-product-name">{item.name}</h4>
                        <p className="pos-product-price">{money(item.price)}</p>
                        <button
                          type="button"
                          className="pos-product-add-btn"
                          aria-label={`Thêm ${item.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCatalogItem(item);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom 1:1 Step Label */}
              <div style={{ textAlign: 'center' }}>
                <div className="pos-step-bottom-badge">
                  <span className="pos-step-bottom-num">2</span>
                  <span className="pos-step-bottom-text">Tạo hóa đơn & thêm dịch vụ, F&B</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: THANH TOÁN */}
          {step === 'pay' && (
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
                <h2>Thanh toán</h2>
              </div>

              <div className="pos-pay-amount-box">
                <span className="pos-pay-amount-label">Tổng thanh toán</span>
                <div className="pos-pay-amount-value">{money(total)}</div>
              </div>

              {/* 3 Payment Methods */}
              <div className="pos-method-cards">
                {(
                  [
                    ['cash', Wallet, 'Tiền mặt'],
                    ['card', CreditCard, 'Thẻ ngân hàng'],
                    ['transfer', QrCode, 'QR Code'],
                  ] as const
                ).map(([k, Icon, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`pos-method-card ${payMethod === k ? 'selected' : ''}`}
                    onClick={() => setPayMethod(k)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* QR Code view (SePay Gateway) */}
              {payMethod === 'transfer' && (
                <TransferPanel
                  booking={activeBooking}
                  bank={{
                    bin: data.config?.bankBin ?? '970422',
                    account: data.config?.bankAccount ?? '0877834888',
                    holder: data.config?.bankHolder ?? 'SAIGON INDOOR GOLF',
                  }}
                  fallbackAmount={total}
                  busy={saving}
                  onUse={(txId) => handleConfirmPayment(txId)}
                />
              )}

              {/* Cash view */}
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

              {/* Print Checkbox */}
              <label className="pos-print-checkbox">
                <input
                  type="checkbox"
                  checked={printReceipt}
                  onChange={(e) => setPrintReceipt(e.target.checked)}
                />
                <span>In hóa đơn sau khi xác nhận</span>
              </label>

              {notice && (
                <div className="error-box" role="status">
                  {notice}
                </div>
              )}

              {payMethod !== 'transfer' && (
                <button
                  type="button"
                  className="pos-btn-confirm-pay"
                  onClick={() => handleConfirmPayment()}
                  disabled={saving || !canPayNow}
                >
                  {saving ? 'Đang ghi nhận…' : 'Xác nhận thanh toán'}
                </button>
              )}

              {onOpenSession && (
                <button
                  type="button"
                  className="pos-btn-print"
                  onClick={() => onOpenSession(activeBooking)}
                  title="Giảm giá, gói hội viên, ví, chia tiền"
                >
                  <SlidersHorizontal size={16} />
                  <span>Giảm giá / gói hội viên / chia tiền</span>
                </button>
              )}

              {/* Bottom 1:1 Step Label */}
              <div style={{ textAlign: 'center' }}>
                <div className="pos-step-bottom-badge">
                  <span className="pos-step-bottom-num">3</span>
                  <span className="pos-step-bottom-text">Thanh toán</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: HOÀN TẤT & IN HÓA ĐƠN */}
          {step === 'done' && (
            <div className="pos-done-screen">
              <div className="pos-done-checkmark">
                <Check />
              </div>
              <h2 className="pos-done-title">Thanh toán thành công!</h2>

              <div className="pos-done-meta-box">
                <div className="pos-done-meta-row">
                  <span>Hóa đơn:</span>
                  <strong>{paid?.code || 'HD26879'}</strong>
                </div>
                <div className="pos-done-meta-row">
                  <span>Tổng tiền:</span>
                  <span className="pos-done-price">{money(paid?.total ?? total)}</span>
                </div>
                <div className="pos-done-meta-row">
                  <span>Hình thức:</span>
                  <strong>{paid?.method || PAY_LABEL[payMethod]}</strong>
                </div>
                <div className="pos-done-meta-row">
                  <span>Thời gian:</span>
                  <strong>
                    {new Date(paid?.at ?? Date.now()).toLocaleString('vi-VN', {
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
                  <span>Gửi hóa đơn (Zalo/Email)</span>
                </button>
                <button
                  type="button"
                  className="pos-btn-finish"
                  onClick={() => {
                    setActiveId(null);
                    setExtraItems([]);
                    setCustomDiscount(null);
                    setStep('map');
                  }}
                >
                  Hoàn tất
                </button>
              </div>

              {/* Bottom 1:1 Step Label */}
              <div style={{ textAlign: 'center' }}>
                <div className="pos-step-bottom-badge">
                  <span className="pos-step-bottom-num">4</span>
                  <span className="pos-step-bottom-text">Hoàn tất & In hóa đơn</span>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* =====================================================================
          VIEW MODE 2: MOBILE APP POS FLOW (6 interactive steps)
          ===================================================================== */}
      {viewMode === 'mobile' && (
        <main className="pos-flow-container">
          <div className="pos-mobile-section">
            {/* Left Info Sidebar */}
            <div className="pos-mobile-sidebar">
              <div className="pos-mobile-banner-title">
                <Smartphone size={28} color="#16a34a" />
                <div>
                  <h3>POS trên App Mobile</h3>
                  <small>(Dành cho nhân viên vận hành)</small>
                </div>
              </div>

              <div className="pos-mobile-checklist">
                <div className="pos-mobile-check-item">
                  <Check /> Xem trạng thái line
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Tạo hóa đơn nhanh
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Bán F&B & dịch vụ
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Thanh toán đa hình thức
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> In hoặc gửi hóa đơn
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Theo dõi doanh thu ca
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  CHỌN MÀN HÌNH XEM TRƯỚC:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {[
                    '1. Trang chủ POS',
                    '2. Danh sách line/phòng',
                    '3. Thêm dịch vụ & Tạm tính',
                    '4. Chọn sản phẩm, số lượng',
                    '5. Thanh toán',
                    '6. Hoàn tất',
                  ].map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      className={`pos-catalog-tab-btn ${mobileStep === idx + 1 ? 'active' : ''}`}
                      style={{ textAlign: 'left', padding: '8px 12px' }}
                      onClick={() => setMobileStep(idx + 1)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Frame Simulation */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="pos-phone-mockup" style={{ width: '340px' }}>
                <div className="pos-phone-notch">
                  <span>9:41</span>
                  <span>📶 🔋</span>
                </div>

                {/* Mobile Screen 1: Home */}
                {mobileStep === 1 && (
                  <div className="pos-phone-content">
                    <div
                      style={{
                        background: '#093824',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '13px', display: 'block' }}>Saigon Indoor Golf</strong>
                        <small style={{ fontSize: '10px', color: '#86efac' }}>POS Vận hành</small>
                      </div>
                      <span style={{ fontSize: '18px' }}>🔔</span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px',
                        marginTop: '10px',
                      }}
                    >
                      {[
                        { title: 'Sơ đồ line', icon: '⛳', step: 2 },
                        { title: 'Bán hàng', icon: '🛒', step: 3 },
                        { title: 'Hóa đơn', icon: '📄', step: 5 },
                        { title: 'Đặt sân', icon: '📅', step: 2 },
                        { title: 'Khách hàng', icon: '👥', step: 3 },
                        { title: 'Báo cáo', icon: '📊', step: 1 },
                      ].map((t) => (
                        <button
                          key={t.title}
                          type="button"
                          onClick={() => setMobileStep(t.step)}
                          style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '14px 10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>{t.icon}</div>
                          <strong style={{ fontSize: '12px', color: '#0f172a' }}>{t.title}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Screen 2: Lines */}
                {mobileStep === 2 && (
                  <div className="pos-phone-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setMobileStep(1)}
                        style={{ border: 'none', background: 'none' }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <strong style={{ fontSize: '14px' }}>Sơ đồ line</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0' }}>
                      <span className="pos-filter-btn active" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Tất cả 12
                      </span>
                      <span className="pos-filter-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Đang chơi 4
                      </span>
                      <span className="pos-filter-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Trống 5
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { name: 'L1', state: 'playing', text: 'Đang chơi · 45p' },
                        { name: 'L2', state: 'empty', text: 'Trống' },
                        { name: 'L3', state: 'playing', text: 'Đang chơi · 30p' },
                        { name: 'L4', state: 'maintenance', text: 'Bảo trì đến 16:00' },
                      ].map((l) => (
                        <div
                          key={l.name}
                          onClick={() => setMobileStep(3)}
                          style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <strong>{l.name}</strong>
                          <span
                            className={`pos-status-tag ${
                              l.state === 'playing'
                                ? 'pos-state-playing'
                                : l.state === 'maintenance'
                                  ? 'pos-state-maintenance'
                                  : 'pos-state-empty'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {l.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Screen 3: Order Details */}
                {mobileStep === 3 && (
                  <div className="pos-phone-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setMobileStep(2)}
                        style={{ border: 'none', background: 'none' }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <strong style={{ fontSize: '14px' }}>Bán hàng – L3</strong>
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '10px' }}>
                      <strong style={{ fontSize: '13px' }}>Nguyễn Hoàng Long</strong>
                      <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>
                        Hội viên Gold
                      </small>
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Chơi golf (giờ)</span>
                        <strong>350.000 đ</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nước suối x2</span>
                        <strong>40.000 đ</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileStep(4)}
                      className="pos-btn-extend"
                      style={{ justifyContent: 'center', padding: '10px' }}
                    >
                      + Thêm sản phẩm / dịch vụ
                    </button>

                    <div style={{ marginTop: 'auto', background: '#fff', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Tạm tính</span>
                        <span>390.000 đ</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 700,
                          fontSize: '15px',
                          color: '#16a34a',
                          marginTop: '4px',
                        }}
                      >
                        <span>Tổng thanh toán</span>
                        <span>390.000 đ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileStep(5)}
                        className="pos-btn-checkout"
                        style={{ padding: '10px', marginTop: '10px' }}
                      >
                        Thanh toán
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile Screen 4: Product Selection */}
                {mobileStep === 4 && (
                  <div className="pos-phone-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setMobileStep(3)}
                        style={{ border: 'none', background: 'none' }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <strong style={{ fontSize: '14px' }}>Thêm sản phẩm</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                      <span className="pos-catalog-tab-btn active" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        F&B
                      </span>
                      <span className="pos-catalog-tab-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Dịch vụ
                      </span>
                      <span className="pos-catalog-tab-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        Phụ kiện
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                      {[
                        { name: 'Nước suối', price: '20.000 đ', qty: 2 },
                        { name: 'Cà phê', price: '45.000 đ', qty: 0 },
                        { name: 'Bánh sandwich', price: '60.000 đ', qty: 0 },
                        { name: 'Nước ép', price: '55.000 đ', qty: 0 },
                      ].map((item) => (
                        <div
                          key={item.name}
                          style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '12px', display: 'block' }}>{item.name}</strong>
                            <small style={{ color: '#16a34a', fontWeight: 600 }}>{item.price}</small>
                          </div>
                          {item.qty > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '12px', fontWeight: 700 }}>{item.qty}</span>
                              <button
                                type="button"
                                style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#16a34a', color: '#fff' }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: '#16a34a', color: '#fff' }}
                            >
                              +
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileStep(3)}
                      className="pos-btn-checkout"
                      style={{ padding: '10px', marginTop: 'auto' }}
                    >
                      Thêm vào hóa đơn (2) · 40.000 đ
                    </button>
                  </div>
                )}

                {/* Mobile Screen 5: Payment */}
                {mobileStep === 5 && (
                  <div className="pos-phone-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setMobileStep(3)}
                        style={{ border: 'none', background: 'none' }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <strong style={{ fontSize: '14px' }}>Thanh toán</strong>
                    </div>

                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <small style={{ color: '#64748b' }}>Tổng thanh toán</small>
                      <h3 style={{ color: '#16a34a', margin: '4px 0', fontSize: '24px' }}>390.000 đ</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {['Tiền mặt', 'Thẻ ngân hàng', 'QR Code'].map((m, i) => (
                        <div
                          key={m}
                          style={{
                            background: '#fff',
                            border: i === 0 ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ color: i === 0 ? '#16a34a' : '#64748b' }}>{i === 0 ? '◉' : '○'}</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Khách đưa:</span>
                        <strong>500.000 đ</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                        <span>Tiền thối lại:</span>
                        <span>110.000 đ</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileStep(6)}
                      className="pos-btn-checkout"
                      style={{ padding: '10px', marginTop: 'auto' }}
                    >
                      Xác nhận thanh toán
                    </button>
                  </div>
                )}

                {/* Mobile Screen 6: Done */}
                {mobileStep === 6 && (
                  <div className="pos-phone-content" style={{ textAlign: 'center', padding: '20px 10px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: '#16a34a',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '10px auto',
                      }}
                    >
                      <Check size={28} />
                    </div>
                    <strong style={{ fontSize: '16px', display: 'block' }}>Thanh toán thành công!</strong>

                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '10px',
                        padding: '10px',
                        margin: '14px 0',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Hóa đơn:</span>
                        <strong>HD26879</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tổng tiền:</span>
                        <strong style={{ color: '#16a34a' }}>390.000 đ</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="pos-btn-print"
                      style={{ padding: '8px', fontSize: '12px', marginBottom: '8px' }}
                      onClick={printNow}
                    >
                      <Printer size={14} /> In hóa đơn
                    </button>
                    <button
                      type="button"
                      className="pos-btn-zalo"
                      style={{ padding: '8px', fontSize: '12px', marginBottom: '8px' }}
                      onClick={sendZalo}
                    >
                      <Send size={14} /> Gửi hóa đơn (Zalo/Email)
                    </button>
                    <button
                      type="button"
                      className="pos-btn-finish"
                      style={{ padding: '8px', fontSize: '13px' }}
                      onClick={() => setMobileStep(1)}
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}

                <div className="pos-phone-footer-label">
                  <span>Màn hình {mobileStep}/6</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          VIEW MODE 3: 1:1 INFOGRAPHIC OVERVIEW FLOW (Multi-frame showcase)
          ===================================================================== */}
      {viewMode === 'overview' && (
        <main className="pos-infographic-wrap">
          {/* Row 1: 4 Desktop Screens Connected by Arrows */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#093824', marginBottom: '14px' }}>
              Quy trình POS trên Máy tính (Desktop 4 bước)
            </h3>
            <div className="pos-desktop-flow-row">
              {/* Card 1: Sơ đồ line/phòng */}
              <div
                className="pos-frame-card"
                onClick={() => {
                  setViewMode('desktop');
                  setStep('map');
                }}
              >
                <div className="pos-frame-header">
                  <div className="pos-frame-dots">
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                  </div>
                  <span className="pos-frame-title">POS – Sơ đồ line/phòng</span>
                </div>
                <div className="pos-frame-body">
                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', fontSize: '10px' }}>
                    <span className="pos-filter-btn active" style={{ padding: '3px 8px', fontSize: '10px' }}>
                      Tất cả (12)
                    </span>
                    <span className="pos-filter-btn" style={{ padding: '3px 8px', fontSize: '10px' }}>
                      Đang chơi (4)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    <div style={{ background: '#f0fdf4', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <strong>L1</strong> · <span style={{ color: '#16a34a' }}>Đang chơi (45p)</span>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <strong>L2</strong> · <span style={{ color: '#64748b' }}>Trống</span>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <strong>L3</strong> · <span style={{ color: '#16a34a' }}>Đang chơi (30p)</span>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <strong>L4</strong> · <span style={{ color: '#ef4444' }}>Bảo trì</span>
                    </div>
                  </div>
                </div>
                <div className="pos-frame-footer">
                  <span className="pos-step-bottom-num" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                    1
                  </span>
                  <strong style={{ fontSize: '12px' }}>Tổng quan & Sơ đồ line/phòng</strong>
                </div>
                <div className="pos-frame-arrow">→</div>
              </div>

              {/* Card 2: Tạo hóa đơn & thêm dịch vụ */}
              <div
                className="pos-frame-card"
                onClick={() => {
                  setViewMode('desktop');
                  setStep('order');
                }}
              >
                <div className="pos-frame-header">
                  <div className="pos-frame-dots">
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                  </div>
                  <span className="pos-frame-title">Bán hàng – L3</span>
                </div>
                <div className="pos-frame-body">
                  <div style={{ background: '#f0fdf4', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                    <small style={{ color: '#166534', fontSize: '10px' }}>Thời gian chơi</small>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#15803d', fontSize: '18px' }}>
                      00:45:12
                    </div>
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>Chơi golf (giờ)</span>
                      <strong>350.000 đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>Nước suối x2</span>
                      <strong>40.000 đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>Bánh sandwich</span>
                      <strong>60.000 đ</strong>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      borderTop: '1px dashed #cbd5e1',
                      paddingTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      color: '#16a34a',
                      fontSize: '13px',
                    }}
                  >
                    <span>Tổng:</span>
                    <span>450.000 đ</span>
                  </div>
                </div>
                <div className="pos-frame-footer">
                  <span className="pos-step-bottom-num" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                    2
                  </span>
                  <strong style={{ fontSize: '12px' }}>Tạo hóa đơn & F&B</strong>
                </div>
                <div className="pos-frame-arrow">→</div>
              </div>

              {/* Card 3: Thanh toán */}
              <div
                className="pos-frame-card"
                onClick={() => {
                  setViewMode('desktop');
                  setStep('pay');
                }}
              >
                <div className="pos-frame-header">
                  <div className="pos-frame-dots">
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                  </div>
                  <span className="pos-frame-title">Thanh toán</span>
                </div>
                <div className="pos-frame-body" style={{ textAlign: 'center' }}>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>Tổng thanh toán</small>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', margin: '6px 0' }}>
                    450.000 đ
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '10px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', padding: '6px 2px', borderRadius: '6px' }}>
                      Tiền mặt
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 2px', borderRadius: '6px' }}>
                      Thẻ NH
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 2px', borderRadius: '6px' }}>
                      QR Code
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', textAlign: 'left', background: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Khách đưa:</span>
                      <strong>500.000 đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                      <span>Tiền thối lại:</span>
                      <span>50.000 đ</span>
                    </div>
                  </div>
                </div>
                <div className="pos-frame-footer">
                  <span className="pos-step-bottom-num" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                    3
                  </span>
                  <strong style={{ fontSize: '12px' }}>Thanh toán</strong>
                </div>
                <div className="pos-frame-arrow">→</div>
              </div>

              {/* Card 4: Hoàn tất */}
              <div
                className="pos-frame-card"
                onClick={() => {
                  setViewMode('desktop');
                  setStep('done');
                }}
              >
                <div className="pos-frame-header">
                  <div className="pos-frame-dots">
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                    <div className="pos-frame-dot" />
                  </div>
                  <span className="pos-frame-title">Hoàn tất & In</span>
                </div>
                <div className="pos-frame-body" style={{ textAlign: 'center', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#16a34a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px',
                    }}
                  >
                    <Check size={24} />
                  </div>
                  <strong style={{ fontSize: '14px', display: 'block' }}>Thanh toán thành công!</strong>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    Hóa đơn: <strong>HD26879</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700 }}>450.000 đ</div>
                </div>
                <div className="pos-frame-footer">
                  <span className="pos-step-bottom-num" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                    4
                  </span>
                  <strong style={{ fontSize: '12px' }}>Hoàn tất & In hóa đơn</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Mobile Flow Connected */}
          <div className="pos-mobile-section" style={{ marginTop: '20px' }}>
            <div className="pos-mobile-sidebar">
              <div className="pos-mobile-banner-title">
                <Smartphone size={28} color="#16a34a" />
                <div>
                  <h3>POS trên App Mobile</h3>
                  <small>(Dành cho nhân viên vận hành)</small>
                </div>
              </div>

              <div className="pos-mobile-checklist">
                <div className="pos-mobile-check-item">
                  <Check /> Xem trạng thái line
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Tạo hóa đơn nhanh
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Bán F&B & dịch vụ
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Thanh toán đa hình thức
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> In hoặc gửi hóa đơn
                </div>
                <div className="pos-mobile-check-item">
                  <Check /> Theo dõi doanh thu ca
                </div>
              </div>
            </div>

            <div className="pos-mobile-screens-row">
              {[
                { num: 1, title: 'Trang chủ POS', icon: '🏠', desc: 'Menu chức năng nhanh' },
                { num: 2, title: 'Danh sách line', icon: '⛳', desc: 'Trạng thái L1–L10, VIP' },
                { num: 3, title: 'Thêm dịch vụ', icon: '📝', desc: 'Giờ chơi & Tạm tính' },
                { num: 4, title: 'Chọn sản phẩm', icon: '🛒', desc: 'F&B, Dịch vụ, Phụ kiện' },
                { num: 5, title: 'Thanh toán', icon: '💳', desc: 'Tiền mặt, Thẻ, QR' },
                { num: 6, title: 'Hoàn tất', icon: '✅', desc: 'In & gửi hóa đơn' },
              ].map((m) => (
                <div
                  key={m.num}
                  className="pos-phone-mockup"
                  style={{ minHeight: '260px' }}
                  onClick={() => {
                    setViewMode('mobile');
                    setMobileStep(m.num);
                  }}
                >
                  <div className="pos-phone-notch">
                    <span>9:41</span>
                    <span>🔋</span>
                  </div>
                  <div className="pos-phone-content" style={{ textAlign: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{m.icon}</div>
                    <strong style={{ fontSize: '12px' }}>{m.title}</strong>
                    <small style={{ fontSize: '10px', color: '#64748b' }}>{m.desc}</small>
                  </div>
                  <div className="pos-phone-footer-label">
                    <span className="pos-step-bottom-num" style={{ width: '16px', height: '16px', fontSize: '9px' }}>
                      {m.num}
                    </span>
                    <span>{m.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          MODALS
          ===================================================================== */}
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
                <h3 className="ar-modal-header-title">
                  Vào chơi ngay – {rooms.find((r) => r.id === walkInModal)?.name}
                </h3>
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
                  placeholder="Nguyễn Hoàng Long"
                />
              </div>
              <div className="ar-field">
                <label>Số điện thoại</label>
                <input
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="0902 030 165"
                />
              </div>
            </div>
            <div className="ar-modal-footer">
              <button type="button" className="ar-btn-secondary" onClick={() => setWalkInModal(null)}>
                Hủy
              </button>
              <button type="button" className="ar-btn-primary" onClick={handleQuickStartWalkIn}>
                Bắt đầu & Bán hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
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
            <div className="ar-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

      {/* Edit Customer Modal */}
      {editCustomerModal && (
        <div className="ar-settings-modal-backdrop" onClick={() => setEditCustomerModal(false)}>
          <div
            className="ar-settings-modal"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ar-modal-header">
              <h3 className="ar-modal-header-title">Cập nhật thông tin khách</h3>
              <button className="ar-modal-close-btn" onClick={() => setEditCustomerModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ar-modal-body">
              <div className="ar-field">
                <label>Họ và tên</label>
                <input
                  value={custNameInput}
                  onChange={(e) => setCustNameInput(e.target.value)}
                  placeholder="Nguyễn Hoàng Long"
                />
              </div>
              <div className="ar-field">
                <label>Số điện thoại</label>
                <input
                  value={custPhoneInput}
                  onChange={(e) => setCustPhoneInput(e.target.value)}
                  placeholder="0902 030 165"
                />
              </div>
            </div>
            <div className="ar-modal-footer">
              <button type="button" className="ar-btn-secondary" onClick={() => setEditCustomerModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="ar-btn-primary"
                onClick={() => {
                  if (b) {
                    b.customer = custNameInput.trim() || b.customer;
                    b.phone = custPhoneInput.trim() || b.phone;
                  }
                  setEditCustomerModal(false);
                }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Open / Close / Cash In-Out Modal (P0) */}
      {shiftModal && (
        <div className="ar-settings-modal-backdrop" onClick={() => setShiftModal(null)}>
          <div
            className="ar-settings-modal"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ar-modal-header">
              <div className="ar-modal-header-left">
                <Banknote size={20} color="#16a34a" />
                <h3 className="ar-modal-header-title">
                  {shiftModal === 'open'
                    ? 'Mở ca thu ngân mới'
                    : shiftModal === 'close'
                      ? 'Đóng & Bàn giao ca'
                      : shiftModal === 'cash-in'
                        ? 'Nạp tiền vào quỹ ca'
                        : 'Rút chi tiền mặt từ ca'}
                </h3>
              </div>
              <button className="ar-modal-close-btn" onClick={() => setShiftModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ar-modal-body">
              {shiftModal === 'open' && (
                <>
                  <div className="ar-field">
                    <label>Tên ca làm việc</label>
                    <input
                      value={shiftNameInput}
                      onChange={(e) => setShiftNameInput(e.target.value)}
                      placeholder="VD: Ca sáng (06:00 - 14:00)"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Tiền thối ban đầu trong két (₫)</label>
                    <input
                      inputMode="numeric"
                      value={shiftCashInput}
                      onChange={(e) => setShiftCashInput(e.target.value)}
                      placeholder="1.000.000"
                    />
                  </div>
                  <div className="pos-discount-chips" style={{ marginTop: '6px' }}>
                    {['500000', '1000000', '2000000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`pos-discount-chip ${shiftCashInput === amt ? 'active' : ''}`}
                        onClick={() => setShiftCashInput(amt)}
                      >
                        {money(Number(amt))}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {shiftModal === 'close' && (
                <>
                  <div className="ar-field">
                    <label>Tiền mặt thực đếm trong két (₫)</label>
                    <input
                      inputMode="numeric"
                      value={closeCountedCash}
                      onChange={(e) => setCloseCountedCash(e.target.value)}
                      placeholder="Nhập tổng tiền mặt thực tế"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Tiền chuyển khoản thực nhận (₫)</label>
                    <input
                      inputMode="numeric"
                      value={closeCountedTransfer}
                      onChange={(e) => setCloseCountedTransfer(e.target.value)}
                      placeholder="Theo sao kê tài khoản ngân hàng"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Tiền cà thẻ POS thực nhận (₫)</label>
                    <input
                      inputMode="numeric"
                      value={closeCountedCard}
                      onChange={(e) => setCloseCountedCard(e.target.value)}
                      placeholder="Theo bill tổng kết máy cà thẻ"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Ghi chú bàn giao</label>
                    <input
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      placeholder="Ghi chú thừa/thiếu tiền (nếu có)"
                    />
                  </div>
                </>
              )}

              {(shiftModal === 'cash-in' || shiftModal === 'cash-out') && (
                <>
                  <div className="ar-field">
                    <label>Số tiền (₫)</label>
                    <input
                      inputMode="numeric"
                      value={cashEntryAmount}
                      onChange={(e) => setCashEntryAmount(e.target.value)}
                      placeholder="VD: 200.000"
                    />
                  </div>
                  <div className="ar-field">
                    <label>Lý do {shiftModal === 'cash-in' ? 'nạp tiền' : 'rút tiền'}</label>
                    <input
                      value={cashEntryNote}
                      onChange={(e) => setCashEntryNote(e.target.value)}
                      placeholder={
                        shiftModal === 'cash-in'
                          ? 'Đổi tiền lẻ nạp thêm vào két'
                          : 'Chi mua đá lạnh, văn phòng phẩm...'
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="ar-modal-footer">
              <button type="button" className="ar-btn-secondary" onClick={() => setShiftModal(null)}>
                Hủy
              </button>
              {shiftModal === 'open' && (
                <button type="button" className="ar-btn-primary" onClick={handleOpenShift} disabled={saving}>
                  Xác nhận Mở ca
                </button>
              )}
              {shiftModal === 'close' && (
                <button
                  type="button"
                  className="ar-btn-primary"
                  style={{ background: '#dc2626' }}
                  onClick={handleCloseShift}
                  disabled={saving}
                >
                  Xác nhận Đóng ca & Bàn giao
                </button>
              )}
              {(shiftModal === 'cash-in' || shiftModal === 'cash-out') && (
                <button
                  type="button"
                  className="ar-btn-primary"
                  onClick={() => handleCashEntry(shiftModal === 'cash-in' ? 'in' : 'out')}
                  disabled={saving}
                >
                  Ghi nhận quỹ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discount & Voucher Modal (P0) */}
      {discountModal && (
        <div className="ar-settings-modal-backdrop" onClick={() => setDiscountModal(false)}>
          <div
            className="ar-settings-modal"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ar-modal-header">
              <div className="ar-modal-header-left">
                <Tag size={20} color="#0284c7" />
                <h3 className="ar-modal-header-title">Áp dụng Giảm giá / Voucher</h3>
              </div>
              <button className="ar-modal-close-btn" onClick={() => setDiscountModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ar-modal-body">
              <div className="ar-field">
                <label>Mã Voucher / Coupon</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    placeholder="VD: GOLF10, VIPGOLF, KHAI_TRUONG"
                  />
                  <button
                    type="button"
                    className="ar-btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (voucherCodeInput === 'VIPGOLF' || voucherCodeInput === 'GOLF10') {
                        const disc = discountFromPercent(subtotal, 10);
                        setDiscountValInput(String(disc));
                        setDiscountReasonInput(`Voucher ${voucherCodeInput} (−10%)`);
                      } else if (voucherCodeInput === 'KHAI_TRUONG' || voucherCodeInput === 'GOLF20') {
                        const disc = discountFromPercent(subtotal, 20);
                        setDiscountValInput(String(disc));
                        setDiscountReasonInput(`Voucher ${voucherCodeInput} (−20%)`);
                      } else {
                        setDiscountValInput('50000');
                        setDiscountReasonInput(`Voucher ${voucherCodeInput || 'Ưu đãi'}`);
                      }
                    }}
                  >
                    Kiểm tra
                  </button>
                </div>
              </div>

              <div style={{ margin: '10px 0' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Chọn nhanh mức giảm giá (% hoặc ₫):
                </label>
                <div className="pos-discount-chips">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className="pos-discount-chip"
                      onClick={() => {
                        const amt = discountFromPercent(subtotal, pct);
                        setDiscountValInput(String(amt));
                        setDiscountReasonInput(`Giảm ${pct}% tổng bill`);
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                  {['50000', '100000', '200000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="pos-discount-chip"
                      onClick={() => {
                        setDiscountValInput(amt);
                        setDiscountReasonInput(`Giảm ${money(Number(amt))}`);
                      }}
                    >
                      −{money(Number(amt))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ar-field">
                <label>Số tiền giảm thực tế (₫)</label>
                <input
                  inputMode="numeric"
                  value={discountValInput}
                  onChange={(e) => setDiscountValInput(e.target.value)}
                  placeholder="VD: 50.000"
                />
              </div>

              <div className="ar-field">
                <label>Lý do giảm giá</label>
                <input
                  value={discountReasonInput}
                  onChange={(e) => setDiscountReasonInput(e.target.value)}
                  placeholder="Khách VIP / Khai trương / Người quen"
                />
              </div>
            </div>

            <div className="ar-modal-footer">
              {customDiscount && (
                <button
                  type="button"
                  className="ar-btn-secondary"
                  style={{ color: '#dc2626', marginRight: 'auto' }}
                  onClick={() => {
                    setCustomDiscount(null);
                    setDiscountModal(false);
                  }}
                >
                  Hủy giảm giá
                </button>
              )}
              <button type="button" className="ar-btn-secondary" onClick={() => setDiscountModal(false)}>
                Đóng
              </button>
              <button
                type="button"
                className="ar-btn-primary"
                onClick={() => {
                  const amt = Number(discountValInput.replace(/\D/g, '')) || 0;
                  handleApplyDiscount(amt, discountReasonInput);
                }}
                disabled={saving}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer-Facing Display (Dual Screen) Modal */}
      {showCustomerDisplay && (
        <div className="pos-customer-display-overlay" onClick={() => setShowCustomerDisplay(false)}>
          <div className="pos-customer-display-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-cd-header">
              <div className="pos-cd-brand">
                <div
                  className="pos-brand-badge"
                  style={{ width: '38px', height: '38px', fontSize: '18px' }}
                >
                  SG
                </div>
                <div>
                  <h2>Saigon Indoor Golf Club</h2>
                  <div style={{ fontSize: '12.5px', opacity: 0.9 }}>
                    Phòng: <strong>{room?.name ?? activeBooking.room}</strong> · Khách hàng:{' '}
                    <strong>{activeBooking.customer}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=900,height=700');
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>Màn hình khách hàng - Saigon Indoor Golf Club</title>
                            <style>
                              body { font-family: sans-serif; margin: 0; padding: 24px; background: #f8fafc; }
                              .header { background: #093824; color: #fff; padding: 16px 24px; border-radius: 12px; }
                              .content { display: flex; gap: 24px; margin-top: 24px; }
                              .left { flex: 1; background: #fff; padding: 20px; border-radius: 12px; }
                              .right { width: 340px; background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
                              .total { font-size: 36px; font-weight: 800; color: #16a34a; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h2>Saigon Indoor Golf Club</h2>
                              <div>Phòng: ${room?.name ?? activeBooking.room} | Khách: ${activeBooking.customer}</div>
                            </div>
                            <div class="content">
                              <div class="left">
                                <h3>Dịch vụ sử dụng</h3>
                                <p>• ${SERVICE_LABEL[activeBooking.service] ?? 'Chơi golf'}: ${money(golfBaseTotal)}</p>
                                ${extraItems.map((x) => `<p>• ${x.name} x${x.qty}: ${money(x.price * x.qty)}</p>`).join('')}
                                <hr style="margin: 16px 0; border: 0; border-top: 1px solid #eee;" />
                                ${discountAmount > 0 ? `<p style="color: #16a34a;">Giảm giá: -${money(discountAmount)}</p>` : ''}
                                <h3>Tổng cộng: ${money(total)}</h3>
                              </div>
                              <div class="right">
                                <h4>QUÉT MÃ VIETQR THANH TOÁN</h4>
                                <div class="total">${money(total)}</div>
                              </div>
                            </div>
                          </body>
                        </html>
                      `);
                    }
                  }}
                >
                  Mở tab riêng (Dual Screen)
                </button>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  onClick={() => setShowCustomerDisplay(false)}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="pos-cd-body">
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    marginBottom: '14px',
                    color: '#1e293b',
                  }}
                >
                  Chi tiết hóa đơn dịch vụ
                </h3>
                <table className="pos-cd-items-table">
                  <thead>
                    <tr>
                      <th>Dịch vụ / Sản phẩm</th>
                      <th style={{ textAlign: 'center' }}>SL</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>
                        {SERVICE_LABEL[activeBooking.service] ?? 'Chơi golf (giờ)'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {activeBooking.service === 'gdr' ? '1 giờ' : '1 lượt'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(golfBaseTotal)}</td>
                    </tr>
                    {foodLines.map(({ key, line }) => (
                      <tr key={key}>
                        <td>{line.name}</td>
                        <td style={{ textAlign: 'center' }}>x{line.qty}</td>
                        <td style={{ textAlign: 'right' }}>{money(line.total)}</td>
                      </tr>
                    ))}
                    {extraItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'center' }}>x{item.qty}</td>
                        <td style={{ textAlign: 'right' }}>{money(item.price * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    marginTop: '20px',
                    borderTop: '2px solid #f1f5f9',
                    paddingTop: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      color: '#64748b',
                    }}
                  >
                    <span>Tạm tính</span>
                    <span style={{ fontWeight: 600 }}>{money(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        color: '#16a34a',
                      }}
                    >
                      <span>Ưu đãi / Giảm giá</span>
                      <span style={{ fontWeight: 600 }}>−{money(discountAmount)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    <span>Tổng cần thanh toán</span>
                    <span style={{ color: '#16a34a', fontSize: '22px' }}>{money(total)}</span>
                  </div>
                </div>
              </div>

              <div className="pos-cd-qr-card">
                {paid ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}
                    >
                      <Check size={36} strokeWidth={3} />
                    </div>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#166534',
                        margin: '0 0 6px',
                      }}
                    >
                      THANH TOÁN THÀNH CÔNG!
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                      Cảm ơn Quý khách & Hẹn gặp lại!
                    </p>
                  </div>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: '#64748b',
                      }}
                    >
                      Quét mã VietQR chuyển khoản
                    </span>
                    <div className="pos-cd-qr-img" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#fff' }}>
                      <img
                        alt="Mã QR chuyển khoản VietQR"
                        style={{ width: '180px', height: '180px', objectFit: 'contain' }}
                        src={vietQrUrl({
                          bin: '970422',
                          account: '0902030165',
                          holder: 'SAIGON INDOOR GOLF',
                          amount: total,
                          note: paymentCode(activeBooking.id),
                        })}
                      />
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        Nội dung: <strong style={{ color: '#0f172a' }}>{paymentCode(activeBooking.id)}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Tổng số tiền</div>
                    <div className="pos-cd-total">{money(total)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                      Tự động xác nhận giao dịch trong 3-5 giây
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Simulator Modal */}
      {showBarcodeModal && (
        <div className="ar-settings-modal-backdrop" onClick={() => setShowBarcodeModal(false)}>
          <div
            className="ar-settings-modal"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ar-modal-header">
              <div className="ar-modal-header-left">
                <ScanBarcode size={20} color="#16a34a" />
                <h3 className="ar-modal-header-title">Quét mã vạch (Barcode Scanner)</h3>
              </div>
              <button className="ar-modal-close-btn" onClick={() => setShowBarcodeModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ar-modal-body">
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
                Hệ thống tự động nhận diện đầu đọc mã vạch USB / Bluetooth (F4 mở két, quét phím tự động). Hoặc bạn có thể thử quét nhanh bằng cách chọn mẫu bên dưới:
              </p>
              <div className="ar-field">
                <label>Nhập SKU hoặc mã vạch</label>
                <input
                  value={barcodeSimInput}
                  onChange={(e) => setBarcodeSimInput(e.target.value)}
                  placeholder="VD: 89345601"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const item = CATALOG_ITEMS.find(
                        (c) => c.sku === barcodeSimInput.trim() || c.id === barcodeSimInput.trim(),
                      );
                      if (item) {
                        playBeep();
                        handleAddCatalogItem(item);
                        setNotice(`Đã quét mã vạch: ${item.name} (+1)`);
                        setShowBarcodeModal(false);
                        setBarcodeSimInput('');
                      } else {
                        setNotice(`Không tìm thấy mã vạch: ${barcodeSimInput}`);
                      }
                    }
                  }}
                />
              </div>
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                  Mẫu mã vạch nhanh:
                </span>
                <div className="pos-discount-chips" style={{ marginTop: '6px' }}>
                  {CATALOG_ITEMS.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="pos-discount-chip"
                      onClick={() => {
                        playBeep();
                        handleAddCatalogItem(item);
                        setNotice(`Đã quét mã: ${item.name} (+1)`);
                        setShowBarcodeModal(false);
                      }}
                    >
                      {item.emoji} {item.name} ({item.sku})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="ar-modal-footer">
              <button
                type="button"
                className="ar-btn-secondary"
                onClick={() => setShowBarcodeModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="ar-btn-primary"
                onClick={() => {
                  const item = CATALOG_ITEMS.find(
                    (c) => c.sku === barcodeSimInput.trim() || c.id === barcodeSimInput.trim(),
                  );
                  if (item) {
                    playBeep();
                    handleAddCatalogItem(item);
                    setNotice(`Đã quét mã vạch: ${item.name} (+1)`);
                    setShowBarcodeModal(false);
                    setBarcodeSimInput('');
                  } else {
                    setNotice(`Không tìm thấy mã vạch: ${barcodeSimInput}`);
                  }
                }}
              >
                Quét ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
