'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Navigation,
  ShieldCheck,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';
import { money } from '../../../lib/club';
import type { ParkingSpot, ParkingTicket, ParkingSettings } from '../core/types';
import '../../../app/parking.css';

interface Props {
  initialTenant?: string;
  initialBookingId?: string;
  initialRoom?: string;
  initialStart?: number;
  initialEnd?: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  onClose?: () => void;
}

export default function ParkingCustomerApp({
  initialTenant = 'gopick',
  initialBookingId,
  initialRoom,
  initialStart,
  initialEnd,
  initialCustomerName,
  initialCustomerPhone,
  onClose,
}: Props) {
  // 4 Steps: 1: Thời gian, 2: Chọn ô, 3: Thanh toán, 4: Nhận vé
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Facility & Settings
  const [tenant, setTenant] = useState<string>(initialTenant);
  const [config, setConfig] = useState<ParkingSettings | null>(null);

  // Step 1 Form States
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dateStr, setDateStr] = useState<string>(() => {
    if (initialStart) {
      return new Date(initialStart).toISOString().slice(0, 10);
    }
    return todayStr;
  });

  const [timeIn, setTimeIn] = useState<string>(() => {
    if (initialStart) {
      // 15 mins earlier than golf session
      const d = new Date(initialStart - 15 * 60 * 1000);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '17:45';
  });

  const [timeOut, setTimeOut] = useState<string>(() => {
    if (initialEnd) {
      // 15 mins after golf session
      const d = new Date(initialEnd + 15 * 60 * 1000);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '20:15';
  });

  const [licensePlate, setLicensePlate] = useState<string>('51A-123.45');
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(initialCustomerPhone || '');

  // Golf Booking Sponsorship
  const [golfBookingId, setGolfBookingId] = useState<string>(initialBookingId || '');
  const [showGolfModal, setShowGolfModal] = useState<boolean>(false);
  const [golfSponsorship, setGolfSponsorship] = useState<{
    isValid: boolean;
    message: string;
    isFullySponsored: boolean;
    freeHours: number;
    room?: string;
  } | null>(null);

  // Step 2 Spots States
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loadingSpots, setLoadingSpots] = useState<boolean>(false);

  // Step 3 & 4 Ticket States
  const [ticket, setTicket] = useState<ParkingTicket | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(300);
  const [paymentBusy, setPaymentBusy] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Compute Milliseconds timestamps
  const expectedInMs = useMemo(() => {
    return new Date(`${dateStr}T${timeIn}:00`).getTime();
  }, [dateStr, timeIn]);

  const expectedOutMs = useMemo(() => {
    return new Date(`${dateStr}T${timeOut}:00`).getTime();
  }, [dateStr, timeOut]);

  // Load config on mount
  useEffect(() => {
    fetch(`/api/parking?action=config&tenant=${tenant}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.ok && data.config) setConfig(data.config);
      })
      .catch(() => {});
  }, [tenant]);

  // If initial booking id provided, verify golf sponsorship automatically
  useEffect(() => {
    if (initialBookingId) {
      verifyGolf(initialBookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookingId]);

  // Countdown timer for Step 3
  useEffect(() => {
    if (step !== 3 || !ticket || ticket.status !== 'holding') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((ticket.holdExpiresAt - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, ticket]);

  // Action: Verify Golf Booking
  async function verifyGolf(bookingIdToVerify: string) {
    if (!bookingIdToVerify.trim()) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-golf',
          tenant,
          bookingId: bookingIdToVerify.trim(),
          expectedIn: expectedInMs,
          expectedOut: expectedOutMs,
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.isValid) {
        setGolfSponsorship({
          isValid: true,
          message: data.message,
          isFullySponsored: data.isFullySponsored,
          freeHours: data.freeHours,
          room: data.bookingRoom,
        });
        if (data.customerName && !customerName) setCustomerName(data.customerName);
        if (data.customerPhone && !customerPhone) setCustomerPhone(data.customerPhone);
      } else {
        setGolfSponsorship({
          isValid: false,
          message: data.message || 'Mã đặt sân không hợp lệ hoặc đã hết lượt miễn phí.',
          isFullySponsored: false,
          freeHours: 0,
        });
      }
    } catch {
      setGolfSponsorship({
        isValid: false,
        message: 'Không thể kiểm tra lịch đặt Golf lúc này.',
        isFullySponsored: false,
        freeHours: 0,
      });
    }
  }

  // Action: Step 1 -> Step 2 Find Available Spots
  async function handleFindSpots() {
    setErrorMessage('');
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số xe của bạn.');
      return;
    }
    if (expectedOutMs <= expectedInMs) {
      setErrorMessage('Giờ ra phải sau giờ vào.');
      return;
    }

    setLoadingSpots(true);
    try {
      const res = await fetch(
        `/api/parking?action=spots&tenant=${tenant}&in=${expectedInMs}&out=${expectedOutMs}&mode=slot`,
      );
      const data: any = await res.json();
      if (data.ok && data.spots) {
        setSpots(data.spots);
        // Pre-select first available spot or A03 if available
        const preferred = data.spots.find((s: ParkingSpot) => s.code === 'A03' && s.stateForWindow === 'available')
          || data.spots.find((s: ParkingSpot) => s.stateForWindow === 'available');
        setSelectedSpot(preferred || null);
        setStep(2);
      } else {
        setErrorMessage(data.error || 'Không tải được danh sách ô đỗ.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ khi tìm chỗ trống.');
    } finally {
      setLoadingSpots(false);
    }
  }

  // Action: Step 2 -> Step 3 Hold Spot
  async function handleHoldSpot() {
    if (!selectedSpot) {
      setErrorMessage('Vui lòng chọn một ô đỗ xe.');
      return;
    }
    setErrorMessage('');
    setLoadingSpots(true);
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hold',
          tenant,
          spotCode: selectedSpot.code,
          licensePlate: licensePlate.trim().toUpperCase(),
          expectedIn: expectedInMs,
          expectedOut: expectedOutMs,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          golfBookingId: golfSponsorship?.isValid ? golfBookingId : undefined,
          source: golfSponsorship?.isValid ? 'golf_addon' : 'web',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        setTicket(data.ticket);
        setStep(3);
      } else {
        setErrorMessage(data.error || 'Ô vừa có người giữ chỗ hoặc đã hết hạn. Vui lòng chọn ô khác.');
        // Refresh spot grid
        void handleFindSpots();
      }
    } catch {
      setErrorMessage('Không thể giữ chỗ lúc này. Vui lòng thử lại.');
    } finally {
      setLoadingSpots(false);
    }
  }

  // Action: Step 3 -> Step 4 Confirm Payment or Confirm Sponsorship
  async function handleConfirmTicket() {
    if (!ticket) return;
    setErrorMessage('');
    setPaymentBusy(true);
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          tenant,
          ticketCode: ticket.ticketCode,
          accessToken: ticket.accessToken,
          paymentMethod: ticket.sponsoredAmount >= ticket.baseAmount ? 'gopick_sponsored' : 'vietqr',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        setTicket(data.ticket);
        setStep(4);
      } else {
        setErrorMessage(data.error || 'Xác nhận vé không thành công.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối cổng thanh toán. Vui lòng kiểm tra lại.');
    } finally {
      setPaymentBusy(false);
    }
  }

  // Display spots in grid (Rows A01-A05 and A06-A10)
  const rowTopSpots = useMemo(() => {
    return spots.filter((s) => ['A01', 'A02', 'A03', 'A04', 'A05'].includes(s.code));
  }, [spots]);

  const rowBottomSpots = useMemo(() => {
    return spots.filter((s) => ['A06', 'A07', 'A08', 'A09', 'A10'].includes(s.code));
  }, [spots]);

  // Car visual color helper for occupied slots
  const getCarVisualClass = (code: string) => {
    if (code === 'A01' || code === 'A04') return '#ffffff'; // white car
    if (code === 'A02' || code === 'A07') return '#1e293b'; // dark car
    if (code === 'A09') return '#0284c7'; // blue car
    return '#64748b'; // silver car
  };

  return (
    <div className="pk-container">
      {/* Header */}
      <header className="pk-header">
        {step > 1 ? (
          <button
            type="button"
            className="pk-header-back"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : 1))}
            aria-label="Quay lại"
          >
            ←
          </button>
        ) : onClose ? (
          <button type="button" className="pk-header-back" onClick={onClose}>
            ✕
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}

        <h1 className="pk-header-title">SIGOLF</h1>

        <div style={{ width: 24 }} />
      </header>

      {/* 4-Step Stepper Header */}
      <nav className="pk-stepper" aria-label="Các bước đặt chỗ đậu xe">
        {[
          { num: 1, label: 'Thời gian' },
          { num: 2, label: 'Ô đỗ' },
          { num: 3, label: 'Thanh toán' },
          { num: 4, label: 'Vé' },
        ].map((item) => {
          const isDone = step > item.num;
          const isActive = step === item.num;
          return (
            <div
              key={item.num}
              className={`pk-step-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
            >
              <div className="pk-step-circle">
                {isDone ? <Check size={12} strokeWidth={3} /> : item.num}
              </div>
              <span className="pk-step-label">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Error Message Alert */}
      {errorMessage && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            background: 'var(--pk-danger-light)',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--pk-radius)',
            color: 'var(--pk-danger)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content by Step */}
      <main className="pk-body">
        {/* =====================================================================
            BƯỚC 1: CHỌN THỜI GIAN
            ===================================================================== */}
        {step === 1 && (
          <>
            <h2 className="pk-page-title">Đặt chỗ đậu xe</h2>

            <div className="pk-card">
              {/* Bãi đậu xe */}
              <div className="pk-input-group">
                <label className="pk-label">
                  <MapPin size={14} color="var(--pk-primary)" />
                  Bãi đậu xe
                </label>
                <select
                  className="pk-select"
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                >
                  <option value="gopick">Bãi xe GoPick — 250 Lương Định Của</option>
                </select>
              </div>

              {/* Ngày đậu xe */}
              <div className="pk-input-group">
                <label className="pk-label">
                  <Calendar size={14} color="var(--pk-primary)" />
                  Ngày đậu xe
                </label>
                <input
                  type="date"
                  className="pk-input"
                  value={dateStr}
                  min={todayStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>

              {/* Giờ vào & Giờ ra */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="pk-input-group">
                  <label className="pk-label">
                    <Clock size={14} color="var(--pk-primary)" />
                    Giờ vào
                  </label>
                  <input
                    type="time"
                    className="pk-input"
                    value={timeIn}
                    onChange={(e) => setTimeIn(e.target.value)}
                  />
                </div>
                <div className="pk-input-group">
                  <label className="pk-label">
                    <Clock size={14} color="var(--pk-primary)" />
                    Giờ ra
                  </label>
                  <input
                    type="time"
                    className="pk-input"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                  />
                </div>
              </div>

              {/* Biển số xe */}
              <div className="pk-input-group" style={{ marginTop: 10 }}>
                <label className="pk-label">
                  <Car size={14} color="var(--pk-primary)" />
                  Biển số xe
                </label>
                <input
                  type="text"
                  className="pk-input"
                  placeholder="VD: 51A-123.45"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>
            </div>

            {/* Thẻ Liên kết lịch Golf */}
            <div
              className="pk-golf-link-box"
              onClick={() => setShowGolfModal(true)}
              role="button"
              tabIndex={0}
            >
              <div className="pk-golf-link-left">
                <Calendar size={22} color="var(--pk-primary)" />
                <div>
                  <div className="pk-golf-link-title">
                    {golfSponsorship?.isValid ? '✓ Đã liên kết lịch Golf' : 'Liên kết lịch Golf'}
                  </div>
                  <div className="pk-golf-link-sub">
                    {golfSponsorship?.isValid
                      ? golfSponsorship.message
                      : 'Kiểm tra quyền miễn phí >'}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--pk-primary)" />
            </div>

            {/* Thông tin khách hàng (Tùy chọn) */}
            <div className="pk-card">
              <div className="pk-input-group">
                <label className="pk-label">Họ tên khách hàng (để lưu vé)</label>
                <input
                  type="text"
                  className="pk-input"
                  placeholder="VD: Nguyễn Anh Nam"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="pk-input-group">
                <label className="pk-label">Số điện thoại nhận vé</label>
                <input
                  type="tel"
                  className="pk-input"
                  placeholder="0902 030 185"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleFindSpots}
                disabled={loadingSpots}
              >
                {loadingSpots ? 'Đang tìm...' : 'Tìm chỗ trống'}
              </button>
            </div>
          </>
        )}

        {/* =====================================================================
            BƯỚC 2: CHỌN Ô ĐỖ
            ===================================================================== */}
        {step === 2 && (
          <>
            <div>
              <h2 className="pk-page-title">Chọn ô đỗ</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 12.5,
                  color: 'var(--pk-text-muted)',
                  marginTop: 4,
                }}
              >
                <span>📅 {dateStr}</span>
                <span>⏱ {timeIn} – {timeOut}</span>
                <button
                  type="button"
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'var(--pk-primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setViewMode((m) => (m === 'map' ? 'list' : 'map'))}
                >
                  {viewMode === 'map' ? 'Xem danh sách' : 'Xem sơ đồ'}
                </button>
              </div>
            </div>

            {/* Sơ đồ bãi xe trực quan */}
            {viewMode === 'map' ? (
              <div className="pk-lot-map">
                {/* Dãy trên (A01 - A05) */}
                <div className="pk-lot-row">
                  {rowTopSpots.map((spot) => {
                    const isSelected = selectedSpot?.code === spot.code;
                    const isOccupied = spot.stateForWindow === 'occupied';
                    const isBooked = spot.stateForWindow === 'booked';
                    const isHeld = spot.stateForWindow === 'held';

                    return (
                      <div
                        key={spot.id}
                        className={`pk-spot-cell ${isSelected ? 'selected' : ''} ${
                          isOccupied ? 'occupied' : ''
                        } ${isBooked ? 'booked' : ''} ${isHeld ? 'held' : ''}`}
                        onClick={() => {
                          if (spot.stateForWindow === 'available') {
                            setSelectedSpot(spot);
                          }
                        }}
                      >
                        {isOccupied ? (
                          <div
                            className="pk-car-icon"
                            style={{ background: getCarVisualClass(spot.code) }}
                          />
                        ) : isSelected ? (
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#ffffff',
                              color: 'var(--pk-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: 10,
                            }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <div style={{ height: 28 }} />
                        )}
                        <span className="pk-spot-code">{spot.code}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Làn di chuyển xe ở giữa */}
                <div className="pk-lot-lane">
                  <div className="pk-lot-lane-stripes-left" />
                  <span className="pk-lot-lane-arrow">➔</span>
                  <div className="pk-lot-lane-stripes-right" />
                </div>

                {/* Dãy dưới (A06 - A10) */}
                <div className="pk-lot-row">
                  {rowBottomSpots.map((spot) => {
                    const isSelected = selectedSpot?.code === spot.code;
                    const isOccupied = spot.stateForWindow === 'occupied';
                    const isBooked = spot.stateForWindow === 'booked';
                    const isHeld = spot.stateForWindow === 'held';

                    return (
                      <div
                        key={spot.id}
                        className={`pk-spot-cell ${isSelected ? 'selected' : ''} ${
                          isOccupied ? 'occupied' : ''
                        } ${isBooked ? 'booked' : ''} ${isHeld ? 'held' : ''}`}
                        onClick={() => {
                          if (spot.stateForWindow === 'available') {
                            setSelectedSpot(spot);
                          }
                        }}
                      >
                        <span className="pk-spot-code">{spot.code}</span>
                        {isOccupied ? (
                          <div
                            className="pk-car-icon"
                            style={{ background: getCarVisualClass(spot.code) }}
                          />
                        ) : isSelected ? (
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: '#ffffff',
                              color: 'var(--pk-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 6,
                            }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          <div style={{ height: 28 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Danh sách ô đỗ cho màn hình nhỏ */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {spots.map((s) => (
                  <div
                    key={s.id}
                    className={`pk-card ${selectedSpot?.code === s.code ? 'selected' : ''}`}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: s.stateForWindow === 'available' ? 'pointer' : 'not-allowed',
                      opacity: s.stateForWindow === 'available' ? 1 : 0.6,
                      border:
                        selectedSpot?.code === s.code
                          ? '2px solid var(--pk-primary)'
                          : '1px solid var(--pk-border)',
                    }}
                    onClick={() => {
                      if (s.stateForWindow === 'available') setSelectedSpot(s);
                    }}
                  >
                    <div>
                      <strong>Ô {s.code}</strong> — {s.section}
                    </div>
                    <div>
                      {s.stateForWindow === 'available' ? (
                        <span style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>Trống</span>
                      ) : s.stateForWindow === 'occupied' ? (
                        <span style={{ color: 'var(--pk-text-muted)' }}>Đang có xe</span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Đã đặt</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chú giải trạng thái */}
            <div className="pk-lot-legend">
              <div className="pk-legend-item">
                <div className="pk-legend-dot" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                <span>Trống</span>
              </div>
              <div className="pk-legend-item">
                <div className="pk-legend-dot" style={{ background: 'var(--pk-primary)' }} />
                <span>Đã chọn</span>
              </div>
              <div className="pk-legend-item">
                <div
                  className="pk-legend-dot"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 2px, #cbd5e1 2px, #cbd5e1 4px)',
                  }}
                />
                <span>Đã đặt</span>
              </div>
              <div className="pk-legend-item">
                <div className="pk-legend-dot" style={{ background: '#475569' }} />
                <span>Có xe</span>
              </div>
            </div>

            {/* Thanh tóm tắt ô đã chọn */}
            {selectedSpot && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid var(--pk-border)',
                  borderRadius: 'var(--pk-radius)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} color="var(--pk-primary)" />
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      Ô {selectedSpot.code} · {selectedSpot.section}
                    </strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--pk-text-muted)' }}>Phí đậu xe</div>
                  <strong style={{ fontSize: 14, color: 'var(--pk-primary)' }}>
                    {golfSponsorship?.isFullySponsored
                      ? '0 đ (Tài trợ)'
                      : money(config?.defaultHourlyRate || 30000)}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleHoldSpot}
                disabled={!selectedSpot || loadingSpots}
              >
                {loadingSpots ? 'Đang giữ chỗ...' : 'Giữ chỗ và tiếp tục'}
              </button>
            </div>
          </>
        )}

        {/* =====================================================================
            BƯỚC 3: THANH TOÁN HOẶC XÁC NHẬN QUYỀN LỢI
            ===================================================================== */}
        {step === 3 && ticket && (
          <>
            <h2 className="pk-page-title">Thanh toán</h2>

            {/* Đồng hồ đếm ngược giữ ô 5 phút */}
            <div className="pk-hold-banner">
              <Clock size={16} />
              <span>
                Giữ ô trong{' '}
                {String(Math.floor(holdSecondsLeft / 60)).padStart(2, '0')}:
                {String(holdSecondsLeft % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Thông tin đặt chỗ */}
            <div className="pk-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--pk-border)', paddingBottom: 6 }}>
                Thông tin đặt chỗ
              </div>
              <div className="pk-ticket-row">
                <span className="pk-ticket-row-label">🅿️ Ô đỗ</span>
                <span className="pk-ticket-row-val">{ticket.spotCode} · {ticket.section}</span>
              </div>
              <div className="pk-ticket-row">
                <span className="pk-ticket-row-label">📅 Ngày đậu xe</span>
                <span className="pk-ticket-row-val">{dateStr}</span>
              </div>
              <div className="pk-ticket-row">
                <span className="pk-ticket-row-label">⏱ Thời gian</span>
                <span className="pk-ticket-row-val">{timeIn} – {timeOut}</span>
              </div>
              <div className="pk-ticket-row">
                <span className="pk-ticket-row-label">🚗 Biển số xe</span>
                <span className="pk-ticket-row-val">{ticket.licensePlate}</span>
              </div>
            </div>

            {/* Trường hợp khách tự trả */}
            {ticket.sponsoredAmount < ticket.baseAmount ? (
              <>
                <div className="pk-card">
                  <div className="pk-input-group">
                    <label className="pk-label">Phương thức thanh toán</label>
                    <select className="pk-select">
                      <option value="vietqr">Thanh toán QR (VietQR / Chuyển khoản)</option>
                      <option value="cash">Tiền mặt tại cổng</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: 'var(--pk-radius)',
                    border: '1px solid var(--pk-border)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Tổng thanh toán</span>
                  <strong style={{ fontSize: 18, color: 'var(--pk-primary)' }}>
                    {money(ticket.totalAmount - ticket.sponsoredAmount)}
                  </strong>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    onClick={handleConfirmTicket}
                    disabled={paymentBusy || holdSecondsLeft <= 0}
                  >
                    {paymentBusy
                      ? 'Đang xác nhận...'
                      : `Thanh toán ${money(ticket.totalAmount - ticket.sponsoredAmount)}`}
                  </button>
                </div>
              </>
            ) : (
              /* Trường hợp Khách Golf có quyền lợi (GoPick tài trợ 100%) */
              <>
                <div
                  style={{
                    background: 'var(--pk-primary-light)',
                    border: '1px solid var(--pk-primary-border)',
                    borderRadius: 'var(--pk-radius)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={20} color="var(--pk-primary)" />
                    <strong style={{ fontSize: 14, color: 'var(--pk-primary)' }}>
                      Khách Golf có quyền lợi
                    </strong>
                  </div>
                  <div style={{ fontSize: 13, color: '#166534' }}>
                    GoPick tài trợ · <strong>Khách trả 0 đ</strong>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    onClick={handleConfirmTicket}
                    disabled={paymentBusy || holdSecondsLeft <= 0}
                  >
                    {paymentBusy ? 'Đang tạo vé...' : 'Xác nhận đặt chỗ'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* =====================================================================
            BƯỚC 4: NHẬN VÉ ĐẬU XE (QR TICKET)
            ===================================================================== */}
        {step === 4 && ticket && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="pk-page-title">Vé đậu xe</h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: 'var(--pk-primary-light)',
                  border: '1px solid var(--pk-primary-border)',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--pk-primary)',
                }}
              >
                <Check size={13} strokeWidth={3} /> Đã xác nhận
              </span>
            </div>

            {/* Thẻ Vé Răng Cưa (Ticket Stub) */}
            <div className="pk-ticket-stub">
              <div className="pk-ticket-head">
                <div className="pk-ticket-facility">Bãi xe GoPick</div>
                <div className="pk-ticket-spot">Ô {ticket.spotCode}</div>

                <div className="pk-ticket-qr">
                  {/* Real QR via VietQR QuickLink / Image or standard SVG QR */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `SIGOLF-PK:${ticket.ticketCode}:${ticket.accessToken}`,
                    )}`}
                    alt="Mã QR vé đậu xe"
                    className="pk-ticket-qr-img"
                  />
                  <span className="pk-ticket-code">Mã vé: {ticket.ticketCode}</span>
                </div>
              </div>

              <div className="pk-ticket-details">
                <div className="pk-ticket-row">
                  <span className="pk-ticket-row-label">🚗 Biển số xe</span>
                  <span className="pk-ticket-row-val">{ticket.licensePlate}</span>
                </div>
                <div className="pk-ticket-row">
                  <span className="pk-ticket-row-label">📅 Ngày đậu xe</span>
                  <span className="pk-ticket-row-val">{dateStr}</span>
                </div>
                <div className="pk-ticket-row">
                  <span className="pk-ticket-row-label">⏱ Thời gian</span>
                  <span className="pk-ticket-row-val">{timeIn} – {timeOut}</span>
                </div>
                <div
                  className="pk-ticket-row"
                  style={{
                    paddingTop: 8,
                    borderTop: '1px solid var(--pk-border)',
                  }}
                >
                  <span className="pk-ticket-row-label" style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>
                    ✓ Đã thanh toán
                  </span>
                  <span className="pk-ticket-row-val" style={{ color: 'var(--pk-primary)', fontSize: 15 }}>
                    {ticket.sponsoredAmount >= ticket.baseAmount
                      ? '0 đ (GoPick tài trợ)'
                      : money(ticket.paidAmount || ticket.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={config?.directionsUrl || 'https://maps.google.com/?q=250+Luong+Dinh+Cua'}
                target="_blank"
                rel="noreferrer"
                className="pk-btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <Navigation size={16} />
                <span>Chỉ đường đến bãi</span>
              </a>

              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => {
                  setStep(1);
                  setTicket(null);
                  setSelectedSpot(null);
                }}
              >
                <RotateCcw size={14} />
                <span>Đặt thêm chỗ đậu xe khác</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modal: Liên kết lịch chơi Golf */}
      {showGolfModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowGolfModal(false)}
        >
          <div
            className="pk-card"
            style={{ width: '100%', maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Liên kết lịch Golf 3D</h3>
            <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', margin: '0 0 14px' }}>
              Nhập mã đặt sân hoặc số điện thoại để hưởng chính sách GoPick tài trợ miễn phí đậu xe.
            </p>

            <div className="pk-input-group">
              <label className="pk-label">Mã đặt sân (Booking ID)</label>
              <input
                type="text"
                className="pk-input"
                placeholder="VD: bk-123456"
                value={golfBookingId}
                onChange={(e) => setGolfBookingId(e.target.value)}
              />
            </div>

            {golfSponsorship && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--pk-radius)',
                  fontSize: 12.5,
                  marginTop: 8,
                  background: golfSponsorship.isValid ? 'var(--pk-primary-light)' : 'var(--pk-danger-light)',
                  color: golfSponsorship.isValid ? 'var(--pk-primary)' : 'var(--pk-danger)',
                  border: `1px solid ${golfSponsorship.isValid ? 'var(--pk-primary-border)' : '#fca5a5'}`,
                }}
              >
                {golfSponsorship.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowGolfModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={() => {
                  void verifyGolf(golfBookingId);
                  setShowGolfModal(false);
                }}
              >
                Xác thực
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
