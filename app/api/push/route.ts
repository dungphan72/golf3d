import { z } from 'zod';
import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import { db, ok } from '../../../lib/server/common';
import { vapidKeys } from '../../../lib/server/webpush';
export const dynamic = 'force-dynamic';

/** Staff who handle support requests can receive a phone push for each bell ring. */
export async function GET() {
  const { response } = await authorize('support.handle');
  if (response) return response;
  return sendResult(ok({ publicKey: (await vapidKeys()).publicKey }));
}

const input = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('subscribe'),
      endpoint: z.string().url().max(600),
      p256dh: z.string().min(40).max(200),
      auth: z.string().min(10).max(100),
    })
    .strict(),
  z.object({ action: z.literal('unsubscribe'), endpoint: z.string().url().max(600) }).strict(),
]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('support.handle');
  if (response) return response;
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    const parsed = input.safeParse(JSON.parse(raw));
    if (!parsed.success) return httpError('Dữ liệu không hợp lệ');
    body = parsed.data;
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (body.action === 'unsubscribe') {
    await db()
      .prepare('DELETE FROM push_subscriptions WHERE tenant=? AND endpoint=?')
      .bind(auth.tenant, body.endpoint)
      .run();
    return sendResult(ok());
  }
  await db()
    .prepare('INSERT OR REPLACE INTO push_subscriptions VALUES (?,?,?,?,?,?)')
    .bind(body.endpoint, auth.tenant, auth.userId, body.p256dh, body.auth, Date.now())
    .run();
  return sendResult(ok());
}
