import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (package catalogue, open shift, club settings with online prices).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const key = () => crypto.randomUUID().replaceAll('-', '') + 'xy';

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function finishedRound(request: APIRequestContext, room: string, phone: string) {
  const { config } = await (await request.get('/api/club')).json();
  const start = Math.ceil(Date.now() / 900_000) * 900_000;
  const booked = await post(request, '/api/club', {
    action: 'book',
    room,
    service: '18',
    start,
    people: 1,
    minutes: 0,
    customer: 'Khách Gói Phòng',
    phone,
    expectedRevision: config.pricingRevision,
  });
  await post(request, '/api/club', { action: 'start', id: booked.id });
  await post(request, '/api/club', { action: 'finish', id: booked.id });
  return booked.id as string;
}

test('gói tiêu chuẩn không trả được phòng VIP, trả được line tiêu chuẩn', async ({ page }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  // The official catalogue has no 18-hole combo any more: create one limited to standard lines.
  await post(owner, '/api/members', {
    action: 'type-save',
    requestId: key(),
    name: 'Combo 18 hố thử phòng',
    price: 4_000_000,
    grants: [{ kind: 'holes18', qty: 10 }],
    validDays: 90,
    perks: '',
    section: '',
    room: 'standard',
    active: true,
  });
  const list = await (await owner.get('/api/members')).json();
  const combo = list.types.find((t: { name: string }) => t.name === 'Combo 18 hố thử phòng');
  const phone = '0911222333';
  const customer = await post(owner, '/api/members', {
    action: 'customer-create',
    name: 'Khách Gói Phòng',
    phone,
    note: '',
  });
  await post(owner, '/api/members', {
    action: 'sell',
    requestId: key(),
    customerId: customer.id,
    typeId: combo.id,
    method: 'cash',
  });
  const pkgs = await (await owner.get(`/api/members?customer=${customer.id}`)).json();
  const packageId = pkgs.detail.packages[0].id as string;

  const vipBooking = await finishedRound(owner, 'vip-1', phone);
  const denied = await owner.post('/api/members', {
    data: { action: 'redeem', bookingId: vipBooking, packageId },
  });
  expect(denied.status()).toBe(409);
  expect((await denied.json()).error).toContain('không dùng được cho phòng VIP');

  const standardBooking = await finishedRound(owner, 'line-7', phone);
  const usable = await (await owner.get(`/api/members?usableFor=${standardBooking}`)).json();
  expect(usable.packages.map((p: { id: string }) => p.id)).toContain(packageId);
  const used = await post(owner, '/api/members', {
    action: 'redeem',
    bookingId: standardBooking,
    packageId,
  });
  expect(used.units).toBe(1);
});
