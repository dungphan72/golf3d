import { z } from 'zod';
import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import { originOf } from '../../../../lib/server/http';
import { channelStatus } from '../../../../lib/server/providers';
import { outboxSummary } from '../../../../lib/server/outbox-service';
import { rotateToken, tokenStatus } from '../../../../modules/crm/server/tokens';
export const dynamic = 'force-dynamic';

/** Which channels run, which need setup, what was sent. Secrets are never returned. */
export async function GET(req: Request) {
  const { auth, response } = await authorize('crm.view');
  if (response) return response;
  const tokens = await tokenStatus(auth.tenant);
  const filter = new URL(req.url).searchParams.get('recipient') ?? '';
  const kind = new URL(req.url).searchParams.get('kind') ?? '';
  const box = (await outboxSummary(auth.tenant, filter.slice(0, 200), kind.slice(0, 40))).body;
  const base = originOf(req);
  return sendResult({
    status: 200,
    body: {
      channels: channelStatus({ websiteToken: tokens.website, adsToken: tokens.ads }),
      tokens,
      urls: {
        website: `${base}/api/leads/website`,
        ads: `${base}/api/leads/ads`,
        facebook: `${base}/api/leads/facebook`,
        zalo: `${base}/api/leads/zalo`,
      },
      ...box,
    },
  });
}

const input = z.object({ action: z.literal('rotate'), kind: z.enum(['website', 'ads']) }).strict();

/** Creates (or replaces) a webhook token; it is shown once and only its hash is kept. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('crm.manage');
  if (response) return response;
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return httpError('Thông tin chưa hợp lệ');
  return sendResult({
    status: 200,
    body: { ok: true, token: await rotateToken(auth.tenant, parsed.data.kind) },
  });
}
