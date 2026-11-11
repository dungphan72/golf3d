import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import {
  campaignCancel,
  campaignList,
  campaignPreview,
  campaignSend,
} from '../../../../modules/crm/server/campaigns';
import { fail } from '../../../../modules/crm/server/store';
import { CAMPAIGN_CHANNELS, SEGMENTS } from '../../../../modules/crm/core/campaigns';
export const dynamic = 'force-dynamic';

const audience = { channel: z.enum(CAMPAIGN_CHANNELS), segment: z.enum(SEGMENTS) };
const actions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), ...audience }).strict(),
  z
    .object({
      action: z.literal('send'),
      name: z.string().trim().max(100),
      subject: z.string().trim().max(200).default(''),
      body: z.string().trim().max(2000),
      sendAt: z.number().int().nullable().optional(),
      ...audience,
    })
    .strict(),
  z.object({ action: z.literal('cancel'), id: z.string().min(1).max(40) }).strict(),
]);

const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req, body) => {
  if (req.method === 'GET') return campaignList(c);
  const a = actions.safeParse(body);
  if (!a.success) return fail('Thông tin chưa hợp lệ');
  switch (a.data.action) {
    case 'preview':
      return campaignPreview(c, a.data);
    case 'send':
      return campaignSend(c, a.data);
    case 'cancel':
      return campaignCancel(c, a.data.id);
  }
});
export const GET = route.GET;
export const POST = route.POST;
