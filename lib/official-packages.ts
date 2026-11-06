import { UNLIMITED, type Grant } from './member.ts';

export type PackageTemplate = {
  key: string;
  name: string;
  price: number;
  grants: Grant[];
  validDays: number;
  perks: string;
};

const DAYS = 30;
/**
 * Prepaid packages from the owner's official price list (docs/PRICING.md). Purchased bonus uses are
 * already included in the grants (10 rounds + 1 free = 11, 20 + 5 = 25).
 */
export const OFFICIAL_PACKAGES: PackageTemplate[] = [
  {
    key: 'h9-10',
    name: 'Combo 9 hố · 10 lượt (+1)',
    price: 3_000_000,
    grants: [{ kind: 'holes9', qty: 11 }],
    validDays: 3 * DAYS,
    perks: 'Giảm 20% F&B khi thanh toán thẻ',
  },
  {
    key: 'h9-20',
    name: 'Combo 9 hố · 20 lượt (+5)',
    price: 6_000_000,
    grants: [{ kind: 'holes9', qty: 25 }],
    validDays: 6 * DAYS,
    perks: 'Giảm 20% F&B khi thanh toán thẻ',
  },
  {
    key: 'h18-10',
    name: 'Combo 18 hố · 10 lượt (+1)',
    price: 5_000_000,
    grants: [{ kind: 'holes18', qty: 11 }],
    validDays: 3 * DAYS,
    perks: 'Giảm 20% F&B khi thanh toán thẻ',
  },
  {
    key: 'h18-20',
    name: 'Combo 18 hố · 20 lượt (+5)',
    price: 10_000_000,
    grants: [{ kind: 'holes18', qty: 25 }],
    validDays: 6 * DAYS,
    perks: 'Giảm 20% F&B khi thanh toán thẻ',
  },
  {
    key: 'gdr-peak-10',
    name: 'Luyện tập giờ vàng · 10 buổi (+5)',
    price: 1_000_000,
    grants: [{ kind: 'gdr', qty: 15 }],
    validDays: 2 * DAYS,
    perks: '90 phút/buổi, giờ vàng 08:00–11:00',
  },
  {
    key: 'gdr-10',
    name: 'Luyện tập · 10 buổi (+1)',
    price: 2_000_000,
    grants: [{ kind: 'gdr', qty: 11 }],
    validDays: 3 * DAYS,
    perks: '90 phút/buổi',
  },
  {
    key: 'gdr-20',
    name: 'Luyện tập · 20 buổi (+5)',
    price: 4_000_000,
    grants: [{ kind: 'gdr', qty: 25 }],
    validDays: 6 * DAYS,
    perks: '90 phút/buổi · miễn phí đỗ xe',
  },
  {
    key: 'gdr-1m',
    name: 'Luyện tập · 1 tháng',
    price: 3_000_000,
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
    validDays: 1 * DAYS,
    perks: 'Tặng tủ đồ 1 tháng',
  },
  {
    key: 'gdr-3m',
    name: 'Luyện tập · 3 tháng',
    price: 7_500_000,
    grants: [{ kind: 'gdr', qty: UNLIMITED }],
    validDays: 3 * DAYS,
    perks: 'Tặng tủ đồ 3 tháng',
  },
  {
    key: 'gdr-6m',
    name: 'Luyện tập · 6 tháng (giảm 30%)',
    price: 9_450_000,
    grants: [
      { kind: 'gdr', qty: UNLIMITED },
      { kind: 'holes18', qty: 6 },
    ],
    validDays: 6 * DAYS,
    perks: 'Tặng 6 lượt 18 hố · tủ đồ 6 tháng · miễn phí đỗ xe',
  },
  {
    key: 'gdr-12m',
    name: 'Luyện tập · 12 tháng (giảm 30%)',
    price: 17_500_000,
    grants: [
      { kind: 'gdr', qty: UNLIMITED },
      { kind: 'holes18', qty: 12 },
    ],
    validDays: 12 * DAYS,
    perks: 'Tặng 12 lượt 18 hố · tủ đồ 12 tháng · miễn phí đỗ xe',
  },
  {
    key: 'vip-platinum',
    name: 'Thẻ VIP Platinum',
    price: 20_000_000,
    grants: [
      { kind: 'holes18', qty: 10 },
      { kind: 'gdr', qty: 10 },
    ],
    validDays: 6 * DAYS,
    perks: 'Phòng chờ VIP · 1 bia/nước · giảm 20% F&B · miễn phí đỗ xe',
  },
  {
    key: 'vip-diamond',
    name: 'Thẻ VIP Diamond',
    price: 50_000_000,
    grants: [
      { kind: 'holes18', qty: 20 },
      { kind: 'gdr', qty: 20 },
    ],
    validDays: 12 * DAYS,
    perks: 'Phòng chờ VVIP · 1 bia/nước · giảm 30% F&B · miễn phí đỗ xe',
  },
];
