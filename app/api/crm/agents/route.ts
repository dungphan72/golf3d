import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import { originOf, requestNow } from '../../../../lib/server/http';
import { agentInput } from '../../../../lib/leads';
import { loadAgents, setAgent } from '../../../../lib/server/lead-service';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { auth, response } = await authorize('crm.view');
  if (response) return response;
  const r = await loadAgents(auth.tenant);
  return sendResult({ ...r, body: { ...r.body, me: auth.userId } });
}

/** Staff switch their own duty; managers set who receives leads and everyone's contact details. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('crm.work');
  if (response) return response;
  let json: unknown;
  try {
    json = JSON.parse(await req.text());
  } catch {
    return httpError('Dữ liệu không hợp lệ');
  }
  const parsed = agentInput.safeParse(json);
  if (!parsed.success) return httpError('Thông tin chưa hợp lệ');
  return sendResult(
    await setAgent(
      auth.tenant,
      { id: auth.userId, role: auth.role },
      parsed.data,
      originOf(req),
      requestNow(req),
    ),
  );
}
