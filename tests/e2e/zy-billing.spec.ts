import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (open shift, club settings with prices).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function finishedRound(
  request: APIRequestContext,
  room: string,
  customer = 'Khách Giảm Giá',
) {
  const { config } = await (await request.get('/api/club')).json();
  const start = Math.ceil(Date.now() / 900_000) * 900_000;
  const booked = await post(request, '/api/club', {
    action: 'book',
    room,
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer,
    phone: '0922333444',
    expectedRevision: config.pricingRevision,
  });
  await post(request, '/api/club', { action: 'start', id: booked.id });
  await post(request, '/api/club', { action: 'finish', id: booked.id });
  return booked.id as string;
}

const amountOf = async (request: APIRequestContext, id: string) => {
  const snapshot = await (await request.get('/api/club')).json();
  return snapshot.bookings.find((b: { id: string }) => b.id === id).amount as number;
};

test('giảm giá phiếu, thu tiền, rồi hoàn một phần: sổ ca và phiếu khớp nhau', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const id = await finishedRound(owner, 'line-9');
  const before = await amountOf(owner, id);
  expect(before).toBeGreaterThan(100_000);

  // A discount lowers the amount due; it needs a reason and can only be given once.
  await post(
    owner,
    '/api/billing',
    { action: 'discount', bookingId: id, amount: 1000, reason: 'ab' },
    400,
  );
  await post(
    owner,
    '/api/billing',
    { action: 'discount', bookingId: id, amount: before, reason: 'Quá lớn' },
    409,
  );
  await post(owner, '/api/billing', {
    action: 'discount',
    bookingId: id,
    amount: 50_000,
    reason: 'Khách quen',
  });
  expect(await amountOf(owner, id)).toBe(before - 50_000);
  await post(
    owner,
    '/api/billing',
    { action: 'discount', bookingId: id, amount: 1000, reason: 'Giảm thêm' },
    409,
  );
  const info = await (await owner.get('/api/billing?booking=' + id)).json();
  expect(info.bill.discount).toMatchObject({ amount: 50_000, reason: 'Khách quen' });

  // Pay the reduced amount in cash.
  const due = before - 50_000;
  await post(owner, '/api/finance', {
    action: 'pay',
    requestId: key(),
    bookingId: id,
    method: 'cash',
    expectedAmount: due,
  });
  // A paid bill can no longer be discounted.
  await post(
    owner,
    '/api/billing',
    { action: 'discount', bookingId: id, amount: 1000, reason: 'Muộn rồi' },
    409,
  );

  const todayStr = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const servicesBefore = (
    await (await owner.get(`/api/reports?from=${todayStr}&to=${todayStr}`)).json()
  ).services.find((x: { service: string }) => x.service === '18').revenue as number;
  // Refund part of it; the same request id is not recorded twice and the limit is the amount paid.
  const shiftsBefore = await (await owner.get('/api/finance')).json();
  const refundKey = key();
  const refund = {
    action: 'refund',
    requestId: refundKey,
    bookingId: id,
    method: 'cash',
    amount: 20_000,
    reason: 'Thu nhầm giờ',
  };
  await post(owner, '/api/billing', refund);
  expect((await post(owner, '/api/billing', refund)).replayed).toBe(true);
  await post(owner, '/api/billing', { ...refund, requestId: key(), amount: due }, 409);
  await post(
    owner,
    '/api/billing',
    { ...refund, requestId: key(), method: 'card', amount: 1000 },
    409,
  );
  await post(owner, '/api/billing', { ...refund, requestId: key(), reason: 'ab' }, 400);

  const bill = (await (await owner.get('/api/billing?booking=' + id)).json()).bill;
  expect(bill.paid).toBe(due);
  expect(bill.refunded).toBe(20_000);

  // The shift ledger shows the refund and the summary subtracts it from the expected cash.
  const finance = await (await owner.get('/api/finance')).json();
  expect(
    finance.entries.some(
      (e: { kind: string; amount: number }) => e.kind === 'refund' && e.amount === 20_000,
    ),
  ).toBe(true);
  const before_ = shiftsBefore.shifts.find((s: { id: string }) => s.id === shiftsBefore.selectedId);
  const after = finance.shifts.find((s: { id: string }) => s.id === finance.selectedId);
  expect(after.cash_refund).toBe(before_.cash_refund + 20_000);

  // The dashboard revenue nets the refund out.
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const report = await (await owner.get(`/api/reports?from=${today}&to=${today}`)).json();
  // The by-service table nets refunds out too: refunding 20.000 lowers the '18' revenue by 20.000.
  const services = (await (await owner.get(`/api/reports?from=${today}&to=${today}`)).json())
    .services;
  expect(services.find((x: { service: string }) => x.service === '18').revenue).toBe(
    servicesBefore - 20_000,
  );
  const day = report.days.find((d: { day: string }) => d.day === today);
  expect(day.refunds).toBeGreaterThanOrEqual(20_000);
});

test('trong phiếu: giảm giá, tiền khách đưa và tiền thối, rồi hoàn tiền', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const id = await finishedRound(owner, 'line-10', 'Khách Giao Diện');
  const total = await amountOf(owner, id);
  await page.goto('/quan-ly');
  // A finished session waits for payment on its room card: one click opens the bill.
  await page
    .locator('aside')
    .getByRole('button', { name: /Sơ đồ phòng/ })
    .click();
  const card = page.locator('.room-card', { hasText: 'Khách Giao Diện' });
  await expect(card.getByText('Chờ thanh toán')).toBeVisible();
  await card.click();
  const dialog = page.getByRole('dialog', { name: 'Chi tiết phiên chơi' });
  await expect(dialog).toBeVisible();

  // Discount 10% with a reason.
  await dialog.getByRole('button', { name: 'Giảm giá', exact: true }).click();
  await dialog.getByRole('button', { name: '10%' }).click();
  await dialog.getByLabel('Lý do (bắt buộc)').fill('Khách thân thiết');
  page.once('dialog', (d) => d.accept());
  await dialog.getByRole('button', { name: 'Ghi giảm giá' }).click();
  await expect(dialog.getByText('Khách thân thiết')).toBeVisible();
  const due = await amountOf(owner, id);
  expect(due).toBeLessThan(total);

  // Cash: the customer hands over a round note; the change is shown before confirming.
  await dialog.getByRole('button', { name: 'Tiền mặt', exact: true }).click();
  await dialog
    .getByLabel('Khách đưa (đồng)')
    .fill(String(Math.ceil(due / 100_000) * 100_000 + 100_000));
  await expect(dialog.getByText(/Tiền thối:/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Đã nhận đủ tiền mặt' }).click();
  await expect(dialog.getByRole('button', { name: 'Hoàn tiền', exact: true })).toBeVisible();

  // Refund part of it through the form.
  await dialog.getByRole('button', { name: 'Hoàn tiền', exact: true }).click();
  await dialog.getByLabel('Số tiền hoàn (đồng)').fill('10000');
  await dialog.getByLabel('Lý do (bắt buộc)').fill('Máy lỗi 10 phút');
  page.once('dialog', (d) => d.accept());
  await dialog.getByRole('button', { name: 'Xác nhận hoàn tiền' }).click();
  await expect(dialog.getByText('Máy lỗi 10 phút')).toBeVisible();
});
