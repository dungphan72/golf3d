import { getAuth, sendResult, httpError } from '../../../auth-session';
import { db } from '../../../../lib/server/common';
import { permissionsOf } from '../../../../lib/auth/permissions';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getAuth();
  if (!auth) return httpError('Chưa đăng nhập', 401);
  // A platform-identified owner without a password login is offered a one-time setup.
  const needsPassword =
    auth.via === 'sites' &&
    !(await db()
      .prepare("SELECT 1 AS x FROM memberships WHERE tenant=? AND role='owner'")
      .bind(auth.tenant)
      .first());
  return sendResult({
    status: 200,
    body: {
      name: auth.name,
      email: auth.email,
      role: auth.role,
      via: auth.via,
      mustChange: auth.mustChange,
      needsPassword,
      permissions: permissionsOf(auth.role),
    },
  });
}
