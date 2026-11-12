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
 *  - Hour cards were removed: top-up bonuses live in the money wallet (lib/wallet.ts).
 *  - Monthly cards: unlimited playing hours, validity counted from the activation date.
 */
export const OFFICIAL_PACKAGES: PackageTemplate[] = [
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
