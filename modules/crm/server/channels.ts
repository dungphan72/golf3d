import { db } from '../../../lib/server/common';
import type { LeadInput } from '../../../lib/leads';
import { zaloInquiry } from '../core/zalo';
import { absorbInquiry, ingestLead, LEAD_COLS, type IntakeInput, type LeadRow } from './leads';
import { getSettings } from './store';

/** What the webhook callers (website, Zalo, ...) are told: same shape as the old CRM's answer. */
export type ChannelResult = { leadId: string; duplicate: boolean; status: 'assigned' | 'queued' };

const DAY = 86_400_000;

async function ownerOf(tenant: string, leadId: string) {
  const row = await db()
    .prepare('SELECT owner FROM crm2_leads WHERE tenant=? AND id=?')
    .bind(tenant, leadId)
    .first<{ owner: string | null }>();
  return row?.owner ?? null;
}

/**
 * An inquiry that arrives from a chat channel. The provider retries a webhook that looked like it failed, so every event
 * is remembered by its id and a repeat is answered without doing anything. The customer is recognised by what the channel
 * knows (`channelRef`, for Zalo `zalo:<user id>`) because chat customers often have no phone number: while that
 * customer has an open lead, new messages join it instead of opening a second one.
 */
export async function ingestChannelLead(
  tenant: string,
  ch: { extKey: string; channelRef: string },
  i: IntakeInput,
  base: string,
  now: number,
): Promise<ChannelResult> {
  const d = db();
  const seen = await d
    .prepare('SELECT lead_id FROM crm2_inbound WHERE tenant=? AND ext_key=?')
    .bind(tenant, ch.extKey)
    .first<{ lead_id: string }>();
  if (seen)
    return {
      leadId: seen.lead_id,
      duplicate: true,
      status: (await ownerOf(tenant, seen.lead_id)) ? 'assigned' : 'queued',
    };

  let leadId = '';
  let owner: string | null = null;
  let duplicate = false;
  const open = ch.channelRef
    ? await d
        .prepare(
          `SELECT ${LEAD_COLS} FROM crm2_leads WHERE tenant=? AND channel_ref=? AND stage<>'WON' AND created>? ORDER BY created DESC LIMIT 1`,
        )
        .bind(tenant, ch.channelRef, now - 365 * DAY)
        .first<LeadRow>()
    : null;
  if (open) {
    await absorbInquiry(tenant, open, i, await getSettings(tenant), base, now, 'chat');
    leadId = open.id;
    owner = open.owner;
    duplicate = true;
  } else {
    const r = await ingestLead(tenant, i, base, now, 'chat');
    const b = r.body as { id?: string; duplicate?: boolean; owner?: string | null };
    leadId = b.id ?? ''; // a blocked number is dropped without telling the sender
    owner = b.owner ?? (leadId ? await ownerOf(tenant, leadId) : null);
    duplicate = b.duplicate === true;
    if (leadId && ch.channelRef)
      await d
        .prepare("UPDATE crm2_leads SET channel_ref=? WHERE tenant=? AND id=? AND channel_ref=''")
        .bind(ch.channelRef, tenant, leadId)
        .run();
  }
  // Recorded last on purpose: if anything above failed the provider's retry is processed, not swallowed.
  if (leadId)
    await d
      .prepare(
        'INSERT OR IGNORE INTO crm2_inbound(tenant,ext_key,lead_id,created) VALUES (?,?,?,?)',
      )
      .bind(tenant, ch.extKey, leadId, now)
      .run();
  return { leadId, duplicate, status: owner ? 'assigned' : 'queued' };
}

/** A customer wrote to the Zalo Official Account (the old gate has already checked the signature and read the event). */
export function ingestZaloLead(tenant: string, ev: LeadInput, base: string, now: number) {
  return ingestChannelLead(
    tenant,
    { extKey: ev.extKey, channelRef: ev.channelRef },
    zaloInquiry(ev),
    base,
    now,
  );
}
