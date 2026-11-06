import { ingestLead } from './lead-service';
import type { LeadInput } from '../leads';

/** The old CRM's intake, used by the gates while their switch is still on "Màn Chăm sóc KH (cũ)". */
export async function intake(tenant: string, input: LeadInput, base: string, now: number) {
  return ingestLead(tenant, input, base, now);
}
