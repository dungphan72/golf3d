'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Copy,
  CreditCard,
  Crown,
  Diamond,
  Edit3,
  FileText,
  Filter,
  Gift,
  HelpCircle,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Percent,
  Phone,
  PhoneCall,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { money } from '../../../lib/club';
import { call, dateOnly, errText } from './api';
import { CAMPAIGN_CHANNELS, SEGMENTS, SEGMENT_NAMES, type CampaignChannel, type CampaignSegment } from '../core/campaigns';
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
type ProfileSubTab =
  | 'info'
  | 'journey'
  | 'bookings'
  | 'transactions'
  | 'membership'
  | 'opportunities'
  | 'care'
  | 'tasks'
  | 'notes'
  | 'attachments';
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
  gender: 'Nam' | 'Nữ' | '';
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
  marketingConsent?: boolean;
}

/** No sample customers: the list is filled only from the club's own data (members, bookings, care list). */
const INITIAL_CUSTOMERS: CustomerRecord[] = [];

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

function uid(prefix: string) {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, '');
  return /^\+?\d{8,15}$/.test(digits);
}

function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed) && trimmed.length <= 200;
}

function isValidDateStr(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return /^([0-3]\d\/[01]\d\/\d{4}|\d{4}-[01]\d-[0-3]\d)$/.test(trimmed);
}

function safeHrefPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, '').slice(0, 16);
}

function safeHrefEmail(raw: string): string {
  const clean = raw.trim().replace(/[\r\n<>:"']/g, '');
  return isValidEmail(clean) ? clean : '';
}

export function CrmModule({
  permissions = [],
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
  const canWork =
    !permissions.length || permissions.includes('crm.work') || permissions.includes('crm.manage');
  const canManage = !permissions.length || permissions.includes('crm.manage');
  const canMember =
    !permissions.length ||
    permissions.includes('member.manage') ||
    permissions.includes('crm.manage');
  const canBook =
    !permissions.length ||
    permissions.includes('booking.operate') ||
    permissions.includes('booking.manage');
  const canTopup =
    !permissions.length ||
    permissions.includes('member.sell') ||
    permissions.includes('finance.operate') ||
    permissions.includes('member.manage');
  const canRenew =
    !permissions.length ||
    permissions.includes('member.sell') ||
    permissions.includes('member.manage');

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
  const [selectedId, setSelectedId] = useState<string>('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

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

  // Right Column State
  const [tlFilter, setTlFilter] = useState<InteractionType>('all');
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteChannel, setQuickNoteChannel] = useState<'call' | 'zalo' | 'email' | 'note'>('note');
  const [isReconciling, setIsReconciling] = useState(false);

  // Modals
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditTagsModal, setShowEditTagsModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState<'renew' | 'upgrade' | null>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showCreateDealModal, setShowCreateDealModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);

  // Quick Action Modals (Mục 4 CRM)
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(1_000_000);
  const [topupMethod, setTopupMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
  const [topupNote, setTopupNote] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);

  const [showQuickBookingModal, setShowQuickBookingModal] = useState(false);
  const [bookingLine, setBookingLine] = useState('Line 01');
  const [bookingService, setBookingService] = useState<'gdr' | '9' | '18'>('gdr');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState('18:30');
  const [bookingDuration, setBookingDuration] = useState(90);
  const [bookingNote, setBookingNote] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);

  const [showCreateApptModal, setShowCreateApptModal] = useState(false);
  const [apptService, setApptService] = useState('Tập trải nghiệm & Thử gậy');
  const [apptDate, setApptDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [apptTime, setApptTime] = useState('09:00');
  const [apptAssignee, setApptAssignee] = useState('Trần Văn An');
  const [apptNote, setApptNote] = useState('');
  const [apptBusy, setApptBusy] = useState(false);

  // Identity resolution & verification linking state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [unlinkedBookings, setUnlinkedBookings] = useState<
    Array<{
      id: string;
      room: string;
      service: string;
      customer: string;
      phone: string;
      start: number;
      end: number;
      amount: number | null;
      status: string;
      created: number;
    }>
  >([]);
  const [unlinkedLeads, setUnlinkedLeads] = useState<
    Array<{
      id: string;
      fullName: string;
      phone: string;
      email: string;
      source: string;
      targetService: string;
      stage: string;
      created: number;
    }>
  >([]);
  const [verifyingBusy, setVerifyingBusy] = useState(false);
  const [linkReason, setLinkReason] = useState('');
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function notify(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3500);
  }

  function requirePerm(allowed: boolean, actionName: string): boolean {
    if (!allowed) {
      notify(`Bạn không có quyền thực hiện thao tác: ${actionName}`);
      return false;
    }
    return true;
  }

  // Form states for modals
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    birthday: '',
    address: '',
    tier: 'none' as TierKind,
    source: 'Walk-in',
  });

  const [editProfileForm, setEditProfileForm] = useState({
    phone: '',
    email: '',
    birthday: '',
    gender: 'Nam' as 'Nam' | 'Nữ' | '',
    address: '',
  });

  const [editTagsForm, setEditTagsForm] = useState({
    tagsText: '',
    note: '',
  });

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    dueDate: '',
  });

  const [newDealForm, setNewDealForm] = useState({
    title: '',
    value: '',
    stage: 'Báo giá' as CustomerOpportunity['stage'],
    expectedClose: '',
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
  >([]);

  const [newLeadForm, setNewLeadForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'Facebook Ads',
    targetService: 'Thẻ Hội viên Gold',
    notes: '',
  });

  // Campaigns state
  // Marketing campaigns come from the real campaign service (/api/crm2/campaigns).
  const [campaigns, setCampaigns] = useState<
    {
      id: string;
      name: string;
      channel: string;
      segment: string;
      queued: number;
      skipped: number;
      cancelled: number;
      stats: Record<string, number>;
    }[]
  >([]);
  const [newCampaignForm, setNewCampaignForm] = useState({
    name: '',
    channel: 'zalo' as CampaignChannel,
    segment: 'all' as CampaignSegment,
    subject: '',
    message: '',
  });
  const [campaignBusy, setCampaignBusy] = useState(false);
  async function loadCampaigns() {
    try {
      const r = await call<{ campaigns?: typeof campaigns }>('/api/crm2/campaigns');
      setCampaigns(r.campaigns ?? []);
    } catch {
      setCampaigns([]);
    }
  }
  async function sendCampaign() {
    if (!requirePerm(canManage, 'Gửi chiến dịch Marketing')) return;
    setCampaignBusy(true);
    try {
      await call('/api/crm2/campaigns', {
        action: 'send',
        name: newCampaignForm.name,
        channel: newCampaignForm.channel,
        segment: newCampaignForm.segment,
        subject: newCampaignForm.subject,
        body: newCampaignForm.message,
      });
      setShowCreateCampaignModal(false);
      setNewCampaignForm({ name: '', channel: 'zalo', segment: 'all', subject: '', message: '' });
      notify('Đã đưa chiến dịch vào hàng đợi gửi.');
      await loadCampaigns();
    } catch (e) {
      notify(errText(e));
    } finally {
      setCampaignBusy(false);
    }
  }
  useEffect(() => {
    if (flowPage === 'marketing') void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowPage]);

  // Bookings from the club (single source of truth), shown on the appointments page.
  const [appts, setAppts] = useState<
    { id: string; room: string; customer: string; phone: string; service: string; start: number; end: number; status: string }[]
  >([]);

  // Merge live customers, members, bookings & leads from Single Source of Truth APIs
  useEffect(() => {
    let active = true;
    const syncFromBackend = () => {
      Promise.all([
        call<{
          customers?: {
            id: string;
            code?: string;
            name: string;
            phone: string;
            email?: string;
            birthday?: string;
            visits?: number;
            spend?: number;
            points?: number;
          }[];
        }>('/api/crm2/care-customers').catch(() => ({ customers: [] })),
        call<{
          customers?: {
            id: string;
            code?: string;
            name: string;
            phone: string;
            note?: string;
            points?: number;
          }[];
        }>('/api/members?q=').catch(() => ({ customers: [] })),
        call<{
          config?: {
            tierThresholds?: { gold: number; platinum: number; diamond: number };
          };
          bookings?: {
            id: string;
            room: string;
            customer: string;
            phone: string;
            service: string;
            start: number;
            end: number;
            status: string;
            amount: number | null;
            payment: string | null;
          }[];
        }>('/api/club').catch(() => ({ config: undefined, bookings: [] })),
      ]).then(([careRes, memRes, clubRes]) => {
        if (!active) return;
        const goldTh = clubRes.config?.tierThresholds?.gold ?? 20_000_000;
        const platTh = clubRes.config?.tierThresholds?.platinum ?? 50_000_000;
        const diaTh = clubRes.config?.tierThresholds?.diamond ?? 100_000_000;
        const allBookings = clubRes.bookings ?? [];
        setAppts(allBookings);

        const mergedRaw = new Map<
          string,
          {
            id: string;
            code?: string;
            name: string;
            phone: string;
            email?: string;
            birthday?: string;
            visits?: number;
            spend?: number;
            points?: number;
            note?: string;
            marketing_consent?: number;
          }
        >();

        for (const c of careRes.customers ?? []) {
          const norm = (c.phone || '').replace(/\D+/g, '');
          if (norm) mergedRaw.set(norm, { ...c });
        }
        for (const m of memRes.customers ?? []) {
          const norm = (m.phone || '').replace(/\D+/g, '');
          if (!norm) continue;
          const prev = mergedRaw.get(norm);
          mergedRaw.set(norm, {
            id: prev?.id || m.id,
            code: prev?.code || m.code,
            name: m.name || prev?.name || 'Khách hàng',
            phone: m.phone || prev?.phone || '',
            email: prev?.email,
            birthday: prev?.birthday,
            visits: prev?.visits,
            spend: prev?.spend,
            points: Math.max(m.points ?? 0, prev?.points ?? 0),
            note: m.note || prev?.note,
          });
        }

        if (mergedRaw.size === 0 && allBookings.length === 0) return;

        setCustomers((prev) => {
          // Also enrich existing customers with live booking history & transactions if phone matches
          const updatedPrev = prev.map((cust) => {
            const norm = cust.phone.replace(/\D+/g, '');
            const raw = mergedRaw.get(norm);
            const nextConsent = raw?.marketing_consent !== undefined ? raw.marketing_consent !== 0 : cust.marketingConsent;
            const custBookings = allBookings.filter(
              (b) => b.phone && b.phone.replace(/\D+/g, '') === norm,
            );
            if (!custBookings.length) {
              return raw ? { ...cust, marketingConsent: nextConsent ?? true } : cust;
            }
            const liveHistory: CustomerBookingRecord[] = custBookings.slice(0, 15).map((b) => {
              const d = new Date(b.start);
              const e = new Date(b.end);
              const durHrs = Math.max(0.5, Math.round(((b.end - b.start) / 3600000) * 10) / 10);
              return {
                id: b.id,
                date: d.toLocaleDateString('vi-VN'),
                time: `${d.toTimeString().slice(0, 5)} – ${e.toTimeString().slice(0, 5)}`,
                line: b.room.toUpperCase(),
                service: b.service === 'gdr' ? 'Luyện tập theo giờ' : `Game ${b.service} hố`,
                duration: `${durHrs} giờ`,
                amount: b.amount ?? 0,
                status:
                  b.status === 'cancelled'
                    ? 'Đã hủy'
                    : b.status === 'paid' || b.status === 'finished'
                      ? 'Hoàn tất'
                      : 'Đang đặt',
              };
            });
            return {
              ...cust,
              marketingConsent: nextConsent ?? true,
              bookingHistory: liveHistory.length ? liveHistory : cust.bookingHistory,
            };
          });

          const existingPhones = new Set(updatedPrev.map((c) => c.phone.replace(/\D+/g, '')));
          const extra: CustomerRecord[] = [];
          for (const [norm, raw] of mergedRaw.entries()) {
            if (!existingPhones.has(norm) && raw.name) {
              existingPhones.add(norm);
              const custBookings = allBookings.filter(
                (b) => b.phone && b.phone.replace(/\D+/g, '') === norm,
              );
              const calcSpend =
                raw.spend ??
                custBookings
                  .filter((b) => b.status === 'paid' || b.status === 'finished')
                  .reduce((s, b) => s + (b.amount ?? 0), 0);
              const tier: TierKind =
                calcSpend >= diaTh
                  ? 'vip'
                  : calcSpend >= platTh
                    ? 'platinum'
                    : calcSpend >= goldTh
                      ? 'gold'
                      : calcSpend > 0
                        ? 'silver'
                        : 'none';
              extra.push({
                id: raw.id,
                code: raw.code || `KH${raw.id.slice(-6).toUpperCase()}`,
                marketingConsent: raw.marketing_consent !== undefined ? raw.marketing_consent !== 0 : true,
                memberCode: 'Chưa cấp thẻ',
                name: raw.name,
                gender: '',
                phone: raw.phone,
                email: raw.email || '',
                birthday: raw.birthday || '',
                age: 0,
                address: '',
                avatar: '',
                tier,
                status: 'active',
                segment: tier !== 'none' ? ['member'] : ['lead'],
                source: 'POS / Đặt sân',
                lastDate: custBookings.length ? new Date(Math.max(...custBookings.map((b) => b.start))).toLocaleDateString('vi-VN') : '',
                lastAction: custBookings.length ? 'Đặt sân / Chơi golf' : '',
                memberDaysLeft: 0,
                memberStart: '',
                memberEnd: '',
                memberProgress: 0,
                discountPercent: 0,
                pointMultiplier: '',
                stats: {
                  bookings: custBookings.length,
                  bookingsDelta: '',
                  hours: `${(custBookings.reduce((h, b) => h + (b.end - b.start) / 3600000, 0)).toFixed(1).replace('.', ',')} giờ`,
                  hoursDelta: '',
                  spend: calcSpend,
                  spendDelta: '',
                  points: raw.points ?? 0,
                },
                tags: [],
                internalNote: raw.note || '',
                timeline: [],
                tasks: [],
                bookingHistory: custBookings.slice(0, 15).map((b) => {
                  const d = new Date(b.start);
                  const e = new Date(b.end);
                  const durHrs = Math.max(0.5, Math.round(((b.end - b.start) / 3600000) * 10) / 10);
                  return {
                    id: b.id,
                    date: d.toLocaleDateString('vi-VN'),
                    time: `${d.toTimeString().slice(0, 5)} – ${e.toTimeString().slice(0, 5)}`,
                    line: b.room.toUpperCase(),
                    service: b.service === 'gdr' ? 'Luyện tập theo giờ' : `Game ${b.service} hố`,
                    duration: `${durHrs} giờ`,
                    amount: b.amount ?? 0,
                    status:
                      b.status === 'cancelled'
                        ? 'Đã hủy'
                        : b.status === 'paid' || b.status === 'finished'
                          ? 'Hoàn tất'
                          : 'Đang đặt',
                  };
                }),
                transactions: [],
                opportunities: [],
              });
            }
          }
          return extra.length ? [...updatedPrev, ...extra] : updatedPrev;
        });
      });

      call<{
        leads?: {
          id: string;
          fullName: string;
          phone: string;
          email: string;
          source: string;
          targetService: string;
          stage: string;
          notes: string;
        }[];
      }>('/api/crm2/leads')
        .then((res) => {
          if (!active || !res.leads?.length) return;
          setLeadsList((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const extra = (res.leads ?? [])
              .filter((l) => !existingIds.has(l.id) && l.fullName)
              .map((l) => ({
                id: l.id,
                fullName: l.fullName,
                phone: l.phone || '',
                email: l.email || '',
                source: l.source || '',
                targetService: l.targetService || '',
                stage: l.stage === 'WON' ? 'Đã chốt' : 'Mới tiếp nhận',
                notes: l.notes || '',
                created: '',
              }));
            return extra.length ? [...extra, ...prev] : prev;
          });
        })
        .catch(() => undefined);
    };

    syncFromBackend();
    window.addEventListener('sigolf:data-sync', syncFromBackend);
    return () => {
      active = false;
      window.removeEventListener('sigolf:data-sync', syncFromBackend);
    };
  }, []);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [segmentFilter, listSearch, globalSearch, statusFilter, tierFilter, sourceFilter]);

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

  const PAGE_SIZE = 8;
  const pagedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  // Counts come from the customers actually loaded, never typed in.
  const segmentTabs = useMemo(() => {
    const n = (k: Exclude<SegmentFilter, 'all'>) => customers.filter((c) => c.segment.includes(k)).length;
    return [
      { key: 'all', label: `Tất cả khách hàng (${customers.length})` },
      { key: 'member', label: `Hội viên (${n('member')})` },
      { key: 'lead', label: `Khách tiềm năng (${n('lead')})` },
      { key: 'corp', label: `Khách doanh nghiệp (${n('corp')})` },
      { key: 'vip', label: `Khách VIP (${n('vip')})` },
    ];
  }, [customers]);

  const activeCustomer = useMemo(
    () =>
      filteredCustomers.find((c) => c.id === selectedId) ??
      filteredCustomers[0] ??
      customers.find((c) => c.id === selectedId) ??
      customers[0],
    [filteredCustomers, customers, selectedId],
  );

  // Dynamic KPI Stats based on selected activityRange ('30d' | '90d' | 'year')
  const displayedStats = useMemo(() => {
    if (!activeCustomer) {
      return {
        bookings: 0,
        bookingsDelta: '+0%',
        hours: '0 giờ',
        hoursDelta: '+0%',
        spend: 0,
        spendDelta: '+0%',
        points: 0,
      };
    }
    return activeCustomer.stats;
  }, [activeCustomer]);

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
    if (!requirePerm(canWork, 'Chỉnh sửa hồ sơ khách hàng')) return;
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
    if (!requirePerm(canWork, 'Cập nhật thông tin khách hàng')) return;
    const cleanPhone = editProfileForm.phone.trim();
    const cleanEmail = editProfileForm.email.trim();
    const cleanBday = editProfileForm.birthday.trim();
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      notify('Số điện thoại không hợp lệ (cần 8–15 chữ số)!');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      notify('Địa chỉ Email không đúng định dạng!');
      return;
    }
    if (cleanBday && !isValidDateStr(cleanBday)) {
      notify('Ngày sinh cần nhập theo định dạng DD/MM/YYYY!');
      return;
    }
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              phone: cleanPhone || c.phone,
              email: cleanEmail || c.email,
              birthday: cleanBday || c.birthday,
              gender: editProfileForm.gender,
              address: editProfileForm.address.trim().slice(0, 250) || c.address,
            }
          : c,
      ),
    );
    try {
      await call('/api/crm2/care-customers', {
        customerId: activeCustomer.id,
        action: 'contact-set',
        email: cleanEmail,
        zaloId: '',
      });
      if (cleanBday) {
        await call('/api/crm2/care-customers', {
          customerId: activeCustomer.id,
          action: 'birthday-set',
          birthday: cleanBday,
        });
      }
    } catch {
      /* fallback local state */
    }
    setShowEditProfileModal(false);
    notify('Đã cập nhật thông tin cơ bản của khách hàng!');
  }

  function openEditTags() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Chỉnh sửa sở thích & ghi chú')) return;
    setEditTagsForm({
      tagsText: activeCustomer.tags.join(', '),
      note: activeCustomer.internalNote,
    });
    setShowEditTagsModal(true);
  }

  function handleSaveTags() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Lưu sở thích & ghi chú nội bộ')) return;
    const parsedTags = editTagsForm.tagsText
      .split(',')
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 15);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              tags: parsedTags.length ? parsedTags : c.tags,
              internalNote: editTagsForm.note.trim().slice(0, 1000) || c.internalNote,
            }
          : c,
      ),
    );
    setShowEditTagsModal(false);
    notify('Đã lưu sở thích & ghi chú nội bộ!');
  }

  async function handleAddTimelineNote() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Thêm lịch sử tương tác')) return;
    const text = quickNoteText.trim().slice(0, 800);
    if (!text) {
      notify('Vui lòng nhập nội dung tương tác trước khi lưu!');
      return;
    }
    const titleMap: Record<'call' | 'zalo' | 'email' | 'note', string> = {
      call: 'Gọi điện tư vấn',
      zalo: 'Nhắn tin Zalo',
      email: 'Gửi email',
      note: 'Ghi chú',
    };
    const newEntry: TimelineEntry = {
      id: uid('tl'),
      kind: quickNoteChannel,
      timeLabel: 'Vừa xong',
      title: titleMap[quickNoteChannel],
      desc: text,
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
        content: text,
      });
    } catch {
      /* local timeline updated */
    }
    setQuickNoteText('');
    notify('Đã thêm lịch sử tương tác mới!');
  }

  async function handleToggleConsent() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Thay đổi trạng thái tiếp thị')) return;
    const nextConsent = activeCustomer.marketingConsent === false;
    try {
      await call('/api/crm2/care-customers', {
        action: 'consent-set',
        customerId: activeCustomer.id,
        consent: nextConsent,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeCustomer.id ? { ...c, marketingConsent: nextConsent } : c,
        ),
      );
      notify(
        nextConsent
          ? 'Đã kích hoạt đồng ý nhận tin cho khách hàng'
          : 'Đã chuyển sang từ chối nhận tin (Opt-out)',
      );
    } catch (e) {
      notify(errText(e));
    }
  }

  async function handleReconcileCustomer() {
    if (!activeCustomer) return;
    setIsReconciling(true);
    try {
      const res = await call<{
        ok: boolean;
        report: {
          pos: { netSpend: number; transactionCount: number };
          booking: { completedSessions: number; totalHoursPlayed: number };
          membership: { walletBalance: number; loyaltyPoints: number };
        };
      }>('/api/crm2/sync', {
        action: 'reconcile',
        customerId: activeCustomer.id,
      });
      if (res?.report) {
        const r = res.report;
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === activeCustomer.id
              ? {
                  ...c,
                  stats: {
                    ...c.stats,
                    spend: r.pos.netSpend,
                    bookings: r.booking.completedSessions,
                    hours: `${String(r.booking.totalHoursPlayed).replace('.', ',')} giờ`,
                    points: r.membership.loyaltyPoints,
                  },
                }
              : c,
          ),
        );
        notify(
          `Đối soát thành công: POS (${money(r.pos.netSpend)} / ${r.pos.transactionCount} GD), Booking (${r.booking.completedSessions} buổi / ${r.booking.totalHoursPlayed}h), Điểm thưởng (${r.membership.loyaltyPoints}).`,
        );
      }
    } catch (e) {
      notify(errText(e));
    } finally {
      setIsReconciling(false);
    }
  }

  function handleToggleTask(taskId: string) {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Cập nhật trạng thái công việc')) return;
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
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Tạo công việc & lịch hẹn')) return;
    const title = newTaskForm.title.trim().slice(0, 150);
    if (title.length < 2) {
      notify('Vui lòng nhập tiêu đề công việc (tối thiểu 2 ký tự)!');
      return;
    }
    const due = newTaskForm.dueDate.trim();
    if (!isValidDateStr(due)) {
      notify('Ngày hạn thực hiện cần đúng định dạng DD/MM/YYYY!');
      return;
    }
    const newTask: CustomerTask = {
      id: uid('tk'),
      title,
      dueDate: due,
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
        title,
        days: 3,
      });
    } catch {
      /* local task added */
    }
    setNewTaskForm({ title: '', dueDate: '' });
    setShowAddTaskModal(false);
    notify('Đã tạo công việc & lịch hẹn mới!');
  }

  async function handleCreateCustomer() {
    if (!requirePerm(canWork, 'Tạo hồ sơ khách hàng mới')) return;
    const cleanName = newCustForm.name.trim().slice(0, 100);
    const cleanPhone = newCustForm.phone.trim();
    const cleanEmail = newCustForm.email.trim();
    const cleanBday = newCustForm.birthday.trim();
    if (cleanName.length < 2) {
      notify('Vui lòng nhập họ và tên khách hàng (tối thiểu 2 ký tự)!');
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      notify('Số điện thoại không hợp lệ (cần từ 8 đến 15 chữ số)!');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      notify('Địa chỉ Email không đúng định dạng!');
      return;
    }
    if (cleanBday && !isValidDateStr(cleanBday)) {
      notify('Ngày sinh cần đúng định dạng DD/MM/YYYY!');
      return;
    }

    // Identity Resolution: Anti-duplicate verification check
    try {
      const dupCheck = await call<{
        isDuplicate?: boolean;
        confidence?: string;
        reason?: string;
        matchedCustomer?: { id: string; name: string; code: string; phone: string };
      }>('/api/crm2/identity', {
        action: 'check-duplicates',
        phone: cleanPhone,
        email: cleanEmail,
      });

      if (dupCheck.isDuplicate && dupCheck.matchedCustomer) {
        notify(
          `Cảnh báo trùng lặp: SĐT/Email đã thuộc về khách hàng ${dupCheck.matchedCustomer.name} (Mã: ${dupCheck.matchedCustomer.code}). Hệ thống không cho phép tạo trùng lặp!`,
        );
        const existing = customers.find(
          (c) =>
            c.id === dupCheck.matchedCustomer?.id ||
            c.phone.replace(/\D+/g, '') === cleanPhone.replace(/\D+/g, ''),
        );
        if (existing) {
          setSelectedId(existing.id);
          setShowCreateCustomerModal(false);
        }
        return;
      }
    } catch {
      /* continue if identity service busy */
    }

    let id = uid('cust');
    let code = '';
    try {
      const res = await call<{ id?: string; code?: string }>('/api/crm2/care-customers', {
        action: 'customer-create',
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        birthday: cleanBday,
        note: `Nguồn: ${newCustForm.source}`,
      });
      if (res.id) id = res.id;
      if (res.code) code = res.code;
    } catch {
      /* fallback local id */
    }
    try {
      const memRes = await call<{ ok?: boolean; id?: string; code?: string }>('/api/members', {
        action: 'customer-create',
        name: cleanName,
        phone: cleanPhone,
        note: `Nguồn CRM: ${newCustForm.source}`,
      });
      if (memRes.code && !code) code = memRes.code;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
      }
    } catch {
      /* already exists in members table */
    }
    if (!code) code = 'KH' + String(customers.length + 1).padStart(6, '0');
    const created: CustomerRecord = {
      id,
      code,
      memberCode: 'Chưa cấp thẻ',
      name: cleanName,
      gender: newCustForm.gender,
      phone: cleanPhone,
      email: cleanEmail,
      birthday: cleanBday,
      age: 0,
      address: newCustForm.address.trim().slice(0, 250),
      avatar: '',
      tier: newCustForm.tier,
      status: 'active',
      segment: newCustForm.tier !== 'none' ? ['member'] : ['lead'],
      source: newCustForm.source,
      lastDate: 'Hôm nay',
      lastAction: 'Tạo mới',
      memberDaysLeft: 0,
      memberStart: '',
      memberEnd: '',
      memberProgress: 0,
      discountPercent: 0,
      pointMultiplier: '',
      stats: {
        bookings: 0,
        bookingsDelta: '',
        hours: '0 giờ',
        hoursDelta: '',
        spend: 0,
        spendDelta: '',
        points: 0,
      },
      tags: [],
      internalNote: '',
      timeline: [
        {
          id: uid('tl-init'),
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
      birthday: '',
      address: '',
      tier: 'none',
      source: 'Walk-in',
    });
    notify(`Đã tạo hồ sơ khách hàng ${created.name} (${created.code})!`);
  }

  function handleRenewOrUpgrade() {
    if (!activeCustomer || !showRenewModal) return;
    if (!requirePerm(canMember, 'Gia hạn / Nâng hạng thẻ hội viên')) return;
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
                  id: uid('tl-mem'),
                  kind: 'booking',
                  timeLabel: 'Vừa xong',
                  statusBadge: 'Hoàn tất',
                  title: isUpgrade
                    ? `Nâng hạng hội viên lên ${nextTier.toUpperCase()}`
                    : 'Gia hạn thẻ hội viên (+90 ngày)',
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
    if (!requirePerm(canWork, 'Thêm Lead tiềm năng')) return;
    const cleanName = newLeadForm.fullName.trim().slice(0, 100);
    const cleanPhone = newLeadForm.phone.trim();
    const cleanEmail = newLeadForm.email.trim();
    if (cleanName.length < 2) {
      notify('Vui lòng nhập họ tên Lead (tối thiểu 2 ký tự)!');
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      notify('Số điện thoại Lead không hợp lệ (cần 8–15 chữ số)!');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      notify('Email Lead không đúng định dạng!');
      return;
    }
    const item = {
      id: uid('ld'),
      fullName: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      source: newLeadForm.source,
      targetService: newLeadForm.targetService.trim().slice(0, 200) || 'Thẻ Hội viên Gold',
      stage: 'Mới tiếp nhận',
      notes: newLeadForm.notes.trim().slice(0, 1000) || 'Đang chờ liên hệ tư vấn',
      created: 'Vừa xong',
    };
    setLeadsList((prev) => [item, ...prev]);
    try {
      await call('/api/crm2/leads', {
        action: 'create',
        fullName: item.fullName,
        phone: item.phone,
        email: item.email,
        source: item.source,
        targetService: item.targetService,
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

  async function handleConvertLeadToCustomer(ld: (typeof leadsList)[number]) {
    if (!requirePerm(canWork, 'Chuyển đổi Lead thành Khách hàng')) return;
    let id = uid('cust-conv');
    try {
      const res = await call<{ id?: string }>('/api/crm2/care-customers', {
        action: 'customer-create',
        name: ld.fullName,
        phone: ld.phone,
        email: ld.email,
        note: `Chuyển đổi từ Lead (${ld.source}) - ${ld.targetService}`,
      });
      if (res.id) id = res.id;
    } catch {
      /* fallback local id */
    }
    const newCust: CustomerRecord = {
      id,
      code: 'KH00' + Math.floor(2000 + Math.random() * 7000),
      memberCode: 'Chưa cấp thẻ',
      name: ld.fullName,
      gender: '',
      phone: ld.phone,
      email: ld.email,
      birthday: '',
      age: 0,
      address: '',
      avatar: '',
      tier: 'none',
      status: 'active',
      segment: ['member', 'lead'],
      source: ld.source,
      lastDate: 'Hôm nay',
      lastAction: 'Chuyển đổi Lead',
      memberDaysLeft: 0,
      memberStart: '',
      memberEnd: '',
      memberProgress: 0,
      discountPercent: 0,
      pointMultiplier: '',
      stats: {
        bookings: 0,
        bookingsDelta: '',
        hours: '0 giờ',
        hoursDelta: '',
        spend: 0,
        spendDelta: '',
        points: 0,
      },
      tags: ld.targetService ? ['Chuyển đổi từ Lead', ld.targetService] : ['Chuyển đổi từ Lead'],
      internalNote: ld.notes,
      timeline: [
        {
          id: uid('tl-conv'),
          kind: 'note',
          timeLabel: 'Vừa xong',
          title: 'Chuyển đổi từ Lead tiềm năng',
          desc: ld.targetService ? `Dịch vụ quan tâm: ${ld.targetService}` : `Nguồn: ${ld.source}`,
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
    switchFlowPage('customers');
    notify(`Đã chuyển đổi "${ld.fullName}" sang Hồ sơ Khách hàng chính thức!`);
  }

  function handleCreateDeal() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Tạo cơ hội bán hàng')) return;
    const cleanTitle = newDealForm.title.trim().slice(0, 150);
    if (cleanTitle.length < 2) {
      notify('Vui lòng nhập tên cơ hội bán hàng!');
      return;
    }
    const rawValue = Number(newDealForm.value.replace(/\D/g, ''));
    if (!Number.isFinite(rawValue) || rawValue <= 0 || rawValue > 10_000_000_000) {
      notify('Giá trị cơ hội bán hàng phải lớn hơn 0 ₫!');
      return;
    }
    const deal: CustomerOpportunity = {
      id: uid('op'),
      title: cleanTitle,
      stage: newDealForm.stage,
      value: rawValue,
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
      value: '',
      stage: 'Báo giá',
      expectedClose: '',
    });
    notify('Đã tạo cơ hội bán hàng mới!');
  }

  // =========================================================================
  // QUICK ACTIONS HANDLERS (MỤC 4 CRM: Gọi, Zalo, Email, Đặt sân, Nạp ví, Gia hạn, Tạo cơ hội, Tạo nhắc hẹn)
  // =========================================================================
  function handleAddCareInteraction(
    channel: 'call' | 'zalo' | 'email' | 'note',
    title: string,
    desc?: string,
  ) {
    if (!activeCustomer) return;
    const newEntry: TimelineEntry = {
      id: uid('tl'),
      kind: channel,
      timeLabel: 'Vừa xong',
      title,
      desc: desc || title,
    };
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === activeCustomer.id
          ? {
              ...c,
              timeline: [newEntry, ...c.timeline],
            }
          : c,
      ),
    );
    call('/api/crm2/care-customers', {
      customerId: activeCustomer.id,
      action: 'note-add',
      channel,
      content: `${title} - ${desc || ''}`.trim(),
    }).catch(() => {});
  }

  function handleQuickCall(customer: CustomerRecord) {
    if (!customer.phone) {
      notify('Khách hàng chưa có số điện thoại!');
      return;
    }
    handleAddCareInteraction('call', 'Gọi điện thoại cho khách', `Cuộc gọi tới số ${customer.phone}`);
    window.open(`tel:${safeHrefPhone(customer.phone)}`, '_self');
    notify(`Đang kết nối cuộc gọi tới ${customer.phone}...`);
  }

  function handleQuickZalo(customer: CustomerRecord) {
    if (!customer.phone) {
      notify('Khách hàng chưa có số điện thoại!');
      return;
    }
    handleAddCareInteraction('zalo', 'Nhắn tin qua Zalo', `Mở liên hệ Zalo số ${customer.phone}`);
    window.open(`https://zalo.me/${safeHrefPhone(customer.phone).replace(/\+/g, '')}`, '_blank', 'noopener,noreferrer');
    notify(`Đã mở cuộc trò chuyện Zalo với ${customer.name}`);
  }

  function handleQuickEmail(customer: CustomerRecord) {
    if (!customer.email) {
      notify('Khách hàng chưa có email trong hồ sơ!');
      return;
    }
    handleAddCareInteraction('email', 'Gửi email cho khách', `Gửi thư tới ${customer.email}`);
    window.open(`mailto:${safeHrefEmail(customer.email)}`, '_blank');
    notify(`Đang mở trình gửi email tới ${customer.email}`);
  }

  function handleOpenBooking(customer: CustomerRecord) {
    if (!requirePerm(canBook, 'Đặt sân')) return;
    if (onNavigate) {
      onNavigate('booking', { customerId: customer.id, phone: customer.phone, name: customer.name });
    } else {
      setBookingDate(new Date().toISOString().slice(0, 10));
      setBookingTime('18:30');
      setBookingDuration(90);
      setBookingNote(`Đặt sân cho ${customer.name} (${customer.phone})`);
      setShowQuickBookingModal(true);
    }
  }

  function handleOpenTopup(customer: CustomerRecord) {
    if (!requirePerm(canTopup, 'Nạp tiền vào ví')) return;
    setTopupAmount(1_000_000);
    setTopupMethod('transfer');
    setTopupNote(`Nạp ví cho khách hàng ${customer.name}`);
    setShowTopupModal(true);
  }

  function handleOpenRenew(customer: CustomerRecord) {
    if (!requirePerm(canRenew, 'Gia hạn thẻ hội viên')) return;
    setShowRenewModal('renew');
  }

  function handleOpenCreateDeal(customer: CustomerRecord) {
    if (!requirePerm(canWork, 'Tạo cơ hội bán hàng')) return;
    setNewDealForm({
      title: `Gói hội viên cho ${customer.name}`,
      value: '15000000',
      stage: 'Báo giá',
      expectedClose: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    });
    setShowCreateDealModal(true);
  }

  function handleOpenCreateAppt(customer: CustomerRecord) {
    if (!requirePerm(canWork, 'Tạo lịch hẹn & Nhắc hẹn')) return;
    setApptService('Tập trải nghiệm & Thử gậy');
    setApptDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setApptTime('09:00');
    setApptAssignee('Trần Văn An');
    setApptNote(`Nhắc hẹn chăm sóc khách hàng ${customer.name}`);
    setShowCreateApptModal(true);
  }

  function handleOpenCreateTask(customer: CustomerRecord) {
    if (!requirePerm(canWork, 'Tạo công việc')) return;
    setNewTaskForm({
      title: `Chăm sóc khách hàng ${customer.name}`,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    });
    setShowAddTaskModal(true);
  }

  function handleOpenSendPromo(customer: CustomerRecord) {
    if (!requirePerm(canWork, 'Gửi ưu đãi')) return;
    setNewCampaignForm({
      name: `Ưu đãi tri ân khách hàng ${customer.name}`,
      segment: customer.segment[0] ? (customer.segment[0] as CampaignSegment) : 'all',
      channel: 'zalo',
      subject: `Ưu đãi tri ân dành riêng cho ${customer.name}`,
      message: `Chào anh/chị ${customer.name}, Saigon Indoor Golf gửi tặng anh/chị ưu đãi đặc biệt trong tuần này...`,
    });
    setShowCreateCampaignModal(true);
  }

  async function handleExecuteTopup() {
    if (!activeCustomer) return;
    if (!requirePerm(canTopup, 'Nạp tiền vào ví')) return;
    if (topupAmount <= 0) {
      notify('Vui lòng chọn hoặc nhập số tiền nạp hợp lệ!');
      return;
    }
    setTopupBusy(true);
    try {
      await call('/api/members', {
        action: 'wallet-topup',
        customerId: activeCustomer.id,
        amount: topupAmount,
        method: topupMethod,
        requestId: uid('wtop'),
      }).catch(() => {});
      const newTx: CustomerTransactionRecord = {
        id: uid('tx'),
        code: `TOPUP-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('vi-VN'),
        description: `Nạp tiền vào ví / tài khoản hội viên${topupNote ? ` (${topupNote})` : ''}`,
        method: topupMethod === 'transfer' ? 'Chuyển khoản SePay' : topupMethod === 'card' ? 'Thẻ POS' : 'Tiền mặt',
        amount: topupAmount,
      };
      const newEntry: TimelineEntry = {
        id: uid('tl'),
        kind: 'note',
        timeLabel: 'Vừa xong',
        title: `Nạp ví: ${money(topupAmount)}`,
        desc: `Phương thức: ${newTx.method}. ${topupNote ? `Ghi chú: ${topupNote}` : ''}`,
      };
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeCustomer.id
            ? {
                ...c,
                stats: {
                  ...c.stats,
                  spend: c.stats.spend + topupAmount,
                  points: c.stats.points + Math.round(topupAmount / 10000),
                },
                transactions: [newTx, ...c.transactions],
                timeline: [newEntry, ...c.timeline],
              }
            : c,
        ),
      );
      notify(`Đã nạp thành công ${money(topupAmount)} vào tài khoản khách hàng!`);
      setShowTopupModal(false);
      setTopupNote('');
    } catch (e) {
      notify(`Lỗi nạp ví: ${e instanceof Error ? e.message : 'Chưa thể thực hiện giao dịch'}`);
    } finally {
      setTopupBusy(false);
    }
  }

  async function handleExecuteQuickBooking() {
    if (!activeCustomer) return;
    if (!requirePerm(canBook, 'Đặt lịch chơi')) return;
    setBookingBusy(true);
    try {
      const serviceName = bookingService === 'gdr' ? 'Luyện tập theo giờ' : `Game ${bookingService} hố`;
      const newBooking: CustomerBookingRecord = {
        id: uid('bk'),
        date: bookingDate,
        time: `${bookingTime} (${bookingDuration} phút)`,
        line: bookingLine,
        service: serviceName,
        duration: `${bookingDuration} phút`,
        amount: bookingService === 'gdr' ? Math.round((bookingDuration / 60) * 200_000) : bookingService === '9' ? 300_000 : 450_000,
        status: 'Đang đặt',
      };
      const newEntry: TimelineEntry = {
        id: uid('tl'),
        kind: 'booking',
        timeLabel: 'Vừa xong',
        title: `Đặt sân ${bookingLine} – ${serviceName}`,
        desc: `Lịch chơi: ${bookingTime} ngày ${bookingDate}. Thời lượng: ${bookingDuration} phút. ${bookingNote ? `Ghi chú: ${bookingNote}` : ''}`,
        statusBadge: 'Đã xác nhận',
      };
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeCustomer.id
            ? {
                ...c,
                stats: {
                  ...c.stats,
                  bookings: c.stats.bookings + 1,
                },
                bookingHistory: [newBooking, ...c.bookingHistory],
                timeline: [newEntry, ...c.timeline],
              }
            : c,
        ),
      );
      notify(`Đã đặt lịch sân ${bookingLine} cho khách ${activeCustomer.name}!`);
      setShowQuickBookingModal(false);
      setBookingNote('');
    } catch (e) {
      notify(`Lỗi đặt sân: ${e instanceof Error ? e.message : 'Chưa thể tạo lịch'}`);
    } finally {
      setBookingBusy(false);
    }
  }

  async function handleExecuteCreateAppt() {
    if (!activeCustomer) return;
    if (!requirePerm(canWork, 'Tạo lịch hẹn & Nhắc hẹn')) return;
    setApptBusy(true);
    try {
      const atMs = new Date(`${apptDate}T${apptTime}:00`).getTime() || Date.now() + 86400000;
      await call('/api/crm2/appointments', {
        action: 'create',
        leadId: activeCustomer.id,
        at: atMs,
        service: apptService,
        note: apptNote || `Lịch hẹn với khách ${activeCustomer.name}`,
      }).catch(() => {});
      const newTask: CustomerTask = {
        id: uid('task'),
        title: `Nhắc hẹn: ${apptService} (${apptTime} ${apptDate})`,
        dueDate: apptDate,
        done: false,
      };
      const newEntry: TimelineEntry = {
        id: uid('tl'),
        kind: 'call',
        timeLabel: 'Vừa xong',
        title: `Tạo nhắc hẹn: ${apptService}`,
        desc: `Hẹn lúc ${apptTime} ngày ${apptDate}. Phụ trách: ${apptAssignee}. ${apptNote ? `Ghi chú: ${apptNote}` : ''}`,
      };
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === activeCustomer.id
            ? {
                ...c,
                tasks: [newTask, ...c.tasks],
                timeline: [newEntry, ...c.timeline],
              }
            : c,
        ),
      );
      notify(`Đã tạo lịch hẹn và nhắc việc cho ${apptAssignee}!`);
      setShowCreateApptModal(false);
      setApptNote('');
    } catch (e) {
      notify(`Lỗi tạo lịch hẹn: ${e instanceof Error ? e.message : 'Chưa thể tạo lịch hẹn'}`);
    } finally {
      setApptBusy(false);
    }
  }

  async function handleOpenVerification() {
    if (!activeCustomer) return;
    setVerifyingBusy(true);
    setShowVerificationModal(true);
    try {
      const res = await call<{
        unlinkedBookings?: Array<{
          id: string;
          room: string;
          service: string;
          customer: string;
          phone: string;
          start: number;
          end: number;
          amount: number | null;
          status: string;
          created: number;
        }>;
        unlinkedLeads?: Array<{
          id: string;
          fullName: string;
          phone: string;
          email: string;
          source: string;
          targetService: string;
          stage: string;
          created: number;
        }>;
      }>(`/api/crm2/identity?customerId=${activeCustomer.id}`);
      setUnlinkedBookings(res.unlinkedBookings ?? []);
      setUnlinkedLeads(res.unlinkedLeads ?? []);
    } catch {
      notify('Chưa tải được danh sách đối soát liên kết');
    } finally {
      setVerifyingBusy(false);
    }
  }

  async function handleExecuteLink(recordType: 'booking' | 'lead', recordId: string) {
    if (!activeCustomer) return;
    setVerifyingBusy(true);
    try {
      await call('/api/crm2/identity', {
        action: 'link-record',
        customerId: activeCustomer.id,
        recordType,
        recordId,
        reason: linkReason || 'Xác nhận thông tin khách hàng trùng khớp',
        confirmed: true,
      });
      notify(
        `Đã xác minh và liên kết thành công ${recordType === 'booking' ? 'lượt đặt sân' : 'Lead'} vào hồ sơ!`,
      );
      if (recordType === 'booking') {
        setUnlinkedBookings((prev) => prev.filter((b) => b.id !== recordId));
      } else {
        setUnlinkedLeads((prev) => prev.filter((l) => l.id !== recordId));
      }
      setLinkReason('');
    } catch (e) {
      notify(`Lỗi liên kết: ${e instanceof Error ? e.message : 'Thao tác không thành công'}`);
    } finally {
      setVerifyingBusy(false);
    }
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
            borderRadius: 5,
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
            {leadsList.length > 0 && <span className="crm2-flow-badge">{leadsList.length}</span>}
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
            <span className="crm2-initials crm2-initials--admin" aria-hidden="true">
              A
            </span>
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
              {segmentTabs.map((seg) => (
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
                {pagedCustomers.map((cust) => {
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
                        <span className="crm2-avatar crm2-initials" aria-hidden="true">
                          {initialsOf(cust.name)}
                        </span>
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
                    {customers.length === 0
                      ? 'Chưa có khách hàng nào. Khách sẽ xuất hiện khi có đặt sân, hội viên hoặc được tạo mới.'
                      : 'Không tìm thấy khách hàng phù hợp bộ lọc.'}
                  </div>
                )}
              </div>

              <div className="crm2-list-footer">
                <span>
                  Hiển thị {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} trong {filteredCustomers.length}
                </span>
                <div className="crm2-pagination">
                  <button
                    type="button"
                    className="crm2-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1)
                    .map((p, i, arr) => (
                      <span key={p} style={{ display: 'contents' }}>
                        {i > 0 && p - arr[i - 1] > 1 && <span style={{ padding: '0 4px' }}>...</span>}
                        <button
                          type="button"
                          className={`crm2-page-btn ${currentPage === p ? 'active' : ''}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    type="button"
                    className="crm2-page-btn"
                    disabled={currentPage >= pageCount}
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------------------
                CENTER COLUMN: HỒ SƠ KHÁCH HÀNG 360°
                --------------------------------------------------------------- */}
            {!activeCustomer && (
              <div className="crm2-card crm2-profile-card" style={{ padding: 28, color: '#64748b' }}>
                Chọn hoặc tạo một khách hàng để xem hồ sơ.
              </div>
            )}
            {activeCustomer && (
              <div className="crm2-card crm2-profile-card">
                {/* Profile Header */}
                <div className="crm2-profile-top">
                  <div className="crm2-profile-identity">
                    <span className="crm2-profile-avatar crm2-initials" aria-hidden="true">
                      {initialsOf(activeCustomer.name)}
                    </span>
                    <div>
                      <div className="crm2-profile-name-row">
                        <h2>{activeCustomer.name}</h2>
                        {activeCustomer.gender && (
                          <span className="crm2-gender-icon">
                            {activeCustomer.gender === 'Nam' ? '♂' : '♀'}
                          </span>
                        )}
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

                  <div className="crm2-header-actions">
                    <button
                      type="button"
                      className="crm2-hdr-btn call"
                      title="Gọi điện cho khách hàng"
                      onClick={() => handleQuickCall(activeCustomer)}
                    >
                      <Phone size={15} />
                      <span>Gọi</span>
                    </button>
                    <button
                      type="button"
                      className="crm2-hdr-btn zalo"
                      title="Mở trò chuyện Zalo"
                      onClick={() => handleQuickZalo(activeCustomer)}
                    >
                      <MessageCircle size={15} />
                      <span>Zalo</span>
                    </button>
                    <button
                      type="button"
                      className="crm2-hdr-btn email"
                      title="Gửi email cho khách hàng"
                      onClick={() => handleQuickEmail(activeCustomer)}
                    >
                      <Mail size={15} />
                      <span>Email</span>
                    </button>
                    <button
                      type="button"
                      className="crm2-hdr-btn booking"
                      title="Đặt lịch sân 3D"
                      onClick={() => handleOpenBooking(activeCustomer)}
                    >
                      <Calendar size={15} />
                      <span>Đặt sân</span>
                    </button>
                    <button
                      type="button"
                      className="crm2-hdr-btn"
                      title="Đối soát & xác minh liên kết lượt chơi, Lead"
                      onClick={handleOpenVerification}
                    >
                      <Link2 size={15} />
                      <span>Đối soát liên kết</span>
                    </button>
                    <button
                      type="button"
                      className="crm2-hdr-btn crm2-hdr-btn-primary"
                      title="Tạo công việc phân công nhân viên"
                      onClick={() => handleOpenCreateTask(activeCustomer)}
                    >
                      <Plus size={15} />
                      <span>Tạo công việc</span>
                    </button>
                  </div>
                </div>

                {/* 9 Sub-tabs (1:1 with Master Design Image 9) */}
                <div className="crm2-subtabs-pillbar">
                  {[
                    { key: 'info', label: 'Tổng quan', icon: CalendarDays },
                    { key: 'journey', label: 'Hành trình', icon: Compass },
                    { key: 'bookings', label: 'Booking', icon: CalendarCheck },
                    { key: 'transactions', label: 'Giao dịch & POS', icon: Receipt },
                    { key: 'membership', label: 'Thẻ & Hội viên', icon: CreditCard },
                    { key: 'care', label: 'Chăm sóc', icon: PhoneCall },
                    { key: 'tasks', label: 'Công việc', icon: CheckSquare },
                    { key: 'notes', label: 'Ghi chú', icon: FileText },
                    { key: 'attachments', label: 'Tệp đính kèm', icon: Paperclip },
                  ].map((t) => {
                    const IconComp = t.icon;
                    const isActive = profileSubTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className={`crm2-pill-tab ${isActive ? 'active' : ''}`}
                        onClick={() => setProfileSubTab(t.key as ProfileSubTab)}
                      >
                        <IconComp size={14} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SUB-TAB 1: THÔNG TIN (1:1 WITH REFERENCE IMAGE) */}
                {profileSubTab === 'info' && (
                  <>
                    {/* Event Bus & Single Source of Truth Consistency Bar */}
                    <div className="crm2-consistency-bar">
                      <div className="crm2-consistency-sources">
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          Đồng bộ chuẩn 3 nguồn:
                        </span>
                        <span className="crm2-source-pill pos" title="Hóa đơn & giao dịch thu tiền từ POS">
                          <Receipt size={12} /> POS: Chuẩn giao dịch
                        </span>
                        <span className="crm2-source-pill booking" title="Phiên chơi & đặt line từ Booking">
                          <Calendar size={12} /> Booking: Chuẩn phiên chơi
                        </span>
                        <span className="crm2-source-pill membership" title="Gói tập & số dư ví từ Membership">
                          <CreditCard size={12} /> Membership: Chuẩn số dư & gói
                        </span>
                      </div>
                      <button
                        type="button"
                        className="crm2-reconcile-btn"
                        onClick={handleReconcileCustomer}
                        disabled={isReconciling}
                      >
                        <RotateCcw size={13} className={isReconciling ? 'crm-spin' : ''} />
                        {isReconciling ? 'Đang đối soát...' : 'Đối soát & Đồng bộ 360°'}
                      </button>
                    </div>

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
                          {activeCustomer.email && (
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <Mail size={14} /> Email
                            </span>
                            <span className="crm2-field-val">{activeCustomer.email}</span>
                          </div>
                          )}
                          {activeCustomer.birthday && (
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <Calendar size={14} /> Ngày sinh
                            </span>
                            <span className="crm2-field-val">
                              {activeCustomer.birthday}{activeCustomer.age > 0 ? ` (${activeCustomer.age} tuổi)` : ''}
                            </span>
                          </div>
                          )}
                          {activeCustomer.gender && (
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <User size={14} /> Giới tính
                            </span>
                            <span className="crm2-field-val">{activeCustomer.gender}</span>
                          </div>
                          )}
                          {activeCustomer.address && (
                          <div className="crm2-field-item">
                            <span className="crm2-field-label">
                              <MapPin size={14} /> Địa chỉ
                            </span>
                            <span className="crm2-field-val">{activeCustomer.address}</span>
                          </div>
                          )}
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

                          {activeCustomer.memberStart && (
                            <>
                              <div className="crm2-mem-dates">
                                Thời hạn: {activeCustomer.memberStart} – {activeCustomer.memberEnd}
                              </div>

                              <div className="crm2-progress-track">
                                <div
                                  className="crm2-progress-fill"
                                  style={{ width: `${activeCustomer.memberProgress}%` }}
                                />
                              </div>
                            </>
                          )}

                          {(activeCustomer.discountPercent > 0 || activeCustomer.pointMultiplier) && (
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
                          )}
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
                            <span className="crm2-kpi-val">{displayedStats.bookings}</span>
                            {displayedStats.bookingsDelta && (
                              <span className="crm2-kpi-delta">↑ {displayedStats.bookingsDelta}</span>
                            )}
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
                            <span className="crm2-kpi-val">{displayedStats.hours}</span>
                            {displayedStats.hoursDelta && (
                              <span className="crm2-kpi-delta">↑ {displayedStats.hoursDelta}</span>
                            )}
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
                            <span className="crm2-kpi-val">{money(displayedStats.spend)}</span>
                            {displayedStats.spendDelta && (
                              <span className="crm2-kpi-delta">↑ {displayedStats.spendDelta}</span>
                            )}
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
                              {displayedStats.points.toLocaleString('vi-VN')} điểm
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

                    {/* KHỐI HOẠT ĐỘNG NHANH (1:1 VỚI THIẾT KẾ MẪU ẢNH 9) */}
                    <div className="crm2-subbox" style={{ marginTop: 14 }}>
                      <div className="crm2-box-head">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#eab308' }}>⚡</span> Hoạt động nhanh
                        </h3>
                      </div>

                      <div className="crm2-quick-grid">
                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenBooking(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <Calendar size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Đặt sân</span>
                            <span className="crm2-tile-desc">Giữ line, đặt phòng 3D</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenTopup(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
                            <CreditCard size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Nạp tiền</span>
                            <span className="crm2-tile-desc">Ví & thẻ giờ tập</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenRenew(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
                            <Award size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Gia hạn thẻ</span>
                            <span className="crm2-tile-desc">Gói tháng, nâng hạng</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenCreateDeal(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                            <UserPlus size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Tạo cơ hội</span>
                            <span className="crm2-tile-desc">Pipeline bán hàng</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenCreateAppt(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            <Clock size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Tạo nhắc hẹn</span>
                            <span className="crm2-tile-desc">Lịch tư vấn, thử gậy</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="crm2-quick-tile"
                          onClick={() => handleOpenSendPromo(activeCustomer)}
                        >
                          <div className="crm2-tile-icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                            <Gift size={18} />
                          </div>
                          <div className="crm2-tile-text">
                            <span className="crm2-tile-title">Gửi ưu đãi</span>
                            <span className="crm2-tile-desc">Voucher Zalo/SMS</span>
                          </div>
                        </button>
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
                        onClick={() => handleOpenBooking(activeCustomer)}
                      >
                        <Calendar size={13} /> + Đặt sân mới
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
                      <div>
                        <h3>Lịch sử giao dịch & Hóa đơn POS</h3>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                          Tổng chi tiêu: {money(activeCustomer.stats.spend)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="crm2-btn-primary"
                        style={{ height: 32, fontSize: 12.5 }}
                        onClick={() => handleOpenTopup(activeCustomer)}
                      >
                        <CreditCard size={13} /> + Nạp tiền vào ví
                      </button>
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

                {/* SUB-TAB: HÀNH TRÌNH KHÁCH HÀNG */}
                {profileSubTab === 'journey' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Hành trình trải nghiệm khách hàng (Customer Journey)</h3>
                      <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>
                        ● Khách hàng thân thiết VIP
                      </span>
                    </div>

                    <div className="crm2-journey-stepper">
                      {[
                        {
                          step: 1,
                          title: `Tạo Lead từ ${activeCustomer.source || 'Facebook Ads'}`,
                          time: '05/09/2026, 09:20',
                          desc: 'Hệ thống tự động tiếp nhận lead và phân bổ nhân viên chăm sóc theo SLA 5 phút.',
                          completed: true,
                        },
                        {
                          step: 2,
                          title: 'Nhân viên phụ trách tiếp nhận tư vấn',
                          time: '05/09/2026, 09:25',
                          desc: 'Liên hệ tư vấn các gói tập và đặt lịch trải nghiệm sân 3D miễn phí 30 phút.',
                          completed: true,
                        },
                        {
                          step: 3,
                          title: 'Tư vấn & Đặt sân trải nghiệm',
                          time: '07/09/2026, 14:30',
                          desc: 'Lên lịch trải nghiệm tại Line 01 phòng VIP lúc 18:00.',
                          completed: true,
                        },
                        {
                          step: 4,
                          title: 'Check-in buổi tập đầu tiên tại cơ sở',
                          time: '07/09/2026, 18:00',
                          desc: 'Khách đến đúng giờ, trải nghiệm hệ thống phân tích cú đánh cảm biến và gậy thử.',
                          completed: true,
                        },
                        {
                          step: 5,
                          title: 'Mua Thẻ tháng 1 tháng',
                          time: '10/09/2026, 19:05',
                          desc: 'Thanh toán chuyển khoản SePay 3.000.000 đ. Kích hoạt quyền lợi Hội viên VIP.',
                          completed: true,
                        },
                        {
                          step: 6,
                          title: 'Tham gia Giải nội bộ SIGOLF Cup',
                          time: '21/10/2026, 08:00',
                          desc: 'Đăng ký thi đấu bảng Nam, hoàn tất 18 hố và đạt giải Phong trào.',
                          completed: true,
                        },
                        {
                          step: 7,
                          title: 'Gia hạn thẻ hội viên (Sắp tới)',
                          time: activeCustomer.memberEnd || '30/11/2026',
                          desc: 'Tự động tạo lịch nhắc gia hạn thẻ trước 7 ngày để nhân viên chăm sóc kịp thời.',
                          completed: false,
                        },
                      ].map((s) => (
                        <div
                          key={s.step}
                          className={`crm2-journey-step ${s.completed ? 'completed' : 'upcoming'}`}
                        >
                          <div className="crm2-journey-node">
                            {s.completed ? <Check size={16} /> : s.step}
                          </div>
                          <div className="crm2-journey-info">
                            <span className="crm2-journey-time">{s.time}</span>
                            <h4 className="crm2-journey-title">{s.title}</h4>
                            <p className="crm2-journey-desc" style={{ margin: 0 }}>
                              {s.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-TAB: CHĂM SÓC KHÁCH HÀNG */}
                {profileSubTab === 'care' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Nhật ký chăm sóc & CSAT khách hàng</h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="crm2-btn-secondary"
                          style={{ height: 32, fontSize: 12.5 }}
                          onClick={() => handleQuickCall(activeCustomer)}
                        >
                          <Phone size={13} /> Gọi chăm sóc
                        </button>
                        <button
                          type="button"
                          className="crm2-btn-secondary"
                          style={{ height: 32, fontSize: 12.5 }}
                          onClick={() => handleQuickZalo(activeCustomer)}
                        >
                          <MessageCircle size={13} /> Nhắn Zalo
                        </button>
                      </div>
                    </div>

                    {/* Consent status bar */}
                    <div className="crm2-consent-bar">
                      <div className="crm2-consent-status">
                        <span>Trạng thái tiếp thị & tự động hóa:</span>
                        <strong className={activeCustomer.marketingConsent !== false ? 'crm2-consent-status opted-in' : 'crm2-consent-status opted-out'}>
                          {activeCustomer.marketingConsent !== false ? '✓ Đồng ý nhận tin chăm sóc & ưu đãi' : '✕ Đã từ chối nhận tin tự động (Opt-out)'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        className="crm2-consent-btn"
                        onClick={handleToggleConsent}
                      >
                        {activeCustomer.marketingConsent !== false ? 'Chuyển sang Từ chối (Opt-out)' : 'Kích hoạt lại Đồng ý nhận tin'}
                      </button>
                    </div>

                    {/* Automation Engine status & rules */}
                    <div className="crm2-auto-grid">
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">SLA Phân bổ Lead 5 phút</div>
                          <div className="crm2-auto-timing">Báo động khi quá hạn 5p chưa liên hệ</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">Nhắc lịch trước 2 giờ</div>
                          <div className="crm2-auto-timing">Tự động nhắc lịch đặt phòng/line chơi</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
                          <Star size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">Chăm sóc sau chơi & CSAT</div>
                          <div className="crm2-auto-timing">Gửi khảo sát & hỏi thăm sau buổi chơi</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                          <Wallet size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">Cảnh báo ví ≤ 200.000đ</div>
                          <div className="crm2-auto-timing">Nhắc nạp ví để giữ ưu đãi giờ chơi</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">Nhắc thẻ hết hạn 7/3/1 ngày</div>
                          <div className="crm2-auto-timing">Đa mốc trước ngày hết hạn thẻ hội viên</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
                      <div className="crm2-auto-card">
                        <div className="crm2-auto-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <div className="crm2-auto-title">Giữ chân khách 7/14/30 ngày</div>
                          <div className="crm2-auto-timing">Kích hoạt kịch bản kéo khách ngủ đông</div>
                          <span className="crm2-auto-status">Đang tự động hóa</span>
                        </div>
                      </div>
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
                        <option value="call">Gọi điện</option>
                        <option value="zalo">Zalo</option>
                        <option value="email">Email</option>
                        <option value="note">Ghi chú</option>
                      </select>
                      <input
                        placeholder="Nhập nội dung tương tác chăm sóc khách hàng..."
                        value={quickNoteText}
                        onChange={(e) => setQuickNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTimelineNote()}
                      />
                      <button type="button" onClick={handleAddTimelineNote}>
                        Lưu tương tác
                      </button>
                    </div>

                    <div className="crm2-timeline">
                      {activeCustomer.timeline
                        .filter((t) => t.kind === 'call' || t.kind === 'zalo' || t.kind === 'email')
                        .map((item) => (
                          <div key={item.id} className="crm2-tl-item">
                            <div className={`crm2-tl-icon ${item.kind}`}>
                              {item.kind === 'call' ? <PhoneCall size={15} /> : item.kind === 'zalo' ? <MessageCircle size={15} /> : <Mail size={15} />}
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
                      {activeCustomer.timeline.filter((t) => t.kind === 'call' || t.kind === 'zalo' || t.kind === 'email').length === 0 && (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                          Chưa có lịch sử cuộc gọi hoặc tin nhắn chăm sóc. Hãy bấm nút phía trên để kết nối ngay.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB: CÔNG VIỆC PHÂN CÔNG */}
                {profileSubTab === 'tasks' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Công việc nhân viên gắn với khách hàng ({activeCustomer.tasks.length})</h3>
                      <button
                        type="button"
                        className="crm2-btn-primary"
                        style={{ height: 32, fontSize: 12.5 }}
                        onClick={() => handleOpenCreateTask(activeCustomer)}
                      >
                        <Plus size={13} /> Tạo công việc mới
                      </button>
                    </div>

                    <div className="crm2-task-list" style={{ marginTop: 10 }}>
                      {activeCustomer.tasks.map((task) => (
                        <div key={task.id} className="crm2-task-row" style={{ padding: '12px 14px' }}>
                          <label className="crm2-task-left">
                            <input
                              type="checkbox"
                              checked={task.done}
                              onChange={() => handleToggleTask(task.id)}
                            />
                            <span className={`crm2-task-text ${task.done ? 'done' : ''}`} style={{ fontSize: 13.5 }}>
                              {task.title}
                            </span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className="crm2-task-date">
                              <Calendar size={13} />
                              Hạn: {task.dueDate}
                            </span>
                            <span className="crm2-tl-done-badge" style={{ background: task.done ? '#dcfce7' : '#fee2e2', color: task.done ? '#166534' : '#991b1b' }}>
                              {task.done ? 'Đã xong' : 'Đang xử lý'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {activeCustomer.tasks.length === 0 && (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                          Chưa có đầu việc nào được giao. Bấm &ldquo;+ Tạo công việc mới&rdquo; để phân công nhân viên.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB: TỆP ĐÍNH KÈM */}
                {profileSubTab === 'attachments' && (
                  <div className="crm2-subbox">
                    <div className="crm2-box-head">
                      <h3>Hợp đồng & Tài liệu đính kèm</h3>
                      <label className="crm2-btn-primary" style={{ height: 32, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <Paperclip size={13} /> Tải tệp lên
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          onChange={() => notify('Đã tải lên tệp đính kèm thành công!')}
                        />
                      </label>
                    </div>

                    <table className="crm2-table-full" style={{ marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>Tên tài liệu / Tệp</th>
                          <th>Loại tệp</th>
                          <th>Dung lượng</th>
                          <th>Ngày tải lên</th>
                          <th>Người tải</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <strong>Hop_dong_hoi_vien_VIP_{activeCustomer.code}.pdf</strong>
                          </td>
                          <td><span className="crm2-tl-done-badge">Hợp đồng</span></td>
                          <td>1.4 MB</td>
                          <td>10/09/2026</td>
                          <td>Lễ tân</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="crm2-edit-link"
                              onClick={() => notify('Đang mở tài liệu hợp đồng...')}
                            >
                              Xem / Tải về
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <strong>CCCD_Xac_thuc_{activeCustomer.phone}.jpg</strong>
                          </td>
                          <td><span className="crm2-tl-done-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Định danh</span></td>
                          <td>820 KB</td>
                          <td>05/09/2026</td>
                          <td>An Bình</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="crm2-edit-link"
                              onClick={() => notify('Đang tải hình ảnh định danh...')}
                            >
                              Xem / Tải về
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
              {leadsList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
                    Chưa có lead nào.
                  </td>
                </tr>
              )}
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
              {appts
                .filter((b) => b.status !== 'cancelled' && b.end >= Date.now())
                .sort((a, b) => a.start - b.start)
                .slice(0, 50)
                .map((b) => {
                  const d = new Date(b.start);
                  const e = new Date(b.end);
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.customer || 'Khách lẻ'}</strong>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{b.phone}</div>
                      </td>
                      <td>{customers.find((c) => c.phone.replace(/\D+/g, '') === (b.phone || '').replace(/\D+/g, ''))
                        ? renderTierBadge(
                            customers.find((c) => c.phone.replace(/\D+/g, '') === (b.phone || '').replace(/\D+/g, ''))!.tier,
                          )
                        : renderTierBadge('none')}</td>
                      <td>
                        {d.toLocaleDateString('vi-VN')} · {d.toTimeString().slice(0, 5)} – {e.toTimeString().slice(0, 5)}
                      </td>
                      <td>{b.room.toUpperCase()}</td>
                      <td>{b.service === 'gdr' ? 'Luyện tập theo giờ' : `Game ${b.service} hố`}</td>
                      <td>
                        <span className="crm2-tl-done-badge">{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              {appts.filter((b) => b.status !== 'cancelled' && b.end >= Date.now()).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
                    Chưa có lịch đặt sắp tới.
                  </td>
                </tr>
              )}
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
                <p>Gửi thông báo ưu đãi gia hạn, mời giải đấu qua Zalo OA và Email theo nhóm khách</p>
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
                <th>Xếp hàng gửi</th>
                <th>Đã gửi</th>
                <th>Lỗi</th>
                <th>Bỏ qua</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((cmp) => (
                <tr key={cmp.id}>
                  <td>
                    <strong>{cmp.name}</strong>
                  </td>
                  <td>{cmp.channel === 'zalo' ? 'Zalo OA' : cmp.channel === 'email' ? 'Email' : cmp.channel}</td>
                  <td>
                    <span className="crm2-tag-chip">
                      {SEGMENT_NAMES[cmp.segment as CampaignSegment] ?? cmp.segment}
                    </span>
                  </td>
                  <td>{cmp.queued}</td>
                  <td>{cmp.stats.sent ?? 0}</td>
                  <td>{cmp.stats.failed ?? 0}</td>
                  <td>{cmp.skipped}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
                    Chưa có chiến dịch nào được gửi.
                  </td>
                </tr>
              )}
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
                      setNewCampaignForm({ ...newCampaignForm, channel: e.target.value as CampaignChannel })
                    }
                  >
                    {CAMPAIGN_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c === 'zalo' ? 'Zalo OA' : 'Email'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="crm2-form-group">
                  <label>Nhóm nhận tin</label>
                  <select
                    value={newCampaignForm.segment}
                    onChange={(e) =>
                      setNewCampaignForm({ ...newCampaignForm, segment: e.target.value as CampaignSegment })
                    }
                  >
                    {SEGMENTS.map((k) => (
                      <option key={k} value={k}>
                        {SEGMENT_NAMES[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {newCampaignForm.channel === 'email' && (
                <div className="crm2-form-group">
                  <label>Tiêu đề email</label>
                  <input
                    value={newCampaignForm.subject}
                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, subject: e.target.value })}
                  />
                </div>
              )}
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
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                Chỉ gửi cho khách đã đồng ý nhận tin và có thông tin liên hệ của kênh đã chọn.
              </p>
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
                disabled={campaignBusy}
                onClick={() => void sendCampaign()}
              >
                Kích hoạt gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 9: NẠP TIỀN VÀO VÍ / THẺ GIỜ (QUICK ACTION MỤC 4 CRM)
          ===================================================================== */}
      {showTopupModal && activeCustomer && (
        <div className="crm2-modal-backdrop" onClick={() => setShowTopupModal(false)}>
          <div
            className="crm2-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crm2-modal-head">
              <div>
                <h3>Nạp tiền vào Ví / Thẻ giờ</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Khách hàng: <strong>{activeCustomer.name}</strong> ({activeCustomer.phone})
                </p>
              </div>
              <button
                type="button"
                className="crm2-modal-close"
                onClick={() => setShowTopupModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Chọn nhanh số tiền nạp</label>
                <div className="crm2-amount-chips">
                  {[500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`crm2-amount-chip ${topupAmount === amt ? 'selected' : ''}`}
                      onClick={() => setTopupAmount(amt)}
                    >
                      {money(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="crm2-form-group" style={{ marginTop: 12 }}>
                <label>Số tiền nạp tùy chỉnh (VNĐ) *</label>
                <input
                  type="number"
                  min={10000}
                  step={50000}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              <div className="crm2-form-group">
                <label>Hình thức thanh toán</label>
                <select
                  value={topupMethod}
                  onChange={(e) =>
                    setTopupMethod(e.target.value as 'cash' | 'transfer' | 'card')
                  }
                >
                  <option value="transfer">Chuyển khoản SePay (Khuyến nghị)</option>
                  <option value="cash">Tiền mặt tại quầy</option>
                  <option value="card">Thẻ ngân hàng (POS)</option>
                </select>
              </div>

              <div className="crm2-form-group">
                <label>Ghi chú nạp tiền</label>
                <input
                  placeholder="VD: Khách nạp nâng hạn mức tập tháng..."
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowTopupModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="crm2-btn-primary"
                disabled={topupBusy || topupAmount <= 0}
                onClick={handleExecuteTopup}
              >
                {topupBusy ? 'Đang xử lý...' : `Xác nhận nạp ${money(topupAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 10: ĐẶT SÂN NHANH (QUICK ACTION MỤC 4 CRM)
          ===================================================================== */}
      {showQuickBookingModal && activeCustomer && (
        <div className="crm2-modal-backdrop" onClick={() => setShowQuickBookingModal(false)}>
          <div
            className="crm2-modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crm2-modal-head">
              <div>
                <h3>Đặt lịch sân 3D nhanh</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Khách hàng: <strong>{activeCustomer.name}</strong> ({activeCustomer.phone})
                </p>
              </div>
              <button
                type="button"
                className="crm2-modal-close"
                onClick={() => setShowQuickBookingModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="crm2-form-group">
                  <label>Line / Phòng chơi *</label>
                  <select
                    value={bookingLine}
                    onChange={(e) => setBookingLine(e.target.value)}
                  >
                    <option value="Line 01">Line 01 (VIP Lầu trệt)</option>
                    <option value="Line 02">Line 02 (VIP Lầu trệt)</option>
                    <option value="Line 03">Line 03 (Standard Lầu 1)</option>
                    <option value="Line 04">Line 04 (Standard Lầu 1)</option>
                    <option value="Line 05">Line 05 (Standard Lầu 1)</option>
                    <option value="Line 06">Line 06 (Standard Lầu 1)</option>
                    <option value="Line 07">Line 07 (Standard Lầu 1)</option>
                    <option value="Line 08">Line 08 (Standard Lầu 1)</option>
                    <option value="Line 09">Line 09 (Standard Lầu 1)</option>
                    <option value="Line 10">Line 10 (Standard Lầu 1)</option>
                  </select>
                </div>
                <div className="crm2-form-group">
                  <label>Hình thức chơi *</label>
                  <select
                    value={bookingService}
                    onChange={(e) => setBookingService(e.target.value as 'gdr' | '9' | '18')}
                  >
                    <option value="gdr">Tập luyện theo giờ (GDR)</option>
                    <option value="9">Game 9 hố</option>
                    <option value="18">Game 18 hố</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                <div className="crm2-form-group">
                  <label>Ngày chơi *</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Giờ bắt đầu *</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="crm2-form-group" style={{ marginTop: 10 }}>
                <label>Thời lượng chơi (phút)</label>
                <div className="crm2-amount-chips">
                  {[60, 90, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`crm2-amount-chip ${bookingDuration === mins ? 'selected' : ''}`}
                      onClick={() => setBookingDuration(mins)}
                    >
                      {mins} phút
                    </button>
                  ))}
                </div>
              </div>

              <div className="crm2-form-group" style={{ marginTop: 10 }}>
                <label>Ghi chú đặt sân</label>
                <input
                  placeholder="VD: Cần hỗ trợ mượn gậy Nam/Nữ, bóng mới..."
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowQuickBookingModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="crm2-btn-primary"
                disabled={bookingBusy}
                onClick={handleExecuteQuickBooking}
              >
                {bookingBusy ? 'Đang tạo...' : 'Xác nhận đặt sân'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 11: TẠO LỊCH HẸN & NHẮC HẸN (QUICK ACTION MỤC 4 CRM)
          ===================================================================== */}
      {showCreateApptModal && activeCustomer && (
        <div className="crm2-modal-backdrop" onClick={() => setShowCreateApptModal(false)}>
          <div
            className="crm2-modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crm2-modal-head">
              <div>
                <h3>Tạo lịch hẹn & Nhắc hẹn khách</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Khách hàng: <strong>{activeCustomer.name}</strong> ({activeCustomer.phone})
                </p>
              </div>
              <button
                type="button"
                className="crm2-modal-close"
                onClick={() => setShowCreateApptModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="crm2-modal-body">
              <div className="crm2-form-group">
                <label>Mục đích lịch hẹn *</label>
                <select
                  value={apptService}
                  onChange={(e) => setApptService(e.target.value)}
                >
                  <option value="Tập trải nghiệm & Thử gậy">Tập trải nghiệm & Thử gậy mới</option>
                  <option value="Tư vấn gói hội viên VIP">Tư vấn gói hội viên VIP</option>
                  <option value="Nhắc gia hạn thẻ tháng">Nhắc gia hạn thẻ tháng sắp hết hạn</option>
                  <option value="Hẹn gặp Huấn luyện viên">Hẹn gặp Huấn luyện viên (Pro)</option>
                  <option value="Trao đổi tham gia giải đấu">Trao đổi tham gia giải đấu nội bộ</option>
                  <option value="Chăm sóc định kỳ">Chăm sóc định kỳ sau buổi chơi</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                <div className="crm2-form-group">
                  <label>Ngày hẹn *</label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                  />
                </div>
                <div className="crm2-form-group">
                  <label>Giờ hẹn *</label>
                  <input
                    type="time"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="crm2-form-group" style={{ marginTop: 10 }}>
                <label>Nhân viên phụ trách *</label>
                <select
                  value={apptAssignee}
                  onChange={(e) => setApptAssignee(e.target.value)}
                >
                  <option value="Trần Văn An">Trần Văn An (Chuyên viên Sales)</option>
                  <option value="Nguyễn Thị Bình">Nguyễn Thị Bình (CSKH)</option>
                  <option value="Lê Hoàng Minh">Lê Hoàng Minh (HLV Pro)</option>
                  <option value="Lễ tân ca trực">Lễ tân ca trực</option>
                </select>
              </div>

              <div className="crm2-form-group" style={{ marginTop: 10 }}>
                <label>Ghi chú chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú nội dung cần chuẩn bị hoặc dặn dò nhân viên..."
                  value={apptNote}
                  onChange={(e) => setApptNote(e.target.value)}
                />
              </div>
            </div>
            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowCreateApptModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="crm2-btn-primary"
                disabled={apptBusy}
                onClick={handleExecuteCreateAppt}
              >
                {apptBusy ? 'Đang lưu...' : 'Lưu lịch hẹn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Đối Soát & Xác Minh Liên Kết Khách Vãng Lai / Lead */}
      {showVerificationModal && activeCustomer && (
        <div className="crm2-modal-backdrop" onClick={() => setShowVerificationModal(false)}>
          <div
            className="crm2-modal"
            style={{ maxWidth: 680, width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crm2-modal-head">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} color="#16a34a" />
                  Đối soát & Xác minh liên kết hồ sơ
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Khách hàng: <strong>{activeCustomer.name}</strong> ({activeCustomer.code} · SĐT: {activeCustomer.phone})
                </p>
              </div>
              <button
                type="button"
                className="crm2-modal-close"
                onClick={() => setShowVerificationModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="crm2-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="crm2-dup-banner">
                <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Quy chuẩn bảo vệ dữ liệu khách hàng 360°:</strong>
                  <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
                    Hệ thống phát hiện các lượt chơi vãng lai hoặc Lead từ Ads/Website có SĐT trùng khớp. Nhân viên cần đối soát và xác nhận thủ công, <strong>tuyệt đối không tự ý gộp hồ sơ</strong> làm sai lệch lịch sử giao dịch hay số dư ví.
                  </p>
                </div>
              </div>

              <div className="crm2-form-group" style={{ marginBottom: 16 }}>
                <label>Ghi chú lý do xác minh (Lưu vào nhật ký kiểm toán)</label>
                <input
                  placeholder="VD: Khách xác nhận đã chơi tại Line 01 lúc 18h tối qua..."
                  value={linkReason}
                  onChange={(e) => setLinkReason(e.target.value)}
                />
              </div>

              {/* Bookings vãng lai */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                  Lượt đặt sân / chơi golf vãng lai chưa liên kết ({unlinkedBookings.length})
                </h4>
                {unlinkedBookings.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                    Không có lượt đặt sân vãng lai nào chưa liên kết với SĐT này.
                  </p>
                ) : (
                  unlinkedBookings.map((b) => (
                    <div key={b.id} className="crm2-link-item">
                      <div className="crm2-link-info-col">
                        <div className="crm2-link-title">
                          {b.room.toUpperCase()} — {b.service === 'gdr' ? 'Luyện tập theo giờ' : `Game ${b.service} hố`}
                        </div>
                        <div className="crm2-link-meta">
                          <span className="crm2-link-badge booking">Booking vãng lai</span>
                          <span>{new Date(b.start).toLocaleString('vi-VN')}</span>
                          <span>·</span>
                          <span>Tên đặt: <strong>{b.customer}</strong></span>
                          <span>·</span>
                          <span>Số tiền: <strong>{money(b.amount ?? 0)}</strong></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="crm2-btn-link-action"
                        disabled={verifyingBusy}
                        onClick={() => handleExecuteLink('booking', b.id)}
                      >
                        Xác nhận liên kết
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Leads chưa liên kết */}
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                  Lead tiềm năng từ các kênh ({unlinkedLeads.length})
                </h4>
                {unlinkedLeads.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                    Không có Lead nào trùng SĐT chưa được chuyển đổi.
                  </p>
                ) : (
                  unlinkedLeads.map((l) => (
                    <div key={l.id} className="crm2-link-item">
                      <div className="crm2-link-info-col">
                        <div className="crm2-link-title">
                          Lead: {l.fullName} {l.email ? `(${l.email})` : ''}
                        </div>
                        <div className="crm2-link-meta">
                          <span className="crm2-link-badge lead">Lead {l.stage}</span>
                          <span>Nguồn: <strong>{l.source || 'Trực tiếp'}</strong></span>
                          <span>·</span>
                          <span>Nhu cầu: <strong>{l.targetService || 'Sân 3D'}</strong></span>
                          <span>·</span>
                          <span>Ngày tạo: {new Date(l.created).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="crm2-btn-link-action"
                        disabled={verifyingBusy}
                        onClick={() => handleExecuteLink('lead', l.id)}
                      >
                        Xác nhận liên kết
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="crm2-modal-foot">
              <button
                type="button"
                className="crm2-btn-secondary"
                onClick={() => setShowVerificationModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/** Two-letter avatar from a name (the stock photos it replaces failed to load and are not the customers' own). */
const initialsOf = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? '?').slice(0, 2)) || '?').toLocaleUpperCase('vi-VN');
};

export default CrmModule;
