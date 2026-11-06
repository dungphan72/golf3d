import { z } from 'zod';
import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import { requestNow } from '../../../../lib/server/http';
import { checkAvailability } from '../../../../lib/server/lead-service';
export const dynamic = 'force-dynamic';

const input = z
  .object({
    service: z.enum(['gdr', '9', '18']),
    start: z.number().int(),
    guests: z.number().int().min(1).max(1000),
    vip: z.boolean().default(false),
  })
  .strict();

/** Free rooms, a quote and nearby slots for what the customer asked. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('crm.work');
  if (response) return response;
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return httpError('Thông tin chưa hợp lệ');
  const r = await checkAvailability(auth.tenant, parsed.data, requestNow(req));
  if (!r.ok) return httpError(r.error, 409);
  return sendResult({ status: 200, body: r });
}
