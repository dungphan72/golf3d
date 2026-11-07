import { DEFAULT_CALL_RULES, type CallRules } from './calls.ts';
import { DEFAULT_DISTRIBUTION, type DistributionConfig } from './distribution.ts';
import { DEFAULT_WORK_HOURS, type WorkHours } from './workhours.ts';
import {
  DEFAULT_AFTER_SALES,
  DEFAULT_TIERS,
  sanitizeTiers,
  type AfterSales,
  type Tier,
} from './customers.ts';
import { sanitizeCatalog, type StatusCatalog } from './stages.ts';
import { careSettings, type CareSettings } from './care.ts';

export type Label = { id: string; name: string; color: string };
export const DEFAULT_LABELS: Label[] = [
  { id: 'vip', name: 'VIP', color: '#b45309' },
  { id: 'doanh-nghiep', name: 'Doanh nghiệp', color: '#1d4ed8' },
  { id: 'nguoi-moi', name: 'Người mới chơi', color: '#047857' },
  { id: 'can-hlv', name: 'Cần HLV', color: '#7c3aed' },
  { id: 'nhay-cam-gia', name: 'Nhạy cảm về giá', color: '#be123c' },
];

export type CrmSettings = {
  autoAssign: boolean;
  slaMinutes: number;
  holdHours: number;
  pool: {
    claimQuotaPerDay: number;
    recallHours: number;
    autoRecall: boolean;
    intakeMode: 'AUTO' | 'POOL';
  };
  labels: Label[];
  calls: CallRules;
  distribution: DistributionConfig;
  appointments: { requireApproval: boolean };
  workHours: WorkHours;
  tiers: Tier[];
  afterSales: AfterSales;
  statuses: StatusCatalog;
  notifyAssignEmail: boolean;
  /** Tasks the system creates for existing customers (welcome, thanks, comeback, packages, birthday, points). */
  care: CareSettings;
  /** Where leads from the website form (POST /api/leads/website) go: the old "Chăm sóc KH" or this module. */
  websiteLeads: 'LEGACY' | 'CRM2';
  /** Same for messages customers send to the Zalo Official Account (POST /api/leads/zalo). */
  zaloLeads: 'LEGACY' | 'CRM2';
  /** Same for Facebook / Instagram Lead Ads (POST /api/leads/facebook). */
  facebookLeads: 'LEGACY' | 'CRM2';
  /** Same for ad platforms and automation tools (POST /api/leads/ads). */
  adsLeads: 'LEGACY' | 'CRM2';
};

const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const strs = (v: unknown, max = 100) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : [];

/** Reads whatever is stored and returns a complete, in-range configuration. */
export function sanitizeSettings(raw: unknown): CrmSettings {
  const r = rec(raw);
  const pool = rec(r.pool);
  const calls = rec(r.calls);
  const dist = rec(r.distribution);
  const wh = rec(r.workHours);
  const after = rec(r.afterSales);
  const intakeMode =
    pool.intakeMode === 'POOL'
      ? 'POOL'
      : r.autoAssign === false && !pool.intakeMode
        ? 'POOL'
        : 'AUTO';
  const retry = Array.isArray(calls.retryHours)
    ? calls.retryHours.slice(0, 3).map((h) => num(h, 1, 720, 24))
    : DEFAULT_CALL_RULES.retryHours;
  const labels = (Array.isArray(r.labels) ? r.labels : DEFAULT_LABELS)
    .slice(0, 20)
    .map((l) => rec(l))
    .filter((l) => typeof l.name === 'string' && String(l.name).trim())
    .map((l) => ({
      id: String(l.id || l.name).slice(0, 40),
      name: String(l.name).trim().slice(0, 30),
      color: typeof l.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(l.color) ? l.color : '#6b7280',
    }));
  const days = Array.isArray(wh.days)
    ? [...new Set(wh.days.map((d) => num(d, 0, 6, -1)).filter((d) => d >= 0))]
    : DEFAULT_WORK_HOURS.days;
  const start = num(wh.start, 0, 1439, DEFAULT_WORK_HOURS.start);
  const end = num(wh.end, 1, 1440, DEFAULT_WORK_HOURS.end);
  const weights: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec(dist.weights))) weights[k] = num(v, 0, 100, 1);
  const bySource: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(rec(dist.bySource))) bySource[k] = strs(v);
  const steps = (Array.isArray(after.steps) ? after.steps : DEFAULT_AFTER_SALES.steps)
    .slice(0, 10)
    .map((s) => rec(s))
    .filter((s) => typeof s.title === 'string' && String(s.title).trim())
    .map((s) => ({ days: num(s.days, 0, 3650, 3), title: String(s.title).trim().slice(0, 150) }));
  return {
    autoAssign: intakeMode === 'AUTO',
    slaMinutes: num(r.slaMinutes, 1, 1440, 15),
    holdHours: num(r.holdHours, 1, 336, 48),
    pool: {
      claimQuotaPerDay: num(pool.claimQuotaPerDay, 1, 500, 20),
      recallHours: num(pool.recallHours, 1, 720, 48),
      autoRecall: bool(pool.autoRecall, true),
      intakeMode,
    },
    labels: labels.length || Array.isArray(r.labels) ? labels : DEFAULT_LABELS,
    calls: {
      retryHours: retry.length ? retry : DEFAULT_CALL_RULES.retryHours,
      thinkDays: num(calls.thinkDays, 1, 60, DEFAULT_CALL_RULES.thinkDays),
      interestedHours: num(calls.interestedHours, 1, 720, DEFAULT_CALL_RULES.interestedHours),
      metFollowUpHours: num(calls.metFollowUpHours, 1, 720, DEFAULT_CALL_RULES.metFollowUpHours),
    },
    distribution: {
      mode: dist.mode === 'WEIGHTED' ? 'WEIGHTED' : 'FAIR',
      weights,
      paused: strs(dist.paused),
      returnToPrevious: bool(dist.returnToPrevious, DEFAULT_DISTRIBUTION.returnToPrevious),
      bySource,
    },
    appointments: { requireApproval: bool(rec(r.appointments).requireApproval, false) },
    workHours: {
      enabled: bool(wh.enabled, false),
      days: days.length ? days : DEFAULT_WORK_HOURS.days,
      start,
      end: end > start ? end : DEFAULT_WORK_HOURS.end,
    },
    tiers: r.tiers === undefined ? DEFAULT_TIERS.map((t) => ({ ...t })) : sanitizeTiers(r.tiers),
    afterSales: {
      enabled: bool(after.enabled, false),
      steps: steps.length ? steps : DEFAULT_AFTER_SALES.steps,
      assignTo: typeof after.assignTo === 'string' ? after.assignTo.slice(0, 100) : '',
    },
    statuses: sanitizeCatalog(r.statuses),
    notifyAssignEmail: bool(r.notifyAssignEmail, true),
    care: careSettings(r.care),
    websiteLeads: r.websiteLeads === 'CRM2' ? 'CRM2' : 'LEGACY',
    zaloLeads: r.zaloLeads === 'CRM2' ? 'CRM2' : 'LEGACY',
    facebookLeads: r.facebookLeads === 'CRM2' ? 'CRM2' : 'LEGACY',
    adsLeads: r.adsLeads === 'CRM2' ? 'CRM2' : 'LEGACY',
  };
}
