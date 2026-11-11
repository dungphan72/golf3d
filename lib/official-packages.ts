import { UNLIMITED, type Grant } from './member.ts';

export type PackageTemplate = {
  key: string;
  name: string;
  price: number;
  grants: Grant[];
  validDays: number;
  perks: string;
  /** Heading on the public price list. */
  section: string;
};

const DAYS = 30;
/**
 * Prepaid cards from the official "Bảng giá" poster (11/2026), see docs/PRICING.md.
 *  - Hour cards: buy 10 get 2 (12 hours), buy 20 get 5 (25 hours); practice only.
 *    The poster gives no card price: it is set at 150.000đ × purchased hours (the Mon–Fri
 *    standard hourly rate) and awaits owner confirmation.
 *  - Monthly cards: unlimited playing hours, validity counted from the activation date.
 */
export const OFFICIAL_PACKAGES: PackageTemplate[] = [
  {
    key: 'hour-10',
    name: 'Thẻ giờ · mua 10 giờ tặng 2 giờ',
    price: 1_500_000,
    grants: [{ kind: 'gdr', qty: 12 }],
    validDays: 3650,
    perks: 'Tổng 12 giờ · chỉ áp dụng tập luyện',
    section: 'Thẻ giờ',
  },
  {
    key: 'hour-20',
    name: 'Thẻ giờ · mua 20 giờ tặng 5 giờ',
    price: 3_000_000,
    grants: [{ kind: 'gdr', qty: 25 }],
    validDays: 3650,
    perks: 'Tổng 25 giờ · chỉ áp dụng tập luyện',
    section: 'Thẻ giờ',
  },
  {
    key: 'month-1',
    name: 'Thẻ tháng · 1 tháng',
    price: 5_000_000,
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
    validDays: 1 * DAYS,
    perks: 'Không giới hạn giờ chơi · thời hạn tính từ ngày kích hoạt thẻ',
    section: 'Thẻ tháng',
  },
  {
    key: 'month-3',
    name: 'Thẻ tháng · 3 tháng',
    price: 14_000_000,
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
    validDays: 3 * DAYS,
    perks: 'Không giới hạn giờ chơi · thời hạn tính từ ngày kích hoạt thẻ',
    section: 'Thẻ tháng',
  },
  {
    key: 'month-6',
    name: 'Thẻ tháng · 6 tháng',
    price: 25_000_000,
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
    validDays: 6 * DAYS,
    perks: 'Không giới hạn giờ chơi · thời hạn tính từ ngày kích hoạt thẻ',
    section: 'Thẻ tháng',
  },
];
