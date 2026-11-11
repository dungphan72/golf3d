import { createHash } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';

// Messages to the Zalo Official Account (POST /api/leads/zalo, signed by Zalo) go to the old "Chăm sóc KH" by default; the
// owner can send them to the CRM module (CRM > Cấu hình > "Tin nhắn Zalo OA"). Zalo retries events that looked failed and
// most Zalo customers give no phone number, so repeats and follow-up messages must not create more leads. The setting is
// put back at the end so no other spec sees a different club.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let seq = 0;
const run = Date.now().toString(36);
const user = () => `zl-${run}-${++seq}`;
let ipSeq = 0;
// One address per post: a CI runner is one address for the whole suite (the test server trusts x-forwarded-for).
const visitor = () => ({ 'x-forwarded-for': `10.99.0.${++ipSeq}` });

async function zalo(event: Json, signature?: string) {
  const timestamp = String(Date.now());
  const raw = JSON.stringify({ timestamp, ...event });
  const mac =
    signature ??
    'mac=' +
      createHash('sha256')
        .update('e2e-zalo-app' + raw + timestamp + 'e2e-zalo-secret')
        .digest('hex');
  return owner.post('/api/leads/zalo', {
    data: raw,
    headers: { 'content-type': 'application/json', 'x-zevent-signature': mac, ...visitor() },
  });
}
const text = (sender: string, message: string, msgId: string) => ({
  event_name: 'user_send_text',
  sender: { id: sender },
  message: { text: message, msg_id: msgId },
});
async function target(value: 'LEGACY' | 'CRM2') {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  const r = await owner.post('/api/crm2/config', {
    data: { settings: { ...cfg.settings, zaloLeads: value } },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect(((await r.json()) as Json).settings.zaloLeads).toBe(value);
}
const newLeads = async () =>
  ((await (await owner.get('/api/crm2/leads?limit=200&q=')).json()) as Json).leads as Json[];
const ofUser = async (u: string) =>
  (await newLeads()).filter((l) => String(l.notes).includes(`Zalo ID: ${u}`));
const detail = async (id: string) =>
  (await (await owner.get('/api/crm2/leads?id=' + id)).json()) as Json;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
});
test.afterAll(async () => {
  await target('CRM2');
  await owner.dispose();
});

test('mặc định tin Zalo vào CRM mới', async () => {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  expect(cfg.settings.zaloLeads).toBe('CRM2');
  const u = user();
  const r = await zalo(text(u, 'Em muốn tập swing cuối tuần', `m-${u}-1`));
  expect(r.status()).toBe(200);
  const body = (await r.json()) as Json;
  expect(body).toMatchObject({ ok: true, duplicate: false });
  expect(['assigned', 'queued']).toContain(body.status);
  const { lead, activities } = await detail(body.leadId);
  expect(lead).toMatchObject({
    fullName: `Khách Zalo ${u.slice(-4)}`,
    phone: '',
    source: 'Zalo OA',
    targetService: 'Luyện swing',
    stage: 'NEW',
  });
  expect(lead.notes).toContain('Em muốn tập swing cuối tuần');
  expect(lead.notes).toContain(`Zalo ID: ${u}`);
  expect(activities.length).toBeGreaterThan(0);
});

test('Zalo gửi lại đúng sự kiện: không tạo thêm gì', async () => {
  const u = user();
  const event = text(u, 'Cho em hỏi giá 18 hố', `m-${u}-1`);
  const first = (await (await zalo(event)).json()) as Json;
  const before = await detail(first.leadId);
  const retry = (await (await zalo(event)).json()) as Json;
  expect(retry).toMatchObject({ ok: true, duplicate: true, leadId: first.leadId });
  const after = await detail(first.leadId);
  expect(after.lead.inquiryCount).toBe(before.lead.inquiryCount);
  expect(after.activities).toHaveLength(before.activities.length);
  expect(await ofUser(u)).toHaveLength(1);
});

test('tin nhắn tiếp theo của cùng khách gộp vào một lead, kể cả khi chưa có số', async () => {
  const u = user();
  const first = (await (await zalo(text(u, 'Chào shop', `m-${u}-1`))).json()) as Json;
  const second = (await (await zalo(text(u, 'Em hỏi giờ mở cửa', `m-${u}-2`))).json()) as Json;
  expect(second).toMatchObject({ duplicate: true, leadId: first.leadId });
  const { lead, activities } = await detail(first.leadId);
  expect(lead.inquiryCount).toBe(2);
  expect(
    activities.some(
      (a: Json) => a.type === 'INQUIRY' && String(a.content).includes('Em hỏi giờ mở cửa'),
    ),
  ).toBe(true);
  expect(await ofUser(u)).toHaveLength(1);
});

test('khách để lại số điện thoại ở tin sau thì lead có số', async () => {
  const u = user();
  const p = `0955${String(400000 + seq)}`;
  const first = (await (await zalo(text(u, 'Em cần tư vấn', `m-${u}-1`))).json()) as Json;
  expect((await detail(first.leadId)).lead.phone).toBe('');
  const second = (await (await zalo(text(u, `Gọi em số ${p} nhé`, `m-${u}-2`))).json()) as Json;
  expect(second.leadId).toBe(first.leadId);
  const { lead } = await detail(first.leadId);
  expect(lead.phone).toBe(p);
  expect(lead.phoneNorm).toBe(p);
});

test('hai khách Zalo khác nhau là hai lead', async () => {
  const a = user();
  const b = user();
  const one = (await (await zalo(text(a, 'Chào', `m-${a}-1`))).json()) as Json;
  const two = (await (await zalo(text(b, 'Chào', `m-${b}-1`))).json()) as Json;
  expect(one.leadId).not.toBe(two.leadId);
});

test('chữ ký sai bị từ chối; sự kiện không phải tin nhắn chữ bị bỏ qua', async () => {
  const bad = await zalo(text(user(), 'x', 'm-bad'), 'mac=0000');
  expect(bad.status()).toBe(401);
  const ignored = await zalo({ event_name: 'follow', sender: { id: user() } });
  expect(ignored.status()).toBe(200);
  expect(((await ignored.json()) as Json).ignored).toBe(true);
});

