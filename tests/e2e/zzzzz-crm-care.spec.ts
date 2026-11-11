import { test, expect, type APIRequestContext } from '@playwright/test';

// Customer care in the CRM module: the cron creates tasks for existing customers, staff claim, snooze, finish or skip them.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const AUTH = { authorization: 'Bearer e2e-cron-secret-0123456789' };
const DAY = 86_400_000;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let seq = 0;
const run = Date.now() % 100000;
const phone = () => `0955${String(100000 + run + ++seq).slice(-6)}`;
const get = async (url: string) => (await (await owner.get(url)).json()) as Json;
async function post(
  url: string,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  const r = await owner.post(url, { data, headers });
  expect(r.status(), `${url} -> ${await r.text()}`).toBe(status);
  return (await r.json()) as Json;
}
const cron = async () => {
  const r = await owner.get('/api/crm2/cron', { headers: AUTH });
  expect(r.status(), await r.text()).toBe(200);
};
const careTasks = async (done = true) =>
  ((await get(`/api/crm2/tasks?kind=care&scope=all${done ? '&done=1' : ''}`)).tasks ??
    []) as Json[];
const newCustomer = async (name: string) => {
  const p = phone();
  const made = await post('/api/members', { action: 'customer-create', name, phone: p, note: '' });
  return { id: made.id as string, phone: p };
};

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
});
test.afterAll(async () => {
  await owner.dispose();
});

test('khách mới: cron tạo việc chào mừng một lần, có tin mẫu điền sẵn', async () => {
  const c = await newCustomer('Khách Chăm Sóc Một');
  await cron();
  await cron(); // running again must not duplicate
  const mine = (await careTasks()).filter((t) => t.customerId === c.id);
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({
    rule: 'welcome',
    title: 'Chào mừng khách mới',
    phone: c.phone,
    outcome: '',
    assignee: null,
  });
  expect(mine[0].message).toContain('Khách Chăm Sóc Một');
  expect(mine[0].message).not.toContain('{');
  // Care tasks stay out of the ordinary task list.
  const plain = ((await get('/api/crm2/tasks?scope=all')).tasks ?? []) as Json[];
  expect(plain.some((t) => t.id === mine[0].id)).toBe(false);
});

test('nhận việc, hẹn lại, ghi kết quả; bỏ qua cần lý do; dữ liệu sai bị từ chối', async () => {
  const a = await newCustomer('Khách Chăm Sóc Hai');
  const b = await newCustomer('Khách Chăm Sóc Ba');
  await cron();
  const find = async (id: string) => (await careTasks()).find((t) => t.customerId === id)!;
  const ta = await find(a.id);
  const tb = await find(b.id);

  await post('/api/crm2/tasks', { action: 'care-claim', id: ta.id });
  expect((await find(a.id)).assignee).toBeTruthy();
  await post('/api/crm2/tasks', { action: 'care-claim', id: ta.id }, 409); // already taken

  const before = (await find(a.id)).dueAt as number;
  await post('/api/crm2/tasks', { action: 'care-snooze', id: ta.id, days: 3 });
  expect((await find(a.id)).dueAt).toBeGreaterThan(before + 2 * DAY);

  await post('/api/crm2/tasks', { action: 'care-done', id: ta.id, channel: 'fax', note: '' }, 400);
  await post('/api/crm2/tasks', {
    action: 'care-done',
    id: ta.id,
    channel: 'zalo',
    note: 'Hẹn thứ 7',
  });
  expect(await find(a.id)).toMatchObject({ outcome: 'done', channel: 'zalo', note: 'Hẹn thứ 7' });
  await post('/api/crm2/tasks', { action: 'care-done', id: ta.id, channel: 'call', note: '' }, 409);

  await post('/api/crm2/tasks', { action: 'care-skip', id: tb.id, reason: 'x' }, 400);
  await post('/api/crm2/tasks', { action: 'care-skip', id: tb.id, reason: 'Khách đã ghé quầy' });
  expect(await find(b.id)).toMatchObject({ outcome: 'skipped', note: 'Khách đã ghé quầy' });
  // Closed tasks never come back, even after another cron run.
  await cron();
  expect((await careTasks(false)).filter((t) => [a.id, b.id].includes(t.customerId))).toHaveLength(
    0,
  );
});

test('tắt một quy tắc trong cấu hình thì không tạo việc đó nữa; tab Chăm sóc khách hiện việc', async ({
  page,
}) => {
  const cfg = (await get('/api/crm2/config')).settings as Json;
  const withWelcome = (enabled: boolean) => ({
    ...cfg,
    care: {
      ...cfg.care,
      rules: { ...cfg.care.rules, welcome: { ...cfg.care.rules.welcome, enabled } },
    },
  });
  await post('/api/crm2/config', { settings: withWelcome(false) });
  const off = await newCustomer('Khách Không Chào');
  await cron();
  expect((await careTasks()).some((t) => t.customerId === off.id)).toBe(false);

  await post('/api/crm2/config', { settings: withWelcome(true) });
  const on = await newCustomer('Khách Có Chào');
  await cron();
  expect((await careTasks()).some((t) => t.customerId === on.id)).toBe(true);

  // The screen: manager sees the task with its message and the action buttons.
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM' }).click();
  await page.getByRole('tab', { name: 'Chăm sóc khách' }).click();
  const card = page.locator('.crm-task', { hasText: 'Khách Có Chào' });
  await expect(card).toContainText('Chào mừng khách mới');
  await expect(card).toContainText('Chào Khách Có Chào');
  await expect(card.getByRole('button', { name: 'Đã liên hệ' })).toBeVisible();
  await card.getByRole('button', { name: 'Đã liên hệ' }).click();
  await card.getByLabel('Kết quả liên hệ').fill('Khách hẹn đặt lịch');
  await card.getByRole('button', { name: 'Lưu kết quả' }).click();
  await page.getByRole('button', { name: /^Đã xử lý/ }).click();
  await expect(page.locator('.crm-task', { hasText: 'Khách Có Chào' })).toContainText(
    'Khách hẹn đặt lịch',
  );
});

const files = async (q = '') =>
  ((await get('/api/crm2/care-customers?q=' + encodeURIComponent(q))).customers ?? []) as Json[];
const file = async (id: string) => await get('/api/crm2/care-customers?id=' + id);

test('hồ sơ khách: gói và lịch sử chơi của hội viên, nhóm khách, liên hệ và đồng ý nhận tin', async () => {
  // "Khách Gói" bought a package and played a paid round in flow.spec.ts.
  const found = (await files('Khách Gói')).find((c) => c.name === 'Khách Gói');
  expect(found).toBeTruthy();
  expect(found!.visits).toBeGreaterThanOrEqual(1);
  const detail = await file(found!.id);
  expect(detail.packages.length).toBeGreaterThanOrEqual(1);
  expect(detail.visits.length).toBeGreaterThanOrEqual(1);
  expect(detail.customer.segments).not.toContain('idle');
  expect(detail.timeline.some((e: Json) => e.kind === 'booking')).toBe(true);
  const sessionStarted = detail.timeline.find(
    (e: Json) => e.kind === 'session' && e.title === 'Bắt đầu chơi',
  );
  const sessionFinished = detail.timeline.find(
    (e: Json) => e.kind === 'session' && e.title === 'Kết thúc chơi',
  );
  expect(sessionStarted).toBeTruthy();
  expect(sessionFinished).toBeTruthy();
  expect(sessionStarted.at).toBeLessThanOrEqual(sessionFinished.at);
  expect(detail.timeline.some((e: Json) => e.kind === 'payment')).toBe(true);
  expect(detail.timeline.some((e: Json) => e.kind === 'package')).toBe(true);

  const c = await newCustomer('Khách Hồ Sơ Mới');
  const row = (await files(c.phone)).find((x) => x.id === c.id)!;
  expect(row.segments).toContain('idle'); // never played
  expect(row.segments).toContain('new');
  expect((await files('khong-co-ai-ten-vay')).length).toBe(0);

  const act = (body: Json, status = 200) =>
    post('/api/crm2/care-customers', { customerId: c.id, ...body }, status);
  await act({ action: 'birthday-set', birthday: '1990-05-17' });
  await act({ action: 'birthday-set', birthday: '17/05' }, 400); // wrong format
  await act({ action: 'contact-set', email: 'khach@example.com', zaloId: 'zalo-123' });
  await act({ action: 'contact-set', email: 'khong-phai-email', zaloId: '' }, 400);
  await act({ action: 'consent-set', consent: true });
  let d = await file(c.id);
  expect(d.customer).toMatchObject({
    birthday: '1990-05-17',
    email: 'khach@example.com',
    zalo_id: 'zalo-123',
    marketing_consent: 1,
  });
  expect(d.notes.some((n: Json) => /đồng ý nhận tin/.test(n.content))).toBe(true);

  await act({ action: 'note-add', channel: 'call', content: 'Hỏi giá gói 20 lượt' });
  await act({ action: 'note-add', channel: 'fax', content: 'x' }, 400);
  d = await file(c.id);
  expect(
    d.notes.some((n: Json) => n.channel === 'call' && n.content === 'Hỏi giá gói 20 lượt'),
  ).toBe(true);

  await post(
    '/api/crm2/care-customers',
    { action: 'note-add', customerId: 'khong-co', channel: 'note', content: 'x' },
    404,
  );
});

test('phản hồi thấp tạo việc phản ánh cho quản lý; phản hồi tốt thì không; việc thêm tay hiện ở danh sách', async () => {
  const c = await newCustomer('Khách Phản Hồi');
  const act = (body: Json) => post('/api/crm2/care-customers', { customerId: c.id, ...body });
  const good = await act({ action: 'feedback', rating: 5, comment: 'Rất hài lòng' });
  expect(good.complaintTask).toBeUndefined();
  const bad = await act({ action: 'feedback', rating: 2, comment: 'Chờ lâu' });
  expect(typeof bad.complaintTask).toBe('string');
  const mine = (await careTasks()).filter((t) => t.customerId === c.id);
  expect(mine.find((t) => t.rule === 'complaint')).toMatchObject({
    title: 'Xử lý phản ánh của khách',
    outcome: '',
  });
  await act({ action: 'task-create', title: 'Gọi báo giá gói VIP', days: 1 });
  expect(
    (await careTasks()).some((t) => t.customerId === c.id && t.title === 'Gọi báo giá gói VIP'),
  ).toBe(true);
  const d = await file(c.id);
  expect(d.notes.map((n: Json) => n.content).join('|')).toMatch(/Phản hồi 2\/5 sao: Chờ lâu/);
  expect(d.tasks.some((t: Json) => t.rule === 'complaint')).toBe(true);
});

test('giao diện: tab Hồ sơ khách tìm và mở hồ sơ; từ thẻ việc bấm tên khách mở đúng hồ sơ', async ({
  page,
}) => {
  const c = await newCustomer('Khách Giao Diện Hồ Sơ');
  await cron();
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM' }).click();
  await page.getByRole('region', { name: 'CRM' }).getByRole('tab', { name: 'Khách hàng' }).click();
  await page.getByLabel('Tìm hồ sơ khách').fill(c.phone);
  await page.getByRole('row', { name: /Khách Giao Diện Hồ Sơ/ }).click();
  const panel = page.getByRole('region', { name: 'Hồ sơ Khách Giao Diện Hồ Sơ' });
  await expect(panel).toContainText(c.phone);
  await panel.getByRole('tab', { name: 'Chăm sóc' }).click();
  await panel.getByLabel('Nội dung ghi chú').fill('Khách hỏi lịch cuối tuần');
  await panel.getByRole('button', { name: 'Lưu', exact: true }).click();
  await panel.getByRole('tab', { name: 'Lịch sử' }).click();
  await expect(panel).toContainText('Khách hỏi lịch cuối tuần');

  await panel.getByRole('button', { name: 'Đóng' }).click();
  await page.getByLabel('Tìm hồ sơ khách').fill('Khách Gói');
  await page.getByRole('row', { name: /^Khách Gói 0912/ }).click();
  const memberPanel = page.getByRole('region', { name: 'Hồ sơ Khách Gói' });
  await memberPanel.getByRole('tab', { name: 'Lịch sử' }).click();
  await expect(memberPanel).toContainText('Bắt đầu chơi');
  await expect(memberPanel).toContainText('Kết thúc chơi');
  await expect(memberPanel).toContainText('Thanh toán');
  await expect(memberPanel).toContainText('Thẻ giờ');

  // From a care task, the customer's name opens the same file.
  await page.getByRole('tab', { name: 'Chăm sóc khách' }).click();
  await page
    .locator('.crm-task', { hasText: 'Khách Giao Diện Hồ Sơ' })
    .getByRole('button', { name: 'Khách Giao Diện Hồ Sơ' })
    .click();
  await expect(page.getByRole('region', { name: 'Hồ sơ Khách Giao Diện Hồ Sơ' })).toBeVisible();
});

test('nhân sự: Zalo ID và email báo lưu được; nút trực bật tắt nhận lead; phản ánh báo quản lý qua email và Zalo', async ({
  page,
}) => {
  const cfg = await get('/api/crm2/config');
  const me = cfg.me as string;
  const staff = (extra: Json) => post('/api/crm2/config', { staff: { userId: me, ...extra } });
  await staff({
    team: 'Tổ A',
    isLeader: true,
    extension: '101',
    zaloId: 'zalo-owner-1',
    notifyEmail: 'nhan-vien@example.com',
  });
  await post('/api/crm2/config', { staff: { userId: me, notifyEmail: 'khong-phai-email' } }, 400);
  const saved = ((await get('/api/crm2/config')).staffExtra as Json[]).find(
    (x) => x.userId === me,
  )!;
  expect(saved).toMatchObject({
    team: 'Tổ A',
    isLeader: 1,
    extension: '101',
    zaloId: 'zalo-owner-1',
    notifyEmail: 'nhan-vien@example.com',
  });

  // The duty switch is the person's own and lands in the distribution settings.
  expect((await get('/api/crm2/duty')).onDuty).toBe(true);
  await post('/api/crm2/duty', { onDuty: false });
  expect((await get('/api/crm2/duty')).onDuty).toBe(false);
  expect(
    ((await get('/api/crm2/config')).settings.distribution.paused as string[]).includes(me),
  ).toBe(true);
  await post('/api/crm2/duty', { onDuty: 'có' }, 400);
  await post('/api/crm2/duty', { onDuty: true });
  expect(
    ((await get('/api/crm2/config')).settings.distribution.paused as string[]).includes(me),
  ).toBe(false);

  // A low score alerts the managers on both channels the person gave.
  const c = await newCustomer('Khách Báo Quản Lý');
  await post('/api/crm2/care-customers', {
    action: 'feedback',
    customerId: c.id,
    rating: 1,
    comment: 'Rất tệ',
  });
  const mail = (await get('/api/crm2/channels?recipient=nhan-vien@example.com')).recent as Json[];
  expect(mail.some((m) => m.channel === 'email' && /Phản ánh/.test(m.subject))).toBe(true);
  const zalo = (await get('/api/crm2/channels?recipient=zalo-owner-1')).recent as Json[];
  expect(zalo.some((m) => m.channel === 'zalo' && /Phản ánh/.test(m.subject))).toBe(true);

  // The screens: the duty button on top of the CRM and the staff table in the settings.
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM' }).click();
  const duty = page.getByRole('button', { name: /Đang trực/ });
  await expect(duty).toBeVisible();
  await duty.click();
  await expect(page.getByRole('button', { name: /Đang nghỉ/ })).toBeVisible();
  await page.getByRole('button', { name: /Đang nghỉ/ }).click();
  await expect(page.getByRole('button', { name: /Đang trực/ })).toBeVisible();
  await page.getByRole('tab', { name: /Thiết lập|Cấu hình/ }).click();
  await expect(page.getByText('zalo-owner-1')).toBeVisible();
});

test('báo cáo tư vấn: phễu, nguồn, nhân viên và việc chăm sóc; cần quyền quản lý', async ({
  page,
  playwright,
}) => {
  const lead = (name: string) =>
    post('/api/crm2/leads', { action: 'create', fullName: name, phone: phone() });
  await lead('Khách Báo Cáo Một');
  await lead('Khách Báo Cáo Hai');
  await newCustomer('Khách Báo Cáo Chăm Sóc');
  await cron();

  const r = await get('/api/crm2/report?days=30');
  expect(r.days).toBe(30);
  expect(r.total).toBeGreaterThanOrEqual(2);
  expect((r.stages as Json[]).reduce((n, x) => n + x.n, 0)).toBe(r.total);
  expect((r.sources as Json[]).reduce((n, x) => n + x.leads, 0)).toBe(r.total);
  expect((r.agents as Json[]).reduce((n, x) => n + x.leads, 0)).toBe(r.total);
  const welcome = (r.care as Json[]).find((x) => x.rule === 'welcome')!;
  expect(welcome.total).toBeGreaterThanOrEqual(1);
  expect(welcome.done + welcome.skipped).toBeLessThanOrEqual(welcome.total);
  expect((await get('/api/crm2/report?days=100000')).days).toBe(365); // clamped
  expect((await get('/api/crm2/report?days=abc')).days).toBe(30);

  // Not signed in: refused.
  const anon = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await anon.get('/api/crm2/report')).status()).toBe(401);
  await anon.dispose();

  // The screen shows the same figures.
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM' }).click();
  await page.getByRole('tab', { name: 'Báo cáo' }).click();
  await expect(page.getByRole('heading', { name: 'Phễu tư vấn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Việc chăm sóc khách' })).toBeVisible();
  await expect(page.locator('.crm-kpis').getByText('Lead nhận được')).toBeVisible();
  await page.getByRole('button', { name: '7 ngày' }).click();
  await expect(page.getByRole('heading', { name: 'Theo nhân viên' })).toBeVisible();
});
