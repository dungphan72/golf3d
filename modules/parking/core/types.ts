/**
 * Saigon Indoor Golf (SIGOLF) — Module Bãi Đậu Xe (Parking)
 * Core Types & Data Contracts
 */

export type VehicleType = 'car' | 'motorcycle';

export type TicketStatus =
  | 'holding'         // Đang giữ chỗ (chờ thanh toán hoặc xác nhận quyền lợi)
  | 'confirmed'       // Đã xác nhận / Đã thanh toán (chưa vào bãi)
  | 'active'          // Xe đang thực tế trong bãi (đã check-in vào)
  | 'completed'       // Xe đã rời bãi (đã check-out)
  | 'cancelled'       // Vé đã hủy
  | 'pending_review'; // Tiền đến muộn hoặc cần quản lý can thiệp đổi ô / hoàn tiền

export type FeePayer = 'customer' | 'gopick_sponsored' | 'split';

export type TicketSource = 'web' | 'golf_addon' | 'gate_paper';

export interface ParkingSettings {
  tenant: string;
  isEnabled: boolean;
  facilityName: string;
  address: string;
  directionsUrl: string;
  defaultHourlyRate: number;      // Đơn giá tiêu chuẩn (VD: 30.000 đ)
  bufferMinutes: number;          // Thời gian đệm giữa các lượt (VD: 0 hoặc 15 phút)
  holdTimeoutSeconds: number;     // Thời gian giữ chỗ tạm (mặc định 300s = 5 phút)
  golfFreeHours: number;          // Số giờ miễn phí tối đa cho khách chơi Golf (VD: 3 giờ)
  golfSlotsPerBooking: number;    // Số xe tối đa được tài trợ trên mỗi booking Golf (VD: 1 xe)
  overtimeRatePerHour: number;    // Đơn giá phụ thu quá giờ (VD: 30.000 đ/giờ)
  allowPaperTickets: boolean;     // Cho phép bảo vệ phát hành vé giấy
  totalSpots?: number;            // Sức chứa quy hoạch của bãi (GoPick: 65)
  updatedAt: number;
}

export interface ParkingSpot {
  id: string;
  tenant: string;
  code: string;                   // Mã ô: A01..A10 hoặc P01..P65
  section: string;                // Dãy: Dãy A, Dãy P1, Dãy P2...
  spotType: VehicleType;
  rowIndex: number;
  colIndex: number;
  isActive: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  sortOrder: number;
  hasCoordinates?: boolean;
  // Computed runtime states for the requested time window
  currentVehiclePlate?: string;   // Biển số xe thực tế đang đỗ (nếu có)
  stateForWindow?: 'available' | 'held' | 'booked' | 'occupied' | 'maintenance';
}

export interface ParkingTicket {
  id: string;
  ticketCode: string;             // Mã vé: PK-0186
  tenant: string;
  spotId: string;
  spotCode: string;
  section: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  vehicleType: VehicleType;
  expectedIn: number;             // Timestamp ms
  expectedOut: number;            // Timestamp ms
  actualIn: number | null;
  actualOut: number | null;
  checkinBy: string;
  checkoutBy: string;
  status: TicketStatus;
  source: TicketSource;
  golfBookingId: string | null;
  posBillId: string | null;
  baseAmount: number;             // Giá gốc
  sponsoredAmount: number;        // GoPick tài trợ
  paidAmount: number;             // Khách đã trả
  overtimeAmount: number;         // Phụ thu quá giờ
  totalAmount: number;            // Tổng tiền vé
  customerAmount?: number;         // Khoản thực tế khách cần trả (sau khi trừ tài trợ)
  isGolfSponsored?: boolean;      // Được tài trợ bởi lượt chơi golf
  refundAmount: number;           // Số tiền hoàn
  feePayer: FeePayer;
  holdExpiresAt: number;          // Server timestamp hết hạn hold
  accessToken: string;            // Token khó đoán để mở vé bảo mật
  paymentMethod: string;
  paymentRef: string;
  paidAt: number | null;
  paperTicketNo: string | null;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface ParkingTransaction {
  id: string;
  tenant: string;
  ticketId: string;
  ticketCode: string;
  shiftId: string | null;
  txType: 'online_payment' | 'gate_payment' | 'surcharge' | 'refund' | 'sponsored_accrual';
  method: 'vietqr' | 'sepay' | 'cash' | 'transfer' | 'internal';
  amount: number;
  referenceCode: string;
  note: string;
  recordedBy: string;
  createdAt: number;
}

export interface ParkingShift {
  id: string;
  tenant: string;
  staffId: string;
  staffName: string;
  openedAt: number;
  closedAt: number | null;
  status: 'open' | 'closed';
  onlineTotal: number;
  gateCashTotal: number;
  gateTransferTotal: number;
  refundTotal: number;
  netCollected: number;
  sponsoredTotal: number;
  cashSubmitted: number;
  cashDiff: number;
  notes: string;
  createdAt: number;
}

export interface ParkingAuditLog {
  id: string;
  tenant: string;
  ticketId: string | null;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: number;
}

export interface HoldSpotInput {
  tenant?: string;
  spotCode: string;
  licensePlate: string;
  expectedIn: number;
  expectedOut: number;
  customerName?: string;
  customerPhone?: string;
  golfBookingId?: string;
  vehicleType?: VehicleType;
  source?: TicketSource;
}

export interface ConfirmTicketInput {
  tenant?: string;
  ticketCode?: string;
  ticketId?: string;
  accessToken?: string;
  paymentMethod?: string;
  paymentRef?: string;
  transactionRef?: string;
  amountPaid?: number;
}

export interface GateCheckInInput {
  tenant?: string;
  ticketCode?: string;
  licensePlate?: string;
  accessToken?: string;
  staffName?: string;
  operatorId?: string;
}

export interface GateCheckOutInput {
  tenant?: string;
  ticketCode?: string;
  licensePlate?: string;
  accessToken?: string;
  paymentMethod?: 'cash' | 'transfer' | 'gate_cash' | 'gate_transfer';
  staffName?: string;
  operatorId?: string;
  amountCollected?: number;
}

export interface CreatePaperTicketInput {
  tenant?: string;
  spotId?: string;
  spotCode?: string;
  licensePlate: string;
  expectedOut?: number;
  staffName?: string;
  operatorId?: string;
  paperTicketNo?: string;
  golfBookingId?: string;
  note?: string;
}

export interface ShiftReconciliationSummary {
  dateStr: string;
  onlineAmount: number;
  gateAmount: number;
  refundAmount: number;
  netCollected: number;
  sponsoredAmount: number;
  gateCash: number;
  gateTransfer: number;
  transactionsCount: number;
  ticketsCount: number;
  activeCarsInLot: number;
}
