import { test, expect, type APIRequestContext } from '@playwright/test';

// Runs after flow.spec.ts (online booking enabled with the slug "e2e-golf" and prices).
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };

async function post(request: APIRequestContext, url: string, data: unknown, status = 200) {
  const response = await request.post(url, { data });
  expect(response.status(), `${url} -> ${await response.text()}`).toBe(status);
  return (await response.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test('nhóm 9 người: tính tiền theo 3 line và xác nhận đặt đủ 3 phòng', async ({
  page,
  browser,
}) => {
  const day = new Date(Date.now() + 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  const start = Date.parse(`${day}T09:00:00+07:00`);
  const guest = await browser.newContext();
  const ask = (guests: number, phone: string) =>
    post(guest.request, '/api/public/booking', {
      slug: 'e2e-golf',
      name: 'Đoàn Giải ' + guests,
      phone,
      service: '18',
      vip: false,
      guests,
      start,
      minutes: 0,
      note: '',
      website: '',
    });
  const one = await ask(3, '0933111001');
  const nine = await ask(9, '0933111002');
  // 9 guests = 3 lines of 3, so the quote is three times the price of one line of 3.
  expect(nine.total).toBe(one.total * 3);

  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const list = (await (await owner.get('/api/online')).json()).requests as {
    id: string;
    name: string;
    quote: { lines?: number };
    freeRooms: { id: string }[];
  }[];
  const request = list.find((r) => r.name === 'Đoàn Giải 9')!;
  expect(request.quote.lines).toBe(3);
  const rooms = request.freeRooms.map((f) => f.id);

  // The wrong number of rooms, or the same room twice, is refused and nothing is booked.
  await post(owner, '/api/online', { action: 'confirm', id: request.id, room: rooms[0] }, 400);
  await post(
    owner,
    '/api/online',
    { action: 'confirm', id: request.id, room: rooms[0], extraRooms: [rooms[0], rooms[1]] },
    400,
  );
  const before = (await (await owner.get('/api/club')).json()).bookings.length;

  const done = await post(owner, '/api/online', {
    action: 'confirm',
    id: request.id,
    room: rooms[0],
    extraRooms: [rooms[1], rooms[2]],
  });
  expect(done.bookingIds).toHaveLength(3);
  const after = (await (await owner.get('/api/club')).json()).bookings as {
    id: string;
    people: number;
    room: string;
  }[];
  expect(after.length).toBe(before + 3);
  const mine = after.filter((b) => done.bookingIds.includes(b.id));
  expect(mine.map((b) => b.people)).toEqual([3, 3, 3]);
  expect(new Set(mine.map((b) => b.room)).size).toBe(3);
});
