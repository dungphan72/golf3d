import { db, type ServiceResult } from './common';

const PAGE = 200;

/** Newest-first activity log for the cabinet (written by database triggers and services). */
export async function auditLog(
  tenant: string,
  before: number | null,
  search: string,
): Promise<ServiceResult> {
  const term = search.trim().slice(0, 60);
  try {
    const rows = (
      await db()
        .prepare(
          `SELECT id,action,detail,created FROM audit WHERE tenant=? AND created<? AND (?='' OR action LIKE ? ESCAPE '!' OR detail LIKE ? ESCAPE '!') ORDER BY created DESC,id DESC LIMIT ${PAGE + 1}`,
        )
        .bind(tenant, before ?? Number.MAX_SAFE_INTEGER, term, like(term), like(term))
        .all<{ id: string; action: string; detail: string; created: number }>()
    ).results;
    return { status: 200, body: { rows: rows.slice(0, PAGE), hasMore: rows.length > PAGE } };
  } catch (e) {
    console.error('audit log', e);
    return { status: 500, body: { error: 'Chưa tải được nhật ký' } };
  }
}
const like = (term: string) => '%' + term.replace(/[!%_]/g, (c) => '!' + c) + '%';
