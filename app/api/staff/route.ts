import { z } from 'zod';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  setStaffPermissions,
} from '../../../lib/server/auth-service';
import { PERMISSIONS, ROLES, permissionsOf } from '../../../lib/auth/permissions';
import { authorize, sendResult, httpError, sameOrigin } from '../../auth-session';
export const dynamic = 'force-dynamic';

const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('permissions'),
    userId: z.string().min(1).max(100),
    expectedRole: z.enum(ROLES),
    permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length).nullable(),
  }).strict(),
  z.object({
    action: z.literal('create'),
    email: z.string().max(200),
    phone: z.string().max(30).optional(),
    name: z.string().max(100),
    role: z.string().max(20),
  }),
  z.object({
    action: z.literal('update'),
    userId: z.string().max(100),
    name: z.string().max(100).optional(),
    role: z.string().max(20).optional(),
    active: z.boolean().optional(),
    phone: z.string().max(30).optional(),
  }),
  z.object({ action: z.literal('reset'), userId: z.string().max(100) }),
  z.object({ action: z.literal('delete'), userId: z.string().max(100) }),
]);

export async function GET() {
  const { auth, response } = await authorize('staff.manage');
  if (response) return response;
  return sendResult({ status: 200, body: { staff: await listStaff(auth.tenant), actor: {
    userId: auth.userId, role: auth.role, permissions: permissionsOf(auth),
  } } });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('staff.manage');
  if (response) return response;
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 5000) return httpError('Yêu cầu quá lớn', 413);
    body = input.parse(JSON.parse(raw));
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  if (body.action === 'create') return sendResult(await createStaff(auth, body));
  if (body.action === 'permissions') return sendResult(await setStaffPermissions(auth, body));
  if (body.action === 'update') return sendResult(await updateStaff(auth, body));
  if (body.action === 'delete') return sendResult(await deleteStaff(auth, body.userId));
  return sendResult(await resetStaffPassword(auth, body.userId));
}
