import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';
const vnDay = (offsetDays: number) =>
  new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function loginApi(request: APIRequestContext, creds = OWNER) {
  const response = await request.post('/api/auth/login', { data: creds });
  expect(response.status()).toBe(200);
  return (await response.json()) as { mustChange: boolean };
}
async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} ${JSON.stringify(data)} -> ${await response.text()}`).toBe(
    status,
  );
  // Test helper: response shapes differ per endpoint and are asserted at the call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await response.json()) as Record<string, any>;
}
const nav = (page: Page, name: RegExp | string) =>
  page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name });

/** All-day prices so the tests do not depend on the time of day they run. */
function allDayRules() {
  const rules: Record<string, unknown>[] = [];
  const days = ['weekday', 'weekend', 'holiday'];
  for (const room of ['standard', 'vip'])
    for (const day of days) {
      rules.push({
        id: `${room}-gdr-${day}`,
        label: 'Luyện tập',
        service: 'gdr',
        room,
        day,
        from: '00:00',
        to: '24:00',
        people: null,
        amount: 100000,
        enabled: true,
      });
      for (const [service, unit] of [
        ['9', 300000],
        ['18', 400000],
      ] as const)
        for (let people = 1; people <= 4; people++)
          rules.push({
            id: `${room}-${service}-${people}-${day}`,
            label: 'Trọn lượt',
            service,
            room,
            day,
            from: '00:00',
            to: '24:00',
            people,
            amount: unit * people,
            enabled: true,
          });
    }
  return rules;
}

test('đăng nhập: sai mật khẩu bị từ chối, đúng thì vào được', async ({ page }) => {
  await page.goto('/quan-ly');
  await page.getByLabel('Email').fill(OWNER.email);
  await page.getByLabel('Mật khẩu').fill('sai-mat-khau');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
  await page.getByLabel('Mật khẩu').fill(OWNER.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tổng quan', level: 1, exact: true })).toBeVisible();
});

test('cấu hình cơ sở và nạp danh mục gói', async ({ request }) => {
  await loginApi(request);
  const { config } = await (await request.get('/api/club')).json();
  await post(request, '/api/club', {
    action: 'settings',
    value: {
      ...config,
      open: '00:00',
      close: '00:00',
      capacity: 8,
      vipCapacity: 2,
      vat: 8,
      fee: 5,
      feeMode: 'percent',
      holeMinutes9: [75, 75, 75, 75],
      holeMinutes18: [150, 150, 150, 150],
      priceRules: allDayRules(),
      onlineEnabled: true,
      onlineSlug: 'e2e-golf',
    },
  });
  const seeded = await post(request, '/api/members', { action: 'types-seed' });
  expect(seeded.created).toBe(5);
  await post(request, '/api/members', { action: 'types-seed' }, 409);
});

test('bán gói vào sổ ca rồi trả phiên 18 hố bằng lượt gói', async ({ page }) => {
  const request = page.request;
  await loginApi(request);
  await post(request, '/api/finance', {
    action: 'open',
    requestId: key(),
    name: 'Ca E2E',
    openingCash: 500000,
  });

  const customer = await post(request, '/api/members', {
    action: 'customer-create',
    name: 'Khách Gói',
    phone: '0912000111',
    note: '',
  });
  // The official catalogue has no 18-hole combo any more: create one for this flow.
  await post(request, '/api/members', {
    action: 'type-save',
    requestId: key(),
    name: 'Combo 18 hố · 10 lượt',
    price: 5_000_000,
    grants: [{ kind: 'holes18', qty: 10 }],
    validDays: 90,
    perks: '',
    section: '',
    room: 'any',
    active: true,
  });
  const list = await (await request.get('/api/members')).json();
  const type = list.types.find((t: { name: string }) => t.name.startsWith('Combo 18 hố · 10'));
  await post(request, '/api/members', {
    action: 'sell',
    requestId: key(),
    customerId: customer.id,
    typeId: type.id,
    method: 'transfer',
  });
  const finance = await (await request.get('/api/finance')).json();
  expect(finance.shifts[0].transfer_received).toBe(5_000_000);

  // A round starting within 15 minutes (never later) so it can be started immediately.
  const start = Math.ceil(Date.now() / 900_000) * 900_000;
  const { config } = await (await request.get('/api/club')).json();
  const booked = await post(request, '/api/club', {
    action: 'book',
    room: 'line-1',
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer: 'Khách Gói',
    phone: '+84 912 000 111',
    expectedRevision: config.pricingRevision,
  });
  await post(request, '/api/club', { action: 'start', id: booked.id });
  await post(request, '/api/club', { action: 'finish', id: booked.id });

  const usable = await (await request.get(`/api/members?usableFor=${booked.id}`)).json();
  expect(usable.packages).toHaveLength(1);
  const redeemed = await post(request, '/api/members', {
    action: 'redeem',
    bookingId: booked.id,
    packageId: usable.packages[0].id,
  });
  expect(redeemed).toMatchObject({ paid: true, remainingDue: 0 });
  const club = await (await request.get('/api/club')).json();
  const paid = club.bookings.find((b: { id: string }) => b.id === booked.id);
  expect([paid.status, paid.payment]).toEqual(['paid', 'package']);

  await page.goto('/quan-ly');
  await nav(page, /Khách hàng/).click();
  await page.getByRole('button', { name: /Khách Gói/ }).click();
  await expect(page.getByText('Điểm tích lũy:')).toBeVisible();
  await expect(page.getByText(/10 Lượt 18 hố/)).toBeVisible();
});

test('khách gửi yêu cầu đặt online, nhân viên xác nhận, khách thấy kết quả', async ({
  browser,
  page,
}) => {
  await loginApi(page.request);
  const guest = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const customer = await guest.newPage();
  await customer.goto('/book/e2e-golf');
  await customer.getByLabel('Dịch vụ').selectOption('18');
  await customer.getByLabel(/Ngày, giờ bắt đầu/).fill(`${vnDay(1)}T10:00`);
  await customer.getByLabel('Họ và tên').fill('Khách Online');
  await customer.getByLabel('Số điện thoại').fill('0933444555');
  await customer.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }).click();
  await expect(customer.getByText('Đang chờ nhân viên xác nhận')).toBeVisible();

  await page.goto('/quan-ly');
  await nav(page, /Booking/).click();
  await page.getByRole('tab', { name: /Đặt online/ }).click();
  const row = page.getByRole('row', { name: /Khách Online/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Xác nhận' }).click();
  // A confirmed request leaves the "Chờ xác nhận" list and stays under "Tất cả".
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: /^Tất cả/ }).click();
  await expect(row.getByText('Đã xác nhận lịch')).toBeVisible();

  await customer.reload();
  await expect(customer.getByText('Đã xác nhận lịch')).toBeVisible();
  await guest.close();
});

test('phân quyền: thu ngân chỉ làm được việc của thu ngân', async ({ browser, page }) => {
  await loginApi(page.request);
  const created = await post(page.request, '/api/staff', {
    action: 'create',
    email: 'thungan@e2e.test',
    name: 'Thu Ngân',
    role: 'cashier',
  });
  const temporary = created.temporaryPassword as string;

  const ctx = await browser.newContext({ locale: 'vi-VN' });
  const cashier = ctx.request;
  expect(
    (await loginApi(cashier, { email: 'thungan@e2e.test', password: temporary })).mustChange,
  ).toBe(true);
  expect((await cashier.get('/api/club')).status()).toBe(403); // must change the temporary password first
  await post(cashier, '/api/auth/password', {
    action: 'change',
    current: temporary,
    next: 'thungan-e2e-2026',
  });

  expect((await cashier.get('/api/club')).status()).toBe(200);
  expect((await cashier.get('/api/finance')).status()).toBe(200);
  for (const url of ['/api/staff', '/api/export', '/api/audit'])
    expect((await cashier.get(url)).status(), url).toBe(403);
  await post(cashier, '/api/club', { action: 'settings', value: {} }, 403);
  await post(
    cashier,
    '/api/members',
    {
      action: 'type-save',
      requestId: key(),
      name: 'Gói thử',
      price: 1000,
      grants: [{ kind: 'gdr', qty: 1 }],
      validDays: 1,
      perks: '',
      active: true,
    },
    403,
  );

  const view = await ctx.newPage();
  await view.goto('/quan-ly');
  await expect(view.getByRole('heading', { name: 'Tổng quan', level: 1, exact: true })).toBeVisible();
  await expect(nav(view, /Cài đặt/)).toHaveCount(0);
  await expect(nav(view, /Khách hàng/)).toBeVisible();
  await ctx.close();
});

test('thông tin đăng nhập giả mạo từ nền tảng cũ không có tác dụng', async ({ request }) => {
  const forged = await request.get('/api/club', {
    headers: {
      'oai-authenticated-user-id': 'e2e-tenant',
      'oai-authenticated-user-email': 'owner@e2e.test',
    },
  });
  expect(forged.status()).toBe(401);
});

test('huấn luyện: xếp lịch chống trùng, HLV chỉ thấy và đánh dấu buổi của mình', async ({
  browser,
  page,
}) => {
  const owner = page.request;
  await loginApi(owner);
  const staff = await post(owner, '/api/staff', {
    action: 'create',
    email: 'hlv@e2e.test',
    name: 'HLV Một',
    role: 'coach',
  });
  const mine = await post(owner, '/api/coaching', {
    action: 'coach-save',
    name: 'HLV Một',
    phone: '0900000001',
    userId: staff.id,
    active: true,
  });
  const other = await post(owner, '/api/coaching', {
    action: 'coach-save',
    name: 'HLV Hai',
    phone: '',
    userId: null,
    active: true,
  });

  const start = Date.parse(`${vnDay(2)}T09:00:00+07:00`);
  const lesson = (coachId: string, at: number, customerName: string) => ({
    action: 'lesson-create',
    requestId: key(),
    coachId,
    customerName,
    phone: '0912000111',
    start: at,
    minutes: 60,
    price: 500000,
    note: '',
  });
  const first = await post(owner, '/api/coaching', lesson(mine.id, start, 'Học viên A'));
  expect(first.customerLinked).toBe(true); // matched the member created earlier by phone
  await post(owner, '/api/coaching', lesson(mine.id, start + 30 * 60_000, 'Học viên B'), 409);
  await post(owner, '/api/coaching', lesson(other.id, start, 'Học viên C'));

  const ctx = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const coach = ctx.request;
  const temporary = staff.temporaryPassword as string;
  await loginApi(coach, { email: 'hlv@e2e.test', password: temporary });
  await post(coach, '/api/auth/password', {
    action: 'change',
    current: temporary,
    next: 'hlv-e2e-2026',
  });
  const own = await (await coach.get('/api/coaching')).json();
  expect(own.lessons.map((l: { customer_name: string }) => l.customer_name)).toEqual([
    'Học viên A',
  ]);
  await post(coach, '/api/coaching', lesson(mine.id, start + 4 * 3600_000, 'Học viên D'), 403);
  await post(
    coach,
    '/api/coaching',
    { action: 'lesson-status', id: first.id, status: 'cancelled' },
    403,
  );
  await post(
    coach,
    '/api/coaching',
    { action: 'lesson-status', id: first.id, status: 'done' },
    409,
  );
  await post(coach, '/api/coaching', {
    action: 'lesson-note',
    id: first.id,
    coachNote: 'Cần tập grip',
  });

  const view = await ctx.newPage();
  await view.goto('/quan-ly');
  await nav(view, /Huấn luyện/).click();
  await expect(view.getByText('Học viên A')).toBeVisible();
  await expect(view.getByText('Ghi chú HLV: Cần tập grip')).toBeVisible();
  await expect(view.getByText('Học viên C')).toHaveCount(0);
  await ctx.close();

  await post(owner, '/api/coaching', {
    action: 'lesson-status',
    id: first.id,
    status: 'cancelled',
  });
  await post(owner, '/api/coaching', lesson(mine.id, start, 'Học viên E')); // slot freed by the cancellation
});
