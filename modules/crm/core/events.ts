/**
 * Saigon Indoor Golf (sigolf.vn) — CRM 360° Business Events & Consistency
 * 
 * Rules of Truth:
 * - POS (`finance_entries`): Single Source of Truth for all transactions, revenue, and payments.
 * - Booking (`bookings`): Single Source of Truth for all room/line reservations, hours, and sessions.
 * - Membership (`customer_packages`, `wallet_ledger`, `loyalty_ledger`): Single Source of Truth for balances, cards, and benefits.
 */

export type BusinessEventType =
  | 'pos.payment.completed'
  | 'pos.refund.completed'
  | 'booking.created'
  | 'booking.started'
  | 'booking.finished'
  | 'booking.cancelled'
  | 'membership.package_purchased'
  | 'membership.wallet_topup'
  | 'membership.wallet_spent'
  | 'membership.points_changed';

export type EventSource = 'pos' | 'booking' | 'membership';

export interface BusinessEvent<T = Record<string, unknown>> {
  id: string;
  type: BusinessEventType;
  tenant: string;
  source: EventSource;
  actor: string;
  timestamp: number;
  idempotencyKey: string;
  customerId?: string;
  phone?: string;
  data: T;
}

export interface PosPaymentData {
  bookingId?: string | null;
  packageId?: string | null;
  method: string;
  amount: number;
  shiftId?: string;
  requestId: string;
}

export interface PosRefundData {
  bookingId: string;
  method: string;
  amount: number;
  reason: string;
  requestId: string;
}

export interface BookingSessionData {
  bookingId: string;
  room: string;
  service: string;
  start: number;
  end: number;
  started?: number | null;
  finished?: number | null;
  amount?: number | null;
  customerName?: string;
}

export interface MembershipPackageData {
  packageId: string;
  packageName: string;
  packageType: string;
  expires: number;
  price: number;
}

export interface MembershipWalletData {
  delta: number;
  balance: number;
  reason: string;
  bookingId?: string | null;
  note?: string;
}

export interface MembershipPointsData {
  delta: number;
  points: number;
  reason: string;
  bookingId?: string | null;
}

/**
 * Builds a deterministic idempotency key for business events.
 * Format: evt:<type>:<tenant>:<entityId>:<qualifier>
 */
export function makeEventKey(
  type: BusinessEventType,
  tenant: string,
  entityId: string,
  qualifier: string = '',
): string {
  const normType = type.replace(/[^a-zA-Z0-9._-]/g, '');
  const normTenant = tenant.replace(/[^a-zA-Z0-9_-]/g, '');
  const normEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, '');
  const normQual = qualifier.replace(/[^a-zA-Z0-9_-]/g, '');
  return `evt:${normType}:${normTenant}:${normEntity}${normQual ? `:${normQual}` : ''}`;
}

/**
 * Maps a business event to human-readable timeline presentation for Customer 360°.
 */
export function formatEventTimeline(event: BusinessEvent): {
  kind: 'call' | 'zalo' | 'email' | 'note' | 'pos' | 'booking' | 'membership';
  title: string;
  desc: string;
} {
  const d = new Date(event.timestamp);
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN');

  switch (event.type) {
    case 'pos.payment.completed': {
      const p = event.data as unknown as PosPaymentData;
      const amtStr = Number(p.amount || 0).toLocaleString('vi-VN');
      return {
        kind: 'pos',
        title: `Thanh toán thành công ${amtStr}đ`,
        desc: `Thu ngân [${event.actor}] xác nhận thanh toán hình thức ${p.method.toUpperCase()}${p.bookingId ? ` cho phiếu ${p.bookingId.slice(0, 8)}` : ''} lúc ${timeStr} ngày ${dateStr}.`,
      };
    }
    case 'pos.refund.completed': {
      const r = event.data as unknown as PosRefundData;
      const amtStr = Number(r.amount || 0).toLocaleString('vi-VN');
      return {
        kind: 'pos',
        title: `Hoàn tiền ${amtStr}đ`,
        desc: `Hoàn trả qua ${r.method.toUpperCase()} cho phiếu ${r.bookingId.slice(0, 8)}. Lý do: ${r.reason || 'Không ghi'}. Người thực hiện: ${event.actor}.`,
      };
    }
    case 'booking.created': {
      const b = event.data as unknown as BookingSessionData;
      return {
        kind: 'booking',
        title: `Đặt lịch phòng ${b.room?.toUpperCase() || ''}`,
        desc: `Lịch chơi dịch vụ ${b.service} từ ${new Date(b.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} đến ${new Date(b.end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${dateStr}.`,
      };
    }
    case 'booking.started': {
      const b = event.data as unknown as BookingSessionData;
      return {
        kind: 'booking',
        title: `Check-in mở phiên ${b.room?.toUpperCase() || ''}`,
        desc: `Khách nhận phòng và bắt đầu buổi chơi lúc ${timeStr}.`,
      };
    }
    case 'booking.finished': {
      const b = event.data as unknown as BookingSessionData;
      const amtStr = b.amount ? `${Number(b.amount).toLocaleString('vi-VN')}đ` : 'Chưa tính tiền';
      return {
        kind: 'booking',
        title: `Kết thúc phiên chơi ${b.room?.toUpperCase() || ''}`,
        desc: `Hoàn tất lượt chơi lúc ${timeStr}. Số tiền dịch vụ: ${amtStr}.`,
      };
    }
    case 'booking.cancelled': {
      const b = event.data as unknown as BookingSessionData;
      return {
        kind: 'booking',
        title: `Hủy lịch phòng ${b.room?.toUpperCase() || ''}`,
        desc: `Lịch hẹn ngày ${dateStr} đã được hủy bởi ${event.actor}.`,
      };
    }
    case 'membership.package_purchased': {
      const m = event.data as unknown as MembershipPackageData;
      const expDate = m.expires ? new Date(m.expires).toLocaleDateString('vi-VN') : 'Không thời hạn';
      return {
        kind: 'membership',
        title: `Kích hoạt gói ${m.packageName || 'hội viên'}`,
        desc: `Đăng ký gói thành công, hạn sử dụng đến ngày ${expDate}.`,
      };
    }
    case 'membership.wallet_topup': {
      const w = event.data as unknown as MembershipWalletData;
      const deltaStr = Number(w.delta || 0).toLocaleString('vi-VN');
      const balStr = Number(w.balance || 0).toLocaleString('vi-VN');
      return {
        kind: 'membership',
        title: `Nạp ví tài khoản +${deltaStr}đ`,
        desc: `Số dư ví sau khi nạp: ${balStr}đ. Người thực hiện: ${event.actor}.`,
      };
    }
    case 'membership.wallet_spent': {
      const w = event.data as unknown as MembershipWalletData;
      const deltaStr = Number(Math.abs(w.delta || 0)).toLocaleString('vi-VN');
      const balStr = Number(w.balance || 0).toLocaleString('vi-VN');
      return {
        kind: 'membership',
        title: `Trừ tiền ví -${deltaStr}đ`,
        desc: `Thanh toán giờ chơi từ số dư ví. Số dư còn lại: ${balStr}đ.`,
      };
    }
    case 'membership.points_changed': {
      const pt = event.data as unknown as MembershipPointsData;
      const sign = pt.delta >= 0 ? '+' : '';
      return {
        kind: 'membership',
        title: `Tích/đổi điểm thưởng (${sign}${pt.delta} điểm)`,
        desc: `Tổng điểm tích lũy hiện tại: ${pt.points}. Lý do: ${pt.reason}.`,
      };
    }
    default:
      return {
        kind: 'note',
        title: `Sự kiện hệ thống`,
        desc: `Ghi nhận lúc ${timeStr} ngày ${dateStr}.`,
      };
  }
}
