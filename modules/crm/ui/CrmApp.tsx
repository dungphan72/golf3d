'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Crown,
  Diamond,
  Edit3,
  FileText,
  Filter,
  Gift,
  HelpCircle,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Percent,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { money } from '../../../lib/club';
import { call, dateOnly, errText } from './api';
import '../../../app/crm-flow.css';

export type CrmFlowPage =
  | 'customers'
  | 'leads'
  | 'opportunities'
  | 'appointments'
  | 'tasks'
  | 'marketing';

type TierKind = 'gold' | 'platinum' | 'silver' | 'vip' | 'none';
type SegmentFilter = 'all' | 'member' | 'lead' | 'corp' | 'vip';
type ProfileSubTab = 'info' | 'membership' | 'bookings' | 'transactions' | 'opportunities' | 'notes';
type InteractionType = 'all' | 'call' | 'zalo' | 'email' | 'note';

interface TimelineEntry {
  id: string;
  kind: 'booking' | 'call' | 'email' | 'zalo' | 'note';
  timeLabel: string;
  statusBadge?: string;
  title: string;
  desc: string;
}

interface CustomerTask {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

interface CustomerBookingRecord {
  id: string;
  date: string;
  time: string;
  line: string;
  service: string;
  duration: string;
  amount: number;
  status: 'Hoàn tất' | 'Đang đặt' | 'Đã hủy';
}

interface CustomerTransactionRecord {
  id: string;
  code: string;
  date: string;
  description: string;
  method: string;
  amount: number;
}

interface CustomerOpportunity {
  id: string;
  title: string;
  stage: 'Mới tiếp cận' | 'Đã tư vấn' | 'Trải nghiệm sân' | 'Báo giá' | 'Chốt thành công';
  value: number;
  probability: number;
  expectedClose: string;
  owner: string;
}

interface CustomerRecord {
  id: string;
  code: string;
  memberCode: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  phone: string;
  email: string;
  birthday: string;
  age: number;
  address: string;
  avatar: string;
  tier: TierKind;
  status: 'active' | 'inactive';
  segment: ('member' | 'lead' | 'corp' | 'vip')[];
  source: string;
  lastDate: string;
  lastAction: string;
  memberDaysLeft: number;
  memberStart: string;
  memberEnd: string;
  memberProgress: number;
  discountPercent: number;
  pointMultiplier: string;
  stats: {
    bookings: number;
    bookingsDelta: string;
    hours: string;
    hoursDelta: string;
    spend: number;
    spendDelta: string;
    points: number;
  };
  tags: string[];
  internalNote: string;
  timeline: TimelineEntry[];
  tasks: CustomerTask[];
  bookingHistory: CustomerBookingRecord[];
  transactions: CustomerTransactionRecord[];
  opportunities: CustomerOpportunity[];
}

const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-1',
    code: 'KH000168',
    memberCode: 'HV-GD-0023',
    name: 'Nguyễn Hoàng Long',
    gender: 'Nam',
    phone: '0877 834 888',
    email: 'long.nguyen@gmail.com',
    birthday: '15/03/1985',
    age: 40,
    address: '250 Lương Định Của, P. Bình Trưng, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    tier: 'gold',
    status: 'active',
    segment: ['member', 'vip'],
    source: 'Giới thiệu',
    lastDate: 'Hôm nay',
    lastAction: 'Đặt sân',
    memberDaysLeft: 42,
    memberStart: '01/10/2026',
    memberEnd: '30/12/2026',
    memberProgress: 68,
    discountPercent: 15,
    pointMultiplier: 'x1.5',
    stats: {
      bookings: 12,
      bookingsDelta: '+20%',
      hours: '18,5 giờ',
      hoursDelta: '+15%',
      spend: 8450000,
      spendDelta: '+28%',
      points: 2860,
    },
    tags: ['Golfer thường xuyên', 'Quan tâm huấn luyện', 'Thích thi đấu', 'Nhóm doanh nhân'],
    internalNote: 'Khách hàng thân thiết, thường chơi cuối tuần. Đang quan tâm gói huấn luyện nâng cao.',
    timeline: [
      {
        id: 'tl-1',
        kind: 'booking',
        timeLabel: 'Hôm nay, 14:30',
        statusBadge: 'Hoàn tất',
        title: 'Đặt sân thành công',
        desc: 'Line L3 – 18:00 – 20:00 (2 giờ)',
      },
      {
        id: 'tl-2',
        kind: 'call',
        timeLabel: 'Hôm qua, 10:15',
        title: 'Gọi điện tư vấn',
        desc: 'Tư vấn gói Gold và lịch giải đấu tháng 12.',
      },
      {
        id: 'tl-3',
        kind: 'email',
        timeLabel: '12/11, 16:40',
        title: 'Gửi email',
        desc: 'Thông tin ưu đãi gia hạn hội viên Gold.',
      },
      {
        id: 'tl-4',
        kind: 'note',
        timeLabel: '10/11, 09:20',
        title: 'Ghi chú',
        desc: 'Khách quan tâm khóa huấn luyện driver.',
      },
    ],
    tasks: [
      { id: 'tk-1', title: 'Gọi nhắc gia hạn hội viên', dueDate: '25/11/2026', done: false },
      { id: 'tk-2', title: 'Gửi thông tin giải đấu tháng 12', dueDate: '20/11/2026', done: false },
      { id: 'tk-3', title: 'Tư vấn gói huấn luyện', dueDate: '12/11/2026', done: true },
    ],
    bookingHistory: [
      {
        id: 'bk-1',
        date: '15/11/2026',
        time: '18:00 – 20:00',
        line: 'Line L3',
        service: 'Chơi golf (giờ) GDR',
        duration: '2 giờ',
        amount: 700000,
        status: 'Đang đặt',
      },
      {
        id: 'bk-2',
        date: '10/11/2026',
        time: '19:00 – 21:00',
        line: 'Phòng VIP1',
        service: 'Game 18 hố',
        duration: '2 giờ',
        amount: 1450000,
        status: 'Hoàn tất',
      },
      {
        id: 'bk-3',
        date: '04/11/2026',
        time: '17:30 – 19:00',
        line: 'Line L5',
        service: 'Chơi golf (giờ) GDR',
        duration: '1,5 giờ',
        amount: 525000,
        status: 'Hoàn tất',
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        code: 'HD26879',
        date: '10/11/2026 21:05',
        description: 'Thanh toán Phòng VIP1 (18 hố + F&B)',
        method: 'VietQR',
        amount: 1450000,
      },
      {
        id: 'tx-2',
        code: 'HD26412',
        date: '04/11/2026 19:10',
        description: 'Thanh toán Line L5 (1.5 giờ + Nước suối)',
        method: 'Tiền mặt',
        amount: 565000,
      },
      {
        id: 'tx-3',
        code: 'HD25100',
        date: '01/10/2026 10:00',
        description: 'Mua gói Hội viên Gold (3 tháng)',
        method: 'Thẻ ngân hàng',
        amount: 6435000,
      },
    ],
    opportunities: [
      {
        id: 'op-1',
        title: 'Gia hạn thẻ Hội viên Gold (6 tháng)',
        stage: 'Báo giá',
        value: 12000000,
        probability: 80,
        expectedClose: '28/11/2026',
        owner: 'Minh Tâm (Sale)',
      },
      {
        id: 'op-2',
        title: 'Gói Huấn luyện Pro Driver 10 buổi',
        stage: 'Đã tư vấn',
        value: 8500000,
        probability: 60,
        expectedClose: '05/12/2026',
        owner: 'HLV Quốc Tuấn',
      },
    ],
  },
  {
    id: 'cust-2',
    code: 'KH000169',
    memberCode: 'HV-PL-0008',
    name: 'Trần Minh Anh',
    gender: 'Nữ',
    phone: '0932 456 789',
    email: 'minhanh.tran@gmail.com',
    birthday: '22/08/1990',
    age: 36,
    address: '88 Nguyễn Cơ Thạch, KĐT Sala, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
    tier: 'platinum',
    status: 'active',
    segment: ['member', 'vip'],
    source: 'Website',
    lastDate: 'Hôm qua',
    lastAction: 'Chơi golf',
    memberDaysLeft: 115,
    memberStart: '01/09/2026',
    memberEnd: '01/03/2027',
    memberProgress: 42,
    discountPercent: 20,
    pointMultiplier: 'x2.0',
    stats: {
      bookings: 18,
      bookingsDelta: '+35%',
      hours: '29,0 giờ',
      hoursDelta: '+22%',
      spend: 15800000,
      spendDelta: '+40%',
      points: 5420,
    },
    tags: ['Hội viên Platinum', 'Chơi buổi sáng', 'Khách VIP'],
    internalNote: 'Ưu tiên đặt Line L1 hoặc Phòng VIP1 khung giờ 08:00 - 10:00 sáng.',
    timeline: [
      {
        id: 'tl-201',
        kind: 'booking',
        timeLabel: 'Hôm qua, 09:30',
        statusBadge: 'Hoàn tất',
        title: 'Hoàn tất buổi chơi 18 hố',
        desc: 'Phòng VIP1 – 08:00 – 10:00 (2 giờ)',
      },
      {
        id: 'tl-202',
        kind: 'zalo',
        timeLabel: '11/11, 15:00',
        title: 'Nhắn Zalo CSKH',
        desc: 'Gửi lời mời tham dự giải Saigon Ladies Golf Cup.',
      },
    ],
    tasks: [
      { id: 'tk-201', title: 'Xác nhận đăng ký giải Ladies Cup', dueDate: '19/11/2026', done: false },
    ],
    bookingHistory: [
      {
        id: 'bk-201',
        date: '14/11/2026',
        time: '08:00 – 10:00',
        line: 'Phòng VIP1',
        service: 'Game 18 hố',
        duration: '2 giờ',
        amount: 1200000,
        status: 'Hoàn tất',
      },
    ],
    transactions: [
      {
        id: 'tx-201',
        code: 'HD26810',
        date: '14/11/2026 10:05',
        description: 'Thanh toán Phòng VIP1 (Trừ gói Platinum + F&B)',
        method: 'VietQR',
        amount: 240000,
      },
    ],
    opportunities: [],
  },
  {
    id: 'cust-3',
    code: 'KH000170',
    memberCode: 'HV-SV-0054',
    name: 'Lê Quốc Bảo',
    gender: 'Nam',
    phone: '0901 234 567',
    email: 'quocbao.le@company.vn',
    birthday: '10/11/1982',
    age: 44,
    address: '12 Thảo Điền, TP. Thủ Đức, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    tier: 'silver',
    status: 'active',
    segment: ['member', 'corp'],
    source: 'Facebook',
    lastDate: '12/11',
    lastAction: 'Gia hạn gói',
    memberDaysLeft: 85,
    memberStart: '12/11/2026',
    memberEnd: '12/02/2027',
    memberProgress: 12,
    discountPercent: 10,
    pointMultiplier: 'x1.2',
    stats: {
      bookings: 8,
      bookingsDelta: '+10%',
      hours: '12,0 giờ',
      hoursDelta: '+8%',
      spend: 5200000,
      spendDelta: '+12%',
      points: 1450,
    },
    tags: ['Khách doanh nghiệp', 'Tiếp khách cuối tuần'],
    internalNote: 'Hay đi theo nhóm 4 người, thường gọi combo đồ uống và thuê gậy tiêu chuẩn.',
    timeline: [
      {
        id: 'tl-301',
        kind: 'booking',
        timeLabel: '12/11, 11:20',
        statusBadge: 'Hoàn tất',
        title: 'Gia hạn gói Silver 3 tháng',
        desc: 'Thanh toán qua chuyển khoản VietQR 4.500.000 ₫',
      },
    ],
    tasks: [
      { id: 'tk-301', title: 'Gửi hóa đơn VAT cho công ty khách', dueDate: '18/11/2026', done: false },
    ],
    bookingHistory: [],
    transactions: [],
    opportunities: [],
  },
  {
    id: 'cust-4',
    code: 'KH000171',
    memberCode: 'Chưa cấp thẻ',
    name: 'Phạm Thu Hà',
    gender: 'Nữ',
    phone: '0988 765 432',
    email: 'thuha.pham@gmail.com',
    birthday: '05/06/1995',
    age: 31,
    address: '45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80',
    tier: 'none',
    status: 'active',
    segment: ['lead'],
    source: 'Zalo OA',
    lastDate: '12/11',
    lastAction: 'Tư vấn gói',
    memberDaysLeft: 0,
    memberStart: '—',
    memberEnd: '—',
    memberProgress: 0,
    discountPercent: 0,
    pointMultiplier: 'x1.0',
    stats: {
      bookings: 2,
      bookingsDelta: '+100%',
      hours: '3,0 giờ',
      hoursDelta: '+100%',
      spend: 950000,
      spendDelta: '+100%',
      points: 190,
    },
    tags: ['Người mới bắt đầu', 'Quan tâm học HLV'],
    internalNote: 'Khách mới tập chơi, đang tìm hiểu gói học cơ bản 1-kèm-1 với HLV.',
    timeline: [
      {
        id: 'tl-401',
        kind: 'call',
        timeLabel: '12/11, 14:00',
        title: 'Tư vấn gói học cơ bản',
        desc: 'Khách hẹn cuối tuần đến trải nghiệm thử 1 giờ.',
      },
    ],
    tasks: [
      { id: 'tk-401', title: 'Đặt lịch học thử cùng HLV', dueDate: '17/11/2026', done: false },
    ],
    bookingHistory: [],
    transactions: [],
    opportunities: [
      {
        id: 'op-401',
        title: 'Gói Học Golf Cơ Bản (12 buổi)',
        stage: 'Trải nghiệm sân',
        value: 9600000,
        probability: 70,
        expectedClose: '22/11/2026',
        owner: 'Minh Tâm (Sale)',
      },
    ],
  },
  {
    id: 'cust-5',
    code: 'KH000172',
    memberCode: 'HV-GD-0031',
    name: 'Vũ Đức Thành',
    gender: 'Nam',
    phone: '0903 678 999',
    email: 'ducthanh.vu@gmail.com',
    birthday: '19/01/1979',
    age: 47,
    address: '102 Võ Văn Tần, Quận 3, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
    tier: 'gold',
    status: 'active',
    segment: ['member', 'corp'],
    source: 'Walk-in',
    lastDate: '11/11',
    lastAction: 'Đặt sân',
    memberDaysLeft: 56,
    memberStart: '15/09/2026',
    memberEnd: '15/01/2027',
    memberProgress: 55,
    discountPercent: 15,
    pointMultiplier: 'x1.5',
    stats: {
      bookings: 14,
      bookingsDelta: '+18%',
      hours: '22,0 giờ',
      hoursDelta: '+14%',
      spend: 9800000,
      spendDelta: '+20%',
      points: 3120,
    },
    tags: ['Golfer HDC Single', 'Thích thi đấu'],
    internalNote: 'Đánh bóng tốc độ cao, yêu cầu line có cảm biến camera tốc độ cao.',
    timeline: [],
    tasks: [],
    bookingHistory: [],
    transactions: [],
    opportunities: [],
  },
  {
    id: 'cust-6',
    code: 'KH000173',
    memberCode: 'HV-SV-0082',
    name: 'Hoàng Thị Mai',
    gender: 'Nữ',
    phone: '0912 345 678',
    email: 'mai.hoang@gmail.com',
    birthday: '28/04/1992',
    age: 34,
    address: 'Khu biệt thự Thảo Điền, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    tier: 'silver',
    status: 'active',
    segment: ['member'],
    source: 'Facebook',
    lastDate: '10/11',
    lastAction: 'Mua gói giờ',
    memberDaysLeft: 74,
    memberStart: '10/11/2026',
    memberEnd: '10/02/2027',
    memberProgress: 18,
    discountPercent: 10,
    pointMultiplier: 'x1.2',
    stats: {
      bookings: 6,
      bookingsDelta: '+15%',
      hours: '9,5 giờ',
      hoursDelta: '+12%',
      spend: 4200000,
      spendDelta: '+15%',
      points: 980,
    },
    tags: ['Gói 20 giờ', 'Luyện tập chiều'],
    internalNote: 'Thường đặt Line L6 hoặc L7 từ 15:00 - 17:00.',
    timeline: [],
    tasks: [],
    bookingHistory: [],
    transactions: [],
    opportunities: [],
  },
  {
    id: 'cust-7',
    code: 'KH000174',
    memberCode: 'HV-VIP-0003',
    name: 'Kim Min Joon',
    gender: 'Nam',
    phone: '+82 10 1234 5678',
    email: 'minjoon.kim@korcham.kr',
    birthday: '03/12/1980',
    age: 46,
    address: 'The River Thủ Thiêm, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80',
    tier: 'vip',
    status: 'active',
    segment: ['member', 'vip', 'corp'],
    source: 'Giới thiệu',
    lastDate: '09/11',
    lastAction: 'Đặt sân',
    memberDaysLeft: 210,
    memberStart: '01/06/2026',
    memberEnd: '01/06/2027',
    memberProgress: 45,
    discountPercent: 25,
    pointMultiplier: 'x2.5',
    stats: {
      bookings: 28,
      bookingsDelta: '+42%',
      hours: '54,0 giờ',
      hoursDelta: '+38%',
      spend: 32500000,
      spendDelta: '+45%',
      points: 9850,
    },
    tags: ['Hội viên VIP', 'Khách Hàn Quốc', 'Phòng VIP2'],
    internalNote: 'Khách VIP thường đặt cố định Phòng VIP2 tối thứ 4 và thứ 6 hàng tuần.',
    timeline: [],
    tasks: [],
    bookingHistory: [],
    transactions: [],
    opportunities: [],
  },
  {
    id: 'cust-8',
    code: 'KH000175',
    memberCode: 'Chưa cấp thẻ',
    name: 'Nguyễn Văn Hùng',
    gender: 'Nam',
    phone: '0977 111 222',
    email: 'hung.nguyen@outlook.com',
    birthday: '14/07/1988',
    age: 38,
    address: '72 Lê Thánh Tôn, Quận 1, TP.HCM',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80',
    tier: 'none',
    status: 'active',
    segment: ['lead'],
    source: 'Website',
    lastDate: '08/11',
    lastAction: 'Tư vấn',
    memberDaysLeft: 0,
    memberStart: '—',
    memberEnd: '—',
    memberProgress: 0,
    discountPercent: 0,
    pointMultiplier: 'x1.0',
    stats: {
      bookings: 1,
      bookingsDelta: '+100%',
      hours: '1,5 giờ',
      hoursDelta: '+100%',
      spend: 525000,
      spendDelta: '+100%',
      points: 105,
    },
    tags: ['Khách tiềm năng', 'Quan tâm gói giờ'],
    internalNote: 'Đã chơi thử 1 buổi, đang cân nhắc gói 10 giờ chơi GDR.',
    timeline: [],
    tasks: [],
    bookingHistory: [],
    transactions: [],
    opportunities: [],
  },
];

function renderTierBadge(tier: TierKind) {
  switch (tier) {
    case 'gold':
      return (
        <span className="crm2-tier-badge crm2-tier-gold">
          <Crown size={12} /> Gold
        </span>
      );
    case 'platinum':
      return (
        <span className="crm2-tier-badge crm2-tier-platinum">
          <Crown size={12} /> Platinum
        </span>
      );
    case 'silver':
      return (
        <span className="crm2-tier-badge crm2-tier-silver">
          <Crown size={12} /> Silver
        </span>
      );
    case 'vip':
      return (
        <span className="crm2-tier-badge crm2-tier-vip">
          <Diamond size={12} /> VIP
        </span>
      );
    default:
      return <span className="crm2-tier-badge crm2-tier-none">Chưa có</span>;
  }
}

export function CrmModule({
  initialTab = 'customers',
  onFlowChange,
  onNavigate,
}: {
  permissions?: string[];
  initialTab?: string;
  onFlowChange?: (page: CrmFlowPage) => void;
  onNavigate?: (
    view: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => void;
}) {
  const mapInitialFlow = (tab: string): CrmFlowPage => {
    if (tab === 'marketing') return 'marketing';
    if (tab === 'leads') return 'leads';
    if (tab === 'opportunities' || tab === 'pipeline') return 'opportunities';
    if (tab === 'appointments') return 'appointments';
    if (tab === 'tasks' || tab === 'care') return 'tasks';
    return 'customers';
  };

  const [flowPage, setFlowPage] = useState<CrmFlowPage>(() => mapInitialFlow(initialTab));

  useEffect(() => {
    setFlowPage(mapInitialFlow(initialTab));
  }, [initialTab]);

  function switchFlowPage(next: CrmFlowPage) {
    setFlowPage(next);
    onFlowChange?.(next);
  }
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CUSTOMERS[0].id);
  const [checkedIds, setCheckedIds] = useState<string[]>([INITIAL_CUSTOMERS[0].id]);

  // Filters on Customer List
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [globalSearch, setGlobalSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Center Column State
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('info');
  const [activityRange, setActivityRange] = useState<'30d' | '90d' | 'year'>('30d');

  // Right Column State
  const [tlFilter, setTlFilter] = useState<InteractionType>('all');
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteChannel, setQuickNoteChannel] = useState<'call' | 'zalo' | 'email' | 'note'>('note');

  // Modals
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditTagsModal, setShowEditTagsModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState<'renew' | 'upgrade' | null>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showCreateDealModal, setShowCreateDealModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form states for modals
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    birthday: '01/01/1990',
    address: '',
    tier: 'none' as TierKind,
    source: 'Walk-in',
  });

  const [editProfileForm, setEditProfileForm] = useState({
    phone: '',
    email: '',
    birthday: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    address: '',
  });

  const [editTagsForm, setEditTagsForm] = useState({
    tagsText: '',
    note: '',
  });

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    dueDate: '25/11/2026',
  });

  const [newDealForm, setNewDealForm] = useState({
    title: '',
    value: '12000000',
    stage: 'Báo giá' as CustomerOpportunity['stage'],
    expectedClose: '30/11/2026',
  });

  // Leads state (synced with /api/crm2/leads)
  const [leadsList, setLeadsList] = useState<
    {
      id: string;
      fullName: string;
      phone: string;
      email: string;
      source: string;
      targetService: string;
      stage: string;
      notes: string;
      created: string;
    }[]
  >([
    {
      id: 'ld-1',
      fullName: 'Đặng Hoàng Nam',
      phone: '0908 112 334',
      email: 'nam.dang@gmail.com',
      source: 'Facebook Ads',
      targetService: 'Thẻ Hội viên Gold',
      stage: 'Mới tiếp nhận',
      notes: 'Quan tâm ưu đãi chơi giờ chiều tối và cuối tuần.',
      created: 'Hôm nay, 15:20',
    },
    {
      id: 'ld-2',
      fullName: 'Lê Thanh Thảo',
      phone: '0938 998 776',
      email: 'thaole.golf@gmail.com',
      source: 'Zalo OA',
      targetService: 'Gói học HLV cơ bản',
      stage: 'Đang tư vấn',
      notes: 'Muốn đăng ký học thử 1 buổi cùng HLV vào sáng Chủ nhật.',
      created: 'Hôm nay, 11:10',
    },
    {
      id: 'ld-3',
      fullName: 'Park Sung Hoon',
      phone: '0919 445 667',
      email: 'sh.park@samsung.com',
      source: 'Website',
      targetService: 'Thẻ VIP & Phòng VIP',
      stage: 'Đã hẹn trải nghiệm',
      notes: 'Đặt lịch tham quan phòng VIP1 & VIP2 lúc 18:00 ngày mai.',
      created: 'Hôm qua, 17:45',
    },
    {
      id: 'ld-4',
      fullName: 'Trương Quốc Khánh',
      phone: '0972 334 556',
      email: 'khanh.truong@corp.vn',
      source: 'Giới thiệu',
      targetService: 'Sự kiện Golf Doanh nghiệp',
      stage: 'Báo giá',
      notes: 'Cần thuê trọn 6 line + tiệc nhẹ cho 24 khách công ty.',
      created: '13/11/2026',
    },
  ]);

  const [newLeadForm, setNewLeadForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'Facebook Ads',
    targetService: 'Thẻ Hội viên Gold',
    notes: '',
  });

  // Campaigns state
  const [campaigns, setCampaigns] = useState([
    {
      id: 'cmp-1',
      name: 'Ưu đãi Gia hạn Thẻ Gold & Platinum Tháng 11',
      channel: 'Zalo OA & Email',
      segment: 'Hội viên (368)',
      sent: 368,
      opened: 294,
      converted: 42,
      status: 'Đang chạy',
    },
    {
      id: 'cmp-2',
      name: 'Mời tham dự Giải Saigon Indoor Golf Championship',
      channel: 'Zalo OA',
      segment: 'Khách VIP (58)',
      sent: 58,
      opened: 54,
      converted: 28,
      status: 'Hoàn tất',
    },
    {
      id: 'cmp-3',
      name: 'Tặng 1 giờ trải nghiệm miễn phí cho Khách mới',
      channel: 'SMS & Email',
      segment: 'Khách tiềm năng (176)',
      sent: 176,
      opened: 132,
      converted: 31,
      status: 'Đang chạy',
    },
  ]);

  const [newCampaignForm, setNewCampaignForm] = useState({
    name: '',
    channel: 'Zalo OA',
    segment: 'Hội viên (368)',
    message: 'Chào {ten}, Saigon Indoor Golf Club gửi tặng Quý khách ưu đãi giảm 15% khi gia hạn thẻ hội viên trong tháng này!',
  });

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }

  // Merge live customers from API if available
  useEffect(() => {
    let active = true;
    call<{
      customers?: {
        id: string;
        name: string;
        phone: string;
        email: string;
        birthday: string;
        visits: number;
        spend: number;
        points: number;
      }[];
    }>('/api/crm2/care-customers')
      .then((res) => {
        if (!active || !res.customers?.length) return;
        setCustomers((prev) => {
          const existingPhones = new Set(prev.map((c) => c.phone.replace(/\s+/g, '')));
          const extra: CustomerRecord[] = [];
          for (const raw of res.customers ?? []) {
            const norm = raw.phone.replace(/\s+/g, '');
            if (!existingPhones.has(norm) && raw.name) {
              existingPhones.add(norm);
              extra.push({
                id: raw.id,
                code: `KH${raw.id.slice(-6).toUpperCase()}`,
                memberCode: raw.spend > 5000000 ? `HV-GD-${raw.id.slice(-4).toUpperCase()}` : 'Chưa cấp thẻ',
                name: raw.name,
                gender: 'Nam',
                phone: raw.phone,
                email: raw.email || `${raw.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                birthday: raw.birthday || '10/05/1988',
                age: 38,
                address: 'TP. Hồ Chí Minh',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
                tier: raw.spend > 10000000 ? 'platinum' : raw.spend > 3000000 ? 'gold' : 'silver',
                status: 'active',
                segment: ['member'],
                source: 'POS',
                lastDate: 'Gần đây',
                lastAction: 'Chơi golf',
                memberDaysLeft: 60,
                memberStart: '01/10/2026',
                memberEnd: '31/12/2026',
                memberProgress: 50,
                discountPercent: 10,
                pointMultiplier: 'x1.2',
                stats: {
                  bookings: raw.visits || 1,
                  bookingsDelta: '+10%',
                  hours: `${(raw.visits || 1) * 1.5} giờ`,
                  hoursDelta: '+10%',
                  spend: raw.spend || 350000,
                  spendDelta: '+15%',
                  points: raw.points || 100,
                },
                tags: ['Khách hàng hệ thống'],
                internalNote: 'Đồng bộ từ dữ liệu đặt sân & POS.',
                timeline: [],
                tasks: [],
                bookingHistory: [],
                transactions: [],
                opportunities: [],
              });
            }
          }
          return extra.length ? [...prev, ...extra] : prev;
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = (listSearch || globalSearch).trim().toLowerCase();
    return customers.filter((c) => {
      if (segmentFilter !== 'all' && !c.segment.includes(segmentFilter)) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;
      if (q) {
        const hay = `${c.name} ${c.phone} ${c.email} ${c.code} ${c.memberCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, segmentFilter, listSearch, globalSearch, statusFilter, tierFilter, sourceFilter]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? customers[0],
    [customers, selectedId],
  );

  const filteredTimeline = useMemo(() => {
    if (!activeCustomer) return [];
    if (tlFilter === 'all') return activeCustomer.timeline;
    return activeCustomer.timeline.filter((item) => item.kind === tlFilter);
  }, [activeCustomer, tlFilter]);

  // Handlers
  function toggleCustomerCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function openEditBasicInfo() {
    if (!activeCustomer) return;
    setEditProfileForm({
      phone: activeCustomer.phone,
      email: activeCustomer.email,
      birthday: activeCustomer.birthday,
      gender: activeCustomer.gender,
      address: activeCustomer.address,
    });
    setShowEditProfileModal(true);
  }

  async function handleSaveBasicInfo() {
    if (!activeCustomer) return;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              phone: editProfileForm.phone.trim() || c.phone,
              email: editProfileForm.email.trim() || c.email,
              birthday: editProfileForm.birthday.trim() || c.birthday,
              gender: editProfileForm.gender,
              address: editProfileForm.address.trim() || c.address,
            }
          : c,
      ),
    );
    try {
      await call('/api/crm2/care-customers', {
        customerId: activeCustomer.id,
        action: 'contact-set',
        email: editProfileForm.email.trim(),
        zaloId: '',
      });
    } catch {
      /* fallback local state */
    }
    setShowEditProfileModal(false);
    notify('Đã cập nhật thông tin cơ bản của khách hàng!');
  }

  function openEditTags() {
    if (!activeCustomer) return;
    setEditTagsForm({
      tagsText: activeCustomer.tags.join(', '),
      note: activeCustomer.internalNote,
    });
    setShowEditTagsModal(true);
  }

  function handleSaveTags() {
    if (!activeCustomer) return;
    const parsedTags = editTagsForm.tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              tags: parsedTags.length ? parsedTags : c.tags,
              internalNote: editTagsForm.note.trim() || c.internalNote,
            }
          : c,
      ),
    );
    setShowEditTagsModal(false);
    notify('Đã lưu sở thích & ghi chú nội bộ!');
  }

  async function handleAddTimelineNote() {
    if (!activeCustomer || !quickNoteText.trim()) return;
    const titleMap: Record<'call' | 'zalo' | 'email' | 'note', string> = {
      call: 'Gọi điện tư vấn',
      zalo: 'Nhắn tin Zalo',
      email: 'Gửi email',
      note: 'Ghi chú',
    };
    const newEntry: TimelineEntry = {
      id: 'tl-' + Date.now(),
      kind: quickNoteChannel,
      timeLabel: 'Vừa xong',
      title: titleMap[quickNoteChannel],
      desc: quickNoteText.trim(),
    };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id ? { ...c, timeline: [newEntry, ...c.timeline] } : c,
      ),
    );
    try {
      await call('/api/crm2/care-customers', {
        customerId: activeCustomer.id,
        action: 'note-add',
        channel: quickNoteChannel,
        content: quickNoteText.trim(),
      });
    } catch {
      /* local timeline updated */
    }
    setQuickNoteText('');
    notify('Đã thêm lịch sử tương tác mới!');
  }

  function handleToggleTask(taskId: string) {
    if (!activeCustomer) return;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
            }
          : c,
      ),
    );
  }

  async function handleCreateTask() {
    if (!activeCustomer || !newTaskForm.title.trim()) return;
    const newTask: CustomerTask = {
      id: 'tk-' + Date.now(),
      title: newTaskForm.title.trim(),
      dueDate: newTaskForm.dueDate.trim() || '25/11/2026',
      done: false,
    };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id ? { ...c, tasks: [newTask, ...c.tasks] } : c,
      ),
    );
    try {
      await call('/api/crm2/care-customers', {
        customerId: activeCustomer.id,
        action: 'task-create',
        title: newTaskForm.title.trim(),
        days: 3,
      });
    } catch {
      /* local task added */
    }
    setNewTaskForm({ title: '', dueDate: '25/11/2026' });
    setShowAddTaskModal(false);
    notify('Đã tạo công việc & lịch hẹn mới!');
  }

  function handleCreateCustomer() {
    if (!newCustForm.name.trim() || !newCustForm.phone.trim()) return;
    const id = 'cust-' + Date.now();
    const code = 'KH00' + Math.floor(1000 + Math.random() * 9000);
    const created: CustomerRecord = {
      id,
      code,
      memberCode: newCustForm.tier !== 'none' ? `HV-${newCustForm.tier.toUpperCase().slice(0, 2)}-0099` : 'Chưa cấp thẻ',
      name: newCustForm.name.trim(),
      gender: newCustForm.gender,
      phone: newCustForm.phone.trim(),
      email: newCustForm.email.trim() || 'khachhang@sigolf.vn',
      birthday: newCustForm.birthday || '01/01/1990',
      age: 36,
      address: newCustForm.address.trim() || 'TP. Hồ Chí Minh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
      tier: newCustForm.tier,
      status: 'active',
      segment: newCustForm.tier !== 'none' ? ['member'] : ['lead'],
      source: newCustForm.source,
      lastDate: 'Hôm nay',
      lastAction: 'Tạo mới',
      memberDaysLeft: newCustForm.tier !== 'none' ? 90 : 0,
      memberStart: '15/11/2026',
      memberEnd: '15/02/2027',
      memberProgress: 100,
      discountPercent: newCustForm.tier === 'gold' ? 15 : newCustForm.tier === 'platinum' ? 20 : 10,
      pointMultiplier: newCustForm.tier === 'gold' ? 'x1.5' : 'x1.0',
      stats: {
        bookings: 0,
        bookingsDelta: '+0%',
        hours: '0 giờ',
        hoursDelta: '+0%',
        spend: 0,
        spendDelta: '+0%',
        points: 0,
      },
      tags: ['Khách hàng mới'],
      internalNote: 'Khách hàng mới tạo trên hệ thống CRM.',
      timeline: [
        {
          id: 'tl-init-' + Date.now(),
          kind: 'note',
          timeLabel: 'Vừa xong',
          title: 'Khởi tạo hồ sơ khách hàng',
          desc: `Nguồn tiếp nhận: ${newCustForm.source}`,
        },
      ],
      tasks: [],
      bookingHistory: [],
      transactions: [],
      opportunities: [],
    };
    setCustomers((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setShowCreateCustomerModal(false);
    setNewCustForm({
      name: '',
      phone: '',
      email: '',
      gender: 'Nam',
      birthday: '01/01/1990',
      address: '',
      tier: 'none',
      source: 'Walk-in',
    });
    notify(`Đã tạo hồ sơ khách hàng ${created.name} (${created.code})!`);
  }

  function handleRenewOrUpgrade() {
    if (!activeCustomer || !showRenewModal) return;
    const isUpgrade = showRenewModal === 'upgrade';
    const nextTier: TierKind = isUpgrade
      ? activeCustomer.tier === 'none'
        ? 'silver'
        : activeCustomer.tier === 'silver'
          ? 'gold'
          : activeCustomer.tier === 'gold'
            ? 'platinum'
            : 'vip'
      : activeCustomer.tier === 'none'
        ? 'gold'
        : activeCustomer.tier;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              tier: nextTier,
              memberDaysLeft: c.memberDaysLeft + 90,
              memberEnd: '30/03/2027',
              memberProgress: 92,
              discountPercent: nextTier === 'vip' ? 25 : nextTier === 'platinum' ? 20 : 15,
              pointMultiplier: nextTier === 'vip' ? 'x2.5' : nextTier === 'platinum' ? 'x2.0' : 'x1.5',
              timeline: [
                {
                  id: 'tl-mem-' + Date.now(),
                  kind: 'booking',
                  timeLabel: 'Vừa xong',
                  statusBadge: 'Hoàn tất',
                  title: isUpgrade ? `Nâng hạng hội viên lên ${nextTier.toUpperCase()}` : 'Gia hạn thẻ hội viên (+90 ngày)',
                  desc: `Cập nhật hạn thẻ đến 30/03/2027`,
                },
                ...c.timeline,
              ],
            }
          : c,
      ),
    );
    setShowRenewModal(null);
    notify(isUpgrade ? 'Đã nâng hạng thẻ hội viên thành công!' : 'Đã gia hạn thẻ hội viên (+90 ngày)!');
  }

  async function handleCreateLead() {
    if (!newLeadForm.fullName.trim() || !newLeadForm.phone.trim()) return;
    const item = {
      id: 'ld-' + Date.now(),
      fullName: newLeadForm.fullName.trim(),
      phone: newLeadForm.phone.trim(),
      email: newLeadForm.email.trim(),
      source: newLeadForm.source,
      targetService: newLeadForm.targetService,
      stage: 'Mới tiếp nhận',
      notes: newLeadForm.notes.trim() || 'Đang chờ liên hệ tư vấn',
      created: 'Vừa xong',
    };
    setLeadsList((prev) => [item, ...prev]);
    try {
      await call('/api/crm2/leads', {
        action: 'create',
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        source: 'WALK_IN',
        targetService: 'GDR',
        notes: item.notes,
      });
    } catch {
      /* saved in state */
    }
    setShowCreateLeadModal(false);
    setNewLeadForm({
      fullName: '',
      phone: '',
      email: '',
      source: 'Facebook Ads',
      targetService: 'Thẻ Hội viên Gold',
      notes: '',
    });
    notify(`Đã thêm Lead tiềm năng: ${item.fullName}!`);
  }

  function handleConvertLeadToCustomer(ld: (typeof leadsList)[number]) {
    const newCust: CustomerRecord = {
      id: 'cust-conv-' + Date.now(),
      code: 'KH00' + Math.floor(2000 + Math.random() * 7000),
      memberCode: 'HV-GD-0095',
      name: ld.fullName,
      gender: 'Nam',
      phone: ld.phone,
      email: ld.email || 'golfer@sigolf.vn',
      birthday: '12/06/1988',
      age: 38,
      address: 'TP. Hồ Chí Minh',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
      tier: 'gold',
      status: 'active',
      segment: ['member', 'lead'],
      source: ld.source,
      lastDate: 'Hôm nay',
      lastAction: 'Chuyển đổi Lead',
      memberDaysLeft: 90,
      memberStart: '15/11/2026',
      memberEnd: '15/02/2027',
      memberProgress: 100,
      discountPercent: 15,
      pointMultiplier: 'x1.5',
      stats: {
        bookings: 1,
        bookingsDelta: '+100%',
        hours: '2,0 giờ',
        hoursDelta: '+100%',
        spend: 6435000,
        spendDelta: '+100%',
        points: 640,
      },
      tags: ['Chuyển đổi từ Lead', ld.targetService],
      internalNote: ld.notes,
      timeline: [
        {
          id: 'tl-conv-' + Date.now(),
          kind: 'booking',
          timeLabel: 'Vừa xong',
          statusBadge: 'Hoàn tất',
          title: 'Chuyển đổi từ Lead tiềm năng',
          desc: `Đăng ký dịch vụ: ${ld.targetService}`,
        },
      ],
      tasks: [],
      bookingHistory: [],
      transactions: [],
      opportunities: [],
    };
    setCustomers((prev) => [newCust, ...prev]);
    setLeadsList((prev) => prev.filter((x) => x.id !== ld.id));
    setSelectedId(newCust.id);
    setFlowPage('customers');
    notify(`Đã chuyển đổi "${ld.fullName}" sang Hồ sơ Khách hàng chính thức!`);
  }

  function handleCreateDeal() {
    if (!activeCustomer || !newDealForm.title.trim()) return;
    const deal: CustomerOpportunity = {
      id: 'op-' + Date.now(),
      title: newDealForm.title.trim(),
      stage: newDealForm.stage,
      value: Number(newDealForm.value.replace(/\D/g, '')) || 5000000,
      probability: newDealForm.stage === 'Chốt thành công' ? 100 : 75,
      expectedClose: newDealForm.expectedClose,
      owner: 'Admin',
    };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? { ...c, opportunities: [deal, ...c.opportunities] }
          : c,
      ),
    );
    setShowCreateDealModal(false);
    setNewDealForm({
      title: '',
      value: '12000000',
      stage: 'Báo giá',
      expectedClose: '30/11/2026',
    });
    notify('Đã tạo cơ hội bán hàng mới!');
  }

  return (
    <div className="crm2-root">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 10000,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          TOP GLOBAL BAR (Search + Flow Navigation + Action Buttons)
          ===================================================================== */}
      <div className="crm2-topbar">
        <div className="crm2-global-search">
          <Search size={17} />
          <input
            placeholder="Tìm khách hàng, SĐT, email, mã hội viên..."
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              if (flowPage !== 'customers') setFlowPage('customers');
            }}
          />
          <kbd>⌘K</kbd>
        </div>

        {/* CRM New Flow Navigation */}
        <nav className="crm2-flow-nav" aria-label="Luồng CRM">
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'customers' ? 'active' : ''}`}
            onClick={() => switchFlowPage('customers')}
          >
            <Users size={15} />
            <span>CRM Khách hàng</span>
          </button>
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'leads' ? 'active' : ''}`}
            onClick={() => switchFlowPage('leads')}
          >
            <Target size={15} />
            <span>Lead tiềm năng</span>
            <span className="crm2-flow-badge">{leadsList.length + 8}</span>
          </button>
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'opportunities' ? 'active' : ''}`}
            onClick={() => switchFlowPage('opportunities')}
          >
            <Briefcase size={15} />
            <span>Cơ hội & Bán hàng</span>
          </button>
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'appointments' ? 'active' : ''}`}
            onClick={() => switchFlowPage('appointments')}
          >
            <CalendarDays size={15} />
            <span>Đặt sân & Lịch hẹn</span>
          </button>
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'tasks' ? 'active' : ''}`}
            onClick={() => switchFlowPage('tasks')}
          >
            <CalendarCheck size={15} />
            <span>Công việc</span>
          </button>
          <button
            type="button"
            className={`crm2-flow-btn ${flowPage === 'marketing' ? 'active' : ''}`}
            onClick={() => switchFlowPage('marketing')}
          >
            <Megaphone size={15} />
            <span>Marketing</span>
          </button>
        </nav>

        <div className="crm2-top-actions">
          <button
            type="button"
            className="crm2-btn-primary"
            onClick={() =>
              onNavigate
                ? onNavigate('rooms', {
                    customerId: activeCustomer?.id,
                    name: activeCustomer?.name,
                    phone: activeCustomer?.phone,
                  })
                : notify('Đã mở luồng Đặt sân cho khách hàng!')
            }
          >
            <Plus size={16} />
            <span>Đặt sân</span>
          </button>
          <button
            type="button"
            className="crm2-btn-secondary"
            onClick={() => setShowCreateCustomerModal(true)}
          >
            <UserPlus size={16} />
            <span>Tạo khách hàng</span>
          </button>
          <button
            type="button"
            className="crm2-top-icon-btn"
            title="Thông báo"
            onClick={() => notify('Bạn có 3 thông báo chăm sóc khách hàng mới hôm nay')}
          >
            <Bell size={18} />
            <span className="crm2-top-dot" />
          </button>
          <button
            type="button"
            className="crm2-top-icon-btn"
            title="Hướng dẫn luồng CRM"
            onClick={() => notify('Luồng CRM: Khách hàng → Lead tiềm năng → Cơ hội & Bán hàng → Đặt sân & Lịch hẹn → Công việc → Marketing')}
          >
            <HelpCircle size={18} />
          </button>
          <div className="crm2-top-admin">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Admin"
            />
            <div>
              <strong>Admin</strong>
              <small>Quản trị hệ thống</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* =====================================================================
          PAGE 1: CRM KHÁCH HÀNG (1:1 MASTER-DETAIL 3 COLUMNS)
          ===================================================================== */}
      {flowPage === 'customers' && (
        <>
          <div className="crm2-header-section">
            <div className="crm2-title-row">
              <div className="crm2-title-left">
                <div className="crm2-title-icon">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h1>CRM Khách hàng</h1>
                  <p>Quản lý thông tin khách hàng, hội viên và toàn bộ lịch sử tương tác</p>
                </div>
              </div>
            </div>

            {/* 5 Segment Filter Pills (1:1 with reference image) */}
            <div className="crm2-segment-bar">
              {[
                { key: 'all', label: 'Tất cả khách hàng (1.248)' },
                { key: 'member', label: 'Hội viên (368)' },
                { key: 'lead', label: 'Khách tiềm năng (176)' },
                { key: 'corp', label: 'Khách doanh nghiệp (32)' },
                { key: 'vip', label: 'Khách VIP (58)' },
              ].map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  className={`crm2-segment-pill ${segmentFilter === seg.key ? 'active' : ''}`}
                  onClick={() => setSegmentFilter(seg.key as SegmentFilter)}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3-Column Master-Detail Layout */}
          <div className="crm2-workspace-grid">
            {/* ---------------------------------------------------------------
                LEFT COLUMN: DANH SÁCH KHÁCH HÀNG
                --------------------------------------------------------------- */}
            <div className="crm2-card crm2-list-card">
              <div className="crm2-list-filters">
                <div className="crm2-list-search-row">
                  <div className="crm2-list-search">
                    <Search size={15} />
                    <input
                      placeholder="Tìm theo tên, SĐT, email..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="crm2-filter-icon-btn"
                    title="Đặt lại bộ lọc"
                    onClick={() => {
                      setListSearch('');
                      setStatusFilter('all');
                      setTierFilter('all');
                      setSourceFilter('all');
                      setSegmentFilter('all');
                    }}
                  >
                    <Filter size={15} />
                  </button>
                </div>

                <div className="crm2-list-selects">
                  <select
                    className="crm2-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Lọc trạng thái"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                  </select>
                  <select
                    className="crm2-select"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    aria-label="Lọc hạng hội viên"
                  >
                    <option value="all">Tất cả hạng</option>
                    <option value="gold">Hạng Gold</option>
                    <option value="platinum">Hạng Platinum</option>
                    <option value="silver">Hạng Silver</option>
                    <option value="vip">Hạng VIP</option>
                    <option value="none">Chưa có hạng</option>
                  </select>
                  <select
                    className="crm2-select"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    aria-label="Lọc nguồn khách"
                  >
                    <option value="all">Nguồn</option>
                    <option value="Website">Website</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Zalo OA">Zalo OA</option>
                    <option value="Giới thiệu">Giới thiệu</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
              </div>

              <div className="crm2-list-thead">
                <input
                  type="checkbox"
                  className="crm2-cust-check"
                  checked={checkedIds.length > 0 && checkedIds.length === filteredCustomers.length}
                  onChange={(e) =>
                    setCheckedIds(e.target.checked ? filteredCustomers.map((c) => c.id) : [])
                  }
                  aria-label="Chọn tất cả"
                />
                <span>Khách hàng</span>
                <span>Hạng hội viên</span>
                <span style={{ textAlign: 'right' }}>Lần gần nhất</span>
              </div>

              <div className="crm2-list-tbody">
                {filteredCustomers.slice(0, 8).map((cust) => {
                  const isSel = cust.id === activeCustomer?.id;
                  const isChecked = checkedIds.includes(cust.id);
                  return (
                    <div
                      key={cust.id}
                      className={`crm2-cust-row ${isSel ? 'selected' : ''}`}
                      onClick={() => setSelectedId(cust.id)}
                    >
                      <input
                        type="checkbox"
                        className="crm2-cust-check"
                        checked={isChecked}
                        onClick={(e) => toggleCustomerCheck(cust.id, e)}
                        onChange={() => {}}
                        aria-label={`Chọn ${cust.name}`}
                      />
                      <div className="crm2-cust-identity">
                        <img src={cust.avatar} alt={cust.name} className="crm2-avatar" />
                        <div className="crm2-cust-name-wrap">
                          <strong className="crm2-cust-name">{cust.name}</strong>
                          <span className="crm2-cust-phone">{cust.phone}</span>
                        </div>
                      </div>
                      <div>{renderTierBadge(cust.tier)}</div>
                      <div className="crm2-cust-last">
                        <strong>{cust.lastDate}</strong>
                        <span>{cust.lastAction}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    Không tìm thấy khách hàng phù hợp bộ lọc.
                  </div>
                )}
              </div>

              <div className="crm2-list-footer">
                <span>Hiển thị 1–{Math.min(8, filteredCustomers.length)} trong 1.248</span>
                <div className="crm2-pagination">
                  <button
                    type="button"
                    className="crm2-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {[1, 2, 3].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`crm2-page-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <span style={{ padding: '0 4px' }}>...</span>
                  <button
                    type="button"
                    className={`crm2-page-btn ${currentPage === 156 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(156)}
                  >
                    156
                  </button>
                  <button
                    type="button"
                    className="crm2-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(156, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                CENTER COLUMN: HỒ SƠ KHÁCH HÀNG 360°
                --------------------------------------------------------------- */}
            {activeCustomer && (
              <div className="crm2-card crm2-profile-card">
                {/* Profile Header */}
                <div className="crm2-profile-top">
                  <div className="crm2-profile-identity">
                    <img
                      src={activeCustomer.avatar}
                      alt={activeCustomer.name}
                      className="crm2-profile-avatar"
                    />
                    <div>
                      <div className="crm2-profile-name-row">
                        <h2>{activeCustomer.name}</h2>
                        <span className="crm2-gender-icon">
                          {activeCustomer.gender === 'Nam' ? '♂' : '♀'}
                        </span>
                      </div>
                      <div className="crm2-profile-codes">
                        <span>
                          Mã KH: <strong>{activeCustomer.code}</strong>
                        </span>
                        <span>|</span>
                        <span>
                          Hội viên: <strong>{activeCustomer.memberCode}</strong>
                        </span>
                      </div>
                      <div className="crm2-profile-badges">
                        {renderTierBadge(activeCustomer.tier)}
                        <span className="crm2-status-active">
                          <span className="crm2-status-dot" />
                          Đang hoạt động
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="crm2-quick-actions">
                    <a
                      href={`tel:${activeCustomer.phone.replace(/\s+/g, '')}`}
                      className="crm2-qact-btn call"
                      onClick={() => notify(`Đang kết nối cuộc gọi tới ${activeCustomer.phone}...`)}
                    >
                      <Phone size={18} />
                      <span>Gọi</span>
                    </a>
                    <a
                      href={`https://zalo.me/${activeCustomer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="crm2-qact-btn zalo"
                    >
                      <MessageCircle size={18} />
                      <span>Zalo</span>
                    </a>
                    <a
                      href={`mailto:${activeCustomer.email}`}
                      className="crm2-qact-btn email"
                    >
                      <Mail size={18} />
                      <span>Email</span>
                    </a>
                    <button
                      type="button"
                      className="crm2-qact-btn"
                      title="Chỉnh sửa hồ sơ"
                      onClick={openEditBasicInfo}
                    >
                      <MoreHorizontal size={18} />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>

                {/* 6 Sub-tabs */}
                <div className="crm2-subtabs">
                  {[
                    { key: 'info', label: 'Thông tin' },
                    { key: 'membership', label: 'Hội viên & Gói' },
                    { key: 'bookings', label: 'Lịch sử đặt sân' },
                    { key: 'transactions', label: 'Giao dịch' },
                    { key: 'opportunities', label: 'Cơ hội' },
                    { key: 'notes', label: 'Ghi chú' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`crm2-subtab-btn ${profileSubTab === t.key ? 'active' : ''}`}
                      onClick={() => setProfileSubTab(t.key as ProfileSubTab)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* SUB-TAB 1: THÔNG TIN (1:1 WITH REFERENCE IMAGE) */}
                {profileSubTab === 'info' && (
                  <>
                    <div className="crm2-info-split">
                      {/* Left Box: Thông tin cơ bản */}
                      <div className="crm2-subbox">
                        <div className="crm2-box-head">
                          <h3>Thông tin cơ bản</h3>
                          <button
                            type="button"
                            className="crm2-edit-link"
                            onClick={openEditBasicInfo}
                          >
                            <Edit3 size={13} />
                            <span>Chỉnh sửa</span>
                          </button>
                        </div>

                        <div className="crm2-field-list">
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <Phone size={14} /> Số điện thoại
                            </span>
                            <span className="crm2-field-val">
                              {activeCustomer.phone}
                              <button
                                type="button"
                                className="crm2-copy-btn"
                                title="Sao chép SĐT"
                                onClick={() => {
                                  navigator.clipboard?.writeText(activeCustomer.phone);
                                  notify('Đã sao chép số điện thoại!');
                                }}
                              >
                                <Copy size={12} />
                              </button>
                            </span>
                          </div>
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <Mail size={14} /> Email
                            </span>
                            <span className="crm2-field-val">{activeCustomer.email}</span>
                          </div>
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <Calendar size={14} /> Ngày sinh
                            </span>
                            <span className="crm2-field-val">
                              {activeCustomer.birthday} ({activeCustomer.age} tuổi)
                            </span>
                          </div>
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <User size={14} /> Giới tính
                            </span>
                            <span className="crm2-field-val">{activeCustomer.gender}</span>
                          </div>
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <MapPin size={14} /> Địa chỉ
                            </span>
                            <span className="crm2-field-val">{activeCustomer.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Box: Hội viên hiện tại */}
                      <div className="crm2-subbox-member">
                        <div>
                          <div className="crm2-box-head">
                            <h3>Hội viên hiện tại</h3>
                          </div>

                          <div className="crm2-mem-tier-row">
                            {renderTierBadge(activeCustomer.tier)}
                            <span className="crm2-days-left">
                              {activeCustomer.memberDaysLeft > 0
                                ? `Còn ${activeCustomer.memberDaysLeft} ngày`
                                : 'Chưa kích hoạt'}
                            </span>
                          </div>

                          <div className="crm2-mem-dates">
                            Thời hạn: {activeCustomer.memberStart} – {activeCustomer.memberEnd}
                          </div>

                          <div className="crm2-progress-track">
                            <div
                              className="crm2-progress-fill"
                              style={{ width: `${activeCustomer.memberProgress}%` }}
                            />
                          </div>

                          <div className="crm2-perks-grid">
                            <div className="crm2-perk-item">
                              <Percent size={15} color="#d97706" />
                              <span>Ưu đãi giá giờ</span>
                              <strong>-{activeCustomer.discountPercent}%</strong>
                            </div>
                            <div className="crm2-perk-item">
                              <Sparkles size={15} color="#d97706" />
                              <span>Tích điểm</span>
                              <strong>{activeCustomer.pointMultiplier}</strong>
                            </div>
                            <div className="crm2-perk-item">
                              <CalendarCheck size={15} color="#1d64f2" />
                              <span>Đặt sân</span>
                              <strong style={{ color: '#1e293b', fontSize: 11 }}>ưu tiên</strong>
                            </div>
                            <div className="crm2-perk-item">
                              <Gift size={15} color="#1d64f2" />
                              <span>Sự kiện</span>
                              <strong style={{ color: '#1e293b', fontSize: 11 }}>riêng</strong>
                            </div>
                          </div>
                        </div>

                        <div className="crm2-mem-actions">
                          <button
                            type="button"
                            className="crm2-mem-btn-primary"
                            onClick={() => setShowRenewModal('renew')}
                          >
                            + Gia hạn
                          </button>
                          <button
                            type="button"
                            className="crm2-mem-btn-outline"
                            onClick={() => setShowRenewModal('upgrade')}
                          >
                            + Nâng hạng
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tổng quan hoạt động */}
                    <div className="crm2-activity-section">
                      <div className="crm2-box-head">
                        <h3>Tổng quan hoạt động</h3>
                        <select
                          className="crm2-select"
                          value={activityRange}
                          onChange={(e) => setActivityRange(e.target.value as '30d' | '90d' | 'year')}
                          aria-label="Khoảng thời gian hoạt động"
                        >
                          <option value="30d">30 ngày qua</option>
                          <option value="90d">90 ngày qua</option>
                          <option value="year">Năm 2026</option>
                        </select>
                      </div>

                      <div className="crm2-kpi-grid">
                        <div className="crm2-kpi-card">
                          <div
                            className="crm2-kpi-icon"
                            style={{ background: '#dbeafe', color: '#1d64f2' }}
                          >
                            <CalendarDays size={16} />
                          </div>
                          <span className="crm2-kpi-label">Số lần đặt sân</span>
                          <div className="crm2-kpi-val-row">
                            <span className="crm2-kpi-val">{activeCustomer.stats.bookings}</span>
                            <span className="crm2-kpi-delta">↑ {activeCustomer.stats.bookingsDelta}</span>
                          </div>
                        </div>

                        <div className="crm2-kpi-card">
                          <div
                            className="crm2-kpi-icon"
                            style={{ background: '#e0f2fe', color: '#0284c7' }}
                          >
                            <Clock size={16} />
                          </div>
                          <span className="crm2-kpi-label">Tổng giờ chơi</span>
                          <div className="crm2-kpi-val-row">
                            <span className="crm2-kpi-val">{activeCustomer.stats.hours}</span>
                            <span className="crm2-kpi-delta">↑ {activeCustomer.stats.hoursDelta}</span>
                          </div>
                        </div>

                        <div className="crm2-kpi-card">
                          <div
                            className="crm2-kpi-icon"
                            style={{ background: '#fef3c7', color: '#d97706' }}
                          >
                            <Coins size={16} />
                          </div>
                          <span className="crm2-kpi-label">Chi tiêu</span>
                          <div className="crm2-kpi-val-row">
                            <span className="crm2-kpi-val">{money(activeCustomer.stats.spend)}</span>
                            <span className="crm2-kpi-delta">↑ {activeCustomer.stats.spendDelta}</span>
                          </div>
                        </div>

                        <div className="crm2-kpi-card">
                          <div
                            className="crm2-kpi-icon"
                            style={{ background: '#fef9c3', color: '#ca8a04' }}
                          >
                            <Star size={16} />
                          </div>
                          <span className="crm2-kpi-label">Điểm thưởng</span>
                          <div className="crm2-kpi-val-row">
                            <span className="crm2-kpi-val">
                              {activeCustomer.stats.points.toLocaleString('vi-VN')} điểm
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sở thích & ghi chú nội bộ */}
                    <div className="crm2-subbox">
                      <div className="crm2-box-head">
                        <h3>Sở thích & ghi chú nội bộ</h3>
                        <button type="button" className="crm2-edit-link" onClick={openEditTags}>
                          <Edit3 size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                      </div>

                      <div className="crm2-tags-row">
                        {activeCustomer.tags.map((tag) => (
                          <span key={tag} className="crm2-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="crm2-internal-note">
                        <FileText size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{activeCustomer.internalNote}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* SUB-TAB 2: HỘI VIÊN & GÓI */}
                {profileSubTab === 'membership' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="crm2-subbox-member">
                      <div className="crm2-box-head">
                        <h3>Thẻ Hội viên & Gói giờ đang sở hữu</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="crm2-btn-primary"
                            style={{ height: 32, fontSize: 12.5 }}
                            onClick={() => setShowRenewModal('renew')}
                          >
                            + Gia hạn thẻ
                          </button>
                          <button
                            type="button"
                            className="crm2-btn-secondary"
                            style={{ height: 32, fontSize: 12.5 }}
                            onClick={() => setShowRenewModal('upgrade')}
                          >
                            + Nâng hạng
                          </button>
                        </div>
                      </div>
                      <table className="crm2-table-full">
                        <thead>
                          <tr>
                            <th>Mã thẻ / Gói</th>
                            <th>Tên gói</th>
                            <th>Hạn sử dụng</th>
                            <th>Quyền lợi / Số dư</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <strong>{activeCustomer.memberCode}</strong>
                            </td>
                            <td>Thẻ Hội viên {activeCustomer.tier.toUpperCase()}</td>
                            <td>
                              {activeCustomer.memberStart} – {activeCustomer.memberEnd}
                            </td>
                            <td>
                              Giảm {activeCustomer.discountPercent}% giờ chơi · Tích điểm{' '}
                              {activeCustomer.pointMultiplier}
                            </td>
                            <td>
                              <span className="crm2-status-active">Còn {activeCustomer.memberDaysLeft} ngày</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong>PKG-GDR-20H</strong>
                            </td>
                            <td>Gói 20 giờ luyện tập GDR</td>
                            <td>01/10/2026 – 31/12/2026</td>
                            <td>Còn 11,5 giờ / 20 giờ</td>
                            <td>
                              <span className="crm2-status-active">Đang sử dụng</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: LỊCH SỬ ĐẶT SÂN */}
                {profileSubTab === 'bookings' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Lịch sử đặt sân & chơi golf ({activeCustomer.bookingHistory.length})</h3>
                      <button
                        type="button"
                        className="crm2-btn-primary"
                        style={{ height: 32, fontSize: 12.5 }}
                        onClick={() =>
                          onNavigate
                            ? onNavigate('rooms', {
                                customerId: activeCustomer.id,
                                name: activeCustomer.name,
                                phone: activeCustomer.phone,
                              })
                            : notify('Đã chuyển sang màn hình Đặt sân!')
                        }
                      >
                        + Đặt sân mới
                      </button>
                    </div>
                    <table className="crm2-table-full">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Khung giờ</th>
                          <th>Line / Phòng</th>
                          <th>Dịch vụ</th>
                          <th>Số tiền</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCustomer.bookingHistory.map((bk) => (
                          <tr key={bk.id}>
                            <td>
                              <strong>{bk.date}</strong>
                            </td>
                            <td>{bk.time}</td>
                            <td>{bk.line}</td>
                            <td>{bk.service}</td>
                            <td>
                              <strong>{money(bk.amount)}</strong>
                            </td>
                            <td>
                              <span className="crm2-tl-done-badge">{bk.status}</span>
                            </td>
                          </tr>
                        ))}
                        {activeCustomer.bookingHistory.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>
                              Chưa có lịch sử đặt sân.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SUB-TAB 4: GIAO DỊCH */}
                {profileSubTab === 'transactions' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Lịch sử giao dịch & Hóa đơn POS</h3>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                        Tổng chi tiêu: {money(activeCustomer.stats.spend)}
                      </span>
                    </div>
                    <table className="crm2-table-full">
                      <thead>
                        <tr>
                          <th>Mã HĐ</th>
                          <th>Thời gian</th>
                          <th>Nội dung thanh toán</th>
                          <th>Hình thức</th>
                          <th>Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCustomer.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              <strong>{tx.code}</strong>
                            </td>
                            <td>{tx.date}</td>
                            <td>{tx.description}</td>
                            <td>{tx.method}</td>
                            <td>
                              <strong>{money(tx.amount)}</strong>
                            </td>
                          </tr>
                        ))}
                        {activeCustomer.transactions.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                              Chưa phát sinh giao dịch.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SUB-TAB 5: CƠ HỘI */}
                {profileSubTab === 'opportunities' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Cơ hội bán hàng ({activeCustomer.opportunities.length})</h3>
                      <button
                        type="button"
                        className="crm2-btn-primary"
                        style={{ height: 32, fontSize: 12.5 }}
                        onClick={() => setShowCreateDealModal(true)}
                      >
                        + Tạo cơ hội bán hàng
                      </button>
                    </div>
                    <table className="crm2-table-full">
                      <thead>
                        <tr>
                          <th>Tên cơ hội</th>
                          <th>Giai đoạn</th>
                          <th>Giá trị dự kiến</th>
                          <th>Xác suất</th>
                          <th>Ngày dự kiến chốt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCustomer.opportunities.map((op) => (
                          <tr key={op.id}>
                            <td>
                              <strong>{op.title}</strong>
                            </td>
                            <td>
                              <span className="crm2-tl-done-badge">{op.stage}</span>
                            </td>
                            <td>
                              <strong>{money(op.value)}</strong>
                            </td>
                            <td>{op.probability}%</td>
                            <td>{op.expectedClose}</td>
                          </tr>
                        ))}
                        {activeCustomer.opportunities.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                              Chưa có cơ hội bán hàng nào cho khách này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* SUB-TAB 6: GHI CHÚ */}
                {profileSubTab === 'notes' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Ghi chú chăm sóc khách hàng</h3>
                    </div>
                    <div className="crm2-quick-note-bar" style={{ marginTop: 0, paddingTop: 0, borderTop: 0, marginBottom: 14 }}>
                      <select
                        className="crm2-select"
                        style={{ width: 110, height: 34 }}
                        value={quickNoteChannel}
                        onChange={(e) =>
                          setQuickNoteChannel(e.target.value as 'call' | 'zalo' | 'email' | 'note')
                        }
                      >
                        <option value="note">Ghi chú</option>
                        <option value="call">Gọi điện</option>
                        <option value="zalo">Zalo</option>
                        <option value="email">Email</option>
                      </select>
                      <input
                        placeholder="Nhập nội dung ghi chú chăm sóc khách hàng..."
                        value={quickNoteText}
                        onChange={(e) => setQuickNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTimelineNote()}
                      />
                      <button type="button" onClick={handleAddTimelineNote}>
                        Lưu ghi chú
                      </button>
                    </div>
                    <div className="crm2-timeline">
                      {activeCustomer.timeline.map((item) => (
                        <div key={item.id} className="crm2-tl-item">
                          <div className={`crm2-tl-icon ${item.kind}`}>
                            <FileText size={15} />
                          </div>
                          <div className="crm2-tl-body">
                            <div className="crm2-tl-meta">
                              <span>{item.timeLabel}</span>
                            </div>
                            <div className="crm2-tl-title">{item.title}</div>
                            <div className="crm2-tl-desc">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------
                RIGHT COLUMN: LỊCH SỬ TƯƠNG TÁC & CÔNG VIỆC / LỊCH HẸN
                --------------------------------------------------------------- */}
            <div className="crm2-right-col">
              {/* Card 1: Lịch sử tương tác */}
              <div className="crm2-card crm2-side-card">
                <div className="crm2-side-head">
                  <h3 className="crm2-side-title">
                    <Clock size={17} />
                    <span>Lịch sử tương tác</span>
                  </h3>
                </div>

                {/* 5 Filter Pills */}
                <div className="crm2-tl-filters">
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'call', label: 'Gọi điện' },
                    { key: 'zalo', label: 'Zalo' },
                    { key: 'email', label: 'Email' },
                    { key: 'note', label: 'Ghi chú' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`crm2-tl-pill ${tlFilter === f.key ? 'active' : ''}`}
                      onClick={() => setTlFilter(f.key as InteractionType)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="crm2-timeline">
                  {filteredTimeline.map((item) => (
                    <div key={item.id} className="crm2-tl-item">
                      <div className={`crm2-tl-icon ${item.kind}`}>
                        {item.kind === 'booking' && <CalendarDays size={15} />}
                        {item.kind === 'call' && <PhoneCall size={15} />}
                        {item.kind === 'email' && <Mail size={15} />}
                        {item.kind === 'zalo' && <MessageCircle size={15} />}
                        {item.kind === 'note' && <FileText size={15} />}
                      </div>
                      <div className="crm2-tl-body">
                        <div className="crm2-tl-meta">
                          <span>{item.timeLabel}</span>
                          {item.statusBadge && (
                            <span className="crm2-tl-done-badge">{item.statusBadge}</span>
                          )}
                        </div>
                        <div className="crm2-tl-title">{item.title}</div>
                        <div className="crm2-tl-desc">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                  {filteredTimeline.length === 0 && (
                    <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                      Chưa có tương tác thuộc nhóm này.
                    </div>
                  )}
                </div>

                <div className="crm2-quick-note-bar">
                  <input
                    placeholder="Ghi nhanh tương tác (Enter)..."
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTimelineNote()}
                  />
                  <button type="button" onClick={handleAddTimelineNote}>
                    Lưu
                  </button>
                </div>
              </div>

              {/* Card 2: Công việc & Lịch hẹn */}
              <div className="crm2-card crm2-side-card">
                <div className="crm2-side-head">
                  <h3 className="crm2-side-title">
                    <CalendarCheck size={17} />
                    <span>Công việc & Lịch hẹn</span>
                  </h3>
                  <button
                    type="button"
                    className="crm2-edit-link"
                    onClick={() => setShowAddTaskModal(true)}
                  >
                    + Tạo công việc
                  </button>
                </div>

                <div className="crm2-task-list">
                  {activeCustomer?.tasks.map((task) => (
                    <div key={task.id} className="crm2-task-row">
                      <label className="crm2-task-left">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleTask(task.id)}
                        />
                        <span className={`crm2-task-text ${task.done ? 'done' : ''}`}>
                          {task.title}
                        </span>
                      </label>
                      <span className="crm2-task-date">
                        <Calendar size={11} />
                        {task.dueDate}
                      </span>
                    </div>
                  ))}
                  {activeCustomer?.tasks.length === 0 && (
                    <div style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>
                      Chưa có công việc nhắc hẹn nào.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          PAGE 2: LEAD TIỀM NĂNG (SUB-PAGE IN NEW FLOW)
          ===================================================================== */}
      {flowPage === 'leads' && (
        <div className="crm2-card" style={{ padding: 22 }}>
          <div className="crm2-title-row" style={{ marginBottom: 18 }}>
            <div className="crm2-title-left">
              <div className="crm2-title-icon">
                <Target size={22} />
              </div>
              <div>
                <h1>Lead tiềm năng ({leadsList.length + 8})</h1>
                <p>Tiếp nhận khách hàng tiềm năng từ Website, Facebook, Zalo OA và chuyển đổi thành Hội viên</p>
              </div>
            </div>
            <button
              type="button"
              className="crm2-btn-primary"
              onClick={() => setShowCreateLeadModal(true)}
            >
              <Plus size={16} />
              <span>Thêm Lead mới</span>
            </button>
          </div>

          <table className="crm2-table-full">
            <thead>
              <tr>
                <th>Khách tiềm năng</th>
                <th>Số điện thoại</th>
                <th>Nguồn</th>
                <th>Dịch vụ quan tâm</th>
                <th>Giai đoạn</th>
                <th>Ghi chú nhu cầu</th>
                <th>Thao tác chuyển đổi</th>
              </tr>
            </thead>
            <tbody>
              {leadsList.map((ld) => (
                <tr key={ld.id}>
                  <td>
                    <strong>{ld.fullName}</strong>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{ld.created}</div>
                  </td>
                  <td>{ld.phone}</td>
                  <td>
                    <span className="crm2-tag-chip">{ld.source}</span>
                  </td>
                  <td>
                    <strong>{ld.targetService}</strong>
                  </td>
                  <td>
                    <span className="crm2-tl-done-badge">{ld.stage}</span>
                  </td>
                  <td style={{ maxWidth: 260, color: '#475569' }}>{ld.notes}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="crm2-btn-primary"
                        style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                        onClick={() => handleConvertLeadToCustomer(ld)}
                      >
                        Chuyển thành KH
                      </button>
                      <button
                        type="button"
                        className="crm2-btn-secondary"
                        style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                        onClick={() =>
                          onNavigate
                            ? onNavigate('rooms', { name: ld.fullName, phone: ld.phone })
                            : notify(`Đã mở lịch đặt sân cho ${ld.fullName}!`)
                        }
                      >
                        Đặt sân thử
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          PAGE 3: CƠ HỘI & BÁN HÀNG (KANBAN PIPELINE)
          ===================================================================== */}
      {flowPage === 'opportunities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="crm2-title-row">
            <div className="crm2-title-left">
              <div className="crm2-title-icon">
                <Briefcase size={22} />
              </div>
              <div>
                <h1>Cơ hội & Bán hàng (Sales Pipeline)</h1>
                <p>Theo dõi tiến độ tư vấn bán thẻ Hội viên, Gói giờ, Khóa học HLV và Sự kiện doanh nghiệp</p>
              </div>
            </div>
            <button
              type="button"
              className="crm2-btn-primary"
              onClick={() => setShowCreateDealModal(true)}
            >
              <Plus size={16} />
              <span>Tạo cơ hội mới</span>
            </button>
          </div>

          <div className="crm2-kanban-board">
            {(
              [
                'Mới tiếp cận',
                'Đã tư vấn',
                'Trải nghiệm sân',
                'Báo giá',
                'Chốt thành công',
              ] as CustomerOpportunity['stage'][]
            ).map((stageName) => {
              const allDeals = customers.flatMap((c) =>
                c.opportunities
                  .filter((o) => o.stage === stageName)
                  .map((o) => ({ ...o, customerName: c.name, customerId: c.id, tier: c.tier })),
              );
              const stageSum = allDeals.reduce((s, d) => s + d.value, 0);
              return (
                <div key={stageName} className="crm2-kanban-col">
                  <div className="crm2-kanban-head">
                    <h3>
                      {stageName} ({allDeals.length})
                    </h3>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1d64f2' }}>
                      {money(stageSum)}
                    </span>
                  </div>
                  {allDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="crm2-kanban-card"
                      onClick={() => {
                        setSelectedId(deal.customerId);
                        setProfileSubTab('opportunities');
                        setFlowPage('customers');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{deal.title}</strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Khách hàng: <strong style={{ color: '#334155' }}>{deal.customerName}</strong>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 13 }}>
                          {money(deal.value)}
                        </span>
                        <span className="crm2-task-date">{deal.expectedClose}</span>
                      </div>
                    </div>
                  ))}
                  {allDeals.length === 0 && (
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '18px 0' }}>
                      Chưa có cơ hội ở bước này
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          PAGE 4: ĐẶT SÂN & LỊCH HẸN
          ===================================================================== */}
      {flowPage === 'appointments' && (
        <div className="crm2-card" style={{ padding: 22 }}>
          <div className="crm2-title-row" style={{ marginBottom: 18 }}>
            <div className="crm2-title-left">
              <div className="crm2-title-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <h1>Đặt sân & Lịch hẹn khách hàng</h1>
                <p>Lịch hẹn khách đến trải nghiệm sân, tư vấn thẻ Hội viên và lịch đặt line từ bộ phận CRM</p>
              </div>
            </div>
            <button
              type="button"
              className="crm2-btn-primary"
              onClick={() =>
                onNavigate
                  ? onNavigate('bookings')
                  : notify('Đã mở bảng Timeline Đặt sân!')
              }
            >
              <Calendar size={16} />
              <span>Mở Bảng Lịch Đặt Sân</span>
            </button>
          </div>

          <table className="crm2-table-full">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Hạng thẻ</th>
                <th>Ngày & Giờ</th>
                <th>Line / Phòng</th>
                <th>Nội dung lịch hẹn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Nguyễn Hoàng Long</strong>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>0877 834 888</div>
                </td>
                <td>{renderTierBadge('gold')}</td>
                <td>Hôm nay · 18:00 – 20:00</td>
                <td>Line L3</td>
                <td>Chơi golf theo giờ (GDR) + Tư vấn gia hạn thẻ Gold</td>
                <td>
                  <span className="crm2-status-active">Đã xác nhận</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Park Sung Hoon</strong>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>0919 445 667</div>
                </td>
                <td>{renderTierBadge('vip')}</td>
                <td>Ngày mai · 18:00 – 19:30</td>
                <td>Phòng VIP1</td>
                <td>Tham quan & Đánh thử cảm biến 3D Phòng VIP</td>
                <td>
                  <span className="crm2-tl-done-badge">Hẹn trải nghiệm</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Phạm Thu Hà</strong>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>0988 765 432</div>
                </td>
                <td>{renderTierBadge('none')}</td>
                <td>17/11/2026 · 09:30 – 10:30</td>
                <td>Line L8</td>
                <td>Buổi học thử 1-kèm-1 cùng HLV Quốc Tuấn</td>
                <td>
                  <span className="crm2-tl-done-badge">Chờ đón khách</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          PAGE 5: CÔNG VIỆC & NHẮC HẸN CSKH
          ===================================================================== */}
      {flowPage === 'tasks' && (
        <div className="crm2-card" style={{ padding: 22 }}>
          <div className="crm2-title-row" style={{ marginBottom: 18 }}>
            <div className="crm2-title-left">
              <div className="crm2-title-icon">
                <CalendarCheck size={22} />
              </div>
              <div>
                <h1>Công việc chăm sóc khách hàng</h1>
                <p>Danh sách công việc gọi nhắc gia hạn, gửi thông tin giải đấu và chăm sóc sau buổi chơi</p>
              </div>
            </div>
            <button
              type="button"
              className="crm2-btn-primary"
              onClick={() => setShowAddTaskModal(true)}
            >
              <Plus size={16} />
              <span>Tạo công việc mới</span>
            </button>
          </div>

          <div className="crm2-task-list">
            {customers
              .flatMap((c) =>
                c.tasks.map((t) => ({ ...t, customerName: c.name, customerPhone: c.phone, customerId: c.id })),
              )
              .map((tk) => (
                <div key={tk.id} className="crm2-task-row" style={{ padding: '12px 16px' }}>
                  <label className="crm2-task-left">
                    <input
                      type="checkbox"
                      checked={tk.done}
                      onChange={() => {
                        setCustomers((prev) =>
                          prev.map((c) =>
                            c.id === tk.customerId
                              ? {
                                  ...c,
                                  tasks: c.tasks.map((x) =>
                                    x.id === tk.id ? { ...x, done: !x.done } : x,
                                  ),
                                }
                              : c,
                          ),
                        );
                      }}
                    />
                    <div>
                      <div className={`crm2-task-text ${tk.done ? 'done' : ''}`}>{tk.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Khách hàng: <strong>{tk.customerName}</strong> ({tk.customerPhone})
                      </div>
                    </div>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="crm2-task-date">
                      <Calendar size={12} /> {tk.dueDate}
                    </span>
                    <button
                      type="button"
                      className="crm2-btn-secondary"
                      style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                      onClick={() => {
                        setSelectedId(tk.customerId);
                        setFlowPage('customers');
                      }}
                    >
                      Mở hồ sơ
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          PAGE 6: MARKETING & CHIẾN DỊCH
          ===================================================================== */}
      {flowPage === 'marketing' && (
        <div className="crm2-card" style={{ padding: 22 }}>
          <div className="crm2-title-row" style={{ marginBottom: 18 }}>
            <div className="crm2-title-left">
              <div className="crm2-title-icon">
                <Megaphone size={22} />
              </div>
              <div>
                <h1>Chiến dịch Marketing & Chăm sóc tự động</h1>
                <p>Gửi thông báo ưu đãi gia hạn, mời giải đấu qua Zalo OA, Email và SMS theo phân nhóm</p>
              </div>
            </div>
            <button
              type="button"
              className="crm2-btn-primary"
              onClick={() => setShowCreateCampaignModal(true)}
            >
              <Send size={16} />
              <span>Tạo chiến dịch mới</span>
            </button>
          </div>

          <table className="crm2-table-full">
            <thead>
              <tr>
                <th>Tên chiến dịch</th>
                <th>Kênh gửi</th>
                <th>Nhóm đối tượng</th>
                <th>Đã gửi</th>
                <th>Đã mở xem</th>
                <th>Chuyển đổi đặt sân</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((cmp) => (
                <tr key={cmp.id}>
                  <td>
                    <strong>{cmp.name}</strong>
                  </td>
                  <td>{cmp.channel}</td>
                  <td>
                    <span className="crm2-tag-chip">{cmp.segment}</span>
                  </td>
                  <td>{cmp.sent}</td>
                  <td>{cmp.opened}</td>
                  <td>
                    <strong style={{ color: '#16a34a' }}>{cmp.converted} khách</strong>
                  </td>
                  <td>
                    <span className="crm2-status-active">{cmp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          MODALS (Tạo KH, Sửa thông tin, Sửa sở thích, Tạo việc, Gia hạn/Nâng hạng)
          ===================================================================== */}

      {/* 1. Modal Tạo Khách Hàng Mới */}
      {showCreateCustomerModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowCreateCustomerModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Tạo hồ sơ khách hàng mới</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowCreateCustomerModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Họ và tên khách hàng *</label>
                <input
                  placeholder="VD: Nguyễn Hoàng Long"
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Số điện thoại *</label>
                  <input
                    placeholder="VD: 0877 834 888"
                    value={newCustForm.phone}
                    onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Giới tính</label>
                  <select
                    value={newCustForm.gender}
                    onChange={(e) =>
                      setNewCustForm({ ...newCustForm, gender: e.target.value as 'Nam' | 'Nữ' })
                    }
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Email</label>
                  <input
                    placeholder="email@gmail.com"
                    value={newCustForm.email}
                    onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Ngày sinh</label>
                  <input
                    placeholder="DD/MM/YYYY"
                    value={newCustForm.birthday}
                    onChange={(e) => setNewCustForm({ ...newCustForm, birthday: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Hạng hội viên</label>
                  <select
                    value={newCustForm.tier}
                    onChange={(e) =>
                      setNewCustForm({ ...newCustForm, tier: e.target.value as TierKind })
                    }
                  >
                    <option value="none">Chưa có hạng (Khách lẻ)</option>
                    <option value="silver">Hội viên Silver</option>
                    <option value="gold">Hội viên Gold</option>
                    <option value="platinum">Hội viên Platinum</option>
                    <option value="vip">Hội viên VIP</option>
                  </select>
                </div>
                <div className="crm2-form-group">
                  <label>Nguồn khách hàng</label>
                  <select
                    value={newCustForm.source}
                    onChange={(e) => setNewCustForm({ ...newCustForm, source: e.target.value })}
                  >
                    <option value="Walk-in">Walk-in tại quầy</option>
                    <option value="Website">Website</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Zalo OA">Zalo OA</option>
                    <option value="Giới thiệu">Hội viên giới thiệu</option>
                  </select>
                </div>
              </div>
              <div className="crm2-form-group">
                <label>Địa chỉ</label>
                <input
                  placeholder="Số nhà, đường, phường/xã, TP.HCM"
                  value={newCustForm.address}
                  onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowCreateCustomerModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleCreateCustomer}>
                Lưu hồ sơ khách hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Chỉnh sửa Thông tin cơ bản */}
      {showEditProfileModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowEditProfileModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Chỉnh sửa thông tin — {activeCustomer?.name}</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowEditProfileModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Số điện thoại</label>
                <input
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                />
              </div>
              <div className="crm2-form-group">
                <label>Email</label>
                <input
                  value={editProfileForm.email}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Ngày sinh</label>
                  <input
                    value={editProfileForm.birthday}
                    onChange={(e) =>
                      setEditProfileForm({ ...editProfileForm, birthday: e.target.value })
                    }
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Giới tính</label>
                  <select
                    value={editProfileForm.gender}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        gender: e.target.value as 'Nam' | 'Nữ',
                      })
                    }
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
              <div className="crm2-form-group">
                <label>Địa chỉ</label>
                <input
                  value={editProfileForm.address}
                  onChange={(e) =>
                    setEditProfileForm({ ...editProfileForm, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowEditProfileModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleSaveBasicInfo}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Chỉnh sửa Sở thích & Ghi chú nội bộ */}
      {showEditTagsModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowEditTagsModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Sở thích & Ghi chú nội bộ</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowEditTagsModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Nhãn sở thích / Phân loại (cách nhau bằng dấu phẩy)</label>
                <input
                  value={editTagsForm.tagsText}
                  onChange={(e) => setEditTagsForm({ ...editTagsForm, tagsText: e.target.value })}
                  placeholder="Golfer thường xuyên, Quan tâm huấn luyện, Thích thi đấu"
                />
              </div>
              <div className="crm2-form-group">
                <label>Ghi chú nội bộ</label>
                <textarea
                  rows={3}
                  value={editTagsForm.note}
                  onChange={(e) => setEditTagsForm({ ...editTagsForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowEditTagsModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleSaveTags}>
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Tạo Công việc & Lịch hẹn */}
      {showAddTaskModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowAddTaskModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Tạo công việc & lịch hẹn mới</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowAddTaskModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Nội dung công việc *</label>
                <input
                  placeholder="VD: Gọi nhắc gia hạn hội viên Gold"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                />
              </div>
              <div className="crm2-form-group">
                <label>Ngày hạn thực hiện</label>
                <input
                  placeholder="DD/MM/YYYY"
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowAddTaskModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleCreateTask}>
                Tạo công việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Gia hạn / Nâng hạng Hội viên */}
      {showRenewModal && activeCustomer && (
        <div className="crm2-modal-backdrop" onClick={() => setShowRenewModal(null)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>
                {showRenewModal === 'renew'
                  ? `Gia hạn Hội viên — ${activeCustomer.name}`
                  : `Nâng hạng Hội viên — ${activeCustomer.name}`}
              </h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowRenewModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
                {showRenewModal === 'renew'
                  ? `Gia hạn thêm 3 tháng (+90 ngày) cho thẻ ${activeCustomer.memberCode} của khách hàng ${activeCustomer.name}.`
                  : `Nâng cấp hạng thẻ của khách hàng ${activeCustomer.name} lên bậc tiếp theo với đặc quyền giảm giá giờ chơi tới 20% và tích điểm x2.0.`}
              </p>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowRenewModal(null)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleRenewOrUpgrade}>
                Xác nhận thực hiện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Thêm Lead Mới */}
      {showCreateLeadModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowCreateLeadModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Thêm Lead tiềm năng mới</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowCreateLeadModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Họ và tên khách *</label>
                <input
                  placeholder="VD: Đặng Hoàng Nam"
                  value={newLeadForm.fullName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Số điện thoại *</label>
                  <input
                    placeholder="0908 xxx xxx"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Nguồn</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  >
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Zalo OA">Zalo OA</option>
                    <option value="Website">Website</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Giới thiệu">Giới thiệu</option>
                  </select>
                </div>
              </div>
              <div className="crm2-form-group">
                <label>Dịch vụ quan tâm</label>
                <input
                  value={newLeadForm.targetService}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, targetService: e.target.value })
                  }
                />
              </div>
              <div className="crm2-form-group">
                <label>Ghi chú tư vấn</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowCreateLeadModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleCreateLead}>
                Lưu Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Tạo Cơ Hội Bán Hàng */}
      {showCreateDealModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowCreateDealModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Tạo cơ hội bán hàng — {activeCustomer?.name}</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowCreateDealModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Tên gói / Cơ hội *</label>
                <input
                  placeholder="VD: Gói Hội viên Platinum 1 năm"
                  value={newDealForm.title}
                  onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Giá trị dự kiến (₫)</label>
                  <input
                    value={newDealForm.value}
                    onChange={(e) => setNewDealForm({ ...newDealForm, value: e.target.value })}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Giai đoạn</label>
                  <select
                    value={newDealForm.stage}
                    onChange={(e) =>
                      setNewDealForm({
                        ...newDealForm,
                        stage: e.target.value as CustomerOpportunity['stage'],
                      })
                    }
                  >
                    <option value="Mới tiếp cận">Mới tiếp cận</option>
                    <option value="Đã tư vấn">Đã tư vấn</option>
                    <option value="Trải nghiệm sân">Trải nghiệm sân</option>
                    <option value="Báo giá">Báo giá</option>
                    <option value="Chốt thành công">Chốt thành công</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowCreateDealModal(false)}
              >
                Hủy
              </button>
              <button type="button" className="crm2-btn-primary" onClick={handleCreateDeal}>
                Tạo cơ hội
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Tạo Chiến Dịch Marketing */}
      {showCreateCampaignModal && (
        <div className="crm2-modal-backdrop" onClick={() => setShowCreateCampaignModal(false)}>
          <div className="crm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm2-modal-head">
              <h3>Tạo chiến dịch chăm sóc & ưu đãi</h3>
              <button
                type="button"
                className="crm2-copy-btn"
                onClick={() => setShowCreateCampaignModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Tên chiến dịch *</label>
                <input
                  placeholder="VD: Ưu đãi Black Friday Golf Indoor"
                  value={newCampaignForm.name}
                  onChange={(e) => setNewCampaignForm({ ...newCampaignForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Kênh gửi</label>
                  <select
                    value={newCampaignForm.channel}
                    onChange={(e) =>
                      setNewCampaignForm({ ...newCampaignForm, channel: e.target.value })
                    }
                  >
                    <option value="Zalo OA">Zalo OA</option>
                    <option value="Email">Email</option>
                    <option value="Zalo OA & Email">Zalo OA & Email</option>
                    <option value="SMS">SMS Brandname</option>
                  </select>
                </div>
                <div className="crm2-form-group">
                  <label>Phân nhóm nhận tin</label>
                  <select
                    value={newCampaignForm.segment}
                    onChange={(e) =>
                      setNewCampaignForm({ ...newCampaignForm, segment: e.target.value })
                    }
                  >
                    <option value="Tất cả khách hàng (1.248)">Tất cả khách hàng (1.248)</option>
                    <option value="Hội viên (368)">Hội viên (368)</option>
                    <option value="Khách tiềm năng (176)">Khách tiềm năng (176)</option>
                    <option value="Khách VIP (58)">Khách VIP (58)</option>
                  </select>
                </div>
              </div>
              <div className="crm2-form-group">
                <label>Nội dung thông điệp</label>
                <textarea
                  rows={3}
                  value={newCampaignForm.message}
                  onChange={(e) =>
                    setNewCampaignForm({ ...newCampaignForm, message: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowCreateCampaignModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="crm2-btn-primary"
                onClick={() => {
                  if (!newCampaignForm.name.trim()) return;
                  setCampaigns((prev) => [
                    {
                      id: 'cmp-' + Date.now(),
                      name: newCampaignForm.name.trim(),
                      channel: newCampaignForm.channel,
                      segment: newCampaignForm.segment,
                      sent: 120,
                      opened: 0,
                      converted: 0,
                      status: 'Đang chạy',
                    },
                    ...prev,
                  ]);
                  setShowCreateCampaignModal(false);
                  notify('Đã phát hành chiến dịch Marketing mới!');
                }}
              >
                Kích hoạt gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CrmModule;
