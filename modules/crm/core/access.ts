/**
 * Who may see and change what. The CRM uses the app's roles: owner and manager see everything;
 * sale, cskh and cashier see their own leads plus the unassigned pool (phone masked).
 */
import { maskPhone } from './phone.ts';

export type Actor = { id: string; role: string };
export const isManager = (role: string) => role === 'owner' || role === 'manager';
export const isOwner = (role: string) => role === 'owner';

export type LeadAccess = { owner: string | null };
export const canSeeLead = (a: Actor, lead: LeadAccess) =>
  isManager(a.role) || lead.owner === a.id || lead.owner == null;
export const canEditLead = (a: Actor, lead: LeadAccess) => isManager(a.role) || lead.owner === a.id;
/** Only managers hand leads over; staff may only claim a lead nobody owns. */
export const canAssign = (a: Actor) => isManager(a.role);
export const canClaim = (a: Actor, lead: LeadAccess) => lead.owner == null && !!a.id;
/** Sensitive money actions: deposits, payments, cancelling, discounts. */
export const canHandleMoney = (a: Actor) => isManager(a.role);

export type Maskable = {
  owner: string | null;
  phone: string;
  email?: string | null;
  notes?: string | null;
};
/** Hides contact details of unowned leads from staff who are not managers (done in the API). */
export function maskForViewer<T extends Maskable>(a: Actor, lead: T): T & { masked: boolean } {
  if (isManager(a.role) || lead.owner != null) return { ...lead, masked: false };
  return { ...lead, phone: maskPhone(lead.phone), email: '', notes: '', masked: true };
}
