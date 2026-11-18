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
  Layers,
  List,
  Compass,
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
  // 4 Steps: 1: Thời gian, 2: Chọn ô đỗ, 3: Thanh toán, 4: Nhận vé
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Facility & Settings
  const [tenant, setTenant] = useState<string>(initialTenant);
  const [config, setConfig] = useState<ParkingSettings | null>(null);

  // Step 1 Form States (Customer only picks time & facility first)
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

  // Contact info (empty by default for walk-in; filled in Step 2 before hold)
  const [licensePlate, setLicensePlate] = useState<string>('');
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
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loadingSpots, setLoadingSpots] = useState<boolean>(false);
  const [showEditTime, setShowEditTime] = useState<boolean>(false);

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

  // Duration formatted
  const durationText = useMemo(() => {
    const diffMs = expectedOutMs - expectedInMs;
    if (diffMs <= 0) return '0 giờ';
    const totalMinutes = Math.round(diffMs / 60000);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs} giờ ${mins} phút` : `${hrs} giờ`;
  }, [expectedInMs, expectedOutMs]);

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

  // Synchronize view mode toggle: keep selected spot highlighted and scroll into view
  const switchViewMode = (newMode: 'map' | 'list') => {
    setViewMode(newMode);
    if (selectedSpot) {
      setTimeout(() => {
        const id = newMode === 'map' ? `spot-map-${selectedSpot.code}` : `spot-list-${selectedSpot.code}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

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
      if (data.ok && data.verification) {
        setGolfSponsorship(data.verification);
        setShowGolfModal(false);
      } else {
        setGolfSponsorship({
          isValid: false,
          message: data.error || 'Không tìm thấy lịch chơi Golf phù hợp.',
          isFullySponsored: false,
          freeHours: 0,
        });
      }
    } catch {
      setGolfSponsorship({
        isValid: false,
        message: 'Lỗi kiểm tra quyền lợi Golf.',
        isFullySponsored: false,
        freeHours: 0,
      });
    }
  }

  // Action: Step 1 -> Step 2 Find Available Spots
  async function handleFindSpots() {
    setErrorMessage('');
    if (!dateStr) {
      setErrorMessage('Vui lòng chọn ngày đậu xe.');
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
        // Do NOT force-select A03. If current selectedSpot is in list and available, keep it; else null.
        if (selectedSpot) {
          const fresh = data.spots.find((s: ParkingSpot) => s.code === selectedSpot.code);
          if (fresh && fresh.stateForWindow === 'available') {
            setSelectedSpot(fresh);
          } else {
            setSelectedSpot(null);
          }
        } else {
          setSelectedSpot(null);
        }
        setShowEditTime(false);
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
      setErrorMessage('Vui lòng chạm chọn một ô đỗ xe còn trống trên sơ đồ hoặc danh sách.');
      return;
    }
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số xe để giữ chỗ.');
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
          customerName: customerName.trim() || 'Khách vãng lai',
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
        // Spot was just taken by someone else: Show clear error banner and retain customer form values!
        setErrorMessage(data.error || `Ô ${selectedSpot.code} vừa có người giữ chỗ hoặc đã được đặt. Vui lòng chọn ô khác.`);
        setSelectedSpot(null);
        // Refresh spot grid silently so user sees the newly occupied spot
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
      const isFree = ticket.sponsoredAmount >= ticket.totalAmount || ticket.customerAmount === 0;
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          tenant,
          ticketCode: ticket.ticketCode,
          accessToken: ticket.accessToken,
          paymentMethod: isFree ? 'gopick_sponsored' : 'vietqr',
          amountPaid: isFree ? 0 : ticket.customerAmount,
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

  // Group spots by approved GoPick sections
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: ParkingSpot[] } = {
      'Dãy chéo P1': [],
      'Dãy P2': [],
      'Dãy P3': [],
      'Dãy P4': [],
      'Dãy P5': [],
      'Dãy P6': [],
    };
    for (const s of spots) {
      if (groups[s.section]) {
        groups[s.section].push(s);
      } else {
        if (!groups[s.section]) groups[s.section] = [];
        groups[s.section].push(s);
      }
    }
    return groups;
  }, [spots]);

  // Filtered spots for list view
  const displayedSpots = useMemo(() => {
    if (selectedSection === 'all') return spots;
    return spots.filter((s) => s.section === selectedSection);
  }, [spots, selectedSection]);

  // Car visual color helper for occupied slots
  const getCarVisualClass = (code: string) => {
    const num = parseInt(code.replace(/\D/g, ''), 10) || 1;
    if (num % 4 === 0) return '#ffffff'; // white car
    if (num % 4 === 1) return '#1e293b'; // dark car
    if (num % 4 === 2) return '#0284c7'; // blue car
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
            onClick={() => {
              setErrorMessage('');
              setStep((s) => (s > 1 ? ((s - 1) as any) : 1));
            }}
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
          const isActive = step === item.num;
          const isDone = step > item.num;
          return (
            <div
              key={item.num}
              className={`pk-step-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
            >
              <div className="pk-step-circle">{isDone ? '✓' : item.num}</div>
              <span className="pk-step-label">{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="pk-body">
        {/* Error message banner */}
        {errorMessage && (
          <div className="pk-alert-error" role="alert" style={{ marginBottom: 12 }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* =====================================================================
            BƯỚC 1: CHỌN THỜI GIAN & CƠ SỞ (Khách xem chỗ trước)
            ===================================================================== */}
        {step === 1 && (
          <>
            <h2 className="pk-page-title">Đặt chỗ đậu xe</h2>
            <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', marginTop: -6, marginBottom: 14 }}>
              Chọn khoảng thời gian dự kiến để tra cứu ô đỗ xe trống tại cơ sở GoPick.
            </p>

            <div className="pk-card">
              {/* Chọn bãi đậu xe */}
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
                  <option value="gopick">Bãi xe GoPick — 250 Lương Định Của (65 ô)</option>
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
            </div>

            {/* Thẻ Liên kết lịch Golf */}
            <div
              className="pk-golf-link-box"
              onClick={() => setShowGolfModal(true)}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
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
                      : 'Kiểm tra quyền miễn phí (3 giờ tài trợ) >'}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--pk-primary)" />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleFindSpots}
                disabled={loadingSpots}
              >
                {loadingSpots ? 'Đang tìm kiếm...' : 'Tìm chỗ trống'}
              </button>
            </div>
          </>
        )}

        {/* =====================================================================
            BƯỚC 2: CHỌN Ô ĐỖ (Sơ đồ GoPick 65 ô & Đồng bộ danh sách)
            ===================================================================== */}
        {step === 2 && (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="pk-page-title" style={{ margin: 0 }}>Chọn ô đỗ</h2>
                <button
                  type="button"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 5,
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--pk-primary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  onClick={() => switchViewMode(viewMode === 'map' ? 'list' : 'map')}
                >
                  {viewMode === 'map' ? <List size={14} /> : <Layers size={14} />}
                  {viewMode === 'map' ? 'Xem danh sách' : 'Xem sơ đồ'}
                </button>
              </div>

              {/* Time header bar with quick edit */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--pk-text-muted)',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: 5,
                  border: '1px solid #e2e8f0',
                }}
              >
                <span>📅 <b>{dateStr}</b></span>
                <span>⏱ <b>{timeIn} – {timeOut}</b> ({durationText})</span>
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
                    textDecoration: 'underline',
                  }}
                  onClick={() => setShowEditTime((prev) => !prev)}
                >
                  {showEditTime ? 'Đóng' : 'Đổi giờ'}
                </button>
              </div>

              {/* Inline quick edit time box */}
              {showEditTime && (
                <div className="pk-card" style={{ marginTop: 8, padding: 12, background: '#ffffff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label className="pk-label" style={{ fontSize: 11 }}>Giờ vào</label>
                      <input
                        type="time"
                        className="pk-input"
                        value={timeIn}
                        onChange={(e) => setTimeIn(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="pk-label" style={{ fontSize: 11 }}>Giờ ra</label>
                      <input
                        type="time"
                        className="pk-input"
                        value={timeOut}
                        onChange={(e) => setTimeOut(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    style={{ marginTop: 8, padding: 8, fontSize: 12 }}
                    onClick={handleFindSpots}
                    disabled={loadingSpots}
                  >
                    {loadingSpots ? 'Đang cập nhật...' : 'Cập nhật khả dụng & giá'}
                  </button>
                </div>
              )}

              {/* Row Filter Chips */}
              <div className="pk-filter-chips" style={{ marginTop: 10 }}>
                {['all', 'Dãy chéo P1', 'Dãy P2', 'Dãy P3', 'Dãy P4', 'Dãy P5', 'Dãy P6'].map((sec) => {
                  const count = sec === 'all' ? spots.length : spots.filter((s) => s.section === sec).length;
                  const activeCount = sec === 'all'
                    ? spots.filter((s) => s.stateForWindow === 'available').length
                    : spots.filter((s) => s.section === sec && s.stateForWindow === 'available').length;

                  return (
                    <button
                      key={sec}
                      type="button"
                      className={`pk-filter-chip ${selectedSection === sec ? 'active' : ''}`}
                      onClick={() => setSelectedSection(sec)}
                    >
                      {sec === 'all' ? `Tất cả (${activeCount}/${count} trống)` : `${sec} (${activeCount} trống)`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SƠ ĐỒ BÃI XE GOPICK 65 Ô */}
            {viewMode === 'map' ? (
              <div className="pk-gopick-lot" style={{ marginTop: 10 }}>
                {/* Header bãi xe: Cổng vào & La bàn */}
                <div className="pk-lot-header-bar">
                  <div className="pk-gate-entrance">
                    <span>🚧 CỔNG VÀO</span>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>(Đường 6.5m)</span>
                  </div>
                  <div className="pk-north-compass">
                    <Compass size={14} />
                    <span>HƯỚNG BẮC (N)</span>
                  </div>
                </div>

                {/* Các dãy đỗ xe GoPick */}
                {Object.entries(groupedSections)
                  .filter(([secName]) => selectedSection === 'all' || selectedSection === secName)
                  .map(([secName, secSpots], idx) => {
                    const isDiagonal = secName.includes('chéo');

                    return (
                      <div key={secName} className="pk-section-card">
                        <div className="pk-section-title">
                          <span>{secName}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                            {secSpots.filter((s) => s.stateForWindow === 'available').length}/{secSpots.length} ô trống
                          </span>
                        </div>

                        {/* Row of spots */}
                        <div className="pk-spots-row-scroll">
                          {secSpots.map((spot) => {
                            const isSelected = selectedSpot?.code === spot.code;
                            const isOccupied = spot.stateForWindow === 'occupied';
                            const isBooked = spot.stateForWindow === 'booked';
                            const isHeld = spot.stateForWindow === 'held';
                            const isAvailable = spot.stateForWindow === 'available';

                            return (
                              <div
                                key={spot.id}
                                id={`spot-map-${spot.code}`}
                                className={`pk-spot-cell ${isSelected ? 'selected highlighted' : ''} ${
                                  isOccupied ? 'occupied' : ''
                                } ${isBooked ? 'booked' : ''} ${isHeld ? 'held' : ''} ${
                                  isDiagonal ? 'diagonal' : ''
                                }`}
                                onClick={() => {
                                  if (isAvailable) {
                                    setSelectedSpot(spot);
                                    setErrorMessage('');
                                  }
                                }}
                                title={`${spot.code} (${spot.section}) - ${spot.stateForWindow}`}
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
                                      marginBottom: 4,
                                    }}
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div style={{ height: 26 }} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Lane direction arrow between rows */}
                        {idx < 5 && (
                          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                            {idx % 2 === 0 ? 'Làn lưu thông 6.5m ➔' : '⬅ Làn lưu thông 6.5m'}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* CHẾ ĐỘ XEM DANH SÁCH */
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayedSpots.map((spot) => {
                  const isSelected = selectedSpot?.code === spot.code;
                  const isAvailable = spot.stateForWindow === 'available';
                  const isOccupied = spot.stateForWindow === 'occupied';
                  const isBooked = spot.stateForWindow === 'booked';
                  const isHeld = spot.stateForWindow === 'held';

                  return (
                    <div
                      key={spot.id}
                      id={`spot-list-${spot.code}`}
                      className={`pk-spot-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedSpot(spot);
                          setErrorMessage('');
                        }
                      }}
                      style={{
                        padding: '10px 14px',
                        background: isSelected ? 'var(--pk-soft)' : '#ffffff',
                        border: isSelected ? '2px solid var(--pk-primary)' : '1px solid var(--pk-border)',
                        borderRadius: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.65,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 5,
                            background: isSelected ? 'var(--pk-primary)' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 14,
                          }}
                        >
                          {spot.code}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                            {spot.code} · {spot.section}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                            Xe ô tô (2,5m x 5,0m) · {money(config?.defaultHourlyRate || 30000)}/lượt
                          </div>
                        </div>
                      </div>

                      <div>
                        {isAvailable && (
                          <span className="pk-badge-available">
                            {isSelected ? '✓ Đang chọn' : 'Còn trống'}
                          </span>
                        )}
                        {isOccupied && <span className="pk-badge-occupied">Có xe đỗ</span>}
                        {isBooked && <span className="pk-badge-booked">Đã đặt</span>}
                        {isHeld && <span className="pk-badge-held">Đang giữ</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BẢNG CHÚ THÍCH TRẠNG THÁI */}
            <div className="pk-legend" style={{ marginTop: 12 }}>
              <div className="pk-legend-item">
                <span className="pk-legend-dot available" />
                <span>Trống</span>
              </div>
              <div className="pk-legend-item">
                <span className="pk-legend-dot selected" />
                <span>Đang chọn</span>
              </div>
              <div className="pk-legend-item">
                <span className="pk-legend-dot booked" />
                <span>Đã đặt</span>
              </div>
              <div className="pk-legend-item">
                <span className="pk-legend-dot occupied" />
                <span>Có xe</span>
              </div>
            </div>

            {/* BOTTOM CARD: THÔNG TIN Ô ĐÃ CHỌN & NHẬP THÔNG TIN KHÁCH */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                position: 'sticky',
                bottom: 0,
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                paddingBottom: 8,
              }}
            >
              {selectedSpot ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid var(--pk-primary)',
                    borderRadius: 5,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--pk-primary)' }}>
                        Ô {selectedSpot.code} · {selectedSpot.section}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                        {dateStr} · {timeIn} – {timeOut} ({durationText})
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--pk-text-muted)' }}>Phí giữ chỗ</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>
                        {golfSponsorship?.isValid ? '0 đ (Tài trợ)' : money(config?.defaultHourlyRate || 30000)}
                      </div>
                    </div>
                  </div>

                  {/* Input Biển số xe (Bắt buộc) */}
                  <div style={{ marginTop: 10 }}>
                    <label className="pk-label" style={{ fontSize: 11.5, fontWeight: 700 }}>
                      Biển số xe nhận diện <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="pk-input"
                      placeholder="Ví dụ: 51A-123.45"
                      value={licensePlate}
                      onChange={(e) => {
                        setLicensePlate(e.target.value.toUpperCase());
                        setErrorMessage('');
                      }}
                      style={{ fontWeight: 700, letterSpacing: '0.5px' }}
                    />
                  </div>

                  {/* Optional: Tên & SĐT */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div>
                      <label className="pk-label" style={{ fontSize: 11 }}>Họ tên (lưu vé)</label>
                      <input
                        type="text"
                        className="pk-input"
                        placeholder="Khách vãng lai"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label className="pk-label" style={{ fontSize: 11 }}>Số điện thoại</label>
                      <input
                        type="tel"
                        className="pk-input"
                        placeholder="0902 xxx xxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#f1f5f9',
                    borderRadius: 5,
                    fontSize: 12.5,
                    color: 'var(--pk-text-muted)',
                    textAlign: 'center',
                    marginBottom: 10,
                  }}
                >
                  👉 Chạm vào một ô đỗ còn trống trên sơ đồ hoặc danh sách để đặt chỗ
                </div>
              )}

              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleHoldSpot}
                disabled={!selectedSpot || loadingSpots}
              >
                {loadingSpots ? 'Đang xử lý...' : 'Giữ chỗ và tiếp tục'}
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

            {/* Countdown timer */}
            <div className="pk-countdown-bar">
              <Clock size={16} />
              <span>
                Giữ ô trong{' '}
                <b>
                  {String(Math.floor(holdSecondsLeft / 60)).padStart(2, '0')}:
                  {String(holdSecondsLeft % 60).padStart(2, '0')}
                </b>
              </span>
            </div>

            {/* Thông tin đặt chỗ */}
            <div className="pk-card">
              <h3 className="pk-card-title">Thông tin đặt chỗ</h3>

              <div className="pk-detail-row">
                <span className="pk-detail-label">Ô đỗ</span>
                <span className="pk-detail-value">
                  <b>{ticket.spotCode}</b> · {ticket.section}
                </span>
              </div>

              <div className="pk-detail-row">
                <span className="pk-detail-label">Ngày đậu xe</span>
                <span className="pk-detail-value">
                  {new Date(ticket.expectedIn).toISOString().slice(0, 10)}
                </span>
              </div>

              <div className="pk-detail-row">
                <span className="pk-detail-label">Thời gian</span>
                <span className="pk-detail-value">
                  {new Date(ticket.expectedIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(ticket.expectedOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="pk-detail-row">
                <span className="pk-detail-label">Biển số xe</span>
                <span className="pk-detail-value">
                  <b>{ticket.licensePlate}</b>
                </span>
              </div>
            </div>

            {/* Quyền lợi Golf hoặc Thanh toán QR */}
            {ticket.isGolfSponsored || ticket.customerAmount === 0 ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #22c55e',
                  borderRadius: 5,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={22} strokeWidth={3} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>
                    Khách Golf có quyền lợi
                  </div>
                  <div style={{ fontSize: 12.5, color: '#15803d', marginTop: 2 }}>
                    GoPick tài trợ · Khách trả <b>0 đ</b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pk-card" style={{ textAlign: 'center' }}>
                <h3 className="pk-card-title" style={{ textAlign: 'left' }}>Phương thức thanh toán</h3>

                <div style={{ margin: '12px auto', width: 170, height: 170, background: '#f8fafc', padding: 8, borderRadius: 5, border: '1px solid #e2e8f0' }}>
                  <img
                    src={`https://img.vietqr.io/image/970422-0902030185-compact2.png?amount=${ticket.customerAmount}&addInfo=${encodeURIComponent(
                      ticket.ticketCode,
                    )}&accountName=SIGOLF`}
                    alt="Mã VietQR"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                  Nội dung chuyển khoản: <b style={{ color: 'var(--pk-primary)' }}>{ticket.ticketCode}</b>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Quét mã QR bằng App Ngân hàng bất kỳ để tự động điền số tiền và nội dung.
                </div>
              </div>
            )}

            {/* Tổng thanh toán */}
            <div className="pk-summary-box" style={{ marginTop: 12 }}>
              <span className="pk-summary-label">Tổng thanh toán</span>
              <span className="pk-summary-val">
                {ticket.isGolfSponsored || ticket.customerAmount === 0 ? '0 đ' : money(ticket.customerAmount || 0)}
              </span>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleConfirmTicket}
                disabled={paymentBusy || holdSecondsLeft <= 0}
              >
                {paymentBusy
                  ? 'Đang kiểm tra giao dịch...'
                  : ticket.isGolfSponsored || ticket.customerAmount === 0
                  ? 'Xác nhận đặt chỗ'
                  : `Xác nhận đã chuyển ${money(ticket.customerAmount || 0)}`}
              </button>
            </div>
          </>
        )}

        {/* =====================================================================
            BƯỚC 4: NHẬN VÉ ĐẬU XE (Vé QR thông minh)
            ===================================================================== */}
        {step === 4 && ticket && (
          <>
            <div className="pk-ticket-status-badge">
              <CheckCircle2 size={16} />
              <span>Đã xác nhận đặt chỗ</span>
            </div>

            {/* Phiếu vé điện tử với mép xé răng cưa */}
            <div className="pk-ticket-stub" style={{ marginTop: 12 }}>
              <div className="pk-ticket-header">
                <div className="pk-ticket-sub">Bãi xe GoPick — 250 Lương Định Của</div>
                <div className="pk-ticket-spot-code">Ô {ticket.spotCode}</div>
                <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>{ticket.section}</div>
              </div>

              {/* QR Code */}
              <div className="pk-ticket-qr-box">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `SIGOLF_PARKING:${ticket.ticketCode}:${ticket.accessToken}`,
                  )}`}
                  alt={`Mã QR vé ${ticket.ticketCode}`}
                  style={{ width: 140, height: 140 }}
                />
                <div className="pk-ticket-code-label">Mã vé: {ticket.ticketCode}</div>
              </div>

              {/* Mép xé vé răng cưa */}
              <div className="pk-ticket-perforation">
                <div className="pk-notch-left" />
                <div className="pk-perforated-line" />
                <div className="pk-notch-right" />
              </div>

              {/* Chi tiết vé */}
              <div className="pk-ticket-details">
                <div className="pk-ticket-row">
                  <span>🚗 Biển số xe</span>
                  <b>{ticket.licensePlate}</b>
                </div>
                <div className="pk-ticket-row">
                  <span>📅 Ngày đậu xe</span>
                  <span>{new Date(ticket.expectedIn).toISOString().slice(0, 10)}</span>
                </div>
                <div className="pk-ticket-row">
                  <span>⏱ Thời gian</span>
                  <span>
                    {new Date(ticket.expectedIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(ticket.expectedOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="pk-ticket-row">
                  <span>💰 Thanh toán</span>
                  <b style={{ color: '#16a34a' }}>
                    {ticket.sponsoredAmount >= ticket.totalAmount || ticket.customerAmount === 0
                      ? 'GoPick tài trợ · 0 đ'
                      : `${money(ticket.paidAmount || ticket.customerAmount || 0)} (Đã thanh toán)`}
                  </b>
                </div>
              </div>
            </div>

            {/* Chỉ đường & Nút hành động */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={config?.directionsUrl || 'https://maps.google.com/?q=250+Luong+Dinh+Cua'}
                target="_blank"
                rel="noopener noreferrer"
                className="pk-btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <Navigation size={18} />
                Chỉ đường đến bãi xe
              </a>

              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => {
                  setStep(1);
                  setSelectedSpot(null);
                  setTicket(null);
                }}
              >
                Đặt thêm chỗ đậu xe khác
              </button>
            </div>
          </>
        )}

        {/* Modal: Liên kết lịch Golf */}
        {showGolfModal && (
          <div className="pk-modal-backdrop" onClick={() => setShowGolfModal(false)}>
            <div className="pk-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px 0' }}>
                Liên kết lịch chơi Golf
              </h3>
              <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', marginBottom: 14 }}>
                Khách chơi Golf tại GoPick được tài trợ miễn phí tối đa 3 giờ đậu xe ô tô (1 xe / lượt đặt).
              </p>

              <div className="pk-input-group">
                <label className="pk-label">Mã đặt phòng hoặc SĐT đặt lịch</label>
                <input
                  type="text"
                  className="pk-input"
                  placeholder="Ví dụ: BOOK-1234 hoặc 0902xxx"
                  value={golfBookingId}
                  onChange={(e) => setGolfBookingId(e.target.value)}
                />
              </div>

              {golfSponsorship && !golfSponsorship.isValid && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
                  {golfSponsorship.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  className="pk-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowGolfModal(false)}
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  className="pk-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => verifyGolf(golfBookingId)}
                >
                  Kiểm tra
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
