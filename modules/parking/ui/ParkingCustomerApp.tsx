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
  ArrowLeft,
  Home,
  Phone,
  Search,
  Maximize2,
  X,
  FileText,
  Copy,
  Zap,
  Bell,
  Camera,
  Download,
  MessageCircle,
  PlusCircle,
} from 'lucide-react';
import { money } from '../../../lib/club';
import { sepayQrUrl, vietQrUrl } from '../../../lib/bank';
import type { ParkingSpot, ParkingTicket, ParkingSettings } from '../core/types';
import { getQrDataUrl, downloadTicketPassImage } from '../core/ticket-pass';
import { PwaInstallProvider } from '../../../app/ui/PwaInstallPrompt';
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

type Lang = 'vi' | 'en' | 'ko';

const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    brand: 'SIGOLF',
    facilityName: 'Bãi xe GoPick',
    backToSigolf: 'Về SiGolf',
    navBooking: 'Đặt chỗ',
    navMyTickets: 'Vé của tôi',
    navInfo: 'Thông tin bãi',
    step1: 'Thời gian',
    step2: 'Ô đỗ',
    step3: 'Thanh toán',
    step4: 'Vé',
    pageTitle1: 'Đặt chỗ đậu xe',
    pageSub1: 'Chọn khoảng thời gian dự kiến để tra cứu ô đỗ xe trống tại GoPick.',
    parkingLot: 'Bãi đậu xe',
    parkingDate: 'Ngày đậu xe',
    timeIn: 'Giờ vào',
    timeOut: 'Giờ ra',
    linkGolf: 'Liên kết lịch Golf',
    checkFreeHours: 'Kiểm tra quyền miễn phí (3 giờ tài trợ) >',
    golfLinked: '✓ Đã liên kết lịch Golf',
    findSpots: 'Tìm chỗ trống',
    searching: 'Đang tìm kiếm...',
    chooseSpotTitle: 'Chọn ô đỗ',
    viewMap: 'Xem sơ đồ',
    viewList: 'Xem danh sách',
    allSpots: 'Tất cả',
    emptySpots: 'ô trống',
    spotCode: 'Ô',
    row: 'Dãy',
    duration: 'Thời lượng',
    totalFee: 'Tổng phí',
    plateNumber: 'Biển số xe',
    platePlaceholder: 'Nhập biển số xe (VD: 51K-123.45)',
    holdAndContinue: 'Giữ chỗ và tiếp tục',
    holdingTime: 'Giữ ô trong',
    paymentTitle: 'Thanh toán',
    bookingInfo: 'Thông tin đặt chỗ',
    payMethod: 'Phương thức thanh toán',
    qrPayment: 'Thanh toán QR (VietQR / Chuyển khoản)',
    totalPay: 'Tổng thanh toán',
    confirmBooking: 'Xác nhận đặt chỗ',
    confirmPaid: 'Xác nhận đã chuyển',
    checkingTx: 'Đang kiểm tra giao dịch...',
    ticketConfirmed: 'Đã xác nhận',
    ticketStubTitle: 'Bãi xe GoPick — 250 Lương Định Của',
    qrScanNotice: 'Đưa mã QR cho bảo vệ khi vào/ra cổng',
    directions: 'Chỉ đường đến bãi xe',
    openQrForGuard: 'Mở mã QR cho bảo vệ',
    activeTicketHeader: 'Vé xe đang sử dụng',
    recentTickets: 'Lịch sử vé đậu xe',
    noActiveTicket: 'Hiện bạn chưa có vé nào đang hoạt động',
    bookNow: 'Đặt chỗ đậu xe ngay',
    facilityAddressTitle: 'Địa chỉ bãi xe',
    addressVal: '250 Lương Định Của, Phường An Phú, TP. Thủ Đức, TP.HCM',
    hotlineTitle: 'Hotline trực ban bãi xe',
    priceTitle: 'Bảng giá dịch vụ',
    priceStandard: 'Tiêu chuẩn: 30.000 đ / lượt (hoặc 30.000 đ/giờ)',
    priceGolf: 'Khách Golf: Miễn phí 3 giờ đầu tiên khi có lịch chơi',
    priceOvertime: 'Quá giờ: 30.000 đ / giờ (miễn phí 15 phút đầu)',
    regulationsTitle: 'Nội quy & Hướng dẫn',
    reg1: 'Xe di chuyển tốc độ tối đa 5km/h trong bãi.',
    reg2: 'Đỗ xe đúng vạch và đúng số ô đã đặt trên vé.',
    reg3: 'Xuất trình vé QR tại chốt kiểm soát khi vào và ra.',
    holdingExpired: 'Hết hạn giữ chỗ',
    holdingExpiredMsg: 'Thời gian giữ ô 5 phút đã kết thúc. Vui lòng chọn lại ô đỗ để tiếp tục.',
    sponsorBadge: 'GoPick tài trợ · Khách trả 0 đ',
    searchTicketPlaceholder: 'Nhập mã vé hoặc biển số để tìm...',
    searchBtn: 'Tìm',
  },
  en: {
    brand: 'SIGOLF',
    facilityName: 'GoPick Parking',
    backToSigolf: 'Back to SiGolf',
    navBooking: 'Book Spot',
    navMyTickets: 'My Tickets',
    navInfo: 'Parking Info',
    step1: 'Time',
    step2: 'Spot',
    step3: 'Payment',
    step4: 'Ticket',
    pageTitle1: 'Reserve Parking Spot',
    pageSub1: 'Select dates and times to find available spots at GoPick.',
    parkingLot: 'Parking Lot',
    parkingDate: 'Parking Date',
    timeIn: 'Arrival Time',
    timeOut: 'Departure Time',
    linkGolf: 'Link Golf Booking',
    checkFreeHours: 'Check free parking benefit (3 hrs sponsored) >',
    golfLinked: '✓ Golf Booking Linked',
    findSpots: 'Find Available Spots',
    searching: 'Searching...',
    chooseSpotTitle: 'Choose Spot',
    viewMap: 'View Map',
    viewList: 'View List',
    allSpots: 'All',
    emptySpots: 'available',
    spotCode: 'Spot',
    row: 'Row',
    duration: 'Duration',
    totalFee: 'Total Fee',
    plateNumber: 'License Plate',
    platePlaceholder: 'Enter license plate (e.g. 51K-123.45)',
    holdAndContinue: 'Hold Spot & Continue',
    holdingTime: 'Held for',
    paymentTitle: 'Payment',
    bookingInfo: 'Reservation Details',
    payMethod: 'Payment Method',
    qrPayment: 'VietQR / Bank Transfer',
    totalPay: 'Total Payment',
    confirmBooking: 'Confirm Reservation',
    confirmPaid: 'Confirm Transfer',
    checkingTx: 'Verifying payment...',
    ticketConfirmed: 'Booking Confirmed',
    ticketStubTitle: 'GoPick Parking — 250 Luong Dinh Cua',
    qrScanNotice: 'Present QR Code to Guard at Gate',
    directions: 'Get Directions (Google Maps)',
    openQrForGuard: 'Show QR Code to Guard',
    activeTicketHeader: 'Active Parking Ticket',
    recentTickets: 'Ticket History',
    noActiveTicket: 'You have no active parking tickets',
    bookNow: 'Book a Spot Now',
    facilityAddressTitle: 'Facility Address',
    addressVal: '250 Luong Dinh Cua, An Phu Ward, Thu Duc City, HCMC',
    hotlineTitle: 'Security Guard Hotline',
    priceTitle: 'Pricing & Policy',
    priceStandard: 'Standard: 30,000 VND / slot (or 30,000 VND/hr)',
    priceGolf: 'Golf Players: 3 hours FREE with active golf booking',
    priceOvertime: 'Overtime: 30,000 VND / hour (first 15 mins free)',
    regulationsTitle: 'Regulations & Guidelines',
    reg1: 'Maximum speed limit is 5 km/h inside the lot.',
    reg2: 'Park strictly within marked lines of assigned spot.',
    reg3: 'Show QR code to security guard upon entry & exit.',
    holdingExpired: 'Hold Expired',
    holdingExpiredMsg: 'Your 5-minute hold time has expired. Please select a spot again.',
    sponsorBadge: 'GoPick Sponsored · Pay 0 VND',
    searchTicketPlaceholder: 'Search by ticket code or plate...',
    searchBtn: 'Search',
  },
  ko: {
    brand: 'SIGOLF',
    facilityName: 'GoPick 주차장',
    backToSigolf: 'SiGolf 메인',
    navBooking: '주차 예약',
    navMyTickets: '내 주차권',
    navInfo: '주차장 안내',
    step1: '시간 선택',
    step2: '자리 선택',
    step3: '결제',
    step4: '주차권',
    pageTitle1: '주차 자리 예약',
    pageSub1: '이용 예정 시간을 선택하여 실시간 빈자리를 확인하세요.',
    parkingLot: '주차장',
    parkingDate: '주차 일자',
    timeIn: '입차 시간',
    timeOut: '출차 시간',
    linkGolf: '골프 예약 연동',
    checkFreeHours: '무료 주차 혜택 확인 (3시간 무료 지원) >',
    golfLinked: '✓ 골프 예약 연동 완료',
    findSpots: '빈자리 찾기',
    searching: '검색 중...',
    chooseSpotTitle: '주차 자리 선택',
    viewMap: '도면 보기',
    viewList: '목록 보기',
    allSpots: '전체',
    emptySpots: '빈자리',
    spotCode: '자리',
    row: '구역',
    duration: '이용 시간',
    totalFee: '총 요금',
    plateNumber: '차량 번호',
    platePlaceholder: '차량 번호 입력 (예: 51K-123.45)',
    holdAndContinue: '자리 선점 후 계속',
    holdingTime: '선점 잔여 시간',
    paymentTitle: '결제하기',
    bookingInfo: '예약 정보',
    payMethod: '결제 방식',
    qrPayment: 'QR 계좌이체 (VietQR / 은행이체)',
    totalPay: '최종 결제 금액',
    confirmBooking: '예약 확정하기',
    confirmPaid: '이체 완료 확인',
    checkingTx: '거래 확인 중...',
    ticketConfirmed: '예약이 확정되었습니다',
    ticketStubTitle: 'GoPick 주차장 — 250 Luong Dinh Cua',
    qrScanNotice: '입출차 시 주차 관리원에게 QR 코드를 보여주세요',
    directions: '주차장 길찾기 (구글 지도)',
    openQrForGuard: '관리원용 QR 전체화면',
    activeTicketHeader: '현재 이용 중인 주차권',
    recentTickets: '이전 주차권 내역',
    noActiveTicket: '현재 이용 중인 주차권이 없습니다',
    bookNow: '지금 예약하기',
    facilityAddressTitle: '주차장 위치',
    addressVal: '250 Luong Dinh Cua, An Phu, Thu Duc, TP.HCM',
    hotlineTitle: '주차장 직통 문의',
    priceTitle: '요금 안내',
    priceStandard: '일반 요금: 30,000 VND / 회 (또는 30,000 VND/시간)',
    priceGolf: '골프 회원: 골프 예약 시 첫 3시간 무료 지원',
    priceOvertime: '초과 요금: 시간당 30,000 VND (15분 이내 무료)',
    regulationsTitle: '주차 규정 안내',
    reg1: '주차장 내 제한 속도는 시속 5km 이하입니다.',
    reg2: '예약된 지정 구획선 안에 정확히 주차해주세요.',
    reg3: '입차 및 출차 시 QR 코드를 관리원에게 제시하세요.',
    holdingExpired: '선점 시간 만료',
    holdingExpiredMsg: '5분 선점 시간이 만료되었습니다. 자리를 다시 선택해주세요.',
    sponsorBadge: 'GoPick 전액 지원 · 결제 0 VND',
    searchTicketPlaceholder: '주차권 번호 또는 차량 번호 검색...',
    searchBtn: '조회',
  },
};

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
  // Navigation Tabs: 'booking' | 'my-tickets' | 'info'
  const [activeNav, setActiveNav] = useState<'booking' | 'my-tickets' | 'info'>('booking');

  // Language state
  const [lang, setLang] = useState<Lang>('vi');
  const t = useMemo(() => DICT[lang] || DICT.vi, [lang]);

  // Load language from storage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('sigolf_parking_lang') as Lang;
      if (savedLang && DICT[savedLang]) {
        setLang(savedLang);
      }
    } catch {}
  }, []);

  const changeLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('sigolf_parking_lang', l);
    } catch {}
  };

  // 4 Steps in Booking Flow: 1: Thời gian, 2: Chọn ô đỗ, 3: Thanh toán, 4: Nhận vé
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Facility & Settings
  const [tenant, setTenant] = useState<string>(initialTenant);
  const [config, setConfig] = useState<ParkingSettings | null>(null);

  // Step 1 Form States
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dateStr, setDateStr] = useState<string>(() => {
    if (initialStart) return new Date(initialStart).toISOString().slice(0, 10);
    return todayStr;
  });

  const [timeIn, setTimeIn] = useState<string>(() => {
    if (initialStart) {
      const d = new Date(initialStart - 15 * 60 * 1000);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '17:45';
  });

  const [timeOut, setTimeOut] = useState<string>(() => {
    if (initialEnd) {
      const d = new Date(initialEnd + 15 * 60 * 1000);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '20:15';
  });

  // Contact info (empty by default for walk-in; entered at step 2 when selecting a spot)
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
  const [bank, setBank] = useState<{ bin: string; account: string; holder: string; bankName: string }>({
    bin: '970422',
    account: '0877834888',
    holder: 'SAIGON INDOOR GOLF',
    bankName: 'MBBank (Quân Đội)',
  });
  const [copiedField, setCopiedField] = useState<'account' | 'amount' | 'content' | null>(null);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<ParkingTicket[]>([]);
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [fullScreenQrTicket, setFullScreenQrTicket] = useState<ParkingTicket | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string>('');

  // Stay extension states
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [extendHours, setExtendHours] = useState<number>(1);
  const [extending, setExtending] = useState<boolean>(false);
  const [extendError, setExtendError] = useState<string>('');
  const [extendSuccess, setExtendSuccess] = useState<string>('');
  const [downloadingTicket, setDownloadingTicket] = useState<boolean>(false);

  async function handleDownloadTicket(tItem: ParkingTicket) {
    try {
      setDownloadingTicket(true);
      await downloadTicketPassImage(tItem);
    } catch (e: any) {
      alert('Không thể tạo file ảnh vé: ' + (e?.message || ''));
    } finally {
      setDownloadingTicket(false);
    }
  }

  async function handleExtendStaySubmit() {
    if (!ticket) return;
    try {
      setExtending(true);
      setExtendError('');
      setExtendSuccess('');

      const isSpon = ticket.feePayer === 'gopick_sponsored' || ticket.sponsoredAmount >= ticket.totalAmount;
      const res = await fetch('/api/parking?action=extend-stay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: ticket.ticketCode,
          accessToken: ticket.accessToken,
          extraMinutes: extendHours * 60,
          paymentMethod: isSpon ? 'gopick_sponsored' : 'vietqr',
        }),
      });

      const data: any = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Không thể gia hạn đỗ xe lúc này');
      }

      setTicket(data.ticket);
      setExtendSuccess(
        `Gia hạn thành công thêm ${extendHours} giờ! Giờ ra mới: ${new Date(data.ticket.expectedOut).toTimeString().slice(0, 5)}`
      );
      setTimeout(() => {
        setShowExtendModal(false);
        setExtendSuccess('');
      }, 2000);
    } catch (err: any) {
      setExtendError(err.message || 'Lỗi khi gia hạn vé');
    } finally {
      setExtending(false);
    }
  }

  // Handle notification reminder for expiring ticket
  async function handleEnableReminder(tItem: ParkingTicket) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setReminderNotice('Trình duyệt của bạn không hỗ trợ tính năng thông báo.');
      setTimeout(() => setReminderNotice(''), 4000);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setReminderNotice('✓ Đã bật nhắc nhở! Hệ thống sẽ thông báo trước giờ ra 15 phút.');
        const expOut = new Date(tItem.expectedOut).getTime();
        const remindTime = expOut - 15 * 60 * 1000;
        const msUntil = remindTime - Date.now();
        if (msUntil > 0) {
          setTimeout(() => {
            try {
              new Notification('SiGolf · Bãi xe GoPick', {
                body: `Sắp hết giờ đỗ xe! Xe ${tItem.licensePlate} tại ô ${tItem.spotCode} còn 15 phút (hết hạn lúc ${new Date(tItem.expectedOut).toTimeString().slice(0, 5)}).`,
                icon: '/favicon.ico',
              });
            } catch {}
          }, msUntil);
        }
      } else {
        setReminderNotice('Chưa cấp quyền thông báo trên trình duyệt.');
      }
    } catch {
      setReminderNotice('Không thể kích hoạt thông báo.');
    }
    setTimeout(() => setReminderNotice(''), 4000);
  }

  // Ref for plate input auto-scroll
  const plateInputRef = useRef<HTMLInputElement>(null);

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
    if (diffMs <= 0) return '0h';
    const totalMinutes = Math.round(diffMs / 60000);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }, [expectedInMs, expectedOutMs]);

  // Load config on mount
  useEffect(() => {
    fetch(`/api/parking?action=config&tenant=${tenant}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.ok && data.config) setConfig(data.config);
        if (data.ok && data.bank) setBank(data.bank);
      })
      .catch(() => {});
  }, [tenant]);

  // Realtime SePay payment listener & Auto-lock spot
  useEffect(() => {
    if (step !== 3 || !ticket || ticket.status === 'confirmed' || ticket.status === 'active') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/parking?action=ticket&tenant=${tenant}&code=${ticket.ticketCode}`, {
          cache: 'no-store',
        });
        const data: any = await res.json();
        if (isSubscribed && data.ok && data.ticket) {
          if (data.ticket.status === 'confirmed' || data.ticket.status === 'active') {
            setTicket(data.ticket);
            setStep(4);
          }
        }
      } catch {
        // ignore background network glitch
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [step, ticket, tenant]);

  // Load saved tickets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sigolf_parking_tickets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMyTickets(parsed);
        }
      }
    } catch {}
  }, []);

  // Save new ticket to localStorage whenever step 4 is reached
  useEffect(() => {
    if (ticket && (ticket.status === 'confirmed' || ticket.status === 'active')) {
      try {
        const saved = localStorage.getItem('sigolf_parking_tickets');
        const list: ParkingTicket[] = saved ? JSON.parse(saved) : [];
        const index = list.findIndex((t) => t.ticketCode === ticket.ticketCode);
        if (index >= 0) {
          list[index] = ticket;
        } else {
          list.unshift(ticket);
        }
        localStorage.setItem('sigolf_parking_tickets', JSON.stringify(list));
        setMyTickets(list);
      } catch {}
    }
  }, [ticket]);

  // Auto-recovery: If user reloads or returns while hold is active
  useEffect(() => {
    try {
      const holdingStr = sessionStorage.getItem('sigolf_parking_holding_ticket');
      if (holdingStr) {
        const savedTicket: ParkingTicket = JSON.parse(holdingStr);
        if (savedTicket.holdExpiresAt && savedTicket.holdExpiresAt > Date.now()) {
          // Verify with server
          fetch(`/api/parking?action=ticket&tenant=${savedTicket.tenant}&code=${savedTicket.ticketCode}&token=${savedTicket.accessToken}`)
            .then((r) => r.json())
            .then((d: any) => {
              if (d.ok && d.ticket) {
                if (d.ticket.status === 'holding') {
                  setTicket(d.ticket);
                  const rem = Math.max(0, Math.floor((d.ticket.holdExpiresAt - Date.now()) / 1000));
                  setHoldSecondsLeft(rem);
                  setStep(3);
                } else if (d.ticket.status === 'confirmed' || d.ticket.status === 'active') {
                  setTicket(d.ticket);
                  setStep(4);
                }
              }
            })
            .catch(() => {});
        } else {
          sessionStorage.removeItem('sigolf_parking_holding_ticket');
        }
      }
    } catch {}
  }, []);

  // Timer countdown for Step 3
  useEffect(() => {
    if (step !== 3 || !ticket) return;

    const interval = setInterval(() => {
      if (!ticket.holdExpiresAt) return;
      const left = Math.max(0, Math.floor((ticket.holdExpiresAt - Date.now()) / 1000));
      setHoldSecondsLeft(left);

      if (left <= 0) {
        clearInterval(interval);
        setErrorMessage(t.holdingExpiredMsg);
        sessionStorage.removeItem('sigolf_parking_holding_ticket');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, ticket, t.holdingExpiredMsg]);

  // If initial booking id provided, verify golf sponsorship automatically
  useEffect(() => {
    if (initialBookingId) {
      verifyGolf(initialBookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookingId]);

  // Verify Golf Booking Sponsorship
  async function verifyGolf(bookingIdInput: string) {
    if (!bookingIdInput.trim()) return;
    setErrorMessage('');
    try {
      const res = await fetch('/api/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-golf',
          tenant,
          bookingId: bookingIdInput.trim(),
          expectedIn: expectedInMs,
          expectedOut: expectedOutMs,
        }),
      });
      const data: any = await res.json();
      if (data.ok && data.sponsorship) {
        setGolfSponsorship(data.sponsorship);
        if (data.sponsorship.customerName) setCustomerName(data.sponsorship.customerName);
        if (data.sponsorship.customerPhone) setCustomerPhone(data.sponsorship.customerPhone);
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
      plateInputRef.current?.focus();
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
        sessionStorage.setItem('sigolf_parking_holding_ticket', JSON.stringify(data.ticket));
        setStep(3);
      } else {
        setErrorMessage(data.error || `Ô ${selectedSpot.code} vừa có người giữ chỗ hoặc đã được đặt. Vui lòng chọn ô khác.`);
        setSelectedSpot(null);
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
        sessionStorage.removeItem('sigolf_parking_holding_ticket');
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

  // Switch View Mode (Map <-> List) preserving and scrolling to selected spot
  const switchViewMode = (newMode: 'map' | 'list') => {
    setViewMode(newMode);
    if (selectedSpot) {
      setTimeout(() => {
        const id = newMode === 'map' ? `spot-map-${selectedSpot.code}` : `spot-list-${selectedSpot.code}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 80);
    }
  };

  // Select spot and auto-focus license plate
  const handleSpotSelect = (spot: ParkingSpot) => {
    if (spot.stateForWindow === 'available') {
      setSelectedSpot(spot);
      setErrorMessage('');
      setTimeout(() => {
        if (plateInputRef.current) {
          plateInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
  };

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

  // Car visual color helper
  const getCarVisualClass = (code: string) => {
    const colors = ['#ffffff', '#1e293b', '#0284c7', '#475569', '#dc2626', '#16a34a'];
    const num = parseInt(code.replace(/\D/g, '') || '0', 10);
    return colors[num % colors.length];
  };

  // Active ticket for "Vé của tôi" banner
  const activeTicket = useMemo(() => {
    return myTickets.find((t) => t.status === 'confirmed' || t.status === 'active') || null;
  }, [myTickets]);

  return (
    <PwaInstallProvider>
      <div className="pk-container" style={{ position: 'relative' }}>
      {/* =====================================================================
          HEADER DÀNH RIÊNG CHO MODULE PARKING (Không có Menu Golf)
          ===================================================================== */}
      <header className="pk-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeNav === 'booking' && step > 1 ? (
            <button
              type="button"
              className="pk-header-back"
              onClick={() => {
                setErrorMessage('');
                setStep((s) => (s > 1 ? ((s - 1) as any) : 1));
              }}
              aria-label="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="pk-app-logo">P</div>
          )}

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1.1 }}>
              {t.facilityName}
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.85, fontWeight: 500 }}>
              SIGOLF · 250 Lương Định Của
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="pk-desktop-nav">
          <button
            type="button"
            className={`pk-desktop-nav-link ${activeNav === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveNav('booking')}
          >
            <Car size={15} />
            <span>{t.navBooking}</span>
          </button>
          <button
            type="button"
            className={`pk-desktop-nav-link ${activeNav === 'my-tickets' ? 'active' : ''}`}
            onClick={() => setActiveNav('my-tickets')}
          >
            <QrCode size={15} />
            <span>{t.navMyTickets}</span>
            {activeTicket && <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />}
          </button>
          <button
            type="button"
            className={`pk-desktop-nav-link ${activeNav === 'info' ? 'active' : ''}`}
            onClick={() => setActiveNav('info')}
          >
            <Info size={15} />
            <span>{t.navInfo}</span>
          </button>
        </nav>

        {/* Right tools: Language selector & Back to SIGOLF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pk-lang-pill">
            {(['vi', 'en', 'ko'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                className={`pk-lang-btn ${lang === l ? 'active' : ''}`}
                onClick={() => changeLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <a
            href="/app"
            title={t.backToSigolf}
            className="pk-btn-home-pill"
          >
            <Home size={13} />
            <span className="hidden-xs">{t.backToSigolf}</span>
          </a>
        </div>
      </header>

      {/* =====================================================================
          TAB 1: ĐẶT CHỖ (BOOKING FLOW)
          ===================================================================== */}
      {activeNav === 'booking' && (
        <>
          {/* Stepper Header (4 bước) */}
          <nav className="pk-stepper" aria-label="Các bước đặt chỗ">
            {[
              { num: 1, label: t.step1 },
              { num: 2, label: t.step2 },
              { num: 3, label: t.step3 },
              { num: 4, label: t.step4 },
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

          <div className={`pk-body ${step !== 3 ? 'pk-content-with-bottom-nav' : ''}`}>
            {/* Error message banner */}
            {errorMessage && (
              <div className="pk-alert-error" role="alert" style={{ marginBottom: 12 }}>
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* BƯỚC 1: CHỌN THỜI GIAN */}
            {step === 1 && (
              <div className="pk-step1-layout">
                <div className="pk-step1-form-col">
                  <h2 className="pk-page-title">{t.pageTitle1}</h2>
                  <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', marginTop: -6, marginBottom: 14 }}>
                    {t.pageSub1}
                  </p>

                  <div className="pk-card">
                    {/* Bãi xe: Huy hiệu vị trí gọn gàng */}
                    <div className="pk-facility-compact-badge">
                      <MapPin size={15} color="var(--pk-primary)" />
                      <span><strong>Bãi xe GoPick</strong> · 250 Lương Định Của</span>
                      <span className="pk-facility-spots-count">65 ô</span>
                    </div>

                    {/* Ngày đậu xe */}
                    <div className="pk-input-group">
                      <label className="pk-label">
                        <Calendar size={14} color="var(--pk-primary)" />
                        {t.parkingDate}
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
                          {t.timeIn}
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
                          {t.timeOut}
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
                    <div className="pk-input-group" style={{ marginTop: 10, marginBottom: 0 }}>
                      <label className="pk-label">
                        <Car size={14} color="var(--pk-primary)" />
                        {t.plateNumber}
                      </label>
                      <input
                        type="text"
                        className="pk-input"
                        placeholder={t.platePlaceholder}
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                        style={{ fontWeight: 700, letterSpacing: 0.5 }}
                      />
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
                          {golfSponsorship?.isValid ? t.golfLinked : t.linkGolf}
                        </div>
                        <div className="pk-golf-link-sub">
                          {golfSponsorship?.isValid
                            ? golfSponsorship.message
                            : t.checkFreeHours}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--pk-primary)" />
                  </div>

                  {/* Nút tìm chỗ trống đặt trong tầm ngón tay cái */}
                  <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                    <button
                      type="button"
                      className="pk-btn-primary"
                      onClick={handleFindSpots}
                      disabled={loadingSpots}
                      style={{ height: 48, fontSize: 15 }}
                    >
                      {loadingSpots ? t.searching : t.findSpots}
                    </button>
                  </div>
                </div>

                {/* Cột phải hiển thị trên Desktop & Tablet */}
                <div className="pk-step1-preview-col">
                  <div className="pk-facility-preview-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="pk-app-logo" style={{ width: 44, height: 44, fontSize: 20 }}>P</div>
                      <div>
                        <strong style={{ fontSize: 16, color: '#0f172a' }}>Bãi xe GoPick — SiGolf</strong>
                        <div style={{ fontSize: 12, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                          250 Lương Định Của, Phường An Phú, TP. Thủ Đức, TP.HCM
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--pk-primary-border)' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="pk-facility-feature-item">
                        <div className="pk-facility-feature-icon">
                          <Car size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: 13.5, color: '#0f172a' }}>65 ô đỗ ô tô rộng rãi (P01–P65)</strong>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            Phân 6 dãy khoa học P1–P6, làn đường lưu thông 6.5m thông thoáng, dễ dàng ra vào.
                          </div>
                        </div>
                      </div>

                      <div className="pk-facility-feature-item">
                        <div className="pk-facility-feature-icon">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: 13.5, color: 'var(--pk-primary)' }}>Tài trợ 3 giờ đỗ xe cho khách chơi Golf</strong>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            Khách hàng đặt lịch chơi phòng 3D Golf tại Saigon Indoor Golf được miễn phí 100% tiền đậu xe 3 tiếng.
                          </div>
                        </div>
                      </div>

                      <div className="pk-facility-feature-item">
                        <div className="pk-facility-feature-icon">
                          <Camera size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Kiểm soát tự động ANPR & Barie</strong>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            Nhận diện biển số tự động, thanh toán VietQR SePay khớp lệnh 3 giây, mở cổng tức thì.
                          </div>
                        </div>
                      </div>

                      <div className="pk-facility-feature-item">
                        <div className="pk-facility-feature-icon">
                          <Phone size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Hỗ trợ bảo vệ bốt gác 24/7</strong>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            Hotline ban quản lý bãi: <strong>0877 834 888</strong>. Hướng dẫn đỗ và xuất vé giấy linh hoạt.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 2: CHỌN Ô ĐỖ (65 Ô GOPICK) */}
            {step === 2 && (
              <div className="pk-step2-layout">
                {/* Desktop Summary Sidebar (Chỉ hiện trên Desktop & Tablet) */}
                <div className="pk-step2-summary-col">
                  <div className="pk-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ borderBottom: '1px solid var(--pk-border)', paddingBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pk-primary)', textTransform: 'uppercase' }}>
                        Thông tin lượt đỗ
                      </div>
                      <strong style={{ fontSize: 15, color: '#0f172a', display: 'block', marginTop: 2 }}>
                        Bãi xe GoPick — 250 Lương Định Của
                      </strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--pk-text-muted)' }}>Ngày đậu:</span>
                        <strong>{dateStr}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--pk-text-muted)' }}>Khung giờ:</span>
                        <span>{timeIn} – {timeOut} ({durationText})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--pk-text-muted)' }}>Biển số xe:</span>
                        <strong style={{ color: '#0f172a' }}>{licensePlate || 'Chưa nhập'}</strong>
                      </div>
                      {golfSponsorship?.isValid && (
                        <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', color: '#166534', fontSize: 12, fontWeight: 600 }}>
                          ⛳ Miễn phí 3h (SiGolf tài trợ)
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--pk-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      ← Thay đổi thời gian & biển số
                    </button>

                    <div style={{ borderTop: '1px solid var(--pk-border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pk-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Vị trí ô đỗ đã chọn
                      </div>
                      {selectedSpot ? (
                        <div style={{ background: 'var(--pk-primary-light)', border: '1px solid var(--pk-primary-border)', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: 18, color: 'var(--pk-primary)' }}>Ô {selectedSpot.code}</strong>
                              <div style={{ fontSize: 12, color: '#475569' }}>{selectedSpot.section}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 11, color: 'var(--pk-text-muted)', display: 'block' }}>Tạm tính</span>
                              <strong style={{ fontSize: 16, color: 'var(--pk-primary)' }}>
                                {golfSponsorship?.isValid && golfSponsorship.isFullySponsored
                                  ? '0 đ'
                                  : money(config?.defaultHourlyRate || 30000)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 14, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 12.5 }}>
                          Chạm vào 1 ô đỗ còn trống trên sơ đồ
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="pk-btn-primary"
                      onClick={handleHoldSpot}
                      disabled={loadingSpots || !selectedSpot || !licensePlate.trim()}
                      style={{ height: 46, fontSize: 14, marginTop: 4 }}
                    >
                      {loadingSpots ? t.searching : selectedSpot ? t.holdAndContinue : 'Chọn một ô đỗ'}
                    </button>
                  </div>
                </div>

                {/* Cột chính (Sơ đồ / Danh sách ô đỗ) */}
                <div className="pk-step2-map-col">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h2 className="pk-page-title" style={{ margin: 0 }}>{t.chooseSpotTitle}</h2>
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
                    {viewMode === 'map' ? t.viewList : t.viewMap}
                  </button>
                </div>

                {/* Quick time bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--pk-text-muted)',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: '1px solid var(--pk-border)',
                    marginBottom: 10,
                  }}
                >
                  <Calendar size={13} color="var(--pk-primary)" />
                  <span>{dateStr}</span>
                  <span>·</span>
                  <Clock size={13} color="var(--pk-primary)" />
                  <span>{timeIn} – {timeOut} ({durationText})</span>
                  <button
                    type="button"
                    style={{
                      marginLeft: 'auto',
                      border: 'none',
                      background: 'none',
                      color: 'var(--pk-primary)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setStep(1)}
                  >
                    Đổi giờ
                  </button>
                </div>

                {/* Filter chips theo dãy */}
                <div className="pk-filter-chips">
                  <button
                    type="button"
                    className={`pk-filter-chip ${selectedSection === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedSection('all')}
                  >
                    {t.allSpots} ({spots.length})
                  </button>
                  {Object.entries(groupedSections).map(([secName, secSpots]) => (
                    <button
                      key={secName}
                      type="button"
                      className={`pk-filter-chip ${selectedSection === secName ? 'active' : ''}`}
                      onClick={() => setSelectedSection(secName)}
                    >
                      {secName} ({secSpots.length})
                    </button>
                  ))}
                </div>

                {/* Sơ đồ bãi xe GoPick 65 ô */}
                {viewMode === 'map' ? (
                  <div className="pk-gopick-lot" style={{ marginTop: 8 }}>
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

                    {Object.entries(groupedSections)
                      .filter(([secName]) => selectedSection === 'all' || selectedSection === secName)
                      .map(([secName, secSpots], idx) => {
                        const isDiagonal = secName.includes('chéo');
                        return (
                          <div key={secName} className="pk-section-card">
                            <div className="pk-section-title">
                              <span>{secName}</span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                                {secSpots.filter((s) => s.stateForWindow === 'available').length}/{secSpots.length} {t.emptySpots}
                              </span>
                            </div>

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
                                    onClick={() => handleSpotSelect(spot)}
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

                            {idx < 5 && (
                              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                                {idx % 2 === 0 ? 'Làn lưu thông 6.5m ➔' : '⬅ Làn lưu thông 6.5m'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  /* Chế độ xem danh sách */
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayedSpots.map((spot) => {
                      const isSelected = selectedSpot?.code === spot.code;
                      const isAvailable = spot.stateForWindow === 'available';

                      return (
                        <div
                          key={spot.id}
                          id={`spot-list-${spot.code}`}
                          onClick={() => handleSpotSelect(spot)}
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
                                width: 38,
                                height: 38,
                                borderRadius: 4,
                                background: isSelected ? 'var(--pk-primary)' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 13,
                              }}
                            >
                              {spot.code}
                            </div>
                            <div>
                              <strong style={{ fontSize: 13.5 }}>Ô {spot.code}</strong>
                              <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                                {spot.section} · {isAvailable ? 'Sẵn sàng đỗ' : 'Đang bận'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span
                              className={`pk-badge-status ${
                                isAvailable
                                  ? 'pk-badge-confirmed'
                                  : spot.stateForWindow === 'held'
                                  ? 'pk-badge-holding'
                                  : 'pk-badge-active'
                              }`}
                            >
                              {isAvailable ? 'Trống' : spot.stateForWindow === 'held' ? 'Đang giữ' : 'Có xe'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* THANH TÓM TẮT DƯỚI CÙNG (CHỈ HIỆN KHI KHÁCH ĐÃ CHỌN Ô) */}
                {selectedSpot && (
                  <div className="pk-spot-selection-bar">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: 14, color: 'var(--pk-primary)' }}>
                          Ô {selectedSpot.code} · {selectedSpot.section}
                        </strong>
                        <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                          {dateStr} ({timeIn} – {timeOut})
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: 'var(--pk-text-muted)', display: 'block' }}>{t.totalFee}</span>
                        <strong style={{ fontSize: 16, color: 'var(--pk-primary)' }}>
                          {golfSponsorship?.isValid && golfSponsorship.isFullySponsored
                            ? '0 đ'
                            : money(config?.defaultHourlyRate || 30000)}
                        </strong>
                      </div>
                    </div>

                    {/* Biển số xe: hiển thị tóm tắt nếu đã nhập ở bước 1, hoặc hiển thị ô nhập nếu chưa có */}
                    {licensePlate.trim() ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          padding: '6px 10px',
                          borderRadius: 'var(--pk-radius)',
                          marginBottom: 8,
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ color: 'var(--pk-text-muted)' }}>
                          🚗 {t.plateNumber}: <strong style={{ color: '#0f172a' }}>{licensePlate}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLicensePlate('');
                            setTimeout(() => plateInputRef.current?.focus(), 80);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--pk-primary)',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Đổi
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <input
                          ref={plateInputRef}
                          type="text"
                          className="pk-input"
                          placeholder={t.platePlaceholder}
                          value={licensePlate}
                          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                          style={{ height: 42, fontSize: 14, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="pk-btn-primary"
                      onClick={handleHoldSpot}
                      disabled={loadingSpots || !licensePlate.trim()}
                      style={{ height: 44, fontSize: 14 }}
                    >
                      {loadingSpots ? t.searching : t.holdAndContinue}
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* BƯỚC 3: THANH TOÁN (TRÁNH CHỒNG 2 THANH CỐ ĐỊNH) */}
            {step === 3 && ticket && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 className="pk-page-title" style={{ margin: 0 }}>{t.paymentTitle}</h2>
                  <div
                    style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Clock size={13} />
                    <span>
                      {t.holdingTime}: {String(Math.floor(holdSecondsLeft / 60)).padStart(2, '0')}:
                      {String(holdSecondsLeft % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div className="pk-card" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--pk-border)', paddingBottom: 6, marginBottom: 8 }}>
                    {t.bookingInfo}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--pk-text-muted)' }}>Ô đỗ xe:</span>
                    <strong>Ô {ticket.spotCode} ({ticket.section})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--pk-text-muted)' }}>Biển số xe:</span>
                    <strong>{ticket.licensePlate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--pk-text-muted)' }}>Thời gian:</span>
                    <span>{new Date(ticket.expectedIn).toTimeString().slice(0, 5)} – {new Date(ticket.expectedOut).toTimeString().slice(0, 5)}</span>
                  </div>
                </div>

                {/* Phương thức thanh toán hoặc Quyền lợi Golf */}
                {ticket.feePayer === 'gopick_sponsored' || ticket.sponsoredAmount >= ticket.totalAmount ? (
                  <div className="pk-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={24} color="var(--pk-primary)" />
                      <div>
                        <strong style={{ fontSize: 14, color: 'var(--pk-primary)' }}>
                          {t.sponsorBadge}
                        </strong>
                        <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                          Bạn được tài trợ 100% chi phí đậu xe theo quyền lợi buổi chơi Golf.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pk-card" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.payMethod}</div>
                      <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        Cổng SePay Auto
                      </span>
                    </div>

                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <Zap size={20} color="var(--pk-primary)" />
                      <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
                        <strong>Tự động khóa chỗ:</strong> Quét mã QR bằng App Ngân hàng bất kỳ, hệ thống SePay sẽ tự động khớp lệnh và xuất vé sau 3 giây.
                      </div>
                    </div>

                    {/* QR chuyển khoản SePay */}
                    {(() => {
                      const sepayNote = ticket.ticketCode.replace('-', '');
                      const paymentAmount = ticket.customerAmount || ticket.totalAmount;
                      const qrImageSrc = sepayQrUrl({
                        bin: bank.bin,
                        account: bank.account,
                        holder: bank.holder,
                        amount: paymentAmount,
                        note: sepayNote,
                      });

                      const copyToClipboard = (txt: string, field: 'account' | 'amount' | 'content') => {
                        try {
                          navigator.clipboard.writeText(txt);
                          setCopiedField(field);
                          setTimeout(() => setCopiedField(null), 2000);
                        } catch {}
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ padding: 8, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                            <img
                              src={qrImageSrc}
                              alt="Mã QR thanh toán SePay"
                              style={{ width: 170, height: 170, display: 'block' }}
                            />
                          </div>

                          <div style={{ width: '100%', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4 }}>
                              <span style={{ color: 'var(--pk-text-muted)' }}>Ngân hàng:</span>
                              <strong>{bank.bankName || 'MBBank (Quân Đội)'}</strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4 }}>
                              <span style={{ color: 'var(--pk-text-muted)' }}>Số tài khoản:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: '#0f172a' }}>{bank.account}</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(bank.account, 'account')}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: 'var(--pk-primary)' }}
                                  title="Sao chép số tài khoản"
                                >
                                  {copiedField === 'account' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4 }}>
                              <span style={{ color: 'var(--pk-text-muted)' }}>Chủ tài khoản:</span>
                              <strong style={{ color: '#0f172a' }}>{bank.holder}</strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f8fafc', borderRadius: 4 }}>
                              <span style={{ color: 'var(--pk-text-muted)' }}>Số tiền:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: 'var(--pk-primary)' }}>{money(paymentAmount)}</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(String(paymentAmount), 'amount')}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: 'var(--pk-primary)' }}
                                  title="Sao chép số tiền"
                                >
                                  {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fef3c7', borderRadius: 4, border: '1px dashed #f59e0b' }}>
                              <span style={{ color: '#92400e', fontWeight: 600 }}>Nội dung CK:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong style={{ color: '#b45309', fontSize: 13.5 }}>{sepayNote}</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(sepayNote, 'content')}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#b45309' }}
                                  title="Sao chép nội dung chuyển khoản"
                                >
                                  {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#16a34a', marginTop: 10 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s infinite' }} />
                            <span>Đang chờ tín hiệu SePay... Chỗ sẽ được khóa tự động.</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* VÙNG ĐÁY DÀNH RIÊNG CHO NÚT CHÍNH VÀ TỔNG TIỀN (TRÁNH CHỒNG 2 THANH CỐ ĐỊNH) */}
                <div style={{ marginTop: 'auto', background: '#ffffff', borderTop: '1px solid var(--pk-border)', padding: '14px 16px', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--pk-text-muted)' }}>{t.totalPay}</span>
                    <strong style={{ fontSize: 18, color: 'var(--pk-primary)' }}>
                      {ticket.feePayer === 'gopick_sponsored' || ticket.sponsoredAmount >= ticket.totalAmount
                        ? '0 đ'
                        : money(ticket.customerAmount || ticket.totalAmount)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="pk-btn-primary"
                    onClick={handleConfirmTicket}
                    disabled={paymentBusy || holdSecondsLeft <= 0}
                    style={{ height: 46, fontSize: 15 }}
                  >
                    {paymentBusy
                      ? t.checkingTx
                      : ticket.feePayer === 'gopick_sponsored' || ticket.sponsoredAmount >= ticket.totalAmount
                      ? t.confirmBooking
                      : `${t.confirmPaid} ${money(ticket.customerAmount || ticket.totalAmount)}`}
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 4: NHẬN VÉ ĐẬU XE */}
            {step === 4 && ticket && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="pk-ticket-status-badge">
                  <CheckCircle2 size={16} />
                  <span>{t.ticketConfirmed}</span>
                </div>

                <div className="pk-ticket-stub" style={{ marginTop: 12 }}>
                  <div className="pk-ticket-header">
                    <div className="pk-ticket-sub">{t.ticketStubTitle}</div>
                    <div className="pk-ticket-spot-code">Ô {ticket.spotCode}</div>
                    <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>{ticket.section}</div>
                  </div>

                  <div className="pk-ticket-qr-box">
                    <img
                      src={getQrDataUrl(`SIGOLF_PARKING:${ticket.ticketCode}:${ticket.accessToken}`, 5, 2)}
                      alt="QR"
                      style={{ width: 150, height: 150 }}
                    />
                    <div className="pk-ticket-code-label">Mã vé: {ticket.ticketCode}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Mã QR hoạt động 100% Offline</div>
                  </div>

                  <div className="pk-ticket-perforation">
                    <div className="pk-notch-left" />
                    <div className="pk-perforated-line" />
                    <div className="pk-notch-right" />
                  </div>

                  <div className="pk-ticket-details">
                    <div className="pk-ticket-row">
                      <span>🚗 {t.plateNumber}</span>
                      <b>{ticket.licensePlate}</b>
                    </div>
                    <div className="pk-ticket-row">
                      <span>📅 {t.parkingDate}</span>
                      <span>{new Date(ticket.expectedIn).toISOString().slice(0, 10)}</span>
                    </div>
                    <div className="pk-ticket-row">
                      <span>⏱ {t.duration}</span>
                      <span>
                        {new Date(ticket.expectedIn).toTimeString().slice(0, 5)} –{' '}
                        {new Date(ticket.expectedOut).toTimeString().slice(0, 5)}
                      </span>
                    </div>
                    <div className="pk-ticket-row">
                      <span>💰 Thanh toán</span>
                      <b style={{ color: '#16a34a' }}>
                        {ticket.sponsoredAmount >= ticket.totalAmount
                          ? 'GoPick tài trợ · 0 đ'
                          : `${money(ticket.paidAmount || ticket.totalAmount)} (Đã thanh toán)`}
                      </b>
                    </div>
                  </div>
                </div>

                {/* Đếm ngược thời gian & Nhắc nhở trước khi hết hạn */}
                {(() => {
                  const now = Date.now();
                  const expOut = new Date(ticket.expectedOut).getTime();
                  const diffMins = Math.floor((expOut - now) / 60000);
                  if (diffMins > 15) {
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    return (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12.5, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>⏱ Thời gian còn lại: <strong>{hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`}</strong> (Đến {new Date(ticket.expectedOut).toTimeString().slice(0, 5)})</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setShowExtendModal(true)}
                            style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: 'var(--pk-primary)', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <PlusCircle size={12} />
                            <span>Gia hạn</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnableReminder(ticket)}
                            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Bell size={12} />
                            <span>Nhắc nhở</span>
                          </button>
                        </div>
                      </div>
                    );
                  }
                  if (diffMins > 0 && diffMins <= 15) {
                    return (
                      <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>⚠️ <strong>Sắp hết giờ đỗ:</strong> Còn {diffMins} phút là đến giờ xe ra ({new Date(ticket.expectedOut).toTimeString().slice(0, 5)}).</span>
                        <button
                          type="button"
                          onClick={() => setShowExtendModal(true)}
                          style={{ background: '#ca8a04', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          Gia hạn ngay
                        </button>
                      </div>
                    );
                  }
                  if (diffMins <= 0) {
                    const otMins = Math.abs(diffMins);
                    return (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>⚠️ <strong>Quá giờ đỗ {otMins} phút:</strong> Phụ thu ngoài giờ sẽ tính khi xe ra cổng.</span>
                        <button
                          type="button"
                          onClick={() => setShowExtendModal(true)}
                          style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          Gia hạn bù
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {reminderNotice && (
                  <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 6, fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: 600 }}>
                    {reminderNotice}
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="pk-btn-primary"
                    onClick={() => handleDownloadTicket(ticket)}
                    disabled={downloadingTicket}
                    style={{ height: 46, background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)' }}
                  >
                    <Download size={16} />
                    <span>{downloadingTicket ? 'Đang tạo ảnh...' : 'Lưu ảnh vé vào máy (Offline)'}</span>
                  </button>

                  <button
                    type="button"
                    className="pk-btn-secondary"
                    onClick={() => setShowExtendModal(true)}
                    style={{ height: 46 }}
                  >
                    <Clock size={16} />
                    <span>Gia hạn thêm giờ đỗ xe</span>
                  </button>

                  <button
                    type="button"
                    className="pk-btn-secondary"
                    onClick={() => setFullScreenQrTicket(ticket)}
                    style={{ height: 46 }}
                  >
                    <Maximize2 size={16} />
                    <span>{t.openQrForGuard}</span>
                  </button>

                  <a
                    href="https://maps.google.com/?q=250+Luong+Dinh+Cua"
                    target="_blank"
                    rel="noreferrer"
                    className="pk-btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Navigation size={16} />
                    <span>{t.directions}</span>
                  </a>

                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--pk-primary)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 8,
                    }}
                    onClick={() => {
                      setStep(1);
                      setSelectedSpot(null);
                    }}
                  >
                    + Đặt thêm chỗ đậu xe khác
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 2: VÉ CỦA TÔI (MY TICKETS)
          ===================================================================== */}
      {activeNav === 'my-tickets' && (
        <div className="pk-body pk-content-with-bottom-nav">
          <h2 className="pk-page-title">{t.navMyTickets}</h2>

          {/* Vé đang hiệu lực ưu tiên trên cùng */}
          {activeTicket ? (
            <div
              className="pk-card"
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid var(--pk-primary)',
                marginBottom: 16,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pk-primary)', textTransform: 'uppercase' }}>
                  ● {t.activeTicketHeader}
                </span>
                <span className="pk-badge-status pk-badge-confirmed">
                  {activeTicket.status === 'active' ? '🚗 Đang trong bãi' : '✓ Đã xác nhận'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: '#ffffff', padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <img
                    src={getQrDataUrl(`SIGOLF_PARKING:${activeTicket.ticketCode}:${activeTicket.accessToken}`, 4, 1)}
                    alt="QR"
                    style={{ width: 80, height: 80 }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--pk-primary)' }}>
                    Ô {activeTicket.spotCode} ({activeTicket.section})
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                    {activeTicket.licensePlate}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    ⏱ {new Date(activeTicket.expectedIn).toTimeString().slice(0, 5)} – {new Date(activeTicket.expectedOut).toTimeString().slice(0, 5)}
                  </div>
                </div>
              </div>

              {/* Đếm ngược thời gian & Nhắc nhở */}
              {(() => {
                const now = Date.now();
                const expOut = new Date(activeTicket.expectedOut).getTime();
                const diffMins = Math.floor((expOut - now) / 60000);
                if (diffMins > 15) {
                  const hours = Math.floor(diffMins / 60);
                  const mins = diffMins % 60;
                  return (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>⏱ Còn: <strong>{hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`}</strong> (Đến {new Date(activeTicket.expectedOut).toTimeString().slice(0, 5)})</span>
                      <button
                        type="button"
                        onClick={() => handleEnableReminder(activeTicket)}
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: 'var(--pk-primary)', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Bell size={12} />
                        <span>Bật nhắc nhở</span>
                      </button>
                    </div>
                  );
                }
                if (diffMins > 0 && diffMins <= 15) {
                  return (
                    <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 12, color: '#854d0e' }}>
                      ⚠️ <strong>Sắp hết giờ:</strong> Còn {diffMins} phút là đến giờ xe ra ({new Date(activeTicket.expectedOut).toTimeString().slice(0, 5)}).
                    </div>
                  );
                }
                if (diffMins <= 0) {
                  const otMins = Math.abs(diffMins);
                  return (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 12, color: '#991b1b' }}>
                      ⚠️ <strong>Đã quá giờ {otMins} phút:</strong> Phụ thu ngoài giờ sẽ tính tại cổng khi xuất bãi.
                    </div>
                  );
                }
                return null;
              })()}

              {reminderNotice && (
                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: 6, fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: 600 }}>
                  {reminderNotice}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="pk-btn-primary"
                  onClick={() => setFullScreenQrTicket(activeTicket)}
                  style={{ height: 42, fontSize: 13.5 }}
                >
                  <Maximize2 size={16} />
                  <span>{t.openQrForGuard}</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="pk-card"
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: 'var(--pk-text-muted)',
                marginBottom: 16,
              }}
            >
              <Car size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.noActiveTicket}</div>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={() => setActiveNav('booking')}
                style={{ marginTop: 12, width: 'auto', padding: '0 20px', display: 'inline-flex' }}
              >
                {t.bookNow}
              </button>
            </div>
          )}

          {/* Lịch sử các vé trước */}
          {myTickets.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                {t.recentTickets}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myTickets.map((tItem) => (
                  <div
                    key={tItem.id || tItem.ticketCode}
                    className="pk-card"
                    style={{
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFullScreenQrTicket(tItem)}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        Ô {tItem.spotCode} · {tItem.licensePlate}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--pk-text-muted)', marginTop: 2 }}>
                        Mã vé: {tItem.ticketCode} · {new Date(tItem.expectedIn).toISOString().slice(0, 10)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        className={`pk-badge-status ${
                          tItem.status === 'completed'
                            ? 'pk-badge-confirmed'
                            : tItem.status === 'cancelled'
                            ? 'pk-badge-cancelled'
                            : 'pk-badge-active'
                        }`}
                      >
                        {tItem.status === 'completed' ? 'Đã ra' : tItem.status === 'active' ? 'Có xe' : tItem.status === 'cancelled' ? 'Đã hủy' : 'Đã đặt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: THÔNG TIN BÃI XE (FACILITY INFO)
          ===================================================================== */}
      {activeNav === 'info' && (
        <div className="pk-body pk-content-with-bottom-nav">
          <h2 className="pk-page-title">{t.navInfo}</h2>

          <div className="pk-info-grid">
            {/* Địa chỉ & Chỉ đường */}
            <div className="pk-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MapPin size={20} color="var(--pk-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: 13.5 }}>{t.facilityAddressTitle}</strong>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                    {t.addressVal}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <a
                  href="https://maps.google.com/?q=250+Luong+Dinh+Cua"
                  target="_blank"
                  rel="noreferrer"
                  className="pk-btn-primary"
                  style={{ textDecoration: 'none', height: 40, fontSize: 13 }}
                >
                  <Navigation size={15} />
                  <span>{t.directions}</span>
                </a>
              </div>
            </div>

            {/* Hotline */}
            <div className="pk-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Phone size={18} color="var(--pk-primary)" />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>{t.hotlineTitle}</div>
                    <strong style={{ fontSize: 15, color: 'var(--pk-primary)' }}>0877 834 888</strong>
                  </div>
                </div>

                <a
                  href="tel:0877834888"
                  className="pk-btn-secondary"
                  style={{ width: 'auto', padding: '0 12px', height: 34, textDecoration: 'none' }}
                >
                  Gọi ngay
                </a>
              </div>
            </div>

            {/* Bảng giá & Quyền lợi */}
            <div className="pk-card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--pk-border)', paddingBottom: 6, marginBottom: 8 }}>
                {t.priceTitle}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>{t.priceStandard}</li>
                <li style={{ color: 'var(--pk-primary)', fontWeight: 600 }}>{t.priceGolf}</li>
                <li>{t.priceOvertime}</li>
              </ul>
            </div>

            {/* Nội quy bãi xe */}
            <div className="pk-card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--pk-border)', paddingBottom: 6, marginBottom: 8 }}>
                {t.regulationsTitle}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>{t.reg1}</li>
                <li>{t.reg2}</li>
                <li>{t.reg3}</li>
              </ul>
            </div>

            {/* Mục Về SiGolf trong Thông tin bãi */}
            <div className="pk-card" style={{ marginBottom: 12, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Home size={20} color="var(--pk-primary)" />
                  <div>
                    <strong style={{ fontSize: 13.5 }}>Về SiGolf</strong>
                    <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
                      Quay lại màn hình mở ứng dụng (/app)
                    </div>
                  </div>
                </div>

                <a
                  href="/app"
                  className="pk-btn-secondary"
                  style={{ width: 'auto', padding: '0 14px', height: 34, textDecoration: 'none', fontWeight: 700 }}
                >
                  Mở /app
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CHÂN TRANG KHÁCH HÀNG (MOBILE & DESKTOP FOOTER CÓ ICON)
          ===================================================================== */}
      {!(activeNav === 'booking' && step === 3) && (
        <footer className="pk-footer" aria-label="Chân trang bãi xe">
          <div className="pk-footer-brand">
            <Car size={18} />
            <span>Bãi xe GoPick · SiGolf 250 Lương Định Của</span>
          </div>
          <div className="pk-footer-actions">
            <a href="tel:0877834888" className="pk-footer-btn">
              <Phone size={14} />
              <span>Hotline 0877834888</span>
            </a>
            <a href="https://zalo.me/0877834888" target="_blank" rel="noopener noreferrer" className="pk-footer-btn">
              <MessageCircle size={14} />
              <span>Chat Zalo</span>
            </a>
            <a href="https://maps.google.com/?q=250+Lương+Định+Của" target="_blank" rel="noopener noreferrer" className="pk-footer-btn">
              <MapPin size={14} />
              <span>Chỉ đường</span>
            </a>
          </div>
          <p className="pk-footer-copy">
            © {new Date().getFullYear()} SiGolf. Mở cửa 24/7 · Camera AI giám sát · Vé QR tiện lợi.
          </p>
        </footer>
      )}

      {/* =====================================================================
          MOBILE BOTTOM NAVIGATION (Ẩn ở Step 3 để tránh chồng thanh cố định)
          ===================================================================== */}
      {!(activeNav === 'booking' && step === 3) && (
        <nav className="pk-bottom-nav" aria-label="Thanh điều hướng bãi xe">
          <button
            type="button"
            className={`pk-bottom-nav-item ${activeNav === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveNav('booking')}
          >
            <Car size={18} />
            <span>{t.navBooking}</span>
          </button>

          <button
            type="button"
            className={`pk-bottom-nav-item ${activeNav === 'my-tickets' ? 'active' : ''}`}
            onClick={() => setActiveNav('my-tickets')}
          >
            <QrCode size={18} />
            <span>{t.navMyTickets}</span>
            {activeTicket && <span className="pk-bottom-nav-badge" />}
          </button>

          <button
            type="button"
            className={`pk-bottom-nav-item ${activeNav === 'info' ? 'active' : ''}`}
            onClick={() => setActiveNav('info')}
          >
            <Info size={18} />
            <span>{t.navInfo}</span>
          </button>
        </nav>
      )}

      {/* =====================================================================
          MODAL TOÀN MÀN HÌNH: MÃ QR ĐƯA BẢO VỆ TẠI CỔNG
          ===================================================================== */}
      {fullScreenQrTicket && (
        <div className="pk-qr-fullscreen-modal" onClick={() => setFullScreenQrTicket(null)}>
          <div className="pk-qr-card-fullscreen" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14, color: 'var(--pk-primary)' }}>SIGOLF · VÉ ĐẬU XE</strong>
              <button
                type="button"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
                onClick={() => setFullScreenQrTicket(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--pk-primary)' }}>
              Ô {fullScreenQrTicket.spotCode}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              {fullScreenQrTicket.licensePlate}
            </div>

            <div style={{ background: '#ffffff', padding: 8, border: '2px solid var(--pk-primary)', borderRadius: 8 }}>
              <img
                src={getQrDataUrl(`SIGOLF_PARKING:${fullScreenQrTicket.ticketCode}:${fullScreenQrTicket.accessToken}`, 7, 2)}
                alt="QR Fullscreen"
                style={{ width: 220, height: 220 }}
              />
            </div>

            <div style={{ fontSize: 12, color: 'var(--pk-text-muted)' }}>
              Mã vé: <strong>{fullScreenQrTicket.ticketCode}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
              Đưa mã này cho bảo vệ quét tại cổng vào / ra
            </div>
          </div>
        </div>
      )}

      {/* Modal Gia hạn đỗ xe */}
      {showExtendModal && ticket && (
        <div className="pk-modal-overlay" onClick={() => setShowExtendModal(false)}>
          <div
            className="pk-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, borderRadius: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="pk-modal-title" style={{ margin: 0, fontSize: 18 }}>
                🕒 Gia hạn đỗ xe
              </h3>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', marginBottom: 14 }}>
              Gia hạn thêm thời gian đỗ tại ô <strong>{ticket.spotCode}</strong> (Xe: {ticket.licensePlate})
            </p>

            {extendError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#991b1b',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                ⚠️ {extendError}
              </div>
            )}

            {extendSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#166534',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                ✓ {extendSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                Chọn số giờ gia hạn:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[1, 2, 3].map((h) => {
                  const isSelected = extendHours === h;
                  const isSpon = ticket.feePayer === 'gopick_sponsored' || ticket.sponsoredAmount >= ticket.totalAmount;
                  const price = isSpon ? 0 : h * 20000;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendHours(h)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 8,
                        border: isSelected ? '2px solid var(--pk-primary)' : '1px solid #cbd5e1',
                        background: isSelected ? '#eef2ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? 'var(--pk-primary)' : '#1e293b' }}>
                        +{h}h
                      </div>
                      <div style={{ fontSize: 11.5, color: isSelected ? 'var(--pk-primary)' : '#64748b', marginTop: 2 }}>
                        {isSpon ? 'Tài trợ' : `${money(price)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Giờ ra mới dự kiến:</span>
                <strong style={{ color: '#0f172a' }}>
                  {new Date(new Date(ticket.expectedOut).getTime() + extendHours * 3600 * 1000).toTimeString().slice(0, 5)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phí gia hạn:</span>
                <strong style={{ color: ticket.feePayer === 'gopick_sponsored' ? '#059669' : 'var(--pk-primary)', fontSize: 13.5 }}>
                  {ticket.feePayer === 'gopick_sponsored' ? '0 đ (GoPick tài trợ)' : money(extendHours * 20000)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="pk-btn-secondary"
                onClick={() => setShowExtendModal(false)}
                style={{ flex: 1, height: 42 }}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pk-btn-primary"
                onClick={handleExtendStaySubmit}
                disabled={extending}
                style={{ flex: 2, height: 42 }}
              >
                {extending ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal liên kết lịch Golf */}
      {showGolfModal && (
        <div className="pk-modal-overlay" onClick={() => setShowGolfModal(false)}>
          <div className="pk-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="pk-modal-title">Liên kết lịch chơi Golf</h3>
            <p style={{ fontSize: 13, color: 'var(--pk-text-muted)', marginBottom: 12 }}>
              Nhập mã đặt phòng Golf của bạn tại GoPick để nhận quyền lợi 3 giờ đậu xe miễn phí.
            </p>

            <div className="pk-input-group">
              <label className="pk-label">Mã lịch đặt Golf</label>
              <input
                type="text"
                className="pk-input"
                placeholder="VD: BOOKING-12345"
                value={golfBookingId}
                onChange={(e) => setGolfBookingId(e.target.value.toUpperCase())}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
                Kiểm tra
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PwaInstallProvider>
  );
}
