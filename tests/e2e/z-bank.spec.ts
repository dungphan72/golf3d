import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (alphabetical order) and reuses the cabinet it configured.
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
  customer: string,
  phone: string,
  people: number,
) {
  const { config } = await (await request.get('/api/club')).json();
  const start = Math.ceil((Date.now() + 60_000) / 900_000) * 900_000;
  const booked = await post(request, '/api/club', {
    action: 'book',
    room,
    service: '9',
    start,
    people,
    minutes: 0,
    customer,
    phone,
    expectedRevision: config.pricingRevision,
  });
  await post(request, '/api/club', { action: 'start', id: booked.id });
  await post(request, '/api/club', { action: 'finish', id: booked.id });
  return booked.id as string;
}

test('chuyển khoản SePay: webhook ghi nhận, nhân viên xác nhận, không dùng hai lần', async ({
  page,
}) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const apiKey = 'e2e-sepay-key-0123456789';
  await post(owner, '/api/bank', { action: 'set-key', key: apiKey });
  const { config } = await (await owner.get('/api/club')).json();
  await post(owner, '/api/club', {
    action: 'settings',
    value: { ...config, bankBin: '970436', bankAccount: '0123456789', bankHolder: 'SAIGON GOLF' },
  });

  const bookingId = await finishedRound(owner, 'line-3', 'Khách CK', '0988777666', 2);
  const overview = await (await owner.get(`/api/bank?booking=${bookingId}`)).json();
  expect(overview.configured).toBe(true);
  expect(overview.code).toMatch(/^SGG[A-Z0-9]{8}$/);
  const due = overview.due as number;
  expect(due).toBeGreaterThan(0);

  const webhook = (headers: Record<string, string>, data: unknown) =>
    page.request.post('/api/webhooks/sepay', { headers, data });
  const hook = {
    id: 777001,
    gateway: 'Vietcombank',
    transactionDate: '2026-11-05 10:15:30',
    accountNumber: '0123456789',
    code: null,
    transferType: 'in',
    transferAmount: due,
    content: `NGUYEN VAN A ${overview.code} FT26312`,
    accumulated: 0,
    referenceCode: 'FT26312',
  };
  expect((await webhook({ Authorization: 'Apikey wrong-key-0123456789' }, hook)).status()).toBe(
    401,
  );
  expect((await webhook({}, hook)).status()).toBe(401);
  const auth = { Authorization: `Apikey ${apiKey}` };
  expect((await webhook(auth, { ...hook, id: 777002, transferType: 'out' })).status()).toBe(200);
  expect((await webhook(auth, hook)).status()).toBe(200);
  expect((await webhook(auth, hook)).status()).toBe(200); // SePay retry: no duplicate

  const after = await (await owner.get(`/api/bank?booking=${bookingId}`)).json();
  expect(after.transactions).toHaveLength(1);
  expect(after.transactions[0].amount).toBe(due);
  const txId = after.transactions[0].id as string;

  // Wrong method or an unknown transaction cannot consume the transfer.
  const pay = (method: string, bankTxId: string) => ({
    action: 'pay',
    requestId: key(),
    bookingId,
    method,
    expectedAmount: due,
    bankTxId,
  });
  await post(owner, '/api/finance', pay('cash', txId), 400);
  await post(owner, '/api/finance', pay('transfer', 'does-not-exist'), 409);
  await post(owner, '/api/finance', pay('transfer', txId));
  const club = await (await owner.get('/api/club')).json();
  const paid = club.bookings.find((b: { id: string }) => b.id === bookingId);
  expect([paid.status, paid.payment]).toEqual(['paid', 'transfer']);
  const used = await (await owner.get('/api/bank')).json();
  expect(used.transactions.find((t: { id: string }) => t.id === txId).status).toBe('used');
  expect(
    (await (await owner.get(`/api/bank?booking=${bookingId}`)).json()).transactions,
  ).toHaveLength(0);

  // The QR block shows up in the payment dialog for an unpaid bill.
  await finishedRound(owner, 'line-4', 'Khách QR', '0977666555', 1);
  await page.goto('/quan-ly');
  await page
    .locator('aside')
    .getByRole('button', { name: /Lịch đặt/ })
    .click();
  await page.getByText('Khách QR').first().click();
  await expect(page.getByRole('img', { name: 'Mã QR chuyển khoản' })).toBeVisible();
  await expect(page.getByText(/Chuyển khoản .* nội dung: SGG/)).toBeVisible();
});
