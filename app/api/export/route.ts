import { env } from 'cloudflare:workers';
import { authorize } from '../../auth-session';
import { audit } from '../../../lib/server/common';
export const dynamic = 'force-dynamic';

// Full per-tenant data export (backup and migration source). Read-only; tenant comes from the
// authenticated identity, never from the request.
const TABLES = [
  'settings',
  'bookings',
  'requests',
  'audit',
  'shifts',
  'finance_entries',
  'menu_items',
  'food_orders',
  'stock_items',
  'stock_movements',
  'customers',
  'package_types',
  'customer_packages',
  'package_ledger',
  'package_redemptions',
  'loyalty_ledger',
  'booking_requests',
  'coaches',
  'lessons',
  'bank_transactions',
] as const;
// Tables added by later migrations may not exist yet on an older database.
const OPTIONAL = new Set([
  'customers',
  'package_types',
  'customer_packages',
  'package_ledger',
  'package_redemptions',
  'loyalty_ledger',
  'booking_requests',
  'coaches',
  'lessons',
  'bank_transactions',
]);
const LIMIT = 200_000;

export async function GET() {
  const { auth, response } = await authorize('data.export');
  if (response) return response;
  try {
    const db = env.DB!;
    const data: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      try {
        data[table] = (
          await db
            .prepare(`SELECT * FROM ${table} WHERE tenant=? LIMIT ${LIMIT}`)
            .bind(auth.tenant)
            .all()
        ).results;
      } catch (e) {
        if (!OPTIONAL.has(table)) throw e;
        data[table] = [];
      }
    }
    // Leave a trace: a full export is the most sensitive read in the system.
    await audit(auth.tenant, 'data.export', `${auth.email} (${auth.role}) đã xuất toàn bộ dữ liệu`).catch(
      (e) => console.error('export audit', e),
    );
    const body = JSON.stringify({ format: 'golf3d-export/1', exportedAt: Date.now(), data });
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="golf3d-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    console.error('export', e);
    return Response.json({ error: 'Chưa xuất được dữ liệu' }, { status: 503 });
  }
}
