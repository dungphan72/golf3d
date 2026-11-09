import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketingReport, type MktLead } from '../modules/crm/core/marketing.ts';

const lead = (o: Partial<MktLead> = {}): MktLead => ({
  source: 'Facebook',
  campaign: 'thang-11',
  seeding: false,
  inquiryCount: 1,
  contacted: false,
  won: false,
  revenue: 0,
  ...o,
});
const campaigns = [
  { id: 'c1', name: 'Thang-11', source: 'Facebook', runner: 'An', budget: 5_000_000, active: true },
  { id: 'c2', name: 'Google', source: 'Quảng cáo', runner: 'Bình', budget: 0, active: true },
];

test('CPL, CPA and ROAS come from spend, valid leads, won leads and paid revenue', () => {
  const r = buildMarketingReport({
    leads: [
      lead({ contacted: true, won: true, revenue: 3_000_000 }),
      lead({ contacted: true }),
      lead(),
      lead(),
    ],
    campaigns,
    spend: [
      { campaignId: 'c1', amount: 400_000, impressions: 1000, clicks: 50 },
      { campaignId: 'c1', amount: 200_000, impressions: 500, clicks: 20 },
    ],
  });
  const c = r.byCampaign.find((x) => x.label === 'Thang-11')!; // lead campaign matched case-insensitively
  assert.equal(c.leads, 4);
  assert.equal(c.spend, 600_000);
  assert.equal(c.cpl, 150_000);
  assert.equal(c.cpa, 600_000);
  assert.equal(c.roas, 5);
  assert.equal(c.contactRate, 0.5);
  assert.equal(c.closeRate, 0.25);
  assert.equal(c.clicks, 70);
  assert.equal(r.total.spend, 600_000);
  assert.equal(r.byRunner.find((x) => x.label === 'An')!.leads, 4);
});

test('seeding leads are counted apart and never enter any KPI', () => {
  const r = buildMarketingReport({
    leads: [lead({ seeding: true, won: true, revenue: 9_000_000, contacted: true }), lead()],
    campaigns,
    spend: [{ campaignId: 'c1', amount: 100_000, impressions: 0, clicks: 0 }],
  });
  assert.equal(r.total.leads, 1);
  assert.equal(r.total.seeding, 1);
  assert.equal(r.total.won, 0);
  assert.equal(r.total.revenue, 0);
  assert.equal(r.total.cpl, 100_000);
});

test('duplicates are a rate of valid leads; unknown denominators are null, not zero', () => {
  const r = buildMarketingReport({
    leads: [lead({ inquiryCount: 3 }), lead(), lead({ source: '', campaign: '' })],
    campaigns,
    spend: [],
  });
  assert.equal(r.total.duplicates, 1);
  assert.ok(Math.abs(r.total.dupRate! - 1 / 3) < 1e-9);
  assert.equal(r.total.cpl, null); // no spend recorded
  assert.equal(r.total.roas, null);
  assert.ok(r.bySource.some((x) => x.label === '(không rõ)'));
  const nothing = buildMarketingReport({ leads: [], campaigns: [], spend: [] });
  assert.equal(nothing.total.closeRate, null);
  assert.equal(nothing.byCampaign.length, 0);
});

test('a campaign with spend but no leads still shows up with its cost', () => {
  const r = buildMarketingReport({
    leads: [],
    campaigns,
    spend: [{ campaignId: 'c2', amount: 250_000, impressions: 10, clicks: 1 }],
  });
  const g = r.byCampaign.find((x) => x.label === 'Google')!;
  assert.equal(g.spend, 250_000);
  assert.equal(g.cpl, null);
  assert.equal(g.roas, 0);
});

test("a lead of a defined campaign counts under the campaign's source, so cost and leads share one row", () => {
  const r = buildMarketingReport({
    leads: [lead({ source: 'Website', campaign: 'thang-11' }), lead({ source: 'Website', campaign: 'khong-co' })],
    campaigns,
    spend: [{ campaignId: 'c1', amount: 90_000, impressions: 0, clicks: 0 }],
  });
  const fb = r.bySource.find((x) => x.label === 'Facebook')!;
  assert.equal(fb.leads, 1);
  assert.equal(fb.cpl, 90_000);
  assert.equal(r.bySource.find((x) => x.label === 'Website')!.leads, 1);
});
