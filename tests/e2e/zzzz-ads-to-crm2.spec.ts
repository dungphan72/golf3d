import { test, expect, type APIRequestContext } from '@playwright/test';

// Ad platforms and automation tools (POST /api/leads/ads, with the "Quảng cáo" token) go to the old "Chăm sóc KH" by default;
// the owner can send them to the CRM module (CRM > Cấu hình > "Lead từ quảng cáo"). Tools retry and the same person may
// come from several ads, so repeats must not make extra leads. The setting is put back at the end so no other spec sees a
// different club.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let token = '';
let seq = 0;
const run = Date.now().toString(36);
const phone = () => `0977${String(600000 + ++seq)}`;
const adId = () => `ad-${run}-${++seq}`;
let ipSeq = 0;
// One address per post: a CI runner is one address for the whole suite (the test server trusts x-forwarded-for).
const visitor = () => ({ 'x-forwarded-for': `10.66.2.${++ipSeq}` });

async function send(data: Json, status = 200, withToken = token) {
  const r = await owner.post('/api/leads/ads', {
    data,
    headers: { 'x-lead-token': withToken, ...visitor() },
  });
  expect(r.status(), await r.text()).toBe(status);
  return (await r.json()) as Json;
}
async function target(value: 'LEGACY' | 'CRM2') {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  const r = await owner.post('/api/crm2/config', {
    data: { settings: { ...cfg.settings, adsLeads: value } },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect(((await r.json()) as Json).settings.adsLeads).toBe(value);
}
const newLeads = async () =>
  ((await (await owner.get('/api/crm2/leads?limit=200&q=')).json()) as Json).leads as Json[];
const oldLeads = async () =>
  ((await (await owner.get('/api/crm/leads')).json()) as Json).leads as Json[];
const detail = async (id: string) =>
  (await (await owner.get('/api/crm2/leads?id=' + id)).json()) as Json;
const byPhone = async (p: string) => (await newLeads()).filter((l) => l.phone === p);

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const rotated = await owner.post('/api/crm/channels', {
    data: { action: 'rotate', kind: 'ads' },
  });
  token = ((await rotated.json()) as Json).token;
});
test.afterAll(async () => {
  await target('LEGACY');
  await owner.dispose();
});

test('mặc định lead quảng cáo vẫn vào CRM cũ', async () => {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  expect(cfg.settings.adsLeads).toBe('LEGACY');
  const p = phone();
  const r = await send({ source: 'tiktok', id: adId(), name: 'Khách Cũ', phone: p });
  expect(r.ok).toBe(true);
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(true);
  expect(await byPhone(p)).toHaveLength(0);
});

test('bật CRM mới: lead quảng cáo vào module mới, nguồn Quảng cáo, nền tảng làm chiến dịch', async () => {
  await target('CRM2');
  const p = phone();
  const r = await send({
    source: 'tiktok',
    id: adId(),
    name: 'Hà TikTok',
    phone: p,
    email: 'ha@example.vn',
    need: '18',
    message: 'Muốn chơi 18 hố',
  });
  expect(r).toMatchObject({ ok: true, duplicate: false });
  expect(['assigned', 'queued']).toContain(r.status);
  const [lead] = await byPhone(p);
  expect(lead).toMatchObject({
    id: r.leadId,
    fullName: 'Hà TikTok',
    email: 'ha@example.vn',
    source: 'Quảng cáo',
    targetService: 'Game 18 hố',
    stage: 'NEW',
  });
  expect(lead.notes).toContain('Muốn chơi 18 hố');
  expect(lead.notes).toContain('Chiến dịch: tiktok');
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(false);
});

test('bên gửi đặt chiến dịch riêng thì dùng chiến dịch đó', async () => {
  const p = phone();
  await send({
    source: 'zapier',
    id: adId(),
    name: 'Khách Chiến Dịch',
    phone: p,
    campaign: 'khuyen-mai-11',
  });
  const [lead] = await byPhone(p);
  expect(lead.notes).toContain('Chiến dịch: khuyen-mai-11');
  expect(lead.notes).not.toContain('Chiến dịch: zapier');
});

test('công cụ gửi lại cùng một lead (cùng id, hoặc không có id trong cùng một phút): không tạo thêm', async () => {
  const p = phone();
  const body = { source: 'make', id: adId(), name: 'Khách Gửi Lại', phone: p };
  const first = await send(body);
  const before = await detail(first.leadId);
  const retry = await send(body);
  expect(retry).toMatchObject({ duplicate: true, leadId: first.leadId });
  const after = await detail(first.leadId);
  expect(after.lead.inquiryCount).toBe(before.lead.inquiryCount);
  expect(after.activities).toHaveLength(before.activities.length);
  expect(await byPhone(p)).toHaveLength(1);

  const q = phone();
  const noId = { source: 'make', name: 'Khách Không Id', phone: q };
  const one = await send(noId);
  const two = await send(noId);
  expect(two).toMatchObject({ duplicate: true, leadId: one.leadId });
  expect(await byPhone(q)).toHaveLength(1);
});

test('cùng số đến từ quảng cáo khác: gộp vào lead đã có, ghi là khách gửi lại', async () => {
  const p = phone();
  await send({ source: 'google', id: adId(), name: 'Khách Hai Quảng Cáo', phone: p });
  const [first] = await byPhone(p);
  await send({
    source: 'tiktok',
    id: adId(),
    name: 'Khách Hai Quảng Cáo',
    phone: p,
    message: 'Thấy thêm ở TikTok',
  });
  expect(await byPhone(p)).toHaveLength(1);
  const { lead, activities } = await detail(first.id);
  expect(lead.inquiryCount).toBe(2);
  const again = activities.find(
    (a: Json) => a.type === 'INQUIRY' && String(a.content).startsWith('Khách gửi lại'),
  );
  expect(again).toBeTruthy();
  expect(again.actor).toBe('Quảng cáo'); // the sender is the channel, not "Website"
});

test('mã webhook sai bị từ chối; dữ liệu thừa trường lạ bị từ chối', async () => {
  await send({ source: 'tiktok', name: 'X', phone: phone() }, 401, 'lk_khong-dung-0000000000');
  await send({ source: 'tiktok', name: 'X', phone: phone(), truong_la: 1 }, 400);
});

test('tắt lại: lead quảng cáo trở về CRM cũ', async () => {
  await target('LEGACY');
  const p = phone();
  await send({ source: 'tiktok', id: adId(), name: 'Khách Lại Cũ', phone: p });
  expect((await oldLeads()).some((l) => l.phone === p)).toBe(true);
  expect(await byPhone(p)).toHaveLength(0);
});
