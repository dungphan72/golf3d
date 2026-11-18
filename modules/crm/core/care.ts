import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../../lib/member.ts';

// Customer care: tasks the system creates for existing customers (members, walk-ins) from what they bought and played.

export const CARE_RULES = [
  {
    id: 'welcome',
    name: 'Chào mừng khách mới',
    help: 'Khách mới được tạo hồ sơ (đăng ký online, bán gói, hoặc tự tạo từ phiếu đã thu).',
    param: { label: 'Gọi sau (giờ)', min: 0, max: 168 },
    def: { enabled: true, value: 0 },
    template:
      'Chào {ten}, cảm ơn anh/chị đã đến với {cs}. Anh/chị cần đặt lịch hay tư vấn gói hội viên, cứ nhắn em nhé!',
  },
  {
    id: 'thanks',
    name: 'Cảm ơn sau buổi chơi',
    help: 'Sau mỗi buổi chơi đã thanh toán (mỗi khách tối đa một việc trong 7 ngày).',
    param: { label: 'Liên hệ sau (giờ)', min: 1, max: 168 },
    def: { enabled: true, value: 24 },
    template:
      'Chào {ten}, cảm ơn anh/chị đã chơi tại {cs} hôm {ngay}. Anh/chị thấy trải nghiệm thế nào ạ? Rất mong được phục vụ anh/chị lần sau.',
  },
  {
    id: 'comeback',
    name: 'Mời khách quay lại',
    help: 'Khách đã chơi nhưng lâu không quay lại.',
    param: { label: 'Sau bao nhiêu ngày không chơi', min: 7, max: 365 },
    def: { enabled: true, value: 30 },
    template:
      'Chào {ten}, lâu rồi ({so_ngay} ngày) em chưa thấy anh/chị ghé {cs}. Đang có nhiều ưu đãi, anh/chị đặt lịch tuần này em hỗ trợ nhé!',
  },
  {
    id: 'pkg_expiring',
    name: 'Gói sắp hết hạn',
    help: 'Gói hoặc thẻ còn giờ/lượt nhưng sắp hết hạn.',
    param: { label: 'Báo trước (ngày)', min: 1, max: 60 },
    def: { enabled: true, value: 7 },
    template:
      'Chào {ten}, {goi} của anh/chị còn {con} và hết hạn ngày {han}. Anh/chị sắp xếp lịch chơi hoặc gia hạn để không mất giờ nhé ạ.',
  },
  {
    id: 'pkg_low',
    name: 'Gói sắp hết giờ',
    help: 'Gói còn ít giờ hoặc chỉ còn một lượt: gợi ý gia hạn.',
    param: { label: 'Còn tối đa (giờ)', min: 1, max: 20 },
    def: { enabled: true, value: 2 },
    template:
      'Chào {ten}, {goi} của anh/chị chỉ còn {con}. Em gửi anh/chị ưu đãi khi gia hạn gói mới nếu anh/chị cần ạ.',
  },
  {
    id: 'birthday',
    name: 'Chúc mừng sinh nhật',
    help: 'Khách có ngày sinh trong hồ sơ.',
    param: { label: 'Nhắc trước (ngày)', min: 0, max: 7 },
    def: { enabled: true, value: 2 },
    template:
      'Chúc mừng sinh nhật {ten}! {cs} xin gửi lời chúc sức khỏe và những cú đánh thật đẹp. Mời anh/chị ghé chơi nhận quà sinh nhật.',
  },
  {
    id: 'points',
    name: 'Đủ điểm đổi lượt miễn phí',
    help: 'Khách tích đủ 10 điểm để đổi một lượt chơi miễn phí.',
    param: null,
    def: { enabled: true, value: 0 },
    template:
      'Chào {ten}, anh/chị đã có {diem} điểm, đủ đổi một lượt chơi miễn phí tại {cs}. Anh/chị ghé đổi lượt giúp em nhé!',
  },
  {
    id: 'booking_reminder',
    name: 'Nhắc lịch đặt sân',
    help: 'Nhắc lịch chơi tự động trước giờ chơi (mặc định 2 tiếng).',
    param: { label: 'Nhắc trước (giờ)', min: 1, max: 24 },
    def: { enabled: true, value: 2 },
    template:
      'Chào {ten}, Saigon Indoor Golf xin nhắc anh/chị có lịch đặt sân tại {phong} lúc {gio} ngày {ngay}. Chúc anh/chị buổi chơi vui vẻ!',
  },
  {
    id: 'wallet_low',
    name: 'Cảnh báo số dư ví thấp',
    help: 'Cảnh báo nhắc nạp khi số dư ví tiền dưới ngưỡng (mặc định <= 200.000đ).',
    param: { label: 'Ngưỡng số dư (VNĐ)', min: 50000, max: 2000000 },
    def: { enabled: true, value: 200000 },
    template:
      'Chào {ten}, số dư ví của anh/chị tại {cs} hiện còn {so_du}đ. Anh/chị nạp thêm để tiếp tục nhận ưu đãi giờ chơi nhé ạ.',
  },
  {
    id: 'pkg_expiring_steps',
    name: 'Nhắc hết hạn thẻ 7/3/1 ngày',
    help: 'Cảnh báo tự động đa mốc: trước 7 ngày, 3 ngày và 1 ngày trước khi thẻ hội viên hết hạn.',
    param: null,
    def: { enabled: true, value: 0 },
    template:
      'Chào {ten}, thẻ {goi} của anh/chị sắp hết hạn sau {so_ngay} ngày nữa (ngày {han}). Anh/chị gia hạn sớm để giữ giờ nhé!',
  },
  {
    id: 'retention_stages',
    name: 'Chăm sóc khách không quay lại 7/14/30 ngày',
    help: 'Tự động kích hoạt kịch bản chăm sóc theo 3 mốc: 7 ngày, 14 ngày, 30 ngày không ghé chơi.',
    param: null,
    def: { enabled: true, value: 0 },
    template:
      'Chào {ten}, đã {so_ngay} ngày anh/chị chưa ghé {cs}. Đang có nhiều khung giờ đẹp và ưu đãi, anh/chị ghé chơi nhé ạ!',
  },
] as const;

export type CareRuleId = (typeof CARE_RULES)[number]['id'];
const EXTRA_NAMES: Record<string, string> = {
  manual: 'Việc thêm tay',
  complaint: 'Xử lý phản ánh',
  noshow: 'Khách không đến',
};
export const careRuleName = (id: string) =>
  CARE_RULES.find((r) => r.id === id)?.name ?? EXTRA_NAMES[id] ?? id;
/** Promotions: only worth sending to customers who agreed to receive them. */
export const MARKETING_RULES: ReadonlySet<string> = new Set([
  'comeback',
  'pkg_low',
  'points',
  'birthday',
  'wallet_low',
  'retention_stages',
]);

export const CARE_CHANNELS = ['call', 'zalo', 'sms', 'visit', 'email'] as const;
export type CareChannel = (typeof CARE_CHANNELS)[number];
export const CARE_CHANNEL_LABELS: Record<CareChannel, string> = {
  call: 'Gọi điện',
  zalo: 'Zalo',
  sms: 'SMS',
  visit: 'Gặp tại quầy',
  email: 'Email',
};

export type CareSettings = {
  rules: Record<CareRuleId, { enabled: boolean; value: number }>;
  templates: Record<CareRuleId, string>;
  /** Total spending from which a customer is tagged VIP. */
  vipSpend: number;
};

/** Stored settings merged over the defaults, so a new rule or a missing field is always usable. */
export function careSettings(stored?: unknown): CareSettings {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as {
    rules?: Record<string, { enabled?: unknown; value?: unknown } | undefined>;
    templates?: Record<string, unknown>;
    vipSpend?: unknown;
  };
  const rules = {} as CareSettings['rules'];
  const templates = {} as CareSettings['templates'];
  for (const r of CARE_RULES) {
    const s = raw.rules?.[r.id];
    const max = r.param?.max ?? 365;
    const min = r.param?.min ?? 0;
    const value = Number(s?.value);
    rules[r.id] = {
      enabled: typeof s?.enabled === 'boolean' ? s.enabled : r.def.enabled,
      value: Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : r.def.value,
    };
    const t = raw.templates?.[r.id];
    templates[r.id] =
      typeof t === 'string' && t.trim().length >= 5 ? t.trim().slice(0, 500) : r.template;
  }
  const vip = Number(raw.vipSpend);
  return {
    rules,
    templates,
    vipSpend:
      Number.isFinite(vip) && vip >= 0 ? Math.min(10_000_000_000, Math.round(vip)) : 10_000_000,
  };
}

/** Fills {ten}, {goi}... in a template; unknown placeholders stay visible so a typo is noticed. */
export function renderTemplate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{([a-z_]+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export const unitsText = (balances: { kind: GrantKind; remaining: number }[] | undefined) =>
  (balances ?? [])
    .map((b) =>
      b.remaining >= UNLIMITED
        ? 'không giới hạn'
        : `${b.remaining} ${KIND_LABELS[b.kind]?.toLowerCase() ?? b.kind}`,
    )
    .join(', ');

export type Segment = 'new' | 'loyal' | 'vip' | 'lapsing' | 'dormant' | 'idle';
export const SEGMENT_LABELS: Record<Segment, string> = {
  new: 'Mới',
  loyal: 'Thân thiết',
  vip: 'VIP',
  lapsing: 'Sắp rời bỏ',
  dormant: 'Ngủ đông',
  idle: 'Chưa chơi',
};
const DAY = 86_400_000;

/** Tags computed from the visit history; a customer can carry several. */
export function segmentsOf(
  c: {
    created: number;
    visits: number;
    lastVisit: number | null;
    spend: number;
    recentVisits: number;
  },
  settings: Pick<CareSettings, 'vipSpend'>,
  now: number,
): Segment[] {
  const tags: Segment[] = [];
  if (c.visits === 0) tags.push('idle');
  if (c.visits <= 1 && now - c.created <= 30 * DAY) tags.push('new');
  if (c.recentVisits >= 5) tags.push('loyal');
  if (settings.vipSpend > 0 && c.spend >= settings.vipSpend) tags.push('vip');
  if (c.visits > 0 && c.lastVisit != null) {
    const gap = now - c.lastVisit;
    if (gap > 60 * DAY) tags.push('dormant');
    else if (gap > 30 * DAY) tags.push('lapsing');
  }
  return tags;
}

/** The message staff send for a care task: the rule's template filled with the customer's facts. */
export function careMessage(
  task: { rule: string; data: string; name: string },
  settings: CareSettings,
  club: string,
) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(task.data || '{}') as Record<string, unknown>;
  } catch {
    /* an unreadable payload just leaves the placeholders empty */
  }
  const template =
    (settings.templates as Record<string, string>)[task.rule] ??
    'Chào {ten}, {cs} xin liên hệ anh/chị. Anh/chị cần hỗ trợ gì cứ nhắn em nhé!';
  return renderTemplate(template, {
    ten: String(data.ten ?? task.name),
    cs: club,
    ngay: String(data.ngay ?? ''),
    goi: String(data.goi ?? ''),
    han: String(data.han ?? ''),
    con: unitsText(data.balances as never),
    so_ngay: String(data.so_ngay ?? ''),
    diem: String(data.diem ?? ''),
    dich_vu: String(data.dich_vu ?? ''),
  });
}
