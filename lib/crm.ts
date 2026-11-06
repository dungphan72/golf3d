import { z } from 'zod';

/**
 * CRM: customer-care flows that generate tasks automatically from what happens in the club
 * (new customers, finished rounds, packages running out, birthdays, points), plus the contact
 * history of each customer. Messages are written from templates; staff send them by phone or Zalo
 * and record the result, so nothing depends on an SMS provider.
 */
export const CRM_RULES = [
  {
    id: 'welcome',
    name: 'Chào mừng khách mới',
    help: 'Khách mới được tạo hồ sơ (đăng ký online, bán gói, hoặc tự tạo từ phiếu đã thu).',
    param: { label: 'Gọi sau (giờ)', min: 0, max: 168, def: 0 },
    def: { enabled: true, value: 0 },
    template:
      'Chào {ten}, cảm ơn anh/chị đã đến với {cs}. Anh/chị cần đặt lịch hay tư vấn gói hội viên, cứ nhắn em nhé!',
  },
  {
    id: 'thanks',
    name: 'Cảm ơn sau buổi chơi',
    help: 'Sau mỗi buổi chơi đã thanh toán (mỗi khách tối đa một việc trong 7 ngày).',
    param: { label: 'Liên hệ sau (giờ)', min: 1, max: 168, def: 24 },
    def: { enabled: true, value: 24 },
    template:
      'Chào {ten}, cảm ơn anh/chị đã chơi tại {cs} hôm {ngay}. Anh/chị thấy trải nghiệm thế nào ạ? Rất mong được phục vụ anh/chị lần sau.',
  },
  {
    id: 'comeback',
    name: 'Mời khách quay lại',
    help: 'Khách đã chơi nhưng lâu không quay lại.',
    param: { label: 'Sau bao nhiêu ngày không chơi', min: 7, max: 365, def: 30 },
    def: { enabled: true, value: 30 },
    template:
      'Chào {ten}, lâu rồi ({so_ngay} ngày) em chưa thấy anh/chị ghé {cs}. Đang có nhiều ưu đãi, anh/chị đặt lịch tuần này em hỗ trợ nhé!',
  },
  {
    id: 'pkg_expiring',
    name: 'Gói sắp hết hạn',
    help: 'Gói hoặc thẻ còn giờ/lượt nhưng sắp hết hạn.',
    param: { label: 'Báo trước (ngày)', min: 1, max: 60, def: 7 },
    def: { enabled: true, value: 7 },
    template:
      'Chào {ten}, {goi} của anh/chị còn {con} và hết hạn ngày {han}. Anh/chị sắp xếp lịch chơi hoặc gia hạn để không mất giờ nhé ạ.',
  },
  {
    id: 'pkg_low',
    name: 'Gói sắp hết giờ',
    help: 'Gói còn ít giờ hoặc chỉ còn một lượt: gợi ý gia hạn.',
    param: { label: 'Còn tối đa (giờ)', min: 1, max: 20, def: 2 },
    def: { enabled: true, value: 2 },
    template:
      'Chào {ten}, {goi} của anh/chị chỉ còn {con}. Em gửi anh/chị ưu đãi khi gia hạn gói mới nếu anh/chị cần ạ.',
  },
  {
    id: 'birthday',
    name: 'Chúc mừng sinh nhật',
    help: 'Khách có ngày sinh trong hồ sơ.',
    param: { label: 'Nhắc trước (ngày)', min: 0, max: 7, def: 2 },
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
      'Chào {ten}, anh/chị đang có {diem} điểm tích lũy, đủ đổi lượt chơi miễn phí tại {cs}. Anh/chị ghé đổi nhé ạ.',
  },
] as const;
export type CrmRuleId = (typeof CRM_RULES)[number]['id'];
export const RULE_IDS = CRM_RULES.map((r) => r.id) as CrmRuleId[];
const EXTRA_RULE_NAMES: Record<string, string> = {
  manual: 'Việc thêm tay',
  complaint: 'Xử lý phản ánh',
  noshow: 'Khách không đến',
};
export const ruleName = (id: string) =>
  CRM_RULES.find((r) => r.id === id)?.name ?? EXTRA_RULE_NAMES[id] ?? id;
/** Rules whose message is a promotion: it is only sent to customers who agreed to receive them. */
export const MARKETING_RULES = new Set(['comeback', 'pkg_low', 'points', 'birthday']);

export type CrmSettings = {
  rules: Record<CrmRuleId, { enabled: boolean; value: number }>;
  templates: Record<CrmRuleId, string>;
  /** Total spending from which a customer is tagged VIP. */
  vipSpend: number;
};

export const crmSettingsSchema = z.object({
  rules: z.record(
    z.string(),
    z.object({ enabled: z.boolean(), value: z.number().int().min(0).max(365) }),
  ),
  templates: z.record(z.string(), z.string().trim().min(5).max(500)),
  vipSpend: z.number().int().min(0).max(10_000_000_000),
});

/** Stored settings merged over the defaults, so a new rule or a missing field is always usable. */
export function crmSettings(stored?: Partial<CrmSettings> | null): CrmSettings {
  const rules = {} as CrmSettings['rules'];
  const templates = {} as CrmSettings['templates'];
  for (const r of CRM_RULES) {
    const s = stored?.rules?.[r.id];
    rules[r.id] = {
      enabled: s?.enabled ?? r.def.enabled,
      value: Number.isInteger(s?.value) ? s!.value : r.def.value,
    };
    templates[r.id] = stored?.templates?.[r.id]?.trim() || r.template;
  }
  return { rules, templates, vipSpend: stored?.vipSpend ?? 10_000_000 };
}

/** Fills {ten}, {goi}... in a template; unknown placeholders stay visible so a typo is noticed. */
export function renderTemplate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{([a-z_]+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export const CHANNELS = ['call', 'zalo', 'sms', 'visit', 'email', 'note'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  call: 'Gọi điện',
  zalo: 'Zalo',
  sms: 'SMS',
  visit: 'Gặp tại quầy',
  email: 'Email',
  note: 'Ghi chú',
};

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
  settings: CrmSettings,
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

const id = z.string().min(1).max(100);
export const crmInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('task-done'),
      id,
      channel: z.enum(CHANNELS),
      note: z.string().trim().max(600).default(''),
    })
    .strict(),
  z
    .object({ action: z.literal('task-skip'), id, reason: z.string().trim().min(2).max(300) })
    .strict(),
  z
    .object({ action: z.literal('task-snooze'), id, days: z.number().int().min(1).max(30) })
    .strict(),
  z.object({ action: z.literal('task-claim'), id }).strict(),
  z
    .object({
      action: z.literal('task-create'),
      customerId: id,
      title: z.string().trim().min(2).max(150),
      days: z.number().int().min(0).max(365).default(0),
    })
    .strict(),
  z
    .object({
      action: z.literal('note-add'),
      customerId: id,
      channel: z.enum(CHANNELS),
      content: z.string().trim().min(1).max(800),
    })
    .strict(),
  z
    .object({
      action: z.literal('birthday-set'),
      customerId: id,
      birthday: z.string().regex(/^(\d{4}-[01]\d-[0-3]\d|[01]\d-[0-3]\d|)$/),
    })
    .strict(),
  z.object({ action: z.literal('consent-set'), customerId: id, consent: z.boolean() }).strict(),
  z
    .object({
      action: z.literal('contact-set'),
      customerId: id,
      email: z
        .string()
        .trim()
        .max(200)
        .regex(/^([^\s@]+@[^\s@]+\.[^\s@]+)?$/),
      zaloId: z.string().trim().max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal('feedback'),
      customerId: id,
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().max(600).default(''),
    })
    .strict(),
  z.object({ action: z.literal('settings-save'), settings: crmSettingsSchema }).strict(),
]);
export type CrmInput = z.infer<typeof crmInput>;

export type CrmTask = {
  id: string;
  customer_id: string;
  name: string;
  phone: string;
  rule: string;
  title: string;
  due: number;
  status: 'open' | 'done' | 'skipped';
  assignee: string | null;
  assignee_name: string | null;
  channel: string | null;
  note: string;
  created: number;
  handled_at: number | null;
  handled_name: string | null;
  message: string;
  /** The customer agreed to receive promotions. */
  consent?: number;
  /** True when the task is assigned to the signed-in user. */
  mine?: boolean;
};
