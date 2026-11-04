import { type Config, type Booking } from '../../lib/club';
export type RequestRow = {
  id: string;
  booking: string;
  kind: string;
  status: string;
  created: number;
};
export type Data = {
  activeShift: { id: string; name: string; opened_at: number } | null;
  todayReceipts: number;
  config: Config;
  bookings: Booking[];
  requests: RequestRow[];
  audit: { id: string; action: string; detail: string; created: number }[];
  user: string;
  role?: string;
  permissions?: string[];
};
export const labels: Record<string, string> = {
  booked: 'Đã đặt',
  playing: 'Đang chơi',
  paused: 'Tạm dừng',
  finished: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};
export function time(ms: number) {
  return new Date(ms).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export function date(ms: number) {
  return new Date(ms).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  });
}
