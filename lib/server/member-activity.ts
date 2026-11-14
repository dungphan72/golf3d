import { db } from './common';

/** One line of a member's recent money, package and points movements. */
export type Activity = {
  at: number;
  kind: 'wallet' | 'package' | 'points';
  title: string;
  /** Change in wallet money (đồng): + top-up or bonus, - spent. */
  money?: number;
  /** Money paid for a package (đồng). */
  paid?: number;
  /** Change in reward points. */
  points?: number;
};

const WALLET_TITLE: Record<string, string> = {
  topup: 'Nạp ví',
  bonus: 'Thưởng khi nạp ví',
  spend: 'Thanh toán bằng ví',
  adjust: 'Điều chỉnh số dư ví',
};
const POINTS_TITLE: Record<string, string> = {
  earn: 'Tích điểm từ thanh toán',
  redeem: 'Đổi điểm lấy lượt chơi',
  adjust: 'Điều chỉnh điểm',
};

/** The latest movements on a member's wallet, packages and points, newest first. */
export async function memberActivity(tenant: string, customerId: string, limit = 12): Promise<Activity[]> {
  const [wallet, packages, points] = await Promise.all([
    db()
      .prepare('SELECT delta,reason,created FROM wallet_ledger WHERE tenant=? AND customer_id=? ORDER BY created DESC LIMIT ?')
      .bind(tenant, customerId, limit)
      .all<{ delta: number; reason: string; created: number }>(),
    db()
      .prepare('SELECT name,price_paid,purchased FROM customer_packages WHERE tenant=? AND customer_id=? ORDER BY purchased DESC LIMIT ?')
      .bind(tenant, customerId, limit)
      .all<{ name: string; price_paid: number; purchased: number }>(),
    db()
      .prepare('SELECT delta,reason,created FROM loyalty_ledger WHERE tenant=? AND customer_id=? ORDER BY created DESC LIMIT ?')
      .bind(tenant, customerId, limit)
      .all<{ delta: number; reason: string; created: number }>(),
  ]);
  const list: Activity[] = [
    ...wallet.results.map((r): Activity => ({ at: r.created, kind: 'wallet', title: WALLET_TITLE[r.reason] ?? 'Giao dịch ví', money: r.delta })),
    ...packages.results.map((r): Activity => ({ at: r.purchased, kind: 'package', title: `Mua ${r.name}`, paid: r.price_paid })),
    ...points.results.map((r): Activity => ({ at: r.created, kind: 'points', title: POINTS_TITLE[r.reason] ?? 'Điểm thưởng', points: r.delta })),
  ];
  return list.sort((a, b) => b.at - a.at).slice(0, limit);
}
