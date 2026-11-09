import { test, expect, type APIRequestContext } from '@playwright/test';

// Marketing: campaigns, daily ad spend, seeding numbers and the cost/return report.
test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'owner@e2e.test', password: 'e2e-owner-password' };
const origin = 'http://127.0.0.1:8787';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let owner: APIRequestContext;
let token = '';
let ipSeq = 100;
let seq = 0;
// Last three digits start with 8 so other specs that match a pool lead by its last digits never pick these up.
const phone = () => `0955${String(1000 + ++seq)}8${String(seq).padStart(2, '0')}`;
const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const post = (data: Json) => owner.post('/api/crm2/marketing', { data, headers: { origin } });
const report = async (q = 'days=30') => (await (await owner.get('/api/crm2/marketing?' + q)).json()) as Json;
const rowOf = (r: Json, group: string, label: string) =>
  (r[group] as Json[]).find((x) => x.label === label);

async function website(p: string, campaign: string) {
  const r = await owner.post('/api/leads/website', {
    data: { name: 'Khách Marketing', phone: p, need: '9', message: 'Tư vấn', campaign, consent: true },
    headers: { 'x-lead-token': token, 'x-forwarded-for': `10.77.0.${++ipSeq}` },
  });
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json()) as Json;
}

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({ baseURL: origin });
  expect((await owner.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  const rotated = await owner.post('/api/crm/channels', { data: { action: 'rotate', kind: 'website' } });
  token = ((await rotated.json()) as Json).token;
});
test.afterAll(async () => owner.dispose());

test('chỉ quản lý dùng được; chưa đăng nhập bị chặn', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get('/api/crm2/marketing')).status()).toBe(401);
  expect(
    (await anon.post('/api/crm2/marketing', { data: { action: 'seeding-add', phone: '0911000000' }, headers: { origin } })).status(),
  ).toBe(401);
  await anon.dispose();
  const sale = await playwright.request.newContext({ baseURL: origin });
  const created = await owner.post('/api/crm2/config', {
    data: { action: 'create_sale', name: 'Sale Marketing', email: 'sale.mkt@e2e.test', role: 'sale', password: 'Mkt!x7Qp2Lm9' },
    headers: { origin },
  });
  expect([200, 409]).toContain(created.status());
  expect((await sale.post('/api/auth/login', { data: { email: 'sale.mkt@e2e.test', password: 'Mkt!x7Qp2Lm9' } })).status()).toBe(200);
  expect((await sale.get('/api/crm2/marketing')).status()).toBe(403);
  expect((await sale.post('/api/crm2/marketing', { data: { action: 'seeding-add', phone: '0911000000' }, headers: { origin } })).status()).toBe(403);
  await sale.dispose();
});

test('chiến dịch: thêm, trùng tên, dữ liệu sai bị từ chối', async () => {
  const ok = await post({ action: 'campaign', name: 'Khai trương T11', source: 'Website', runner: 'An', budget: 5_000_000 });
  expect(ok.status(), await ok.text()).toBe(200);
  expect((await post({ action: 'campaign', name: 'khai trương t11' })).status()).toBe(409);
  expect((await post({ action: 'campaign', name: 'x' })).status()).toBe(400);
  expect((await post({ action: 'campaign', name: 'Sai ngày', startsOn: '2027-02-10', endsOn: '2027-02-01' })).status()).toBe(400);
  expect((await post({ action: 'campaign', name: 'Lạ', extra: 1 })).status()).toBe(400);
});

test('chi phí ghi đè theo ngày; CPL và ROAS tính từ lead thật; trùng số và seeding không lệch KPI', async () => {
  const camps = ((await report()).campaigns as Json[]);
  const c = camps.find((x) => x.name === 'Khai trương T11')!;
  expect((await post({ action: 'spend', campaignId: c.id, day: '2999-01-01', amount: 1 })).status()).toBe(400);
  expect((await post({ action: 'spend', campaignId: 'khong-co', day: today(), amount: 1 })).status()).toBe(404);
  expect((await post({ action: 'spend', campaignId: c.id, day: today(), amount: 111 })).status()).toBe(200);
  expect((await post({ action: 'spend', campaignId: c.id, day: today(), amount: 400_000, clicks: 40, impressions: 900 })).status()).toBe(200); // same day: overwrite

  const [a, b, d] = [phone(), phone(), phone()];
  await website(a, 'khai trương t11'); // matches the campaign case-insensitively
  await website(b, 'Khai trương T11');
  const again = await website(b, 'Khai trương T11'); // same number: one lead, one more inquiry
  expect(again.duplicate).toBe(true);
  // A seeding number: the lead exists but never counts.
  expect((await post({ action: 'seeding-add', phone: d, note: 'số thử' })).status()).toBe(200);
  await website(d, 'Khai trương T11');

  const r = await report();
  const row = rowOf(r, 'byCampaign', 'Khai trương T11')!;
  expect(row.leads).toBe(2);
  expect(row.seeding).toBe(1);
  expect(row.duplicates).toBe(1);
  expect(row.spend).toBe(400_000);
  expect(row.clicks).toBe(40);
  expect(row.cpl).toBe(200_000);
  expect(row.roas).toBe(0); // spend but nothing paid yet
  expect(rowOf(r, 'byRunner', 'An')!.leads).toBe(2);
  expect(rowOf(r, 'bySource', 'Website')!.spend).toBe(400_000);
  expect(r.total.leads).toBeGreaterThanOrEqual(2);

  // Removing the number from seeding brings its lead back into the KPIs.
  expect((await post({ action: 'seeding-remove', phone: d })).status()).toBe(200);
  expect(rowOf(await report(), 'byCampaign', 'Khai trương T11')!.leads).toBe(3);
});

test('phân bổ lại nguồn/chiến dịch; xóa chiến dịch đã có chi phí bị từ chối; CSV; khoảng ngày sai', async () => {
  const leads = ((await (await owner.get('/api/crm2/leads?limit=200&q=')).json()) as Json).leads as Json[];
  const mine = leads.filter((l) => l.campaign === 'khai trương t11' || l.campaign === 'Khai trương T11');
  expect(mine.length).toBeGreaterThanOrEqual(2);
  expect((await post({ action: 'reassign', ids: [mine[0].id] })).status()).toBe(400);
  const moved = await post({ action: 'reassign', ids: [mine[0].id], campaign: 'Chiến dịch khác' });
  expect(moved.status()).toBe(200);
  expect(((await moved.json()) as Json).changed).toBe(1);
  expect(rowOf(await report(), 'byCampaign', 'Chiến dịch khác')).toBeTruthy();

  const camp = ((await report()).campaigns as Json[]).find((x) => x.name === 'Khai trương T11')!;
  expect((await post({ action: 'campaign-delete', id: camp.id })).status()).toBe(409);
  const empty = await post({ action: 'campaign', name: 'Chưa dùng' });
  const id = ((await empty.json()) as Json).id;
  expect((await post({ action: 'campaign-delete', id })).status()).toBe(200);

  const csv = await owner.get('/api/crm2/marketing?days=30&format=csv');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('Khai trương T11');
  expect((await owner.get('/api/crm2/marketing?from=2027-03-01&to=2027-01-01')).status()).toBe(400);
  expect((await owner.get('/api/crm2/marketing?from=2020-01-01&to=2027-01-01')).status()).toBe(400);
  expect((await owner.get('/api/crm2/marketing?from=abc&to=def')).status()).toBe(400);
});

test('giao diện: tab Marketing hiện chỉ số, chiến dịch và thêm được số seeding', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', { data: OWNER })).status()).toBe(200);
  await page.goto('/quan-ly');
  await page.locator('aside[aria-label="Menu chính"]').getByRole('button', { name: 'CRM', exact: true }).click();
  const crm = page.getByRole('region', { name: 'CRM' });
  await crm.getByRole('tab', { name: 'Marketing' }).click();
  await expect(crm.getByText('CPL (chi phí / lead)')).toBeVisible();
  await expect(crm.getByRole('region', { name: 'Hiệu quả theo chiến dịch' })).toContainText('Khai trương T11');
  await crm.getByLabel('Số điện thoại').fill('0933 444 555');
  await crm.getByRole('button', { name: 'Thêm số' }).click();
  await expect(crm.getByText('Đã thêm số seeding')).toBeVisible();
  await expect(crm.getByRole('region', { name: 'Danh sách số seeding' })).toContainText('0933444555');
});

test('doanh thu: tiền cọc đã thu của khách có lead được tính về chiến dịch, đúng một lần', async () => {
  const sales = (body: Json) => owner.post('/api/crm2/sales', { data: body, headers: { origin } });
  const prod = await sales({ action: 'product', code: 'MKT-GOI', name: 'Gói thử marketing', listPrice: 2_000_000, limited: false, active: true });
  expect([200, 409]).toContain(prod.status());
  const before = rowOf(await report(), 'byCampaign', 'Khai trương T11')!;
  const p = phone();
  const first = await website(p, 'Khai trương T11');
  await website(p, 'Khai trương T11'); // same customer writes twice: still one lead
  const leadId = first.leadId as string;

  const hold = await sales({ action: 'hold', leadId, productCode: 'MKT-GOI', hours: 1 });
  expect(hold.status(), await hold.text()).toBe(200);
  const dep = await sales({ action: 'deposit', id: ((await hold.json()) as Json).id, amount: 500_000 });
  expect(dep.status(), await dep.text()).toBe(200);

  const after = rowOf(await report(), 'byCampaign', 'Khai trương T11')!;
  expect(after.leads).toBe(before.leads + 1);
  expect(after.revenue - before.revenue).toBe(500_000);
  expect(after.roas).toBeCloseTo(after.revenue / after.spend, 5);
  // A second deposit-free look at the same report changes nothing: revenue is not counted twice.
  expect(rowOf(await report(), 'byCampaign', 'Khai trương T11')!.revenue).toBe(after.revenue);
});

test('nhật ký xem số: chỉ ghi khi nhân viên thấy đủ số, một lần mỗi 10 phút, chỉ quản lý đọc được', async ({ playwright }) => {
  const sale = await playwright.request.newContext({ baseURL: origin });
  expect((await sale.post('/api/auth/login', { data: { email: 'sale.mkt@e2e.test', password: 'Mkt!x7Qp2Lm9' } })).status()).toBe(200);
  const me = (await (await owner.get('/api/crm2/config')).json()) as Json;
  const saleId = (me.staff as Json[]).find((s) => s.email === 'sale.mkt@e2e.test')!.id as string;

  const p = phone();
  const lead = await website(p, 'Khai trương T11');
  const id = lead.leadId as string;
  // Make sure it is unowned first (pool), then owned by the sale.
  await owner.post('/api/crm2/leads', { data: { action: 'recall', ids: [id], reason: 'Kiểm thử nhật ký' }, headers: { origin } });
  const countFor = async () =>
    ((await (await owner.get('/api/crm2/view-log?days=1&user=' + saleId)).json()) as Json).rows.filter((r: Json) => r.leadId === id).length;

  const seen = await sale.get('/api/crm2/leads?id=' + id);
  expect(seen.status()).toBe(200);
  expect(((await seen.json()) as Json).lead.masked).toBe(true);
  expect(await countFor()).toBe(0); // masked: nothing sensitive was seen

  const assigned = await owner.post('/api/crm2/leads', { data: { action: 'assign', ids: [id], userId: saleId }, headers: { origin } });
  expect(assigned.status(), await assigned.text()).toBe(200);
  const full = ((await (await sale.get('/api/crm2/leads?id=' + id)).json()) as Json).lead;
  expect(full.masked).toBe(false);
  await sale.get('/api/crm2/leads?id=' + id); // again within 10 minutes
  expect(await countFor()).toBe(1);

  expect((await sale.get('/api/crm2/view-log')).status()).toBe(403);
  const log = (await (await owner.get('/api/crm2/view-log?days=1')).json()) as Json;
  expect(log.perUser.find((u: Json) => u.userId === saleId).views).toBeGreaterThanOrEqual(1);
  await sale.dispose();
});
