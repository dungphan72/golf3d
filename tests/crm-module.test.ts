import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, maskPhone } from '../modules/crm/core/phone.ts';
import {
  normalizeStage,
  sanitizeCatalog,
  statusFor,
  validateStageChange,
  slugify,
  DEFAULT_CATALOG,
} from '../modules/crm/core/stages.ts';
import { applyCallResult, DEFAULT_CALL_RULES } from '../modules/crm/core/calls.ts';
import { pickAssignee, DEFAULT_DISTRIBUTION } from '../modules/crm/core/distribution.ts';
import {
  addWorkingMinutes,
  workMinutesBetween,
  DEFAULT_WORK_HOURS,
} from '../modules/crm/core/workhours.ts';
import {
  canTransition,
  initialAppointmentStatus,
  canApproveAppointment,
  arrivalRate,
  APPT_STATUSES,
} from '../modules/crm/core/appointments.ts';
import {
  buildSchedule,
  summarizeOrder,
  canCancelOrder,
  validatePayment,
  orderCode,
} from '../modules/crm/core/orders.ts';
import {
  tierFor,
  afterSalesPlan,
  DEFAULT_AFTER_SALES,
  sanitizeTiers,
} from '../modules/crm/core/customers.ts';
import { sanitizeSettings } from '../modules/crm/core/settings.ts';
import { toInquiry } from '../modules/crm/core/website.ts';
import { zaloInquiry } from '../modules/crm/core/zalo.ts';
import { facebookInquiry } from '../modules/crm/core/facebook.ts';
import { adsInquiry } from '../modules/crm/core/ads.ts';
import { isService, serviceOf } from '../modules/crm/core/services.ts';
import type { LeadInput } from '../lib/leads.ts';
import { canSeeLead, canEditLead, maskForViewer } from '../modules/crm/core/access.ts';

const H = 3_600_000;
const D = 24 * H;
const VN = 7 * H;
/** A Vietnam wall-clock time as a timestamp. */
const at = (iso: string) => Date.parse(iso + ':00Z') - VN;

test('normalizePhone và maskPhone', () => {
  for (const raw of ['+84 902 030 185', '0084902030185', '84902030185', '0902-030-185'])
    assert.equal(normalizePhone(raw), '0902030185', raw);
  assert.equal(normalizePhone('12345'), '12345');
  assert.equal(maskPhone('0399123999'), '039****999');
  assert.equal(maskPhone('12345'), '****');
});

test('giai đoạn và trạng thái hai cấp', () => {
  assert.equal(normalizeStage('QUALIFIED'), 'QUALIFIED');
  assert.equal(normalizeStage('IN_PROGRESS'), 'QUALIFIED');
  assert.equal(normalizeStage('CONVERTED'), 'WON');
  assert.equal(normalizeStage('CANCELLED'), 'LOST');
  assert.equal(normalizeStage('lung tung'), 'NEW');
  assert.equal(slugify('Đã đặt cọc, KH!'), 'da-dat-coc-kh');
  assert.ok(validateStageChange('LOST', {}));
  assert.equal(validateStageChange('LOST', { lostReason: 'Chưa có nhu cầu' }), null);
  assert.ok(validateStageChange('WON', { dealValue: 0 }));
  assert.equal(validateStageChange('WON', { dealValue: 1 }), null);
  // Every stage has a default status, and a status of another stage is replaced.
  const cat = sanitizeCatalog(null);
  assert.equal(cat.statuses.length, DEFAULT_CATALOG.statuses.length);
  assert.equal(statusFor(cat, 'VISITED', 'khach-moi'), 'da-trai-nghiem');
  // A renamed system status keeps its id; a custom one is kept; a bad one is dropped.
  const custom = sanitizeCatalog({
    groups: [{ id: 'moi', name: 'Khách đến mới', color: '#112233' }],
    statuses: [
      { id: 'khach-moi', name: 'Mới tinh' },
      { id: 'x', name: 'Chờ báo giá', stage: 'QUALIFIED', group: 'tu-van' },
      { id: 'y', name: 'Sai nhóm', stage: 'QUALIFIED', group: 'khong-co' },
    ],
  });
  assert.equal(custom.statuses.find((s) => s.id === 'khach-moi')?.name, 'Mới tinh');
  assert.ok(custom.statuses.find((s) => s.id === 'cho-bao-gia' && !s.system));
  assert.equal(
    custom.statuses.some((s) => s.name === 'Sai nhóm'),
    false,
  );
  assert.equal(custom.groups[0].name, 'Khách đến mới');
});

test('applyCallResult: gọi hụt, thu hồi, hẹn và kết thúc', () => {
  const now = 1_700_000_000_000;
  const o = (state: { stage: 'NEW'; callAttempts: number }, r: string, when?: number) =>
    applyCallResult(state, r, now, when, DEFAULT_CALL_RULES);
  for (const [n, hours] of [
    [0, 2],
    [1, 24],
    [2, 48],
  ] as const) {
    const x = o({ stage: 'NEW', callAttempts: n }, 'NO_ANSWER') as {
      nextDue: number;
      nextAction: string;
      recall: boolean;
    };
    assert.equal(x.nextDue, now + hours * H);
    assert.equal(x.nextAction, `RETRY_${n + 1}`);
    assert.equal(x.recall, false);
  }
  const fourth = o({ stage: 'NEW', callAttempts: 3 }, 'NO_ANSWER') as {
    recall: boolean;
    nextDue: null;
    callAttempts: number;
  };
  assert.equal(fourth.recall, true);
  assert.equal(fourth.nextDue, null);
  assert.equal(fourth.callAttempts, 4);

  const think = o({ stage: 'NEW', callAttempts: 2 }, 'THINKING') as {
    stage: string;
    nextDue: number;
    callAttempts: number;
  };
  assert.deepEqual([think.stage, think.nextDue, think.callAttempts], ['QUALIFIED', now + 2 * D, 0]);
  assert.equal(
    (o({ stage: 'NEW', callAttempts: 0 }, 'INTERESTED') as { nextDue: number }).nextDue,
    now + D,
  );
  const met = o({ stage: 'NEW', callAttempts: 0 }, 'MET') as { stage: string; nextAction: string };
  assert.deepEqual([met.stage, met.nextAction], ['VISITED', 'FOLLOW_UP']);

  for (const r of ['APPOINTMENT', 'NOT_MET']) {
    assert.match(
      (o({ stage: 'NEW', callAttempts: 0 }, r) as { error: string }).error,
      /chọn ngày giờ/i,
    );
    assert.match(
      (o({ stage: 'NEW', callAttempts: 0 }, r, now - H) as { error: string }).error,
      /tương lai/,
    );
    const ok = o({ stage: 'NEW', callAttempts: 0 }, r, now + D) as {
      stage: string;
      nextAction: string;
      nextDue: number;
    };
    assert.deepEqual(
      [ok.stage, ok.nextAction, ok.nextDue],
      ['VISIT_SCHEDULED', 'MEETING', now + D],
    );
  }
  assert.equal(
    (o({ stage: 'NEW', callAttempts: 0 }, 'WRONG_NUMBER') as { lostReason: string }).lostReason,
    'Sai số / số không liên lạc được',
  );
  assert.equal(
    (o({ stage: 'NEW', callAttempts: 0 }, 'NOT_INTERESTED') as { lostReason: string }).lostReason,
    'Chưa có nhu cầu',
  );
  assert.equal(
    (o({ stage: 'NEW', callAttempts: 0 }, 'BOGUS') as { error: string }).error,
    'Kết quả không hợp lệ',
  );
});

test('pickAssignee: khách cũ, cân bằng, trọng số, tạm dừng, theo nguồn', () => {
  const cfg = { ...DEFAULT_DISTRIBUTION };
  const c = ['a', 'b', 'c'];
  assert.deepEqual(pickAssignee({ candidates: c, openCounts: { a: 5, b: 2, c: 3 }, cfg }), {
    owner: 'b',
    reason: 'BALANCED',
  });
  assert.deepEqual(
    pickAssignee({ candidates: c, openCounts: { a: 5, b: 2, c: 3 }, cfg, previousOwner: 'a' }),
    { owner: 'a', reason: 'RETURN' },
  );
  assert.equal(
    pickAssignee({
      candidates: c,
      openCounts: {},
      cfg: { ...cfg, paused: ['a'] },
      previousOwner: 'a',
    }).owner,
    'b',
  );
  assert.equal(
    pickAssignee({
      candidates: c,
      openCounts: {},
      cfg: { ...cfg, returnToPrevious: false },
      previousOwner: 'c',
    }).owner,
    'a',
  );
  // Weighted: b has twice the weight, so it gets more leads.
  const w = { ...cfg, mode: 'WEIGHTED' as const, weights: { a: 1, b: 2, c: 0 } };
  assert.equal(
    pickAssignee({ candidates: c, openCounts: { a: 1, b: 2, c: 0 }, cfg: w }).owner,
    'b',
  );
  assert.equal(pickAssignee({ candidates: ['c'], openCounts: {}, cfg: w }).reason, 'NONE');
  const bySource = { ...cfg, bySource: { facebook: ['c'] } };
  assert.equal(
    pickAssignee({ candidates: c, openCounts: { c: 99 }, cfg: bySource, source: 'facebook' }).owner,
    'c',
  );
  assert.equal(pickAssignee({ candidates: [], openCounts: {}, cfg }).reason, 'NONE');
});

test('giờ làm việc: qua đêm, qua Chủ nhật, bắt đầu ngoài giờ', () => {
  const wh = { ...DEFAULT_WORK_HOURS, enabled: true, start: 480, end: 1080, days: [1, 2, 3, 4, 5, 6] };
  // Disabled: plain addition.
  assert.equal(addWorkingMinutes(1000, 15, DEFAULT_WORK_HOURS), 1000 + 15 * 60_000);
  // 2026-11-02 is a Monday. 17:50 + 30 minutes -> 08:20 next day.
  assert.equal(addWorkingMinutes(at('2026-11-02T17:50'), 30, wh), at('2026-11-03T08:20'));
  // Saturday 17:50 + 30 minutes skips Sunday -> Monday 08:20.
  assert.equal(addWorkingMinutes(at('2026-11-07T17:50'), 30, wh), at('2026-11-09T08:20'));
  // Sunday 10:00 + 15 -> Monday 08:15. Early morning 06:00 + 15 -> 08:15.
  assert.equal(addWorkingMinutes(at('2026-11-08T10:00'), 15, wh), at('2026-11-09T08:15'));
  assert.equal(addWorkingMinutes(at('2026-11-03T06:00'), 15, wh), at('2026-11-03T08:15'));
  assert.equal(workMinutesBetween(at('2026-11-02T17:50'), at('2026-11-03T08:20'), wh), 30);
  assert.equal(workMinutesBetween(at('2026-11-07T17:00'), at('2026-11-09T09:00'), wh), 120);
  assert.equal(workMinutesBetween(at('2026-11-08T09:00'), at('2026-11-08T12:00'), wh), 0);
  assert.equal(workMinutesBetween(at('2026-11-02T09:00'), at('2026-11-02T08:00'), wh), 0);
  assert.equal(workMinutesBetween(0, 10 * 60_000, DEFAULT_WORK_HOURS), 10);
});

test('lịch hẹn: máy trạng thái và quyền duyệt', () => {
  const allowed: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
    ARRIVED: [],
    NO_SHOW: ['CONFIRMED'],
    CANCELLED: ['CONFIRMED'],
  };
  for (const from of APPT_STATUSES)
    for (const to of APPT_STATUSES)
      assert.equal(canTransition(from, to), allowed[from].includes(to), `${from}->${to}`);
  assert.equal(initialAppointmentStatus(true, true), 'CONFIRMED');
  assert.equal(initialAppointmentStatus(true, false), 'PENDING');
  assert.equal(initialAppointmentStatus(false, false), 'CONFIRMED');
  assert.equal(canApproveAppointment({ id: 'm', manager: true }, {}), true);
  assert.equal(
    canApproveAppointment({ id: 'l', manager: false, leader: true, team: 'A' }, { ownerTeam: 'A' }),
    true,
  );
  assert.equal(
    canApproveAppointment({ id: 'l', manager: false, leader: true, team: 'A' }, { ownerTeam: 'B' }),
    false,
  );
  assert.equal(
    canApproveAppointment({ id: 's', manager: false, team: 'A' }, { ownerTeam: 'A' }),
    false,
  );
  assert.equal(
    canApproveAppointment({ id: 'l', manager: false, leader: true, team: '' }, { ownerTeam: '' }),
    false,
  );
  assert.equal(arrivalRate(3, 1), 75);
  assert.equal(arrivalRate(0, 0), 0);
});

test('đơn bán: lịch thanh toán, công nợ, hủy, ghi thu', () => {
  for (const [rem, n] of [
    [100, 3],
    [1_000_000, 7],
    [5, 5],
  ] as const) {
    const rows = buildSchedule({
      remaining: rem,
      installments: n,
      firstDue: '2026-11-10',
      intervalDays: 30,
    });
    assert.ok(Array.isArray(rows));
    assert.equal(
      (rows as { amount: number }[]).reduce((a, r) => a + r.amount, 0),
      rem,
    );
  }
  const three = buildSchedule({
    remaining: 100,
    installments: 3,
    firstDue: '2026-11-10',
    intervalDays: 30,
  }) as { amount: number; label: string; dueDate: string }[];
  assert.deepEqual(
    three.map((r) => r.amount),
    [33, 33, 34],
  );
  assert.deepEqual(
    three.map((r) => r.label),
    ['Đợt 1', 'Đợt 2', 'Thanh toán cuối'],
  );
  assert.deepEqual(
    three.map((r) => r.dueDate),
    ['2026-11-10', '2026-12-10', '2027-01-09'],
  );
  assert.equal(
    (
      buildSchedule({
        remaining: 50,
        installments: 1,
        firstDue: '2026-11-10',
        intervalDays: 1,
      }) as { label: string }[]
    )[0].label,
    'Đợt 1',
  );
  for (const bad of [
    { remaining: 0, installments: 3, firstDue: '2026-11-10', intervalDays: 30 },
    { remaining: 100, installments: 0, firstDue: '2026-11-10', intervalDays: 30 },
    { remaining: 100, installments: 37, firstDue: '2026-11-10', intervalDays: 30 },
    { remaining: 100, installments: 3, firstDue: 'mai', intervalDays: 30 },
    { remaining: 100, installments: 3, firstDue: '2026-11-10', intervalDays: 366 },
  ])
    assert.ok('error' in (buildSchedule(bad) as object), JSON.stringify(bad));

  const now = at('2026-11-10T10:00');
  const s = summarizeOrder(
    1000,
    [
      { amount: 300, paidAmount: 300, dueDate: '2026-11-01', status: 'PAID' },
      { amount: 300, paidAmount: 100, dueDate: '2026-11-05', status: 'PARTIAL' },
      { amount: 200, paidAmount: 0, dueDate: '2026-11-20', status: 'PLANNED' },
      { amount: 999, paidAmount: 0, dueDate: '2026-11-02', status: 'CANCELLED' },
    ],
    now,
  );
  assert.deepEqual(
    [
      s.paid,
      s.outstanding,
      s.scheduled,
      s.overdue,
      s.overdueCount,
      s.nextDueDate,
      s.nextDueAmount,
      s.unscheduled,
      s.percentPaid,
    ],
    [400, 600, 400, 200, 1, '2026-11-20', 200, 200, 40],
  );

  const created = at('2026-10-01T09:00');
  assert.deepEqual(canCancelOrder('owner', created, now), { allowed: true, needsOwner: true });
  assert.deepEqual(canCancelOrder('manager', created, created + 5 * D), {
    allowed: true,
    needsOwner: false,
  });
  assert.deepEqual(canCancelOrder('manager', created, created + 31 * D), {
    allowed: false,
    needsOwner: true,
  });
  assert.equal(canCancelOrder('cashier', created, created).allowed, false);
  assert.equal(orderCode(2026, 7), 'BK2026-0007');
  assert.ok(validatePayment({ amount: 0, rowLeft: 10, orderLeft: 10 }));
  assert.ok(validatePayment({ amount: 11, rowLeft: 10, orderLeft: 50 }));
  assert.ok(validatePayment({ amount: 10, rowLeft: 10, orderLeft: 5 }));
  assert.equal(validatePayment({ amount: 10, rowLeft: 10, orderLeft: 10 }), null);
});

test('hạng khách, chăm sóc sau bán, cấu hình', () => {
  assert.equal(tierFor(0).id, 'member');
  assert.equal(tierFor(10_000_000).id, 'silver');
  assert.equal(tierFor(99_999_999).id, 'gold');
  assert.equal(tierFor(5_000_000_000).id, 'diamond');
  const tiers = sanitizeTiers([
    { name: 'B', min: 50 },
    { name: 'A', min: 5 },
  ]);
  assert.deepEqual(
    tiers.map((t) => [t.name, t.min]),
    [
      ['A', 0],
      ['B', 50],
    ],
  );
  assert.equal(sanitizeTiers([]).length, 4);

  const wonAt = at('2026-11-10T10:00');
  assert.deepEqual(afterSalesPlan(DEFAULT_AFTER_SALES, wonAt, 'u1'), []);
  const plan = afterSalesPlan({ ...DEFAULT_AFTER_SALES, enabled: true }, wonAt, 'u1');
  assert.deepEqual(
    plan.map((p) => p.due),
    [wonAt + 3 * D, wonAt + 30 * D, wonAt + 90 * D],
  );
  assert.ok(plan.every((p) => p.assignee === 'u1'));
  assert.equal(
    afterSalesPlan({ ...DEFAULT_AFTER_SALES, enabled: true, assignTo: 'u9' }, wonAt, 'u1')[0]
      .assignee,
    'u9',
  );

  const def = sanitizeSettings(undefined);
  assert.equal(def.slaMinutes, 5);
  assert.equal(def.holdHours, 48);
  assert.equal(def.pool.claimQuotaPerDay, 20);
  assert.deepEqual(def.calls.retryHours, [2, 24, 48]);
  const bad = sanitizeSettings({
    slaMinutes: 99999,
    holdHours: -3,
    pool: { claimQuotaPerDay: 'x', intakeMode: 'POOL' },
    calls: { retryHours: [0, 9999, 5, 6] },
    workHours: { start: 900, end: 100 },
  });
  assert.equal(bad.slaMinutes, 1440);
  assert.equal(bad.holdHours, 1);
  assert.equal(bad.pool.claimQuotaPerDay, 20);
  assert.equal(bad.autoAssign, false);
  assert.deepEqual(bad.calls.retryHours, [1, 720, 5]);
  assert.equal(bad.workHours.end > bad.workHours.start, true);
});

test('quyền với lead và che số', () => {
  const sale = { id: 's1', role: 'sale' };
  const mgr = { id: 'm1', role: 'manager' };
  assert.equal(canSeeLead(sale, { owner: 's2' }), false);
  assert.equal(canSeeLead(sale, { owner: null }), true);
  assert.equal(canSeeLead(mgr, { owner: 's2' }), true);
  assert.equal(canEditLead(sale, { owner: null }), false);
  assert.equal(canEditLead(sale, { owner: 's1' }), true);
  const pooled = { owner: null, phone: '0399123999', email: 'a@b.c', notes: 'ghi chú' };
  assert.deepEqual(maskForViewer(sale, pooled), {
    owner: null,
    phone: '039****999',
    email: '',
    notes: '',
    masked: true,
  });
  assert.equal(maskForViewer(mgr, pooled).phone, '0399123999');
  assert.equal(maskForViewer(sale, { ...pooled, owner: 's1' }).masked, false);
});

test('lead từ form website: đọc số điện thoại, nhu cầu, giờ hẹn và ghi chú như cổng cũ', () => {
  const base = {
    name: 'An',
    phone: '',
    email: '',
    need: '',
    guests: 0,
    message: '',
    campaign: '',
    consent: false,
  };
  // typed number, +84 form
  assert.equal(toInquiry({ ...base, phone: '+84 912 345 678' }).phone, '0912345678');
  // no number typed: one written in the message is used
  const found = toInquiry({ ...base, message: 'Gọi em số 0987.654.321 nhé, em muốn tập swing' });
  assert.equal(found.phone, '0987654321');
  assert.equal(found.targetService, 'Luyện swing'); // guessed from the text
  // an explicit need wins over the text
  assert.equal(
    toInquiry({ ...base, need: '18', message: 'chơi 9 hố' }).targetService,
    'Game 18 hố',
  );
  assert.equal(toInquiry({ ...base, need: 'other' }).targetService, '');
  // 2027-01-15 15:00 in Vietnam
  const at = toInquiry({ ...base, preferredStart: Date.UTC(2027, 0, 15, 8, 0) });
  assert.deepEqual([at.preferredDate, at.preferredTime], ['2027-01-15', '15:00']);
  assert.deepEqual([toInquiry(base).preferredDate, toInquiry(base).preferredTime], ['', '']);
  // what the module has no field for goes into the notes
  const full = toInquiry({
    ...base,
    message: 'Muốn đi nhóm',
    guests: 6,
    campaign: 'thang-11',
    consent: true,
  });
  assert.equal(
    full.notes,
    'Muốn đi nhóm\nSố khách: 6\nChiến dịch: thang-11\nKhách đồng ý nhận tin ưu đãi',
  );
  assert.equal(full.source, 'Website');
  assert.equal(toInquiry({ ...base, message: 'x'.repeat(3000) }).notes.length, 2000);
  assert.equal(toInquiry(base).notes, '');
});

test('cấu hình: lead từ form website mặc định vào CRM mới, chỉ nhận đúng hai giá trị', () => {
  assert.equal(sanitizeSettings(undefined).websiteLeads, 'CRM2');
  assert.equal(sanitizeSettings({ websiteLeads: 'LEGACY' }).websiteLeads, 'LEGACY');
  assert.equal(sanitizeSettings({ websiteLeads: 'crm2' }).websiteLeads, 'CRM2');
  assert.equal(sanitizeSettings({ websiteLeads: 7 }).websiteLeads, 'CRM2');
});

test('tin nhắn Zalo: đặt tên theo Zalo ID, giữ ID trong ghi chú, đoán dịch vụ', () => {
  const base: Pick<LeadInput, 'zaloId' | 'phone' | 'need' | 'message'> = {
    zaloId: 'u-8f3a91c2',
    phone: '',
    need: '',
    message: 'Cho em hỏi giá',
  };
  const a = zaloInquiry(base);
  assert.equal(a.fullName, 'Khách Zalo 91c2');
  assert.equal(a.source, 'Zalo OA');
  assert.equal(a.phone, '');
  assert.equal(a.targetService, '');
  assert.equal(a.notes, 'Cho em hỏi giá\nZalo ID: u-8f3a91c2');
  assert.equal(zaloInquiry({ ...base, need: 'swing' }).targetService, 'Luyện swing');
  assert.equal(zaloInquiry({ ...base, need: '18', phone: '0912345678' }).phone, '0912345678');
  assert.equal(zaloInquiry({ ...base, need: 'other' }).targetService, '');
  // a very long message never pushes the Zalo id out of the notes
  const long = zaloInquiry({ ...base, message: 'x'.repeat(3000) });
  assert.equal(long.notes.length, 2000);
});

test('cấu hình: tin Zalo mặc định vào CRM mới, chỉ nhận đúng hai giá trị', () => {
  assert.equal(sanitizeSettings(undefined).zaloLeads, 'CRM2');
  assert.equal(sanitizeSettings({ zaloLeads: 'LEGACY' }).zaloLeads, 'LEGACY');
  assert.equal(sanitizeSettings({ zaloLeads: 'zalo' }).zaloLeads, 'CRM2');
  // the two switches are independent
  const s = sanitizeSettings({ websiteLeads: 'LEGACY' });
  assert.deepEqual([s.websiteLeads, s.zaloLeads], ['LEGACY', 'CRM2']);
});

test('dịch vụ khách hỏi: bảng dùng chung, lạ thì để trống', () => {
  assert.equal(serviceOf('swing'), 'Luyện swing');
  assert.equal(serviceOf('18'), 'Game 18 hố');
  assert.equal(serviceOf('group'), 'Nhóm / sự kiện');
  assert.equal(serviceOf('other'), '');
  assert.equal(serviceOf(''), '');
  assert.equal(serviceOf(undefined), '');
  assert.equal(isService('9'), true);
  assert.equal(isService('other'), false);
});

test('lead Facebook: giữ tên, số, email, đưa chiến dịch và mã biểu mẫu vào ghi chú', () => {
  const ev: Pick<
    LeadInput,
    'name' | 'phone' | 'email' | 'need' | 'message' | 'campaign' | 'channelRef'
  > = {
    name: 'Lan',
    phone: '0912345678',
    email: 'lan@example.vn',
    need: '9',
    message: 'Chơi 9 hố cuối tuần',
    campaign: 'khai-truong',
    channelRef: 'facebook-lead:fb-123',
  };
  const a = facebookInquiry(ev);
  assert.deepEqual(
    [a.fullName, a.phone, a.email, a.source, a.targetService],
    ['Lan', '0912345678', 'lan@example.vn', 'Facebook', 'Game 9 hố'],
  );
  assert.equal(a.notes, 'Chơi 9 hố cuối tuần\nChiến dịch: khai-truong\nFacebook lead: fb-123');
  // a form with nothing but the id still says where the lead came from
  const bare = facebookInquiry({ ...ev, message: '', campaign: '', need: '' });
  assert.equal(bare.notes, 'Facebook lead: fb-123');
  assert.equal(bare.targetService, '');
  assert.equal(facebookInquiry({ ...ev, message: 'x'.repeat(3000) }).notes.length, 2000);
});

test('cấu hình: lead Facebook mặc định vào CRM mới và độc lập với hai công tắc kia', () => {
  assert.equal(sanitizeSettings(undefined).facebookLeads, 'CRM2');
  assert.equal(sanitizeSettings({ facebookLeads: 'LEGACY' }).facebookLeads, 'LEGACY');
  assert.equal(sanitizeSettings({ facebookLeads: true }).facebookLeads, 'CRM2');
  const s = sanitizeSettings({ facebookLeads: 'LEGACY', zaloLeads: 'LEGACY' });
  assert.deepEqual([s.websiteLeads, s.zaloLeads, s.facebookLeads], ['CRM2', 'LEGACY', 'LEGACY']);
});

test('lead quảng cáo: đọc như form website, nguồn là Quảng cáo, tên nền tảng làm chiến dịch', () => {
  const base = {
    name: 'Hà',
    phone: '0912345678',
    email: '',
    need: '18',
    guests: 0,
    message: 'Muốn chơi 18 hố',
    campaign: '',
    consent: false,
    source: 'tiktok',
  };
  const a = adsInquiry(base);
  assert.deepEqual(
    [a.fullName, a.phone, a.source, a.targetService],
    ['Hà', '0912345678', 'Quảng cáo', 'Game 18 hố'],
  );
  assert.equal(a.notes, 'Muốn chơi 18 hố\nChiến dịch: tiktok');
  // a campaign the sender names wins over the platform name
  assert.equal(
    adsInquiry({ ...base, campaign: 'khuyen-mai-11' }).notes,
    'Muốn chơi 18 hố\nChiến dịch: khuyen-mai-11',
  );
  // number only in the message, need guessed from it
  const guessed = adsInquiry({
    ...base,
    phone: '',
    need: '',
    message: 'Gọi em 0987.654.321, em muốn tập swing',
  });
  assert.equal(guessed.phone, '0987654321');
  assert.equal(guessed.targetService, 'Luyện swing');
});

test('cấu hình: lead quảng cáo mặc định vào CRM mới và độc lập với ba công tắc kia', () => {
  assert.equal(sanitizeSettings(undefined).adsLeads, 'CRM2');
  assert.equal(sanitizeSettings({ adsLeads: 'LEGACY' }).adsLeads, 'LEGACY');
  assert.equal(sanitizeSettings({ adsLeads: 'ads' }).adsLeads, 'CRM2');
  const s = sanitizeSettings({ adsLeads: 'LEGACY', facebookLeads: 'LEGACY' });
  assert.deepEqual(
    [s.websiteLeads, s.zaloLeads, s.facebookLeads, s.adsLeads],
    ['CRM2', 'CRM2', 'LEGACY', 'LEGACY'],
  );
});
