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

  // The same phone cannot register twice; another member's data is never returned to an anonymous call.
  const anon = await (await browser.newContext()).request.get('/api/member');
  expect(anon.status()).toBe(401);
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
