import { test, expect, type APIRequestContext } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

// Runs last: its sessions sit in the future and would make other specs' free-line checks see them as cleaning.
// A fixed clock inside opening hours, so the test does not depend on the time of day: 12:00 (Vietnam)
// the day after tomorrow.
const NOON = (() => {
  const d = new Date(Date.now() + 7 * 3_600_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 2, 5, 0, 0);
})();
const at = (t: number) => ({ 'x-e2e-now': String(t) });

async function club(
  request: APIRequestContext,
  data: Record<string, unknown>,
  now: number,
  status = 200,
) {
  const response = await request.post('/api/club', { data, headers: at(now) });
  expect(response.status(), await response.text()).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('khách vãng lai vào chơi ngay: tính tiền từ lúc bấm, không cần số điện thoại', async ({
  page,
}) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);

  // No booking, no name, no phone: the session is already playing and its start is the clock now.
  const walk = await club(
    owner,
    { action: 'walkin', room: 'line-8', service: 'gdr', people: 2 },
    NOON,
  );
  const snapshot = await (await owner.get('/api/club')).json();
  const row = snapshot.bookings.find((b: { id: string }) => b.id === walk.id);
  expect(row).toMatchObject({ status: 'playing', customer: 'Khách vãng lai', start: NOON });

  // The line is taken now, so a second walk-in on it is refused.
  const again = await club(
    owner,
    { action: 'walkin', room: 'line-8', service: 'gdr', people: 1 },
    NOON + 60_000,
    409,
  );
  expect(again.error).toMatch(/Line này đang có khách/);

  // The session finishes like any other and is billed for the time played.
  await club(owner, { action: 'finish', id: walk.id }, NOON + 70 * 60_000);
  const after = await (await owner.get('/api/club')).json();
  const done = after.bookings.find((b: { id: string }) => b.id === walk.id);
  expect(done.status).toBe('finished');
  expect(done.amount).toBeGreaterThan(0);

  // A line booked 90 minutes from now: a short walk-in fits before it, a long one does not.
  const config = (await (await owner.get('/api/club')).json()).config;
  await club(
    owner,
    {
      action: 'book',
      room: 'vip-2',
      service: 'gdr',
      start: NOON + 90 * 60_000,
      people: 1,
      minutes: 60,
      customer: 'Khách Đã Đặt',
      phone: '0911222333',
      expectedRevision: config.pricingRevision,
    },
    NOON,
  );
  await club(
    owner,
    { action: 'walkin', room: 'vip-2', service: 'gdr', people: 1, minutes: 120, customer: 'Dài' },
    NOON,
    409,
  );
  const short = await club(
    owner,
    { action: 'walkin', room: 'vip-2', service: 'gdr', people: 1, minutes: 60, customer: 'Ngắn' },
    NOON,
  );
  // Leave no session playing: other specs pick lines that look free.
  await club(owner, { action: 'finish', id: short.id }, NOON + 30 * 60_000);
});
