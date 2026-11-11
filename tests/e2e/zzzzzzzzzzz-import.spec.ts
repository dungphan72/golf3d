import { test, expect, type APIRequestContext } from '@playwright/test';

// Spreadsheet import: preview first, import with a campaign column, undo only what nobody has worked on.
test.describe.configure({ mode: 'serial' });
const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let owner: APIRequestContext;
const P = { fresh1: '0955311001', fresh2: '0955311002', existing: '0955311003', blocked: '0955311004' };

const leads = (api: Json) => owner.post('/api/crm2/leads', { data: api, headers: { origin } });
const search = async (q: string) => (((await (await owner.get('/api/crm2/leads?limit=50&q=' + q)).json()) as Json).leads ?? []) as Json[];
let batch = '';

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  expect((await leads({ action: 'create', fullName: 'Khách Có Sẵn', phone: P.existing })).status()).toBe(200);
  expect((await owner.post('/api/crm2/blocked', { data: { action: 'add', phone: P.blocked, reason: 'test' }, headers: { origin } })).status()).toBe(200);
});
test.afterAll(async () => {
  await owner.post('/api/crm2/blocked', { data: { action: 'remove', phone: P.blocked }, headers: { origin } });
  await owner.dispose();
});

const rows = [
  { fullName: 'Nhập A', phone: P.fresh1, campaign: 'khai-truong', source: 'Facebook' },
  { fullName: 'Nhập B', phone: P.fresh2, campaign: 'khai-truong' },
  { fullName: 'Có sẵn', phone: P.existing },
  { fullName: 'Bị chặn', phone: P.blocked },
  { fullName: 'Sai số', phone: '12' },
  { fullName: 'Lặp A', phone: P.fresh1 },
];

test('xem trước không tạo gì; phân loại đúng', async () => {
  const r = await leads({ action: 'import-preview', leads: rows });
  expect(r.status()).toBe(200);
  const v = (await r.json()) as Json;
  expect(v.counts).toEqual({ new: 2, existing: 1, repeat: 1, blocked: 1, invalid: 1 });
  expect((await search(P.fresh1)).length).toBe(0);
});

test('nhập: lưu chiến dịch, trả mã lô; hoàn tác xóa lead chưa ai xử lý, giữ lead đã xử lý', async () => {
  const r = (await (await leads({ action: 'import', leads: rows })).json()) as Json;
  expect(r.created).toBe(2);
  batch = r.batch;
  expect(batch).toBeTruthy();
  const a = (await search(P.fresh1))[0];
  expect(a.campaign).toBe('khai-truong');
  expect(a.source).toBe('Facebook');

  // staff work on lead B: it must survive the undo
  const b = (await search(P.fresh2))[0];
  expect((await leads({ action: 'result', id: b.id, result: 'INTERESTED', note: 'đã gọi' })).status()).toBe(200);

  const list = (await (await owner.get('/api/crm2/leads?view=imports')).json()) as Json;
  expect(list.batches.find((x: Json) => x.batch === batch)?.count).toBe(2);

  const u = await leads({ action: 'import-undo', batch });
  expect(u.status()).toBe(200);
  expect(await u.json()).toMatchObject({ removed: 1, kept: 1 });
  expect((await search(P.fresh1)).length).toBe(0);
  expect((await search(P.fresh2)).length).toBe(1);
  expect((await leads({ action: 'import-undo', batch })).status()).toBe(409);
  expect((await leads({ action: 'import-undo', batch: 'khongco' })).status()).toBe(404);
});

test('chưa đăng nhập bị chặn', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/leads?view=imports')).status()).toBe(401);
  await anon.dispose();
});
