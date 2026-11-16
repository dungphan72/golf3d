import { z } from 'zod';
import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
import {
  createLegacyBill,
  listLegacyBills,
  reviewLegacyBill,
  updateLegacyBill,
  withdrawLegacyBill,
} from '../../../lib/server/legacy-bill-service';
export const dynamic = 'force-dynamic';

const line = z.object({
  name: z.string().max(120),
  qty: z.number().int().min(1).max(10_000),
  price: z.number().int().min(0).max(1_000_000_000),
  fnb: z.boolean().optional(),
});
const billFields = {
  date: z.string().max(10),
  time: z.string().max(5),
  code: z.string().max(40).optional(),
  customer: z.string().max(100),
  phone: z.string().max(30).optional(),
  room: z.string().max(40).optional(),
  service: z.string().max(10),
  lines: z.array(line).max(50),
  method: z.string().max(10),
  note: z.string().max(500).optional(),
};
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), ...billFields }),
  z.object({ action: z.literal('update'), id: z.string().max(60), ...billFields }),
  z.object({
    action: z.literal('review'),
    id: z.string().max(60),
    decision: z.enum(['approve', 'reject', 'revoke']),
    note: z.string().max(300).optional(),
  }),
  z.object({ action: z.literal('withdraw'), id: z.string().max(60) }),
]);

export async function GET(req: Request) {
  // Anyone who may enter bills, and the owner, can see the list.
  const { auth, response } = await authorize('legacy.enter');
  if (response) return response;
  const q = new URL(req.url).searchParams;
  const before = Number(q.get('before'));
  return sendResult(
    await listLegacyBills(auth, q.get('status'), Number.isFinite(before) && before > 0 ? before : null),
  );
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('legacy.enter');
  if (response) return response;
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (body.action === 'create') return sendResult(await createLegacyBill(auth, body));
  if (body.action === 'update') return sendResult(await updateLegacyBill(auth, body.id, body));
  if (body.action === 'review') return sendResult(await reviewLegacyBill(auth, body));
  return sendResult(await withdrawLegacyBill(auth, body.id));
}
