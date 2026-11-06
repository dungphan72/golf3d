import { z } from 'zod';
import { normalizePhone, validPhone } from './member.ts';

/**
 * CRM leads: every inquiry (Facebook lead form, Zalo OA message, a website form, an ad form) becomes
 * a lead tied to a customer by phone number, is assigned to an on-duty agent, and must be called
 * within SLA_MINUTES of arrival. This file holds the pure parts: vocabulary, payload parsing,
 * the assignment choice and the message texts, so they can be tested without a database.
 */
export const SLA_MINUTES = 5;
export const SLA_MS = SLA_MINUTES * 60_000;
export const DUTY_MAX_HOURS = 12; // a forgotten "on duty" switch turns itself off

export const LEAD_SOURCES = ['facebook', 'zalo', 'website', 'ads', 'manual'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const SOURCE_LABELS: Record<LeadSource, string> = {
  facebook: 'Facebook',
  zalo: 'Zalo OA',
  website: 'Website',
  ads: 'Quảng cáo',
  manual: 'Nhập tay',
};
export const NEEDS = ['swing', '9', '18', 'group', 'other'] as const;
export type Need = (typeof NEEDS)[number];
export const NEED_LABELS: Record<Need, string> = {
  swing: 'Tập swing',
  '9': 'Chơi 9 hố',
  '18': 'Chơi 18 hố',
  group: 'Nhóm / sự kiện',
  other: 'Khác',
};
export const LEAD_STATUS_LABELS: Record<string, string> = {
  queued: 'Chờ nhân viên trực',
  assigned: 'Chờ gọi',
  contacted: 'Đã liên hệ',
  booked: 'Đã đặt lịch',
  lost: 'Không đặt',
};
export const CALL_RESULTS = [
  'answered',
  'need_more',
  'thinking',
  'trial',
  'trial_moved',
  'trial_done',
  'callback',
  'no_answer',
  'busy',
  'wrong_number',
  'no_need',
] as const;
export type CallResult = (typeof CALL_RESULTS)[number];
export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  answered: 'Đã nghe máy, đã tư vấn',
  need_more: 'Có nhu cầu, cần tư vấn tiếp',
  thinking: 'Khách cần suy nghĩ thêm',
  trial: 'Hẹn đến trải nghiệm',
  trial_moved: 'Khách dời lịch trải nghiệm',
  trial_done: 'Đã gặp khách, đã trải nghiệm',
  callback: 'Khách hẹn gọi lại',
  no_answer: 'Không nghe máy',
  busy: 'Máy bận',
  wrong_number: 'Sai số',
  no_need: 'Không có nhu cầu',
};

/** Pipeline of a service consultation, from the first inquiry to the sale. */
export const STAGES = [
  'new',
  'contacted',
  'qualified',
  'trial',
  'visited',
  'deposit',
  'won',
  'lost',
] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABELS: Record<Stage, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Có nhu cầu',
  trial: 'Hẹn trải nghiệm',
  visited: 'Đã trải nghiệm',
  deposit: 'Giữ chỗ, đặt cọc',
  won: 'Chốt dịch vụ',
  lost: 'Không thành',
};
export const stageLabel = (s: string) => STAGE_LABELS[s as Stage] ?? s;
export const LOST_REASONS = [
  'Không liên lạc được',
  'Chưa có nhu cầu',
  'Giá cao hoặc ngân sách',
  'Chọn nơi khác',
  'Ở xa, đi lại bất tiện',
  'Khác',
] as const;
export const LEAD_TAGS = ['VIP', 'Doanh nghiệp', 'Người mới chơi', 'Cần HLV', 'Nhạy cảm về giá'];

const HOUR = 3_600_000;
/** Wait before calling again after a call nobody answered: 2 hours, 1 day, 2 days. */
export const MISSED_WAITS = [2 * HOUR, 24 * HOUR, 48 * HOUR];
export const MAX_MISSED = 3;
const MISSED_RESULTS = new Set<CallResult>(['no_answer', 'busy']);

export type NextStep = {
  /** The stage the lead moves to; null keeps the current one. */
  stage: Stage | null;
  nextAt: number | null;
  nextNote: string;
  /** Set when the call closes the lead as lost. */
  lost: string | null;
  missed: number;
  /** The customer was reached (the lead counts as contacted). */
  reached: boolean;
};

/**
 * What a call result means for the pipeline: the stage, when to follow up, and whether the lead is
 * over. `at` is the agreed time of a meeting. Returns an error text when the result needs more input.
 */
export function nextStep(
  result: CallResult,
  o: { now: number; missed: number; at?: number | null },
): NextStep | { error: string } {
  const keep = { stage: null, nextAt: null, nextNote: '', lost: null, missed: 0, reached: true };
  if (MISSED_RESULTS.has(result)) {
    const missed = o.missed + 1;
    const wait = MISSED_WAITS[Math.min(missed, MAX_MISSED) - 1];
    return {
      ...keep,
      reached: false,
      missed,
      nextAt: o.now + wait,
      nextNote: `Gọi lại lần ${Math.min(missed, MAX_MISSED)}`,
    };
  }
  switch (result) {
    case 'answered':
      return { ...keep, stage: 'contacted' };
    case 'callback':
      return {
        ...keep,
        stage: 'contacted',
        nextAt: o.at ?? o.now + 24 * HOUR,
        nextNote: 'Khách hẹn gọi lại',
      };
    case 'need_more':
      return { ...keep, stage: 'qualified', nextAt: o.now + 24 * HOUR, nextNote: 'Tư vấn tiếp' };
    case 'thinking':
      return {
        ...keep,
        stage: 'qualified',
        nextAt: o.now + 48 * HOUR,
        nextNote: 'Hỏi lại khách sau khi suy nghĩ',
      };
    case 'trial':
    case 'trial_moved':
      if (o.at == null || o.at <= o.now) return { error: 'Chọn ngày giờ trải nghiệm ở tương lai' };
      return { ...keep, stage: 'trial', nextAt: o.at, nextNote: 'Buổi trải nghiệm' };
    case 'trial_done':
      return {
        ...keep,
        stage: 'visited',
        nextAt: o.now + 24 * HOUR,
        nextNote: 'Bám sát sau trải nghiệm',
      };
    case 'wrong_number':
      return { ...keep, stage: 'lost', lost: 'Sai số, số không liên lạc được' };
    case 'no_need':
      return { ...keep, stage: 'lost', lost: 'Chưa có nhu cầu' };
    default:
      return { ...keep };
  }
}

/** Sort key for the work desk: what is overdue first, then what is due soonest. */
export const workDue = (l: { next_at: number | null; due_at: number | null }) =>
  l.next_at ?? l.due_at ?? Number.MAX_SAFE_INTEGER;

export type LeadInput = {
  source: LeadSource;
  campaign: string;
  /** Id of the event on the source channel; the same id is never processed twice. */
  extKey: string;
  name: string;
  phone: string; // normalised, '' when unknown
  email: string;
  zaloId: string;
  need: Need | '';
  guests: number;
  preferredStart: number | null;
  message: string;
  consent: boolean;
  /** Where to reply when there is no phone number (thread / lead id on the source channel). */
  channelRef: string;
};

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PHONE_IN_TEXT = /(?:\+?84|0)[\s.-]?\d(?:[\s.-]?\d){8,9}/;

/** A phone number typed anywhere in free text, normalised; '' when there is none. */
export function phoneInText(text: string) {
  const m = text.match(PHONE_IN_TEXT);
  if (!m) return '';
  const p = normalizePhone(m[0]);
  return validPhone(p) ? p : '';
}

/** Guesses what the customer wants from what they wrote. */
export function needFromText(text: string): Need | '' {
  const t = text.toLowerCase();
  if (/nhóm|sự kiện|team ?building|công ty|giải đấu/.test(t)) return 'group';
  if (/18 ?hố|18 ?holes/.test(t)) return '18';
  if (/9 ?hố|9 ?holes/.test(t)) return '9';
  if (/swing|tập|luyện|gdr|huấn luyện|hlv/.test(t)) return 'swing';
  return '';
}

function build(partial: Partial<LeadInput> & Pick<LeadInput, 'source' | 'extKey'>): LeadInput {
  const phone = normalizePhone(partial.phone ?? '');
  return {
    campaign: '',
    name: '',
    email: '',
    zaloId: '',
    need: '',
    guests: 0,
    preferredStart: null,
    message: '',
    consent: false,
    channelRef: '',
    ...partial,
    phone: validPhone(phone) ? phone : '',
  };
}

const needOf = (v: unknown): Need | '' =>
  (NEEDS as readonly string[]).includes(String(v)) ? (String(v) as Need) : '';

/** Form on a website (3dgolf.vn or this site). */
export const websiteLeadSchema = z
  .object({
    id: z.string().max(100).optional(),
    name: z.string().trim().max(100).default(''),
    phone: z.string().trim().max(30).default(''),
    email: z.string().trim().max(200).default(''),
    need: z.string().max(20).default(''),
    guests: z.number().int().min(0).max(1000).default(0),
    preferredStart: z.number().int().optional(),
    message: z.string().trim().max(1500).default(''),
    campaign: z.string().trim().max(120).default(''),
    consent: z.boolean().default(false),
    website: z.string().max(0).default(''), // honeypot
  })
  .strict();
export function fromWebsite(
  raw: z.infer<typeof websiteLeadSchema>,
  now: number,
  source: LeadSource = 'website',
): LeadInput {
  const phone = normalizePhone(raw.phone) || phoneInText(raw.message);
  return build({
    source,
    campaign: raw.campaign,
    extKey: `${source}:${raw.id ?? `${phone || raw.email || raw.name}:${Math.floor(now / 60_000)}`}`,
    name: raw.name,
    phone,
    email: raw.email,
    need: needOf(raw.need) || needFromText(raw.message),
    guests: raw.guests,
    preferredStart: raw.preferredStart ?? null,
    message: raw.message,
    consent: raw.consent,
  });
}

/** Ad platforms and automation tools (Zapier, Make, Google/TikTok lead forms) posting a simple payload. */
export const adsLeadSchema = websiteLeadSchema
  .extend({ source: z.string().max(30).default('ads') })
  .strict();
export function fromAds(raw: z.infer<typeof adsLeadSchema>, now: number): LeadInput {
  const { source: label, ...rest } = raw;
  const lead = fromWebsite({ ...rest, campaign: rest.campaign || label }, now, 'ads');
  return { ...lead, extKey: `ads:${raw.id ?? lead.extKey}` };
}

type FbField = { name?: string; values?: unknown[] };
/** Facebook / Instagram lead form: `field_data` as returned by the Graph API. */
export function fromFacebookFields(
  fields: FbField[],
  meta: { leadgenId: string; formId?: string; adId?: string; campaign?: string; created?: number },
  now: number,
): LeadInput {
  const get = (...names: string[]) => {
    const f = fields.find((x) => names.includes(String(x.name ?? '').toLowerCase()));
    return str(f?.values?.[0]);
  };
  const message = [get('nhu_cau', 'need', 'ghi_chu', 'message'), get('so_nguoi', 'guests')]
    .filter(Boolean)
    .join(' · ');
  return build({
    source: 'facebook',
    campaign: meta.campaign || meta.adId || meta.formId || '',
    extKey: `facebook:${meta.leadgenId}`,
    name: get('full_name', 'name', 'ho_ten', 'họ_và_tên'),
    phone: get('phone_number', 'phone', 'so_dien_thoai', 'số_điện_thoại'),
    email: get('email'),
    need: needFromText(message),
    message,
    consent: false,
    channelRef: `facebook-lead:${meta.leadgenId}`,
    preferredStart: meta.created ? meta.created * 1000 : now,
  });
}

/** Zalo OA webhook event: a customer wrote to the Official Account. */
export function fromZaloEvent(body: Record<string, unknown>, now: number): LeadInput | null {
  if (body.event_name !== 'user_send_text') return null;
  const sender = (body.sender ?? {}) as Record<string, unknown>;
  const message = (body.message ?? {}) as Record<string, unknown>;
  const userId = str(sender.id, 100);
  const text = str(message.text, 1500);
  if (!userId || !text) return null;
  return build({
    source: 'zalo',
    extKey: `zalo:${str(message.msg_id, 100) || `${userId}:${now}`}`,
    name: '',
    phone: phoneInText(text),
    zaloId: userId,
    need: needFromText(text),
    message: text,
    channelRef: `zalo:${userId}`,
  });
}

/** Round-robin choice: among eligible agents, the one waiting longest (never assigned first) gets the lead. */
export type AgentRow = {
  user_id: string;
  receives_leads: number;
  on_duty: number;
  duty_since: number | null;
  last_assigned: number | null;
};
export function pickAgent(
  agents: AgentRow[],
  opts: { exclude?: string[]; prefer?: string | null; now: number },
): AgentRow | null {
  const free = agents.filter(
    (a) =>
      a.receives_leads === 1 &&
      a.on_duty === 1 &&
      !(opts.exclude ?? []).includes(a.user_id) &&
      (a.duty_since == null || opts.now - a.duty_since < DUTY_MAX_HOURS * 3_600_000),
  );
  if (!free.length) return null;
  const preferred = opts.prefer ? free.find((a) => a.user_id === opts.prefer) : undefined;
  if (preferred) return preferred;
  return [...free].sort(
    (a, b) =>
      (a.last_assigned ?? -1) - (b.last_assigned ?? -1) || a.user_id.localeCompare(b.user_id),
  )[0];
}

export const dueIn = (due: number, now: number) => due - now;

// ---- Message texts ----
const link = (base: string, path: string) => base.replace(/\/$/, '') + path;
export const leadLink = (base: string, leadId: string, customerId: string | null) =>
  customerId
    ? link(base, `/quan-ly?view=crm&customer=${customerId}&lead=${leadId}`)
    : link(base, `/quan-ly?view=crm&lead=${leadId}`);

type LeadFacts = {
  name: string;
  phone: string;
  need: string;
  message: string;
  source: string;
  campaign: string;
  guests: number;
};
export function staffLeadMessage(l: LeadFacts, url: string, kind: 'new' | 'reassigned' | 'again') {
  const head =
    kind === 'new'
      ? `Lead mới, gọi trong ${SLA_MINUTES} phút`
      : kind === 'reassigned'
        ? `Lead chuyển cho bạn (nhân viên trước chưa gọi), gọi trong ${SLA_MINUTES} phút`
        : `Khách cũ vừa liên hệ lại, gọi trong ${SLA_MINUTES} phút`;
  const lines = [
    head,
    `Khách: ${l.name || 'Chưa có tên'}`,
    `Điện thoại: ${l.phone || 'Chưa có (trả lời qua ' + l.source + ')'}`,
    `Nhu cầu: ${l.need || 'Chưa rõ'}${l.guests ? ` · ${l.guests} khách` : ''}`,
    l.message ? `Nội dung: ${l.message}` : '',
    `Nguồn: ${l.source}${l.campaign ? ` · ${l.campaign}` : ''}`,
    `Hồ sơ: ${url}`,
  ];
  return {
    subject: `[Lead] ${l.name || l.phone || 'Khách mới'} · gọi trong ${SLA_MINUTES} phút`,
    body: lines.filter(Boolean).join('\n'),
  };
}
export function managerMessage(
  kind: 'overdue' | 'queued',
  l: LeadFacts & { agent?: string },
  url: string,
) {
  const head =
    kind === 'overdue'
      ? `Quá ${SLA_MINUTES} phút chưa ghi nhận cuộc gọi${l.agent ? ` (${l.agent})` : ''}. Lead đã chuyển cho người trực tiếp theo.`
      : 'Không có nhân viên nào đang trực nhận lead. Lead nằm trong hàng chờ, cần xử lý ngay.';
  return {
    subject:
      kind === 'overdue' ? `[Quá hạn] ${l.name || l.phone}` : `[Hàng chờ] ${l.name || l.phone}`,
    body: [
      head,
      `Khách: ${l.name || 'Chưa có tên'} · ${l.phone || 'chưa có số'}`,
      `Nhu cầu: ${l.need || 'Chưa rõ'}`,
      `Hồ sơ: ${url}`,
    ].join('\n'),
  };
}

export function bookingInfoMessage(
  club: string,
  b: { name: string; when: string; room: string; service: string; people: number },
) {
  return {
    subject: `${club}: xác nhận lịch chơi`,
    body: `Chào ${b.name}, ${club} xác nhận lịch của anh/chị:\n${b.service} · ${b.room} · ${b.people} người\nThời gian: ${b.when}\nAnh/chị đến trước giờ chơi vài phút, cần đổi hoặc hủy lịch xin nhắn lại cho chúng em.`,
  };
}
export function reminderMessage(club: string, b: { name: string; when: string; room: string }) {
  return {
    subject: `${club}: nhắc lịch chơi`,
    body: `Chào ${b.name}, nhắc anh/chị lịch chơi tại ${club} lúc ${b.when} (${b.room}). Hẹn gặp anh/chị!`,
  };
}
export function cancelMessage(club: string, b: { name: string; when: string }) {
  return {
    subject: `${club}: lịch đã hủy`,
    body: `Chào ${b.name}, lịch chơi lúc ${b.when} tại ${club} đã được hủy. Anh/chị muốn đặt lại, cứ nhắn cho chúng em nhé.`,
  };
}
export function noShowMessage(club: string, b: { name: string; when: string }) {
  return {
    subject: `${club}: chưa thấy anh/chị đến`,
    body: `Chào ${b.name}, ${club} chưa thấy anh/chị đến lịch lúc ${b.when}. Anh/chị cần đổi sang giờ khác, nhắn cho chúng em để sắp xếp lại ạ.`,
  };
}
export function receiptMessage(
  club: string,
  r: { name: string; when: string; lines: string[]; total: string; method: string },
) {
  return {
    subject: `${club}: biên nhận thanh toán`,
    body: [
      `Chào ${r.name}, ${club} xác nhận đã nhận thanh toán của anh/chị.`,
      `Thời gian: ${r.when}`,
      ...r.lines,
      `Tổng đã thu: ${r.total} (${r.method})`,
      'Cảm ơn anh/chị!',
    ].join('\n'),
  };
}
export function thanksMessage(club: string, b: { name: string; rebook?: string }) {
  return {
    subject: `${club}: cảm ơn anh/chị`,
    body: [
      `Chào ${b.name}, cảm ơn anh/chị đã chơi tại ${club}.`,
      'Anh/chị thấy trải nghiệm hôm nay thế nào ạ? Anh/chị nhắn lại để chúng em phục vụ tốt hơn.',
      b.rebook ? `Đặt lại lịch nhanh tại: ${b.rebook}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
export function bookingLinkMessage(
  club: string,
  b: { name: string; url: string; when: string; total: string },
) {
  return {
    subject: `${club}: link đặt lịch`,
    body: `Chào ${b.name}, theo trao đổi, lịch đề xuất của anh/chị: ${b.when}, tạm tính ${b.total}.\nAnh/chị xác nhận đặt lịch tại: ${b.url}\nLễ tân sẽ xác nhận lại ngay.`,
  };
}

// ---- Staff API input ----
const id = z.string().min(1).max(100);
export const leadInput = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('call'),
      id,
      result: z.enum(CALL_RESULTS),
      /** Agreed time of a meeting or call-back, in ms. */
      at: z.number().int().positive().optional(),
      note: z.string().trim().max(600).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('replied'),
      id,
      channel: z.string().trim().min(2).max(30),
      note: z.string().trim().max(600).default(''),
    })
    .strict(),
  z.object({ action: z.literal('lost'), id, reason: z.string().trim().min(2).max(300) }).strict(),
  z
    .object({ action: z.literal('booked'), id, note: z.string().trim().max(300).default('') })
    .strict(),
  z.object({ action: z.literal('claim'), id }).strict(),
  z
    .object({
      action: z.literal('stage'),
      id,
      stage: z.enum(STAGES),
      reason: z.string().trim().max(300).default(''),
      dealValue: z.number().int().min(0).max(10_000_000_000).default(0),
      at: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('profile'),
      id,
      interest: z.string().trim().max(200).default(''),
      budget: z.number().int().min(0).max(10_000_000_000).default(0),
      tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
      note: z.string().trim().max(1000).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('create'),
      name: z.string().trim().max(100).default(''),
      phone: z.string().trim().max(30).default(''),
      need: z.enum(NEEDS).optional(),
      message: z.string().trim().max(1000).default(''),
    })
    .strict(),
  z
    .object({
      action: z.literal('send-link'),
      id,
      service: z.enum(['gdr', '9', '18']),
      start: z.number().int(),
      guests: z.number().int().min(1).max(1000),
      vip: z.boolean().default(false),
    })
    .strict(),
]);
export type LeadAction = z.infer<typeof leadInput>;

export const agentInput = z
  .object({
    userId: id,
    receivesLeads: z.boolean().optional(),
    onDuty: z.boolean().optional(),
    zaloId: z.string().trim().max(100).optional(),
    email: z.string().trim().max(200).optional(),
  })
  .strict();
