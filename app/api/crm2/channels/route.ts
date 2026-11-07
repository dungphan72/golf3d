import { z } from 'zod';
import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, reply } from '../../../../modules/crm/server/store';
import { rotateToken, tokenStatus } from '../../../../modules/crm/server/tokens';
import {
  channelStatus,
  emailConfigured,
  zaloConfigured,
  sendEmail,
  sendZalo,
  testFacebookConnection,
} from '../../../../lib/server/providers';
import { outboxSummary } from '../../../../lib/server/outbox-service';
export const dynamic = 'force-dynamic';

const channelAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rotate'), kind: z.enum(['website', 'ads']) }).strict(),
  z.object({
    action: z.literal('test'),
    channel: z.enum(['email', 'zalo', 'facebook']),
    recipient: z.string().trim().max(200).optional(),
  }).strict(),
]);

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

  const parsed = channelAction.safeParse(body);
  if (!parsed.success) return fail('Thông tin chưa hợp lệ');
  const d = parsed.data;

  if (d.action === 'rotate') {
    return reply({ ok: true, token: await rotateToken(c.tenant, d.kind) });
  }

  if (d.action === 'test') {
    if (d.channel === 'email') {
      if (!emailConfigured()) {
        return fail('Chưa cấu hình khóa kết nối Email (RESEND_API_KEY hoặc MAIL_FROM).');
      }
      const to = d.recipient || '';
      if (!to || !to.includes('@')) {
        return fail('Vui lòng nhập email người nhận thử nghiệm hợp lệ.');
      }
      try {
        await sendEmail(
          to,
          '[Saigon Golf 3D] Kiểm tra kết nối Email CRM',
          `Xin chào,\n\nĐây là email kiểm tra kết nối từ hệ thống CRM Saigon Golf 3D lúc ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.\nKết nối gửi tin đang hoạt động tốt.`,
        );
        return reply({ ok: true, message: `Đã gửi thành công email thử nghiệm tới ${to}` });
      } catch (err) {
        return fail(`Gửi email thất bại: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (d.channel === 'zalo') {
      if (!zaloConfigured()) {
        return fail('Chưa cấu hình Zalo OA Token (ZALO_OA_TOKEN).');
      }
      const userId = d.recipient || '';
      if (!userId) {
        return fail('Vui lòng nhập Zalo User ID của người nhận thử nghiệm.');
      }
      try {
        await sendZalo(
          userId,
          `[Saigon Golf 3D] Tin nhắn thử nghiệm kết nối Zalo OA lúc ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Kết nối hoạt động tốt!`,
        );
        return reply({ ok: true, message: `Đã gửi tin nhắn Zalo OA thử nghiệm thành công tới ${userId}` });
      } catch (err) {
        return fail(`Gửi tin Zalo thất bại: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (d.channel === 'facebook') {
      try {
        const info = await testFacebookConnection();
        return reply({ ok: true, message: `Kết nối Facebook Graph API thành công: ${info.name || 'Trang hoạt động'}` });
      } catch (err) {
        return fail(`Kiểm tra Facebook thất bại: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return fail('Yêu cầu không được hỗ trợ');
});
export const GET = route.GET;
export const POST = route.POST;
