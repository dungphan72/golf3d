/** Bulk message campaigns: who gets a message and what it says. Pure: no I/O. */

export const SEGMENTS = ['all', 'new', 'loyal', 'vip', 'lapsing', 'dormant', 'idle'] as const;
export type CampaignSegment = (typeof SEGMENTS)[number];
export const SEGMENT_NAMES: Record<CampaignSegment, string> = {
  all: 'Tất cả khách',
  new: 'Khách mới',
  loyal: 'Thân thiết',
  vip: 'VIP',
  lapsing: 'Sắp rời bỏ',
  dormant: 'Ngủ đông',
  idle: 'Chưa chơi',
};
export const CAMPAIGN_CHANNELS = ['email', 'zalo'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
export const MAX_RECIPIENTS = 2000;

export type Contact = {
  id: string;
  name: string;
  email: string;
  zalo_id: string;
  marketing_consent: number;
  segments: string[];
};

/**
 * Customers a campaign reaches: in the segment, agreed to marketing messages, and reachable on the channel.
 * The ones left out are counted so the manager sees why the audience is smaller than the segment.
 */
export function pickRecipients(contacts: Contact[], segment: CampaignSegment, channel: CampaignChannel) {
  const recipients: Contact[] = [];
  let noConsent = 0;
  let noContact = 0;
  for (const c of contacts) {
    if (segment !== 'all' && !c.segments.includes(segment)) continue;
    if (!c.marketing_consent) {
      noConsent++;
      continue;
    }
    if (!(channel === 'email' ? c.email.trim() : c.zalo_id.trim())) {
      noContact++;
      continue;
    }
    recipients.push(c);
  }
  return { recipients, skipped: { noConsent, noContact } };
}

/** Fills {ten} (first word after the family name is the usual way to greet in Vietnamese: we use the full name). */
export const renderCampaign = (text: string, c: { name: string }) =>
  text.replace(/\{ten\}/g, c.name.trim() || 'bạn');

/** One message per campaign, customer and channel, even if the send runs twice. */
export const campaignKey = (campaignId: string, customerId: string, channel: string) =>
  `camp:${campaignId}:${customerId}:${channel}`;
export const campaignKeyPrefix = (campaignId: string) => `camp:${campaignId}:`;

export function validateCampaign(i: {
  name: string;
  channel: string;
  segment: string;
  subject: string;
  body: string;
}): string | null {
  if (i.name.trim().length < 2) return 'Hãy đặt tên chiến dịch';
  if (!(CAMPAIGN_CHANNELS as readonly string[]).includes(i.channel)) return 'Kênh gửi không hợp lệ';
  if (!(SEGMENTS as readonly string[]).includes(i.segment)) return 'Nhóm khách không hợp lệ';
  if (i.body.trim().length < 5) return 'Nội dung tin quá ngắn';
  if (i.channel === 'email' && i.subject.trim().length < 3) return 'Email cần có tiêu đề';
  return null;
}
