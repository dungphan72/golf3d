import { z } from 'zod';
import { sessionToken, sendResult, httpError } from '../../../auth-session';
import { switchSessionTenant } from '../../../../lib/server/auth-service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  tenant: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const token = await sessionToken();
  if (!token) return httpError('Vui lòng đăng nhập', 401);

  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return httpError('Dữ liệu cơ sở không hợp lệ', 400);

  const res = await switchSessionTenant(token, parsed.data.tenant);
  return sendResult(res);
}
