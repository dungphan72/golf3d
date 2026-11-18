'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Plus,
  FileText,
  Sliders,
  DollarSign,
  TrendingUp,
  Download,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { money } from '../../../lib/club';
import type { ParkingSpot, ParkingTicket, ParkingSettings, ShiftReconciliationSummary } from '../core/types';
import '../../../app/parking.css';

interface Props {
  tenant?: string;
  onNavigate?: (view: string, extra?: Record<string, unknown>) => void;
}

export default function ParkingAdminApp({ tenant = 'gopick', onNavigate }: Props) {
  // Navigation tabs: 'map' | 'schedule' | 'gate' | 'reconciliation' | 'settings'
  const [activeTab, setActiveTab] = useState<'map' | 'schedule' | 'gate' | 'reconciliation' | 'settings'>('map');

  // Config & Status
  const [config, setConfig] = useState<ParkingSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notifyMsg, setNotifyMsg] = useState<string>('');

  // Sơ đồ bãi xe States
  const [mapMode, setMapMode] = useState<'now' | 'slot'>('now');
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [mapSummary, setMapSummary] = useState({
    total: 10,
    available: 2,
    held: 0,
    booked: 1,
    occupied: 7,
    maintenance: 0,
  });

  // Lịch đặt chỗ States
  const [ticketsList, setTicketsList] = useState<ParkingTicket[]>([]);
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<ParkingTicket | null>(null);

  // Kiểm soát vào / ra States (Gate Guard)
  const [gateMode, setGateMode] = useState<'in' | 'out'>('in');
  const [gateInput, setGateInput] = useState<string>('');
  const [gateFoundTicket, setGateFoundTicket] = useState<ParkingTicket | null>(null);
  const [gateSearching, setGateSearching] = useState<boolean>(false);
  const [showPaperModal, setShowPaperModal] = useState<boolean>(false);
  const [paperPlate, setPaperPlate] = useState<string>('');
  const [paperNo, setPaperNo] = useState<string>('');

  // Đối soát cuối ca States
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [reconDate, setReconDate] = useState<string>(todayStr);
  const [reconData, setReconData] = useState<ShiftReconciliationSummary | null>(null);
  const [cashSubmittedInput, setCashSubmittedInput] = useState<string>('150000');

  // Modal đổi ô & bảo trì
  const [showChangeSpotModal, setShowChangeSpotModal] = useState<boolean>(false);
  const [targetNewSpot, setTargetNewSpot] = useState<string>('');

  // Auto-clear notification
  function notify(msg: string) {
    setNotifyMsg(msg);
    setTimeout(() => setNotifyMsg(''), 4000);
  }

  // Load config & grid
  async function loadConfigAndSpots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/parking?action=spots&tenant=${tenant}&mode=${mapMode}`);
      const data: any = await res.json();
      if (data.ok) {
        if (data.settings) setConfig(data.settings);
        if (data.spots) setSpots(data.spots);
        if (data.summary) setMapSummary(data.summary);
      }
    } catch {
      notify('Không thể tải sơ đồ bãi xe');
    } finally {
      setLoading(false);
    }
  }

  // Load tickets list for schedule tab
  async function loadTicketsList() {
    try {
      const res = await fetch(
        `/api/parking?action=tickets-list&tenant=${tenant}&q=${encodeURIComponent(
          searchTicket,
        )}&status=${statusFilter}`,
      );
      const data: any = await res.json();
      if (data.ok && data.tickets) {
        setTicketsList(data.tickets);
        if (!selectedTicket && data.tickets.length > 0) {
          setSelectedTicket(data.tickets[0]);
        }
      }
    } catch {
      notify('Lỗi tải danh sách lịch đặt chỗ');
    }
  }

  // Load shift reconciliation
  async function loadReconciliation() {
    try {
      const res = await fetch(`/api/parking?action=reconciliation&tenant=${tenant}&date=${reconDate}`);
      const data: any = await res.json();
      if (data.ok && data.report) {
        setReconData(data.report);
      }
    } catch {
      notify('Lỗi tải dữ liệu đối soát');
    }
  }

  useEffect(() => {
    void loadConfigAndSpots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, mapMode]);

  useEffect(() => {
    if (activeTab === 'schedule') void loadTicketsList();
    if (activeTab === 'reconciliation') void loadReconciliation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTicket, statusFilter, reconDate]);

  // Action: Search Gate Ticket
  async function handleGateSearch() {
    if (!gateInput.trim()) return;
    setGateSearching(true);
    try {
      const res = await fetch(
        `/api/parking?action=ticket&tenant=${tenant}&code=${encodeURIComponent(gateInput.trim())}`,
      );
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        setGateFoundTicket(data.ticket);
      } else {
        // Try searching by plate
        const listRes = await fetch(
          `/api/parking?action=tickets-list&tenant=${tenant}&q=${encodeURIComponent(gateInput.trim())}`,
        );
        const listData: any = await listRes.json();
        if (listData.ok && listData.tickets?.length > 0) {
          setGateFoundTicket(listData.tickets[0]);
        } else {
          notify(`Không tìm thấy vé hoặc xe "${gateInput}"`);
          setGateFoundTicket(null);
        }
      }
    } catch {
      notify('Lỗi tra cứu vé');
    } finally {
      setGateSearching(false);
    }
  }

  // Action: Gate Check-in
  async function handleGateCheckIn() {
    if (!gateFoundTicket) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gate-checkin',
          tenant,
          ticketCode: gateFoundTicket.ticketCode,
          staffName: 'Bảo vệ cổng',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        notify(`✓ Đã xác nhận xe ${data.ticket.licensePlate} vào ô ${data.ticket.spotCode}!`);
        setGateFoundTicket(data.ticket);
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Check-in thất bại');
      }
    } catch {
      notify('Lỗi kết nối bảo vệ');
    }
  }

  // Action: Gate Check-out
  async function handleGateCheckOut() {
    if (!gateFoundTicket) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gate-checkout',
          tenant,
          ticketCode: gateFoundTicket.ticketCode,
          paymentMethod: 'cash',
          staffName: 'Bảo vệ cổng',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        const msg = data.surchargeDue > 0
          ? `✓ Xe đã ra bãi! Đã thu phụ thu quá giờ: ${money(data.surchargeDue)}`
          : `✓ Xe ${data.ticket.licensePlate} đã ra khỏi bãi an toàn. Ô ${data.ticket.spotCode} đã trống!`;
        notify(msg);
        setGateFoundTicket(data.ticket);
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Check-out thất bại');
      }
    } catch {
      notify('Lỗi kết nối xe ra');
    }
  }

  // Action: Create Gate Paper Ticket
  async function handleCreatePaperTicket() {
    if (!paperPlate.trim()) {
      notify('Vui lòng nhập biển số xe');
      return;
    }
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gate-paper-ticket',
          tenant,
          licensePlate: paperPlate.trim().toUpperCase(),
          paperTicketNo: paperNo.trim() || undefined,
          staffName: 'Bảo vệ cổng',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        notify(`✓ Đã phát hành vé giấy ${data.ticket.ticketCode} cho xe ${data.ticket.licensePlate} vào ô ${data.ticket.spotCode}`);
        setShowPaperModal(false);
        setPaperPlate('');
        setPaperNo('');
        setGateFoundTicket(data.ticket);
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Không thể tạo vé giấy');
      }
    } catch {
      notify('Lỗi tạo vé giấy');
    }
  }

  // Action: Change Spot
  async function handleChangeSpot() {
    if (!selectedTicket || !targetNewSpot.trim()) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-spot',
          tenant,
          ticketCode: selectedTicket.ticketCode,
          newSpotCode: targetNewSpot.trim().toUpperCase(),
        }),
      });
      const data: any = await res.json();
      if (data.ok) {
        notify(data.message);
        setShowChangeSpotModal(false);
        void loadTicketsList();
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Đổi ô thất bại');
      }
    } catch {
      notify('Lỗi đổi ô');
    }
  }

  // Action: Cancel Ticket
  async function handleCancelTicket() {
    if (!selectedTicket) return;
    if (!confirm(`Bạn có chắc muốn hủy vé ${selectedTicket.ticketCode} của xe ${selectedTicket.licensePlate}?`)) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel-ticket',
          tenant,
          ticketCode: selectedTicket.ticketCode,
          reason: 'Quản lý hủy tại bãi',
        }),
      });
      const data: any = await res.json();
      if (data.ok) {
        notify('Đã hủy vé thành công');
        void loadTicketsList();
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Hủy vé thất bại');
      }
    } catch {
      notify('Lỗi hủy vé');
    }
  }

  // Action: Close Shift
  async function handleCloseShift() {
    const cash = Number(cashSubmittedInput) || 0;
    if (!confirm(`Xác nhận chốt ca với số tiền mặt nộp: ${money(cash)}?`)) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close-shift',
          tenant,
          cashSubmitted: cash,
          staffName: 'Quản lý ca trực',
        }),
      });
      const data: any = await res.json();
      if (data.ok) {
        notify('✓ Đã chốt ca thành công và lưu sổ giao dịch!');
        void loadReconciliation();
      } else {
        notify(data.error || 'Chốt ca thất bại');
      }
    } catch {
      notify('Lỗi chốt ca');
    }
  }

  // Car visual color helper
  const getCarVisualClass = (code: string) => {
    if (code === 'A01' || code === 'A04') return '#ffffff';
    if (code === 'A02' || code === 'A07') return '#1e293b';
    if (code === 'A09') return '#0284c7';
    return '#64748b';
  };

  return (
    <div className="pk-desktop-container">
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--pk-primary)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--pk-radius)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Car size={24} />
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            SIGOLF · Bãi xe GoPick
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
            Quản lý bãi xe
          </span>
          <button
            type="button"
            className="pk-header-back"
            onClick={loadConfigAndSpots}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notifyMsg && (
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--pk-primary-light)',
            border: '1px solid var(--pk-primary-border)',
            borderRadius: 'var(--pk-radius)',
            color: 'var(--pk-primary)',
            fontWeight: 700,
            fontSize: 13.5,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notifyMsg}</span>
        </div>
      )}

      {/* Main 2-Column Operational Layout */}
      <div className="pk-admin-layout">
        {/* Left Sidebar Menu */}
        <aside className="pk-admin-sidebar">
          <button
            type="button"
            className={`pk-admin-nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin size={18} />
            <span>Sơ đồ bãi xe</span>
          </button>

          <button
            type="button"
            className={`pk-admin-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Calendar size={18} />
            <span>Lịch đặt chỗ</span>
          </button>

          <button
            type="button"
            className={`pk-admin-nav-item ${activeTab === 'gate' ? 'active' : ''}`}
            onClick={() => setActiveTab('gate')}
          >
            <Car size={18} />
            <span>Vào / Ra (Cổng)</span>
          </button>

          <button
            type="button"
            className={`pk-admin-nav-item ${activeTab === 'reconciliation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reconciliation')}
          >
            <TrendingUp size={18} />
            <span>Đối soát cuối ca</span>
          </button>

          <button
            type="button"
            className={`pk-admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={18} />
            <span>Cài đặt bãi xe</span>
          </button>
        </aside>

        {/* Right Content Area */}
        <section className="pk-admin-content">
          {/* ===================================================================
              TAB 1: SƠ ĐỒ BÃI XE (Bám sát ảnh 2 - Sơ đồ bãi xe)
              =================================================================== */}
          {activeTab === 'map' && (
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Sơ đồ chính */}
              <div className="pk-card" style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--pk-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Sơ đồ bãi xe</h2>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--pk-primary)',
                        background: 'var(--pk-primary-light)',
                        padding: '2px 8px',
                        borderRadius: 12,
                      }}
                    >
                      ● Trực tuyến
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 4 }}>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          border: 'none',
                          background: mapMode === 'now' ? '#ffffff' : 'transparent',
                          color: mapMode === 'now' ? '#0f172a' : '#64748b',
                          fontWeight: mapMode === 'now' ? 700 : 500,
                          fontSize: 12,
                          borderRadius: 3,
                          cursor: 'pointer',
                        }}
                        onClick={() => setMapMode('now')}
                      >
                        Hiện tại
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          border: 'none',
                          background: mapMode === 'slot' ? '#ffffff' : 'transparent',
                          color: mapMode === 'slot' ? '#0f172a' : '#64748b',
                          fontWeight: mapMode === 'slot' ? 700 : 500,
                          fontSize: 12,
                          borderRadius: 3,
                          cursor: 'pointer',
                        }}
                        onClick={() => setMapMode('slot')}
                      >
                        Theo khung giờ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bản đồ bãi xe SIGOLF trực quan */}
                <div className="pk-lot-map" style={{ padding: '20px 16px' }}>
                  {/* Dãy A (A01 - A05) */}
                  <div className="pk-lot-row" style={{ gap: 10 }}>
                    {spots
                      .filter((s) => ['A01', 'A02', 'A03', 'A04', 'A05'].includes(s.code))
                      .map((spot) => {
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
                            style={{ height: 80 }}
                            onClick={() => setSelectedSpot(spot)}
                          >
                            {isOccupied ? (
                              <div
                                className="pk-car-icon"
                                style={{ background: getCarVisualClass(spot.code), height: 46 }}
                              />
                            ) : isSelected ? (
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  color: 'var(--pk-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: 12,
                                }}
                              >
                                <Check size={16} strokeWidth={3} />
                              </div>
                            ) : (
                              <div style={{ height: 32 }} />
                            )}
                            <span className="pk-spot-code">{spot.code}</span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Làn di chuyển xe ở giữa */}
                  <div className="pk-lot-lane" style={{ height: 60 }}>
                    <div className="pk-lot-lane-stripes-left" />
                    <span className="pk-lot-lane-arrow" style={{ fontSize: 26 }}>➔</span>
                    <div className="pk-lot-lane-stripes-right" />
                  </div>

                  {/* Dãy A dưới (A06 - A10) */}
                  <div className="pk-lot-row" style={{ gap: 10 }}>
                    {spots
                      .filter((s) => ['A06', 'A07', 'A08', 'A09', 'A10'].includes(s.code))
                      .map((spot) => {
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
                            style={{ height: 80 }}
                            onClick={() => setSelectedSpot(spot)}
                          >
                            <span className="pk-spot-code">{spot.code}</span>
                            {isOccupied ? (
                              <div
                                className="pk-car-icon"
                                style={{ background: getCarVisualClass(spot.code), height: 46 }}
                              />
                            ) : isSelected ? (
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  color: 'var(--pk-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: 8,
                                }}
                              >
                                <Check size={16} strokeWidth={3} />
                              </div>
                            ) : (
                              <div style={{ height: 32 }} />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Chi tiết ô đã bấm */}
                {selectedSpot && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 'var(--pk-radius)',
                      border: '1px solid var(--pk-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14 }}>Ô đỗ {selectedSpot.code} ({selectedSpot.section})</strong>
                      <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                        Trạng thái: {selectedSpot.stateForWindow === 'available' ? 'Trống' : selectedSpot.stateForWindow === 'occupied' ? 'Đang có xe' : 'Đã đặt'}
                        {selectedSpot.currentVehiclePlate && ` · Xe: ${selectedSpot.currentVehiclePlate}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="pk-btn-secondary"
                        style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                        onClick={() => {
                          const newStatus = selectedSpot.status === 'maintenance' ? 'active' : 'maintenance';
                          fetch('/api/parking', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'set-spot-status',
                              tenant,
                              spotCode: selectedSpot.code,
                              status: newStatus,
                            }),
                          }).then(() => {
                            notify(`Đã cập nhật ô ${selectedSpot.code}`);
                            void loadConfigAndSpots();
                          });
                        }}
                      >
                        {selectedSpot.status === 'maintenance' ? 'Mở lại ô' : 'Khóa bảo trì'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cột thống kê trạng thái bên phải */}
              <div className="pk-admin-stats-bar">
                <div style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--pk-border)', paddingBottom: 6 }}>
                  Thống kê bãi xe
                </div>

                <div className="pk-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pk-legend-dot" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                    <span>Trống</span>
                  </div>
                  <strong>{mapSummary.available} ô</strong>
                </div>

                <div className="pk-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pk-legend-dot" style={{ background: 'var(--pk-primary)' }} />
                    <span>Đang giữ</span>
                  </div>
                  <strong>{mapSummary.held} ô</strong>
                </div>

                <div className="pk-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      className="pk-legend-dot"
                      style={{
                        background:
                          'repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 2px, #cbd5e1 2px, #cbd5e1 4px)',
                      }}
                    />
                    <span>Đã đặt</span>
                  </div>
                  <strong>{mapSummary.booked} ô</strong>
                </div>

                <div className="pk-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pk-legend-dot" style={{ background: '#475569' }} />
                    <span>Có xe</span>
                  </div>
                  <strong>{mapSummary.occupied} ô</strong>
                </div>

                <div className="pk-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pk-legend-dot" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }} />
                    <span>Bảo trì</span>
                  </div>
                  <strong>{mapSummary.maintenance} ô</strong>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 2: LỊCH ĐẶT CHỖ (Bám sát ảnh 2 - Lịch đặt chỗ)
              =================================================================== */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="pk-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search
                      size={16}
                      style={{ position: 'absolute', left: 10, top: 12, color: 'var(--pk-text-muted)' }}
                    />
                    <input
                      type="text"
                      className="pk-input"
                      placeholder="Tìm vé hoặc biển số..."
                      style={{ paddingLeft: 32 }}
                      value={searchTicket}
                      onChange={(e) => setSearchTicket(e.target.value)}
                    />
                  </div>

                  <select
                    className="pk-select"
                    style={{ width: 160 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="confirmed">Đã đặt</option>
                    <option value="holding">Đang giữ</option>
                    <option value="active">Đang có xe</option>
                    <option value="completed">Đã ra bãi</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Danh sách vé */}
              <div className="pk-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--pk-border)' }}>
                      <th style={{ padding: '10px 14px' }}>Vé</th>
                      <th style={{ padding: '10px 14px' }}>Biển số</th>
                      <th style={{ padding: '10px 14px' }}>Ô đỗ</th>
                      <th style={{ padding: '10px 14px' }}>Giờ vào</th>
                      <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsList.map((t) => (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: '1px solid var(--pk-border)',
                          cursor: 'pointer',
                          background: selectedTicket?.id === t.id ? '#f0fdf4' : 'transparent',
                        }}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{t.ticketCode}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t.licensePlate}</td>
                        <td style={{ padding: '10px 14px' }}>{t.spotCode}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {new Date(t.expectedIn).toTimeString().slice(0, 5)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            className={`pk-badge-status ${
                              t.status === 'confirmed'
                                ? 'pk-badge-confirmed'
                                : t.status === 'holding'
                                ? 'pk-badge-holding'
                                : t.status === 'active'
                                ? 'pk-badge-active'
                                : 'pk-badge-cancelled'
                            }`}
                          >
                            {t.status === 'confirmed'
                              ? '✓ Đã đặt'
                              : t.status === 'holding'
                              ? '⏱ Đang giữ'
                              : t.status === 'active'
                              ? '🚗 Có xe'
                              : t.status === 'completed'
                              ? 'Đã ra'
                              : 'Đã hủy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ticketsList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--pk-text-muted)' }}>
                          Chưa có lịch đặt chỗ nào phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Chi tiết vé được chọn bên dưới (Giống ảnh 2) */}
              {selectedTicket && (
                <div
                  className="pk-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(
                        `SIGOLF-PK:${selectedTicket.ticketCode}`,
                      )}`}
                      alt="QR"
                      style={{ width: 64, height: 64, border: '1px solid #e2e8f0', borderRadius: 4 }}
                    />

                    <div>
                      <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                        Vé: {selectedTicket.ticketCode}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                        {selectedTicket.licensePlate}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#334155' }}>
                        📍 Ô {selectedTicket.spotCode} · 📅 {new Date(selectedTicket.expectedIn).toISOString().slice(0, 10)} · ⏱ {new Date(selectedTicket.expectedIn).toTimeString().slice(0, 5)} – {new Date(selectedTicket.expectedOut).toTimeString().slice(0, 5)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--pk-primary)', fontWeight: 700 }}>
                        ● {selectedTicket.feePayer === 'gopick_sponsored' ? 'GoPick tài trợ' : 'Đã thu online'}
                      </div>
                      <strong style={{ fontSize: 16, color: 'var(--pk-primary)' }}>
                        {money(selectedTicket.paidAmount || selectedTicket.totalAmount)}
                      </strong>
                    </div>

                    <a
                      href={`/parking/ticket/${selectedTicket.ticketCode}?token=${selectedTicket.accessToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="pk-btn-secondary"
                      style={{ height: 36, padding: '0 12px', fontSize: 12.5, textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} />
                      <span>Mở vé</span>
                    </a>

                    <button
                      type="button"
                      className="pk-btn-secondary"
                      style={{ height: 36, padding: '0 10px', fontSize: 12.5 }}
                      onClick={() => setShowChangeSpotModal(true)}
                    >
                      Đổi ô
                    </button>

                    <button
                      type="button"
                      style={{
                        height: 36,
                        padding: '0 10px',
                        fontSize: 12.5,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: 'var(--pk-radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      onClick={handleCancelTicket}
                    >
                      Hủy vé
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              TAB 3: KIỂM SOÁT XE VÀO / RA (Bảo vệ quét QR / nhập biển số)
              =================================================================== */}
          {activeTab === 'gate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Toggle Xe vào / Xe ra */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 5 }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      border: 'none',
                      background: gateMode === 'in' ? 'var(--pk-primary)' : 'transparent',
                      color: gateMode === 'in' ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      fontSize: 13.5,
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() => setGateMode('in')}
                  >
                    ↓ Xe vào
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      border: 'none',
                      background: gateMode === 'out' ? 'var(--pk-primary)' : 'transparent',
                      color: gateMode === 'out' ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      fontSize: 13.5,
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() => setGateMode('out')}
                  >
                    ↑ Xe ra
                  </button>
                </div>

                <button
                  type="button"
                  className="pk-btn-secondary"
                  style={{ width: 'auto', padding: '0 14px', height: 38 }}
                  onClick={() => setShowPaperModal(true)}
                >
                  <Plus size={15} />
                  <span>Tạo vé giấy cho khách vãng lai</span>
                </button>
              </div>

              {/* 2-Card Layout (Quét QR + Chi tiết vé) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Khung quét QR / Nhập biển số */}
                <div
                  className="pk-card"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid var(--pk-primary-border)',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    minHeight: 220,
                  }}
                >
                  <QrCode size={48} color="var(--pk-primary)" />
                  <strong style={{ fontSize: 16, color: '#166534' }}>
                    Quét QR hoặc nhập biển số
                  </strong>

                  <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 300 }}>
                    <input
                      type="text"
                      className="pk-input"
                      placeholder="Nhập biển số hoặc mã vé..."
                      value={gateInput}
                      onChange={(e) => setGateInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGateSearch()}
                    />
                    <button
                      type="button"
                      className="pk-btn-primary"
                      style={{ width: 80, height: 44 }}
                      onClick={handleGateSearch}
                      disabled={gateSearching}
                    >
                      Tìm
                    </button>
                  </div>
                </div>

                {/* Khung thông tin vé quét được */}
                <div className="pk-card" style={{ padding: 20 }}>
                  {gateFoundTicket ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                        Vé: {gateFoundTicket.ticketCode}
                      </div>

                      <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                        {gateFoundTicket.licensePlate}
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#334155' }}>
                        <span>📍 Ô {gateFoundTicket.spotCode}</span>
                        <span>📅 {new Date(gateFoundTicket.expectedIn).toISOString().slice(0, 10)}</span>
                      </div>

                      <div style={{ fontSize: 13, color: '#334155' }}>
                        ⏱ {new Date(gateFoundTicket.expectedIn).toTimeString().slice(0, 5)} – {new Date(gateFoundTicket.expectedOut).toTimeString().slice(0, 5)}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 10,
                          borderTop: '1px solid var(--pk-border)',
                        }}
                      >
                        <span style={{ color: 'var(--pk-primary)', fontWeight: 700, fontSize: 13 }}>
                          ✓ Đã thu online
                        </span>
                        <strong style={{ fontSize: 15, color: 'var(--pk-primary)' }}>
                          {money(gateFoundTicket.paidAmount || gateFoundTicket.totalAmount)}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>Còn phải thu</span>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>0 đ</strong>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        {gateMode === 'in' ? (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckIn}
                          >
                            <Check size={16} strokeWidth={3} />
                            <span>Xác nhận xe vào</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckOut}
                          >
                            <Check size={16} strokeWidth={3} />
                            <span>Xác nhận xe ra</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--pk-text-muted)',
                        fontSize: 13,
                        textAlign: 'center',
                        padding: 30,
                      }}
                    >
                      <Car size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                      <span>Vui lòng quét QR hoặc nhập biển số xe để hiển thị thông tin vé tại cổng.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 4: ĐỐI SOÁT CUỐI CA (Bám sát ảnh 2 - Đối soát cuối ca)
              =================================================================== */}
          {activeTab === 'reconciliation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Chọn ngày đối soát */}
              <div
                className="pk-card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={20} color="var(--pk-primary)" />
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Đối soát cuối ca</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="date"
                    className="pk-input"
                    style={{ width: 160 }}
                    value={reconDate}
                    onChange={(e) => setReconDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pk-btn-secondary"
                    style={{ width: 'auto', padding: '0 12px' }}
                    onClick={loadReconciliation}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Bảng báo cáo sổ tiền chuẩn mẫu */}
              <div className="pk-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📶 Thu online</span>
                    </div>
                    <strong>{money(reconData?.onlineAmount ?? 300000)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>💵 Thu tại cổng</span>
                    </div>
                    <strong>{money(reconData?.gateAmount ?? 150000)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🔄 Hoàn tiền</span>
                    </div>
                    <span style={{ color: 'var(--pk-danger)', fontWeight: 700 }}>
                      {money(reconData?.refundAmount ?? 30000)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 18,
                      fontWeight: 800,
                      padding: '14px 0',
                      borderTop: '2px solid var(--pk-border)',
                      borderBottom: '2px solid var(--pk-border)',
                      color: 'var(--pk-primary)',
                    }}
                  >
                    <span>Σ Thực thu</span>
                    <span>{money(reconData?.netCollected ?? 420000)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      paddingTop: 8,
                      color: '#166534',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⛳ GoPick tài trợ · Chờ đối soát</span>
                    </div>
                    <strong style={{ fontSize: 15 }}>
                      {money(reconData?.sponsoredAmount ?? 90000)}
                    </strong>
                  </div>
                </div>

                {/* Nút hành động */}
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleCloseShift}
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>Chốt ca</span>
                  </button>

                  <button
                    type="button"
                    className="pk-btn-secondary"
                    style={{ width: 'auto', padding: '0 20px' }}
                    onClick={() => {
                      const csvContent =
                        'data:text/csv;charset=utf-8,' +
                        `Khoản mục,Số tiền\nThu online,${reconData?.onlineAmount ?? 300000}\nThu tại cổng,${
                          reconData?.gateAmount ?? 150000
                        }\nHoàn tiền,${reconData?.refundAmount ?? 30000}\nThực thu,${
                          reconData?.netCollected ?? 420000
                        }\nGoPick tài trợ,${reconData?.sponsoredAmount ?? 90000}`;
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement('a');
                      link.setAttribute('href', encodedUri);
                      link.setAttribute('download', `doi-soat-bai-xe-${reconDate}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download size={15} />
                    <span>Xuất báo cáo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 5: CÀI ĐẶT BÃI XE (Mặt bằng 65 ô GoPick thực tế)
              =================================================================== */}
          {activeTab === 'settings' && (
            <div className="pk-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
                Cài đặt & Mặt bằng Bãi xe GoPick
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="pk-input-group">
                  <label className="pk-label">Tên bãi đậu xe</label>
                  <input
                    type="text"
                    className="pk-input"
                    value={config?.facilityName || 'Bãi xe GoPick'}
                    readOnly
                  />
                </div>

                <div className="pk-input-group">
                  <label className="pk-label">Đơn giá tiêu chuẩn</label>
                  <input
                    type="text"
                    className="pk-input"
                    value={money(config?.defaultHourlyRate || 30000)}
                    readOnly
                  />
                </div>

                <div className="pk-input-group">
                  <label className="pk-label">Số giờ miễn phí cho khách Golf (Tài trợ)</label>
                  <input
                    type="text"
                    className="pk-input"
                    value={`${config?.golfFreeHours || 3} giờ`}
                    readOnly
                  />
                </div>

                <div className="pk-input-group">
                  <label className="pk-label">Thời gian giữ chỗ tạm (Hold timeout)</label>
                  <input
                    type="text"
                    className="pk-input"
                    value={`${(config?.holdTimeoutSeconds || 300) / 60} phút`}
                    readOnly
                  />
                </div>
              </div>

              {/* Thông tin mặt bằng 65 ô */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: '#f8fafc',
                  border: '1px solid var(--pk-border)',
                  borderRadius: 'var(--pk-radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Info size={16} color="var(--pk-primary)" />
                  <strong style={{ fontSize: 13.5 }}>Phương án bố trí mặt bằng bãi xe GoPick (65 xe)</strong>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--pk-text-muted)', margin: 0 }}>
                  Kích thước mỗi xe: 2,5m x 5,0m · Cổng vào: theo đường hiện trạng (6,5m) · Tổng sức chứa: 65 xe (P01 - P65).
                  Hệ thống hỗ trợ đồng thời chế độ chọn 10 ô nhanh A01-A10 trên điện thoại và toàn bộ 65 ô mặt bằng thực tế.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal: Đổi ô đỗ */}
      {showChangeSpotModal && selectedTicket && (
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
          onClick={() => setShowChangeSpotModal(false)}
        >
          <div
            className="pk-card"
            style={{ width: '100%', maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Đổi ô đỗ xe</h3>
            <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', margin: '0 0 14px' }}>
              Vé: <strong>{selectedTicket.ticketCode}</strong> (Ô hiện tại: {selectedTicket.spotCode})
            </p>

            <div className="pk-input-group">
              <label className="pk-label">Mã ô đỗ mới</label>
              <input
                type="text"
                className="pk-input"
                placeholder="VD: A05 hoặc P12"
                value={targetNewSpot}
                onChange={(e) => setTargetNewSpot(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowChangeSpotModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleChangeSpot}
              >
                Lưu đổi ô
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo vé giấy tại cổng cho khách vãng lai */}
      {showPaperModal && (
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
          onClick={() => setShowPaperModal(false)}
        >
          <div
            className="pk-card"
            style={{ width: '100%', maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Phát hành vé giấy xe vãng lai</h3>

            <div className="pk-input-group">
              <label className="pk-label">Biển số xe *</label>
              <input
                type="text"
                className="pk-input"
                placeholder="VD: 51A-999.88"
                value={paperPlate}
                onChange={(e) => setPaperPlate(e.target.value)}
              />
            </div>

            <div className="pk-input-group">
              <label className="pk-label">Số vé giấy (thẻ nhựa/giấy)</label>
              <input
                type="text"
                className="pk-input"
                placeholder="VD: VG-045"
                value={paperNo}
                onChange={(e) => setPaperNo(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowPaperModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleCreatePaperTicket}
              >
                Phát hành vé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
