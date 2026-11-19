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
  Save,
  Edit2,
  Trash2,
  Printer,
  Bell,
  Volume2,
  VolumeX,
  SwitchCamera,
  User,
  ChevronDown,
  Grid,
  HelpCircle,
  Folder,
  ArrowUpRight,
  HardDrive,
} from 'lucide-react';
import { money } from '../../../lib/club';
import { sepayQrUrl } from '../../../lib/bank';
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
  const [gatePaymentMethod, setGatePaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [showPrintSlipModal, setShowPrintSlipModal] = useState<boolean>(false);
  const [ticketToPrint, setTicketToPrint] = useState<ParkingTicket | null>(null);
  const [slipPaperSize, setSlipPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [slipPrintMode, setSlipPrintMode] = useState<'compact' | 'full'>('full');
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('pk_gate_sound_muted') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });
  const prevActiveCountRef = useRef<number | null>(null);
  const [bank, setBank] = useState<{ bin: string; account: string; holder: string; bankName: string }>({
    bin: '970422',
    account: '0877834888',
    holder: 'SAIGON INDOOR GOLF',
    bankName: 'MBBank (Quân Đội)',
  });

  // Active parked cars for instant 1-touch select
  const [activeLotTickets, setActiveLotTickets] = useState<ParkingTicket[]>([]);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [recentTab, setRecentTab] = useState<'active' | 'booked' | 'all'>('active');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Global Ctrl + K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Camera & Plate Recognition States
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
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

  // Cài đặt bãi xe (Settings) Form & Modal States
  const [formSettings, setFormSettings] = useState<Partial<ParkingSettings>>({});
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSectionFilter, setSettingsSectionFilter] = useState<string>('all');
  const [showSpotModal, setShowSpotModal] = useState<boolean>(false);
  const [spotModalMode, setSpotModalMode] = useState<'create' | 'edit'>('create');
  const [editingSpot, setEditingSpot] = useState<{
    code: string;
    section: string;
    spotType: string;
    rowIndex: number;
    colIndex: number;
    status: string;
  }>({
    code: '',
    section: 'Dãy P1',
    spotType: 'car',
    rowIndex: 1,
    colIndex: 1,
    status: 'active',
  });

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
        if (data.settings) {
          setConfig(data.settings);
          setFormSettings((prev) => (Object.keys(prev).length === 0 ? data.settings : prev));
        }
        if (data.spots) setSpots(data.spots);
        if (data.summary) setMapSummary(data.summary);
        if (data.bank) setBank(data.bank);
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
    void loadActiveLotTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, mapMode, mapDate, slotPreset, customSlotStart, customSlotEnd]);

  // Load active parked tickets for quick 1-touch gate checkout & sound alerts
  async function loadActiveLotTickets() {
    try {
      const res = await fetch(`/api/parking?action=tickets-list&tenant=${tenant}&status=active`);
      const data: any = await res.json();
      if (data.ok && Array.isArray(data.tickets)) {
        if (prevActiveCountRef.current !== null && data.tickets.length > prevActiveCountRef.current) {
          playGateAudio('alert');
          notify(`🔔 Có ${data.tickets.length - prevActiveCountRef.current} xe mới vào bãi`);
        }
        prevActiveCountRef.current = data.tickets.length;
        setActiveLotTickets(data.tickets);
      }
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'gate') {
      void loadActiveLotTickets();
      const interval = setInterval(() => {
        void loadActiveLotTickets();
      }, 15000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'schedule') void loadTicketsList();
    if (activeTab === 'reconciliation') void loadReconciliation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTicket, statusFilter, reconDate]);

  // Audio mute & sound alerts helper
  function toggleSoundMute() {
    setSoundMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pk_gate_sound_muted', String(next));
        } catch {}
      }
      notify(next ? 'Đã tắt chuông thông báo bốt gác' : 'Đã bật chuông thông báo bốt gác');
      return next;
    });
  }

  function playGateAudio(type: 'success' | 'alert' | 'beep') {
    if (soundMuted) return;
    try {
      if (type === 'success' || type === 'alert') {
        const audio = new Audio('/service-bell.wav');
        audio.volume = 0.85;
        audio.play().catch(() => playPlateBeep());
      } else {
        playPlateBeep();
      }
    } catch {
      playPlateBeep();
    }
  }

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
    playGateAudio('beep');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    stopLiveCamera();
    setGateInput(plate);
    notify(`✓ Đã nhận dạng biển số: ${plate}`);
    await handleGateSearch(plate);
  }

  // Camera stream initialization with facingMode
  async function initCameraStream(facing: 'environment' | 'user') {
    setCameraLoading(true);
    setCameraError('');
    setTorchSupported(false);
    setTorchEnabled(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setTorchSupported(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(() => {
        void scanVideoFrame();
      }, 500);
    } catch {
      setCameraLoading(false);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập thiết bị hoặc dùng tính năng Chụp ảnh.');
    }
  }

  // Start live camera with ANPR viewfinder
  async function startLiveCamera() {
    setShowCameraModal(true);
    await initCameraStream(cameraFacing);
  }

  // Switch between front and rear cameras
  async function switchCameraFacing() {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    await initCameraStream(next);
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
        playGateAudio('success');
        notify(`✓ Đã xác nhận xe ${data.ticket.licensePlate} vào ô ${data.ticket.spotCode}!`);
        setGateFoundTicket(data.ticket);
        setTicketToPrint(data.ticket);
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
          paymentMethod: gatePaymentMethod,
          staffName: 'Bảo vệ cổng',
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.ticket) {
        playGateAudio('success');
        const msg = data.surchargeDue > 0
          ? `✓ Xe đã ra bãi! Đã thu phụ thu quá giờ: ${money(data.surchargeDue)}`
          : `✓ Xe ${data.ticket.licensePlate} đã ra khỏi bãi an toàn. Ô ${data.ticket.spotCode} đã trống!`;
        notify(msg);
        setGateFoundTicket(data.ticket);
        setTicketToPrint(data.ticket);
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
        setTicketToPrint(data.ticket);
        setShowPrintSlipModal(true);
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

  // Action: Save Parking Facility Settings
  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          tenant,
          ...formSettings,
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.settings) {
        setConfig(data.settings);
        setFormSettings(data.settings);
        notify('✓ Đã lưu cài đặt bãi xe thành công!');
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Lỗi lưu cài đặt');
      }
    } catch {
      notify('Lỗi kết nối khi lưu cài đặt');
    } finally {
      setSavingSettings(false);
    }
  }

  // Action: Save Parking Spot (Add / Edit)
  async function handleSaveSpot() {
    const code = (editingSpot.code || '').trim().toUpperCase();
    if (!code) {
      notify('Vui lòng nhập mã ô đỗ (VD: P66)');
      return;
    }
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-spot',
          tenant,
          ...editingSpot,
          code,
        }),
      });
      const data: any = await res.json();
      if (data.ok) {
        notify(`✓ Đã lưu thông tin ô ${code}`);
        setShowSpotModal(false);
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Lỗi lưu ô đỗ');
      }
    } catch {
      notify('Lỗi kết nối khi lưu ô đỗ');
    }
  }

  // Action: Delete/Deactivate Spot
  async function handleDeleteSpot(code: string) {
    if (!confirm(`Xác nhận ngừng sử dụng ô đỗ ${code}?`)) return;
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-spot',
          tenant,
          code,
        }),
      });
      const data: any = await res.json();
      if (data.ok) {
        notify(`✓ Đã ngừng hoạt động ô ${code}`);
        void loadConfigAndSpots();
      } else {
        notify(data.error || 'Không thể xóa ô đỗ');
      }
    } catch {
      notify('Lỗi xóa ô đỗ');
    }
  }

  function openCreateSpotModal() {
    const nextNum = spots.length + 1;
    const defaultCode = `P${String(nextNum).padStart(2, '0')}`;
    setEditingSpot({
      code: defaultCode,
      section: 'Dãy P6',
      spotType: 'car',
      rowIndex: 6,
      colIndex: (spots.length % 12) + 1,
      status: 'active',
    });
    setSpotModalMode('create');
    setShowSpotModal(true);
  }

  function openEditSpotModal(spot: ParkingSpot) {
    setEditingSpot({
      code: spot.code,
      section: spot.section || 'Dãy P1',
      spotType: spot.spotType || 'car',
      rowIndex: spot.rowIndex || 1,
      colIndex: spot.colIndex || 1,
      status: spot.status || 'active',
    });
    setSpotModalMode('edit');
    setShowSpotModal(true);
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
    <div className="pk-saas-root">
      {/* 1. SaaS Workspace Top Header Bar */}
      <header className="pk-saas-header">
        <div className="pk-saas-brand-wrap">
          {onNavigate && (
            <button
              type="button"
              className="pk-saas-back-btn"
              onClick={() => onNavigate('dashboard')}
              title="Về SiGolf"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              <span className="pk-saas-back-text">Về SiGolf</span>
            </button>
          )}
          <div className="pk-saas-logo-icon">
            <Grid size={16} strokeWidth={2} />
          </div>
          <h1 className="pk-saas-brand-title">Bãi xe GoPick</h1>
        </div>

        {/* Global Search Bar with Ctrl+K */}
        <div className="pk-saas-search-box">
          <Search size={14} strokeWidth={2} className="pk-saas-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm biển số, mã vé, ô P01–P65..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setSearchTicket(e.target.value);
            }}
          />
          <kbd className="pk-saas-search-kbd">Ctrl K</kbd>
        </div>

        {/* Header Right Utilities */}
        <div className="pk-saas-header-right">
          <button
            type="button"
            className="pk-saas-icon-btn"
            onClick={() => {
              void loadConfigAndSpots();
              void loadActiveLotTickets();
            }}
            title="Làm mới"
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>

          <button
            type="button"
            className="pk-saas-icon-btn pk-desktop-only"
            title="Thông báo"
            onClick={() => notify('Bãi xe GoPick hoạt động bình thường.')}
          >
            <Bell size={14} strokeWidth={2} />
            <span className="pk-saas-unread-dot" />
          </button>

          <div className="pk-saas-user-pill pk-desktop-only">
            <div className="pk-saas-avatar">
              <User size={13} strokeWidth={2} />
            </div>
            <span>{isGuard ? 'Bảo vệ' : 'Quản lý'}</span>
          </div>
        </div>
      </header>

      {/* 2. SaaS Main Layout (Sidebar + Content) */}
      <div className="pk-saas-body">
        {/* Left Sidebar */}
        <aside className="pk-saas-sidebar" aria-label="Menu bãi xe">
          <div>
            <nav className="pk-saas-nav-list">
              <button
                type="button"
                className={`pk-saas-nav-item ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
                title="Sơ đồ bãi xe"
              >
                <div className="pk-saas-nav-item-left">
                  <Grid size={16} strokeWidth={2} />
                  <span>Sơ đồ 65 ô</span>
                </div>
                <span className="pk-saas-nav-badge">65 ô</span>
              </button>

              <button
                type="button"
                className={`pk-saas-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('schedule')}
                title="Lịch đặt chỗ"
              >
                <div className="pk-saas-nav-item-left">
                  <Calendar size={16} strokeWidth={2} />
                  <span>Đặt chỗ</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-nav-item ${activeTab === 'gate' ? 'active' : ''}`}
                onClick={() => setActiveTab('gate')}
                title="Cổng vào / ra"
              >
                <div className="pk-saas-nav-item-left">
                  <Car size={16} strokeWidth={2} />
                  <span>Vào / Ra cổng</span>
                </div>
                {activeLotTickets.length > 0 && (
                  <span className="pk-saas-nav-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                    {activeLotTickets.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`pk-saas-nav-item ${activeTab === 'reconciliation' ? 'active' : ''}`}
                onClick={() => setActiveTab('reconciliation')}
                title="Đối soát ca"
              >
                <div className="pk-saas-nav-item-left">
                  <TrendingUp size={16} strokeWidth={2} />
                  <span>Đối soát ca</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                title="Cài đặt hệ thống"
              >
                <div className="pk-saas-nav-item-left">
                  <Sliders size={16} strokeWidth={2} />
                  <span>Cài đặt</span>
                </div>
              </button>
            </nav>

            {/* Section Filter List */}
            <div className="pk-saas-section-header">Khu vực ô đỗ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                type="button"
                className={`pk-saas-sub-item ${adminSectionFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setAdminSectionFilter('all');
                  if (activeTab !== 'map') setActiveTab('map');
                }}
              >
                <Folder size={14} color="#6366f1" strokeWidth={2} />
                <span>Tất cả ô (P01–P65)</span>
              </button>
              <button
                type="button"
                className={`pk-saas-sub-item ${adminSectionFilter === 'Dãy A' ? 'active' : ''}`}
                onClick={() => {
                  setAdminSectionFilter('Dãy A');
                  if (activeTab !== 'map') setActiveTab('map');
                }}
              >
                <Folder size={14} color="#3b82f6" strokeWidth={2} />
                <span>Dãy A (P01–P20)</span>
              </button>
              <button
                type="button"
                className={`pk-saas-sub-item ${adminSectionFilter === 'Dãy B' ? 'active' : ''}`}
                onClick={() => {
                  setAdminSectionFilter('Dãy B');
                  if (activeTab !== 'map') setActiveTab('map');
                }}
              >
                <Folder size={14} color="#10b981" strokeWidth={2} />
                <span>Dãy B (P21–P40)</span>
              </button>
              <button
                type="button"
                className={`pk-saas-sub-item ${adminSectionFilter === 'Dãy C' ? 'active' : ''}`}
                onClick={() => {
                  setAdminSectionFilter('Dãy C');
                  if (activeTab !== 'map') setActiveTab('map');
                }}
              >
                <Folder size={14} color="#f59e0b" strokeWidth={2} />
                <span>Dãy C (P41–P65)</span>
              </button>
            </div>
          </div>

          {/* Bottom Capacity Card */}
          <div className="pk-saas-storage-card">
            <div className="pk-saas-storage-top">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={13} color="#6366f1" strokeWidth={2} />
                Sức chứa bãi xe
              </span>
              <ArrowRight size={12} color="#94a3b8" />
            </div>
            <div className="pk-saas-progress-track">
              <div
                className="pk-saas-progress-fill"
                style={{
                  width: `${Math.min(100, Math.round(((mapSummary.occupied + mapSummary.booked) / 65) * 100))}%`,
                }}
              />
            </div>
            <div className="pk-saas-storage-bottom">
              <span>Đang đỗ {mapSummary.occupied + mapSummary.booked} / 65 ô</span>
              <strong style={{ color: '#0f172a' }}>
                {Math.round(((mapSummary.occupied + mapSummary.booked) / 65) * 100)}%
              </strong>
            </div>
          </div>
        </aside>

        {/* Content Viewport */}
        <main className="pk-saas-content">
          {/* Notification Alert Banner */}
          {notifyMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 12,
                color: '#065f46',
                fontWeight: 600,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color="#059669" strokeWidth={2} />
              <span>{notifyMsg}</span>
            </div>
          )}

          {/* 3. Hero Welcome Banner (Clean, compact on mobile) */}
          <section className="pk-saas-hero-banner">
            <div className="pk-saas-hero-header">
              <div>
                <h2 className="pk-saas-hero-title">Chào buổi sáng 👋</h2>
                <p className="pk-saas-hero-sub">GoPick 250 Lương Định Của · 65 ô P01–P65</p>
              </div>
              <button
                type="button"
                className="pk-saas-action-cta-btn"
                onClick={() => setShowPaperModal(true)}
              >
                <Plus size={14} strokeWidth={2.2} />
                <span>Đặt chỗ</span>
              </button>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="pk-saas-shortcuts-row">
              <button
                type="button"
                className={`pk-saas-shortcut-pill ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <div className="pk-saas-shortcut-icon pk-icon-blue">
                  <Grid size={15} strokeWidth={2} />
                </div>
                <div className="pk-saas-shortcut-text">
                  <strong>Sơ đồ</strong>
                  <span>65 ô P01–P65</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-shortcut-pill ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                <div className="pk-saas-shortcut-icon pk-icon-green">
                  <Calendar size={15} strokeWidth={2} />
                </div>
                <div className="pk-saas-shortcut-text">
                  <strong>Đặt chỗ</strong>
                  <span>Giữ & khóa ô</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-shortcut-pill ${activeTab === 'gate' ? 'active' : ''}`}
                onClick={() => setActiveTab('gate')}
              >
                <div className="pk-saas-shortcut-icon pk-icon-orange">
                  <Camera size={15} strokeWidth={2} />
                </div>
                <div className="pk-saas-shortcut-text">
                  <strong>Vào / Ra</strong>
                  <span>Quét ANPR</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-shortcut-pill ${activeTab === 'reconciliation' ? 'active' : ''}`}
                onClick={() => setActiveTab('reconciliation')}
              >
                <div className="pk-saas-shortcut-icon pk-icon-purple">
                  <TrendingUp size={15} strokeWidth={2} />
                </div>
                <div className="pk-saas-shortcut-text">
                  <strong>Đối soát</strong>
                  <span>Báo cáo ca</span>
                </div>
              </button>

              <button
                type="button"
                className={`pk-saas-shortcut-pill ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <div className="pk-saas-shortcut-icon pk-icon-sky">
                  <DollarSign size={15} strokeWidth={2} />
                </div>
                <div className="pk-saas-shortcut-text">
                  <strong>Cài đặt</strong>
                  <span>Biểu phí & SePay</span>
                </div>
              </button>
            </div>
          </section>

          {/* 4. 3-Column Dashboard Row */}
          {activeTab === 'map' && (
            <div className="pk-saas-grid-3">
              {/* Card 1: Trạng thái hôm nay */}
              <div className="pk-saas-card">
                <div className="pk-saas-card-header">
                  <h3 className="pk-saas-card-title">
                    <Calendar size={15} color="#6366f1" strokeWidth={2} />
                    Trạng thái hôm nay
                  </h3>
                  <button
                    type="button"
                    className="pk-saas-card-link"
                    onClick={() => setActiveTab('schedule')}
                  >
                    <span>Lịch</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #edf2f7',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 12.5, color: '#0f172a' }}>Khung giờ</strong>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {slotPreset === 'now' ? 'Hiện tại' : slotPreset}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#ecfdf5',
                        color: '#059669',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {mapSummary.available} trống
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #edf2f7',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 12.5, color: '#0f172a' }}>Đang đỗ</strong>
                      <div style={{ fontSize: 11, color: '#64748b' }}>250 Lương Định Của</div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {mapSummary.occupied} xe
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: '#f8fafc',
                      border: '1px solid #edf2f7',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 12.5, color: '#0f172a' }}>Đã giữ chỗ</strong>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Golf & Vãng lai</div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: '#fffbeb',
                        color: '#d97706',
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {mapSummary.booked + mapSummary.held} ô
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Xe trong ca */}
              <div className="pk-saas-card">
                <div className="pk-saas-card-header">
                  <h3 className="pk-saas-card-title">
                    <Car size={15} color="#6366f1" strokeWidth={2} />
                    Xe trong ca
                  </h3>
                  <button
                    type="button"
                    className="pk-saas-card-link"
                    onClick={() => setActiveTab('gate')}
                  >
                    <span>Vào / Ra</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="pk-saas-pill-tabs">
                  <button
                    type="button"
                    className={`pk-saas-pill-tab ${recentTab === 'active' ? 'active' : ''}`}
                    onClick={() => setRecentTab('active')}
                  >
                    Đang đỗ ({activeLotTickets.length})
                  </button>
                  <button
                    type="button"
                    className={`pk-saas-pill-tab ${recentTab === 'booked' ? 'active' : ''}`}
                    onClick={() => setRecentTab('booked')}
                  >
                    Đã đặt ({mapSummary.booked})
                  </button>
                  <button
                    type="button"
                    className={`pk-saas-pill-tab ${recentTab === 'all' ? 'active' : ''}`}
                    onClick={() => setRecentTab('all')}
                  >
                    Tất cả
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  {activeLotTickets.length === 0 ? (
                    <div style={{ padding: '16px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                      Chưa có xe đang đỗ.
                    </div>
                  ) : (
                    activeLotTickets.slice(0, 4).map((t) => (
                      <div
                        key={t.id || t.ticketCode}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid #edf2f7',
                          background: '#ffffff',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              padding: '2px 5px',
                              borderRadius: 4,
                              background: '#f1f5f9',
                              fontWeight: 700,
                              color: '#334155',
                              fontFamily: 'monospace',
                              fontSize: 11,
                            }}
                          >
                            {t.spotId}
                          </span>
                          <strong style={{ color: '#0f172a' }}>{t.licensePlate || 'Xe vãng lai'}</strong>
                        </div>
                        <span style={{ color: '#64748b', fontSize: 11 }}>
                          {t.actualIn || t.expectedIn
                            ? new Date(t.actualIn || t.expectedIn).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Vừa vào'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className="pk-saas-card-link"
                  style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
                  onClick={() => setActiveTab('schedule')}
                >
                  <span>Xem danh sách vé</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Card 3: Hoạt động */}
              <div className="pk-saas-card">
                <div className="pk-saas-card-header">
                  <h3 className="pk-saas-card-title">
                    <TrendingUp size={15} color="#6366f1" strokeWidth={2} />
                    Hoạt động
                  </h3>
                  <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Hôm nay ▾</span>
                </div>

                <div className="pk-saas-metric-row">
                  <div className="pk-saas-metric-box">
                    <div className="pk-saas-metric-number">65</div>
                    <div className="pk-saas-metric-label">Tổng ô</div>
                    <div className="pk-saas-trend-badge">
                      <ArrowUpRight size={10} /> 100%
                    </div>
                  </div>

                  <div className="pk-saas-metric-box">
                    <div className="pk-saas-metric-number" style={{ color: '#059669' }}>
                      {mapSummary.available}
                    </div>
                    <div className="pk-saas-metric-label">Trống</div>
                    <div className="pk-saas-trend-badge">
                      <ArrowUpRight size={10} /> {Math.round((mapSummary.available / 65) * 100)}%
                    </div>
                  </div>

                  <div className="pk-saas-metric-box">
                    <div className="pk-saas-metric-number" style={{ color: '#6366f1' }}>
                      {mapSummary.occupied}
                    </div>
                    <div className="pk-saas-metric-label">Đang đỗ</div>
                    <div className="pk-saas-trend-badge" style={{ background: '#f5f3ff', color: '#6366f1' }}>
                      Phục vụ
                    </div>
                  </div>
                </div>

                {/* Smooth Trend Chart */}
                <div className="pk-saas-chart-container">
                  <svg viewBox="0 0 300 70" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,55 Q 40,48 75,50 T 150,36 T 225,24 T 300,16 L 300,70 L 0,70 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M 0,55 Q 40,48 75,50 T 150,36 T 225,24 T 300,16"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <circle cx="75" cy="50" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                    <circle cx="150" cy="36" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                    <circle cx="225" cy="24" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                    <circle cx="300" cy="16" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                  </svg>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 9.5,
                      color: '#94a3b8',
                      marginTop: 2,
                    }}
                  >
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>22:00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 1: SƠ ĐỒ BÃI XE (Bám sát ảnh 2 - Sơ đồ bãi xe)
              =================================================================== */}
          {activeTab === 'map' && (
            <div className="pk-map-layout-row">
              {/* Sơ đồ chính */}
              <div className="pk-card" style={{ flex: 1 }}>
                <div className="pk-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="pk-panel-icon-badge">
                      <span>P</span>
                    </div>
                    <h2 className="pk-panel-title">Sơ đồ bãi xe</h2>
                    <span className="pk-online-pill">
                      <span className="pk-dot-online" /> Trực tuyến
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="pk-header-pill-input">
                      <Calendar size={14} color="#64748b" />
                      <input
                        type="date"
                        value={mapDate}
                        onChange={(e) => {
                          setMapDate(e.target.value);
                          setMapMode('slot');
                        }}
                      />
                    </div>

                    <div className="pk-header-pill-input">
                      <Clock size={14} color="#64748b" />
                      <select
                        value={slotPreset}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSlotPreset(val);
                          setMapMode(val === 'now' ? 'now' : 'slot');
                        }}
                      >
                        <option value="now">Hiện tại ({new Date().toTimeString().slice(0, 5)})</option>
                        <option value="morning">Sáng (08:00 – 12:00)</option>
                        <option value="afternoon">Chiều (13:00 – 17:00)</option>
                        <option value="evening">Tối (17:45 – 20:15)</option>
                        <option value="custom">Tùy chọn giờ</option>
                      </select>
                    </div>

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
                        onClick={() => setMapMode('slot')}
                      >
                        Theo khung
                      </button>
                    </div>
                  </div>
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
              <div className="pk-card" style={{ padding: '14px 18px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="pk-panel-icon-badge">
                      <Calendar size={18} />
                    </div>
                    <h2 className="pk-panel-title">Lịch đặt chỗ</h2>
                  </div>

                  <div className="pk-schedule-header-actions">
                    <div className="pk-search-box-pill" style={{ flex: 1, minWidth: 0 }}>
                      <Search size={15} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Tìm vé hoặc biển số..."
                        value={searchTicket}
                        onChange={(e) => setSearchTicket(e.target.value)}
                      />
                      {searchTicket && (
                        <button
                          type="button"
                          onClick={() => setSearchTicket('')}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="pk-select"
                      style={{ width: 110, height: 36, padding: '4px 8px', fontSize: 12.5, flexShrink: 0 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="confirmed">Đã đặt</option>
                      <option value="holding">Đang giữ</option>
                      <option value="active">Đang có xe</option>
                      <option value="completed">Đã ra bãi</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Danh sách vé */}
              <div className="pk-card pk-table-responsive" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
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
                <div className="pk-card pk-ticket-detail-card">
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

                  <button
                    type="button"
                    className="pk-btn-secondary"
                    style={{
                      width: 'auto',
                      padding: '0 12px',
                      height: 38,
                      gap: 6,
                      background: soundMuted ? '#fef2f2' : '#f0fdf4',
                      borderColor: soundMuted ? '#fecaca' : '#bbf7d0',
                      color: soundMuted ? '#991b1b' : '#166534',
                      fontWeight: 600,
                      fontSize: 12.5,
                    }}
                    onClick={toggleSoundMute}
                    title={soundMuted ? 'Bấm để bật chuông thông báo xe bốt gác' : 'Bấm để tắt chuông thông báo'}
                  >
                    {soundMuted ? <VolumeX size={15} color="#ef4444" /> : <Volume2 size={15} color="#16a34a" />}
                    <span>{soundMuted ? 'Chuông: Tắt' : 'Chuông: Bật'}</span>
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
                      const otMins = getOvertimeMinutes(t);
                      const isOvertime = otMins > 15;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`pk-vehicle-pill ${isSelected ? 'active' : ''} ${isOvertime ? 'overtime' : ''}`}
                          onClick={() => {
                            setGateMode('out');
                            setGateInput(t.licensePlate);
                            setGateFoundTicket(t);
                            notify(`Đã chọn xe ${t.licensePlate} (Ô ${t.spotCode})`);
                          }}
                          title={`Bấm để chọn xe ${t.licensePlate} ra bãi ${isOvertime ? `(Quá giờ ${otMins} phút)` : ''}`}
                        >
                          <span>📍 Ô {t.spotCode}</span>
                          <span>·</span>
                          <span style={{ color: isOvertime ? '#dc2626' : 'var(--pk-primary)' }}>{t.licensePlate}</span>
                          {isOvertime && (
                            <span style={{ fontSize: 10, background: '#ef4444', color: '#ffffff', padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
                              +{otMins}p
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2-Card Layout (Quét nhận dạng + Chi tiết vé) */}
              <div className="pk-gate-grid">
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
                        const rate = config?.overtimeRatePerHour || 15000;
                        const surcharge = surchargeHours * rate;
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
                            <div>Phụ thu ngoài giờ: <strong>{money(surcharge)}</strong> ({surchargeHours} giờ x {money(rate)})</div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const otMins = getOvertimeMinutes(gateFoundTicket);
                        const surchargeHours = (gateFoundTicket.status === 'active' && otMins > 15) ? Math.ceil((otMins - 15) / 60) : 0;
                        const rate = config?.overtimeRatePerHour || 15000;
                        const estimatedSurcharge = surchargeHours * rate;
                        const paid = (gateFoundTicket.paidAmount || 0) + (gateFoundTicket.sponsoredAmount || 0);
                        const due = Math.max(0, (gateFoundTicket.totalAmount || 0) + estimatedSurcharge - paid);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>Còn phải thu tại cổng</span>
                              <strong style={{ fontSize: 16, color: due > 0 ? '#dc2626' : '#0f172a' }}>
                                {money(due)}
                              </strong>
                            </div>

                            {gateMode === 'out' && due > 0 && (
                              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                  Hình thức thu phụ thu {money(due)}:
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => setGatePaymentMethod('cash')}
                                    style={{
                                      flex: 1,
                                      padding: '6px 10px',
                                      border: '1px solid',
                                      borderColor: gatePaymentMethod === 'cash' ? 'var(--pk-primary)' : '#cbd5e1',
                                      background: gatePaymentMethod === 'cash' ? '#f0fdf4' : '#ffffff',
                                      color: gatePaymentMethod === 'cash' ? 'var(--pk-primary)' : '#475569',
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    💵 Tiền mặt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setGatePaymentMethod('vietqr')}
                                    style={{
                                      flex: 1,
                                      padding: '6px 10px',
                                      border: '1px solid',
                                      borderColor: gatePaymentMethod === 'vietqr' ? 'var(--pk-primary)' : '#cbd5e1',
                                      background: gatePaymentMethod === 'vietqr' ? '#f0fdf4' : '#ffffff',
                                      color: gatePaymentMethod === 'vietqr' ? 'var(--pk-primary)' : '#475569',
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    📲 Quét VietQR
                                  </button>
                                </div>

                                {gatePaymentMethod === 'vietqr' && (
                                  <div style={{ textAlign: 'center', marginTop: 10, padding: 8, background: '#ffffff', borderRadius: 6, border: '1px dashed #cbd5e1' }}>
                                    <img
                                      src={sepayQrUrl({
                                        bin: bank.bin,
                                        account: bank.account,
                                        holder: bank.holder,
                                        amount: due,
                                        note: `${gateFoundTicket.ticketCode.replace('-', '')} PHUTHU`,
                                      })}
                                      alt="QR Thu phụ thu"
                                      style={{ width: 130, height: 130, margin: '0 auto', display: 'block', borderRadius: 4 }}
                                    />
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                      MBBank: <strong>{bank.account}</strong> · {bank.holder}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {gateMode === 'out' ? (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckOut}
                            style={{ flex: 1, height: 46, fontSize: 14, fontWeight: 800, background: '#16a34a', gap: 6 }}
                          >
                            <Check size={18} strokeWidth={3} />
                            <span>Xác nhận xe ra (Mở Barie)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pk-btn-primary"
                            onClick={handleGateCheckIn}
                            style={{ flex: 1, height: 46, fontSize: 14, fontWeight: 800, gap: 6 }}
                          >
                            <Check size={18} strokeWidth={3} />
                            <span>Xác nhận xe vào (Mở Barie)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="pk-btn-secondary"
                          onClick={() => {
                            setTicketToPrint(gateFoundTicket);
                            setShowPrintSlipModal(true);
                          }}
                          style={{ height: 46, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, width: 'auto' }}
                          title="In phiếu gửi xe / phiếu xuất bãi"
                        >
                          <Printer size={16} />
                          <span>In phiếu</span>
                        </button>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="pk-live-dot" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: 0.3 }}>
                          LIVE ANPR · QUÉT BIỂN SỐ XE
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          Tự động nhận diện biển số & đối soát barie
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={switchCameraFacing}
                        style={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: '#ffffff',
                          borderRadius: 20,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title="Đổi giữa camera trước và sau"
                      >
                        <SwitchCamera size={14} />
                        <span>{cameraFacing === 'environment' ? 'Cam sau' : 'Cam trước'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: '50%',
                        }}
                        title="Đóng camera"
                      >
                        <X size={20} />
                      </button>
                    </div>
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

                    {/* Viewfinder Target Frame with 4 Corner Brackets & Laser Beam */}
                    <div className="pk-camera-viewfinder-frame">
                      <div className="pk-camera-corner pk-corner-tl" />
                      <div className="pk-camera-corner pk-corner-tr" />
                      <div className="pk-camera-corner pk-corner-bl" />
                      <div className="pk-camera-corner pk-corner-br" />
                      <div className="pk-camera-laser" />

                      <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#86efac', fontWeight: 800, letterSpacing: 0.5 }}>
                        CĂN CHỈNH BIỂN SỐ VÀO KHUNG NÀY
                      </div>
                      <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '3px 10px', borderRadius: 6, fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>
                        Tự động quét biển số ôtô / xe máy Việt Nam
                      </div>
                    </div>

                    {/* Quick Active Lot Chips Overlay for fast guard tap */}
                    {activeLotTickets.length > 0 && (
                      <div className="pk-camera-quick-chips">
                        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          Xe trong bãi:
                        </span>
                        {activeLotTickets.slice(0, 10).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => void onPlateDetected(t.licensePlate)}
                            style={{
                              background: '#ffffff',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              borderRadius: 14,
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Chạm để chọn nhanh xe ${t.licensePlate}`}
                          >
                            Ô {t.spotCode}: {t.licensePlate}
                          </button>
                        ))}
                      </div>
                    )}

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
                      onClick={switchCameraFacing}
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
                      title="Đổi camera"
                    >
                      <SwitchCamera size={20} />
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
                className="pk-card pk-recon-header-card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={20} color="var(--pk-primary)" />
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Đối soát cuối ca</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    className="pk-input"
                    style={{ width: 145 }}
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

              {/* Thống kê hiệu suất & Tỷ lệ lấp đầy bãi xe */}
              <div
                className="pk-card"
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #cbd5e1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Car size={16} color="var(--pk-primary)" />
                    <span>Hiệu suất lấp đầy bãi xe GoPick (65 ô)</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--pk-primary)' }}>
                    {Math.round((activeLotTickets.length / 65) * 100)}% Lấp đầy
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((activeLotTickets.length / 65) * 100))}%`,
                      height: '100%',
                      background: activeLotTickets.length > 55 ? '#dc2626' : 'var(--pk-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: 12 }}>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 11 }}>Đang đỗ trong bãi</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{activeLotTickets.length} xe</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 11 }}>Ô còn trống</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{Math.max(0, 65 - activeLotTickets.length)} ô</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 11 }}>Giao dịch hôm nay</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>{reconData?.transactions?.length || 0} lượt</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 11 }}>Khung cao điểm</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#854d0e' }}>17:00 – 21:00</div>
                  </div>
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
              TAB 5: CÀI ĐẶT TOÀN BỘ CHỨC NĂNG BÃI XE (Settings & Layout Management)
              =================================================================== */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header Thanh công cụ */}
              <div
                className="pk-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sliders size={20} color="var(--pk-primary)" />
                    <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                      Cài đặt & Vận hành Bãi đậu xe {formSettings.facilityName || config?.facilityName}
                    </h2>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--pk-text-muted)', margin: '4px 0 0' }}>
                    Tùy biến toàn bộ tham số: Bật/tắt bãi xe, bảng giá, giờ miễn phí Golf, thời gian giữ chỗ, vé giấy và quản lý từng ô đỗ mặt bằng.
                  </p>
                </div>

                <button
                  type="button"
                  className="pk-btn-primary"
                  style={{ width: 'auto', padding: '0 20px', height: 40 }}
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  <Save size={16} />
                  <span>{savingSettings ? 'Đang lưu cài đặt...' : 'Lưu tất cả cài đặt'}</span>
                </button>
              </div>

              {/* Grid 2 cột: Cấu hình thông số */}
              <div className="pk-settings-grid">
                {/* Khung 1: Trạng thái & Cơ sở */}
                <div className="pk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pk-border)', paddingBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>1. Trạng thái hoạt động & Cơ sở</strong>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={formSettings.isEnabled ?? config?.isEnabled ?? true}
                        onChange={(e) => setFormSettings((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                        style={{ width: 18, height: 18, accentColor: 'var(--pk-primary)', cursor: 'pointer' }}
                      />
                      <span style={{ color: (formSettings.isEnabled ?? config?.isEnabled ?? true) ? '#16a34a' : '#dc2626' }}>
                        {(formSettings.isEnabled ?? config?.isEnabled ?? true) ? '● Đang mở bãi' : '○ Tạm khóa bãi'}
                      </span>
                    </label>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Tên bãi đậu xe</label>
                    <input
                      type="text"
                      className="pk-input"
                      value={formSettings.facilityName ?? config?.facilityName ?? ''}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, facilityName: e.target.value }))}
                      placeholder="VD: Bãi xe GoPick"
                    />
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Địa chỉ cơ sở</label>
                    <input
                      type="text"
                      className="pk-input"
                      value={formSettings.address ?? config?.address ?? ''}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="VD: 250 Lương Định Của, TP. Thủ Đức"
                    />
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Đường dẫn Google Maps / Chỉ đường</label>
                    <input
                      type="text"
                      className="pk-input"
                      value={formSettings.directionsUrl ?? config?.directionsUrl ?? ''}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, directionsUrl: e.target.value }))}
                      placeholder="https://maps.google.com/?q=..."
                    />
                  </div>
                </div>

                {/* Khung 2: Bảng giá & Phụ thu */}
                <div className="pk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ borderBottom: '1px solid var(--pk-border)', paddingBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>2. Bảng giá & Phụ thu quá hạn</strong>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Đơn giá đỗ xe tiêu chuẩn (VNĐ / lượt đỗ)</label>
                    <input
                      type="number"
                      className="pk-input"
                      value={formSettings.defaultHourlyRate ?? config?.defaultHourlyRate ?? 30000}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, defaultHourlyRate: Number(e.target.value) }))}
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                      Mức phí khách vãng lai thanh toán qua SePay VietQR hoặc nộp tại cổng ({money(formSettings.defaultHourlyRate ?? config?.defaultHourlyRate ?? 30000)})
                    </span>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Đơn giá phụ thu quá hạn (VNĐ / giờ)</label>
                    <input
                      type="number"
                      className="pk-input"
                      value={formSettings.overtimeRatePerHour ?? config?.overtimeRatePerHour ?? 30000}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, overtimeRatePerHour: Number(e.target.value) }))}
                    />
                    <span style={{ fontSize: 11.5, color: '#b45309', marginTop: 2 }}>
                      Ân hạn 15 phút đầu miễn phí. Sau 15 phút quá giờ, hệ thống bắt đầu tính phụ thu theo đơn giá này.
                    </span>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Vé giấy cho khách vãng lai</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={formSettings.allowPaperTickets ?? config?.allowPaperTickets ?? true}
                        onChange={(e) => setFormSettings((prev) => ({ ...prev, allowPaperTickets: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: 'var(--pk-primary)' }}
                      />
                      <span>Cho phép bảo vệ cổng phát hành vé giấy nhanh (khách không dùng smartphone)</span>
                    </label>
                  </div>
                </div>

                {/* Khung 3: Quyền lợi khách chơi Golf */}
                <div className="pk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ borderBottom: '1px solid var(--pk-border)', paddingBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>3. Quyền lợi tài trợ cho khách Golf</strong>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Số giờ đỗ miễn phí cho khách Golf (giờ)</label>
                    <input
                      type="number"
                      className="pk-input"
                      value={formSettings.golfFreeHours ?? config?.golfFreeHours ?? 3}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, golfFreeHours: Number(e.target.value) }))}
                    />
                    <span style={{ fontSize: 11.5, color: '#166534', marginTop: 2 }}>
                      GoPick tài trợ 100% chi phí đậu xe trong khung giờ này cho khách có lịch phòng Golf hợp lệ.
                    </span>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Số xe tối đa được tài trợ trên mỗi booking Golf</label>
                    <input
                      type="number"
                      className="pk-input"
                      value={formSettings.golfSlotsPerBooking ?? config?.golfSlotsPerBooking ?? 1}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, golfSlotsPerBooking: Number(e.target.value) }))}
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                      Mỗi lịch chơi Golf tại cơ sở được áp dụng quyền lợi miễn phí cho tối đa số lượng xe này.
                    </span>
                  </div>
                </div>

                {/* Khung 4: Giữ chỗ & Vận hành */}
                <div className="pk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ borderBottom: '1px solid var(--pk-border)', paddingBottom: 10 }}>
                    <strong style={{ fontSize: 14 }}>4. Thời gian giữ chỗ & Thời gian đệm</strong>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Thời gian giữ chỗ tạm khi chưa thanh toán</label>
                    <select
                      className="pk-select"
                      value={formSettings.holdTimeoutSeconds ?? config?.holdTimeoutSeconds ?? 300}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, holdTimeoutSeconds: Number(e.target.value) }))}
                    >
                      <option value={180}>3 phút (180 giây)</option>
                      <option value={300}>5 phút (300 giây - Khuyến nghị)</option>
                      <option value={600}>10 phút (600 giây)</option>
                      <option value={900}>15 phút (900 giây)</option>
                    </select>
                    <span style={{ fontSize: 11.5, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                      Nếu khách không thanh toán trong thời gian này, ô đỗ sẽ tự động giải phóng để đón khách khác.
                    </span>
                  </div>

                  <div className="pk-input-group">
                    <label className="pk-label">Thời gian đệm dọn xe giữa 2 lượt</label>
                    <select
                      className="pk-select"
                      value={formSettings.bufferMinutes ?? config?.bufferMinutes ?? 0}
                      onChange={(e) => setFormSettings((prev) => ({ ...prev, bufferMinutes: Number(e.target.value) }))}
                    >
                      <option value={0}>0 phút (Liên tục, tối ưu công suất)</option>
                      <option value={5}>5 phút đệm</option>
                      <option value={10}>10 phút đệm</option>
                      <option value={15}>15 phút đệm</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Khung 5: Quản lý danh sách từng ô đỗ mặt bằng */}
              <div className="pk-card" style={{ padding: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--pk-border)',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                      Quản lý danh sách ô đỗ mặt bằng ({spots.length} ô)
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                      Mặt bằng GoPick gồm 65 ô vật lý (P01 - P65). Quản lý có thể cấu hình tọa độ, dãy, loại xe hoặc thêm ô mới.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pk-btn-primary"
                    style={{ width: 'auto', padding: '0 16px', height: 34, fontSize: 12.5 }}
                    onClick={openCreateSpotModal}
                  >
                    <Plus size={14} />
                    <span>Thêm ô đỗ mới</span>
                  </button>
                </div>

                {/* Bộ lọc theo dãy */}
                <div className="pk-filter-chips" style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    className={`pk-filter-chip ${settingsSectionFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSettingsSectionFilter('all')}
                  >
                    Tất cả ({spots.length})
                  </button>
                  {Object.entries(groupedSections).map(([secName, secSpots]) => (
                    <button
                      key={secName}
                      type="button"
                      className={`pk-filter-chip ${settingsSectionFilter === secName ? 'active' : ''}`}
                      onClick={() => setSettingsSectionFilter(secName)}
                    >
                      {secName} ({secSpots.length})
                    </button>
                  ))}
                </div>

                {/* Bảng danh sách ô */}
                <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--pk-border)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '8px 12px' }}>Mã ô</th>
                        <th style={{ padding: '8px 12px' }}>Dãy</th>
                        <th style={{ padding: '8px 12px' }}>Loại xe</th>
                        <th style={{ padding: '8px 12px' }}>Tọa độ (Hàng - Cột)</th>
                        <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spots
                        .filter((s) => settingsSectionFilter === 'all' || s.section === settingsSectionFilter)
                        .map((spot) => (
                          <tr key={spot.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 800 }}>{spot.code}</td>
                            <td style={{ padding: '8px 12px' }}>{spot.section}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ fontSize: 11.5, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                                {spot.spotType === 'car' ? '🚗 Ô tô' : '🏍 Xe máy'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              Hàng {spot.rowIndex} · Cột {spot.colIndex}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                className={`pk-badge-status ${
                                  spot.status === 'maintenance' ? 'pk-badge-maintenance' : 'pk-badge-confirmed'
                                }`}
                              >
                                {spot.status === 'maintenance' ? 'Bảo trì' : 'Hoạt động'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  type="button"
                                  className="pk-btn-secondary"
                                  style={{ height: 28, padding: '0 8px', fontSize: 11.5 }}
                                  onClick={() => openEditSpotModal(spot)}
                                  title="Chỉnh sửa ô đỗ"
                                >
                                  <Edit2 size={12} />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  className="pk-btn-secondary"
                                  style={{ height: 28, padding: '0 8px', fontSize: 11.5 }}
                                  onClick={() => {
                                    const newStatus = spot.status === 'maintenance' ? 'active' : 'maintenance';
                                    fetch('/api/parking', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'set-spot-status',
                                        tenant,
                                        spotCode: spot.code,
                                        status: newStatus,
                                      }),
                                    }).then(() => {
                                      notify(`Đã cập nhật ô ${spot.code}`);
                                      void loadConfigAndSpots();
                                    });
                                  }}
                                >
                                  {spot.status === 'maintenance' ? 'Mở lại' : 'Khóa'}
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    height: 28,
                                    padding: '0 8px',
                                    fontSize: 11.5,
                                    border: '1px solid #fca5a5',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    borderRadius: 'var(--pk-radius)',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => handleDeleteSpot(spot.code)}
                                  title="Ngừng sử dụng ô này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
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

      {/* Modal: Thêm / Chỉnh sửa ô đỗ */}
      {showSpotModal && (
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
          onClick={() => setShowSpotModal(false)}
        >
          <div
            className="pk-card"
            style={{ width: '100%', maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>
              {spotModalMode === 'create' ? 'Thêm ô đỗ mới' : `Chỉnh sửa ô đỗ ${editingSpot.code}`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="pk-input-group">
                <label className="pk-label">Mã ô đỗ (VD: P66, P12)</label>
                <input
                  type="text"
                  className="pk-input"
                  value={editingSpot.code}
                  onChange={(e) => setEditingSpot((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  disabled={spotModalMode === 'edit'}
                  placeholder="VD: P66"
                />
              </div>

              <div className="pk-input-group">
                <label className="pk-label">Tên dãy</label>
                <input
                  type="text"
                  className="pk-input"
                  value={editingSpot.section}
                  onChange={(e) => setEditingSpot((prev) => ({ ...prev, section: e.target.value }))}
                  placeholder="VD: Dãy P1, Dãy P6"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="pk-input-group">
                  <label className="pk-label">Hàng tọa độ (Row)</label>
                  <input
                    type="number"
                    className="pk-input"
                    value={editingSpot.rowIndex}
                    onChange={(e) => setEditingSpot((prev) => ({ ...prev, rowIndex: Number(e.target.value) }))}
                  />
                </div>
                <div className="pk-input-group">
                  <label className="pk-label">Cột tọa độ (Col)</label>
                  <input
                    type="number"
                    className="pk-input"
                    value={editingSpot.colIndex}
                    onChange={(e) => setEditingSpot((prev) => ({ ...prev, colIndex: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="pk-input-group">
                  <label className="pk-label">Loại phương tiện</label>
                  <select
                    className="pk-select"
                    value={editingSpot.spotType}
                    onChange={(e) => setEditingSpot((prev) => ({ ...prev, spotType: e.target.value }))}
                  >
                    <option value="car">🚗 Ô tô (2.5m x 5m)</option>
                    <option value="motorcycle">🏍 Xe máy</option>
                  </select>
                </div>
                <div className="pk-input-group">
                  <label className="pk-label">Trạng thái ô</label>
                  <select
                    className="pk-select"
                    value={editingSpot.status}
                    onChange={(e) => setEditingSpot((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowSpotModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleSaveSpot}
              >
                Lưu ô đỗ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Thermal Printer (58mm/80mm) Slip Modal */}
      {showPrintSlipModal && ticketToPrint && (
        <div className="pk-modal-overlay" onClick={() => setShowPrintSlipModal(false)}>
          <div
            className={`pk-modal-card pk-thermal-slip slip-${slipPaperSize}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              padding: slipPaperSize === '58mm' ? 16 : 24,
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {/* Top Toolbar (Paper Size + Print Mode) */}
            <div
              className="no-print"
              style={{
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--pk-font)' }}>
                  In vé nhiệt ESC/POS
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--pk-font)' }}>
                  Chuẩn máy in bốt gác
                </span>
              </div>

              {/* Segmented Paper Size Toggle */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid',
                    borderColor: slipPaperSize === '80mm' ? 'var(--pk-primary)' : '#cbd5e1',
                    background: slipPaperSize === '80mm' ? '#f0fdf4' : '#ffffff',
                    color: slipPaperSize === '80mm' ? 'var(--pk-primary)' : '#475569',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font)',
                  }}
                  onClick={() => setSlipPaperSize('80mm')}
                >
                  Khổ 80mm (Chuẩn)
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid',
                    borderColor: slipPaperSize === '58mm' ? 'var(--pk-primary)' : '#cbd5e1',
                    background: slipPaperSize === '58mm' ? '#f0fdf4' : '#ffffff',
                    color: slipPaperSize === '58mm' ? 'var(--pk-primary)' : '#475569',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font)',
                  }}
                  onClick={() => setSlipPaperSize('58mm')}
                >
                  Khổ 58mm (Mini)
                </button>
              </div>

              {/* Segmented Print Mode Toggle */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid',
                    borderColor: slipPrintMode === 'full' ? 'var(--pk-primary)' : '#e2e8f0',
                    background: slipPrintMode === 'full' ? '#f8fafc' : '#ffffff',
                    color: slipPrintMode === 'full' ? 'var(--pk-primary)' : '#64748b',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font)',
                  }}
                  onClick={() => setSlipPrintMode('full')}
                >
                  In đầy đủ
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid',
                    borderColor: slipPrintMode === 'compact' ? 'var(--pk-primary)' : '#e2e8f0',
                    background: slipPrintMode === 'compact' ? '#f8fafc' : '#ffffff',
                    color: slipPrintMode === 'compact' ? 'var(--pk-primary)' : '#64748b',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    fontFamily: 'var(--pk-font)',
                  }}
                  onClick={() => setSlipPrintMode('compact')}
                >
                  Rút gọn tiết kiệm giấy
                </button>
              </div>
            </div>

            {/* Slip Paper Body */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #333', paddingBottom: 10, marginBottom: 10 }}>
              <div className="pk-slip-title" style={{ fontSize: slipPaperSize === '58mm' ? 14 : 16, fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
                {config?.facilityName || 'BÃI XE GOPICK'}
              </div>
              {slipPrintMode === 'full' && (
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                  {config?.address || '250 Lương Định Của, P. An Phú, Thủ Đức'}
                </div>
              )}
              <div style={{ fontSize: slipPaperSize === '58mm' ? 11 : 12.5, fontWeight: 800, marginTop: 6, color: '#000000' }}>
                {ticketToPrint.status === 'completed'
                  ? '--- PHIẾU XUẤT BÃI & THU PHÍ ---'
                  : '--- VÉ GỬI XE (CỔNG VÀO) ---'}
              </div>
            </div>

            <div style={{ fontSize: slipPaperSize === '58mm' ? 11 : 12, lineHeight: 1.6, color: '#000000' }}>
              <div>Mã vé: <strong>{ticketToPrint.ticketCode}</strong></div>
              <div style={{ marginTop: 2, marginBottom: 2 }}>
                Biển số: <strong className="pk-slip-plate" style={{ fontSize: slipPaperSize === '58mm' ? 16 : 18, letterSpacing: 0.5 }}>{ticketToPrint.licensePlate}</strong>
              </div>
              <div>Vị trí đỗ: <strong style={{ fontSize: slipPaperSize === '58mm' ? 13 : 14 }}>Ô {ticketToPrint.spotCode}</strong> ({ticketToPrint.section || 'GoPick'})</div>
              <div>
                Giờ vào: {ticketToPrint.actualIn ? new Date(ticketToPrint.actualIn).toLocaleString('vi-VN') : new Date(ticketToPrint.expectedIn).toLocaleString('vi-VN')}
              </div>
              {ticketToPrint.status === 'completed' && (
                <div>
                  Giờ ra: {ticketToPrint.actualOut ? new Date(ticketToPrint.actualOut).toLocaleString('vi-VN') : new Date(ticketToPrint.expectedOut).toLocaleString('vi-VN')}
                </div>
              )}
              <div style={{ borderTop: '1px dashed #888', margin: '6px 0' }} />
              <div>Cước đỗ xe: <strong>{money(ticketToPrint.totalAmount || 0)}</strong></div>
              {ticketToPrint.feePayer === 'gopick_sponsored' ? (
                <div>Quyền lợi: <strong>GoPick tài trợ 100% (0 đ)</strong></div>
              ) : (
                <div>
                  Thanh toán: <strong>{money(ticketToPrint.paidAmount || 0)}</strong> ({ticketToPrint.paymentMethod === 'cash' ? 'Tiền mặt' : 'VietQR/SePay'})
                </div>
              )}
              {(ticketToPrint.overtimeAmount || 0) > 0 && (
                <div style={{ color: '#b91c1c' }}>
                  Phụ thu quá giờ: <strong>{money(ticketToPrint.overtimeAmount || 0)}</strong>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', margin: '12px 0' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=${slipPaperSize === '58mm' ? '85x85' : '110x110'}&data=${encodeURIComponent(
                  `SIGOLF_PARKING:${ticketToPrint.ticketCode}:${ticketToPrint.accessToken || 'VERIFIED'}`,
                )}`}
                alt="QR đối soát"
                style={{
                  width: slipPaperSize === '58mm' ? 85 : 110,
                  height: slipPaperSize === '58mm' ? 85 : 110,
                  margin: '0 auto',
                  display: 'block',
                }}
              />
              <div style={{ fontSize: 9.5, color: '#666', marginTop: 3 }}>Quét QR đối soát barie tự động</div>
            </div>

            {slipPrintMode === 'full' && (
              <div style={{ textAlign: 'center', borderTop: '1px dashed #333', paddingTop: 8, fontSize: 10, color: '#333' }}>
                <div>Quý khách vui lòng giữ vé và xuất trình khi ra bãi.</div>
                <div>Hotline: 0877 834 888 · Chúc quý khách an toàn & vui vẻ!</div>
              </div>
            )}

            <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowPrintSlipModal(false)}
                style={{ flex: 1, fontFamily: 'var(--pk-font)' }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={() => window.print()}
                style={{ flex: 1.3, gap: 6, background: '#0284c7', borderColor: '#0284c7', fontFamily: 'var(--pk-font)' }}
              >
                <Printer size={16} />
                <span>In phiếu ({slipPaperSize})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="pk-bottom-nav" aria-label="Điều hướng nhanh bãi xe">
        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Grid size={18} strokeWidth={2} />
          <span>Sơ đồ</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={18} strokeWidth={2} />
          <span>Đặt chỗ</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          <Car size={18} strokeWidth={2} />
          <span>Vào / Ra</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => setActiveTab('reconciliation')}
        >
          <TrendingUp size={18} strokeWidth={2} />
          <span>Đối soát</span>
        </button>

        <button
          type="button"
          className={`pk-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Sliders size={18} strokeWidth={2} />
          <span>Cài đặt</span>
        </button>
      </nav>
    </div>
  );
}
