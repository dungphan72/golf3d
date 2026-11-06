/** Customer tiers and after-sales care. */
export type Tier = { id: string; name: string; min: number; color: string };
export const DEFAULT_TIERS: Tier[] = [
  { id: 'member', name: 'Thành viên', min: 0, color: '#6b7280' },
  { id: 'silver', name: 'Bạc', min: 10_000_000, color: '#64748b' },
  { id: 'gold', name: 'Vàng', min: 30_000_000, color: '#b45309' },
  { id: 'diamond', name: 'Kim cương', min: 100_000_000, color: '#0891b2' },
];

/** Highest tier whose threshold is not above the customer's total of won deals. */
export function tierFor(totalWon: number, tiers: Tier[] = DEFAULT_TIERS): Tier {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  let best = sorted[0];
  for (const t of sorted) if (t.min <= totalWon) best = t;
  return best;
}

export function sanitizeTiers(raw: unknown): Tier[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: Tier[] = [];
  for (const t of list.slice(0, 8)) {
    const x = t as Partial<Tier>;
    if (!x || typeof x.name !== 'string' || !x.name.trim() || !Number.isFinite(x.min)) continue;
    out.push({
      id: String(x.id || x.name).slice(0, 30),
      name: x.name.trim().slice(0, 30),
      min: Math.max(0, Math.round(Number(x.min))),
      color: typeof x.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(x.color) ? x.color : '#6b7280',
    });
  }
  if (!out.length) return DEFAULT_TIERS.map((t) => ({ ...t }));
  out.sort((a, b) => a.min - b.min);
  out[0] = { ...out[0], min: 0 };
  return out;
}

export type AfterSales = {
  enabled: boolean;
  steps: { days: number; title: string }[];
  /** user id; empty = the owner of the lead */
  assignTo: string;
};
export const DEFAULT_AFTER_SALES: AfterSales = {
  enabled: false,
  steps: [
    { days: 3, title: 'Gọi hỏi thăm sau khi mua, xác nhận khách đã nhận quyền lợi' },
    { days: 30, title: 'Nhắc tiến độ sử dụng dịch vụ và thanh toán' },
    { days: 90, title: 'Xin phản hồi và đề nghị giới thiệu khách mới' },
  ],
  assignTo: '',
};

export type CarePlanItem = { title: string; due: number; assignee: string | null };
export function afterSalesPlan(
  cfg: AfterSales,
  wonAt: number,
  leadOwner: string | null,
): CarePlanItem[] {
  if (!cfg.enabled) return [];
  return cfg.steps.map((s) => ({
    title: s.title,
    due: wonAt + s.days * 86_400_000,
    assignee: cfg.assignTo || leadOwner,
  }));
}

export const PARTNER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
