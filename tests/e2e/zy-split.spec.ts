import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after z-bank.spec.ts and reuses the open shift and configured club.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const ALL_ROOMS = Array.from({ length: 12 }, (_, i) => (i < 10 ? `line-${i + 1}` : `vip-${i - 9}`));

async function finishedRound(request: APIRequestContext, room: string, customer: string) {
  const club = await (await request.get('/api/club')).json();
  const config = club.config;
  const start = Math.ceil(Date.now() / 900_000) * 900_000;
  const myEnd = start + 180 * 60_000;
  const busyRooms = new Set(
    (club.bookings || [])
      .filter(
        (b: { status: string; start?: number; end?: number; room: string }) =>
          ['playing', 'paused'].includes(b.status) ||
          (['finished', 'paid'].includes(b.status) && (b.end ?? 0) > Date.now()) ||
          (b.status !== 'cancelled' && (b.start ?? 0) < myEnd && (b.end ?? 0) > start),
      )
      .map((b: { room: string }) => b.room),
  );
  const targetRoom = ALL_ROOMS.find((r) => !busyRooms.has(r)) || room;
  const booked = await post(request, '/api/club', {
    action: 'book',
    room: targetRoom,
    service: '9',
    start,
    people: 1,
    minutes: 0,
    customer,
    phone: '0966555444',
    expectedRevision: config.pricingRevision,
  });
  await post(request, '/api/club', { action: 'start', id: booked.id });
  await post(request, '/api/club', { action: 'finish', id: booked.id });
  const updatedClub = await (await request.get('/api/club')).json();
  const b = updatedClub.bookings.find((x: { id: string }) => x.id === booked.id);
  return { id: booked.id as string, amount: b.amount as number };
}

test('thanh toán chia nhiều hình thức: đủ tiền mới ghi, không ghi trùng', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const { id, amount } = await finishedRound(owner, 'line-5', 'Khách chia tiền');
  expect(amount).toBeGreaterThan(1000);
  const cash = Math.floor(amount / 3);
  const requestId = key();
  const body = (parts: unknown) => ({
    action: 'pay-split',
    bookingId: id,
    requestId,
    expectedAmount: amount,
    parts,
  });

  // Wrong total, one method used twice and a single part are all rejected before anything is saved.
  await post(
    owner,
    '/api/finance',
    body([
      { method: 'cash', amount: cash },
      { method: 'card', amount: amount - cash - 1 },
    ]),
    400,
  );
  await post(
    owner,
    '/api/finance',
    body([
      { method: 'cash', amount: cash },
      { method: 'cash', amount: amount - cash },
    ]),
    400,
  );
  await post(owner, '/api/finance', body([{ method: 'cash', amount }]), 400);

  const parts = [
    { method: 'cash', amount: cash },
    { method: 'card', amount: amount - cash },
  ];
  await post(owner, '/api/finance', body(parts));
  const replay = await post(owner, '/api/finance', body(parts));
  expect(replay.replayed).toBe(true);
  // Same request id with other numbers is refused instead of silently accepted.
  await post(
    owner,
    '/api/finance',
    body([
      { method: 'cash', amount: cash + 1 },
      { method: 'card', amount: amount - cash - 1 },
    ]),
    409,
  );

  const club = await (await owner.get('/api/club')).json();
  const paid = club.bookings.find((b: { id: string }) => b.id === id);
  expect([paid.status, paid.payment]).toEqual(['paid', 'mixed']);

  // The shift ledger shows each method separately.
  const finance = await (await owner.get('/api/finance')).json();
  const mine = finance.entries.filter((e: { booking_id: string }) => e.booking_id === id);
  expect(mine.map((e: { method: string; amount: number }) => [e.method, e.amount]).sort()).toEqual(
    [
      ['card', amount - cash],
      ['cash', cash],
    ].sort(),
  );

  // The payment dialog offers the split form for an unpaid bill.
  await finishedRound(owner, 'line-6', 'Khách chia UI');
  await page.goto('/quan-ly');
  await page
    .locator('.ds-menubar')
    .getByRole('button', { name: /Lịch đặt/ })
    .click();
  await page.getByText('Khách chia UI').first().click();
  await page.getByRole('button', { name: 'Chia nhiều hình thức thanh toán' }).click();
  await expect(page.getByText('Chia thanh toán')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền' })).toBeDisabled();
});
