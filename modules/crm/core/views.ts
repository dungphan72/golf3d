/** Saved filters of the lead list ("chế độ xem lưu"): a person's own shortcuts. Pure: no I/O. */

export type LeadView = { id: string; name: string; stage: string; q: string };
export const MAX_VIEWS = 12;

const STAGES = ['', 'NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'VISITED', 'DEPOSITED', 'WON', 'LOST'];

/** Cleans what was stored or posted: unknown stage -> all, long text cut, repeats of an id dropped, at most 12 views. */
export function sanitizeViews(raw: unknown): LeadView[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: LeadView[] = [];
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.slice(0, 40) : '';
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 40) : '';
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      stage: typeof r.stage === 'string' && STAGES.includes(r.stage) ? r.stage : '',
      q: typeof r.q === 'string' ? r.q.trim().slice(0, 100) : '',
    });
    if (out.length >= MAX_VIEWS) break;
  }
  return out;
}

/** Adds a view; a view with the same name (any case) is replaced so saving again updates it. */
export function addView(views: LeadView[], view: Omit<LeadView, 'id'>, id: string): LeadView[] {
  const name = view.name.trim().slice(0, 40);
  const kept = views.filter((v) => v.name.toLowerCase() !== name.toLowerCase());
  return sanitizeViews([...kept, { ...view, name, id }]);
}
