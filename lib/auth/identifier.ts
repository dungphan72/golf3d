import { normalizePhone, validPhone } from '../member.ts';

/** What a staff member typed into the login box: an email, a phone number, or neither. */
export type LoginIdentifier = { kind: 'email'; value: string } | { kind: 'phone'; value: string } | null;

export function loginIdentifier(input: string): LoginIdentifier {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes('@')) return { kind: 'email', value: raw.toLowerCase() };
  const phone = normalizePhone(raw);
  return validPhone(phone) ? { kind: 'phone', value: phone } : null;
}
