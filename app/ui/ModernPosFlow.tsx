'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  Crown,
  Edit2,
  FileText,
  Flag,
  History,
  Home,
  Layers,
  LayoutGrid,
  Loader2,
  Minus,
  MoreHorizontal,
  Package,
  Pause,
  Percent,
  Play,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  Store,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { rooms, money, sessionQuote, minChargeOffer, MIN_HOURLY_CHARGE, type Booking, type BillPart, type Segment } from '../../lib/club';
import {
  operationKey,
  shiftTotals,
  reconciliation,
  type ShiftSummary,
  type Entry,
} from '../../lib/finance';
import { discountFromPercent, changeDue, type BillInfo } from '../../lib/billing';
import { packagePrice, selectRule, type Bill, type Service } from '../../lib/pricing';
import { askConfirm } from './kit';
import { foodLabels, type FoodLine, type MenuItem, type FoodOrder } from '../../lib/fnb';
import type { Data } from './shared';
import { time, date } from './shared';
import { roomInfo } from './widgets';
import { playedMs, clock } from './PosBoard';
import { useFood } from './SessionFood';
import { useBill, DiscountForm, RefundForm } from './BillTools';
import { TransferPanel } from './session/TransferPanel';
import { PackageRedeem } from './session/PackageRedeem';
import { SplitPay } from './session/SplitPay';
import {
  generateK80Html,
  generateKitchenTicketHtml,
  generateShiftZReportHtml,
  kickCashDrawer,
  printK80Receipt,
  sendBillImageToZalo,
} from '../../lib/thermal-receipt';
import { useServiceCalls } from './useServiceCalls';
import { ServiceCallBanner } from './ServiceCallBanner';
import { ServiceCallDrawer } from './ServiceCallDrawer';
import '../pos-flow.css';

export type MobileScreenId =
  | 'M01' // Trang chủ POS
  | 'M02' // Sơ đồ line/phòng
  | 'M03' // Chi tiết phiên chơi
  | 'M04' // Nhận khách/Bắt đầu chơi
  | 'M05' // Bán hàng và dịch vụ
  | 'M06' // Giỏ hàng/Hóa đơn
  | 'M07' // Thanh toán
  | 'M08' // Hoàn tất
  | 'M09' // Quản lý ca
  | 'M10'; // Lịch sử giao dịch

type MobileBottomTab = 'pos' | 'bookings' | 'orders' | 'customers' | 'more';
type DesktopPanelMode = 'overview' | 'checkin' | 'catalog' | 'payment' | 'receipt';
type DesktopDrawer = 'shift' | 'history' | null;
type PayMethod = 'cash' | 'transfer' | 'card' | 'wallet' | 'package' | 'split';
type CatalogCategory = 'all' | 'fnb' | 'accessory' | 'service' | 'package';

interface CatalogProduct {
  id: string;
  name: string;
  category: Exclude<CatalogCategory, 'all'>;
  price: number;
  unit: string;
  sku: string;
  menuItem?: MenuItem;
}

const SERVICE_LABEL: Record<string, string> = {
  gdr: 'Luyện tập theo giờ',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};

/** Hourly part: time ranges and minutes; game part: the whole-round label. */
function partDetail(part: BillPart) {
  return part.lines
    .map((l) =>
      l.package || l.from == null || l.to == null
        ? l.label
        : `${time(l.from)}–${time(l.to)} (${Math.round(l.minutes)}p)`,
    )
    .join(' · ');
}

/**
 * Golf charge of a session. After switching between practice and a game, every service stays on the
 * same bill: one row per service with its own amount, then service fee and VAT on the combined total.
 */
function GolfFeeRows({
  bill,
  service,
  total,
  fallback,
  variant,
}: {
  bill: Bill & { parts?: BillPart[] };
  service: string;
  total: number;
  fallback: string;
  variant: 'used' | 'line';
}) {
  const rowClass = variant === 'used' ? 'pos-m3-used-row golf' : 'pos-m3-line-item';
  const parts = bill.parts ?? [];
  if (parts.length < 2) {
    return (
      <div className={rowClass}>
        <div>
          <strong>Phí chơi Golf ({SERVICE_LABEL[service] || service})</strong>
          <small>
            {bill.lines.length > 0
              ? bill.lines.map((l) => (l.package ? l.label : `${l.label} (${l.minutes < 1 ? '< 1p' : `${Math.round(l.minutes)}p`})`)).join(' · ')
              : fallback}
          </small>
        </div>
        <strong>{money(total)}</strong>
      </div>
    );
  }
  const subtotal = parts.reduce((n, p) => n + p.subtotal, 0);
  const extra = total - subtotal;
  return (
    <>
      {parts.map((p, i) => (
        <div key={`${p.service}-${i}`} className={rowClass}>
          <div>
            <strong>
              {i + 1}. {p.label}
            </strong>
            <small>{partDetail(p)}</small>
          </div>
          <strong>{money(p.subtotal)}</strong>
        </div>
      ))}
      {extra !== 0 && (
        <div className={rowClass}>
          <div>
            <strong>Phí dịch vụ & VAT</strong>
            <small>Tính trên tổng các dịch vụ trên</small>
          </div>
          <strong>{money(extra)}</strong>
        </div>
      )}
    </>
  );
}

const PAY_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản / QR SePay',
  card: 'Thẻ ngân hàng (POS)',
  wallet: 'Ví hội viên',
  package: 'Thẻ giờ hội viên',
  split: 'Thanh toán kết hợp',
};

interface CartLine {
  product: CatalogProduct;
  qty: number;
  note: string;
}

interface CustomerDirectoryItem {
  id: string;
  name: string;
  phone: string;
  code?: string;
  tier?: string;
  active_packages?: number;
  wallet_balance?: number;
}

interface FinanceOverviewData {
  shifts: ShiftSummary[];
  selectedId: string | null;
  entries: Entry[];
}

export function ModernPosFlow({
  data,
  canSeeMoney = true,
  onGo,
  onMutate,
  onRefresh,
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

  // Responsive viewport detection (Desktop >= 1024px vs Mobile < 1024px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Selected room & active booking
  const [selectedRoomId, setSelectedRoomId] = useState<string>('line-1');
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // Desktop Panel Mode & Drawers (Single-screen workflow without page reload)
  const [desktopMode, setDesktopMode] = useState<DesktopPanelMode>('overview');
  const [desktopDrawer, setDesktopDrawer] = useState<DesktopDrawer>(null);
  // Esc closes the shift / history drawer.
  useEffect(() => {
    if (!desktopDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDesktopDrawer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [desktopDrawer]);

  // Mobile Screen Navigation (M01 - M10) & Bottom Tab
  const [mobileScreen, setMobileScreen] = useState<MobileScreenId>('M01');
  const [mobileTab, setMobileTab] = useState<MobileBottomTab>('pos');

  // Room filter & search
  const [roomFilter, setRoomFilter] = useState<'all' | 'playing' | 'empty' | 'booked' | 'due' | 'maintenance'>('all');
  const [roomSearch, setRoomSearch] = useState('');

  // Check-in / Walk-in form state (M04 & Desktop Check-in)
  const [checkInRoomId, setCheckInRoomId] = useState<string>('line-1');
  const [checkInCustomer, setCheckInCustomer] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');
  const [checkInPeople, setCheckInPeople] = useState(1);
  const [checkInService, setCheckInService] = useState<'gdr' | '9' | '18'>('gdr');
  const [checkInDuration, setCheckInDuration] = useState(60);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customersList, setCustomersList] = useState<CustomerDirectoryItem[]>([]);

  // Catalog & Cart state (M05 & M06)
  const [catalogCat, setCatalogCat] = useState<CatalogCategory>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [autoServeAtCounter, setAutoServeAtCounter] = useState(true);
  const [editingNoteProductId, setEditingNoteProductId] = useState<string | null>(null);

  // Payment state (M07 & M08)
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  // Bookings whose short hourly charge staff chose to keep as it is (no raise to the minimum).
  const [keepShort, setKeepShort] = useState<Set<string>>(new Set());
  const [tendered, setTendered] = useState('');
  const [vatInvoice, setVatInvoice] = useState(false);
  const [vatCompany, setVatCompany] = useState('');
  const [vatTaxCode, setVatTaxCode] = useState('');
  const [printOnConfirm, setPrintOnConfirm] = useState(true);
  const [lastReceipt, setLastReceipt] = useState<{
    bookingId: string;
    code: string;
    roomName: string;
    customer: string;
    phone: string;
    total: number;
    methodLabel: string;
    at: number;
    cashier: string;
  } | null>(null);
  const [lastReceiptBooking, setLastReceiptBooking] = useState<Booking | null>(null);
  const payKey = useRef(operationKey());

  // Shift Management state (M09)
  const [financeData, setFinanceData] = useState<FinanceOverviewData | null>(null);
  const [shiftSubModal, setShiftSubModal] = useState<'open' | 'cash_in' | 'cash_out' | 'close' | null>(null);
  const [shiftNameInput, setShiftNameInput] = useState('Ca sáng (06:00 - 14:00)');
  const [shiftOpeningCash, setShiftOpeningCash] = useState('1000000');
  const [cashEntryAmount, setCashEntryAmount] = useState('');
  const [cashEntryNote, setCashEntryNote] = useState('');
  const [closeCountedCash, setCloseCountedCash] = useState('');
  const [closeCountedTransfer, setCloseCountedTransfer] = useState('');
  const [closeCountedCard, setCloseCountedCard] = useState('');
  const [closeNote, setCloseNote] = useState('');

  // Transaction History state (M10)
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'paid' | 'finished' | 'cancelled'>('all');
  const [selectedHistoryBookingId, setSelectedHistoryBookingId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Header Notification Popover
  const [showBellPopover, setShowBellPopover] = useState(false);

  // Service Call Management (Gọi phục vụ trực tuyến)
  const serviceCallState = useServiceCalls();
  const [showServiceCallDrawer, setShowServiceCallDrawer] = useState(false);

  // General busy & feedback state
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Khóa mốc thời gian ngay lập tức khi bấm Kết thúc (ngăn đồng hồ nhảy giây trong lúc chờ mạng)
  const [frozenBookingTimes, setFrozenBookingTimes] = useState<Record<string, number>>({});

  // Barcode scanner listener
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Derive room statuses from live bookings & maintenance
  const roomStatuses = useMemo(() => {
    return rooms.map((r) => {
      const info = roomInfo(r.id, data.bookings, tick);
      const maint = data.maintenance?.find((m) => m.room === r.id) ?? null;
      const activeBooking = info.live ?? info.due ?? info.soon ?? null;
      let statusKey: 'playing' | 'due' | 'booked' | 'maintenance' | 'empty' | 'clean' = 'empty';
      if (maint) statusKey = 'maintenance';
      else if (info.due || activeBooking?.status === 'finished') statusKey = 'due';
      else if (info.state === 'occupied') statusKey = 'playing';
      // Paid and left: the line is reserved for a few minutes to be cleaned, it is not being played.
      else if (info.state === 'clean') statusKey = 'clean';
      else if (info.state === 'soon') statusKey = 'booked';
      return { room: r, info, maint, statusKey, booking: activeBooking };
    });
  }, [data.bookings, data.maintenance, tick]);

  // Initial selection on mount: pick first active room if available, otherwise default 'line-1'
  const hasInitializedRoomRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRoomRef.current) return;
    hasInitializedRoomRef.current = true;
    const firstActive = roomStatuses.find((r) => r.booking);
    if (firstActive?.booking) {
      setSelectedRoomId(firstActive.room.id);
      setCheckInRoomId(firstActive.room.id);
      setActiveBookingId(firstActive.booking.id);
      setDesktopMode(firstActive.booking.status === 'finished' ? 'payment' : 'overview');
    }
  }, [roomStatuses]);

  // Keep activeBookingId in sync with the currently selected room when bookings change
  useEffect(() => {
    if (!hasInitializedRoomRef.current) return;
    const currentRoomStatus = roomStatuses.find((r) => r.room.id === selectedRoomId);
    if (currentRoomStatus?.booking) {
      if (activeBookingId !== currentRoomStatus.booking.id) {
        setActiveBookingId(currentRoomStatus.booking.id);
      }
    } else if (activeBookingId !== null) {
      setActiveBookingId(null);
    }
  }, [data.bookings, roomStatuses, selectedRoomId, activeBookingId]);

  const activeBooking: Booking | null = useMemo(() => {
    const rStatus = roomStatuses.find((r) => r.room.id === selectedRoomId);
    if (!rStatus?.booking) return null;
    if (activeBookingId) {
      const found = data.bookings.find((b) => b.id === activeBookingId && b.room === selectedRoomId);
      if (found) return found;
    }
    return rStatus.booking;
  }, [activeBookingId, data.bookings, roomStatuses, selectedRoomId]);

  const selectedRoomObj = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? rooms[0],
    [selectedRoomId],
  );

  // Load F&B & Bill for active booking (or general menu when no booking)
  const food = useFood(activeBooking?.id);
  const generalFood = useFood(undefined);
  const { bill, reload: reloadBill } = useBill(activeBooking?.id ?? '', activeBooking?.status ?? '');

  // Load history bill when inspecting an invoice in M10
  const historyBooking = useMemo(
    () => (selectedHistoryBookingId ? data.bookings.find((b) => b.id === selectedHistoryBookingId) ?? null : null),
    [data.bookings, selectedHistoryBookingId],
  );
  const { bill: historyBill, reload: reloadHistoryBill } = useBill(
    historyBooking?.id ?? '',
    historyBooking?.status ?? '',
  );

  // Load customers & package types from /api/members for check-in & catalog
  const [memberTypes, setMemberTypes] = useState<{ id: string; name: string; price: number }[]>([]);
  const loadCustomersDirectory = useCallback(async (q = '') => {
    try {
      const r = await fetch('/api/members?q=' + encodeURIComponent(q), { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as {
        customers?: CustomerDirectoryItem[];
        types?: { id: string; name: string; price: number; active?: number }[];
      };
      if (d.customers) setCustomersList(d.customers);
      if (d.types) setMemberTypes(d.types.filter((t) => t.active !== 0));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadCustomersDirectory(customerSearchQuery);
  }, [customerSearchQuery, loadCustomersDirectory]);

  // Listen to global Single Source of Truth synchronization events
  const reloadFood = food.reload;
  const reloadGeneralFood = generalFood.reload;
  useEffect(() => {
    const onSync = () => {
      reloadFood();
      reloadGeneralFood();
      loadCustomersDirectory(customerSearchQuery);
      onRefresh();
    };
    window.addEventListener('sigolf:data-sync', onSync);
    return () => window.removeEventListener('sigolf:data-sync', onSync);
  }, [reloadFood, reloadGeneralFood, loadCustomersDirectory, customerSearchQuery, onRefresh]);

  // Load Finance Shift Summary & Entries for M09
  const loadFinanceOverview = useCallback(async () => {
    try {
      const r = await fetch('/api/finance', { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as FinanceOverviewData;
      setFinanceData(d);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (
      mobileScreen === 'M09' ||
      mobileScreen === 'M01' ||
      desktopDrawer === 'shift' ||
      shiftSubModal !== null
    ) {
      loadFinanceOverview();
    }
  }, [mobileScreen, desktopDrawer, shiftSubModal, loadFinanceOverview, data.activeShift?.id]);

  // Merge live DB menu_items + package_types + default catalog products
  const catalogProducts: CatalogProduct[] = useMemo(() => {
    const list: CatalogProduct[] = [];
    const seenNames = new Set<string>();
    const liveMenu = food.data?.menu ?? generalFood.data?.menu ?? [];

    for (const m of liveMenu) {
      if (!m.active) continue;
      seenNames.add(m.name.toLowerCase());
      const cat: Exclude<CatalogCategory, 'all'> =
        m.category === 'drink' || m.category === 'food'
          ? 'fnb'
          : m.name.toLowerCase().includes('găng') ||
              m.name.toLowerCase().includes('bóng') ||
              m.name.toLowerCase().includes('tee') ||
              m.name.toLowerCase().includes('mũ')
            ? 'accessory'
            : 'service';
      list.push({
        id: m.id,
        name: m.name,
        category: cat,
        price: m.price,
        unit: m.unit,
        sku: m.id.slice(-8).toUpperCase(),
        menuItem: m,
      });
    }

    for (const pkg of memberTypes) {
      if (!seenNames.has(pkg.name.toLowerCase())) {
        seenNames.add(pkg.name.toLowerCase());
        list.push({
          id: `pkg-${pkg.id}`,
          name: pkg.name,
          category: 'package',
          price: pkg.price,
          unit: 'gói',
          sku: pkg.id.toUpperCase().slice(0, 8),
        });
      }
    }

    return list;
  }, [food.data?.menu, generalFood.data?.menu, memberTypes]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalogProducts.filter((p) => {
      const matchCat = catalogCat === 'all' || p.category === catalogCat;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [catalogProducts, catalogCat, catalogSearch]);

  // Room counts & filtered rooms
  const roomCounts = useMemo(() => {
    const c = {
      all: roomStatuses.length,
      playing: 0,
      empty: 0,
      booked: 0,
      due: 0,
      clean: 0,
      maintenance: 0,
    };
    for (const r of roomStatuses) {
      c[r.statusKey]++;
    }
    return c;
  }, [roomStatuses]);

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    const list = roomStatuses.filter((r) => {
      const matchTab = roomFilter === 'all' || r.statusKey === roomFilter;
      if (!matchTab) return false;
      if (!q) return true;
      const bText = r.booking ? `${r.booking.customer} ${r.booking.phone} ${r.booking.id}` : '';
      return `${r.room.name} ${r.room.id} ${bText}`.toLowerCase().includes(q);
    });
    // 2 phòng VIP để đầu, sau đó đến các line tiêu chuẩn
    return [...list].sort((a, b) => {
      if (a.room.vip !== b.room.vip) {
        return a.room.vip ? -1 : 1;
      }
      return 0;
    });
  }, [roomStatuses, roomFilter, roomSearch]);

  // Pending unpaid finished bills
  const pendingBills = useMemo(
    () => data.bookings.filter((b) => b.status === 'finished'),
    [data.bookings],
  );

  // Calculate live session quote for activeBooking
  const sessionBill: Bill & { error?: string; parts?: BillPart[] } = useMemo(() => {
    const emptyBill: Bill = { lines: [], subtotal: 0, fee: 0, vat: 0, total: 0 };
    if (!activeBooking) return emptyBill;
    try {
      const snap = JSON.parse(activeBooking.price);
      const seg: Segment[] = JSON.parse(activeBooking.segments);
      if (activeBooking.status === 'playing' && activeBooking.started) {
        seg.push({ start: activeBooking.started, end: tick });
      }
      const q =
        activeBooking.status === 'booked' && snap.estimated
          ? snap.estimated
          : sessionQuote(activeBooking.service as Service, seg, snap);
      return q;
    } catch (e) {
      return { ...emptyBill, error: e instanceof Error ? e.message : 'Chưa tính được phí giờ' };
    }
  }, [activeBooking, tick]);

  // F&B orders on activeBooking
  const bookingOrders: FoodOrder[] = food.data?.orders ?? [];
  const pendingKitchenOrders = bookingOrders.filter((o) =>
    ['new', 'preparing', 'ready'].includes(o.status),
  );
  const servedOrders = bookingOrders.filter((o) => o.status === 'served');
  const servedFoodTotal = servedOrders.reduce((s, o) => s + o.total, 0);
  const pendingFoodTotal = pendingKitchenOrders.reduce((s, o) => s + o.total, 0);

  // Unsent cart total
  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.qty, 0),
    [cart],
  );
  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  // Combined totals for activeBooking
  const golfTotal = activeBooking
    ? activeBooking.status === 'finished' || activeBooking.status === 'paid'
      ? (activeBooking.golf_amount ?? sessionBill.total)
      : sessionBill.total
    : 0;
  const fnbTotal = activeBooking
    ? Math.max(activeBooking.food_total ?? 0, servedFoodTotal) + pendingFoodTotal + cartTotal
    : cartTotal;
  const discountAmount = bill?.discount?.amount ?? 0;
  const grossTotal = golfTotal + fnbTotal;
  const payableTotal = Math.max(
    0,
    activeBooking?.status === 'finished' && cartTotal === 0 && pendingFoodTotal === 0
      ? (activeBooking.amount ?? grossTotal) - discountAmount
      : grossTotal - discountAmount,
  );

  const roundOffer = useMemo(() => {
    if (!activeBooking) return null;
    const offer = minChargeOffer(activeBooking);
    if (!offer) return null;

    // Strict check: if customer played >= minMinutes (or 60 mins), do NOT ask!
    const minMins = offer.minMinutes ?? 60;
    let playedMins = offer.playedMinutes;
    if (!playedMins && activeBooking.segments) {
      try {
        const segs = JSON.parse(activeBooking.segments) as Segment[];
        const totalMs = segs.reduce((sum, s) => sum + Math.max(0, s.end - s.start), 0);
        playedMins = Math.round(totalMs / 60_000);
      } catch {
        // ignore
      }
    }
    if (playedMins != null && playedMins >= minMins) {
      return null;
    }
    return offer;
  }, [activeBooking]);

  const elapsedMs = useMemo(() => {
    if (!activeBooking) return 0;
    const frozenAt =
      frozenBookingTimes[activeBooking.id] ??
      (activeBooking.room ? frozenBookingTimes[activeBooking.room] : undefined);
    if (frozenAt) {
      return playedMs(activeBooking, frozenAt);
    }
    if (activeBooking.status === 'finished' || activeBooking.status === 'paid') {
      return playedMs(activeBooking, activeBooking.finished ?? 0);
    }
    if (activeBooking.started || activeBooking.status === 'paused') {
      return playedMs(activeBooking, tick);
    }
    return 0;
  }, [activeBooking, tick, frozenBookingTimes]);

  // Hourly rate shown for a room: the price rule that applies right now, never a guess.
  const getRoomRateLabel = useCallback(
    (vip: boolean) => {
      try {
        return money(selectRule(tick, data.config, 'gdr', vip).amount) + '/giờ';
      } catch {
        return 'Chưa có khung giá';
      }
    },
    [data.config, tick],
  );

  // One room card on the floor plan (standard lines and VIP rooms share it).
  const renderDeskRoom = ({ room: r, statusKey, booking: rb, maint }: (typeof filteredRooms)[number]) => {
    const frozenAt = rb
      ? (frozenBookingTimes[rb.id] ?? (r.id ? frozenBookingTimes[r.id] : undefined))
      : undefined;
    const liveAmt =
      rb && rb.status === 'playing' && rb.started
        ? (() => {
            try {
              const snap = JSON.parse(rb.price);
              const segs: Segment[] = JSON.parse(rb.segments);
              segs.push({ start: rb.started, end: frozenAt ?? tick });
              return sessionQuote(rb.service as Service, segs, snap).total + (rb.food_total ?? 0);
            } catch {
              return rb.amount ?? 0;
            }
          })()
        : (rb?.amount ?? 0);
    const statusLabel =
      statusKey === 'playing'
        ? 'Đang chơi'
        : statusKey === 'empty'
          ? r.vip
            ? 'Phòng trống'
            : 'Line trống'
          : statusKey === 'booked'
            ? 'Đặt trước'
            : statusKey === 'due'
              ? 'Chờ thu'
              : statusKey === 'clean'
                ? 'Đang dọn line'
                : 'Bảo trì';
    return (
      <button
        key={r.id}
        type="button"
        className={`pos-m3-desk-room-card ${r.vip ? 'vip ' : ''}${statusKey} ${selectedRoomId === r.id ? 'selected' : ''}`}
        onClick={() => selectRoom(r.id)}
      >
        <span className="pos-m3-desk-room-name">
          {r.vip ? <Crown size={16} /> : <Flag size={15} />}
          <strong>{r.vip ? `Phòng ${r.name}` : r.name}</strong>
          {r.vip && <em className="pos-m3-vip-pill">VIP</em>}
          {r.left && <em className="pos-m3-lh-tag">Trái/Phải</em>}
        </span>
        <span className={`pos-m3-room-badge ${statusKey}`}>{statusLabel}</span>
        <span className="pos-m3-line-rate-frame">{getRoomRateLabel(r.vip)}</span>
        {serviceCallState.activeCallsByRoom.has(r.id) && (
          <span
            className={`pos-m3-room-call-pill ${
              serviceCallState.activeCallsByRoom.get(r.id)?.status === 'CREATED' ? 'pending' : 'progress'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowServiceCallDrawer(true);
            }}
          >
            🔔 {serviceCallState.activeCallsByRoom.get(r.id)?.status === 'CREATED' ? 'ĐANG GỌI' : 'ĐANG PHỤC VỤ'}
          </span>
        )}
        {rb ? (
          <span className="pos-m3-desk-info">
            <strong className="pos-m3-desk-cust">{rb.customer}</strong>
            <span>{rb.phone || 'Khách lẻ'}</span>
            <span>
              {SERVICE_LABEL[rb.service] || rb.service}
              {r.vip ? ` · ${rb.people} khách` : ''}
            </span>
            <span className="pos-m3-desk-timer">
              <Clock size={13} />
              {rb.status === 'playing' || rb.status === 'paused'
                ? clock(playedMs(rb, frozenAt ?? tick))
                : rb.status === 'finished'
                  ? `Chơi ${clock(playedMs(rb, rb.finished ?? 0))}`
                  : rb.status === 'booked'
                    ? `Hẹn ${time(rb.start)}`
                    : time(rb.start)}
            </span>
            {canSeeMoney && <strong className="pos-m3-desk-amt">{money(liveAmt)}</strong>}
          </span>
        ) : maint ? (
          <span className="pos-m3-desk-info">
            <span>{maint.reason || 'Tạm ngưng nhận khách'}</span>
          </span>
        ) : (
          <span className="pos-m3-desk-info pos-m3-desk-empty-info">
            <span>Sẵn sàng đón khách</span>
          </span>
        )}
      </button>
    );
  };

  // Keyboard shortcuts (F4 Cash Drawer) & Barcode Scanner
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F4') {
        e.preventDefault();
        kickCashDrawer();
        setNotice('Đã mở két đựng tiền mặt (F4)');
        return;
      }
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      const nowMs = Date.now();
      const gap = nowMs - lastKeyTimeRef.current;
      lastKeyTimeRef.current = nowMs;

      if (e.key === 'Enter' && !isInput) {
        const code = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';
        if (code.length >= 3) {
          const matched = catalogProducts.find(
            (p) => p.sku.toLowerCase() === code.toLowerCase() || p.id.toLowerCase() === code.toLowerCase(),
          );
          if (matched) {
            handleAddToCart(matched, 1);
            setNotice(`Đã quét mã: ${matched.name} (+1)`);
          }
        }
        return;
      }
      if (e.key.length === 1 && !isInput) {
        barcodeBufferRef.current = gap > 100 ? e.key : barcodeBufferRef.current + e.key;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Clear notice automatically
  useEffect(() => {
    if (!notice && !errorMsg) return;
    const t = setTimeout(() => {
      setNotice('');
      setErrorMsg('');
    }, 4500);
    return () => clearTimeout(t);
  }, [notice, errorMsg]);

  // Select a room on Desktop or Mobile
  function selectRoom(roomId: string, goMobileScreen?: MobileScreenId) {
    const rStatus = roomStatuses.find((r) => r.room.id === roomId);
    setSelectedRoomId(roomId);
    setCheckInRoomId(roomId);
    setErrorMsg('');

    if (rStatus?.maint) {
      setNotice(`${rStatus.room.name} đang tạm ngưng bảo trì: ${rStatus.maint.reason || 'Kiểm tra thiết bị'}`);
    }

    if (rStatus?.booking) {
      setActiveBookingId(rStatus.booking.id);
      payKey.current = operationKey();
      if (rStatus.booking.status === 'finished') {
        setDesktopMode('payment');
        if (goMobileScreen) setMobileScreen(goMobileScreen);
        else if (isMobile) setMobileScreen('M06');
      } else if (rStatus.booking.status === 'booked') {
        setCheckInCustomer(rStatus.booking.customer);
        setCheckInPhone(rStatus.booking.phone);
        setCheckInPeople(rStatus.booking.people);
        setCheckInService((rStatus.booking.service as 'gdr' | '9' | '18') || 'gdr');
        setDesktopMode('overview');
        if (goMobileScreen) setMobileScreen(goMobileScreen);
        else if (isMobile) setMobileScreen('M04');
      } else {
        setDesktopMode('overview');
        if (goMobileScreen) setMobileScreen(goMobileScreen);
        else if (isMobile) setMobileScreen('M03');
      }
    } else {
      setActiveBookingId(null);
      setCheckInCustomer('');
      setCheckInPhone('');
      setCheckInPeople(1);
      setCheckInService('gdr');
      setDesktopMode('checkin');
      if (goMobileScreen) setMobileScreen(goMobileScreen);
      else if (isMobile) setMobileScreen('M04');
    }
  }

  // Cart manipulation
  function handleAddToCart(product: CatalogProduct, delta = 1) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const nextQty = existing.qty + delta;
        if (nextQty <= 0) return prev.filter((l) => l.product.id !== product.id);
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: nextQty } : l));
      }
      if (delta <= 0) return prev;
      return [...prev, { product, qty: delta, note: '' }];
    });
  }

  function handleUpdateCartNote(productId: string, noteText: string) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, note: noteText } : l)),
    );
  }

  // Submit cart items to backend /api/fnb for the active session
  async function handleCommitCartToSession(targetBookingId?: string): Promise<boolean> {
    const bId = targetBookingId ?? activeBooking?.id;
    if (!bId || cart.length === 0) return true;
    setSaving(true);
    setErrorMsg('');
    try {
      // Ensure each cart item exists in menu_items so /api/fnb records it into SQLite
      let currentMenu = food.data?.menu ?? generalFood.data?.menu ?? [];
      const orderLines: { itemId: string; qty: number; expectedVersion: number }[] = [];

      for (const line of cart) {
        let matchedMenu =
          line.product.menuItem ??
          currentMenu.find((m) => m.name.toLowerCase() === line.product.name.toLowerCase() && m.active);

        if (!matchedMenu) {
          // Create item in menu_items on the fly if not yet in DB
          const createRes = await fetch('/api/fnb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'item-create',
              requestId: operationKey(),
              name: line.product.name,
              category: line.product.category === 'fnb' ? 'drink' : 'other',
              unit: line.product.unit || 'phần',
              price: line.product.price,
              feeBps: 0,
              vatBps: 0,
              active: true,
            }),
          });
          if (createRes.ok) {
            const refreshed = await food.reload();
            currentMenu = refreshed?.menu ?? currentMenu;
            matchedMenu = currentMenu.find(
              (m) => m.name.toLowerCase() === line.product.name.toLowerCase() && m.active,
            );
          }
        }

        if (matchedMenu) {
          orderLines.push({
            itemId: matchedMenu.id,
            qty: line.qty,
            expectedVersion: matchedMenu.version,
          });
        }
      }

      if (orderLines.length > 0) {
        const combinedNotes = [
          orderNote.trim(),
          ...cart.filter((c) => c.note.trim()).map((c) => `${c.product.name}: ${c.note.trim()}`),
        ]
          .filter(Boolean)
          .join(' · ');

        const res = await fetch('/api/fnb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'order',
            requestId: operationKey(),
            bookingId: bId,
            note: combinedNotes || 'Gọi tại quầy POS',
            lines: orderLines,
          }),
        });
        const dataRes = (await res.json()) as { error?: string };
        if (!res.ok) {
          setErrorMsg(dataRes.error || 'Không thể lưu đơn dịch vụ/F&B');
          return false;
        }

        const updatedFood = await food.reload();
        // If autoServeAtCounter is enabled, transition newly created orders to 'served' so bill total updates immediately
        if (autoServeAtCounter && updatedFood?.orders) {
          const newOrders = updatedFood.orders.filter((o) => o.status === 'new');
          for (const ord of newOrders) {
            await AdvanceOrderToServed(ord);
          }
          await food.reload();
        }
      }

      setCart([]);
      setOrderNote('');
      await onRefresh();
      setNotice('Đã cập nhật dịch vụ & F&B vào hóa đơn phiên chơi');
      return true;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi khi thêm dịch vụ vào phiên');
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Helper to advance an F&B order through new -> preparing -> ready -> served
  async function AdvanceOrderToServed(ord: FoodOrder) {
    let curStatus = ord.status;
    let curVersion = ord.version;
    const steps: ('preparing' | 'ready' | 'served')[] =
      curStatus === 'new'
        ? ['preparing', 'ready', 'served']
        : curStatus === 'preparing'
          ? ['ready', 'served']
          : curStatus === 'ready'
            ? ['served']
            : [];
    for (const nextStatus of steps) {
      const r = await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          id: ord.id,
          expectedVersion: curVersion,
          status: nextStatus,
          reason: '',
        }),
      });
      if (!r.ok) break;
      curVersion += 1;
      curStatus = nextStatus;
    }
  }

  async function handleServeAllPendingOrders(): Promise<boolean> {
    if (!pendingKitchenOrders.length) return true;
    setSaving(true);
    try {
      for (const ord of pendingKitchenOrders) {
        await AdvanceOrderToServed(ord);
      }
      await food.reload();
      await onRefresh();
      setNotice('Đã xác nhận phục vụ tất cả món trong phiên');
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelOrder(ord: FoodOrder) {
    setSaving(true);
    try {
      const r = await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          id: ord.id,
          expectedVersion: ord.version,
          status: 'cancelled',
          reason: 'Khách yêu cầu hủy tại quầy POS',
        }),
      });
      if (r.ok) {
        await food.reload();
        await onRefresh();
        setNotice(`Đã hủy đơn #${ord.id.slice(-6)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  // Action 1 & 2: Check-in / Start playing (M04 & Desktop)
  async function handleStartOrWalkIn() {
    if (saving) return;
    setErrorMsg('');
    const targetRoom = selectedRoomId || checkInRoomId;
    const rStatus = roomStatuses.find((r) => r.room.id === targetRoom);

    // If there is a 'booked' reservation on this line, start it
    if (rStatus?.booking && rStatus.booking.status === 'booked') {
      setSaving(true);
      try {
        const ok = await onMutate({ action: 'start', id: rStatus.booking.id });
        if (ok) {
          setActiveBookingId(rStatus.booking.id);
          setDesktopMode('overview');
          setMobileScreen('M03');
          setNotice(`Đã bắt đầu tính giờ chơi thực tế cho ${rStatus.room.name}`);
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    // Otherwise start a walk-in session (time starts counting from right now)
    const customerName = checkInCustomer.trim() || 'Khách lẻ tại quầy';
    const customerPhone = checkInPhone.trim();
    if (customerName.length < 2) {
      setErrorMsg('Vui lòng nhập tên khách hàng (tối thiểu 2 ký tự)');
      return;
    }
    if (customerPhone && !/^\+?[0-9 ()-]{8,20}$/.test(customerPhone)) {
      setErrorMsg('Số điện thoại không hợp lệ (8–20 chữ số)');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'walkin',
          room: targetRoom,
          customer: customerName,
          phone: customerPhone,
          people: checkInPeople,
          service: checkInService,
          minutes: checkInDuration,
        }),
      });
      const result = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setErrorMsg(result.error || 'Không thể bắt đầu phiên chơi');
        return;
      }
      await onRefresh();
      if (result.id) {
        setActiveBookingId(result.id);
        if (cart.length > 0) {
          await handleCommitCartToSession(result.id);
        }
      }
      setDesktopMode('overview');
      setMobileScreen('M03');
      setNotice(`Đã nhận khách & bắt đầu tính giờ tại ${rooms.find((r) => r.id === targetRoom)?.name}`);
    } finally {
      setSaving(false);
    }
  }

  // Reserve a future slot without starting the clock yet
  async function handleReserveSlotOnly() {
    if (saving) return;
    const customerName = checkInCustomer.trim();
    const customerPhone = checkInPhone.trim();
    if (customerName.length < 2 || !/^\+?[0-9 ()-]{8,20}$/.test(customerPhone)) {
      setErrorMsg('Đặt giữ chỗ cần nhập đầy đủ Tên khách và Số điện thoại hợp lệ.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const ok = await onMutate({
        action: 'book',
        room: checkInRoomId || selectedRoomId,
        service: checkInService,
        start: Date.now() + 15 * 60000,
        people: checkInPeople,
        minutes: checkInDuration,
        customer: customerName,
        phone: customerPhone,
        expectedRevision: data.config.pricingRevision,
      });
      if (ok) {
        setDesktopMode('overview');
        setMobileScreen('M02');
        setNotice('Đã tạo lịch đặt giữ chỗ trên line');
      }
    } finally {
      setSaving(false);
    }
  }

  // Pause / Resume / Extend / Switch Service
  async function handlePauseOrResume() {
    if (!activeBooking || saving) return;
    setSaving(true);
    try {
      const act = activeBooking.status === 'paused' ? 'resume' : 'pause';
      await onMutate({ action: act, id: activeBooking.id });
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitchService(target: 'gdr' | '9' | '18') {
    if (!activeBooking || saving || activeBooking.service === target) return;
    const from = activeBooking.service;
    // Practice <-> game: ask first. The hours already played stay on the bill and no minimum applies.
    if (from === 'gdr' || target === 'gdr') {
      let snap: { vip?: boolean; base?: number } = {};
      try {
        snap = JSON.parse(activeBooking.price);
      } catch {
        /* the dialog just leaves out the amounts */
      }
      let detail = '';
      if (activeBooking.status === 'booked') {
        detail = 'Phiên chưa bắt đầu: chỉ đổi hình thức đã đặt.';
      } else if (from === 'gdr') {
        let gamePrice = '';
        try {
          gamePrice = `, cộng với giá ${SERVICE_LABEL[target]} (${activeBooking.people} người) ${money(
            packagePrice(Date.now(), data.config, target as '9' | '18', !!snap.vip, activeBooking.people).base,
          )} (chưa gồm phí dịch vụ và VAT)`;
        } catch {
          gamePrice = `, cộng với giá ${SERVICE_LABEL[target]}`;
        }
        detail = `Tiền tập theo giờ đến lúc này được giữ lại${gamePrice}. Không áp dụng làm tròn tối thiểu ${money(MIN_HOURLY_CHARGE)}.`;
      } else {
        detail = `Giá lượt ${SERVICE_LABEL[from]} đã chơi${snap.base ? ` (${money(snap.base)})` : ''} được giữ lại; tiền tập theo giờ tính từ lúc chuyển. Không áp dụng làm tròn tối thiểu ${money(MIN_HOURLY_CHARGE)}.`;
      }
      const yes = await askConfirm({
        title: `Chuyển từ ${SERVICE_LABEL[from] || from} sang ${SERVICE_LABEL[target]}?`,
        message: detail,
        confirmLabel: 'Chuyển',
      });
      if (!yes) return;
    }
    setSaving(true);
    try {
      const ok = await onMutate({ action: 'switch-service', id: activeBooking.id, service: target });
      if (ok) {
        const name = SERVICE_LABEL[target] || target;
        setNotice(
          from !== 'gdr' && target !== 'gdr'
            ? `Đã đổi sang ${name}: tính lại một lượt chơi, không tính hai lần.`
            : `Đã chuyển sang ${name}. Tiền dịch vụ trước đó được giữ và cộng dồn trên cùng một phiếu.`,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExtendMinutes(minutes: number) {
    if (!activeBooking || saving) return;
    setSaving(true);
    try {
      await onMutate({ action: 'extend', id: activeBooking.id, minutes });
      setNotice(`Đã gia hạn thêm ${minutes} phút`);
    } finally {
      setSaving(false);
    }
  }

  // Action 4: Finish session (chốt thời gian chơi, chuyển sang chờ thanh toán)
  async function handleFinishSession(proceedToPay = true) {
    if (!activeBooking || saving) return;
    setErrorMsg('');

    const targetBooking = activeBooking;
    const targetBookingId = targetBooking.id;
    const nowFreeze = Date.now();

    // 1. Khóa đồng hồ ngay lập tức (0ms độ trễ)
    setFrozenBookingTimes((prev) => ({
      ...prev,
      [targetBookingId]: nowFreeze,
      ...(targetBooking.room ? { [targetBooking.room]: nowFreeze } : {}),
    }));

    // 2. Chuyển sang màn hình thanh toán ngay lập tức (0ms độ trễ)
    if (proceedToPay) {
      payKey.current = operationKey();
      setDesktopMode('payment');
      setMobileScreen('M07');
    }

    setSaving(true);
    try {
      // First commit any unsent cart items
      if (cart.length > 0) {
        const committed = await handleCommitCartToSession(targetBookingId);
        if (!committed) {
          setSaving(false);
          return;
        }
      }

      // Serve any pending kitchen orders so payment won't be blocked by unserved items
      if (pendingKitchenOrders.length > 0) {
        await handleServeAllPendingOrders();
      }

      if (targetBooking.status === 'playing' || targetBooking.status === 'paused') {
        const ok = await onMutate({ action: 'finish', id: targetBookingId });
        if (!ok) return;
        await reloadBill();
        await onRefresh();
      }

      if (!proceedToPay) {
        setNotice('Đã kết thúc tính giờ chơi. Phiên đang chờ thanh toán.');
        if (isMobile) setMobileScreen('M06');
      }
    } finally {
      setSaving(false);
    }
  }

  // Action 5: Confirm Payment (M07 -> M08)
  async function handleConfirmPayment(bankTxId?: string) {
    if (!activeBooking || saving) return;
    if (!data.activeShift) {
      setErrorMsg('Chưa mở ca làm việc! Vui lòng mở ca trước khi xác nhận thu tiền.');
      setShiftSubModal('open');
      return;
    }

    setErrorMsg('');
    setSaving(true);
    try {
      // Ensure cart is committed & pending orders served first
      if (cart.length > 0) {
        const okCart = await handleCommitCartToSession(activeBooking.id);
        if (!okCart) return;
      }
      if (pendingKitchenOrders.length > 0) {
        await handleServeAllPendingOrders();
      }

      // Ensure session is finished so final golf_amount & amount are locked in DB
      if (activeBooking.status === 'playing' || activeBooking.status === 'paused') {
        const finishedOk = await onMutate({ action: 'finish', id: activeBooking.id });
        if (!finishedOk) return;
        await reloadBill();
        await onRefresh();
      }

      // Fetch latest due from /api/bank?booking=ID to avoid any rounding mismatch
      let exactDue = payableTotal;
      try {
        const dueRes = await fetch('/api/bank?booking=' + encodeURIComponent(activeBooking.id), {
          cache: 'no-store',
        });
        if (dueRes.ok) {
          const dueJson = (await dueRes.json()) as { due: number | null };
          if (typeof dueJson.due === 'number') exactDue = dueJson.due;
        }
      } catch {
        // Fallback to payableTotal
      }

      const methodForApi: 'cash' | 'transfer' | 'card' =
        payMethod === 'transfer' ? 'transfer' : payMethod === 'card' ? 'card' : 'cash';

      const ok = await onMutate({
        action: 'pay',
        id: activeBooking.id,
        method: methodForApi,
        requestId: payKey.current,
        expectedAmount: exactDue,
        ...(bankTxId ? { bankTxId } : {}),
      });

      if (!ok) {
        setErrorMsg('Chưa ghi nhận được giao dịch thanh toán. Vui lòng kiểm tra lại.');
        return;
      }

      if (methodForApi === 'cash') {
        kickCashDrawer();
      }

      const receiptObj = {
        bookingId: activeBooking.id,
        code: `HD${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${activeBooking.id.slice(-4).toUpperCase()}`,
        roomName: selectedRoomObj.name,
        customer: activeBooking.customer,
        phone: activeBooking.phone,
        total: exactDue,
        methodLabel: PAY_LABEL[payMethod] || 'Tiền mặt',
        at: Date.now(),
        cashier: data.user || 'Thu ngân POS',
      };
      setLastReceipt(receiptObj);
      setLastReceiptBooking(activeBooking);

      if (printOnConfirm) {
        handlePrintReceipt(activeBooking);
      }

      setDesktopMode('receipt');
      setMobileScreen('M08');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  function handlePrintReceipt(targetBooking?: Booking | null) {
    const bTarget = targetBooking ?? lastReceiptBooking ?? activeBooking;
    if (!bTarget) return;
    const rName = rooms.find((r) => r.id === bTarget.room)?.name ?? bTarget.room;
    let bQuote: Bill = sessionBill;
    try {
      const snap = JSON.parse(bTarget.price);
      const seg: Segment[] = JSON.parse(bTarget.segments);
      bQuote = sessionQuote(bTarget.service as Service, seg, snap);
    } catch {
      bQuote = sessionBill;
    }
    const bBill = bTarget.id === activeBooking?.id ? bill : historyBill;
    const bFood = bTarget.id === activeBooking?.id ? food.data : null;
    printK80Receipt(
      generateK80Html({
        booking: bTarget,
        quote: bQuote,
        bill: bBill,
        roomName: rName,
        food: bFood,
      }),
    );
  }

  function handlePrintKitchen() {
    if (!activeBooking) return;
    const itemsToPrint: { name: string; qty: number; note?: string }[] = [];
    for (const o of bookingOrders) {
      if (o.status === 'cancelled') continue;
      const parsed = JSON.parse(o.items) as FoodLine[];
      for (const l of parsed) {
        itemsToPrint.push({ name: l.name, qty: l.qty, note: o.note });
      }
    }
    for (const c of cart) {
      itemsToPrint.push({ name: c.product.name, qty: c.qty, note: c.note });
    }
    if (!itemsToPrint.length) {
      setNotice('Chưa có món ăn/thức uống nào trong phiên để in phiếu bếp.');
      return;
    }
    printK80Receipt(
      generateKitchenTicketHtml({
        roomName: selectedRoomObj.name,
        code: activeBooking.id.slice(-6).toUpperCase(),
        items: itemsToPrint,
        cashierName: data.user || 'Thu ngân POS',
      }),
    );
    setNotice('Đã gửi lệnh in phiếu bếp / bar (K80)');
  }

  async function handleSendZaloReceipt(targetBooking?: Booking | null) {
    const bTarget = targetBooking ?? lastReceiptBooking ?? activeBooking;
    if (!bTarget) return;
    const rName = rooms.find((r) => r.id === bTarget.room)?.name ?? bTarget.room;
    let bQuote: Bill = sessionBill;
    try {
      const snap = JSON.parse(bTarget.price);
      const seg: Segment[] = JSON.parse(bTarget.segments);
      bQuote = sessionQuote(bTarget.service as Service, seg, snap);
    } catch {
      bQuote = sessionBill;
    }
    const bBill = bTarget.id === activeBooking?.id ? bill : historyBill;
    const bFood = bTarget.id === activeBooking?.id ? food.data : null;
    await sendBillImageToZalo({
      phone: bTarget.phone,
      bill: { booking: bTarget, quote: bQuote, bill: bBill, roomName: rName, food: bFood },
      fileName: `hoa-don-${bTarget.id.slice(-6)}.png`,
      onNotify: (msg) => setNotice(msg),
    });
  }

  // Shift operations (M09)
  async function handleOpenShiftSubmit() {
    if (saving) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          requestId: operationKey(),
          name: shiftNameInput.trim() || 'Ca tiêu chuẩn',
          openingCash: Number(shiftOpeningCash.replace(/\D/g, '')) || 0,
        }),
      });
      const resData = (await r.json()) as { error?: string };
      if (!r.ok) {
        setErrorMsg(resData.error || 'Không mở được ca làm việc');
        return;
      }
      setShiftSubModal(null);
      await onRefresh();
      await loadFinanceOverview();
      setNotice('Đã mở ca làm việc thành công');
    } finally {
      setSaving(false);
    }
  }

  async function handleCashEntrySubmit(kind: 'cash_in' | 'cash_out') {
    if (!data.activeShift || saving) return;
    const amt = Number(cashEntryAmount.replace(/\D/g, '')) || 0;
    if (amt <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cash-entry',
          requestId: operationKey(),
          shiftId: data.activeShift.id,
          kind,
          amount: amt,
          note:
            cashEntryNote.trim() ||
            (kind === 'cash_in' ? 'Nạp thêm tiền mặt vào két ca' : 'Rút quỹ tiền mặt trong ca'),
        }),
      });
      const resData = (await r.json()) as { error?: string };
      if (!r.ok) {
        setErrorMsg(resData.error || 'Không ghi nhận được phiếu quỹ');
        return;
      }
      setShiftSubModal(null);
      setCashEntryAmount('');
      setCashEntryNote('');
      await onRefresh();
      await loadFinanceOverview();
      setNotice(kind === 'cash_in' ? 'Đã nạp quỹ tiền mặt vào ca' : 'Đã ghi nhận rút quỹ tiền mặt');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShiftSubmit() {
    if (!data.activeShift || saving) return;
    const openShiftSummary = financeData?.shifts.find((s) => s.id === data.activeShift?.id);
    setSaving(true);
    setErrorMsg('');
    try {
      const cCash = Number(closeCountedCash.replace(/\D/g, '')) || 0;
      const cTransfer = Number(closeCountedTransfer.replace(/\D/g, '')) || 0;
      const cCard = Number(closeCountedCard.replace(/\D/g, '')) || 0;

      const r = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          shiftId: data.activeShift.id,
          expectedVersion: openShiftSummary?.version ?? 0,
          countedCash: cCash,
          countedTransfer: cTransfer,
          countedCard: cCard,
          note: closeNote.trim() || 'Đã đối soát và bàn giao ca',
        }),
      });
      const resData = (await r.json()) as { error?: string };
      if (!r.ok) {
        setErrorMsg(resData.error || 'Chưa thể đóng ca');
        return;
      }
      try {
        printK80Receipt(
          generateShiftZReportHtml({
            shiftName: data.activeShift.name,
            cashierName: data.user || 'Thu ngân POS',
            openedAt: data.activeShift.opened_at,
            closedAt: Date.now(),
            openingCash: openShiftSummary?.opening_cash ?? 0,
            countedCash: cCash,
            countedTransfer: cTransfer,
            countedCard: cCard,
            notes: closeNote.trim(),
          }),
        );
      } catch {
        // Ignore printer error
      }
      setShiftSubModal(null);
      await onRefresh();
      await loadFinanceOverview();
      setNotice('Đã đối soát, chốt ca & xuất báo cáo kết ca (Z-Report)');
    } finally {
      setSaving(false);
    }
  }

  // Cancel booking with permission & reason in M10
  async function handleCancelBooking(bookingToCancel: Booking) {
    if (saving) return;
    if (cancelReasonInput.trim().length < 3) {
      setErrorMsg('Vui lòng nhập lý do hủy (tối thiểu 3 ký tự)');
      return;
    }
    setSaving(true);
    try {
      const ok = await onMutate({ action: 'cancel', id: bookingToCancel.id });
      if (ok) {
        setShowCancelConfirm(false);
        setCancelReasonInput('');
        setNotice(`Đã hủy phiếu #${bookingToCancel.id.slice(-6).toUpperCase()}`);
      }
    } finally {
      setSaving(false);
    }
  }

  // Active shift summary calculations
  const activeShiftSummary: ShiftSummary | null = useMemo(() => {
    if (!data.activeShift) return null;
    return financeData?.shifts.find((s) => s.id === data.activeShift?.id) ?? null;
  }, [data.activeShift, financeData]);

  const activeShiftRecon = useMemo(() => {
    if (!activeShiftSummary) return null;
    const t = shiftTotals(activeShiftSummary);
    return reconciliation(t, {
      cash: Number(closeCountedCash.replace(/\D/g, '')) || t.openingCash + t.cashReceived - (t.cashRefund ?? 0) + t.cashIn - t.cashOut,
      transfer: Number(closeCountedTransfer.replace(/\D/g, '')) || t.transferReceived - (t.transferRefund ?? 0),
      card: Number(closeCountedCard.replace(/\D/g, '')) || t.cardReceived - (t.cardRefund ?? 0),
    });
  }, [activeShiftSummary, closeCountedCash, closeCountedTransfer, closeCountedCard]);

  // Filtered transaction history for M10
  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return data.bookings.filter((b) => {
      if (txStatusFilter === 'all') {
        if (!['paid', 'finished', 'cancelled'].includes(b.status)) return false;
      } else if (b.status !== txStatusFilter) {
        return false;
      }
      if (!q) return true;
      const rName = rooms.find((r) => r.id === b.room)?.name ?? b.room;
      return `${b.id} ${b.customer} ${b.phone} ${rName}`.toLowerCase().includes(q);
    });
  }, [data.bookings, txSearch, txStatusFilter]);

  // Cash change calculation
  const cashGiven = Number(tendered.replace(/\D/g, '')) || 0;
  const cashChange = changeDue(cashGiven, payableTotal);
  const quickCashDenominations = useMemo(() => {
    if (payableTotal <= 0) return [100000, 200000, 500000];
    const roundUp = (step: number) => Math.ceil(payableTotal / step) * step;
    return Array.from(
      new Set([payableTotal, roundUp(50000), roundUp(100000), roundUp(500000)]),
    )
      .filter((n) => n >= payableTotal)
      .slice(0, 4);
  }, [payableTotal]);

  const canRefund = !data.permissions || data.permissions.includes('billing.refund');
  const canDiscount = !data.permissions || data.permissions.includes('billing.discount');
  const canCancelBooking = !data.permissions || data.permissions.includes('booking.cancel');
  const newSupportRequests = data.requests?.filter((r) => r.status === 'new') ?? [];
  const totalNotifications =
    newSupportRequests.length + serviceCallState.pendingCount + (data.onlinePending ?? 0);

  // ============================================================================
  // RENDER SHARED SHIFT & TRANSACTION MODALS / DRAWERS
  // ============================================================================
  function renderShiftManagementContent() {
    const shiftRevenue = activeShiftSummary
      ? activeShiftSummary.cash_received +
        activeShiftSummary.transfer_received +
        activeShiftSummary.card_received -
        (activeShiftSummary.cash_refund +
          activeShiftSummary.transfer_refund +
          activeShiftSummary.card_refund)
      : data.todayReceipts || 0;

    return (
      <div className="pos-m3-shift-container">
        {/* Current Shift Status Banner */}
        <div className={`pos-m3-shift-hero ${data.activeShift ? 'open' : 'closed'}`}>
          <div className="pos-m3-shift-hero-info">
            <span className="pos-m3-shift-badge">
              {data.activeShift ? '● CA ĐANG MỞ' : '○ CHƯA MỞ CA'}
            </span>
            <h3>{data.activeShift ? data.activeShift.name : 'Chưa có ca thu ngân hoạt động'}</h3>
            <p>
              {data.activeShift
                ? `Mở lúc ${time(data.activeShift.opened_at)} (${date(data.activeShift.opened_at)}) · Nhân viên: ${data.user || 'Thu ngân'}`
                : 'Mở ca làm việc để bắt đầu thu tiền và ghi nhận sổ quỹ tại cơ sở.'}
            </p>
          </div>
          <div className="pos-m3-shift-hero-actions">
            {!data.activeShift ? (
              <button
                type="button"
                className="pos-m3-btn-primary"
                onClick={() => setShiftSubModal('open')}
              >
                <Play size={16} /> Mở ca làm việc
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="pos-m3-btn-tonal"
                  onClick={() => setShiftSubModal('cash_in')}
                >
                  <Plus size={16} /> Nạp quỹ
                </button>
                <button
                  type="button"
                  className="pos-m3-btn-tonal"
                  onClick={() => setShiftSubModal('cash_out')}
                >
                  <Minus size={16} /> Rút quỹ
                </button>
                <button
                  type="button"
                  className="pos-m3-btn-danger"
                  onClick={() => {
                    if (activeShiftRecon) {
                      setCloseCountedCash(String(activeShiftRecon.expectedCash));
                      setCloseCountedTransfer(String(activeShiftRecon.expectedTransfer));
                      setCloseCountedCard(String(activeShiftRecon.expectedCard));
                    }
                    setShiftSubModal('close');
                  }}
                >
                  <CheckCircle2 size={16} /> Đối soát & Bàn giao ca
                </button>
              </>
            )}
          </div>
        </div>

        {/* KPI Cards for Shift */}
        <div className="pos-m3-shift-kpis">
          <div className="pos-m3-kpi-card highlight">
            <span>Tổng doanh thu thuần ca</span>
            <strong>{canSeeMoney ? money(shiftRevenue) : '***'}</strong>
            <small>{activeShiftSummary?.entry_count ?? 0} bút toán trong ca</small>
          </div>
          <div className="pos-m3-kpi-card">
            <span>Tiền mặt lý thuyết trong két</span>
            <strong>
              {canSeeMoney ? money(activeShiftRecon?.expectedCash ?? (activeShiftSummary?.opening_cash ?? 0)) : '***'}
            </strong>
            <small>Đầu ca: {money(activeShiftSummary?.opening_cash ?? 0)}</small>
          </div>
          <div className="pos-m3-kpi-card">
            <span>Thu Chuyển khoản / QR SePay</span>
            <strong>
              {canSeeMoney ? money(activeShiftRecon?.expectedTransfer ?? 0) : '***'}
            </strong>
            <small>Đã đối soát ngân hàng</small>
          </div>
          <div className="pos-m3-kpi-card">
            <span>Thu Thẻ POS & Khác</span>
            <strong>{canSeeMoney ? money(activeShiftRecon?.expectedCard ?? 0) : '***'}</strong>
            <small>
              Nạp quỹ: +{money(activeShiftSummary?.cash_in ?? 0)} · Rút quỹ: −
              {money(activeShiftSummary?.cash_out ?? 0)}
            </small>
          </div>
        </div>

        {/* Inline Action Form when opening/cash-in/cash-out/closing */}
        {shiftSubModal === 'open' && (
          <div className="pos-m3-card pos-m3-shift-form">
            <div className="pos-m3-card-head">
              <h4>Mở ca làm việc mới</h4>
              <button type="button" className="pos-m3-icon-btn" onClick={() => setShiftSubModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="pos-m3-form-grid">
              <label className="pos-m3-field">
                <span>Tên ca làm việc</span>
                <select value={shiftNameInput} onChange={(e) => setShiftNameInput(e.target.value)}>
                  <option value="Ca sáng (06:00 - 14:00)">Ca sáng (06:00 - 14:00)</option>
                  <option value="Ca chiều (14:00 - 22:00)">Ca chiều (14:00 - 22:00)</option>
                  <option value="Ca tối (18:00 - 23:30)">Ca tối (18:00 - 23:30)</option>
                  <option value="Ca hành chính (08:00 - 17:00)">Ca hành chính (08:00 - 17:00)</option>
                </select>
              </label>
              <label className="pos-m3-field">
                <span>Tiền mặt đầu ca trong két (VNĐ)</span>
                <input
                  inputMode="numeric"
                  value={shiftOpeningCash}
                  onChange={(e) => setShiftOpeningCash(e.target.value.replace(/\D/g, ''))}
                  placeholder="1000000"
                />
              </label>
            </div>
            <div className="pos-m3-form-actions">
              <button type="button" className="pos-m3-btn-outline" onClick={() => setShiftSubModal(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="pos-m3-btn-primary"
                disabled={saving}
                onClick={handleOpenShiftSubmit}
              >
                {saving ? 'Đang mở ca…' : 'Xác nhận mở ca'}
              </button>
            </div>
          </div>
        )}

        {(shiftSubModal === 'cash_in' || shiftSubModal === 'cash_out') && (
          <div className="pos-m3-card pos-m3-shift-form">
            <div className="pos-m3-card-head">
              <h4>
                {shiftSubModal === 'cash_in'
                  ? 'Nạp thêm tiền mặt vào quỹ ca'
                  : 'Rút tiền mặt từ quỹ ca'}
              </h4>
              <button type="button" className="pos-m3-icon-btn" onClick={() => setShiftSubModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="pos-m3-form-grid">
              <label className="pos-m3-field">
                <span>Số tiền (VNĐ)</span>
                <input
                  inputMode="numeric"
                  value={cashEntryAmount}
                  onChange={(e) => setCashEntryAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số tiền..."
                />
              </label>
              <label className="pos-m3-field">
                <span>Lý do / Diễn giải (Bắt buộc)</span>
                <input
                  value={cashEntryNote}
                  onChange={(e) => setCashEntryNote(e.target.value)}
                  placeholder={
                    shiftSubModal === 'cash_in'
                      ? 'VD: Bổ sung tiền lẻ thối khách'
                      : 'VD: Chi mua đá viên / nước uống'
                  }
                />
              </label>
            </div>
            <div className="pos-m3-form-actions">
              <button type="button" className="pos-m3-btn-outline" onClick={() => setShiftSubModal(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="pos-m3-btn-primary"
                disabled={saving}
                onClick={() => handleCashEntrySubmit(shiftSubModal)}
              >
                {saving ? 'Đang lưu…' : 'Ghi nhận sổ quỹ'}
              </button>
            </div>
          </div>
        )}

        {shiftSubModal === 'close' && data.activeShift && (
          <div className="pos-m3-card pos-m3-shift-form">
            <div className="pos-m3-card-head">
              <h4>Đối soát & Bàn giao ca ({data.activeShift.name})</h4>
              <button type="button" className="pos-m3-icon-btn" onClick={() => setShiftSubModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="pos-m3-form-grid">
              <label className="pos-m3-field">
                <span>
                  Tiền mặt kiểm thực tế (Sổ sách: {money(activeShiftRecon?.expectedCash ?? 0)})
                </span>
                <input
                  inputMode="numeric"
                  value={closeCountedCash}
                  onChange={(e) => setCloseCountedCash(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="pos-m3-field">
                <span>
                  Chuyển khoản thực nhận (Sổ sách: {money(activeShiftRecon?.expectedTransfer ?? 0)})
                </span>
                <input
                  inputMode="numeric"
                  value={closeCountedTransfer}
                  onChange={(e) => setCloseCountedTransfer(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="pos-m3-field">
                <span>
                  Thẻ POS thực nhận (Sổ sách: {money(activeShiftRecon?.expectedCard ?? 0)})
                </span>
                <input
                  inputMode="numeric"
                  value={closeCountedCard}
                  onChange={(e) => setCloseCountedCard(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="pos-m3-field">
                <span>Ghi chú bàn giao ca</span>
                <input
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="Ghi chú chênh lệch hoặc bàn giao cho ca sau..."
                />
              </label>
            </div>
            {activeShiftRecon && (
              <div className="pos-m3-recon-summary">
                <span>
                  Chênh lệch tiền mặt:{' '}
                  <strong className={activeShiftRecon.cashDifference < 0 ? 'neg' : 'pos'}>
                    {money(activeShiftRecon.cashDifference)}
                  </strong>
                </span>
                <span>
                  Tổng chênh lệch:{' '}
                  <strong
                    className={
                      activeShiftRecon.cashDifference +
                        activeShiftRecon.transferDifference +
                        activeShiftRecon.cardDifference <
                      0
                        ? 'neg'
                        : 'pos'
                    }
                  >
                    {money(
                      activeShiftRecon.cashDifference +
                        activeShiftRecon.transferDifference +
                        activeShiftRecon.cardDifference,
                    )}
                  </strong>
                </span>
              </div>
            )}
            <div className="pos-m3-form-actions">
              <button type="button" className="pos-m3-btn-outline" onClick={() => setShiftSubModal(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="pos-m3-btn-danger"
                disabled={saving}
                onClick={handleCloseShiftSubmit}
              >
                {saving ? 'Đang chốt ca…' : 'Chốt ca & In Z-Report'}
              </button>
            </div>
          </div>
        )}

        {/* Shift Ledger Entries */}
        <div className="pos-m3-card">
          <div className="pos-m3-card-head">
            <h4>Nhật ký thu chi trong ca</h4>
            <button type="button" className="pos-m3-btn-text" onClick={loadFinanceOverview}>
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
          {financeData?.entries.length ? (
            <div className="pos-m3-entry-list">
              {financeData.entries.slice(0, 20).map((en) => {
                const isOut = en.kind === 'cash_out' || en.kind === 'refund';
                return (
                  <div key={en.id} className="pos-m3-entry-row">
                    <div>
                      <strong>
                        {en.kind === 'payment'
                          ? 'Thu tiền hóa đơn'
                          : en.kind === 'cash_in'
                            ? 'Nạp quỹ tiền mặt'
                            : en.kind === 'cash_out'
                              ? 'Rút quỹ tiền mặt'
                              : 'Hoàn tiền khách'}
                      </strong>
                      <small>
                        {time(en.created)} · {PAY_LABEL[en.method] || en.method} · {en.note || en.actor}
                      </small>
                    </div>
                    <span className={`pos-m3-entry-amt ${isOut ? 'out' : 'in'}`}>
                      {isOut ? '−' : '+'}
                      {money(en.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="pos-m3-empty-note">Chưa có bút toán thu/chi nào trong ca hiện tại.</p>
          )}
        </div>
      </div>
    );
  }

  function renderTransactionHistoryContent() {
    return (
      <div className="pos-m3-history-container">
        <div className="pos-m3-history-toolbar">
          <div className="pos-m3-search-box">
            <Search size={17} />
            <input
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Tìm mã hóa đơn, tên khách, SĐT, line..."
            />
            {txSearch && (
              <button type="button" onClick={() => setTxSearch('')}>
                <X size={15} />
              </button>
            )}
          </div>
          <div className="pos-m3-chip-row">
            {(
              [
                ['all', 'Tất cả'],
                ['paid', 'Đã thanh toán'],
                ['finished', 'Chờ thu'],
                ['cancelled', 'Đã hủy'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`pos-m3-chip ${txStatusFilter === k ? 'active' : ''}`}
                onClick={() => setTxStatusFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-m3-history-split">
          <div className="pos-m3-history-list">
            {filteredTransactions.length ? (
              filteredTransactions.slice(0, 40).map((item) => {
                const rName = rooms.find((r) => r.id === item.room)?.name ?? item.room;
                const isSelected = selectedHistoryBookingId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`pos-m3-tx-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedHistoryBookingId(item.id)}
                  >
                    <div className="pos-m3-tx-top">
                      <strong>
                        #{item.id.slice(-6).toUpperCase()} · {rName}
                      </strong>
                      <span className={`pos-m3-status-pill ${item.status}`}>
                        {item.status === 'paid'
                          ? 'Đã thanh toán'
                          : item.status === 'finished'
                            ? 'Chờ thanh toán'
                            : 'Đã hủy'}
                      </span>
                    </div>
                    <div className="pos-m3-tx-mid">
                      <span>
                        {item.customer} {item.phone ? `(${item.phone})` : ''}
                      </span>
                      <strong>{money(item.amount ?? 0)}</strong>
                    </div>
                    <div className="pos-m3-tx-bot">
                      <small>
                        {date(item.start)} {time(item.start)} · {SERVICE_LABEL[item.service] || item.service}
                      </small>
                      {item.payment && (
                        <small className="pos-m3-tx-method">
                          {PAY_LABEL[item.payment] || item.payment}
                        </small>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="pos-m3-empty-box">
                <Receipt size={32} />
                <p>Không tìm thấy giao dịch phù hợp.</p>
              </div>
            )}
          </div>

          {historyBooking && (
            <div className="pos-m3-history-detail pos-m3-card">
              <div className="pos-m3-card-head">
                <div>
                  <h4>Chi tiết hóa đơn #{historyBooking.id.slice(-6).toUpperCase()}</h4>
                  <small>
                    {rooms.find((r) => r.id === historyBooking.room)?.name} · Ngày {date(historyBooking.start)}
                  </small>
                </div>
                <button
                  type="button"
                  className="pos-m3-icon-btn"
                  onClick={() => setSelectedHistoryBookingId(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="pos-m3-detail-rows">
                <div>
                  <span>Khách hàng</span>
                  <strong>
                    {historyBooking.customer} ({historyBooking.phone || 'Khách lẻ'})
                  </strong>
                </div>
                <div>
                  <span>Thời gian thực tế</span>
                  <strong>
                    {historyBooking.started ? time(historyBooking.started) : time(historyBooking.start)} →{' '}
                    {historyBooking.finished ? time(historyBooking.finished) : time(historyBooking.end)}
                  </strong>
                </div>
                <div>
                  <span>Phí giờ chơi golf</span>
                  <strong>{money(historyBooking.golf_amount ?? 0)}</strong>
                </div>
                <div>
                  <span>Phí F&B & Dịch vụ</span>
                  <strong>{money(historyBooking.food_total ?? 0)}</strong>
                </div>
                {historyBill?.discount && (
                  <div>
                    <span>Giảm giá ({historyBill.discount.reason})</span>
                    <strong className="pos-m3-text-green">−{money(historyBill.discount.amount)}</strong>
                  </div>
                )}
                <div className="pos-m3-detail-total">
                  <span>Tổng giá trị hóa đơn</span>
                  <strong>{money(historyBooking.amount ?? 0)}</strong>
                </div>
              </div>

              {/* Refund & Audit History */}
              {historyBill && historyBill.refunds.length > 0 && (
                <div className="pos-m3-refund-history">
                  <h5>Lịch sử hoàn tiền</h5>
                  {historyBill.refunds.map((rf) => (
                    <div key={rf.id} className="pos-m3-refund-row">
                      <span>
                        Hoàn {PAY_LABEL[rf.method] || rf.method} · {rf.note} ({rf.actor})
                      </span>
                      <strong>−{money(rf.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions: Reprint, Pay (if finished), Refund (if paid & authorized), Cancel */}
              <div className="pos-m3-detail-actions">
                <button
                  type="button"
                  className="pos-m3-btn-outline"
                  onClick={() => handlePrintReceipt(historyBooking)}
                >
                  <Printer size={16} /> In lại hóa đơn
                </button>
                <button
                  type="button"
                  className="pos-m3-btn-outline"
                  onClick={() => handleSendZaloReceipt(historyBooking)}
                >
                  <Send size={16} /> Gửi Zalo
                </button>
                {historyBooking.status === 'finished' && (
                  <button
                    type="button"
                    className="pos-m3-btn-primary"
                    onClick={() => {
                      setActiveBookingId(historyBooking.id);
                      setSelectedRoomId(historyBooking.room);
                      setDesktopDrawer(null);
                      setDesktopMode('payment');
                      setMobileScreen('M07');
                    }}
                  >
                    <CreditCard size={16} /> Thu tiền ngay
                  </button>
                )}
              </div>

              {historyBooking.status === 'paid' && canRefund && historyBill && (
                <div style={{ marginTop: 12 }}>
                  <RefundForm
                    bookingId={historyBooking.id}
                    bill={historyBill}
                    onDone={async () => {
                      await reloadHistoryBill();
                      await onRefresh();
                      setNotice('Đã xử lý hoàn tiền và ghi nhật ký hệ thống');
                    }}
                  />
                </div>
              )}

              {historyBooking.status === 'booked' && canCancelBooking && (
                <div style={{ marginTop: 12 }}>
                  {!showCancelConfirm ? (
                    <button
                      type="button"
                      className="pos-m3-btn-danger"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <Trash2 size={15} /> Hủy lịch đặt này
                    </button>
                  ) : (
                    <div className="pos-m3-cancel-box">
                      <input
                        value={cancelReasonInput}
                        onChange={(e) => setCancelReasonInput(e.target.value)}
                        placeholder="Nhập lý do hủy (bắt buộc lưu nhật ký)..."
                      />
                      <div className="pos-m3-form-actions">
                        <button
                          type="button"
                          className="pos-m3-btn-outline"
                          onClick={() => setShowCancelConfirm(false)}
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          className="pos-m3-btn-danger"
                          disabled={saving}
                          onClick={() => handleCancelBooking(historyBooking)}
                        >
                          Xác nhận hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audit Trail for this booking */}
              <div className="pos-m3-audit-box">
                <h5>Nhật ký thao tác</h5>
                {(data.audit ?? [])
                  .filter((a) => a.detail.includes(historyBooking.id) || a.detail.includes(historyBooking.customer))
                  .slice(0, 6)
                  .map((a, idx) => (
                    <div key={idx} className="pos-m3-audit-item">
                      <span>
                        <strong>{a.action}</strong> · {a.detail}
                      </span>
                      <small>{time(a.created)}</small>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // SHARED PAYMENT PANEL CONTENT (USED IN M07 & DESKTOP RIGHT PANEL)
  // ============================================================================
  function renderPaymentContent() {
    if (!activeBooking) {
      return (
        <div className="pos-m3-empty-box">
          <CreditCard size={36} />
          <p>Hãy chọn một line đang hoạt động hoặc đơn chờ thanh toán.</p>
        </div>
      );
    }

    if (saving && ['playing', 'paused'].includes(activeBooking.status)) {
      return (
        <div
          className="pos-m3-pay-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
            gap: 14,
            padding: '30px 20px',
          }}
        >
          <Loader2 size={32} className="pos-m3-spin" style={{ color: 'var(--brand-primary, #047857)' }} />
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: 16, color: '#1e293b' }}>Đang chốt giờ chơi...</strong>
            <span style={{ fontSize: 13, color: '#64748b' }}>Đang khóa đồng hồ và đồng bộ chi phí phiên</span>
          </div>
        </div>
      );
    }

    if (roundOffer && !keepShort.has(activeBooking.id)) {
      const minMins = roundOffer.minMinutes ?? 60;
      const playedMins = roundOffer.playedMinutes ?? 1;
      if (playedMins < minMins) {
        const fmtVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' VNĐ';
        return (
          <div className="pos-m3-pay-section">
            <div className="pos-m3-pay-total-banner">
              <span>Tổng thanh toán ({selectedRoomObj.name})</span>
              <strong>{money(payableTotal)}</strong>
              <small>Khách: {activeBooking.customer}</small>
            </div>
            <div
              className="pos-m3-roundup"
              role="alertdialog"
              aria-labelledby="pos-roundup-title"
              style={{
                padding: '14px 16px',
                borderRadius: 5,
                background: '#fffdf5',
                border: '1px solid #fde68a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Clock size={16} color="#b45309" />
                <h4 id="pos-roundup-title" style={{ margin: 0, fontSize: 14.5, color: '#92400e', fontWeight: 700 }}>
                  Giới hạn tối thiểu {minMins} phút
                </h4>
              </div>
              <p style={{ margin: '2px 0', fontSize: 13, color: '#78350f', lineHeight: 1.4 }}>
                Thực tế <strong>{playedMins} phút</strong> (tương ứng <strong>{money(roundOffer.golf)}</strong>)
              </p>
              <p style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                Bạn muốn thanh toán theo số tiền nào?
              </p>
              <div className="pos-m3-roundup-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="pos-m3-btn-primary"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 5,
                    fontSize: 13.5,
                    fontWeight: 600,
                    height: 'auto',
                  }}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const ok = await onMutate({ action: 'round-min', id: activeBooking.id });
                      if (ok) {
                        setKeepShort((cur) => new Set(cur).add(activeBooking.id));
                        setNotice(`Đã chọn thanh toán số tiền tối thiểu (${fmtVnd(roundOffer.to)})`);
                        await reloadBill();
                        await onRefresh();
                      }
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} />
                    Số tiền tối thiểu:
                  </span>
                  <strong style={{ fontSize: 14 }}>{fmtVnd(roundOffer.to)}</strong>
                </button>
                <button
                  type="button"
                  className="pos-m3-btn-outline"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 5,
                    fontSize: 13.5,
                    fontWeight: 600,
                    borderColor: '#d97706',
                    color: '#92400e',
                    background: '#ffffff',
                    height: 'auto',
                  }}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onMutate({ action: 'keep-actual', id: activeBooking.id });
                      setKeepShort((cur) => new Set(cur).add(activeBooking.id));
                      setNotice(`Đã chọn thanh toán theo thực tế (${fmtVnd(roundOffer.golf)})`);
                      await reloadBill();
                      await onRefresh();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} />
                    Số tiền thực tế:
                  </span>
                  <strong style={{ fontSize: 14 }}>{fmtVnd(roundOffer.golf)}</strong>
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="pos-m3-pay-section">
        {/* Highlight Total Due Banner */}
        <div className="pos-m3-pay-total-banner">
          <span>Tổng thanh toán ({selectedRoomObj.name})</span>
          <strong>{money(payableTotal)}</strong>
          <small>
            Khách: {activeBooking.customer} · Giờ golf: {money(golfTotal)} · F&B/DV: {money(fnbTotal)}
            {discountAmount > 0 ? ` · Giảm: −${money(discountAmount)}` : ''}
          </small>
        </div>

        {!data.activeShift && (
          <div className="pos-m3-shift-alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Chưa mở ca thu ngân!</strong>
              <p>Cần mở ca trước khi xác nhận giao dịch thanh toán.</p>
            </div>
            <button
              type="button"
              className="pos-m3-btn-primary"
              onClick={() => {
                if (isMobile) setMobileScreen('M09');
                else setDesktopDrawer('shift');
                setShiftSubModal('open');
              }}
            >
              Mở ca
            </button>
          </div>
        )}

        {/* Payment Method Radio Cards (Matching Reference Image 1 & 2) */}
        <div className="pos-m3-method-list" role="radiogroup" aria-label="Phương thức thanh toán">
          {(
            [
              {
                key: 'cash' as const,
                title: 'Tiền mặt',
                sub: 'Thu tiền mặt tại quầy & tính tiền thừa',
                icon: Banknote,
              },
              {
                key: 'card' as const,
                title: 'Thẻ ngân hàng (POS)',
                sub: 'Visa, MasterCard, JCB, Napas',
                icon: CreditCard,
              },
              {
                key: 'transfer' as const,
                title: 'QR / Chuyển khoản (SePay)',
                sub: 'Mã QR động my.sepay.vn · Tự động khớp lệnh',
                icon: QrCode,
              },
              {
                key: 'wallet' as const,
                title: 'Ví nội bộ / Số dư hội viên',
                sub: 'Trừ trực tiếp số dư ví trả trước của hội viên',
                icon: Wallet,
              },
              {
                key: 'package' as const,
                title: 'Thẻ giờ hội viên',
                sub: 'Khấu trừ số giờ/buổi trong gói hội viên',
                icon: Crown,
              },
              {
                key: 'split' as const,
                title: 'Thanh toán kết hợp',
                sub: 'Kết hợp Tiền mặt + Chuyển khoản + Thẻ',
                icon: Split,
              },
            ]
          ).map((m) => {
            const Icon = m.icon;
            const selected = payMethod === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`pos-m3-method-card ${selected ? 'selected' : ''}`}
                onClick={() => setPayMethod(m.key)}
              >
                <div className="pos-m3-method-radio">
                  <span className="pos-m3-radio-dot" />
                </div>
                <div className="pos-m3-method-icon">
                  <Icon size={20} />
                </div>
                <div className="pos-m3-method-text">
                  <strong>{m.title}</strong>
                  <small>{m.sub}</small>
                </div>
                {selected && <Check size={18} className="pos-m3-method-check" />}
              </button>
            );
          })}
        </div>

        {/* Method-specific Interactive Area */}
        {payMethod === 'cash' && (
          <div className="pos-m3-cash-box">
            <label className="pos-m3-field">
              <span>Tiền khách đưa (VNĐ)</span>
              <input
                inputMode="numeric"
                value={tendered}
                onChange={(e) => setTendered(e.target.value.replace(/\D/g, ''))}
                placeholder={String(payableTotal)}
              />
            </label>
            <div className="pos-m3-quick-cash">
              {quickCashDenominations.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`pos-m3-chip ${cashGiven === amt ? 'active' : ''}`}
                  onClick={() => setTendered(String(amt))}
                >
                  {money(amt)}
                </button>
              ))}
            </div>
            <div className="pos-m3-cash-change">
              <span>Tiền thừa trả khách:</span>
              <strong>{money(cashGiven > 0 ? cashChange : 0)}</strong>
            </div>
          </div>
        )}

        {payMethod === 'transfer' && (
          <div className="pos-m3-sepay-box">
            <TransferPanel
              booking={{ ...activeBooking, amount: payableTotal }}
              bank={{
                bin: data.config?.bankBin ?? '',
                account: data.config?.bankAccount ?? '',
                holder: data.config?.bankHolder ?? '',
              }}
              fallbackAmount={payableTotal}
              busy={saving || !data.activeShift}
              onUse={(bankTxId: string) => handleConfirmPayment(bankTxId)}
            />
          </div>
        )}

        {(payMethod === 'wallet' || payMethod === 'package') && (
          <div className="pos-m3-member-pay-box">
            <PackageRedeem
              mode={payMethod === 'wallet' ? 'wallet' : 'package'}
              booking={{ ...activeBooking, status: 'finished', amount: payableTotal }}
              money={money}
              onChanged={async () => {
                await onRefresh();
                await reloadBill();
                setNotice('Đã áp dụng gói giờ / ví hội viên thành công!');
              }}
            />
            <p className="pos-m3-helper-text">
              Hệ thống tự động kiểm tra gói giờ và số dư ví theo SĐT khách hàng ({activeBooking.phone || 'chưa có SĐT'}).
              Nếu phiên chưa kết thúc tính giờ, hãy bấm &ldquo;Kết thúc chơi&rdquo; trước khi gạch gói/ví.
            </p>
          </div>
        )}

        {payMethod === 'split' && (
          <div className="pos-m3-split-pay-box">
            <SplitPay
              booking={{ ...activeBooking, amount: payableTotal }}
              disabled={saving || !data.activeShift}
              onChanged={async () => {
                await onRefresh();
                setDesktopMode('receipt');
                setMobileScreen('M08');
              }}
            />
          </div>
        )}

        {/* E-Invoice / VAT & Print toggles */}
        <div className="pos-m3-pay-options">
          <label className="pos-m3-switch-row">
            <span>
              <FileText size={16} /> Xuất hóa đơn VAT / Điện tử
            </span>
            <input
              type="checkbox"
              checked={vatInvoice}
              onChange={(e) => setVatInvoice(e.target.checked)}
            />
          </label>
          {vatInvoice && (
            <div className="pos-m3-vat-fields">
              <input
                value={vatCompany}
                onChange={(e) => setVatCompany(e.target.value)}
                placeholder="Tên công ty / Đơn vị nhận hóa đơn..."
              />
              <input
                value={vatTaxCode}
                onChange={(e) => setVatTaxCode(e.target.value)}
                placeholder="Mã số thuế..."
              />
            </div>
          )}
          <label className="pos-m3-switch-row">
            <span>
              <Printer size={16} /> Tự động in hóa đơn K80 sau khi xác nhận
            </span>
            <input
              type="checkbox"
              checked={printOnConfirm}
              onChange={(e) => setPrintOnConfirm(e.target.checked)}
            />
          </label>
        </div>

        {/* Confirm Payment CTA (for Cash / Card) */}
        {(payMethod === 'cash' || payMethod === 'card') && (
          <button
            type="button"
            className="pos-m3-btn-primary pos-m3-btn-block pos-m3-btn-lg"
            disabled={saving || !data.activeShift}
            onClick={() => handleConfirmPayment()}
          >
            <CheckCircle2 size={20} />
            <span>
              {saving ? 'Đang xử lý giao dịch…' : `Xác nhận thanh toán · ${money(payableTotal)}`}
            </span>
          </button>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: POS MOBILE (375px - 430px NATIVE/PWA APPLICATION - M01 TO M10)
  // ============================================================================
  if (isMobile) {
    return (
      <div className="pos-m3-mobile-app">
        {/* Top App Bar */}
        <header className="pos-m3-mobile-topbar">
          {mobileScreen !== 'M01' ? (
            <button
              type="button"
              className="pos-m3-mobile-back"
              onClick={() => {
                if (mobileScreen === 'M08' || mobileScreen === 'M02') setMobileScreen('M01');
                else if (mobileScreen === 'M03' || mobileScreen === 'M04') setMobileScreen('M02');
                else if (mobileScreen === 'M05') setMobileScreen(activeBooking ? 'M03' : 'M02');
                else if (mobileScreen === 'M06') setMobileScreen('M05');
                else if (mobileScreen === 'M07') setMobileScreen('M06');
                else setMobileScreen('M01');
              }}
              aria-label="Quay lại"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="pos-m3-mobile-logo">SG</div>
          )}

          <div className="pos-m3-mobile-title-wrap">
            <strong>
              {mobileScreen === 'M01' && (data.config?.name || 'Saigon Indoor Golf Club')}
              {mobileScreen === 'M02' && 'POS – Chọn line/phòng'}
              {mobileScreen === 'M03' && `Chi tiết phiên – ${selectedRoomObj.name}`}
              {mobileScreen === 'M04' && `Nhận khách – ${rooms.find((r) => r.id === checkInRoomId)?.name || selectedRoomObj.name}`}
              {mobileScreen === 'M05' && `Bán hàng – ${selectedRoomObj.name}`}
              {mobileScreen === 'M06' && `Giỏ hàng / Hóa đơn – ${selectedRoomObj.name}`}
              {mobileScreen === 'M07' && `Thanh toán – ${selectedRoomObj.name}`}
              {mobileScreen === 'M08' && 'Hoàn tất đơn hàng'}
              {mobileScreen === 'M09' && 'Quản lý ca thu ngân'}
              {mobileScreen === 'M10' && 'Lịch sử giao dịch'}
            </strong>
            <small>
              {data.activeShift ? `Ca: ${data.activeShift.name}` : 'Chưa mở ca'} · {data.user || 'Thu ngân'}
            </small>
          </div>

          <div className="pos-m3-mobile-top-actions">
            {cartCount > 0 && mobileScreen !== 'M06' && mobileScreen !== 'M07' && (
              <button
                type="button"
                className="pos-m3-mobile-cart-badge"
                onClick={() => setMobileScreen('M06')}
              >
                <ShoppingCart size={18} />
                <span>{cartCount}</span>
              </button>
            )}
            <button
              type="button"
              className="pos-m3-mobile-bell"
              onClick={() => setShowBellPopover(!showBellPopover)}
              aria-label="Thông báo"
            >
              <Bell size={19} />
              {totalNotifications > 0 && <em>{totalNotifications}</em>}
            </button>
          </div>
        </header>

      {/* Realtime Service Call Banner */}
      <ServiceCallBanner
        call={serviceCallState.bannerCall}
        onAcknowledge={serviceCallState.acknowledgeCall}
        onOpenDetails={() => setShowServiceCallDrawer(true)}
        onDismiss={serviceCallState.dismissBanner}
        onNavigateToPayment={(roomId) => {
          selectRoom(roomId);
          setMobileScreen('M07');
        }}
      />

        {/* Feedback Banners */}
        {notice && (
          <div className="pos-m3-toast success" role="status">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}
        {errorMsg && (
          <div className="pos-m3-toast error" role="alert">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Mobile Screen Body */}
        <main className="pos-m3-mobile-body">
          {/* ===============================================================
              M01 – TRANG CHỦ POS
              =============================================================== */}
          {mobileScreen === 'M01' && (
            <div className="pos-m3-screen-m01">
              {/* Hero Banner */}
              <div className="pos-m3-home-hero">
                <div>
                  <span className="pos-m3-home-tag">POS VẬN HÀNH THƯƠNG MẠI</span>
                  <h2>POS Bán hàng & Sân Golf 3D</h2>
                  <p>Quản lý phiên chơi, F&B và thanh toán tức thì</p>
                </div>
                <button
                  type="button"
                  className="pos-m3-home-cta"
                  onClick={() => setMobileScreen('M02')}
                >
                  <span>Mở sơ đồ Line</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Shift Status Card */}
              <button
                type="button"
                className={`pos-m3-shift-strip ${data.activeShift ? 'open' : 'closed'}`}
                onClick={() => setMobileScreen('M09')}
              >
                <div className="pos-m3-shift-strip-left">
                  <span className="pos-m3-dot" />
                  <div>
                    <strong>
                      {data.activeShift ? `Ca làm việc: ${data.activeShift.name}` : 'Ca làm việc: Chưa mở ca'}
                    </strong>
                    <small>
                      {data.activeShift
                        ? `Đang hoạt động · Bắt đầu ${time(data.activeShift.opened_at)}`
                        : 'Chạm để mở ca thu ngân mới'}
                    </small>
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>

              {/* Live Operational KPIs */}
              <div className="pos-m3-home-stats">
                <button
                  type="button"
                  className="pos-m3-stat-pill playing"
                  onClick={() => {
                    setRoomFilter('playing');
                    setMobileScreen('M02');
                  }}
                >
                  <strong>{roomCounts.playing}</strong>
                  <span>Line đang chơi</span>
                </button>
                <button
                  type="button"
                  className="pos-m3-stat-pill empty"
                  onClick={() => {
                    setRoomFilter('empty');
                    setMobileScreen('M02');
                  }}
                >
                  <strong>{roomCounts.empty}</strong>
                  <span>Line trống</span>
                </button>
                <button
                  type="button"
                  className="pos-m3-stat-pill due"
                  onClick={() => {
                    if (pendingBills[0]) {
                      selectRoom(pendingBills[0].room, 'M06');
                    } else {
                      setRoomFilter('due');
                      setMobileScreen('M02');
                    }
                  }}
                >
                  <strong>{pendingBills.length}</strong>
                  <span>Chờ thanh toán</span>
                </button>
              </div>

              {/* Quick Actions 2x3 Grid (Matching Reference Image 1 & 2) */}
              <div className="pos-m3-home-grid">
                <button
                  type="button"
                  className="pos-m3-home-tile primary"
                  onClick={() => {
                    setRoomFilter('all');
                    setMobileScreen('M02');
                  }}
                >
                  <div className="pos-m3-tile-icon">
                    <ShoppingCart size={24} />
                  </div>
                  <strong>Bán hàng (POS)</strong>
                  <small>Sơ đồ 12 line & tạo đơn</small>
                </button>

                <button
                  type="button"
                  className="pos-m3-home-tile"
                  onClick={() => setMobileScreen('M04')}
                >
                  <div className="pos-m3-tile-icon">
                    <CalendarDays size={24} />
                  </div>
                  <strong>Nhận khách</strong>
                  <small>Mở phiên & tính giờ</small>
                </button>

                <button
                  type="button"
                  className="pos-m3-home-tile"
                  onClick={() => setMobileScreen('M05')}
                >
                  <div className="pos-m3-tile-icon">
                    <Coffee size={24} />
                  </div>
                  <strong>F&B & Dịch vụ</strong>
                  <small>Đồ uống, phụ kiện, gói</small>
                </button>

                <button
                  type="button"
                  className="pos-m3-home-tile"
                  onClick={() => setMobileScreen('M07')}
                >
                  <div className="pos-m3-tile-icon">
                    <QrCode size={24} />
                  </div>
                  <strong>Thanh toán nhanh</strong>
                  <small>Tiền mặt, Thẻ, QR SePay</small>
                </button>

                <button
                  type="button"
                  className="pos-m3-home-tile"
                  onClick={() => setMobileScreen('M10')}
                >
                  <div className="pos-m3-tile-icon">
                    <Receipt size={24} />
                  </div>
                  <strong>Lịch sử hóa đơn</strong>
                  <small>Tra cứu, hoàn/hủy</small>
                </button>

                <button
                  type="button"
                  className="pos-m3-home-tile"
                  onClick={() => setMobileScreen('M09')}
                >
                  <div className="pos-m3-tile-icon">
                    <Wallet size={24} />
                  </div>
                  <strong>Quản lý ca</strong>
                  <small>Nạp/rút quỹ, kết ca</small>
                </button>
              </div>

              {/* Pending Bills List on Home if any */}
              {pendingBills.length > 0 && (
                <div className="pos-m3-card">
                  <div className="pos-m3-card-head">
                    <h4>Đơn chờ thanh toán ({pendingBills.length})</h4>
                  </div>
                  <div className="pos-m3-pending-list">
                    {pendingBills.map((pb) => {
                      const rName = rooms.find((r) => r.id === pb.room)?.name ?? pb.room;
                      return (
                        <button
                          key={pb.id}
                          type="button"
                          className="pos-m3-pending-item"
                          onClick={() => selectRoom(pb.room, 'M07')}
                        >
                          <div>
                            <strong>
                              {rName} · {pb.customer}
                            </strong>
                            <small>{pb.phone || 'Khách lẻ'} · Đã kết thúc chơi</small>
                          </div>
                          <span className="pos-m3-pending-amt">{money(pb.amount ?? 0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              M02 – SƠ ĐỒ LINE / PHÒNG (LƯỚI 2 CỘT, 12 LINE/PHÒNG)
              =============================================================== */}
          {mobileScreen === 'M02' && (
            <div className="pos-m3-screen-m02">
              <div className="pos-m3-search-box">
                <Search size={17} />
                <input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Tìm line, tên khách, SĐT..."
                />
                {roomSearch && (
                  <button type="button" onClick={() => setRoomSearch('')}>
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="pos-m3-chip-row">
                {(
                  [
                    ['all', `Tất cả (${roomCounts.all})`],
                    ['playing', `Đang chơi (${roomCounts.playing})`],
                    ['empty', `Trống (${roomCounts.empty})`],
                    ['booked', `Đặt trước (${roomCounts.booked})`],
                    ['due', `Chờ thu (${roomCounts.due})`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`pos-m3-chip ${roomFilter === k ? 'active' : ''}`}
                    onClick={() => setRoomFilter(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 2-Column Grid of 12 Lines/VIP */}
              <div className="pos-m3-mobile-room-grid">
                {filteredRooms.map(({ room: r, statusKey, booking: rb, maint }) => {
                  const isSelected = selectedRoomId === r.id;
                  const shortName = r.vip ? r.name : r.name.replace('Line ', 'L');
                  const frozenAt = rb
                    ? (frozenBookingTimes[rb.id] ?? (r.id ? frozenBookingTimes[r.id] : undefined))
                    : undefined;
                  const liveQuote =
                    rb && rb.status === 'playing' && rb.started
                      ? (() => {
                          try {
                            const s = JSON.parse(rb.price);
                            const segs: Segment[] = JSON.parse(rb.segments);
                            segs.push({ start: rb.started, end: frozenAt ?? tick });
                            return sessionQuote(rb.service as Service, segs, s).total + (rb.food_total ?? 0);
                          } catch {
                            return rb.amount ?? 0;
                          }
                        })()
                      : (rb?.amount ?? 0);

                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`pos-m3-room-card ${statusKey} ${r.vip ? 'vip' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectRoom(r.id)}
                    >
                      <div className="pos-m3-room-card-top">
                        <span className="pos-m3-room-title">
                          {r.vip ? <Crown size={15} /> : <Flag size={14} />}
                          <strong>{shortName}</strong>
                        </span>
                        <span className={`pos-m3-room-badge ${statusKey}`}>
                          {statusKey === 'playing' && '● Đang chơi'}
                          {statusKey === 'empty' && '● Trống'}
                          {statusKey === 'booked' && '● Đặt trước'}
                          {statusKey === 'due' && '● Chờ thu'}
                          {statusKey === 'clean' && '● Đang dọn'}
                          {statusKey === 'maintenance' && '● Bảo trì'}
                        </span>
                      </div>

                      <div className="pos-m3-line-rate-frame">
                        {getRoomRateLabel(r.vip)}
                      </div>

                      {serviceCallState.activeCallsByRoom.has(r.id) && (
                        <div style={{ margin: '4px 0 2px' }}>
                          <span
                            className={`pos-m3-room-call-pill ${
                              serviceCallState.activeCallsByRoom.get(r.id)?.status === 'CREATED' ? 'pending' : 'progress'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowServiceCallDrawer(true);
                            }}
                          >
                            🔔 {serviceCallState.activeCallsByRoom.get(r.id)?.status === 'CREATED' ? 'ĐANG GỌI' : 'ĐANG PHỤC VỤ'}
                          </span>
                        </div>
                      )}

                      {rb ? (
                        <div className="pos-m3-room-card-body">
                          <strong className="pos-m3-room-cust">{rb.customer}</strong>
                          <div className="pos-m3-room-meta">
                            {rb.status === 'playing' || rb.status === 'paused' ? (
                              <span className="pos-m3-room-timer">
                                <Clock size={12} /> {clock(playedMs(rb, frozenAt ?? tick))}
                              </span>
                            ) : rb.status === 'finished' ? (
                              <span className="pos-m3-room-timer">
                                <Clock size={12} /> {clock(playedMs(rb, rb.finished ?? 0))}
                              </span>
                            ) : (
                              <span>{time(rb.start)}</span>
                            )}
                            {canSeeMoney && liveQuote > 0 && (
                              <strong className="pos-m3-room-price">{money(liveQuote)}</strong>
                            )}
                          </div>
                        </div>
                      ) : maint ? (
                        <div className="pos-m3-room-card-body">
                          <small>{maint.reason || 'Đang bảo trì kỹ thuật'}</small>
                        </div>
                      ) : (
                        <div className="pos-m3-room-card-body">
                          <span className="pos-m3-room-ready">Sẵn sàng đón khách</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pos-m3-mobile-sticky-footer">
                <button
                  type="button"
                  className="pos-m3-btn-primary pos-m3-btn-block pos-m3-btn-lg"
                  onClick={() => {
                    if (activeBooking) {
                      setMobileScreen(activeBooking.status === 'booked' ? 'M04' : 'M03');
                    } else {
                      setCheckInRoomId(selectedRoomId);
                      setMobileScreen('M04');
                    }
                  }}
                >
                  <span>
                    Tiếp tục với {selectedRoomObj.name}{' '}
                    {activeBooking ? `(${activeBooking.customer})` : '(Nhận khách)'}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              M03 – CHI TIẾT PHIÊN CHƠI
              =============================================================== */}
          {mobileScreen === 'M03' && (
            <div className="pos-m3-screen-m03">
              {!activeBooking ? (
                <div className="pos-m3-empty-box">
                  <Flag size={36} />
                  <h4>{selectedRoomObj.name} đang trống</h4>
                  <p>Chưa có phiên chơi đang mở trên line này.</p>
                  <button
                    type="button"
                    className="pos-m3-btn-primary"
                    onClick={() => {
                      setCheckInRoomId(selectedRoomObj.id);
                      setMobileScreen('M04');
                    }}
                  >
                    Nhận khách & Bắt đầu chơi
                  </button>
                </div>
              ) : (
                <>
                  {/* Session Header & Real-time Timer */}
                  <div className="pos-m3-session-hero">
                    <div className="pos-m3-session-hero-top">
                      <div>
                        <span className="pos-m3-session-room-tag">
                          {selectedRoomObj.vip ? '👑 PHÒNG VIP' : '⛳ LINE TIÊU CHUẨN'} · {selectedRoomObj.name}
                        </span>
                        <h3>{activeBooking.customer}</h3>
                        <small>{activeBooking.phone || 'Khách vãng lai'} · {activeBooking.people} khách</small>
                      </div>
                      <span className={`pos-m3-status-pill ${activeBooking.status}`}>
                        {activeBooking.status === 'playing'
                          ? 'Đang tính giờ'
                          : activeBooking.status === 'paused'
                            ? 'Tạm dừng'
                            : activeBooking.status === 'finished'
                              ? 'Chờ thanh toán'
                              : 'Đã đặt trước'}
                      </span>
                    </div>

                    <div className="pos-m3-live-clock-box">
                      <div>
                        <span>Đồng hồ thời gian thực</span>
                        <strong className="pos-m3-clock-digits">{clock(elapsedMs)}</strong>
                        <small>
                          Bắt đầu thực tế:{' '}
                          {activeBooking.started ? time(activeBooking.started) : 'Chưa bấm bắt đầu'}
                        </small>
                      </div>
                      <div className="pos-m3-live-amount-box">
                        <span>Tạm tính hiện tại</span>
                        <strong>{money(payableTotal)}</strong>
                        <small>{SERVICE_LABEL[activeBooking.service] || activeBooking.service}</small>
                      </div>
                    </div>
                  </div>

                  {/* Service Mode & Quick Time Adjustments */}
                  <div className="pos-m3-card">
                    <div className="pos-m3-card-head">
                      <h4>Hình thức & Điều chỉnh thời gian</h4>
                    </div>
                    <div className="pos-m3-chip-row">
                      {(['gdr', '9', '18'] as const).map((srv) => (
                        <button
                          key={srv}
                          type="button"
                          disabled={saving || !['booked', 'playing', 'paused'].includes(activeBooking.status)}
                          className={`pos-m3-chip ${activeBooking.service === srv ? 'active' : ''}`}
                          onClick={() => handleSwitchService(srv)}
                        >
                          {SERVICE_LABEL[srv]}
                        </button>
                      ))}
                    </div>
                    {activeBooking.service === 'gdr' &&
                      ['playing', 'paused'].includes(activeBooking.status) && (
                        <div className="pos-m3-extend-row">
                          <span>Gia hạn nhanh:</span>
                          {[30, 60, 120].map((m) => (
                            <button
                              key={m}
                              type="button"
                              className="pos-m3-btn-tonal"
                              onClick={() => handleExtendMinutes(m)}
                            >
                              +{m}p
                            </button>
                          ))}
                          <button
                            type="button"
                            className="pos-m3-btn-outline"
                            onClick={handlePauseOrResume}
                          >
                            {activeBooking.status === 'paused' ? (
                              <>
                                <Play size={14} /> Tiếp tục
                              </>
                            ) : (
                              <>
                                <Pause size={14} /> Tạm dừng
                              </>
                            )}
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Breakdown of Golf Rate & F&B Services */}
                  <div className="pos-m3-card">
                    <div className="pos-m3-card-head">
                      <h4>Chi tiết phí giờ & dịch vụ phát sinh</h4>
                      <button
                        type="button"
                        className="pos-m3-btn-tonal"
                        onClick={() => setMobileScreen('M05')}
                      >
                        <Plus size={15} /> Thêm món/DV
                      </button>
                    </div>
                    <div className="pos-m3-line-items">
                      <GolfFeeRows
                        bill={sessionBill}
                        service={activeBooking.service}
                        total={golfTotal}
                        fallback={getRoomRateLabel(selectedRoomObj.vip)}
                        variant="line"
                      />

                      {bookingOrders
                        .filter((o) => o.status !== 'cancelled')
                        .map((ord) => {
                          const lines = JSON.parse(ord.items) as FoodLine[];
                          return (
                            <div key={ord.id} className="pos-m3-line-item">
                              <div>
                                <strong>
                                  {lines.map((l) => `${l.name} ×${l.qty}`).join(', ')}
                                </strong>
                                <small>
                                  Đơn #{ord.id.slice(-4)} · {foodLabels[ord.status]}
                                  {ord.note ? ` · ${ord.note}` : ''}
                                </small>
                              </div>
                              <div className="pos-m3-line-item-right">
                                <strong>{money(ord.total)}</strong>
                                {ord.status !== 'served' && (
                                  <button
                                    type="button"
                                    className="pos-m3-mini-btn"
                                    onClick={() => AdvanceOrderToServed(ord).then(() => food.reload())}
                                  >
                                    Đã phục vụ
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {cart.map((c) => (
                        <div key={c.product.id} className="pos-m3-line-item unsent">
                          <div>
                            <strong>
                              {c.product.name} ×{c.qty} <em>(Chưa lưu)</em>
                            </strong>
                            {c.note && <small>Ghi chú: {c.note}</small>}
                          </div>
                          <strong>{money(c.product.price * c.qty)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sticky Action Bar for M03 */}
                  <div className="pos-m3-mobile-sticky-footer dual">
                    <button
                      type="button"
                      className="pos-m3-btn-tonal pos-m3-btn-lg"
                      onClick={() => setMobileScreen('M05')}
                    >
                      <Plus size={18} /> Thêm F&B / DV
                    </button>
                    <button
                      type="button"
                      className="pos-m3-btn-primary pos-m3-btn-lg"
                      onClick={() => setMobileScreen('M06')}
                    >
                      <span>Xem Hóa đơn & Thu tiền</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===============================================================
              M04 – NHẬN KHÁCH / BẮT ĐẦU CHƠI
              =============================================================== */}
          {mobileScreen === 'M04' && (
            <div className="pos-m3-screen-m04">
              <div className="pos-m3-card">
                <div className="pos-m3-card-head">
                  <h4>1. Chọn Line / Phòng VIP</h4>
                </div>
                <select
                  className="pos-m3-select-lg"
                  value={checkInRoomId}
                  onChange={(e) => {
                    setCheckInRoomId(e.target.value);
                    setSelectedRoomId(e.target.value);
                  }}
                >
                  {roomStatuses.map(({ room: r, statusKey, booking: rb }) => (
                    <option key={r.id} value={r.id} disabled={statusKey === 'maintenance'}>
                      {r.name} —{' '}
                      {statusKey === 'empty'
                        ? `Trống (${getRoomRateLabel(r.vip)})`
                        : statusKey === 'booked'
                          ? `Đặt trước: ${rb?.customer} (${time(rb?.start ?? 0)})`
                          : statusKey === 'playing'
                            ? `Đang chơi: ${rb?.customer}`
                            : statusKey === 'due'
                              ? `Chờ thu: ${rb?.customer}`
                              : statusKey === 'clean'
                                ? 'Đang dọn line'
                                : 'Bảo trì'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pre-booked Reservation Alert if any */}
              {activeBooking && activeBooking.status === 'booked' && (
                <div className="pos-m3-booked-alert">
                  <div>
                    <span className="pos-m3-badge-booked">CÓ LỊCH ĐẶT TRƯỚC</span>
                    <h4>{activeBooking.customer} ({activeBooking.phone})</h4>
                    <p>
                      Giờ hẹn: {time(activeBooking.start)} · {SERVICE_LABEL[activeBooking.service]} ·{' '}
                      {activeBooking.people} khách
                    </p>
                    <small>
                      * Quy tắc: Giờ chơi chỉ bắt đầu tính từ thời điểm bấm xác nhận bên dưới.
                    </small>
                  </div>
                </div>
              )}

              {/* Select Existing Member/Customer or New Walk-in */}
              <div className="pos-m3-card">
                <div className="pos-m3-card-head">
                  <h4>2. Thông tin khách hàng</h4>
                </div>
                <div className="pos-m3-search-box" style={{ marginBottom: 10 }}>
                  <Search size={16} />
                  <input
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Tìm khách/hội viên theo tên, SĐT, mã thẻ..."
                  />
                </div>
                {customersList.length > 0 && (
                  <div className="pos-m3-cust-suggestions">
                    {customersList.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`pos-m3-cust-chip ${checkInPhone === c.phone ? 'active' : ''}`}
                        onClick={() => {
                          setCheckInCustomer(c.name);
                          setCheckInPhone(c.phone);
                        }}
                      >
                        <UserCheck size={14} />
                        <span>
                          <strong>{c.name}</strong> ({c.phone})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pos-m3-form-grid">
                  <label className="pos-m3-field">
                    <span>Họ tên khách hàng *</span>
                    <input
                      value={checkInCustomer}
                      onChange={(e) => setCheckInCustomer(e.target.value)}
                      placeholder="Nhập tên khách hoặc Khách lẻ..."
                    />
                  </label>
                  <label className="pos-m3-field">
                    <span>Số điện thoại (Tích điểm / Dùng gói giờ)</span>
                    <input
                      inputMode="tel"
                      value={checkInPhone}
                      onChange={(e) => setCheckInPhone(e.target.value)}
                      placeholder="090xxxxxxx"
                    />
                  </label>
                </div>
              </div>

              {/* Service & Pricing Config */}
              <div className="pos-m3-card">
                <div className="pos-m3-card-head">
                  <h4>3. Gói dịch vụ & Thời lượng dự kiến</h4>
                </div>
                <div className="pos-m3-chip-row">
                  {(['gdr', '9', '18'] as const).map((srv) => (
                    <button
                      key={srv}
                      type="button"
                      className={`pos-m3-chip ${checkInService === srv ? 'active' : ''}`}
                      onClick={() => setCheckInService(srv)}
                    >
                      {SERVICE_LABEL[srv]}
                    </button>
                  ))}
                </div>
                <div className="pos-m3-form-grid" style={{ marginTop: 10 }}>
                  <label className="pos-m3-field">
                    <span>Thời lượng dự kiến</span>
                    <select
                      value={checkInDuration}
                      onChange={(e) => setCheckInDuration(Number(e.target.value))}
                    >
                      <option value={60}>60 phút (1 giờ)</option>
                      <option value={90}>90 phút (1.5 giờ)</option>
                      <option value={120}>120 phút (2 giờ)</option>
                      <option value={180}>180 phút (3 giờ)</option>
                    </select>
                  </label>
                  <label className="pos-m3-field">
                    <span>Số lượng người chơi</span>
                    <select
                      value={checkInPeople}
                      onChange={(e) => setCheckInPeople(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} người
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="pos-m3-mobile-sticky-footer dual">
                <button
                  type="button"
                  className="pos-m3-btn-outline pos-m3-btn-lg"
                  disabled={saving}
                  onClick={handleReserveSlotOnly}
                >
                  Đặt giữ chỗ
                </button>
                <button
                  type="button"
                  className="pos-m3-btn-primary pos-m3-btn-lg"
                  disabled={saving}
                  onClick={handleStartOrWalkIn}
                >
                  <Play size={18} />
                  <span>{saving ? 'Đang mở phiên…' : 'Bắt đầu tính giờ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              M05 – BÁN HÀNG VÀ DỊCH VỤ (F&B, PHỤ KIỆN, DỊCH VỤ, GÓI GIỜ)
              =============================================================== */}
          {mobileScreen === 'M05' && (
            <div className="pos-m3-screen-m05">
              <div className="pos-m3-search-box">
                <Search size={17} />
                <input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Tìm món ăn, đồ uống, phụ kiện, mã SKU..."
                />
                {catalogSearch && (
                  <button type="button" onClick={() => setCatalogSearch('')}>
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="pos-m3-chip-row">
                {(
                  [
                    ['all', 'Tất cả'],
                    ['fnb', 'F&B'],
                    ['service', 'Dịch vụ'],
                    ['package', 'Gói giờ'],
                    ['accessory', 'Phụ kiện'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`pos-m3-chip ${catalogCat === k ? 'active' : ''}`}
                    onClick={() => setCatalogCat(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 2-Column Product Cards Grid */}
              <div className="pos-m3-catalog-grid">
                {filteredCatalog.length === 0 && (<p className="pos-m3-empty-note">Chưa có món hoặc dịch vụ nào. Thêm trong Cài đặt hệ thống.</p>)}
                {filteredCatalog.map((item) => {
                  const inCart = cart.find((c) => c.product.id === item.id);
                  return (
                    <div key={item.id} className={`pos-m3-prod-card ${inCart ? 'in-cart' : ''}`}>
                      <div className="pos-m3-prod-visual">
                        <span className="pos-m3-prod-cat-tag">
                          {item.category === 'fnb'
                            ? 'F&B'
                            : item.category === 'accessory'
                              ? 'Phụ kiện'
                              : item.category === 'package'
                                ? 'Gói giờ'
                                : 'Dịch vụ'}
                        </span>
                        {item.category === 'fnb' ? (
                          <Coffee size={26} />
                        ) : item.category === 'accessory' ? (
                          <ShoppingBag size={26} />
                        ) : item.category === 'package' ? (
                          <Crown size={26} />
                        ) : (
                          <Sparkles size={26} />
                        )}
                      </div>
                      <div className="pos-m3-prod-info">
                        <strong>{item.name}</strong>
                        <small>{money(item.price)} / {item.unit}</small>
                      </div>
                      <div className="pos-m3-prod-actions">
                        {inCart ? (
                          <div className="pos-m3-qty-stepper">
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, -1)}
                              aria-label="Giảm"
                            >
                              <Minus size={15} />
                            </button>
                            <span>{inCart.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, 1)}
                              aria-label="Tăng"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pos-m3-add-circle"
                            onClick={() => handleAddToCart(item, 1)}
                            aria-label={`Thêm ${item.name}`}
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                      {inCart && (
                        <div className="pos-m3-prod-note-inline">
                          {editingNoteProductId === item.id ? (
                            <input
                              value={inCart.note}
                              onChange={(e) => handleUpdateCartNote(item.id, e.target.value)}
                              onBlur={() => setEditingNoteProductId(null)}
                              placeholder="Ghi chú: ít đá, không đường..."
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className="pos-m3-note-trigger"
                              onClick={() => setEditingNoteProductId(item.id)}
                            >
                              <Edit2 size={11} /> {inCart.note || 'Thêm ghi chú món'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating Green Cart Bar (Matching Reference Image 2 Step 3) */}
              <div className="pos-m3-mobile-sticky-footer">
                <button
                  type="button"
                  className="pos-m3-floating-cart-bar"
                  onClick={() => setMobileScreen('M06')}
                >
                  <div className="pos-m3-cart-bar-left">
                    <ShoppingCart size={20} />
                    <span>Giỏ hàng ({cartCount + bookingOrders.length})</span>
                  </div>
                  <div className="pos-m3-cart-bar-right">
                    <strong>{money(payableTotal)}</strong>
                    <ChevronRight size={18} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              M06 – GIỎ HÀNG / HÓA ĐƠN
              =============================================================== */}
          {mobileScreen === 'M06' && (
            <div className="pos-m3-screen-m06">
              {/* Line / Golf Time Charge */}
              {activeBooking && (
                <div className="pos-m3-card">
                  <div className="pos-m3-card-head">
                    <h4>Phí Line & Thời gian chơi ({selectedRoomObj.name})</h4>
                    <span className="pos-m3-status-pill playing">{clock(elapsedMs)}</span>
                  </div>
                  <div className="pos-m3-cart-row">
                    <div>
                      <strong>
                        {SERVICE_LABEL[activeBooking.service]} ({selectedRoomObj.name})
                      </strong>
                      <small>
                        Khách: {activeBooking.customer} · Bắt đầu:{' '}
                        {activeBooking.started ? time(activeBooking.started) : time(activeBooking.start)}
                      </small>
                    </div>
                    <strong className="pos-m3-price-tag">{money(golfTotal)}</strong>
                  </div>
                </div>
              )}

              {/* Cart Items (Unsent) & Existing Session Orders */}
              <div className="pos-m3-card">
                <div className="pos-m3-card-head">
                  <h4>Danh sách F&B, Phụ kiện & Dịch vụ</h4>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      className="pos-m3-btn-text danger"
                      onClick={() => setCart([])}
                    >
                      <Trash2 size={14} /> Xóa giỏ mới
                    </button>
                  )}
                </div>

                {cart.length === 0 && bookingOrders.length === 0 ? (
                  <p className="pos-m3-empty-note">
                    Chưa có món ăn hoặc dịch vụ cộng thêm.{' '}
                    <button
                      type="button"
                      className="pos-m3-inline-link"
                      onClick={() => setMobileScreen('M05')}
                    >
                      + Chọn thêm món
                    </button>
                  </p>
                ) : (
                  <div className="pos-m3-cart-list">
                    {cart.map((line) => (
                      <div key={line.product.id} className="pos-m3-cart-item">
                        <div className="pos-m3-cart-item-info">
                          <strong>{line.product.name}</strong>
                          <small>{money(line.product.price)} / {line.product.unit}</small>
                          <input
                            className="pos-m3-item-note-input"
                            value={line.note}
                            onChange={(e) => handleUpdateCartNote(line.product.id, e.target.value)}
                            placeholder="Ghi chú món (tùy chọn)..."
                          />
                        </div>
                        <div className="pos-m3-cart-item-controls">
                          <div className="pos-m3-qty-stepper">
                            <button type="button" onClick={() => handleAddToCart(line.product, -1)}>
                              <Minus size={14} />
                            </button>
                            <span>{line.qty}</span>
                            <button type="button" onClick={() => handleAddToCart(line.product, 1)}>
                              <Plus size={14} />
                            </button>
                          </div>
                          <strong>{money(line.product.price * line.qty)}</strong>
                        </div>
                      </div>
                    ))}

                    {bookingOrders
                      .filter((o) => o.status !== 'cancelled')
                      .map((ord) => {
                        const parsed = JSON.parse(ord.items) as FoodLine[];
                        return (
                          <div key={ord.id} className="pos-m3-cart-item committed">
                            <div className="pos-m3-cart-item-info">
                              <strong>
                                {parsed.map((l) => `${l.name} ×${l.qty}`).join(', ')}
                              </strong>
                              <small>
                                Đã ghi vào phiên ({foodLabels[ord.status]})
                                {ord.note ? ` · ${ord.note}` : ''}
                              </small>
                            </div>
                            <div className="pos-m3-cart-item-controls">
                              <strong>{money(ord.total)}</strong>
                              {ord.status !== 'served' && (
                                <button
                                  type="button"
                                  className="pos-m3-btn-text danger"
                                  onClick={() => handleCancelOrder(ord)}
                                >
                                  Hủy
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <label className="pos-m3-field" style={{ marginTop: 10 }}>
                  <span>Ghi chú cho hóa đơn / bếp</span>
                  <input
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn hàng..."
                  />
                </label>

                {cart.length > 0 && activeBooking && (
                  <button
                    type="button"
                    className="pos-m3-btn-tonal pos-m3-btn-block"
                    style={{ marginTop: 10 }}
                    disabled={saving}
                    onClick={() => handleCommitCartToSession(activeBooking.id)}
                  >
                    <Check size={16} /> Lưu các món mới vào phiên chơi
                  </button>
                )}
              </div>

              {/* Discount & Member Privileges */}
              {activeBooking && canDiscount && (
                <div className="pos-m3-card">
                  <div className="pos-m3-card-head">
                    <h4>Ưu đãi & Giảm giá theo phân quyền</h4>
                  </div>
                  <DiscountForm
                    bookingId={activeBooking.id}
                    amount={grossTotal || 100000}
                    onDone={async () => {
                      await reloadBill();
                      await onRefresh();
                      setNotice('Đã áp dụng giảm giá cho hóa đơn');
                    }}
                  />
                </div>
              )}

              {/* Bill Summary Breakdown */}
              <div className="pos-m3-card pos-m3-bill-summary-card">
                <div className="pos-m3-summary-line">
                  <span>
                    Phí giờ chơi ({selectedRoomObj.name})
                    {roundOffer && !keepShort.has(activeBooking?.id || '') && (
                      <span style={{ display: 'block', fontSize: 12, color: '#b45309', fontWeight: 500 }}>
                        ⚠️ Chưa đủ tối thiểu {roundOffer.minMinutes}p (thực tế: {roundOffer.playedMinutes}p)
                      </span>
                    )}
                  </span>
                  <strong>{money(golfTotal)}</strong>
                </div>
                <div className="pos-m3-summary-line">
                  <span>F&B, Phụ kiện & Dịch vụ</span>
                  <strong>{money(fnbTotal)}</strong>
                </div>
                <div className="pos-m3-summary-line">
                  <span>Tạm tính</span>
                  <strong>{money(grossTotal)}</strong>
                </div>
                {discountAmount > 0 && (
                  <div className="pos-m3-summary-line discount">
                    <span>Giảm giá / Ưu đãi ({bill?.discount?.reason})</span>
                    <strong>−{money(discountAmount)}</strong>
                  </div>
                )}
                <div className="pos-m3-summary-line total">
                  <span>Tổng thanh toán</span>
                  <strong>{money(payableTotal)}</strong>
                </div>
              </div>

              <div className="pos-m3-mobile-sticky-footer">
                <button
                  type="button"
                  className="pos-m3-btn-primary pos-m3-btn-block pos-m3-btn-lg"
                  disabled={saving}
                  onClick={() => {
                    if (activeBooking && ['playing', 'paused'].includes(activeBooking.status)) {
                      handleFinishSession(true);
                    } else {
                      setMobileScreen('M07');
                    }
                  }}
                >
                  <span>Thanh toán · {money(payableTotal)}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ===============================================================
              M07 – THANH TOÁN
              =============================================================== */}
          {mobileScreen === 'M07' && (
            <div className="pos-m3-screen-m07">{renderPaymentContent()}</div>
          )}

          {/* ===============================================================
              M08 – HOÀN TẤT
              =============================================================== */}
          {mobileScreen === 'M08' && (
            <div className="pos-m3-screen-m08">
              <div className="pos-m3-receipt-card">
                <div className="pos-m3-success-icon">
                  <Check size={36} />
                </div>
                <h2>Thanh toán thành công!</h2>
                <p>Đơn hàng đã được ghi nhận vào sổ ca và giải phóng line.</p>

                <div className="pos-m3-receipt-box">
                  <div>
                    <span>Mã hóa đơn</span>
                    <strong>#{lastReceipt?.code || 'HD-POS'}</strong>
                  </div>
                  <div>
                    <span>Line / Phòng</span>
                    <strong>{lastReceipt?.roomName || selectedRoomObj.name}</strong>
                  </div>
                  <div>
                    <span>Khách hàng</span>
                    <strong>{lastReceipt?.customer || activeBooking?.customer || 'Khách lẻ'}</strong>
                  </div>
                  <div>
                    <span>Thời gian</span>
                    <strong>
                      {date(lastReceipt?.at ?? Date.now())} – {time(lastReceipt?.at ?? Date.now())}
                    </strong>
                  </div>
                  <div>
                    <span>Phương thức</span>
                    <strong>{lastReceipt?.methodLabel || PAY_LABEL[payMethod]}</strong>
                  </div>
                  <div className="pos-m3-receipt-total">
                    <span>Tổng thanh toán</span>
                    <strong>{money(lastReceipt?.total ?? payableTotal)}</strong>
                  </div>
                </div>

                <div className="pos-m3-receipt-actions">
                  <button
                    type="button"
                    className="pos-m3-btn-primary pos-m3-btn-block pos-m3-btn-lg"
                    onClick={() => handlePrintReceipt()}
                  >
                    <Printer size={18} /> In hóa đơn (K80)
                  </button>
                  <button
                    type="button"
                    className="pos-m3-btn-tonal pos-m3-btn-block pos-m3-btn-lg"
                    onClick={() => handleSendZaloReceipt()}
                  >
                    <Send size={18} /> Gửi hóa đơn (Zalo / Email)
                  </button>
                  <button
                    type="button"
                    className="pos-m3-btn-outline pos-m3-btn-block pos-m3-btn-lg"
                    onClick={() => {
                      setLastReceipt(null);
                      setActiveBookingId(null);
                      setMobileScreen('M02');
                    }}
                  >
                    <Home size={18} /> Đóng phiên & Quay về Sơ đồ POS
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              M09 – QUẢN LÝ CA
              =============================================================== */}
          {mobileScreen === 'M09' && (
            <div className="pos-m3-screen-m09">{renderShiftManagementContent()}</div>
          )}

          {/* ===============================================================
              M10 – LỊCH SỬ GIAO DỊCH
              =============================================================== */}
          {mobileScreen === 'M10' && (
            <div className="pos-m3-screen-m10">{renderTransactionHistoryContent()}</div>
          )}
        </main>

        {/* Fixed 5-Tab Bottom Navigation Bar (POS | Đặt sân | Đơn hàng | Khách hàng | Thêm) */}
        <nav className="pos-m3-mobile-bottom-nav" aria-label="Điều hướng POS Mobile">
          <button
            type="button"
            className={mobileTab === 'pos' && ['M01', 'M02', 'M03', 'M05'].includes(mobileScreen) ? 'active' : ''}
            onClick={() => {
              setMobileTab('pos');
              setMobileScreen(mobileScreen === 'M01' ? 'M02' : 'M01');
            }}
          >
            <Store size={20} />
            <span>POS</span>
          </button>

          <button
            type="button"
            className={mobileTab === 'bookings' || mobileScreen === 'M04' ? 'active' : ''}
            onClick={() => {
              setMobileTab('bookings');
              setMobileScreen('M04');
            }}
          >
            <CalendarDays size={20} />
            <span>Đặt sân</span>
          </button>

          <button
            type="button"
            className={
              mobileTab === 'orders' || ['M06', 'M07', 'M10'].includes(mobileScreen) ? 'active' : ''
            }
            onClick={() => {
              setMobileTab('orders');
              setMobileScreen(activeBooking && activeBooking.status !== 'paid' ? 'M06' : 'M10');
            }}
          >
            <Receipt size={20} />
            <span>Đơn hàng</span>
          </button>

          <button
            type="button"
            className={mobileTab === 'customers' ? 'active' : ''}
            onClick={() => {
              setMobileTab('customers');
              if (onGo) onGo('crmx');
            }}
          >
            <Users size={20} />
            <span>Khách hàng</span>
          </button>

          <button
            type="button"
            className={mobileTab === 'more' || mobileScreen === 'M09' ? 'active' : ''}
            onClick={() => {
              setMobileTab('more');
              setMobileScreen('M09');
            }}
          >
            <MoreHorizontal size={20} />
            <span>Thêm</span>
          </button>
        </nav>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: POS DESKTOP (>= 1366px COMMERCIAL SINGLE-WORKSPACE LAYOUT)
  // ============================================================================
  return (
    <div className="pos-m3-desktop-workspace">
      {/* 1. POS Operational Header (Facility, Shift, Staff, Notifications) */}
      <header className="pos-m3-desktop-header">
        <div className="pos-m3-header-facility">
          <div className="pos-m3-facility-icon">
            <Building2 size={20} />
          </div>
          <div>
            <strong>{data.config?.name || 'Saigon Indoor Golf Club'}</strong>
            <small>{data.config?.address || '250 Lương Định Của, P. Bình Trưng, TP.HCM'}</small>
          </div>
        </div>

        {/* Shift Status Pill & Quick Operational Tools */}
        <div className="pos-m3-header-center">
          <button
            type="button"
            className={`pos-m3-header-shift-pill ${data.activeShift ? 'open' : 'closed'}`}
            onClick={() => setDesktopDrawer(desktopDrawer === 'shift' ? null : 'shift')}
          >
            <span className="pos-m3-dot" />
            <span>
              {data.activeShift
                ? `${data.activeShift.name} · Mở lúc ${time(data.activeShift.opened_at)}`
                : 'Chưa mở ca thu ngân — Bấm để mở ca'}
            </span>
          </button>

          <button
            type="button"
            className={`pos-m3-header-tool-btn ${desktopDrawer === 'shift' ? 'active' : ''}`}
            onClick={() => setDesktopDrawer(desktopDrawer === 'shift' ? null : 'shift')}
          >
            <Wallet size={16} />
            <span>Quản lý ca</span>
          </button>

          <button
            type="button"
            className={`pos-m3-header-tool-btn ${desktopDrawer === 'history' ? 'active' : ''}`}
            onClick={() => setDesktopDrawer(desktopDrawer === 'history' ? null : 'history')}
          >
            <History size={16} />
            <span>Lịch sử giao dịch</span>
          </button>

          <button
            type="button"
            className="pos-m3-header-tool-btn"
            onClick={() => {
              kickCashDrawer();
              setNotice('Đã kích hoạt mở két tiền mặt (F4)');
            }}
            title="Mở két đựng tiền mặt (Phím tắt F4)"
          >
            <Banknote size={16} />
            <span>Két tiền (F4)</span>
          </button>
        </div>

        {/* Staff & Notifications */}
        <div className="pos-m3-header-right">
          <div className="pos-m3-bell-wrap">
            <button
              type="button"
              className="pos-m3-header-bell"
              onClick={() => setShowBellPopover(!showBellPopover)}
              aria-label="Thông báo vận hành"
            >
              <Bell size={18} />
              {totalNotifications > 0 && <em>{totalNotifications}</em>}
            </button>
            {showBellPopover && (
              <div className="pos-m3-bell-popover">
                <div className="pos-m3-bell-popover-head">
                  <strong>Thông báo vận hành</strong>
                  <button type="button" onClick={() => setShowBellPopover(false)}>
                    <X size={15} />
                  </button>
                </div>
                {newSupportRequests.length === 0 && !data.onlinePending && serviceCallState.pendingCount === 0 ? (
                  <p className="pos-m3-empty-note">Không có yêu cầu hỗ trợ hay đặt sân mới.</p>
                ) : (
                  <div className="pos-m3-bell-list">
                    {serviceCallState.pendingCount > 0 && (
                      <button
                        type="button"
                        className="pos-m3-bell-item"
                        style={{ background: '#fef2f2', borderLeft: '3px solid #dc2626' }}
                        onClick={() => {
                          setShowBellPopover(false);
                          setShowServiceCallDrawer(true);
                        }}
                      >
                        <strong style={{ color: '#dc2626' }}>
                          🔔 {serviceCallState.pendingCount} yêu cầu gọi phục vụ tại line
                        </strong>
                        <small>Nhấn để xem và tiếp nhận phục vụ</small>
                      </button>
                    )}
                    {(data.onlinePending ?? 0) > 0 && (
                      <button
                        type="button"
                        className="pos-m3-bell-item"
                        onClick={() => {
                          setShowBellPopover(false);
                          onGo?.('online');
                        }}
                      >
                        <strong>{data.onlinePending} yêu cầu đặt sân online chờ duyệt</strong>
                        <small>Nhấn để mở danh sách duyệt lịch hẹn</small>
                      </button>
                    )}
                    {newSupportRequests.map((req) => (
                      <div key={req.id} className="pos-m3-bell-item">
                        <strong>Yêu cầu tại line: {req.kind}</strong>
                        <small>{time(req.created)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pos-m3-staff-badge">
            <div className="pos-m3-staff-avatar">
              {(data.user || 'T').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{data.user || 'Thu ngân'}</strong>
              <small>{data.role === 'owner' ? 'Quản trị / Chủ cơ sở' : 'Nhân viên vận hành'}</small>
            </div>
          </div>
        </div>
      </header>

      {/* Realtime Service Call Banner */}
      <ServiceCallBanner
        call={serviceCallState.bannerCall}
        onAcknowledge={serviceCallState.acknowledgeCall}
        onOpenDetails={() => setShowServiceCallDrawer(true)}
        onDismiss={serviceCallState.dismissBanner}
        onNavigateToPayment={(roomId) => {
          selectRoom(roomId);
          setDesktopMode('payment');
        }}
      />

      {/* Toast Feedback */}
      {(notice || errorMsg) && (
        <div className={`pos-m3-desktop-banner ${errorMsg ? 'error' : 'success'}`} role="status">
          {errorMsg ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
          <span>{errorMsg || notice}</span>
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setErrorMsg('');
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Drawer Overlay for M09 Shift Management or M10 Transaction History on Desktop */}
      {desktopDrawer && (
        <div className="pos-m3-desktop-drawer-backdrop" onClick={() => setDesktopDrawer(null)}>
          <section
            className="pos-m3-desktop-drawer"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            aria-label={desktopDrawer === 'shift' ? 'Quản lý ca làm việc' : 'Lịch sử giao dịch'}
          >
            <header className="pos-m3-drawer-head">
              <div>
                <h3>
                  {desktopDrawer === 'shift'
                    ? 'Quản lý ca & Đối soát sổ quỹ'
                    : 'Lịch sử giao dịch & Hóa đơn'}
                </h3>
                <p>
                  {desktopDrawer === 'shift'
                    ? 'Mở ca, nạp/rút quỹ tiền mặt, đối soát doanh thu và bàn giao ca (Z-Report)'
                    : 'Tìm kiếm hóa đơn, in lại biên nhận, xử lý hoàn tiền hoặc hủy theo phân quyền'}
                </p>
              </div>
              <button
                type="button"
                className="pos-m3-icon-btn"
                aria-label="Đóng"
                onClick={() => setDesktopDrawer(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="pos-m3-drawer-body">
              {desktopDrawer === 'shift'
                ? renderShiftManagementContent()
                : renderTransactionHistoryContent()}
            </div>
          </section>
        </div>
      )}

      {/* 2. Main Split Content: Left Floor Plan (10 Standard Lines + 2 VIP) & Right Session Panel */}
      <div className="pos-m3-desktop-split">
        {/* LEFT COLUMN: 10 STANDARD LINES + 2 VIP ROOMS */}
        <section className="pos-m3-floor-section" aria-label="Sơ đồ 10 Line tiêu chuẩn và 2 Phòng VIP">
          {/* Filter & Search Bar */}
          <div className="pos-m3-floor-toolbar">
            <div className="pos-m3-chip-row">
              {(
                [
                  ['all', `Tất cả (${roomCounts.all})`],
                  ['playing', `Đang chơi (${roomCounts.playing})`],
                  ['empty', `Trống (${roomCounts.empty})`],
                  ['booked', `Đặt trước (${roomCounts.booked})`],
                  ['due', `Chờ thanh toán (${roomCounts.due})`],
                  ['maintenance', `Bảo trì (${roomCounts.maintenance})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`pos-m3-chip ${roomFilter === k ? 'active' : ''}`}
                  onClick={() => setRoomFilter(k)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pos-m3-search-box compact">
              <Search size={16} />
              <input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Tìm khách, SĐT, line..."
              />
              {roomSearch && (
                <button type="button" onClick={() => setRoomSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sơ đồ Line & Phòng VIP: chung 1 ô, 2 phòng VIP để đầu */}
          <div className="pos-m3-floor-group">
            <div className="pos-m3-desktop-line-grid">
              {filteredRooms.map(renderDeskRoom)}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DOCKED SESSION & CASHIER PANEL (NO PAGE RELOAD) */}
        <aside className="pos-m3-docked-panel" aria-label="Chi tiết line và thao tác thu ngân">
          {/* Panel Header */}
          <div className="pos-m3-panel-header">
            <div>
              <div className="pos-m3-panel-room-badge">
                {selectedRoomObj.vip ? <Crown size={15} /> : <Flag size={15} />}
                <span>{selectedRoomObj.name}</span>
                {activeBooking && (
                  <em className={`pos-m3-status-pill ${activeBooking.status}`}>
                    {activeBooking.status === 'playing'
                      ? 'Đang chơi'
                      : activeBooking.status === 'paused'
                        ? 'Tạm dừng'
                        : activeBooking.status === 'finished'
                          ? 'Chờ thanh toán'
                          : activeBooking.status === 'paid'
                            ? 'Đã thanh toán'
                            : activeBooking.status === 'cancelled'
                              ? 'Đã hủy'
                              : 'Đặt trước'}
                  </em>
                )}
              </div>
              <h3>
                {activeBooking ? activeBooking.customer : `${selectedRoomObj.name} — Đang trống`}
              </h3>
              <small>
                {activeBooking
                  ? `${activeBooking.phone || 'Khách vãng lai'} · ${activeBooking.people} người · ${SERVICE_LABEL[activeBooking.service] || activeBooking.service}`
                  : `Đơn giá niêm yết: ${getRoomRateLabel(selectedRoomObj.vip)}`}
              </small>
            </div>

            {activeBooking && (
              <div className="pos-m3-panel-header-tools">
                <button
                  type="button"
                  className="pos-m3-icon-btn"
                  onClick={() => handlePrintReceipt(activeBooking)}
                  title="In phiếu tạm tính / hóa đơn K80"
                >
                  <Printer size={17} />
                </button>
                <button
                  type="button"
                  className="pos-m3-icon-btn"
                  onClick={handlePrintKitchen}
                  title="In phiếu bếp / quầy bar"
                >
                  <Utensils size={17} />
                </button>
              </div>
            )}
          </div>

          {/* Live Metrics Strip when a session is active */}
          {activeBooking && (
            <div className="pos-m3-panel-metrics">
              <div className="pos-m3-metric-box">
                <span>Giờ bắt đầu</span>
                <strong>
                  {activeBooking.started
                    ? time(activeBooking.started)
                    : activeBooking.status === 'booked'
                      ? `Hẹn ${time(activeBooking.start)}`
                      : time(activeBooking.start)}
                </strong>
              </div>
              <div className="pos-m3-metric-box clock">
                <span>Thời gian đã chơi</span>
                <strong>{clock(elapsedMs)}</strong>
              </div>
              <div className="pos-m3-metric-box total">
                <span>{activeBooking?.status === 'paid' ? 'Đã thanh toán' : 'Tiền tạm tính'}</span>
                <strong>
                  {canSeeMoney
                    ? money(activeBooking?.status === 'paid' ? (activeBooking.amount ?? payableTotal) : payableTotal)
                    : '***'}
                </strong>
              </div>
            </div>
          )}

          {/* Panel Mode Sub-navigation Tabs */}
          <div className="pos-m3-panel-tabs">
            <button
              type="button"
              className={desktopMode === 'overview' ? 'active' : ''}
              onClick={() => setDesktopMode('overview')}
            >
              Chi tiết phiên
            </button>
            <button
              type="button"
              className={desktopMode === 'checkin' ? 'active' : ''}
              onClick={() => {
                setCheckInRoomId(selectedRoomObj.id);
                setDesktopMode('checkin');
              }}
            >
              Nhận khách
            </button>
            <button
              type="button"
              className={desktopMode === 'catalog' ? 'active' : ''}
              onClick={() => setDesktopMode('catalog')}
            >
              + Dịch vụ / F&B {cartCount > 0 ? `(${cartCount})` : ''}
            </button>
            <button
              type="button"
              className={desktopMode === 'payment' ? 'active' : ''}
              onClick={() => setDesktopMode('payment')}
            >
              Thanh toán
            </button>
          </div>

          {/* Scrollable Panel Workspace */}
          <div className="pos-m3-panel-body">
            {/* SUB-VIEW A: OVERVIEW & USED SERVICES */}
            {desktopMode === 'overview' && (
              <>
                {!activeBooking ? (
                  <div className="pos-m3-empty-session-box">
                    <Flag size={36} />
                    <h4>{selectedRoomObj.name} sẵn sàng đón khách</h4>
                    <p>
                      Chọn khách có sẵn hoặc tạo phiên khách lẻ để bắt đầu tính giờ chơi thực tế ngay trên line này.
                    </p>
                    <button
                      type="button"
                      className="pos-m3-btn-primary"
                      onClick={() => {
                        setCheckInRoomId(selectedRoomObj.id);
                        setDesktopMode('checkin');
                      }}
                    >
                      <UserPlus size={16} /> Nhận khách & Bắt đầu chơi
                    </button>
                  </div>
                ) : (
                  <div className="pos-m3-panel-overview">
                    {/* Service Mode & Time Extension Controls */}
                    {['booked', 'playing', 'paused'].includes(activeBooking.status) && (
                      <div className="pos-m3-panel-section">
                        <div className="pos-m3-section-title">
                          <span>Gói tính giá & Thời gian</span>
                          {activeBooking.status !== 'booked' && (
                            <button
                              type="button"
                              className="pos-m3-btn-text"
                              onClick={handlePauseOrResume}
                            >
                              {activeBooking.status === 'paused' ? '▶ Tiếp tục tính giờ' : '⏸ Tạm dừng'}
                            </button>
                          )}
                        </div>
                        <div className="pos-m3-chip-row">
                          {(['gdr', '9', '18'] as const).map((srv) => (
                            <button
                              key={srv}
                              type="button"
                              disabled={saving}
                              className={`pos-m3-chip ${activeBooking.service === srv ? 'active' : ''}`}
                              onClick={() => handleSwitchService(srv)}
                            >
                              {SERVICE_LABEL[srv]}
                            </button>
                          ))}
                        </div>
                        {activeBooking.service === 'gdr' && (
                          <div className="pos-m3-extend-strip">
                            <span>Gia hạn:</span>
                            {[30, 60, 120].map((m) => (
                              <button
                                key={m}
                                type="button"
                                className="pos-m3-mini-btn"
                                onClick={() => handleExtendMinutes(m)}
                              >
                                +{m} phút
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Used Services & F&B Breakdown */}
                    <div className="pos-m3-panel-section">
                      <div className="pos-m3-section-title">
                        <span>Dịch vụ & F&B đã sử dụng</span>
                        <button
                          type="button"
                          className="pos-m3-btn-text"
                          onClick={() => setDesktopMode('catalog')}
                        >
                          + Thêm món / dịch vụ
                        </button>
                      </div>

                      <div className="pos-m3-used-list">
                        {/* Golf fee: one row per service when the session switched between them */}
                        <GolfFeeRows
                          bill={sessionBill}
                          service={activeBooking.service}
                          total={golfTotal}
                          fallback={getRoomRateLabel(selectedRoomObj.vip)}
                          variant="used"
                        />

                        {/* Committed F&B / Service Orders */}
                        {bookingOrders
                          .filter((o) => o.status !== 'cancelled')
                          .map((ord) => {
                            const lines = JSON.parse(ord.items) as FoodLine[];
                            return (
                              <div key={ord.id} className="pos-m3-used-row">
                                <div>
                                  <strong>
                                    {lines.map((l) => `${l.name} ×${l.qty}`).join(', ')}
                                  </strong>
                                  <small>
                                    {foodLabels[ord.status]}
                                    {ord.note ? ` · ${ord.note}` : ''}
                                  </small>
                                </div>
                                <div className="pos-m3-used-row-actions">
                                  <strong>{money(ord.total)}</strong>
                                  {ord.status !== 'served' && (
                                    <>
                                      <button
                                        type="button"
                                        className="pos-m3-mini-btn success"
                                        onClick={() =>
                                          AdvanceOrderToServed(ord).then(() => {
                                            food.reload();
                                            onRefresh();
                                          })
                                        }
                                      >
                                        Phục vụ
                                      </button>
                                      <button
                                        type="button"
                                        className="pos-m3-mini-btn danger"
                                        onClick={() => handleCancelOrder(ord)}
                                      >
                                        Hủy
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {/* Uncommitted Cart Items */}
                        {cart.map((c) => (
                          <div key={c.product.id} className="pos-m3-used-row draft">
                            <div>
                              <strong>
                                {c.product.name} ×{c.qty} <em>(Mới chọn)</em>
                              </strong>
                              {c.note && <small>Ghi chú: {c.note}</small>}
                            </div>
                            <div className="pos-m3-used-row-actions">
                              <strong>{money(c.product.price * c.qty)}</strong>
                              <button
                                type="button"
                                className="pos-m3-mini-btn"
                                onClick={() => handleAddToCart(c.product, -1)}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="pos-m3-mini-btn"
                                onClick={() => handleAddToCart(c.product, 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {cart.length > 0 && (
                        <button
                          type="button"
                          className="pos-m3-btn-tonal pos-m3-btn-block"
                          style={{ marginTop: 8 }}
                          disabled={saving}
                          onClick={() => handleCommitCartToSession(activeBooking.id)}
                        >
                          <Check size={15} /> Lưu {cartCount} món mới vào hóa đơn
                        </button>
                      )}
                    </div>

                    {/* Member Package / Wallet & Manager Discount */}
                    <div className="pos-m3-panel-section">
                      <PackageRedeem
                        booking={activeBooking}
                        money={money}
                        onChanged={async () => {
                          await onRefresh();
                          await reloadBill();
                        }}
                      />
                      {canDiscount && (
                        <div style={{ marginTop: 6 }}>
                          <DiscountForm
                            bookingId={activeBooking.id}
                            amount={grossTotal || 100000}
                            onDone={async () => {
                              await reloadBill();
                              await onRefresh();
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Bill Summary Box */}
                    <div className="pos-m3-panel-bill-box">
                      <div>
                        <span>
                          Tiền giờ chơi golf
                          {roundOffer && !keepShort.has(activeBooking?.id || '') && (
                            <span style={{ display: 'block', fontSize: 11, color: '#b45309', fontWeight: 500 }}>
                              ⚠️ Chưa đủ tối thiểu {roundOffer.minMinutes}p (thực tế: {roundOffer.playedMinutes}p)
                            </span>
                          )}
                        </span>
                        <strong>{money(golfTotal)}</strong>
                      </div>
                      <div>
                        <span>Tiền F&B & Dịch vụ</span>
                        <strong>{money(fnbTotal)}</strong>
                      </div>
                      {discountAmount > 0 && (
                        <div className="discount">
                          <span>Giảm giá ({bill?.discount?.reason})</span>
                          <strong>−{money(discountAmount)}</strong>
                        </div>
                      )}
                      <div className="grand-total">
                        <span>Tổng tạm tính</span>
                        <strong>{money(payableTotal)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* SUB-VIEW B: CHECK-IN / START SESSION INLINE */}
            {desktopMode === 'checkin' && (
              <div className="pos-m3-panel-checkin">
                <div className="pos-m3-section-title">
                  <span>Nhận khách & Mở phiên tại {selectedRoomObj.name}</span>
                </div>

                {activeBooking && activeBooking.status === 'booked' && (
                  <div className="pos-m3-booked-alert">
                    <span className="pos-m3-badge-booked">LỊCH ĐẶT TRƯỚC</span>
                    <h4>
                      {activeBooking.customer} ({activeBooking.phone})
                    </h4>
                    <p>
                      Giờ hẹn: {time(activeBooking.start)} · {SERVICE_LABEL[activeBooking.service]}
                    </p>
                  </div>
                )}

                <div className="pos-m3-search-box" style={{ marginBottom: 8 }}>
                  <Search size={15} />
                  <input
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Tra cứu nhanh hội viên / khách quen..."
                  />
                </div>
                {customersList.length > 0 && (
                  <div className="pos-m3-cust-suggestions">
                    {customersList.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`pos-m3-cust-chip ${checkInPhone === c.phone ? 'active' : ''}`}
                        onClick={() => {
                          setCheckInCustomer(c.name);
                          setCheckInPhone(c.phone);
                        }}
                      >
                        <UserCheck size={13} />
                        <span>
                          <strong>{c.name}</strong> ({c.phone})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pos-m3-form-stack">
                  <label className="pos-m3-field">
                    <span>Tên khách hàng *</span>
                    <input
                      value={checkInCustomer}
                      onChange={(e) => setCheckInCustomer(e.target.value)}
                      placeholder="Nhập tên khách hoặc Khách lẻ..."
                    />
                  </label>
                  <label className="pos-m3-field">
                    <span>Số điện thoại</span>
                    <input
                      inputMode="tel"
                      value={checkInPhone}
                      onChange={(e) => setCheckInPhone(e.target.value)}
                      placeholder="090xxxxxxx"
                    />
                  </label>
                  <div className="pos-m3-form-row-2">
                    <label className="pos-m3-field">
                      <span>Hình thức chơi</span>
                      <select
                        value={checkInService}
                        onChange={(e) => setCheckInService(e.target.value as 'gdr' | '9' | '18')}
                      >
                        <option value="gdr">Luyện tập theo giờ</option>
                        <option value="9">Game 9 hố</option>
                        <option value="18">Game 18 hố</option>
                      </select>
                    </label>
                    <label className="pos-m3-field">
                      <span>Thời lượng dự kiến</span>
                      <select
                        value={checkInDuration}
                        onChange={(e) => setCheckInDuration(Number(e.target.value))}
                      >
                        <option value={60}>60 phút</option>
                        <option value={90}>90 phút</option>
                        <option value={120}>120 phút</option>
                        <option value={180}>180 phút</option>
                      </select>
                    </label>
                  </div>
                  <label className="pos-m3-field">
                    <span>Số người chơi</span>
                    <select
                      value={checkInPeople}
                      onChange={(e) => setCheckInPeople(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} khách
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="pos-m3-checkin-btns">
                  <button
                    type="button"
                    className="pos-m3-btn-outline"
                    disabled={saving}
                    onClick={handleReserveSlotOnly}
                  >
                    Đặt giữ chỗ
                  </button>
                  <button
                    type="button"
                    className="pos-m3-btn-primary"
                    disabled={saving}
                    onClick={handleStartOrWalkIn}
                  >
                    <Play size={16} /> Bắt đầu tính giờ ngay
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VIEW C: ADD F&B & SERVICES INLINE */}
            {desktopMode === 'catalog' && (
              <div className="pos-m3-panel-catalog">
                <div className="pos-m3-search-box compact">
                  <Search size={15} />
                  <input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Tìm F&B, phụ kiện, dịch vụ, SKU..."
                  />
                </div>
                <div className="pos-m3-chip-row">
                  {(
                    [
                      ['all', 'Tất cả'],
                      ['fnb', 'F&B'],
                      ['service', 'Dịch vụ'],
                      ['accessory', 'Phụ kiện'],
                      ['package', 'Gói giờ'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      className={`pos-m3-chip ${catalogCat === k ? 'active' : ''}`}
                      onClick={() => setCatalogCat(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="pos-m3-panel-prod-list">
                  {filteredCatalog.length === 0 && (<p className="pos-m3-empty-note">Chưa có món hoặc dịch vụ nào. Thêm trong Cài đặt hệ thống.</p>)}
                  {filteredCatalog.map((item) => {
                    const inCart = cart.find((c) => c.product.id === item.id);
                    return (
                      <div key={item.id} className={`pos-m3-panel-prod-row ${inCart ? 'selected' : ''}`}>
                        <div className="pos-m3-panel-prod-info">
                          <strong>{item.name}</strong>
                          <small>
                            {money(item.price)} / {item.unit}
                          </small>
                          {inCart && (
                            <input
                              className="pos-m3-item-note-input"
                              value={inCart.note}
                              onChange={(e) => handleUpdateCartNote(item.id, e.target.value)}
                              placeholder="Ghi chú món (ít đá, không đường...)"
                            />
                          )}
                        </div>
                        {inCart ? (
                          <div className="pos-m3-qty-stepper">
                            <button type="button" onClick={() => handleAddToCart(item, -1)}>
                              <Minus size={14} />
                            </button>
                            <span>{inCart.qty}</span>
                            <button type="button" onClick={() => handleAddToCart(item, 1)}>
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pos-m3-btn-tonal"
                            onClick={() => handleAddToCart(item, 1)}
                          >
                            <Plus size={14} /> Thêm
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cart.length > 0 && (
                  <div className="pos-m3-panel-cart-commit">
                    <label className="pos-m3-switch-row">
                      <span>Xác nhận đã phục vụ ngay tại quầy</span>
                      <input
                        type="checkbox"
                        checked={autoServeAtCounter}
                        onChange={(e) => setAutoServeAtCounter(e.target.checked)}
                      />
                    </label>
                    <button
                      type="button"
                      className="pos-m3-btn-primary pos-m3-btn-block"
                      disabled={saving || !activeBooking}
                      onClick={async () => {
                        const ok = await handleCommitCartToSession();
                        if (ok) setDesktopMode('overview');
                      }}
                    >
                      <Check size={16} />
                      <span>
                        {activeBooking
                          ? `Cập nhật ${cartCount} món vào ${selectedRoomObj.name} (${money(cartTotal)})`
                          : 'Hãy chọn hoặc mở phiên chơi trước'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW D: PAYMENT INLINE */}
            {desktopMode === 'payment' && renderPaymentContent()}

            {/* SUB-VIEW E: COMPLETED RECEIPT INLINE */}
            {desktopMode === 'receipt' && (
              <div className="pos-m3-panel-receipt">
                <div className="pos-m3-success-icon">
                  <Check size={32} />
                </div>
                <h4>Hoàn tất thanh toán!</h4>
                <p>Line đã Sẵn sàng đón khách mới.</p>
                {lastReceipt && (
                  <div className="pos-m3-receipt-box">
                    <div>
                      <span>Mã biên nhận</span>
                      <strong>#{lastReceipt.code}</strong>
                    </div>
                    <div>
                      <span>Khách hàng</span>
                      <strong>{lastReceipt.customer}</strong>
                    </div>
                    <div>
                      <span>Phương thức</span>
                      <strong>{lastReceipt.methodLabel}</strong>
                    </div>
                    <div className="pos-m3-receipt-total">
                      <span>Đã thu</span>
                      <strong>{money(lastReceipt.total)}</strong>
                    </div>
                  </div>
                )}
                <div className="pos-m3-receipt-actions">
                  <button
                    type="button"
                    className="pos-m3-btn-primary pos-m3-btn-block"
                    onClick={() => handlePrintReceipt()}
                  >
                    <Printer size={16} /> In hóa đơn nhiệt K80
                  </button>
                  <button
                    type="button"
                    className="pos-m3-btn-tonal pos-m3-btn-block"
                    onClick={() => handleSendZaloReceipt()}
                  >
                    <Send size={16} /> Gửi biên nhận Zalo
                  </button>
                  <button
                    type="button"
                    className="pos-m3-btn-outline pos-m3-btn-block"
                    onClick={() => {
                      setLastReceipt(null);
                      setActiveBookingId(null);
                      setDesktopMode('overview');
                    }}
                  >
                    Đóng biên nhận
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5 QUICK ACTIONS BAR DOCKED AT THE BOTTOM OF RIGHT PANEL */}
          <footer className="pos-m3-panel-quick-actions" aria-label="5 thao tác nhanh">
            <button
              type="button"
              className={`pos-m3-qbtn ${desktopMode === 'checkin' ? 'active' : ''}`}
              onClick={() => {
                setCheckInRoomId(selectedRoomObj.id);
                setDesktopMode('checkin');
              }}
            >
              <UserPlus size={16} />
              <span>Nhận khách</span>
            </button>

            <button
              type="button"
              className="pos-m3-qbtn"
              disabled={saving || (!!activeBooking && activeBooking.status === 'playing')}
              onClick={handleStartOrWalkIn}
            >
              <Play size={16} />
              <span>Bắt đầu chơi</span>
            </button>

            <button
              type="button"
              className={`pos-m3-qbtn ${desktopMode === 'catalog' ? 'active' : ''}`}
              onClick={() => setDesktopMode('catalog')}
            >
              <Plus size={16} />
              <span>Thêm dịch vụ</span>
            </button>

            <button
              type="button"
              className="pos-m3-qbtn warn"
              disabled={
                saving ||
                !activeBooking ||
                !['playing', 'paused'].includes(activeBooking.status)
              }
              onClick={() => handleFinishSession(true)}
            >
              <Square size={16} />
              <span>Kết thúc chơi</span>
            </button>

            <button
              type="button"
              className="pos-m3-qbtn primary"
              disabled={saving || !activeBooking}
              onClick={() => {
                if (activeBooking && ['playing', 'paused'].includes(activeBooking.status)) {
                  handleFinishSession(true);
                } else {
                  setDesktopMode('payment');
                }
              }}
            >
              <CreditCard size={16} />
              <span>Thanh toán</span>
            </button>
          </footer>
        </aside>
      </div>

      {/* Service Call Drawer (Quản lý gọi phục vụ trực tiếp) */}
      <ServiceCallDrawer
        isOpen={showServiceCallDrawer}
        onClose={() => setShowServiceCallDrawer(false)}
        calls={serviceCallState.calls}
        onAcknowledge={serviceCallState.acknowledgeCall}
        onStart={serviceCallState.startCall}
        onComplete={serviceCallState.completeCall}
        onCancel={serviceCallState.cancelCall}
        onCreateProxy={serviceCallState.createProxyCall}
        onNavigateToPayment={(roomId) => {
          if (isMobile) {
            selectRoom(roomId, 'M07');
          } else {
            selectRoom(roomId);
            setDesktopMode('payment');
          }
        }}
      />
    </div>
  );
}
