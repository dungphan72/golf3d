'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Edit2,
  FileText,
  Flag,
  Grid2X2,
  MessageCircle,
  Package,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Send,
  Trash2,
  User,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { rooms, money, type Booking, type Segment } from '../../lib/club';
import type { Data } from './shared';
import { roomInfo } from './widgets';
import { playedMs, clock } from './PosBoard';
import { generateK80Html, printK80Receipt, formatBillZaloText, sendBillToZalo } from '../../lib/thermal-receipt';
import '../pos-flow.css';

export interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  category: 'golf' | 'fnb' | 'service' | 'accessory' | 'combo';
}

interface ProductDef {
  id: string;
  name: string;
  price: number;
  category: 'fnb' | 'service' | 'accessory' | 'combo';
  icon: string;
}

const DEFAULT_PRODUCTS: ProductDef[] = [
  // F&B
  { id: 'p-water', name: 'Nước suối', price: 20000, category: 'fnb', icon: '💧' },
  { id: 'p-coffee', name: 'Cà phê', price: 45000, category: 'fnb', icon: '☕' },
  { id: 'p-juice', name: 'Nước ép', price: 55000, category: 'fnb', icon: '🍹' },
  { id: 'p-sandwich', name: 'Bánh sandwich', price: 60000, category: 'fnb', icon: '🥪' },
  { id: 'p-noodle', name: 'Mì ly', price: 40000, category: 'fnb', icon: '🍜' },
  { id: 'p-cake', name: 'Bánh ngọt', price: 45000, category: 'fnb', icon: '🧁' },
  { id: 'p-fruit', name: 'Trái cây', price: 50000, category: 'fnb', icon: '🍎' },
  { id: 'p-towel', name: 'Khăn lạnh', price: 5000, category: 'fnb', icon: '🧊' },
  // Dịch vụ
  { id: 's-clubs-taylor', name: 'Thuê bộ gậy TaylorMade', price: 150000, category: 'service', icon: '🏌️' },
  { id: 's-clubs-callaway', name: 'Thuê bộ gậy Nữ Callaway', price: 150000, category: 'service', icon: '🏌️‍♀️' },
  { id: 's-caddie', name: 'Phí Caddie hỗ trợ', price: 100000, category: 'service', icon: '🤝' },
  { id: 's-shoes', name: 'Thuê giày golf FootJoy', price: 50000, category: 'service', icon: '👟' },
  // Phụ kiện
  { id: 'a-glove-m', name: 'Găng tay golf nam', price: 120000, category: 'accessory', icon: '🧤' },
  { id: 'a-glove-w', name: 'Găng tay golf nữ', price: 120000, category: 'accessory', icon: '🧤' },
  { id: 'a-balls', name: 'Bóng Titleist Pro V1 (3q)', price: 240000, category: 'accessory', icon: '⚪' },
  { id: 'a-tee', name: 'Tee golf cao su/gỗ', price: 25000, category: 'accessory', icon: '📍' },
  // Combo
  { id: 'c-swing-coffee', name: 'Combo Swing & Coffee', price: 79000, category: 'combo', icon: '⚡' },
  { id: 'c-vip-breakfast', name: 'Combo VIP Breakfast & Golf', price: 120000, category: 'combo', icon: '⭐' },
];

export function ModernPosFlow({
  data,
  now,
  canSeeMoney,
  onGo,
  onMutate,
  onRefresh,
}: {
  data: Data;
  now: number;
  canSeeMoney: boolean;
  onGo: (v: string) => void;
  onMutate: (body: unknown) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}) {
  // Timer tick for real-time updates
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Flow State: 'map' (Screen 1) -> 'order' (Screen 2) -> 'pay' (Screen 3) -> 'done' (Screen 4)
  const [step, setStep] = useState<'map' | 'order' | 'pay' | 'done'>('map');
  const [filterTab, setFilterTab] = useState<'all' | 'playing' | 'booked' | 'empty' | 'maintenance'>('all');

  // Active room & session being serviced
  const [activeRoomId, setActiveRoomId] = useState<string>('line-3');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // Active customer info
  const [customer, setCustomer] = useState<{ name: string; phone: string; tier: string }>({
    name: 'Nguyễn Hoàng Long',
    phone: '0902 030 165',
    tier: 'Hội viên Gold',
  });

  // Items currently on the order bill
  const [billItems, setBillItems] = useState<OrderItem[]>([
    { id: 'item-golf', name: 'Chơi golf (giờ)', unitPrice: 350000, qty: 1, category: 'golf' },
    { id: 'item-water', name: 'Nước suối', unitPrice: 20000, qty: 2, category: 'fnb' },
    { id: 'item-sandwich', name: 'Bánh sandwich', unitPrice: 60000, qty: 1, category: 'fnb' },
  ]);

  // Catalog search & category tabs
  const [catalogTab, setCatalogTab] = useState<'fnb' | 'service' | 'accessory' | 'combo'>('fnb');
  const [searchProduct, setSearchProduct] = useState('');

  // Payment Screen states
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'qr'>('cash');
  const [tenderedCash, setTenderedCash] = useState<number>(500000);
  const [printReceipt, setPrintReceipt] = useState(true);

  // Completed Invoice data
  const [completedInvoice, setCompletedInvoice] = useState<{
    code: string;
    total: number;
    method: string;
    time: string;
  }>({
    code: 'HD26879',
    total: 450000,
    method: 'Tiền mặt',
    time: '04/11/2026 – 15:15',
  });

  // Quick modals for Walk-in or Extending
  const [walkInModal, setWalkInModal] = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState('Khách vãng lai');
  const [walkInPhone, setWalkInPhone] = useState('0909000111');

  // Calculate room states from real data
  const roomStatuses = useMemo(() => {
    return rooms.map((r) => {
      const info = roomInfo(r.id, data.bookings, data.maintenance, tick);
      return { room: r, info, state: info.state };
    });
  }, [data.bookings, data.maintenance, tick]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let playing = 0;
    let booked = 0;
    let empty = 0;
    let maintenance = 0;
    for (const r of roomStatuses) {
      if (r.state === 'occupied' || r.state === 'due' || r.state === 'clean') playing++;
      else if (r.state === 'soon') booked++;
      else if (r.state === 'maintenance') maintenance++;
      else empty++;
    }
    return { all: rooms.length, playing, booked, empty, maintenance };
  }, [roomStatuses]);

  // Filtered rooms
  const visibleRooms = useMemo(() => {
    return roomStatuses.filter(({ state }) => {
      if (filterTab === 'all') return true;
      if (filterTab === 'playing') return state === 'occupied' || state === 'due' || state === 'clean';
      if (filterTab === 'booked') return state === 'soon';
      if (filterTab === 'maintenance') return state === 'maintenance';
      if (filterTab === 'empty') return state === 'empty';
      return true;
    });
  }, [roomStatuses, filterTab]);

  // Active room details
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  }, [activeRoomId]);

  // Subtotal & Total calculations
  const subtotal = useMemo(() => {
    return billItems.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
  }, [billItems]);

  const discount = 0;
  const totalAmount = Math.max(0, subtotal - discount);
  const changeDue = Math.max(0, tenderedCash - totalAmount);

  // Filtered products catalog
  const filteredProducts = useMemo(() => {
    const q = searchProduct.trim().toLowerCase();
    return DEFAULT_PRODUCTS.filter((p) => {
      const matchCat = p.category === catalogTab;
      if (!matchCat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [catalogTab, searchProduct]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    const rInfo = roomStatuses.find((x) => x.room.id === roomId);
    const b = rInfo?.info.live ?? rInfo?.info.due ?? rInfo?.info.soon ?? null;
    setActiveBooking(b);

    if (b) {
      setCustomer({
        name: b.customer || 'Nguyễn Hoàng Long',
        phone: b.phone || '0902 030 165',
        tier: b.phone ? 'Hội viên Gold' : 'Khách vãng lai',
      });
      // Set initial items from booking
      const rate = rInfo?.room.vip ? (data.config.vipRate ?? 500000) : data.config.rate;
      setBillItems([
        { id: 'item-golf', name: 'Chơi golf (giờ)', unitPrice: rate, qty: 1, category: 'golf' },
        { id: 'item-water', name: 'Nước suối', unitPrice: 20000, qty: 2, category: 'fnb' },
        { id: 'item-sandwich', name: 'Bánh sandwich', unitPrice: 60000, qty: 1, category: 'fnb' },
      ]);
      setStep('order');
    } else {
      // Empty line -> open quick start
      setWalkInModal(roomId);
    }
  };

  const handleQuickStartWalkIn = async () => {
    if (!walkInModal) return;
    const ok = await onMutate({
      action: 'walkin',
      room: walkInModal,
      customer: walkInName,
      phone: walkInPhone,
      people: 1,
      duration: 60,
    });
    if (ok) {
      setActiveRoomId(walkInModal);
      setWalkInModal(null);
      setCustomer({
        name: walkInName,
        phone: walkInPhone,
        tier: 'Khách vãng lai',
      });
      const roomObj = rooms.find((r) => r.id === walkInModal);
      const rate = roomObj?.vip ? (data.config.vipRate ?? 500000) : data.config.rate;
      setBillItems([
        { id: 'item-golf', name: 'Chơi golf (giờ)', unitPrice: rate, qty: 1, category: 'golf' },
      ]);
      setStep('order');
      await onRefresh();
    }
  };

  const handleAddProduct = (p: ProductDef) => {
    setBillItems((prev) => {
      const existing = prev.find((it) => it.id === p.id);
      if (existing) {
        return prev.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it));
      }
      return [
        ...prev,
        { id: p.id, name: p.name, unitPrice: p.price, qty: 1, category: p.category },
      ];
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setBillItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleExtend = async (minutes: number) => {
    if (activeBooking) {
      await onMutate({ action: 'extend', id: activeBooking.id, minutes });
      await onRefresh();
    }
    // Update golf hours on bill
    setBillItems((prev) =>
      prev.map((it) =>
        it.category === 'golf' ? { ...it, qty: it.qty + minutes / 60 } : it,
      ),
    );
    setExtendModal(false);
  };

  const handleFinishSession = async () => {
    if (activeBooking && activeBooking.status === 'playing') {
      await onMutate({ action: 'finish', id: activeBooking.id });
      await onRefresh();
    }
  };

  const handleConfirmPayment = async () => {
    const invCode = 'HD' + Math.floor(10000 + Math.random() * 90000);
    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const methodLabels: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ ngân hàng',
      qr: 'QR Code (VietQR)',
    };

    setCompletedInvoice({
      code: invCode,
      total: totalAmount,
      method: methodLabels[payMethod] || 'Tiền mặt',
      time: nowStr,
    });

    // Process server payment if booking exists
    if (activeBooking) {
      await onMutate({
        action: 'pay',
        id: activeBooking.id,
        method: payMethod,
        requestId: crypto.randomUUID(),
        expectedAmount: totalAmount,
      });
      await onRefresh();
    }

    // Auto trigger print if checked
    if (printReceipt) {
      handlePrintInvoice(invCode, totalAmount);
    }

    setStep('done');
  };

  const handlePrintInvoice = (code = completedInvoice.code, total = completedInvoice.total) => {
    const html = `
      <div style="font-family: monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 13px;">
        <h2 style="text-align: center; margin: 0 0 6px;">SAIGON INDOOR GOLF CLUB</h2>
        <p style="text-align: center; margin: 0 0 10px; font-size: 11px;">250 Lương Định Của, TP. Thủ Đức<br>Hotline: 0877 834 888</p>
        <hr style="border-top: 1px dashed #000; margin: 8px 0;" />
        <p style="margin: 3px 0;"><strong>HÓA ĐƠN:</strong> ${code}</p>
        <p style="margin: 3px 0;"><strong>Line:</strong> ${activeRoom.name}</p>
        <p style="margin: 3px 0;"><strong>Khách:</strong> ${customer.name}</p>
        <p style="margin: 3px 0;"><strong>Thời gian:</strong> ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}</p>
        <hr style="border-top: 1px dashed #000; margin: 8px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          ${billItems
            .map(
              (it) => `
            <tr>
              <td>${it.name} x${it.qty}</td>
              <td style="text-align: right;">${money(it.unitPrice * it.qty)}</td>
            </tr>
          `,
            )
            .join('')}
        </table>
        <hr style="border-top: 1px dashed #000; margin: 8px 0;" />
        <p style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 6px 0;">
          <span>TỔNG CỘNG:</span>
          <span>${money(total)}</span>
        </p>
        <p style="text-align: center; margin: 12px 0 4px; font-size: 11px;">Cảm ơn Quý khách & Hẹn gặp lại!</p>
      </div>
    `;
    printK80Receipt(html);
  };

  const handleSendZalo = () => {
    const text = `SAIGON INDOOR GOLF CLUB - Hóa đơn #${completedInvoice.code}\nKhách hàng: ${customer.name}\nLine: ${activeRoom.name}\nTổng tiền: ${money(completedInvoice.total)}\nCảm ơn Quý khách đã trải nghiệm tại CLB!`;
    if (customer.phone) {
      sendBillToZalo({ phone: customer.phone, billText: text });
    }
    navigator.clipboard?.writeText(text);
    alert('Đã sao chép nội dung hóa đơn để gửi Zalo / SMS cho khách!');
  };

  // ---------------------------------------------------------------------------
  // RENDER STEP 1: SƠ ĐỒ LINE / PHÒNG
  // ---------------------------------------------------------------------------
  if (step === 'map') {
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
          {visibleRooms.map(({ room, info, state }) => {
            const isPlaying = state === 'occupied' || state === 'due' || state === 'clean';
            const isBooked = state === 'soon';
            const isMaint = state === 'maintenance';
            const isEmpty = state === 'empty';

            const elapsedMinutes = isPlaying && info.live ? Math.floor(playedMs(info.live, tick) / 60000) : 45;

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
                      <span>{elapsedMinutes} phút</span>
                    </div>
                  ) : isBooked ? (
                    <span className="pos-line-note">20:00 - 21:00</span>
                  ) : isMaint ? (
                    <span className="pos-line-note" style={{ color: '#ef4444' }}>
                      Đến 16:00
                    </span>
                  ) : (
                    <span className="pos-line-note">Sẵn sàng</span>
                  )}

                  {info.live?.customer && (
                    <span className="pos-line-customer">{info.live.customer}</span>
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
  // RENDER STEP 2: TẠO HÓA ĐƠN & THÊM DỊCH VỤ, F&B (BÁN HÀNG - L3)
  // ---------------------------------------------------------------------------
  if (step === 'order') {
    const elapsedMs = activeBooking?.started ? playedMs(activeBooking, tick) : 45 * 60000 + 12000;
    const timeFormatted = clock(elapsedMs);

    return (
      <div className="pos-flow-container">
        <div className="pos-order-screen">
          {/* Topbar */}
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
                Bán hàng – {activeRoom.name.replace('Line ', 'L')}
                <span className="pos-status-tag pos-state-playing">Đang chơi</span>
              </h2>
            </div>
          </div>

          {/* Two-Column Split View */}
          <div className="pos-order-grid">
            {/* Left Column: Bill & Session info */}
            <div className="pos-order-left">
              {/* Timer card */}
              <div className="pos-timer-box">
                <span className="pos-timer-label">Thời gian chơi</span>
                <span className="pos-timer-clock">{timeFormatted}</span>
                <div className="pos-timer-sub">
                  <span>Bắt đầu: 14:30</span>
                  <span>|</span>
                  <span>Dự kiến: 15:30</span>
                </div>
                <div className="pos-timer-actions">
                  <button
                    type="button"
                    className="pos-btn-extend"
                    onClick={() => setExtendModal(true)}
                  >
                    + Gia hạn
                  </button>
                  <button
                    type="button"
                    className="pos-btn-end"
                    onClick={handleFinishSession}
                  >
                    Kết thúc
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="pos-customer-card">
                <div className="pos-customer-info">
                  <div className="pos-customer-avatar">
                    {customer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="pos-customer-meta">
                    <strong>{customer.name}</strong>
                    <small>
                      {customer.tier} · {customer.phone}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="pos-customer-edit"
                  onClick={() => {
                    const nextName = prompt('Nhập tên khách hàng:', customer.name);
                    if (nextName) setCustomer({ ...customer, name: nextName });
                  }}
                  title="Đổi thông tin khách"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {/* Order Bill Items */}
              <div className="pos-bill-card">
                <h3 className="pos-bill-title">Dịch vụ sử dụng</h3>
                <div className="pos-bill-items">
                  {billItems.map((item) => (
                    <div key={item.id} className="pos-bill-row">
                      <span className="pos-bill-item-name">{item.name}</span>
                      <span className="pos-bill-item-qty">
                        {item.category === 'golf' ? `${item.qty} giờ` : `x${item.qty}`}
                      </span>
                      <span className="pos-bill-item-price">
                        {money(item.unitPrice * item.qty)}
                      </span>
                      <button
                        type="button"
                        className="pos-bill-item-del"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label="Xóa món"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="pos-bill-summary">
                  <div className="pos-summary-line">
                    <span>Tạm tính</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="pos-summary-line">
                    <span>Giảm giá</span>
                    <span>{money(discount)}</span>
                  </div>
                  <div className="pos-summary-total">
                    <span>Tổng thanh toán</span>
                    <span className="pos-total-amount">{money(totalAmount)}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <button
                  type="button"
                  className="pos-btn-checkout"
                  onClick={() => setStep('pay')}
                >
                  <CreditCard size={18} />
                  <span>Thanh toán (F9)</span>
                </button>
              </div>
            </div>

            {/* Right Column: F&B and Services Catalog */}
            <div className="pos-catalog-card">
              {/* Category Tabs */}
              <div className="pos-catalog-tabs">
                {[
                  { key: 'fnb', label: 'F&B' },
                  { key: 'service', label: 'Dịch vụ' },
                  { key: 'accessory', label: 'Phụ kiện' },
                  { key: 'combo', label: 'Combo' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`pos-catalog-tab-btn ${catalogTab === t.key ? 'active' : ''}`}
                    onClick={() => setCatalogTab(t.key as typeof catalogTab)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="pos-catalog-search">
                <Search />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm, mã SKU..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                />
              </div>

              {/* Product Grid */}
              <div className="pos-catalog-grid">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="pos-product-card">
                    <div className="pos-product-image">{p.icon}</div>
                    <h4 className="pos-product-name">{p.name}</h4>
                    <span className="pos-product-price">{money(p.price)}</span>
                    <button
                      type="button"
                      className="pos-product-add-btn"
                      onClick={() => handleAddProduct(p)}
                      title={`Thêm ${p.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Extend Modal */}
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
                    onClick={() => handleExtend(m)}
                  >
                    + {m} phút ({money((activeRoom.vip ? 500000 : 350000) * (m / 60))})
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
  // RENDER STEP 3: THANH TOÁN
  // ---------------------------------------------------------------------------
  if (step === 'pay') {
    return (
      <div className="pos-flow-container">
        <div className="pos-pay-screen">
          <div className="pos-pay-header">
            <button
              type="button"
              className="pos-back-btn"
              onClick={() => setStep('order')}
              aria-label="Quay lại giỏ hàng"
            >
              <ArrowLeft size={18} />
            </button>
            <h2>Thanh toán</h2>
          </div>

          <div className="pos-pay-amount-box">
            <span className="pos-pay-amount-label">Tổng thanh toán</span>
            <div className="pos-pay-amount-value">{money(totalAmount)}</div>
          </div>

          {/* 3 Payment Methods */}
          <div className="pos-method-cards">
            <button
              type="button"
              className={`pos-method-card ${payMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setPayMethod('cash')}
            >
              <Wallet />
              <span>Tiền mặt</span>
            </button>
            <button
              type="button"
              className={`pos-method-card ${payMethod === 'card' ? 'selected' : ''}`}
              onClick={() => setPayMethod('card')}
            >
              <CreditCard />
              <span>Thẻ ngân hàng</span>
            </button>
            <button
              type="button"
              className={`pos-method-card ${payMethod === 'qr' ? 'selected' : ''}`}
              onClick={() => setPayMethod('qr')}
            >
              <QrCode />
              <span>QR Code</span>
            </button>
          </div>

          {/* If QR Code selected, show QR image preview */}
          {payMethod === 'qr' && (
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
              }}
            >
              <img
                src={`https://img.vietqr.io/image/${data.config.bankBin || '970422'}-${data.config.bankAccount || '0877834888'}-compact2.png?amount=${totalAmount}&addInfo=SIGOLF%20${activeRoom.name}`}
                alt="VietQR"
                style={{ width: '180px', height: '180px', objectFit: 'contain', margin: '0 auto' }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#475569' }}>
                Quét mã VietQR để thanh toán tự động qua SePay
              </p>
            </div>
          )}

          {/* Quick cash suggestions for Cash payment */}
          {payMethod === 'cash' && (
            <>
              <div className="pos-quick-cash-row">
                {[500000, 1000000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`pos-quick-cash-btn ${tenderedCash === amt ? 'selected' : ''}`}
                    onClick={() => setTenderedCash(amt)}
                  >
                    {money(amt)}
                  </button>
                ))}
              </div>

              <div className="pos-calc-box">
                <div className="pos-calc-row">
                  <label>Khách đưa:</label>
                  <input
                    type="number"
                    step="10000"
                    value={tenderedCash}
                    onChange={(e) => setTenderedCash(Number(e.target.value))}
                  />
                </div>
                <div className="pos-calc-row">
                  <label>Tiền thối lại:</label>
                  <span className="pos-change-value">{money(changeDue)}</span>
                </div>
              </div>
            </>
          )}

          {/* In hoa don checkbox */}
          <label className="pos-print-checkbox">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
            />
            <span>In hóa đơn sau khi xác nhận</span>
          </label>

          {/* Confirm Payment button */}
          <button
            type="button"
            className="pos-btn-confirm-pay"
            onClick={handleConfirmPayment}
          >
            Xác nhận thanh toán
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER STEP 4: HOÀN TẤT & IN HÓA ĐƠN
  // ---------------------------------------------------------------------------
  return (
    <div className="pos-flow-container">
      <div className="pos-done-screen">
        <div className="pos-done-checkmark">
          <Check />
        </div>
        <h2 className="pos-done-title">Thanh toán thành công!</h2>

        <div className="pos-done-meta-box">
          <div className="pos-done-meta-row">
            <span>Hóa đơn:</span>
            <strong>{completedInvoice.code}</strong>
          </div>
          <div className="pos-done-meta-row">
            <span>Tổng tiền:</span>
            <span className="pos-done-price">{money(completedInvoice.total)}</span>
          </div>
          <div className="pos-done-meta-row">
            <span>Hình thức:</span>
            <strong>{completedInvoice.method}</strong>
          </div>
          <div className="pos-done-meta-row">
            <span>Thời gian:</span>
            <strong>{completedInvoice.time}</strong>
          </div>
        </div>

        <div className="pos-done-actions">
          <button
            type="button"
            className="pos-btn-print"
            onClick={() => handlePrintInvoice()}
          >
            <Printer size={16} />
            <span>In hóa đơn</span>
          </button>
          <button
            type="button"
            className="pos-btn-zalo"
            onClick={handleSendZalo}
          >
            <Send size={16} />
            <span>Gửi hóa đơn (Zalo/Email)</span>
          </button>
          <button
            type="button"
            className="pos-btn-finish"
            onClick={() => setStep('map')}
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
