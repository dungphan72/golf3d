/**
 * Shared types, constants, and utilities for the SIGOLF Service Call Module.
 * Supports Multi-tenant, Guest QR (Mode A/B/C), Member, Staff, POS, and SLA Tracking.
 */

export const SERVICE_CALL_STATUSES = [
  'CREATED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const;

export type ServiceCallStatus = (typeof SERVICE_CALL_STATUSES)[number];

export const SERVICE_CALL_SOURCES = ['guest_qr', 'member_app', 'staff_proxy'] as const;
export type ServiceCallSource = (typeof SERVICE_CALL_SOURCES)[number];

export const GUEST_MODES = ['MODE_A', 'MODE_B', 'MODE_C'] as const;
export type GuestMode = (typeof GUEST_MODES)[number];

export const RESOLUTION_TYPES = [
  'RESOLVED',
  'NO_SHOW',
  'CUSTOMER_CANCELLED',
  'TRANSFERRED',
] as const;
export type ResolutionType = (typeof RESOLUTION_TYPES)[number];

export type SupportedLang = 'vi' | 'en' | 'ko';

export type ServiceCallCategory = {
  id: string;
  tenant: string;
  code: string;
  name_vi: string;
  name_en: string;
  name_ko: string;
  icon: string;
  sort_order: number;
  is_active: boolean | number;
};

export type ServiceCallSettings = {
  tenant: string;
  is_enabled: boolean;
  guest_mode: GuestMode;
  require_active_session: boolean;
  sla_ack_seconds: number;
  sla_resolve_seconds: number;
  cooldown_seconds: number;
  max_open_requests: number;
  sound_alert_enabled: boolean;
  auto_assign_staff: boolean;
  updated_at: number;
};

export type ServiceCallQr = {
  id: string;
  tenant: string;
  room_id: string;
  token_secret: string;
  version: number;
  is_active: boolean;
  created_at: number;
  revoked_at?: number | null;
};

export type ServiceCall = {
  id: string;
  tenant: string;
  room_id: string;
  category_id: string;
  category_code: string;
  source: ServiceCallSource;
  status: ServiceCallStatus;
  customer_name?: string | null;
  customer_phone?: string | null;
  member_id?: string | null;
  booking_id?: string | null;
  note?: string | null;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  resolution_type?: ResolutionType | null;
  resolution_note?: string | null;
  idempotency_key?: string | null;
  created_at: number;
  acknowledged_at?: number | null;
  started_at?: number | null;
  completed_at?: number | null;
  sla_ack_breached: number | boolean;
  sla_resolve_breached: number | boolean;
  // Augmented UI fields
  category_name?: string;
  room_name?: string;
};

export type ServiceCallEvent = {
  id: string;
  call_id: string;
  tenant: string;
  from_status?: ServiceCallStatus | null;
  to_status: ServiceCallStatus;
  actor_type: 'guest' | 'member' | 'staff' | 'system';
  actor_id?: string | null;
  actor_name?: string | null;
  note?: string | null;
  created_at: number;
};

export const DEFAULT_SERVICE_CALL_SETTINGS: Omit<ServiceCallSettings, 'tenant' | 'updated_at'> = {
  is_enabled: true,
  guest_mode: 'MODE_C',
  require_active_session: false,
  sla_ack_seconds: 120, // 2 minutes
  sla_resolve_seconds: 600, // 10 minutes
  cooldown_seconds: 60,
  max_open_requests: 3,
  sound_alert_enabled: true,
  auto_assign_staff: false,
};

export const DEFAULT_CATEGORIES: Array<{
  code: string;
  name_vi: string;
  name_en: string;
  name_ko: string;
  icon: string;
  sort_order: number;
}> = [
  {
    code: 'STAFF',
    name_vi: 'Gọi nhân viên',
    name_en: 'Call Staff',
    name_ko: '직원 호출',
    icon: 'UserCheck',
    sort_order: 1,
  },
  {
    code: 'FNB',
    name_vi: 'Đồ ăn / Nước uống',
    name_en: 'Food & Drinks',
    name_ko: '식음료 주문',
    icon: 'Coffee',
    sort_order: 2,
  },
  {
    code: 'EQUIPMENT',
    name_vi: 'Hỗ trợ thiết bị Golf',
    name_en: 'Golf Simulator Support',
    name_ko: '골프 장비 지원',
    icon: 'LifeBuoy',
    sort_order: 3,
  },
  {
    code: 'COACH',
    name_vi: 'Hỗ trợ Huấn luyện viên',
    name_en: 'Coach Assistance',
    name_ko: '코치 지원',
    icon: 'Crown',
    sort_order: 4,
  },
  {
    code: 'BILLING',
    name_vi: 'Yêu cầu thanh toán',
    name_en: 'Request Bill / Checkout',
    name_ko: '결제 요청',
    icon: 'CreditCard',
    sort_order: 5,
  },
  {
    code: 'OTHER',
    name_vi: 'Hỗ trợ khác',
    name_en: 'Other Assistance',
    name_ko: '기타 요청',
    icon: 'HelpCircle',
    sort_order: 6,
  },
];

export const STATUS_LABELS: Record<ServiceCallStatus, Record<SupportedLang, string>> = {
  CREATED: {
    vi: 'Chờ tiếp nhận',
    en: 'Waiting Staff',
    ko: '접수 대기',
  },
  ACKNOWLEDGED: {
    vi: 'Đã tiếp nhận',
    en: 'Acknowledged',
    ko: '접수 완료',
  },
  IN_PROGRESS: {
    vi: 'Đang xử lý',
    en: 'In Progress',
    ko: '처리 중',
  },
  COMPLETED: {
    vi: 'Đã hoàn thành',
    en: 'Completed',
    ko: '완료됨',
  },
  CANCELLED: {
    vi: 'Đã hủy',
    en: 'Cancelled',
    ko: '취소됨',
  },
  REJECTED: {
    vi: 'Từ chối',
    en: 'Rejected',
    ko: '거절됨',
  },
  EXPIRED: {
    vi: 'Hết hạn',
    en: 'Expired',
    ko: '만료됨',
  },
};

export const RESOLUTION_LABELS: Record<ResolutionType, Record<SupportedLang, string>> = {
  RESOLVED: {
    vi: 'Đã hỗ trợ xong',
    en: 'Successfully Resolved',
    ko: '지원 완료',
  },
  NO_SHOW: {
    vi: 'Không tìm thấy khách',
    en: 'Guest Not Found',
    ko: '고객 부재',
  },
  CUSTOMER_CANCELLED: {
    vi: 'Khách không còn nhu cầu',
    en: 'Guest Cancelled',
    ko: '고객 취소',
  },
  TRANSFERRED: {
    vi: 'Chuyển bộ phận khác',
    en: 'Transferred',
    ko: '타 부서 이관',
  },
};

/**
 * Returns human-readable elapsed or remaining time (e.g. "01:45" or "1m 45s")
 */
export function formatCallTimer(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
