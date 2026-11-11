import { z } from 'zod';
import { db, audit } from '../../../lib/server/common';
import { toCsv } from '../../../lib/csv';
import { isManager } from '../core/access';
import {
  buildMarketingReport,
  type MktCampaign,
  type MktLead,
  type MktSpend,
} from '../core/marketing';
import { normalizePhone } from '../core/phone';
import { DAY, fail, reply, vnDayStart, type Ctx, type Result } from './store';

const text = (max: number) => z.string().trim().max(max);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD');
const money = z.number().int().min(0).max(10_000_000_000);

export const marketingActions = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('campaign'),
      id: z.string().max(100).optional(),
      name: text(120).min(2, 'Tên chiến dịch tối thiểu 2 ký tự'),
      source: text(100).default(''),
      runner: text(100).default(''),
      budget: money.default(0),
      startsOn: day.or(z.literal('')).default(''),
      endsOn: day.or(z.literal('')).default(''),
      active: z.boolean().default(true),
    })
    .strict(),
  z.object({ action: z.literal('campaign-delete'), id: z.string().min(1).max(100) }).strict(),
  z
    .object({
      action: z.literal('spend'),
      campaignId: z.string().min(1).max(100),
      day,
      amount: money,
      impressions: money.default(0),
      clicks: money.default(0),
    })
    .strict(),
  z
    .object({ action: z.literal('seeding-add'), phone: text(30).min(1), note: text(200).default('') })
    .strict(),
  z.object({ action: z.literal('seeding-remove'), phone: text(30).min(1) }).strict(),
  z
    .object({
      action: z.literal('reassign'),
      ids: z.array(z.string().min(1).max(100)).min(1).max(200),
      source: text(100).optional(),
      campaign: text(120).optional(),
    })
    .strict(),
]);

/** Vietnam calendar day (YYYY-MM-DD) of a timestamp. */
export const vnDay = (t: number) => new Date(t + 7 * 3_600_000).toISOString().slice(0, 10);

type Period = { from: string; to: string; fromTs: number; toTs: number };
/** `days` back from today, or an explicit YYYY-MM-DD range; always at most one year. */
export function periodOf(c: Ctx, q: URLSearchParams): Period | { error: string } {
  const from = q.get('from');
  const to = q.get('to');
  if (from || to) {
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
      return { error: 'Khoảng ngày không hợp lệ' };
    const fromTs = Date.parse(from + 'T00:00:00+07:00');
    const toTs = Date.parse(to + 'T00:00:00+07:00') + DAY;
    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || toTs <= fromTs)
      return { error: 'Khoảng ngày không hợp lệ' };
    if (toTs - fromTs > 366 * DAY) return { error: 'Tối đa một năm mỗi lần xem' };
    return { from, to, fromTs, toTs };
  }
  const span = Math.min(Math.max(Math.round(Number(q.get('days') ?? 30)) || 30, 1), 365);
  const toTs = vnDayStart(c.now) + DAY;
  const fromTs = toTs - span * DAY;
  return { from: vnDay(fromTs), to: vnDay(toTs - 1), fromTs, toTs };
}

type LeadRaw = {
  source: string;
  campaign: string;
  seeding: number;
  inquiryCount: number;
  firstResponseAt: number | null;
  stage: string;
  revenue: number;
  targetService: string;
};

async function loadReport(c: Ctx, p: Period) {
  const d = db();
  const [leadRows, campaigns, spend] = await Promise.all([
    d
      .prepare(
        // Revenue = CRM order payments of the lead + paid bookings of its phone, the latter credited once
        // (to the earliest lead of that phone) so several leads of one customer never count a booking twice.
        `SELECT l.source,l.campaign,l.seeding,l.inquiry_count AS inquiryCount,l.first_response_at AS firstResponseAt,l.stage,COALESCE(l.target_service, '') AS targetService,
           COALESCE((SELECT SUM(p.paid_amount) FROM crm2_order_payments p JOIN crm2_orders o ON o.id=p.order_id AND o.tenant=p.tenant
             WHERE o.lead_id=l.id AND o.tenant=l.tenant AND p.status<>'CANCELLED'),0)
           + CASE WHEN l.phone_norm<>'' AND l.id=(SELECT x.id FROM crm2_leads x WHERE x.tenant=l.tenant AND x.phone_norm=l.phone_norm ORDER BY x.created,x.id LIMIT 1)
               THEN COALESCE((SELECT SUM(b.amount) FROM bookings b WHERE b.tenant=l.tenant AND b.phone=l.phone_norm AND b.status='paid' AND b.finished>=l.created),0)
               ELSE 0 END AS revenue
         FROM crm2_leads l WHERE l.tenant=? AND l.created>=? AND l.created<? LIMIT 20000`,
      )
      .bind(c.tenant, p.fromTs, p.toTs)
      .all<LeadRaw>(),
    d
      .prepare(
        'SELECT id,name,source,runner,budget,starts_on AS startsOn,ends_on AS endsOn,active FROM crm2_campaigns WHERE tenant=? ORDER BY name',
      )
      .bind(c.tenant)
      .all<Omit<MktCampaign, 'active'> & { startsOn: string; endsOn: string; active: number }>(),
    d
      .prepare(
        'SELECT campaign_id AS campaignId,amount,impressions,clicks FROM crm2_ad_spend WHERE tenant=? AND day>=? AND day<=?',
      )
      .bind(c.tenant, p.from, p.to)
      .all<MktSpend>(),
  ]);
  const leads: MktLead[] = leadRows.results.map((r) => ({
    source: r.source,
    campaign: r.campaign,
    service: r.targetService,
    seeding: !!r.seeding,
    inquiryCount: r.inquiryCount,
    contacted: r.firstResponseAt != null,
    won: r.stage === 'WON',
    revenue: r.revenue,
  }));
  const camps = campaigns.results.map((x) => ({ ...x, active: !!x.active }));
  return {
    campaigns: camps,
    report: buildMarketingReport({ leads, campaigns: camps, spend: spend.results }),
  };
}

export async function marketingReport(c: Ctx, q: URLSearchParams): Promise<Result | Response> {
  if (!isManager(c.role)) return fail('Chỉ quản lý xem báo cáo marketing', 403);
  const p = periodOf(c, q);
  if ('error' in p) return fail(p.error);
  const { campaigns, report } = await loadReport(c, p);
  if (q.get('format') === 'csv') {
    const pct = (v: number | null) => (v == null ? '' : Math.round(v * 1000) / 10 + '%');
    const num = (v: number | null) => (v == null ? '' : Math.round(v));
    const rows: (string | number)[][] = [
      ['Chiến dịch', 'Lead hợp lệ', 'Seeding', 'Trùng', 'Đã liên hệ', 'Chốt', 'Chi phí', 'CPL', 'CPA', 'Doanh thu', 'ROAS'],
      ...report.byCampaign.map((r) => [
        r.label, r.leads, r.seeding, r.duplicates, r.contacted, r.won, r.spend, num(r.cpl), num(r.cpa), r.revenue,
        r.roas == null ? '' : Math.round(r.roas * 100) / 100,
      ]),
      ['Tỉ lệ trùng', pct(report.total.dupRate), 'Tỉ lệ liên hệ', pct(report.total.contactRate), 'Tỉ lệ chốt', pct(report.total.closeRate)],
    ];
    return new Response(toCsv(rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="bao-cao-marketing_${p.from}_${p.to}.csv"`,
      },
    });
  }
  const seeding = (
    await db()
      .prepare('SELECT phone_norm AS phone,note,created FROM crm2_seeding WHERE tenant=? ORDER BY created DESC LIMIT 500')
      .bind(c.tenant)
      .all<{ phone: string; note: string; created: number }>()
  ).results;
  return reply({ from: p.from, to: p.to, campaigns, seeding, ...report });
}

export async function marketingAction(
  c: Ctx,
  a: z.infer<typeof marketingActions>,
): Promise<Result> {
  if (!isManager(c.role)) return fail('Chỉ quản lý được thay đổi', 403);
  const d = db();
  switch (a.action) {
    case 'campaign': {
      const dup = await d
        .prepare('SELECT id FROM crm2_campaigns WHERE tenant=? AND lower(name)=lower(?) AND id<>?')
        .bind(c.tenant, a.name, a.id ?? '')
        .first();
      if (dup) return fail('Đã có chiến dịch trùng tên', 409);
      if (a.startsOn && a.endsOn && a.endsOn < a.startsOn) return fail('Ngày kết thúc trước ngày bắt đầu');
      if (a.id) {
        const r = await d
          .prepare(
            'UPDATE crm2_campaigns SET name=?,source=?,runner=?,budget=?,starts_on=?,ends_on=?,active=? WHERE tenant=? AND id=?',
          )
          .bind(a.name, a.source, a.runner, a.budget, a.startsOn, a.endsOn, a.active ? 1 : 0, c.tenant, a.id)
          .run();
        if (!r.meta.changes) return fail('Không tìm thấy chiến dịch', 404);
        await audit(c.tenant, 'crm.marketing.campaign', `Sửa chiến dịch ${a.name}`);
        return reply({ ok: true, id: a.id });
      }
      const id = crypto.randomUUID();
      await d
        .prepare(
          'INSERT INTO crm2_campaigns(id,tenant,name,source,runner,budget,starts_on,ends_on,active,created) VALUES (?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(id, c.tenant, a.name, a.source, a.runner, a.budget, a.startsOn, a.endsOn, a.active ? 1 : 0, c.now)
        .run();
      await audit(c.tenant, 'crm.marketing.campaign', `Thêm chiến dịch ${a.name}`);
      return reply({ ok: true, id });
    }
    case 'campaign-delete': {
      const used = await d
        .prepare('SELECT 1 AS x FROM crm2_ad_spend WHERE tenant=? AND campaign_id=? LIMIT 1')
        .bind(c.tenant, a.id)
        .first();
      if (used) return fail('Chiến dịch đã có chi phí, hãy tắt thay vì xóa để giữ số liệu', 409);
      const r = await d.prepare('DELETE FROM crm2_campaigns WHERE tenant=? AND id=?').bind(c.tenant, a.id).run();
      if (!r.meta.changes) return fail('Không tìm thấy chiến dịch', 404);
      await audit(c.tenant, 'crm.marketing.campaign', `Xóa chiến dịch ${a.id}`);
      return reply({ ok: true });
    }
    case 'spend': {
      const camp = await d
        .prepare('SELECT 1 AS x FROM crm2_campaigns WHERE tenant=? AND id=?')
        .bind(c.tenant, a.campaignId)
        .first();
      if (!camp) return fail('Không tìm thấy chiến dịch', 404);
      if (a.day > vnDay(c.now)) return fail('Không nhập chi phí cho ngày chưa tới');
      await d
        .prepare(
          `INSERT INTO crm2_ad_spend(id,tenant,campaign_id,day,amount,impressions,clicks,updated) VALUES (?,?,?,?,?,?,?,?)
           ON CONFLICT(tenant,campaign_id,day) DO UPDATE SET amount=excluded.amount,impressions=excluded.impressions,clicks=excluded.clicks,updated=excluded.updated`,
        )
        .bind(crypto.randomUUID(), c.tenant, a.campaignId, a.day, a.amount, a.impressions, a.clicks, c.now)
        .run();
      await audit(c.tenant, 'crm.marketing.spend', `Chi phí ${a.day}: ${a.amount}đ (${a.campaignId})`);
      return reply({ ok: true });
    }
    case 'seeding-add': {
      const norm = normalizePhone(a.phone);
      if (norm.length < 8) return fail('Số điện thoại không hợp lệ');
      await d
        .prepare('INSERT OR IGNORE INTO crm2_seeding(tenant,phone_norm,note,created) VALUES (?,?,?,?)')
        .bind(c.tenant, norm, a.note, c.now)
        .run();
      const r = await d
        .prepare('UPDATE crm2_leads SET seeding=1 WHERE tenant=? AND phone_norm=? AND seeding=0')
        .bind(c.tenant, norm)
        .run();
      await audit(c.tenant, 'crm.marketing.seeding', `Thêm số seeding ${norm.slice(0, 3)}****${norm.slice(-3)}`);
      return reply({ ok: true, marked: r.meta.changes });
    }
    case 'seeding-remove': {
      const norm = normalizePhone(a.phone);
      await d.prepare('DELETE FROM crm2_seeding WHERE tenant=? AND phone_norm=?').bind(c.tenant, norm).run();
      const r = await d
        .prepare('UPDATE crm2_leads SET seeding=0 WHERE tenant=? AND phone_norm=? AND seeding=1')
        .bind(c.tenant, norm)
        .run();
      await audit(c.tenant, 'crm.marketing.seeding', `Bỏ số seeding ${norm.slice(0, 3)}****${norm.slice(-3)}`);
      return reply({ ok: true, unmarked: r.meta.changes });
    }
    case 'reassign': {
      if (a.source === undefined && a.campaign === undefined) return fail('Chọn nguồn hoặc chiến dịch cần gán');
      if (a.source !== undefined && !a.source) return fail('Nguồn không được để trống');
      const sets: string[] = [];
      const binds: (string | number)[] = [];
      if (a.source !== undefined) {
        sets.push('source=?');
        binds.push(a.source);
      }
      if (a.campaign !== undefined) {
        sets.push('campaign=?');
        binds.push(a.campaign);
      }
      sets.push('updated=?');
      binds.push(c.now);
      const marks = a.ids.map(() => '?').join(',');
      const r = await d
        .prepare(`UPDATE crm2_leads SET ${sets.join(',')} WHERE tenant=? AND id IN (${marks})`)
        .bind(...binds, c.tenant, ...a.ids)
        .run();
      await audit(c.tenant, 'crm.marketing.reassign', `Phân bổ lại nguồn/chiến dịch cho ${r.meta.changes} lead`);
      return reply({ ok: true, changed: r.meta.changes });
    }
  }
}
