import { z } from 'zod';
import {
  listStaff,
  createStaff,
  updateStaff,
  resetStaffPassword,
} from '../../../lib/server/auth-service';
import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
export const dynamic = 'force-dynamic';

const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    email: z.string().max(200),
    name: z.string().max(100),
    role: z.string().max(20),
  }),
  z.object({
    action: z.literal('update'),
    userId: z.string().max(100),
    role: z.string().max(20).optional(),
    active: z.boolean().optional(),
  }),
  z.object({ action: z.literal('reset'), userId: z.string().max(100) }),
]);

export async function GET() {
  const { auth, response } = await authorize('staff.manage');
  if (response) return response;
  return sendResult({ status: 200, body: { staff: await listStaff(auth.tenant) } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('staff.manage');
  if (response) return response;
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (body.action === 'create') return sendResult(await createStaff(auth, body));
  if (body.action === 'update') return sendResult(await updateStaff(auth, body));
  return sendResult(await resetStaffPassword(auth, body.userId));
}
