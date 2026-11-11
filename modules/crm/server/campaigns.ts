import { audit, db } from '../../../lib/server/common';
import { cancelPending, enqueue, type Msg } from '../../../lib/server/outbox-service';
import { configuredFor } from '../../../lib/server/providers';
import { isManager } from '../core/access';
import {
  MAX_RECIPIENTS,
  campaignKey,
  campaignKeyPrefix,
  pickRecipients,
  renderCampaign,
  validateCampaign,
  type CampaignChannel,
  type CampaignSegment,
} from '../core/campaigns';
import { campaignContacts } from './care-customers';
import { fail, getRuntime, reply, setRuntime, type Ctx, type Result } from './store';

type Saved = {
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  subject: string;
  body: string;
  sendAt: number;
  by: string;
  created: number;
  queued: number;
  skipped: { noConsent: number; noContact: number };
  cancelled: boolean;
};

const MANAGERS_ONLY = 'Chỉ quản lý dùng được chiến dịch tin nhắn';

/** Recent campaigns with how many messages are waiting, sent, failed or cancelled. */
export async function campaignList(c: Ctx): Promise<Result> {
  if (!isManager(c.role)) return fail(MANAGERS_ONLY, 403);
  const rows = (
    await db()
      .prepare(
        "SELECT key,value FROM crm2_runtime WHERE tenant=? AND key LIKE 'campaign:%' ORDER BY updated DESC LIMIT 20",
      )
      .bind(c.tenant)
      .all<{ key: string; value: string }>()
  ).results;
  const campaigns = [];
  for (const r of rows) {
    const id = r.key.slice(9);
    const v = JSON.parse(r.value) as Saved;
    const stats = (
      await db()
        .prepare('SELECT status,COUNT(*) AS n FROM crm_outbox WHERE tenant=? AND ukey LIKE ? GROUP BY status')
        .bind(c.tenant, campaignKeyPrefix(id) + '%')
        .all<{ status: string; n: number }>()
    ).results;
    campaigns.push({
      id,
      name: v.name,
      channel: v.channel,
      segment: v.segment,
      sendAt: v.sendAt,
      created: v.created,
      queued: v.queued,
      skipped: v.skipped,
      cancelled: v.cancelled,
      stats: Object.fromEntries(stats.map((s) => [s.status, s.n])),
    });
  }
  return reply({ campaigns });
}

type Input = {
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  subject: string;
  body: string;
  sendAt?: number | null;
};

/** How many people a campaign would reach, and why others are left out. Changes nothing. */
export async function campaignPreview(
  c: Ctx,
  i: Pick<Input, 'channel' | 'segment'>,
): Promise<Result> {
  if (!isManager(c.role)) return fail(MANAGERS_ONLY, 403);
  const { recipients, skipped } = pickRecipients(await campaignContacts(c), i.segment, i.channel);
  return reply({ ok: true, recipients: recipients.length, skipped, configured: configuredFor(i.channel) });
}

export async function campaignSend(c: Ctx, i: Input): Promise<Result> {
  if (!isManager(c.role)) return fail(MANAGERS_ONLY, 403);
  const problem = validateCampaign(i);
  if (problem) return fail(problem);
  const sendAt = i.sendAt && i.sendAt > c.now ? i.sendAt : c.now;
  if (sendAt > c.now + 90 * 86_400_000) return fail('Chỉ đặt lịch gửi trong vòng 90 ngày');
  const { recipients, skipped } = pickRecipients(await campaignContacts(c), i.segment, i.channel);
  if (!recipients.length)
    return fail('Không có khách nào đủ điều kiện nhận tin (cần đồng ý nhận tin và có liên lạc)');
  if (recipients.length > MAX_RECIPIENTS) return fail(`Tối đa ${MAX_RECIPIENTS} người mỗi chiến dịch`);
  const id = crypto.randomUUID().slice(0, 8);
  const msgs: Msg[] = recipients.map((r) => ({
    ukey: campaignKey(id, r.id, i.channel),
    channel: i.channel,
    recipient: i.channel === 'email' ? r.email : r.zalo_id,
    subject: renderCampaign(i.subject, r),
    body: renderCampaign(i.body, r),
    kind: 'campaign',
    audience: 'customer',
    customerId: r.id,
    sendAt,
  }));
  const queued = await enqueue(c.tenant, msgs, c.now);
  const saved: Saved = {
    name: i.name.trim().slice(0, 100),
    channel: i.channel,
    segment: i.segment,
    subject: i.subject.trim(),
    body: i.body.trim(),
    sendAt,
    by: c.userId,
    created: c.now,
    queued,
    skipped,
    cancelled: false,
  };
  await setRuntime(c.tenant, `campaign:${id}`, saved, c.now);
  await audit(
    c.tenant,
    'crm.campaign',
    `Chiến dịch "${saved.name}" (${i.channel}, ${i.segment}): xếp hàng ${queued} tin`,
  );
  return reply({ ok: true, id, queued, skipped, configured: configuredFor(i.channel) });
}

/** Stops the messages of a campaign that have not gone out yet. */
export async function campaignCancel(c: Ctx, id: string): Promise<Result> {
  if (!isManager(c.role)) return fail(MANAGERS_ONLY, 403);
  const saved = await getRuntime<Saved>(c.tenant, `campaign:${id}`);
  if (!saved) return fail('Không tìm thấy chiến dịch', 404);
  if (saved.value.cancelled) return fail('Chiến dịch đã được hủy', 409);
  await cancelPending(c.tenant, campaignKeyPrefix(id));
  await setRuntime(c.tenant, `campaign:${id}`, { ...saved.value, cancelled: true }, c.now);
  await audit(c.tenant, 'crm.campaign-cancel', `Hủy chiến dịch "${saved.value.name}": các tin chưa gửi bị dừng`);
  return reply({ ok: true });
}
