import { type ShiftSummary, type Entry } from '../../../lib/finance';

export type FinanceData = {
  shifts: ShiftSummary[];
  selectedId: string | null;
  entries: Entry[];
  hasMore: boolean;
};
export const when = (n: number) =>
  new Date(n).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
export const safeCount = (value: string) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000 ? n : 0;
};
export const methods = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
