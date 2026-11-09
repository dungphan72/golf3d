/**
 * Marketing report: where leads come from, what they cost and what they bring back. Pure: no I/O.
 * Seeding (internal/test) leads are listed but never counted in any KPI.
 */

export type MktLead = {
  source: string;
  campaign: string;
  seeding: boolean;
  inquiryCount: number;
  contacted: boolean;
  won: boolean;
  revenue: number; // money actually paid by this lead's customer (CRM orders + paid bookings), attributed once
};
export type MktCampaign = {
  id: string;
  name: string;
  source: string;
  runner: string;
  budget: number;
  active: boolean;
};
export type MktSpend = { campaignId: string; amount: number; impressions: number; clicks: number };

export type MktMetrics = {
  leads: number; // valid leads (seeding excluded)
  seeding: number;
  duplicates: number; // valid leads that wrote or filled the form again
  contacted: number;
  won: number;
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  /** null = cannot be computed (no spend or no leads), never 0, so "free" is not confused with "unknown". */
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  dupRate: number | null;
  contactRate: number | null;
  closeRate: number | null;
};
export type MktRow = MktMetrics & { key: string; label: string };

export const UNKNOWN = '(không rõ)';
const norm = (s: string) => s.trim().toLowerCase();
const label = (s: string) => (s.trim() ? s.trim() : UNKNOWN);

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const empty = (): MktMetrics => ({
  leads: 0,
  seeding: 0,
  duplicates: 0,
  contacted: 0,
  won: 0,
  spend: 0,
  impressions: 0,
  clicks: 0,
  revenue: 0,
  cpl: null,
  cpa: null,
  roas: null,
  dupRate: null,
  contactRate: null,
  closeRate: null,
});
function finish(m: MktMetrics): MktMetrics {
  return {
    ...m,
    cpl: m.spend > 0 ? ratio(m.spend, m.leads) : null,
    cpa: m.spend > 0 ? ratio(m.spend, m.won) : null,
    roas: ratio(m.revenue, m.spend),
    dupRate: ratio(m.duplicates, m.leads),
    contactRate: ratio(m.contacted, m.leads),
    closeRate: ratio(m.won, m.leads),
  };
}
function addLead(m: MktMetrics, l: MktLead) {
  if (l.seeding) {
    m.seeding++;
    return;
  }
  m.leads++;
  if (l.inquiryCount > 1) m.duplicates++;
  if (l.contacted) m.contacted++;
  if (l.won) m.won++;
  m.revenue += l.revenue;
}

export type MarketingReport = {
  total: MktMetrics;
  bySource: MktRow[];
  byCampaign: MktRow[];
  byRunner: MktRow[];
};

type Slot = MktMetrics & { label: string };

export function buildMarketingReport(input: {
  leads: MktLead[];
  campaigns: MktCampaign[];
  spend: MktSpend[];
}): MarketingReport {
  const byName = new Map(input.campaigns.map((c) => [norm(c.name), c]));
  const spendOf = new Map<string, MktSpend>();
  for (const s of input.spend) {
    const cur = spendOf.get(s.campaignId) ?? {
      campaignId: s.campaignId,
      amount: 0,
      impressions: 0,
      clicks: 0,
    };
    cur.amount += s.amount;
    cur.impressions += s.impressions;
    cur.clicks += s.clicks;
    spendOf.set(s.campaignId, cur);
  }

  const total = empty();
  const src = new Map<string, Slot>();
  const cmp = new Map<string, Slot>();
  const run = new Map<string, Slot>();
  const slot = (map: Map<string, Slot>, key: string, text: string) => {
    let m = map.get(key);
    if (!m) map.set(key, (m = { ...empty(), label: text }));
    return m;
  };

  for (const c of input.campaigns) {
    const sp = spendOf.get(c.id);
    const targets: [Map<string, Slot>, string, string][] = [
      [cmp, norm(c.name), c.name],
      [src, norm(label(c.source)), label(c.source)],
      [run, norm(label(c.runner)), label(c.runner)],
    ];
    for (const [map, key, text] of targets) {
      const m = slot(map, key, text);
      if (sp) {
        m.spend += sp.amount;
        m.impressions += sp.impressions;
        m.clicks += sp.clicks;
      }
    }
    if (sp) {
      total.spend += sp.amount;
      total.impressions += sp.impressions;
      total.clicks += sp.clicks;
    }
  }

  for (const l of input.leads) {
    const camp = byName.get(norm(l.campaign));
    addLead(total, l);
    // A defined campaign says which source it belongs to; that wins over the channel the lead happened to arrive by
    // (a Facebook campaign landing on the website form is still Facebook), so cost and leads meet in one row.
    const source = camp?.source.trim() ? camp.source : l.source;
    addLead(slot(src, norm(label(source)), label(source)), l);
    addLead(slot(cmp, norm(label(l.campaign)), camp?.name ?? label(l.campaign)), l);
    // Leads from a campaign are credited to whoever runs it; others have no runner.
    addLead(slot(run, norm(label(camp?.runner ?? '')), label(camp?.runner ?? '')), l);
  }

  const rows = (map: Map<string, Slot>): MktRow[] =>
    [...map.entries()]
      .map(([key, m]) => ({ key, ...finish(m), label: m.label }))
      .sort(
        (a, b) => b.leads - a.leads || b.spend - a.spend || a.label.localeCompare(b.label, 'vi'),
      );
  return {
    total: finish(total),
    bySource: rows(src),
    byCampaign: rows(cmp),
    byRunner: rows(run),
  };
}
