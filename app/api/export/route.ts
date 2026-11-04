import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
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
] as const;
const LIMIT = 200_000;

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  try {
    const db = env.DB!;
    const data: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      data[table] = (
        await db
          .prepare(`SELECT * FROM ${table} WHERE tenant=? LIMIT ${LIMIT}`)
          .bind(user.userId)
          .all()
      ).results;
    }
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
