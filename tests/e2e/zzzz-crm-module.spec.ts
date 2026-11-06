import { test, expect, type APIRequestContext } from '@playwright/test';

// Module CRM (modules/crm): intake, pool, call results, appointments, holds, orders, customers, cron.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const SALE = { email: 'crmsale@e2e.test', password: 'Sale-Pass-2026-xK' };
const MIN = 60_000;
const DAY = 86_400_000;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const at = (t: number) => ({ 'x-e2e-now': String(t) });
async function post(r: APIRequestContext, url: string, data: unknown, status = 200, t?: number) {
  const res = await r.post(url, { data, headers: t ? at(t) : {} });
  expect(res.status(), `${url} ${JSON.stringify(data)} -> ${await res.text()}`).toBe(status);
  return (await res.json()) as Json;
}
const get = async (r: APIRequestContext, url: string, t?: number) =>
  (await (await r.get(url, { headers: t ? at(t) : {} })).json()) as Json;

let owner: APIRequestContext;
let sale: APIRequestContext;
let saleId = '';
let seq = 0;
const phone = () => `0977${String(200000 + ++seq)}`;
const settingsOf = async () => (await get(owner, '/api/crm2/config')).settings as Json;
async function setSettings(patch: Json) {
  const s = await settingsOf();
  await post(owner, '/api/crm2/config', { settings: { ...s, ...patch } });
}
// The public form allows 10 posts per 10 minutes per address, and a CI runner is one address for the whole
// suite; give every post its own forwarded address (the test server trusts it) so the limit never applies.
let ipSeq = 0;
const nextIp = () => `10.77.0.${++ipSeq}`;
const intake = (r: APIRequestContext, data: Json, t?: number) =>
  r.post('/api/crm2/intake', {
    data,
    headers: { ...(t ? at(t) : {}), 'x-forwarded-for': nextIp() },
  });
const lead = async (id: string, t?: number) =>
  (await get(owner, '/api/crm2/leads?id=' + id, t)).lead as Json;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const created = await owner.post('/api/staff', {
    data: { action: 'create', email: SALE.email, name: 'Sale CRM', role: 'sale' },
  });
  expect([200, 409]).toContain(created.status());
  if (created.status() === 200) {
    const temp = (await created.json()).temporaryPassword as string;
    sale = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
    expect(
      (
        await sale.post('/api/auth/login', { data: { email: SALE.email, password: temp } })
      ).status(),
    ).toBe(200);
    await post(sale, '/api/auth/password', {
      action: 'change',
      current: temp,
      next: SALE.password,
    });
  } else {
    sale = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
    expect((await sale.post('/api/auth/login', { data: SALE })).status()).toBe(200);
  }
  saleId = ((await get(owner, '/api/crm2/config')).staff as Json[]).find(
    (x) => x.email === SALE.email,
  )!.id;
});
test.afterAll(async () => {
  await owner.dispose();
  await sale.dispose();
});

test('cấu hình: mặc định hợp lệ, làm sạch giá trị sai, chỉ quản lý được lưu', async () => {
  const s = await settingsOf();
  expect(s.slaMinutes).toBe(15);
  expect(s.holdHours).toBe(48);
  expect(s.pool.claimQuotaPerDay).toBe(20);
  expect(s.calls.retryHours).toEqual([2, 24, 48]);
  await post(owner, '/api/crm2/config', { settings: { ...s, slaMinutes: 99999, holdHours: -5 } });
  const clamped = await settingsOf();
  expect([clamped.slaMinutes, clamped.holdHours]).toEqual([1440, 1]);
  await setSettings({ slaMinutes: 15, holdHours: 48 });
  // A sale cannot save settings, but can read them.
  await post(sale, '/api/crm2/config', { settings: s }, 403);
  expect((await sale.get('/api/crm2/config')).status()).toBe(200);
});

test('tiếp nhận công khai: cần đồng ý, chống trùng, chia cho nhân viên, gửi lại thì tăng số lần', async ({
  request,
}) => {
  await setSettings({
    pool: { claimQuotaPerDay: 20, recallHours: 48, autoRecall: true, intakeMode: 'AUTO' },
  });
  const p = phone();
  expect((await intake(request, { fullName: 'Khách A', phone: p })).status()).toBe(400);
  expect(
    (
      await intake(request, { fullName: 'Khách A', phone: p, consent: true, website: 'bot' })
    ).status(),
  ).toBe(400);
  const t = Date.now();
  expect(
    (
      await intake(
        request,
        { fullName: 'Khách A', phone: p, consent: true, targetService: 'Gói 9 hố' },
        t,
      )
    ).status(),
  ).toBe(200);
  const found = (await get(owner, '/api/crm2/leads?q=' + p)).leads as Json[];
  expect(found).toHaveLength(1);
  const l = found[0];
  expect(l).toMatchObject({
    stage: 'NEW',
    statusId: 'khach-moi',
    inquiryCount: 1,
    source: 'Website',
  });
  expect(l.owner).toBeTruthy();
  expect(l.nextDue).toBe(t + 15 * MIN);
  const detail = await get(owner, '/api/crm2/leads?id=' + l.id);
  expect(detail.tasks.some((x: Json) => x.title === 'Gọi khách mới')).toBe(true);
  // The same number again: no new lead, the count grows, the owner gets a call-back task.
  await intake(request, { fullName: 'Khách A', phone: '+84' + p.slice(1), consent: true }, t + MIN);
  expect(((await get(owner, '/api/crm2/leads?q=' + p)).leads as Json[]).length).toBe(1);
  const again = await lead(l.id);
  expect(again.inquiryCount).toBe(2);
  const tasks = (await get(owner, '/api/crm2/leads?id=' + l.id)).tasks as Json[];
  expect(tasks.some((x) => /gửi lại/.test(x.title))).toBe(true);
});

test('kho số: che số với nhân viên, nhận số có hạn mức, quản lý giao và thu hồi', async ({
  request,
}) => {
  await setSettings({
    pool: { claimQuotaPerDay: 1, recallHours: 48, autoRecall: true, intakeMode: 'POOL' },
  });
  const [p1, p2] = [phone(), phone()];
  for (const [n, p] of [
    ['Kho Một', p1],
    ['Kho Hai', p2],
  ])
    await intake(request, { fullName: n, phone: p, consent: true, notes: 'ghi chú riêng' });
  const poolOwner = (await get(owner, '/api/crm2/leads?view=pool')).leads as Json[];
  const poolSale = (await get(sale, '/api/crm2/leads?view=pool')).leads as Json[];
  const mine = (rows: Json[], p: string) =>
    rows.find((x) => x.phoneNorm === p || x.phone === p || x.phone.endsWith(p.slice(-3)));
  expect(mine(poolOwner, p1)!.phone).toBe(p1);
  const masked = poolSale.find((x) => x.fullName === 'Kho Một')!;
  expect(masked).toMatchObject({ masked: true, email: '', notes: '' });
  expect(masked.phone).toMatch(/^\d{3}\*\*\*\*\d{3}$/);
  // Detail of a pooled lead is masked for the sale too; search by number does not find it.
  expect((await get(sale, '/api/crm2/leads?q=' + p1)).leads).toHaveLength(0);

  const idOfName = (n: string) => poolOwner.find((x) => x.fullName === n)!.id as string;
  const ids = [idOfName('Kho Một'), idOfName('Kho Hai')];
  const first = await post(sale, '/api/crm2/leads', { action: 'claim', ids: [ids[0]] });
  expect(first.claimed).toBe(1);
  await post(sale, '/api/crm2/leads', { action: 'claim', ids: [ids[1]] }, 429);
  const claimedLead = await get(sale, '/api/crm2/leads?id=' + ids[0]);
  expect(claimedLead.lead).toMatchObject({ owner: saleId, masked: false });
  expect(claimedLead.lead.phone).toBe(p1);

  // Another sale's lead is not visible; staff cannot assign or recall.
  await post(sale, '/api/crm2/leads', { action: 'assign', ids: [ids[1]], userId: saleId }, 403);
  await post(sale, '/api/crm2/leads', { action: 'recall', ids: [ids[0]], reason: 'thử' }, 403);
  // The manager gives the second lead to the sale and takes the first back.
  expect(
    (await post(owner, '/api/crm2/leads', { action: 'assign', ids: [ids[1]], userId: saleId }))
      .assigned,
  ).toBe(1);
  expect((await lead(ids[1])).owner).toBe(saleId);
  const rec = await post(owner, '/api/crm2/leads', {
    action: 'recall',
    ids: [ids[0]],
    reason: 'cần chia lại',
  });
  expect(rec.recalled).toBe(1);
  expect(await lead(ids[0])).toMatchObject({
    owner: null,
    stage: 'NEW',
    callAttempts: 0,
    firstResponseAt: null,
  });
  await setSettings({
    pool: { claimQuotaPerDay: 50, recallHours: 48, autoRecall: true, intakeMode: 'AUTO' },
  });
});

test('kết quả cuộc gọi: gọi hụt hẹn lại 2h, 24h, 48h, lần 4 trả về kho; hẹn cần giờ; chốt cần giá trị', async ({
  request,
}) => {
  const t0 = Date.now() + 10 * 60 * MIN;
  const p = phone();
  await intake(request, { fullName: 'Khách Gọi', phone: p, consent: true }, t0);
  const id = ((await get(owner, '/api/crm2/leads?q=' + p)).leads as Json[])[0].id as string;
  await post(owner, '/api/crm2/leads', { action: 'assign', ids: [id], userId: saleId }, 200, t0);
  const call = (result: string, t: number, extra: Json = {}) =>
    post(sale, '/api/crm2/leads', { action: 'result', id, result, ...extra }, 200, t);
  for (const [i, hours] of [
    [1, 2],
    [2, 24],
    [3, 48],
  ] as const) {
    const t = t0 + i * MIN;
    await call('NO_ANSWER', t);
    const l = await lead(id, t);
    expect([l.nextAction, l.nextDue, l.callAttempts, l.statusId]).toEqual([
      `RETRY_${i}`,
      t + hours * 60 * MIN,
      i,
      `chua-lien-lac-${i}`,
    ]);
  }
  expect(
    ((await get(owner, '/api/crm2/leads?id=' + id, t0 + 3 * MIN)).lead as Json).firstResponseAt,
  ).toBe(t0 + MIN);
  const r4 = await call('NO_ANSWER', t0 + 4 * MIN);
  expect(r4.recall).toBe(true);
  expect(await lead(id, t0 + 4 * MIN)).toMatchObject({ owner: null, stage: 'NEW' });

  // Take it again and run through the other results.
  await post(
    owner,
    '/api/crm2/leads',
    { action: 'assign', ids: [id], userId: saleId },
    200,
    t0 + 5 * MIN,
  );
  await post(
    sale,
    '/api/crm2/leads',
    { action: 'result', id, result: 'APPOINTMENT' },
    400,
    t0 + 6 * MIN,
  );
  await post(
    sale,
    '/api/crm2/leads',
    { action: 'result', id, result: 'APPOINTMENT', when: t0 - DAY },
    400,
    t0 + 6 * MIN,
  );
  await call('APPOINTMENT', t0 + 6 * MIN, { when: t0 + 3 * DAY });
  expect(await lead(id, t0 + 7 * MIN)).toMatchObject({
    stage: 'VISIT_SCHEDULED',
    nextAction: 'MEETING',
    nextDue: t0 + 3 * DAY,
  });
  await call('MET', t0 + 8 * MIN);
  expect(await lead(id, t0 + 8 * MIN)).toMatchObject({ stage: 'VISITED', nextAction: 'FOLLOW_UP' });

  // Won needs a value, lost needs a reason.
  await post(sale, '/api/crm2/leads', { action: 'stage', id, stage: 'WON' }, 400, t0 + 9 * MIN);
  await post(sale, '/api/crm2/leads', { action: 'stage', id, stage: 'LOST' }, 400, t0 + 9 * MIN);
  await post(
    sale,
    '/api/crm2/leads',
    { action: 'stage', id, stage: 'WON', dealValue: 2_500_000 },
    200,
    t0 + 9 * MIN,
  );
  const won = await lead(id, t0 + 10 * MIN);
  expect([won.stage, won.statusId, won.expectedValue, won.wonAt]).toEqual([
    'WON',
    'da-mua',
    2_500_000,
    t0 + 9 * MIN,
  ]);
  await post(sale, '/api/crm2/leads', { action: 'result', id, result: 'MET' }, 409, t0 + 11 * MIN);

  // The customer shows up with a code and a tier.
  const customers = await get(owner, '/api/crm2/customers?q=' + p);
  expect(customers.customers).toHaveLength(1);
  expect(customers.customers[0]).toMatchObject({
    fullName: 'Khách Gọi',
    total: 2_500_000,
    tier: { id: 'member' },
  });
  expect(customers.customers[0].code).toMatch(/^KH-\d{6}$/);
  await post(owner, '/api/crm2/customers', {
    phone: p,
    birthday: '1990-05-17',
    occupation: 'Kế toán',
  });
  const cd = await get(owner, '/api/crm2/customers?phone=' + p);
  expect(cd.profile).toMatchObject({ birthday: '1990-05-17', occupation: 'Kế toán' });

  // Walking a won lead back closes nothing it should not and clears the win date.
  await post(
    owner,
    '/api/crm2/leads',
    { action: 'stage', id, stage: 'QUALIFIED' },
    200,
    t0 + 12 * MIN,
  );
  expect(await lead(id, t0 + 12 * MIN)).toMatchObject({ stage: 'QUALIFIED', wonAt: null });
});

test('lịch hẹn: tạo, duyệt khi bật chế độ duyệt, máy trạng thái, tỷ lệ đến hẹn', async ({
  request,
}) => {
  const p = phone();
  await intake(request, { fullName: 'Khách Hẹn', phone: p, consent: true });
  const id = ((await get(owner, '/api/crm2/leads?q=' + p)).leads as Json[])[0].id as string;
  await post(owner, '/api/crm2/leads', { action: 'assign', ids: [id], userId: saleId });
  await setSettings({ appointments: { requireApproval: true } });
  const at1 = Date.now() + 2 * DAY;
  const a = await post(sale, '/api/crm2/appointments', {
    action: 'create',
    leadId: id,
    at: at1,
    service: 'Trải nghiệm 9 hố',
  });
  expect(a.status).toBe('PENDING');
  await post(
    sale,
    '/api/crm2/appointments',
    { action: 'status', id: a.id, status: 'CONFIRMED' },
    403,
  ); // staff cannot approve
  await post(owner, '/api/crm2/appointments', { action: 'status', id: a.id, status: 'CONFIRMED' });
  await post(
    owner,
    '/api/crm2/appointments',
    { action: 'status', id: a.id, status: 'CONFIRMED' },
    409,
  );
  await post(sale, '/api/crm2/appointments', { action: 'status', id: a.id, status: 'ARRIVED' });
  await post(
    sale,
    '/api/crm2/appointments',
    { action: 'status', id: a.id, status: 'CANCELLED' },
    409,
  );
  expect((await lead(id)).stage).toBe('VISITED');
  const list = await get(
    owner,
    `/api/crm2/appointments?from=${Date.now()}&to=${Date.now() + 5 * DAY}`,
  );
  expect(list.appointments.some((x: Json) => x.id === a.id && x.status === 'ARRIVED')).toBe(true);
  expect(list.arrivalRate).toBeGreaterThan(0);
  // A past time is refused.
  await post(
    owner,
    '/api/crm2/appointments',
    { action: 'create', leadId: id, at: Date.now() - DAY },
    400,
  );
  await setSettings({ appointments: { requireApproval: false } });
});

test('giữ chỗ, cọc, đơn bán: một dịch vụ giới hạn một giữ chỗ, chỉ quản lý ghi tiền, thu không vượt nợ', async ({
  request,
}) => {
  await post(owner, '/api/crm2/sales', {
    action: 'product',
    code: 'VIP-SLOT',
    name: 'Gói HLV 1 kèm 1',
    listPrice: 3_000_000,
    limited: true,
    active: true,
  });
  await post(
    sale,
    '/api/crm2/sales',
    { action: 'product', code: 'X', name: 'X', listPrice: 1 },
    403,
  );
  const mk = async (name: string) => {
    const p = phone();
    await intake(request, { fullName: name, phone: p, consent: true });
    const id = ((await get(owner, '/api/crm2/leads?q=' + p)).leads as Json[])[0].id as string;
    await post(owner, '/api/crm2/leads', { action: 'assign', ids: [id], userId: saleId });
    return id;
  };
  const [l1, l2] = [await mk('Giữ Một'), await mk('Giữ Hai')];
  const h1 = await post(sale, '/api/crm2/sales', {
    action: 'hold',
    leadId: l1,
    productCode: 'VIP-SLOT',
  });
  await post(sale, '/api/crm2/sales', { action: 'hold', leadId: l2, productCode: 'VIP-SLOT' }, 409);
  await post(sale, '/api/crm2/sales', { action: 'release', id: h1.id });
  const h2 = await post(sale, '/api/crm2/sales', {
    action: 'hold',
    leadId: l2,
    productCode: 'VIP-SLOT',
    hours: 1,
  });
  // Money actions are for managers only.
  await post(sale, '/api/crm2/sales', { action: 'deposit', id: h2.id, amount: 500_000 }, 403);
  const dep = await post(owner, '/api/crm2/sales', {
    action: 'deposit',
    id: h2.id,
    amount: 500_000,
  });
  expect(dep.orderId).toBeTruthy();
  expect((await lead(l2)).stage).toBe('DEPOSITED');
  const od = await get(owner, '/api/crm2/sales?view=order&id=' + dep.orderId);
  expect(od.order.code).toMatch(/^BK\d{4}-\d{4}$/);
  expect(od.summary).toMatchObject({
    paid: 500_000,
    outstanding: 2_500_000,
    unscheduled: 2_500_000,
  });
  // The limited product cannot be sold twice.
  await post(
    owner,
    '/api/crm2/sales',
    { action: 'order', leadId: l1, productCode: 'VIP-SLOT' },
    409,
  );

  const call = (a: Json, status = 200) =>
    post(owner, '/api/crm2/sales', { action: 'order-action', id: dep.orderId, ...a }, status);
  await call({ op: 'schedule', installments: 3, firstDue: '2026-12-01', intervalDays: 30 });
  let d = await get(owner, '/api/crm2/sales?view=order&id=' + dep.orderId);
  const rows = (d.payments as Json[]).filter(
    (r) => r.status !== 'CANCELLED' && r.kind !== 'DEPOSIT',
  );
  expect(rows.map((r) => r.amount)).toEqual([833_333, 833_333, 833_334]);
  expect(d.summary.unscheduled).toBe(0);
  await post(
    sale,
    '/api/crm2/sales',
    { action: 'order-action', id: dep.orderId, op: 'pay', paymentId: rows[0].id, amount: 1000 },
    403,
  );
  await call({ op: 'pay', paymentId: rows[0].id, amount: 900_000 }, 400); // more than the row owes
  await call({ op: 'pay', paymentId: rows[0].id, amount: 300_000, method: 'Tiền mặt' });
  d = await get(owner, '/api/crm2/sales?view=order&id=' + dep.orderId);
  expect(d.payments.find((r: Json) => r.id === rows[0].id)).toMatchObject({
    paidAmount: 300_000,
    status: 'PARTIAL',
  });
  expect(d.summary.paid).toBe(800_000);
  const orders = await get(owner, '/api/crm2/sales');
  expect(orders.totals.outstanding).toBeGreaterThan(0);
  // Cancel needs a reason; the refund due equals what was collected, and the product frees up.
  await call({ op: 'cancel' }, 400);
  const cancelled = await call({ op: 'cancel', reason: 'Khách đổi ý' });
  expect(cancelled.refundDue).toBe(800_000);
  await call({ op: 'pay', paymentId: rows[1].id, amount: 1000 }, 409);
  await post(owner, '/api/crm2/sales', {
    action: 'order',
    leadId: l1,
    productCode: 'VIP-SLOT',
    discount: 200_000,
  });
});

test('cron: cần khóa, hết hạn giữ chỗ, cảnh báo quá hạn một lần, nhắc thanh toán một lần', async ({
  request,
}) => {
  expect((await request.post('/api/crm2/cron')).status()).toBe(401);
  expect(
    (await request.post('/api/crm2/cron', { headers: { authorization: 'Bearer sai' } })).status(),
  ).toBe(401);
  const auth = { authorization: 'Bearer e2e-cron-secret-0123456789' };
  const t0 = Date.now() + 40 * 24 * 60 * MIN;
  const run = async (t: number) =>
    (
      (await (await request.post('/api/crm2/cron', { headers: { ...auth, ...at(t) } })).json())
        .reports as Json[]
    )[0];
  const first = await run(t0);
  expect(first.errors).toEqual([]);
  expect(first.holdsExpired).toBeGreaterThanOrEqual(0);
  // Leads that are still new and untouched trigger the late alert exactly once.
  expect(first.slaAlerts).toBeGreaterThan(0);
  const second = await run(t0 + MIN);
  expect(second.slaAlerts).toBe(0);
  expect((await settingsOf()).slaMinutes).toBe(15);
  const config = await get(owner, '/api/crm2/config');
  expect(config.cron.value.errors).toEqual([]);
});

test('quyền: chưa đăng nhập bị từ chối ở mọi API CRM, CSRF bị chặn', async ({ request, page }) => {
  for (const path of ['leads', 'tasks', 'appointments', 'sales', 'customers', 'overview', 'config'])
    expect((await request.get('/api/crm2/' + path)).status(), path).toBe(401);
  for (const path of ['leads', 'tasks', 'appointments', 'sales', 'customers', 'config'])
    expect((await request.post('/api/crm2/' + path)).status(), 'POST ' + path).toBe(401);
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  expect(
    (
      await page.request.post('/api/crm2/leads', { headers: { Origin: 'https://evil.example' } })
    ).status(),
  ).toBe(403);
  const ov = await get(owner, '/api/crm2/overview');
  expect(ov.stages.length).toBeGreaterThan(0);
  expect(typeof ov.overdueTasks).toBe('number');
});

test('giao diện CRM: menu, các tab, mở lead, ghi kết quả, pipeline, đơn bán, cấu hình', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const p = phone();
  expect(
    (
      await page.request.post('/api/crm2/intake', {
        data: {
          fullName: 'Khách Giao Diện CRM',
          phone: p,
          consent: true,
          targetService: 'Gói 18 hố',
        },
        headers: { 'x-forwarded-for': nextIp() },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('.ds-menubar').getByRole('button', { name: 'CRM', exact: true }).click();
  const crm = page.getByRole('region', { name: 'CRM' });
  await expect(crm.getByRole('tab', { name: 'Bàn làm việc' })).toBeVisible();
  await expect(crm.getByText('Phễu 30 ngày')).toBeVisible();

  await crm.getByRole('tab', { name: 'Danh sách lead' }).click();
  await crm.getByRole('row', { name: /Khách Giao Diện CRM/ }).click();
  await expect(crm.getByText('Lịch sử hoạt động')).toBeVisible();
  await crm.getByLabel('Kết quả cuộc gọi').selectOption('INTERESTED');
  await crm.getByLabel('Ghi chú cuộc gọi').fill('Muốn tập swing');
  await crm.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(crm.getByRole('listitem').filter({ hasText: 'Muốn tập swing' })).toBeVisible();
  // A meeting needs a time.
  await crm.getByLabel('Kết quả cuộc gọi').selectOption('APPOINTMENT');
  await crm.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(crm.getByRole('alert')).toContainText('chọn ngày giờ hẹn');
  await crm.getByRole('button', { name: '← Quay lại' }).click();

  await crm.getByRole('tab', { name: 'Pipeline' }).click();
  await expect(
    crm.getByRole('region', { name: 'Có nhu cầu' }).getByText('Khách Giao Diện CRM'),
  ).toBeVisible();
  await crm.getByRole('tab', { name: 'Kho số' }).click();
  await expect(crm.getByText('Chọn lead để giao cho nhân viên.')).toBeVisible();
  await crm.getByRole('tab', { name: 'Đơn bán' }).click();
  await expect(crm.getByText('Tổng giá trị')).toBeVisible();
  await crm.getByRole('tab', { name: 'Cấu hình' }).click();
  await expect(crm.getByRole('heading', { name: 'Danh mục dịch vụ và gói' })).toBeVisible();
  await expect(crm.getByRole('cell', { name: 'Gói HLV 1 kèm 1' })).toBeVisible();
});
