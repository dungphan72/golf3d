import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (package catalogue, open shift).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';
const PHONE = '0966777888';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('hội viên đăng ký online, chờ xác nhận, rồi tự xem thẻ và giờ chơi của mình', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const guest = await browser.newContext({ locale: 'vi-VN' });
  const me = await guest.newPage();

  // Signed out: the account page asks to sign in.
  await me.goto('/tai-khoan');
  await expect(me.getByRole('tab', { name: 'Đăng nhập' })).toBeVisible();

  // Register. Weak passwords and bad phones are refused.
  await me.goto('/tai-khoan?dang-ky');
  await me.getByLabel('Họ và tên').fill('Hội Viên Online');
  await me.getByLabel('Số điện thoại').fill(PHONE);
  await me.getByLabel('Mật khẩu').fill('matkhau-an-toan-1');
  await me.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(me.getByRole('heading', { name: /Xin chào, Hội Viên Online/ })).toBeVisible();
  await expect(me.getByText('Đang chờ câu lạc bộ xác nhận')).toBeVisible();
  // Until staff verify the phone number, no card or history is shown.
  await expect(me.getByText('Thẻ và gói của tôi')).toHaveCount(0);

  // Registering also puts the person in the CRM as a lead to call (once, whatever the retries).
  const crm = page.request;
  expect((await crm.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const leads = (await (await crm.get('/api/crm/leads')).json()).leads as {
    phone: string;
    campaign: string;
    source: string;
  }[];
  const registered = leads.filter((l) => l.phone === PHONE);
  expect(registered).toHaveLength(1);
  expect(registered[0]).toMatchObject({ source: 'website', campaign: 'dang-ky-hoi-vien' });

  // Staff verify the phone and sell a package.
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const found = await (await owner.get('/api/members?q=' + PHONE)).json();
  const customer = found.customers.find((c: { phone: string }) => c.phone === PHONE);
  expect(customer.account).toBe(0);
  const type = found.types.find((t: { name: string; active: number }) => t.active);
  await post(owner, '/api/members', { action: 'account-verify', customerId: customer.id });
  await post(owner, '/api/members', {
    action: 'sell',
    requestId: key(),
    customerId: customer.id,
    typeId: type.id,
    method: 'cash',
  });

  // The member now sees the package.
  await me.reload();
  await expect(me.getByText('Thẻ và gói của tôi')).toBeVisible();
  await expect(me.getByRole('heading', { name: type.name })).toBeVisible();

  // The card: tier, member code and a QR; staff find the same member by that code.
  const code = 'HV-' + customer.id.replaceAll('-', '').slice(0, 8).toUpperCase();
  const card = me.getByRole('region', { name: 'Thẻ hội viên' });
  await expect(card).toContainText('Hội Viên Online');
  await expect(card.getByRole('button', { name: new RegExp(code) })).toBeVisible();
  await expect(card.getByRole('img', { name: 'Mã QR của thẻ hội viên' })).toBeVisible();
  await expect(card).toContainText(/Hội viên|Platinum|Diamond/);
  const byCode = await (await owner.get('/api/members?q=' + code.toLowerCase())).json();
  expect(byCode.customers.map((c: { id: string }) => c.id)).toEqual([customer.id]);
  const noMatch = await (await owner.get('/api/members?q=HV-00000000')).json();
  expect(noMatch.customers).toEqual([]);
  expect((await guest.request.get('/api/member')).ok()).toBe(true);
  expect((await (await guest.request.get('/api/member')).json()).code).toBe(code);

  // Sign out and back in; a wrong password is refused.
  await me.getByRole('button', { name: 'Đăng xuất' }).click();
  await me.getByRole('tab', { name: 'Đăng nhập' }).click();
  await me.getByLabel('Số điện thoại').fill(PHONE);
  await me.getByLabel('Mật khẩu').fill('sai-mat-khau-roi');
  await me.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(me.getByRole('alert')).toContainText('không đúng');
  await me.getByLabel('Mật khẩu').fill('matkhau-an-toan-1');
  await me.getByRole('button', { name: 'Đăng nhập', exact: true }).last().click();
  await expect(me.getByRole('heading', { name: type.name })).toBeVisible();

  // The member asks to buy a package from the page; staff see it, sell it, and it becomes theirs.
  await me.reload();
  await expect(me.getByRole('button', { name: 'Đăng ký mua' }).first()).toBeVisible();
  const ordered = await guest.request.post('/api/member', {
    data: { action: 'order', typeId: type.id },
  });
  expect(ordered.status(), await ordered.text()).toBe(200);
  const mine = await (await guest.request.get('/api/member')).json();
  expect(mine.orders).toHaveLength(1);
  const detail = await (await owner.get(`/api/members?customer=${customer.id}`)).json();
  expect(detail.detail.orders).toHaveLength(1);
  const packagesBefore = detail.detail.packages.length;
  await post(owner, '/api/members', {
    action: 'sell',
    requestId: key(),
    customerId: customer.id,
    typeId: type.id,
    method: 'cash',
    orderId: detail.detail.orders[0].id,
  });
  const after = await (await guest.request.get('/api/member')).json();
  expect(after.orders).toHaveLength(0);
  expect(after.packages).toHaveLength(packagesBefore + 1);

  // The member books from their own page (name and phone come from the account) and can cancel it.
  const day = new Date(Date.now() + 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T10:00:00+07:00`);
  const booked = await guest.request.post('/api/member', {
    data: {
      action: 'book',
      service: '18',
      vip: false,
      guests: 0,
      start,
      note: 'từ trang hội viên',
    },
  });
  expect(booked.status(), await booked.text()).toBe(200);
  const withBooking = await (await guest.request.get('/api/member')).json();
  expect(withBooking.requests).toHaveLength(1);
  const cancelled = await guest.request.post('/api/member', {
    data: { action: 'book-cancel', id: withBooking.requests[0].id },
  });
  expect(cancelled.status()).toBe(200);
  expect((await (await guest.request.get('/api/member')).json()).requests).toHaveLength(0);
  // A member cannot cancel someone else's request or order.
  const other = await guest.request.post('/api/member', {
    data: { action: 'order-cancel', id: crypto.randomUUID() },
  });
  expect(other.status()).toBe(409);

  // The same phone cannot register twice; another member's data is never returned to an anonymous call.
  const anon = await (await browser.newContext()).request.get('/api/member');
  expect(anon.status()).toBe(200);
  expect(await anon.json()).toEqual({ signedOut: true });
  await post(owner, '/api/members', { action: 'account-reset', customerId: customer.id });
  await me.reload();
  await expect(me.getByRole('tab', { name: 'Đăng nhập' })).toBeVisible(); // reset signs everyone out
  const again = await guest.request.post('/api/member', {
    data: {
      action: 'register',
      name: 'Trùng',
      phone: PHONE,
      email: '',
      password: 'matkhau-khac-2',
    },
  });
  expect(again.status()).toBe(409);
});

test('đăng nhập sai nhiều lần chỉ chặn đúng địa chỉ IP đó, không khóa chủ tài khoản', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const phone = '0977888999';
  const password = 'matkhau-dung-123';
  const owner = await browser.newContext();
  const make = await owner.request.post('/api/member', {
    headers: { 'x-forwarded-for': '10.0.0.1', 'cf-connecting-ip': '203.0.113.9' },
    data: { action: 'register', name: 'Chủ Tài Khoản', phone, email: '', password },
  });
  expect(make.status(), await make.text()).toBe(200);

  const attacker = await browser.newContext();
  const login = (ctx: typeof attacker, ip: string, pw: string) =>
    ctx.request.post('/api/member', {
      headers: { 'x-forwarded-for': ip, 'cf-connecting-ip': '203.0.113.9' },
      data: { action: 'login', phone, password: pw },
    });
  for (let i = 0; i < 5; i++)
    expect((await login(attacker, '10.9.9.9', 'sai-mat-khau-' + i)).status()).toBe(401);
  // The attacker's address is now blocked, even with the right password...
  expect((await login(attacker, '10.9.9.9', password)).status()).toBe(429);
  // ...but the real member, from another address, still signs in.
  const real = await browser.newContext();
  const ok = await login(real, '10.0.0.2', password);
  expect(ok.status(), await ok.text()).toBe(200);
});

test('một địa chỉ IP chỉ đăng ký được vài tài khoản mỗi giờ', async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext();
  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const r = await ctx.request.post('/api/member', {
      headers: { 'x-forwarded-for': '10.5.5.5', 'cf-connecting-ip': '203.0.113.9' },
      data: {
        action: 'register',
        name: 'Khách ' + i,
        phone: `09123400${String(i).padStart(2, '0')}`,
        email: '',
        password: 'matkhau-an-toan-9',
      },
    });
    statuses.push(r.status());
  }
  expect(statuses.filter((s) => s === 200)).toHaveLength(5);
  expect(statuses.slice(5)).toEqual([429, 429]);
});
