/** Maps a message a customer sent to the Zalo Official Account onto the CRM module's inquiry. Pure: no I/O. */
import type { LeadInput } from '../../../lib/leads.ts';

export type ChatInquiry = {
  fullName: string;
  phone: string;
  notes: string;
  source: string;
  targetService: string;
};

const SERVICES: Record<string, string> = {
  swing: 'Luyện swing',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
  group: 'Nhóm / sự kiện',
};

/**
 * `ev` is what the old gate already read from the webhook (sender id, text, a number typed in the text).
 * Zalo gives no name, so the lead is named after the last digits of the Zalo id; the full id stays in the notes
 * because it is the only way to find that customer again in the Official Account.
 */
export function zaloInquiry(
  ev: Pick<LeadInput, 'zaloId' | 'phone' | 'need' | 'message'>,
): ChatInquiry {
  return {
    fullName: `Khách Zalo ${ev.zaloId.slice(-4)}`,
    phone: ev.phone,
    notes: [ev.message, `Zalo ID: ${ev.zaloId}`].filter(Boolean).join('\n').slice(0, 2000),
    source: 'Zalo OA',
    targetService: SERVICES[ev.need] ?? '',
  };
}
