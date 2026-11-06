/** Maps a Facebook / Instagram lead form submission onto the CRM module's inquiry. Pure: no I/O. */
import type { LeadInput } from '../../../lib/leads.ts';
import { serviceOf } from './services.ts';

export type FormInquiry = {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  source: string;
  targetService: string;
};

/**
 * `ev` is what the old gate already read from the form (`fromFacebookFields`). The campaign and the form's id have no
 * field of their own, so they go into the notes: the id is how to find the lead again in Facebook's Lead Center.
 */
export function facebookInquiry(
  ev: Pick<LeadInput, 'name' | 'phone' | 'email' | 'need' | 'message' | 'campaign' | 'channelRef'>,
): FormInquiry {
  const formId = ev.channelRef.replace(/^facebook-lead:/, '');
  return {
    fullName: ev.name,
    phone: ev.phone,
    email: ev.email,
    notes: [
      ev.message,
      ev.campaign ? `Chiến dịch: ${ev.campaign}` : '',
      formId ? `Facebook lead: ${formId}` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000),
    source: 'Facebook',
    targetService: serviceOf(ev.need),
  };
}
