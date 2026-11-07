import { env } from 'cloudflare:workers';
import { facebookSignatureValid, zaloSignatureValid } from '../signature';

/**
 * Outbound and inbound channels. Everything here is configured with Worker secrets (never stored in
 * the database), and `channelStatus()` reports honestly which channels can run and what is missing.
 * With E2E_MOCK_CHANNELS=1 (test server only) sending succeeds without any network call.
 */
const e = (key: string) => String((env as unknown as Record<string, unknown>)[key] ?? '').trim();
export const mockChannels = () => e('E2E_MOCK_CHANNELS') === '1';

export type ChannelStatus = {
  id: string;
  label: string;
  direction: 'in' | 'out';
  configured: boolean;
  /** Missing settings, shown to the manager. */
  needs: string[];
  note: string;
};

export function channelStatus(extra: {
  websiteToken: boolean;
  adsToken: boolean;
}): ChannelStatus[] {
  const missing = (keys: string[]) => keys.filter((k) => !e(k));
  const mock = mockChannels();
  const row = (
    id: string,
    label: string,
    direction: 'in' | 'out',
    keys: string[],
    note: string,
    force = false,
  ): ChannelStatus => {
    const needs = missing(keys);
    return {
      id,
      label,
      direction,
      configured: force || mock || !needs.length,
      needs: force || mock ? [] : needs,
      note,
    };
  };
  return [
    {
      id: 'website-form',
      label: 'Form đặt lịch trên website này',
      direction: 'in',
      configured: true,
      needs: [],
      note: 'Chạy sẵn: mỗi yêu cầu đặt lịch thành một lead.',
    },
    {
      id: 'website-3dgolf',
      label: 'Form website 3dgolf.vn',
      direction: 'in',
      configured: extra.websiteToken || mock,
      needs:
        extra.websiteToken || mock ? [] : ['Tạo mã webhook "Website" trong tab Kênh & tích hợp'],
      note: 'POST JSON tới /api/leads/website kèm header x-lead-token.',
    },
    {
      id: 'ads-forms',
      label: 'Form quảng cáo (Google, TikTok, Zapier, Make…)',
      direction: 'in',
      configured: extra.adsToken || mock,
      needs: extra.adsToken || mock ? [] : ['Tạo mã webhook "Quảng cáo" trong tab Kênh & tích hợp'],
      note: 'POST JSON tới /api/leads/ads kèm header x-lead-token.',
    },
    row(
      'facebook-in',
      'Facebook Lead Ads (webhook)',
      'in',
      ['FB_VERIFY_TOKEN', 'FB_APP_SECRET', 'FB_PAGE_TOKEN'],
      'Webhook /api/leads/facebook; FB_PAGE_TOKEN để lấy chi tiết form.',
    ),
    row(
      'zalo-in',
      'Zalo OA (tin nhắn đến)',
      'in',
      ['ZALO_APP_ID', 'ZALO_APP_SECRET'],
      'Webhook /api/leads/zalo, ký bằng ZALO_APP_SECRET.',
    ),
    row(
      'email-out',
      'Gửi email (nhân viên, khách)',
      'out',
      ['RESEND_API_KEY', 'MAIL_FROM'],
      'Gửi qua Resend.',
    ),
    row(
      'zalo-out',
      'Gửi Zalo OA (nhân viên, khách)',
      'out',
      ['ZALO_OA_TOKEN'],
      'Gửi tin tư vấn qua Zalo OA tới người đã nhắn OA.',
    ),
  ];
}

export const emailConfigured = () => mockChannels() || (!!e('RESEND_API_KEY') && !!e('MAIL_FROM'));
export const zaloConfigured = () => mockChannels() || !!e('ZALO_OA_TOKEN');
export const configuredFor = (channel: string) =>
  channel === 'email' ? emailConfigured() : channel === 'zalo' ? zaloConfigured() : false;

export const secret = (key: string) => e(key);

/** Facebook signs the raw body with the app secret. */
export const facebookSignatureOk = (
  rawBody: string,
  header: string | null,
  appSecret = e('FB_APP_SECRET'),
) => facebookSignatureValid(rawBody, header, appSecret);
/** Zalo OA signs sha256(appId + body + timestamp + secret). */
export const zaloSignatureOk = (
  rawBody: string,
  header: string | null,
  timestamp: string,
  appId = e('ZALO_APP_ID'),
  appSecret = e('ZALO_APP_SECRET'),
) => zaloSignatureValid(rawBody, header, timestamp, appId, appSecret);

type Fetcher = typeof fetch;
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  fetcher: Fetcher = fetch,
) {
  if (mockChannels()) return;
  const r = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${e('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: e('MAIL_FROM'), to: [to], subject, text }),
  });
  if (!r.ok) throw new Error(`Email lỗi ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
export async function sendZalo(userId: string, text: string, fetcher: Fetcher = fetch) {
  if (mockChannels()) return;
  const r = await fetcher('https://openapi.zalo.me/v3.0/oa/message/cs', {
    method: 'POST',
    headers: { access_token: e('ZALO_OA_TOKEN'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
  });
  const v = (await r.json().catch(() => ({}))) as { error?: number; message?: string };
  if (!r.ok || (v.error ?? 0) !== 0)
    throw new Error(`Zalo lỗi ${v.error ?? r.status}: ${v.message ?? ''}`.slice(0, 200));
}

/** Facebook Graph API: the fields of a lead form submission. */
export async function fetchFacebookLead(leadgenId: string, fetcher: Fetcher = fetch) {
  const token = e('FB_PAGE_TOKEN');
  if (!token) return null;
  const r = await fetcher(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}?fields=field_data,ad_id,form_id,created_time,campaign_name&access_token=${encodeURIComponent(token)}`,
  );
  if (!r.ok) throw new Error(`Facebook lỗi ${r.status}`);
  return (await r.json()) as {
    field_data?: { name?: string; values?: unknown[] }[];
    ad_id?: string;
    form_id?: string;
    campaign_name?: string;
    created_time?: string;
  };
}

export async function testFacebookConnection(fetcher: Fetcher = fetch) {
  if (mockChannels()) return { ok: true, name: 'Facebook Test Page' };
  const token = e('FB_PAGE_TOKEN');
  if (!token) throw new Error('Chưa cấu hình FB_PAGE_TOKEN');
  const r = await fetcher(
    `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
  );
  if (!r.ok) throw new Error(`Facebook API lỗi ${r.status}: ${(await r.text()).slice(0, 100)}`);
  return (await r.json()) as { id?: string; name?: string };
}
