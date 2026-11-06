import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, reply } from '../../../../modules/crm/server/store';
import { rotateToken, tokenStatus } from '../../../../modules/crm/server/tokens';
import { channelStatus } from '../../../../lib/server/providers';
import { outboxSummary } from '../../../../lib/server/outbox-service';
export const dynamic = 'force-dynamic';

const rotate = z.object({ action: z.literal('rotate'), kind: z.enum(['website', 'ads']) }).strict();

/**
 * Managers only: which channels run and what they still need, the webhook addresses, and what was sent. Secrets are never
 * returned; a webhook token is shown once, when it is created.
 */
const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req, body) => {
  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams;
    const tokens = await tokenStatus(c.tenant);
    const box = (
      await outboxSummary(
        c.tenant,
        (q.get('recipient') ?? '').slice(0, 200),
        (q.get('kind') ?? '').slice(0, 40),
      )
    ).body;
    return reply({
      channels: channelStatus({ websiteToken: tokens.website, adsToken: tokens.ads }),
      tokens,
      urls: {
        website: `${c.base}/api/leads/website`,
        ads: `${c.base}/api/leads/ads`,
        facebook: `${c.base}/api/leads/facebook`,
        zalo: `${c.base}/api/leads/zalo`,
      },
      ...box,
    });
  }
  const parsed = rotate.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  return reply({ ok: true, token: await rotateToken(c.tenant, parsed.data.kind) });
});
export const GET = route.GET;
export const POST = route.POST;
