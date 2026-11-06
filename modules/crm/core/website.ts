/** Maps a lead posted by the website form (POST /api/leads/website) onto the CRM module's inquiry. Pure: no I/O. */
import { needFromText, phoneInText } from '../../../lib/leads.ts';
import { normalizePhone } from './phone.ts';

export type WebsiteLead = {
  name: string;
  phone: string;
  email: string;
  need: string;
  guests: number;
  preferredStart?: number;
  message: string;
  campaign: string;
  consent: boolean;
};

export type WebsiteInquiry = {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  source: string;
  targetService: string;
  preferredDate: string;
  preferredTime: string;
};

const SERVICES: Record<string, string> = {
  swing: 'Luyện swing',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
  group: 'Nhóm / sự kiện',
};
const VN_OFFSET = 7 * 3_600_000;

/** Same reading of the form as the old CRM: the typed number, else one found in the message. */
export function toInquiry(raw: WebsiteLead): WebsiteInquiry {
  const phone = normalizePhone(raw.phone) || phoneInText(raw.message);
  const need = SERVICES[raw.need] ? raw.need : needFromText(raw.message);
  const when =
    raw.preferredStart != null && Number.isFinite(raw.preferredStart)
      ? new Date(raw.preferredStart + VN_OFFSET).toISOString()
      : '';
  // The module has no fields for these, so they travel in the notes where staff will read them.
  const notes = [
    raw.message,
    raw.guests > 0 ? `Số khách: ${raw.guests}` : '',
    raw.campaign ? `Chiến dịch: ${raw.campaign}` : '',
    raw.consent ? 'Khách đồng ý nhận tin ưu đãi' : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);
  return {
    fullName: raw.name,
    phone,
    email: raw.email,
    notes,
    source: 'Website',
    targetService: SERVICES[need] ?? '',
    preferredDate: when.slice(0, 10),
    preferredTime: when.slice(11, 16),
  };
}
