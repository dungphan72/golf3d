import { ingestLead } from './lead-service';
import { getSettings } from '../../modules/crm/server/store';
import { ingestWebsiteLead } from '../../modules/crm/server/leads';
import type { LeadInput } from '../leads';

export type WebsiteLeadInput = {
  name: string;
  phone: string;
  email: string;
  need: LeadInput['need'];
  guests: number;
  preferredStart: number | null;
  message: string;
  campaign: string;
  /** Same key twice = same lead (a retry never creates a second one). */
  extKey: string;
  consent: boolean;
};

/** Hands a website inquiry to whichever CRM is switched on (the new module or the old one). Never throws. */
export async function sendWebsiteLead(
  tenant: string,
  lead: WebsiteLeadInput,
  base: string,
  now: number,
) {
  try {
    if ((await getSettings(tenant)).websiteLeads === 'CRM2')
      await ingestWebsiteLead(
        tenant,
        {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          need: lead.need,
          guests: lead.guests,
          preferredStart: lead.preferredStart ?? undefined,
          message: lead.message,
          campaign: lead.campaign,
          consent: lead.consent,
        },
        base,
        now,
      );
    else
      await ingestLead(
        tenant,
        {
          source: 'website',
          campaign: lead.campaign,
          extKey: lead.extKey,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          zaloId: '',
          need: lead.need,
          guests: lead.guests,
          preferredStart: lead.preferredStart,
          message: lead.message,
          consent: lead.consent,
          channelRef: '',
        },
        base,
        now,
      );
  } catch (e) {
    console.error('website lead', e);
  }
}
