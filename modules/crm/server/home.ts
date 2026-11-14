// Data for the CRM home screen (overview dashboard): KPIs, grouped pipeline, weekly chart, activity, tasks.
import { db } from '../../../lib/server/common';
import { isManager } from '../core/access';
import { DAY, reply, vnDayStart, type Ctx, type Result } from './store';

/** The 7 lead stages shown as the 5 pipeline columns of the design. */
export const PIPE_COLUMNS: { key: string; label: string; stages: string[] }[] = [
  { key: 'new', label: 'Lead mới', stages: ['NEW'] },
  { key: 'advice', label: 'Đang tư vấn', stages: ['CONTACTED', 'QUALIFIED'] },
  { key: 'quote', label: 'Hẹn trải nghiệm', stages: ['VISIT_SCHEDULED', 'VISITED'] },
  { key: 'pay', label: 'Chờ thanh toán', stages: ['DEPOSITED'] },
  { key: 'won', label: 'Đã chốt', stages: ['WON'] },
];

type LeadRow = { id: string; full_name: string; phone: string; email: string; stage: string; expected_value: number; target_service: string; owner_name: string | null; updated: number };

export async function crmHome(c: Ctx): Promise<Result> {
  const d = db();
  const mgr = isManager(c.role);
  const scope = mgr ? '' : ' AND (owner=? OR owner IS NULL)';
  const sargs = (...a: (string | number)[]) => (mgr ? a : [...a, c.userId]);
  const today = vnDayStart(c.now);
  const monthStart = vnDayStart(c.now) - (new Date(c.now + 7 * 3_600_000).getUTCDate() - 1) * DAY;
  const prevMonth = monthStart - 30 * DAY;
  const weekStart = monthStart;

  const [custs, custPrev, leadsNow, leadsPrev, open, pipe, revenue, weeks, acts, recent, tasks, apptToday, dealWeeks] = await Promise.all([
    d.prepare('SELECT COUNT(*) AS n FROM customers WHERE tenant=?').bind(c.tenant).first<{ n: number }>(),
    d.prepare('SELECT COUNT(*) AS n FROM customers WHERE tenant=? AND created<?').bind(c.tenant, monthStart).first<{ n: number }>(),
    d.prepare(`SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=?${scope}`).bind(...sargs(c.tenant, monthStart)).first<{ n: number }>(),
    d.prepare(`SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=? AND created<?${scope}`).bind(...sargs(c.tenant, prevMonth, monthStart)).first<{ n: number }>(),
    d.prepare(`SELECT COUNT(*) AS n,COALESCE(SUM(expected_value),0) AS v FROM crm2_leads WHERE tenant=? AND stage NOT IN ('WON','LOST')${scope}`).bind(...sargs(c.tenant)).first<{ n: number; v: number }>(),
    d.prepare(`SELECT stage,COUNT(*) AS n,COALESCE(SUM(expected_value),0) AS v FROM crm2_leads WHERE tenant=? AND stage!='LOST'${scope} GROUP BY stage`).bind(...sargs(c.tenant)).all<{ stage: string; n: number; v: number }>(),
    mgr
      ? d.prepare("SELECT COALESCE(SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END),0) AS total FROM finance_entries WHERE tenant=? AND kind IN ('payment','refund') AND created>=?").bind(c.tenant, monthStart).first<{ total: number }>()
      : Promise.resolve(null),
    mgr
      ? d.prepare("SELECT CAST((created-?)/(7*86400000) AS INTEGER) AS w,COALESCE(SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END),0) AS v FROM finance_entries WHERE tenant=? AND kind IN ('payment','refund') AND created>=? GROUP BY w").bind(weekStart, c.tenant, weekStart).all<{ w: number; v: number }>()
      : Promise.resolve({ results: [] as { w: number; v: number }[] }),
    d.prepare(`SELECT a.id,a.type,a.content,a.created,l.full_name FROM crm2_activities a LEFT JOIN crm2_leads l ON l.id=a.lead_id WHERE a.tenant=?${mgr ? '' : ' AND (l.owner=? OR l.owner IS NULL)'} ORDER BY a.created DESC LIMIT 5`).bind(...sargs(c.tenant)).all<{ id: string; type: string; content: string; created: number; full_name: string | null }>(),
    d.prepare(`SELECT l.id,l.full_name,l.phone,l.email,l.stage,l.expected_value,l.target_service,u.name AS owner_name,l.updated FROM crm2_leads l LEFT JOIN users u ON u.id=l.owner WHERE l.tenant=?${mgr ? '' : ' AND (l.owner=? OR l.owner IS NULL)'} ORDER BY l.updated DESC LIMIT 8`).bind(...sargs(c.tenant)).all<LeadRow>(),
    d.prepare(`SELECT id,title,due_at,done_at FROM crm2_tasks WHERE tenant=? AND (?=1 OR assignee=?) AND ((done_at IS NULL AND due_at<?) OR (due_at>=? AND due_at<?)) ORDER BY due_at LIMIT 8`).bind(c.tenant, mgr ? 1 : 0, c.userId, today + DAY, today, today + DAY).all<{ id: string; title: string; due_at: number | null; done_at: number | null }>(),
    d.prepare("SELECT COUNT(*) AS n FROM crm2_appointments WHERE tenant=? AND at>=? AND at<? AND status IN ('PENDING','CONFIRMED') AND (?=1 OR owner=?)").bind(c.tenant, today, today + DAY, mgr ? 1 : 0, c.userId).first<{ n: number }>(),
    d.prepare(`SELECT CAST((created-?)/(7*86400000) AS INTEGER) AS w,COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND created>=?${scope} GROUP BY w`).bind(...sargs(weekStart, c.tenant, weekStart)).all<{ w: number; n: number }>(),
  ]);

  const byStage = new Map(pipe.results.map((r) => [r.stage, r]));
  // Cards per column: the newest leads of the grouped stages.
  const columns = await Promise.all(
    PIPE_COLUMNS.map(async (col) => {
      const hits = col.stages.map((s) => byStage.get(s)).filter(Boolean) as { n: number; v: number }[];
      const marks = col.stages.map(() => '?').join(',');
      const cards = await d
        .prepare(`SELECT id,full_name,stage,expected_value,target_service FROM crm2_leads WHERE tenant=? AND stage IN (${marks})${scope} ORDER BY updated DESC LIMIT 2`)
        .bind(...sargs(c.tenant, ...col.stages))
        .all<{ id: string; full_name: string; stage: string; expected_value: number; target_service: string }>();
      return {
        key: col.key,
        label: col.label,
        count: hits.reduce((s, h) => s + h.n, 0),
        value: hits.reduce((s, h) => s + h.v, 0),
        cards: cards.results.map((x) => ({ id: x.id, name: x.full_name, note: x.target_service, value: x.expected_value })),
      };
    }),
  );

  const weekly = Array.from({ length: 4 }, (_, i) => ({
    label: `Tuần ${i + 1}`,
    revenue: weeks.results.find((w) => w.w === i)?.v ?? 0,
    deals: dealWeeks.results.find((w) => w.w === i)?.n ?? 0,
  }));

  return reply({
    kpi: {
      customers: custs?.n ?? 0,
      customersDelta: custPrev?.n ? Math.round(((custs?.n ?? 0) - custPrev.n) / custPrev.n * 100) : null,
      leadsMonth: leadsNow?.n ?? 0,
      leadsDelta: leadsPrev?.n ? Math.round(((leadsNow?.n ?? 0) - leadsPrev.n) / leadsPrev.n * 100) : null,
      openDeals: open?.n ?? 0,
      openValue: open?.v ?? 0,
      revenueMonth: revenue?.total ?? null,
      todayTasks: tasks.results.filter((t) => !t.done_at).length,
      apptToday: apptToday?.n ?? 0,
    },
    columns,
    weekly,
    activity: acts.results.map((a) => ({ id: a.id, type: a.type, text: a.content, lead: a.full_name ?? '', at: a.created })),
    recent: recent.results.map((r) => ({
      id: r.id,
      name: r.full_name,
      phone: r.phone,
      email: r.email,
      stage: r.stage,
      value: r.expected_value,
      owner: r.owner_name ?? '',
      updated: r.updated,
    })),
    tasks: tasks.results.map((t) => ({ id: t.id, title: t.title, due: t.due_at, done: !!t.done_at })),
    now: c.now,
  });
}
