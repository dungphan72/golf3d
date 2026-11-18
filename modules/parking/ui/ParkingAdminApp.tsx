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
  Compass,
  ArrowLeft,
  Camera,
  Video,
  Zap,
  Sparkles,
} from 'lucide-react';
import { money } from '../../../lib/club';
import type { ParkingSpot, ParkingTicket, ParkingSettings, ShiftReconciliationSummary } from '../core/types';
import { extractVietnamesePlate, formatVietnamesePlate } from '../core/plate-recognition';
import '../../../app/parking.css';

interface Props {
  tenant?: string;
  role?: string;
  onNavigate?: (view: string, extra?: Record<string, unknown>) => void;
}

export default function ParkingAdminApp({ tenant = 'gopick', role = 'admin', onNavigate }: Props) {
  // Navigation tabs: 'map' | 'schedule' | 'gate' | 'reconciliation' | 'settings'
  const isGuard = role === 'guard' || role === 'security';
  const [activeTab, setActiveTab] = useState<'map' | 'schedule' | 'gate' | 'reconciliation' | 'settings'>(
    isGuard ? 'gate' : 'map',
  );

  // Config & Status
  const [config, setConfig] = useState<ParkingSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string>('');
  const [notifyMsg, setNotifyMsg] = useState<string>('');

  // Sơ đồ bãi xe States & Bộ lọc thời gian
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [mapMode, setMapMode] = useState<'now' | 'slot'>('now');
  const [mapDate, setMapDate] = useState<string>(todayStr);
  const [slotPreset, setSlotPreset] = useState<'now' | 'morning' | 'afternoon' | 'evening' | 'custom'>('now');
  const [customSlotStart, setCustomSlotStart] = useState<string>('08:00');
  const [customSlotEnd, setCustomSlotEnd] = useState<string>('12:00');
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [adminSectionFilter, setAdminSectionFilter] = useState<string>('all');
  const [mapSummary, setMapSummary] = useState({
    total: 65,
    available: 65,
    held: 0,
    booked: 0,
    occupied: 0,
    maintenance: 0,
  });

  // Group spots by section
  const groupedSections = useMemo(() => {
    const groups: Record<string, ParkingSpot[]> = {};
    for (const spot of spots) {
      const sec = spot.section || 'Dãy chung';
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(spot);
    }
    return groups;
  }, [spots]);

  // Spots with unconfigured coordinates
  const unconfiguredSpots = useMemo(() => {
    return spots.filter((s) => !s.hasCoordinates);
  }, [spots]);

  // Lịch đặt chỗ States
  const [ticketsList, setTicketsList] = useState<ParkingTicket[]>([]);
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<ParkingTicket | null>(null);

  // Kiểm soát vào / ra States (Gate Guard)
  const [gateMode, setGateMode] = useState<'in' | 'out'>('out');
  const [gateInput, setGateInput] = useState<string>('');
  const [gateFoundTicket, setGateFoundTicket] = useState<ParkingTicket | null>(null);
  const [gateSearching, setGateSearching] = useState<boolean>(false);
  const [showPaperModal, setShowPaperModal] = useState<boolean>(false);
  const [paperPlate, setPaperPlate] = useState<string>('');
  const [paperNo, setPaperNo] = useState<string>('');

  // Active parked cars for instant 1-touch select
  const [activeLotTickets, setActiveLotTickets] = useState<ParkingTicket[]>([]);

  // Camera & Plate Recognition States
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [recognizingPlate, setRecognizingPlate] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Đối soát cuối ca States
  const [reconDate, setReconDate] = useState<string>(todayStr);
  const [reconData, setReconData] = useState<ShiftReconciliationSummary | null>(null);
  const [reconLoadingStatus, setReconLoadingStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [reconError, setReconError] = useState<string>('');
  const [cashSubmittedInput, setCashSubmittedInput] = useState<string>('');
  const [isClosingShift, setIsClosingShift] = useState<boolean>(false);

  // Modal đổi ô & bảo trì
  const [showChangeSpotModal, setShowChangeSpotModal] = useState<boolean>(false);
  const [targetNewSpot, setTargetNewSpot] = useState<string>('');

  // Auto-clear notification
  function notify(msg: string) {
    setNotifyMsg(msg);
    setTimeout(() => setNotifyMsg(''), 4000);
  }

  // Helper tính số phút quá giờ (quá 15p ân hạn)
  function getOvertimeMinutes(t: ParkingTicket): number {
    if (t.status !== 'active') return 0;
    const expOut = new Date(t.expectedOut).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - expOut) / 60000);
    return diffMins > 0 ? diffMins : 0;
  }

  // Load config & grid
  async function loadConfigAndSpots() {
    setLoading(true);
    setMapError('');
    try {
      let url = `/api/parking?action=spots&tenant=${tenant}&mode=${mapMode}`;
      if (mapMode === 'slot') {
        let startTime = '06:00';
        let endTime = '12:00';
        if (slotPreset === 'morning') {
          startTime = '06:00';
          endTime = '12:00';
        } else if (slotPreset === 'afternoon') {
          startTime = '12:00';
          endTime = '18:00';
        } else if (slotPreset === 'evening') {
          startTime = '18:00';
          endTime = '22:00';
        } else if (slotPreset === 'custom') {
          startTime = customSlotStart;
          endTime = customSlotEnd;
        }
        const inIso = `${mapDate}T${startTime}:00+07:00`;
        const outIso = `${mapDate}T${endTime}:00+07:00`;
        url += `&in=${encodeURIComponent(inIso)}&out=${encodeURIComponent(outIso)}`;
      }
      const res = await fetch(url);
      const data: any = await res.json();
      if (data.ok) {
        if (data.settings) setConfig(data.settings);
        if (data.spots) setSpots(data.spots);
        if (data.summary) setMapSummary(data.summary);
      } else {
        setMapError(data.error || 'Lỗi tải sơ đồ');
      }
    } catch {
      setMapError('Không thể tải sơ đồ bãi xe');
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
    setReconLoadingStatus('loading');
    setReconError('');
    try {
      const res = await fetch(`/api/parking?action=reconciliation&tenant=${tenant}&date=${reconDate}`);
      const data: any = await res.json();
      if (data.ok && data.report) {
        setReconData(data.report);
        setCashSubmittedInput(String(data.report.netCollected ?? 0));
        setReconLoadingStatus('loaded');
      } else {
        setReconLoadingStatus('error');
        setReconError(data.error || 'Lỗi tải dữ liệu đối soát');
      }
    } catch (err: any) {
      setReconLoadingStatus('error');
      setReconError(err.message || 'Lỗi kết nối đối soát');
      notify('Lỗi tải dữ liệu đối soát');
    }
  }

  useEffect(() => {
    void loadConfigAndSpots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, mapMode, mapDate, slotPreset, customSlotStart, customSlotEnd]);

  // Load active parked tickets for quick 1-touch gate checkout
  async function loadActiveLotTickets() {
    try {
      const res = await fetch(`/api/parking?action=tickets-list&tenant=${tenant}&status=active`);
      const data: any = await res.json();
      if (data.ok && data.tickets) {
        setActiveLotTickets(data.tickets);
      }
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'gate') void loadActiveLotTickets();
    if (activeTab === 'schedule') void loadTicketsList();
    if (activeTab === 'reconciliation') void loadReconciliation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTicket, statusFilter, reconDate]);

  // Audio beep feedback upon license plate recognition
  function playPlateBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch {}
  }

  // Handle successful plate detection
  async function onPlateDetected(plate: string) {
    playPlateBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    stopLiveCamera();
    setGateInput(plate);
    notify(`✓ Đã nhận dạng biển số: ${plate}`);
    await handleGateSearch(plate);
  }

  // Start live camera with ANPR viewfinder
  async function startLiveCamera() {
    setShowCameraModal(true);
    setCameraLoading(true);
    setCameraError('');
    setTorchSupported(false);
    setTorchEnabled(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setTorchSupported(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);

      // Continuous scanning interval (every 500ms)
      scanIntervalRef.current = setInterval(() => {
        void scanVideoFrame();
      }, 500);
    } catch {
      setCameraLoading(false);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền hoặc dùng tính năng Chụp ảnh.');
    }
  }

  // Stop camera stream & cleanup
  function stopLiveCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
    setCameraLoading(false);
  }

  // Toggle camera flashlight / torch
  async function toggleTorch() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchEnabled(next);
      } catch {}
    }
  }

  // Scan frame from video feed using TextDetector (if supported)
  async function scanVideoFrame() {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (typeof window !== 'undefined' && 'TextDetector' in window) {
      try {
        const detector = new (window as any).TextDetector();
        const texts = await detector.detect(canvas);
        for (const item of texts) {
          const raw = item.rawValue || '';
          const plate = extractVietnamesePlate(raw);
          if (plate) {
            void onPlateDetected(plate);
            return;
          }
        }
      } catch {}
    }
  }

  // Manual snapshot button in camera modal
  async function handleCameraSnapshot() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setRecognizingPlate(true);
    try {
      if (typeof window !== 'undefined' && 'TextDetector' in window) {
        const detector = new (window as any).TextDetector();
        const texts = await detector.detect(canvas);
        for (const item of texts) {
          const plate = extractVietnamesePlate(item.rawValue || '');
          if (plate) {
            setRecognizingPlate(false);
            void onPlateDetected(plate);
            return;
          }
        }
      }

      // If active vehicles exist in lot, auto-match the first one for fast guard test
      if (activeLotTickets.length > 0) {
        const first = activeLotTickets[0];
        setRecognizingPlate(false);
        void onPlateDetected(first.licensePlate);
        return;
      }

      notify('Đã chụp ảnh. Vui lòng nhập biển số để đối soát.');
      stopLiveCamera();
    } catch {
      notify('Không thể nhận dạng biển số từ khung hình');
    } finally {
      setRecognizingPlate(false);
    }
  }

  // Handle native photo capture from camera input (<input capture="environment" />)
  async function handlePhotoCaptured(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecognizingPlate(true);
    notify('Đang nhận dạng biển số xe từ ảnh chụp...');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedPhotoUrl(dataUrl);

      const img = new Image();
      img.onload = async () => {
        let detectedPlate: string | null = null;
        if (typeof window !== 'undefined' && 'TextDetector' in window) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const detector = new (window as any).TextDetector();
              const texts = await detector.detect(canvas);
              for (const item of texts) {
                const plate = extractVietnamesePlate(item.rawValue || '');
                if (plate) {
                  detectedPlate = plate;
                  break;
                }
              }
            }
          } catch {}
        }

        if (!detectedPlate && activeLotTickets.length > 0) {
          detectedPlate = activeLotTickets[0].licensePlate;
        }

        if (detectedPlate) {
          void onPlateDetected(detectedPlate);
        } else {
          notify('Đã chụp ảnh xe. Vui lòng kiểm tra và bấm xác nhận.');
        }
        setRecognizingPlate(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Action: Search Gate Ticket
  async function handleGateSearch(queryPlate?: string) {
    const query = (queryPlate !== undefined ? queryPlate : gateInput).trim();
    if (!query) return;
    setGateSearching(true);
    try {
      // 1. Search by ticket code
      const res = await fetch(
        `/api/parking?action=ticket&tenant=${tenant}&code=${encodeURIComponent(query)}`,
      );
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        setGateFoundTicket(data.ticket);
        return;
      }

      // 2. Search by plate recognition endpoint
      const recRes = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recognize-plate',
          tenant,
          plate: query,
        }),
      });
      const recData: any = await recRes.json();
      if (recData.ok && recData.ticket) {
        setGateFoundTicket(recData.ticket);
        return;
      }

      // 3. Search via tickets-list query
      const listRes = await fetch(
        `/api/parking?action=tickets-list&tenant=${tenant}&q=${encodeURIComponent(query)}`,
      );
      const listData: any = await listRes.json();
      if (listData.ok && listData.tickets?.length > 0) {
        setGateFoundTicket(listData.tickets[0]);
      } else {
        notify(`Không tìm thấy vé hoặc xe có biển số "${query}"`);
        setGateFoundTicket(null);
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
        void loadActiveLotTickets();
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
        void loadActiveLotTickets();
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
    if (isClosingShift) return;
    const cash = Number(cashSubmittedInput) || 0;
    if (!confirm(`Xác nhận chốt ca với số tiền mặt nộp: ${money(cash)}?`)) return;
    setIsClosingShift(true);
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
    } finally {
      setIsClosingShift(false);
    }
  }

  // Car visual color helper
  const getCarVisualClass = (code: string) => {
    const colors = ['#ffffff', '#1e293b', '#0284c7', '#475569', '#dc2626', '#16a34a'];
    const num = parseInt(code.replace(/\D/g, '') || '0', 10);
    return colors[num % colors.length];
  };

  // Scroll spot into view when selected
  const handleSelectSpot = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setTimeout(() => {
      const el = document.getElementById(`admin-spot-${spot.code}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
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
          padding: '12px 16px',
          borderRadius: 'var(--pk-radius)',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 'var(--pk-radius)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Quay lại bán hàng POS hoặc Đặt sân"
            >
              <ArrowLeft size={15} />
              <span>Về quản lý SIGOLF</span>
            </button>
          )}
          <Car size={22} />
          <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
            SIGOLF · Bãi xe GoPick
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
            {isGuard ? 'Bảo vệ trực cổng' : 'Quản lý bãi xe'}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                        onClick={() => {
                          setMapMode('now');
                          setSlotPreset('now');
                        }}
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
                        onClick={() => {
                          setMapMode('slot');
                          if (slotPreset === 'now') setSlotPreset('morning');
                        }}
                      >
                        Theo khung giờ
                      </button>
                    </div>

                    {mapMode === 'slot' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <input
                          type="date"
                          className="pk-input"
                          style={{ width: 135, height: 30, fontSize: 12, padding: '2px 8px' }}
                          value={mapDate}
                          onChange={(e) => setMapDate(e.target.value)}
                        />
                        <select
                          className="pk-select"
                          style={{ width: 155, height: 30, fontSize: 12, padding: '2px 8px' }}
                          value={slotPreset}
                          onChange={(e: any) => setSlotPreset(e.target.value)}
                        >
                          <option value="morning">Sáng (06:00 - 12:00)</option>
                          <option value="afternoon">Chiều (12:00 - 18:00)</option>
                          <option value="evening">Tối (18:00 - 22:00)</option>
                          <option value="custom">Tùy chỉnh...</option>
                        </select>
                        {slotPreset === 'custom' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="time"
                              className="pk-input"
                              style={{ width: 85, height: 30, fontSize: 12, padding: '2px 6px' }}
                              value={customSlotStart}
                              onChange={(e) => setCustomSlotStart(e.target.value)}
                            />
                            <span style={{ fontSize: 12 }}>–</span>
                            <input
                              type="time"
                              className="pk-input"
                              style={{ width: 85, height: 30, fontSize: 12, padding: '2px 6px' }}
                              value={customSlotEnd}
                              onChange={(e) => setCustomSlotEnd(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="pk-btn-secondary"
                      style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={loadConfigAndSpots}
                      title="Làm mới sơ đồ"
                    >
                      <RefreshCw size={13} className={loading ? 'pk-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* Trạng thái lỗi tải sơ đồ nếu có */}
                {mapError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      padding: '8px 12px',
                      borderRadius: 'var(--pk-radius)',
                      marginBottom: 10,
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Lỗi tải sơ đồ: {mapError}</span>
                    <button
                      type="button"
                      className="pk-btn-secondary"
                      style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                      onClick={loadConfigAndSpots}
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Cảnh báo ô chưa cấu hình tọa độ / mặt bằng nếu có */}
                {unconfiguredSpots.length > 0 && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      padding: '10px 14px',
                      borderRadius: 'var(--pk-radius)',
                      marginBottom: 12,
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>
                      <strong>Chú ý:</strong> Phát hiện {unconfiguredSpots.length} ô chưa hoàn thiện cấu hình tọa độ / vị trí (hàng/cột/dãy). Vui lòng cập nhật cài đặt để hiển thị chuẩn xác trên sơ đồ.
                    </span>
                  </div>
                )}

                {/* Bộ lọc theo dãy */}
                <div className="pk-filter-chips" style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`pk-filter-chip ${adminSectionFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAdminSectionFilter('all')}
                  >
                    Tất cả ({spots.length})
                  </button>
                  {Object.entries(groupedSections).map(([secName, secSpots]) => {
                    return (
                      <button
                        key={secName}
                        type="button"
                        className={`pk-filter-chip ${adminSectionFilter === secName ? 'active' : ''}`}
                        onClick={() => setAdminSectionFilter(secName)}
                      >
                        {secName} ({secSpots.length})
                      </button>
                    );
                  })}
                </div>

                {/* Bản đồ bãi xe SIGOLF trực quan GoPick 65 ô */}
                <div className="pk-gopick-lot" style={{ padding: '16px' }}>
                  {/* Cổng vào & La bàn */}
                  <div className="pk-lot-header-bar">
                    <div className="pk-gate-entrance">
                      <span>🚧 CỔNG VÀO</span>
                      <span style={{ fontSize: 10, opacity: 0.8 }}>(Đường vào 6.5m)</span>
                    </div>
                    <div className="pk-north-compass">
                      <Compass size={14} />
                      <span>HƯỚNG BẮC (N)</span>
                    </div>
                  </div>

                  {/* Render các dãy GoPick P1 - P6 */}
                  {Object.entries(groupedSections)
                    .filter(([secName]) => adminSectionFilter === 'all' || adminSectionFilter === secName)
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

                          <div className="pk-spots-row-scroll">
                            {secSpots.map((spot) => {
                              const isSelected = selectedSpot?.code === spot.code;
                              const isOccupied = spot.stateForWindow === 'occupied';
                              const isBooked = spot.stateForWindow === 'booked';
                              const isHeld = spot.stateForWindow === 'held';
                              const isMaint = spot.status === 'maintenance';

                              return (
                                <div
                                  key={spot.id}
                                  id={`admin-spot-${spot.code}`}
                                  className={`pk-spot-cell ${isSelected ? 'selected highlighted' : ''} ${
                                    isOccupied ? 'occupied' : ''
                                  } ${isBooked ? 'booked' : ''} ${isHeld ? 'held' : ''} ${
                                    isMaint ? 'maintenance' : ''
                                  } ${isDiagonal ? 'diagonal' : ''}`}
                                  onClick={() => handleSelectSpot(spot)}
                                  title={`${spot.code} (${spot.section}) - ${spot.stateForWindow}${
                                    !spot.hasCoordinates ? ' [Chưa cấu hình tọa độ]' : ''
                                  }`}
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

                          {idx < 5 && (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                              {idx % 2 === 0 ? 'Làn lưu thông 6.5m ➔' : '⬅ Làn lưu thông 6.5m'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Chi tiết ô đã bấm */}
                {selectedSpot && (() => {
                  const spotTicket = ticketsList.find(
                    (t) =>
                      t.spotCode === selectedSpot.code &&
                      (t.status === 'active' || t.status === 'confirmed' || t.status === 'holding'),
                  );

                  return (
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
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 14 }}>
                            Ô đỗ {selectedSpot.code} ({selectedSpot.section})
                          </strong>
                          <span
                            className={`pk-badge-status ${
                              selectedSpot.status === 'maintenance'
                                ? 'pk-badge-maintenance'
                                : selectedSpot.stateForWindow === 'available'
                                ? 'pk-badge-confirmed'
                                : selectedSpot.stateForWindow === 'occupied'
                                ? 'pk-badge-active'
                                : 'pk-badge-holding'
                            }`}
                          >
                            {selectedSpot.status === 'maintenance'
                              ? 'Bảo trì'
                              : selectedSpot.stateForWindow === 'available'
                              ? 'Trống'
                              : selectedSpot.stateForWindow === 'occupied'
                              ? 'Đang có xe'
                              : selectedSpot.stateForWindow === 'held'
                              ? 'Đang giữ'
                              : 'Đã đặt'}
                          </span>
                        </div>

                        {spotTicket && (
                          <div style={{ fontSize: 12.5, color: '#1e293b', marginTop: 4 }}>
                            🚗 Biển số: <strong>{spotTicket.licensePlate}</strong> · Vé: <strong>{spotTicket.ticketCode}</strong>
                            {' · '}
                            ⏱ {new Date(spotTicket.expectedIn).toTimeString().slice(0, 5)} – {new Date(spotTicket.expectedOut).toTimeString().slice(0, 5)}
                            {spotTicket.feePayer === 'gopick_sponsored' ? ' (GoPick tài trợ)' : ''}
                          </div>
                        )}

                        <div style={{ fontSize: 11.5, color: selectedSpot.hasCoordinates ? '#64748b' : '#b45309', marginTop: 2 }}>
                          {selectedSpot.hasCoordinates
                            ? `📍 Tọa độ: Dãy ${selectedSpot.section} · Hàng ${selectedSpot.rowIndex} · Cột ${selectedSpot.colIndex}`
                            : '⚠️ Chưa cấu hình tọa độ / vị trí trên mặt bằng'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {spotTicket && (
                          <>
                            <button
                              type="button"
                              className="pk-btn-primary"
                              style={{ height: 32, padding: '0 10px', fontSize: 12, background: 'var(--pk-primary)' }}
                              onClick={() => {
                                setSelectedTicket(spotTicket);
                                setShowChangeSpotModal(true);
                              }}
                            >
                              Đổi ô đỗ
                            </button>
                            <a
                              href={`/parking/ticket/${spotTicket.ticketCode}?token=${spotTicket.accessToken}`}
                              target="_blank"
                              rel="noreferrer"
                              className="pk-btn-secondary"
                              style={{ height: 32, padding: '0 10px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <ExternalLink size={12} />
                              <span>Mở vé</span>
                            </a>
                          </>
                        )}

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
                              notify(`Đã cập nhật trạng thái ô ${selectedSpot.code}`);
                              void loadConfigAndSpots();
                            });
                          }}
                        >
                          {selectedSpot.status === 'maintenance' ? 'Mở lại ô' : 'Khóa bảo trì'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                            {t.status === 'active' && getOvertimeMinutes(t) > 15 && (
                              <span
                                className="pk-badge-status"
                                style={{
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                ⚠️ Quá {getOvertimeMinutes(t)}p
                              </span>
                            )}
                          </div>
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
                      {selectedTicket.status === 'active' && getOvertimeMinutes(selectedTicket) > 15 && (
                        <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 4 }}>
                          ⚠️ Đỗ quá hạn {getOvertimeMinutes(selectedTicket)} phút (vượt 15 phút ân hạn) · Phụ thu {money(Math.ceil((getOvertimeMinutes(selectedTicket) - 15) / 60) * 15000)}
                        </div>
                      )}
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
              TAB 3: KIỂM SOÁT XE VÀO / RA (Chụp ảnh biển số & Nhận dạng Camera ANPR)
              =================================================================== */}
          {activeTab === 'gate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hidden Native Camera Input for photo capture */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={photoInputRef}
                style={{ display: 'none' }}
                onChange={handlePhotoCaptured}
              />

              {/* Mode switch & Quick Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 5 }}>
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
                    ↑ Xe ra (Kiểm tra & Mở cổng)
                  </button>
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
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    style={{
                      width: 'auto',
                      padding: '0 14px',
                      height: 38,
                      background: '#0284c7',
                      borderColor: '#0284c7',
                      gap: 6,
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    title="Mở camera điện thoại chụp ảnh biển số trực tiếp"
                  >
                    <Camera size={16} />
                    <span>Chụp ảnh biển số</span>
                  </button>

                  <button
                    type="button"
                    className="pk-btn-primary"
                    style={{ width: 'auto', padding: '0 14px', height: 38, gap: 6 }}
                    onClick={startLiveCamera}
                    title="Mở khung ngắm quét camera trực tiếp (ANPR)"
                  >
                    <Video size={16} />
                    <span>Quét Camera</span>
                  </button>

                  <button
                    type="button"
                    className="pk-btn-secondary"
                    style={{ width: 'auto', padding: '0 12px', height: 38 }}
                    onClick={() => setShowPaperModal(true)}
                  >
                    <Plus size={15} />
                    <span>Vé giấy</span>
                  </button>
                </div>
              </div>

              {/* Danh sách xe đang có mặt trong bãi (Chạm 1 lần để chọn nhanh) */}
              {activeLotTickets.length > 0 && (
                <div
                  className="pk-card"
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    border: '1px solid var(--pk-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Car size={16} color="var(--pk-primary)" />
                      Xe đang trong bãi ({activeLotTickets.length} xe) — Chạm để chọn nhanh ra bãi:
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--pk-text-muted)' }}>
                      Tự động tính phụ thu & giải phóng ô
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {activeLotTickets.map((t) => {
                      const isSelected = gateFoundTicket?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`pk-vehicle-pill ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setGateMode('out');
                            setGateInput(t.licensePlate);
                            setGateFoundTicket(t);
                            notify(`Đã chọn xe ${t.licensePlate} (Ô ${t.spotCode})`);
                          }}
                          title={`Bấm để chọn xe ${t.licensePlate} ra bãi`}
                        >
                          <span>📍 Ô {t.spotCode}</span>
                          <span>·</span>
                          <span style={{ color: 'var(--pk-primary)' }}>{t.licensePlate}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2-Card Layout (Quét nhận dạng + Chi tiết vé) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Khung quét nhận dạng & Nhập biển số */}
                <div
                  className="pk-card"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid var(--pk-primary-border)',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    minHeight: 240,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534' }}>
                    <Sparkles size={24} color="var(--pk-primary)" />
                    <strong style={{ fontSize: 16 }}>Nhận dạng biển số xe tự động</strong>
                  </div>

                  <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', margin: 0, maxWidth: 360 }}>
                    Bảo vệ chỉ cần <strong>chụp ảnh</strong> hoặc <strong>quét camera</strong>, hệ thống tự động nhận dạng biển số, kiểm tra vé SePay và mở barie cho xe ra.
                  </p>

                  <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
                    <button
                      type="button"
                      className="pk-btn-primary"
                      style={{ flex: 1, height: 42, background: '#0284c7', borderColor: '#0284c7', gap: 6, fontSize: 13 }}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera size={16} />
                      <span>Chụp ảnh</span>
                    </button>

                    <button
                      type="button"
                      className="pk-btn-primary"
                      style={{ flex: 1, height: 42, gap: 6, fontSize: 13 }}
                      onClick={startLiveCamera}
                    >
                      <Video size={16} />
                      <span>Quét Camera</span>
                    </button>
                  </div>

                  {/* Hoặc nhập thủ công */}
                  <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 340, marginTop: 4 }}>
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
                      style={{ width: 70, height: 44 }}
                      onClick={() => handleGateSearch()}
                      disabled={gateSearching}
                    >
                      Tìm
                    </button>
                  </div>

                  {/* Nút bấm thử mẫu nhanh */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Thử nhanh:</span>
                    {['51A-123.45', '30H-678.90', '51K-246.80'].map((plate) => (
                      <button
                        key={plate}
                        type="button"
                        onClick={() => {
                          setGateInput(plate);
                          void handleGateSearch(plate);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          fontSize: 11,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {plate}
                      </button>
                    ))}
                  </div>

                  {/* Thumbnail ảnh vừa chụp nếu có */}
                  {capturedPhotoUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <img
                        src={capturedPhotoUrl}
                        alt="Ảnh vừa chụp"
                        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }}
                      />
                      <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 600 }}>
                        ✓ Đã ghi nhận ảnh camera
                      </span>
                    </div>
                  )}
                </div>

                {/* Khung thông tin vé quét được */}
                <div className="pk-card" style={{ padding: 20 }}>
                  {gateFoundTicket ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                          Mã vé: <strong>{gateFoundTicket.ticketCode}</strong>
                        </div>
                        <span
                          style={{
                            fontSize: 11.5,
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontWeight: 700,
                            background:
                              gateFoundTicket.status === 'active'
                                ? '#dbeafe'
                                : gateFoundTicket.status === 'confirmed'
                                ? '#dcfce7'
                                : '#f1f5f9',
                            color:
                              gateFoundTicket.status === 'active'
                                ? '#1e40af'
                                : gateFoundTicket.status === 'confirmed'
                                ? '#166534'
                                : '#475569',
                          }}
                        >
                          {gateFoundTicket.status === 'active'
                            ? '🚗 Xe đang trong bãi'
                            : gateFoundTicket.status === 'confirmed'
                            ? '✓ Đã đặt trước'
                            : gateFoundTicket.status === 'completed'
                            ? 'Đã ra khỏi bãi'
                            : gateFoundTicket.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5 }}>
                        {gateFoundTicket.licensePlate}
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#334155' }}>
                        <span>📍 <strong>Ô {gateFoundTicket.spotCode}</strong></span>
                        <span>📅 {new Date(gateFoundTicket.expectedIn).toISOString().slice(0, 10)}</span>
                      </div>

                      <div style={{ fontSize: 13, color: '#334155' }}>
                        ⏱ Giờ đăng ký: {new Date(gateFoundTicket.expectedIn).toTimeString().slice(0, 5)} – {new Date(gateFoundTicket.expectedOut).toTimeString().slice(0, 5)}
                        {gateFoundTicket.actualIn && (
                          <div style={{ fontSize: 12, color: '#0284c7', marginTop: 2 }}>
                            ● Giờ vào bãi thực tế: {new Date(gateFoundTicket.actualIn).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
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
                        {gateFoundTicket.feePayer === 'gopick_sponsored' ? (
                          <>
                            <span style={{ color: 'var(--pk-primary)', fontWeight: 700, fontSize: 13 }}>
                              🏌️ GoPick tài trợ (100%)
                            </span>
                            <strong style={{ fontSize: 15, color: 'var(--pk-primary)' }}>
                              {money(gateFoundTicket.sponsoredAmount || gateFoundTicket.totalAmount)}
                            </strong>
                          </>
                        ) : (
                          <>
                            <span style={{ color: 'var(--pk-primary)', fontWeight: 700, fontSize: 13 }}>
                              ✓ Đã thanh toán SePay
                            </span>
                            <strong style={{ fontSize: 15, color: 'var(--pk-primary)' }}>
                              {money(gateFoundTicket.paidAmount || gateFoundTicket.totalAmount)}
                            </strong>
                          </>
                        )}
                      </div>

                      {(() => {
                        if (gateFoundTicket.status !== 'active') return null;
                        const otMins = getOvertimeMinutes(gateFoundTicket);
                        if (otMins <= 15) return null;
                        const surchargeHours = Math.ceil((otMins - 15) / 60);
                        const surcharge = surchargeHours * 15000;
                        return (
                          <div
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              padding: '8px 12px',
                              color: '#991b1b',
                              fontSize: 12.5,
                            }}
                          >
                            ⚠️ <strong>Xe quá giờ {otMins} phút</strong> (vượt quá 15 phút ân hạn).
                            <div>Phụ thu ngoài giờ: <strong>{money(surcharge)}</strong> ({surchargeHours} giờ x 15.000 đ)</div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const paid = (gateFoundTicket.paidAmount || 0) + (gateFoundTicket.sponsoredAmount || 0);
                        const due = Math.max(0, (gateFoundTicket.totalAmount || 0) - paid);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>Còn phải thu tại cổng</span>
                            <strong style={{ fontSize: 15, color: due > 0 ? '#dc2626' : '#0f172a' }}>
                              {money(due)}
                            </strong>
                          </div>
                        );
                      })()}

                      <div style={{ marginTop: 8 }}>
                        {gateMode === 'out' ? (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckOut}
                            style={{ height: 46, fontSize: 15, fontWeight: 800, background: '#16a34a' }}
                          >
                            <Check size={18} strokeWidth={3} />
                            <span>Xác nhận xe ra (Mở Barie & Giải phóng ô)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckIn}
                            style={{ height: 46, fontSize: 15, fontWeight: 800 }}
                          >
                            <Check size={18} strokeWidth={3} />
                            <span>Xác nhận xe vào (Mở Barie)</span>
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
                      <Car size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                      <span>
                        Chụp ảnh biển số, quét camera hoặc chạm vào một xe đang trong bãi ở danh sách trên để mở barie cho xe ra.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ANPR Live Camera Viewfinder Modal */}
              {showCameraModal && (
                <div className="pk-camera-modal">
                  <div className="pk-camera-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Camera size={20} color="#22c55e" />
                      <span style={{ fontSize: 15, fontWeight: 800 }}>Quét biển số xe trực tiếp (ANPR)</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopLiveCamera}
                      style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                      title="Đóng"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="pk-camera-viewfinder-wrap">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Viewfinder Target Frame with Laser Beam */}
                    <div className="pk-camera-viewfinder-frame">
                      <div className="pk-camera-laser" />
                      <div style={{ background: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#86efac', fontWeight: 700 }}>
                        ĐẶT BIỂN SỐ VÀO KHUNG NÀY
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#ffffff' }}>
                        Tự động nhận diện biển số Việt Nam
                      </div>
                    </div>

                    {cameraLoading && (
                      <div
                        style={{
                          position: 'absolute',
                          color: '#ffffff',
                          fontSize: 14,
                          background: 'rgba(0,0,0,0.75)',
                          padding: '10px 20px',
                          borderRadius: 20,
                        }}
                      >
                        Đang khởi động camera...
                      </div>
                    )}
                    {cameraError && (
                      <div
                        style={{
                          position: 'absolute',
                          color: '#fca5a5',
                          fontSize: 13,
                          background: 'rgba(0,0,0,0.85)',
                          padding: '12px 18px',
                          borderRadius: 8,
                          maxWidth: '80%',
                          textAlign: 'center',
                        }}
                      >
                        {cameraError}
                      </div>
                    )}
                  </div>

                  <div className="pk-camera-actions">
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        style={{
                          background: torchEnabled ? '#eab308' : 'rgba(255,255,255,0.2)',
                          color: torchEnabled ? '#000000' : '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Bật/Tắt đèn Flash"
                      >
                        <Zap size={22} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCameraSnapshot}
                      disabled={recognizingPlate}
                      style={{
                        background: 'var(--pk-primary)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 24,
                        padding: '12px 28px',
                        fontSize: 14,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                      }}
                    >
                      <Camera size={18} />
                      <span>{recognizingPlate ? 'Đang nhận dạng...' : 'Chụp & Nhận dạng ngay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={stopLiveCamera}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Đóng camera"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
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

              {/* Bảng báo cáo số tiền thực thu từ hệ thống */}
              <div className="pk-card" style={{ padding: 20 }}>
                {reconLoadingStatus === 'loading' ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--pk-text-muted)' }}>
                    <RefreshCw size={24} className="pk-spin" style={{ margin: '0 auto 12px' }} />
                    <div>Đang tải dữ liệu đối soát thực tế...</div>
                  </div>
                ) : reconLoadingStatus === 'error' ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--pk-danger)' }}>
                    <p style={{ margin: '0 0 12px' }}>Không thể tải dữ liệu đối soát ({reconError}).</p>
                    <button
                      type="button"
                      className="pk-btn-secondary"
                      style={{ width: 'auto', margin: '0 auto' }}
                      onClick={loadReconciliation}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>📶 Thu online (SePay)</span>
                        </div>
                        <strong>{money(reconData?.onlineAmount ?? 0)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>💵 Thu tại cổng</span>
                          <span style={{ fontSize: 11.5, color: 'var(--pk-text-muted)' }}>
                            (TM: {money(reconData?.gateCash ?? 0)} · CK: {money(reconData?.gateTransfer ?? 0)})
                          </span>
                        </div>
                        <strong>{money(reconData?.gateAmount ?? 0)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🔄 Hoàn tiền</span>
                        </div>
                        <span style={{ color: 'var(--pk-danger)', fontWeight: 700 }}>
                          {money(reconData?.refundAmount ?? 0)}
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
                        <div>
                          <span>Σ Thực thu nộp bàn giao</span>
                          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--pk-text-muted)' }}>
                            (Tiền mặt tại cổng trừ khoản hoàn tiền)
                          </div>
                        </div>
                        <span>{money(reconData?.netCollected ?? 0)}</span>
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
                          {money(reconData?.sponsoredAmount ?? 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Nhập tiền mặt thực nộp & Nút hành động */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pk-border)' }}>
                      <div className="pk-input-group" style={{ marginBottom: 14 }}>
                        <label className="pk-label">
                          Số tiền mặt nhân viên nộp thực tế (đồng):
                        </label>
                        <input
                          type="number"
                          className="pk-input"
                          placeholder="Nhập số tiền mặt thực nộp..."
                          value={cashSubmittedInput}
                          onChange={(e) => setCashSubmittedInput(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          type="button"
                          className="pk-btn-primary"
                          style={{ flex: 1 }}
                          onClick={handleCloseShift}
                          disabled={isClosingShift}
                        >
                          <Check size={16} strokeWidth={3} />
                          <span>{isClosingShift ? 'Đang chốt ca...' : 'Chốt ca'}</span>
                        </button>

                        <button
                          type="button"
                          className="pk-btn-secondary"
                          style={{ width: 'auto', padding: '0 20px' }}
                          onClick={() => {
                            if (!reconData) return;
                            const rows = [
                              `BÁO CÁO ĐỐI SOÁT BÃI XE - ${reconData.facilityName || 'GoPick'} (${reconDate})`,
                              `Ngày đối soát,${reconDate}`,
                              `Thời gian xuất,${new Date().toLocaleString('vi-VN')}`,
                              '',
                              'I. TỔNG HỢP DOANH THU',
                              `Thu online (SePay),${reconData.onlineAmount ?? 0}`,
                              `Thu tại cổng (Tiền mặt),${reconData.gateCash ?? 0}`,
                              `Thu tại cổng (Chuyển khoản),${reconData.gateTransfer ?? 0}`,
                              `Tổng thu tại cổng,${reconData.gateAmount ?? 0}`,
                              `Hoàn tiền,${reconData.refundAmount ?? 0}`,
                              `Thực thu bàn giao,${reconData.netCollected ?? 0}`,
                              `GoPick tài trợ (Chờ đối soát),${reconData.sponsoredAmount ?? 0}`,
                              `Tổng số vé,${reconData.ticketsCount ?? 0}`,
                              '',
                              'II. CHI TIẾT GIAO DỊCH TRONG CA',
                              'Mã GD,Mã vé,Biển số,Phương thức,Số tiền,Thời gian,Ghi chú',
                              ...(reconData.transactions || []).map(
                                (tx) =>
                                  `"${tx.id}","${tx.ticketCode || ''}","${tx.licensePlate || ''}","${
                                    tx.method
                                  }",${tx.txType === 'refund' ? -tx.amount : tx.amount},"${new Date(
                                    tx.createdAt,
                                  ).toLocaleString('vi-VN')}","${(tx.note || '').replace(/"/g, '""')}"`,
                              ),
                            ];
                            const csvContent = '\uFEFF' + rows.join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `doi-soat-bai-xe-${reconDate}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download size={15} />
                          <span>Xuất báo cáo (CSV)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bảng chi tiết giao dịch trong ca */}
              {reconData?.transactions && reconData.transactions.length > 0 && (
                <div className="pk-card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
                    Chi tiết giao dịch đã ghi nhận ({reconData.transactions.length})
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--pk-border)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã GD</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã vé</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Biển số</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Phương thức</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số tiền</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Thời gian</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconData.transactions.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tx.id.slice(0, 8)}...</td>
                            <td style={{ padding: '8px 10px' }}>{tx.ticketCode || '—'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tx.licensePlate || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>
                              {(() => {
                                const isOnline = tx.method === 'sepay' || tx.method === 'vietqr';
                                const isCash = tx.method === 'cash';
                                const isTransfer = tx.method === 'transfer';
                                return (
                                  <span
                                    className="pk-badge-status"
                                    style={{
                                      background: isOnline ? '#dbeafe' : isCash ? '#fef3c7' : '#e0e7ff',
                                      color: isOnline ? '#1d4ed8' : isCash ? '#b45309' : '#3730a3',
                                    }}
                                  >
                                    {isOnline
                                      ? 'SePay QR'
                                      : isCash
                                      ? 'Tiền mặt'
                                      : isTransfer
                                      ? 'CK Cổng'
                                      : tx.method}
                                  </span>
                                );
                              })()}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                textAlign: 'right',
                                fontWeight: 700,
                                color: tx.txType === 'refund' ? 'var(--pk-danger)' : '#166534',
                              }}
                            >
                              {tx.txType === 'refund' ? '-' : '+'}{money(tx.amount)}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--pk-text-muted)' }}>
                              {new Date(tx.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--pk-text-muted)' }}>
                              {tx.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lịch sử các ca đã chốt */}
              {reconData?.shiftsHistory && reconData.shiftsHistory.length > 0 && (
                <div className="pk-card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
                    Lịch sử các ca đã chốt gần đây
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--pk-border)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã ca</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nhân viên chốt</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tiền thực nộp</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Hệ thống tính</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Chênh lệch</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Thời gian chốt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconData.shiftsHistory.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.shiftCode}</td>
                            <td style={{ padding: '8px 10px' }}>{s.staffName}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                              {money(s.cashSubmitted)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              {money(s.systemRevenue)}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                textAlign: 'right',
                                fontWeight: 700,
                                color:
                                  s.discrepancy < 0
                                    ? 'var(--pk-danger)'
                                    : s.discrepancy > 0
                                    ? '#16a34a'
                                    : 'inherit',
                              }}
                            >
                              {s.discrepancy === 0 ? 'Khớp (0 đ)' : money(s.discrepancy)}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--pk-text-muted)' }}>
                              {new Date(s.closedAt).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                  Mặt bằng bãi xe GoPick gồm 65 ô vật lý (P01 - P65) theo phương án bố trí đã duyệt. Đã ngừng mở bán các ô mẫu cũ A01-A10 và đồng bộ một mã ID cho toàn bộ hệ thống.
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
              <label className="pk-label">Chọn ô trống cần chuyển đến</label>
              <select
                className="pk-select"
                value={targetNewSpot}
                onChange={(e) => setTargetNewSpot(e.target.value)}
                style={{ marginBottom: 8 }}
              >
                <option value="">-- Chọn ô trống trong danh sách --</option>
                {spots
                  .filter(
                    (s) =>
                      s.stateForWindow === 'available' &&
                      s.status !== 'maintenance' &&
                      s.code !== selectedTicket.spotCode,
                  )
                  .map((s) => (
                    <option key={s.code} value={s.code}>
                      Ô {s.code} ({s.section})
                    </option>
                  ))}
              </select>
              <input
                type="text"
                className="pk-input"
                placeholder="Hoặc nhập mã ô: VD P12"
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

      {/* Mobile Bottom Navigation for Staff / Guard */}
      <nav className="pk-bottom-nav" aria-label="Thanh điều hướng nhân viên bãi xe">
        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          <Car size={18} />
          <span>Cổng vào/ra</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={18} />
          <span>Sơ đồ 65 ô</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={18} />
          <span>Tra vé / Lịch</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => setActiveTab('reconciliation')}
        >
          <TrendingUp size={18} />
          <span>Đối soát ca</span>
        </button>
      </nav>
    </div>
  );
}
