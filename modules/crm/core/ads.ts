/** Maps a lead posted by an ad platform or an automation tool (POST /api/leads/ads) onto the CRM module's inquiry. Pure. */
import { toInquiry, type WebsiteInquiry, type WebsiteLead } from './website.ts';

/** The website payload plus `source`: the platform that posted it (tiktok, google, zapier, ...). */
export type AdsLead = WebsiteLead & { source: string };

/**
 * Read exactly like a website form. The platform's name is the campaign when the sender gave none (the old CRM did the
 * same), and the lead's source is "Quảng cáo" so ad leads can be told apart from the website's.
 */
export function adsInquiry(raw: AdsLead): WebsiteInquiry {
  const { source, ...rest } = raw;
  return { ...toInquiry({ ...rest, campaign: rest.campaign || source }), source: 'Quảng cáo' };
}
