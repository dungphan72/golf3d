import { createHmac } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';

// Facebook / Instagram Lead Ads (POST /api/leads/facebook, signed by Facebook) go to the old "Chăm sóc KH" by default; the
// owner can send them to the CRM module (CRM > Cấu hình > "Lead Facebook / Instagram"). Facebook repeats a webhook it
// thinks failed and one customer may fill in several forms, so repeats must not make extra leads. The setting is put back
// at the end so no other spec sees a different club.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let seq = 0;
const run = Date.now().toString(36);
const phone = () => `0966${String(500000 + ++seq)}`;
let ipSeq = 0;
// One address per post: a CI runner is one address for the whole suite (the test server trusts x-forwarded-for).
const visitor = () => ({ 'x-forwarded-for': `10.77.1.${++ipSeq}` });

function form(id: string, fields: Json[], extra: Json = {}) {
  return {
    entry: [
      {
        changes: [{ field: 'leadgen', value: { leadgen_id: id, field_data: fields, ...extra } }],
      },
    ],
  };
}
async function facebook(body: Json, signature?: string) {
  const raw = JSON.stringify(body);
  const sig =
    signature ?? 'sha256=' + createHmac('sha256', 'e2e-fb-secret').update(raw).digest('hex');
  return owner.post('/api/leads/facebook', {
    data: raw,
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig, ...visitor() },
  });
}
const fields = (name: string, p: string, need = '') => [
  { name: 'full_name', values: [name] },
  { name: 'phone_number', values: [p] },
  ...(need ? [{ name: 'nhu_cau', values: [need] }] : []),
];
async function target(value: 'LEGACY' | 'CRM2') {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  const r = await owner.post('/api/crm2/config', {
    data: { settings: { ...cfg.settings, facebookLeads: value } },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect(((await r.json()) as Json).settings.facebookLeads).toBe(value);
}
const newLeads = async () =>
  ((await (await owner.get('/api/crm2/leads?limit=200&q=')).json()) as Json).leads as Json[];
const detail = async (id: string) =>
  (await (await owner.get('/api/crm2/leads?id=' + id)).json()) as Json;
const byPhone = async (p: string) => (await newLeads()).filter((l) => l.phone === p);
const fbId = () => `fb-${run}-${++seq}`;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8787' });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
});
test.afterAll(async () => {
  await target('CRM2');
  await owner.dispose();
});

test('mặc định lead Facebook vào CRM mới', async () => {
  const cfg = (await (await owner.get('/api/crm2/config')).json()) as Json;
  expect(cfg.settings.facebookLeads).toBe('CRM2');
  const p = phone();
  const id = fbId();
  const r = await facebook(
    form(
      id,
      [
        ...fields('Lan Facebook', p, 'Chơi 9 hố cuối tuần'),
        { name: 'email', values: ['lan@example.vn'] },
      ],
      { ad_id: 'ad-fb-1', form_id: 'form-99' },
    ),
  );
  expect(((await r.json()) as Json).processed).toBe(1);
  const rows = await byPhone(p);
  expect(rows).toHaveLength(1);
  const { lead, activities } = await detail(rows[0].id);
  expect(lead).toMatchObject({
    fullName: 'Lan Facebook',
    phone: p,
    email: 'lan@example.vn',
    source: 'Facebook',
    targetService: 'Game 9 hố',
    stage: 'NEW',
  });
  expect(lead.notes).toContain('Chơi 9 hố cuối tuần');
  expect(lead.notes).toContain('Chiến dịch: ad-fb-1');
  expect(lead.notes).toContain(`Facebook lead: ${id}`);
  expect(activities.length).toBeGreaterThan(0);
});

test('Facebook gửi lại đúng biểu mẫu: không tạo thêm gì', async () => {
  const p = phone();
  const body = form(fbId(), fields('Khách Gửi Lại', p));
  await facebook(body);
  const [first] = await byPhone(p);
  const before = await detail(first.id);
  const retry = await facebook(body);
  expect(retry.status()).toBe(200);
  const after = await detail(first.id);
  expect(after.lead.inquiryCount).toBe(before.lead.inquiryCount);
  expect(after.activities).toHaveLength(before.activities.length);
  expect(await byPhone(p)).toHaveLength(1);
});

test('cùng số điền thêm một biểu mẫu khác: gộp vào lead đã có, ghi là khách gửi lại', async () => {
  const p = phone();
  await facebook(form(fbId(), fields('Khách Hai Form', p)));
  const [first] = await byPhone(p);
  await facebook(form(fbId(), fields('Khách Hai Form', p, 'Hỏi thêm về nhóm công ty')));
  expect(await byPhone(p)).toHaveLength(1);
  const { lead, activities } = await detail(first.id);
  expect(lead.inquiryCount).toBe(2);
  const again = activities.find(
    (a: Json) => a.type === 'INQUIRY' && String(a.content).startsWith('Khách gửi lại'),
  );
  expect(again).toBeTruthy();
  expect(again.actor).toBe('Facebook'); // the sender is the channel, not "Website"
});

test('chưa lấy được chi tiết biểu mẫu: lead vẫn đến, nhân viên xem ở Facebook', async () => {
  const id = fbId();
  const r = await facebook({
    entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: id } }] }],
  });
  expect(((await r.json()) as Json).processed).toBe(1);
  const mine = (await newLeads()).filter((l) => String(l.notes).includes(`Facebook lead: ${id}`));
  expect(mine).toHaveLength(1);
  expect(mine[0].notes).toContain('chưa lấy được chi tiết');
  expect(mine[0].fullName).toBeTruthy();
});

test('chữ ký sai bị từ chối; thay đổi không phải leadgen bị bỏ qua', async () => {
  const bad = await facebook(form(fbId(), fields('X', phone())), 'sha256=bad');
  expect(bad.status()).toBe(401);
  const other = await facebook({ entry: [{ changes: [{ field: 'feed', value: { x: 1 } }] }] });
  expect(((await other.json()) as Json).processed).toBe(0);
});

