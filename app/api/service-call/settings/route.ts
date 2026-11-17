import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import {
  getServiceCallSettings,
  updateServiceCallSettings,
  getServiceCallCategories,
} from '../../../../lib/server/service-call-service';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { auth, response } = await authorize('view');
  if (response) return response;

  const [settings, categories] = await Promise.all([
    getServiceCallSettings(auth.tenant),
    getServiceCallCategories(auth.tenant),
  ]);

  return sendResult({
    status: 200,
    body: { ok: true, settings, categories },
  });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('settings.manage');
  if (response) return response;

  let body: any;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { settings } = body;
  if (!settings || typeof settings !== 'object') {
    return httpError('Thiếu dữ liệu cấu hình', 400);
  }

  return sendResult(await updateServiceCallSettings(auth.tenant, settings));
}
