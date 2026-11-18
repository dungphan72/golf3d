/**
 * CRM Customer Identity Resolution, Normalization and Deduplication helpers.
 * Pure functions: safe for edge runtime and node tests without I/O.
 */

import { normalizePhone as rawNormPhone, isDedupable, MIN_DEDUP_DIGITS } from './phone.ts';

export { rawNormPhone as normalizePhone, isDedupable, MIN_DEDUP_DIGITS };

/**
 * Normalizes email address for consistent de-duplication:
 * - lowercase and trimmed
 * - removes dots from Gmail / Googlemail usernames (j.doe@gmail.com -> jdoe@gmail.com)
 * - removes tags from Gmail addresses (jdoe+newsletter@gmail.com -> jdoe@gmail.com)
 */
export function normalizeEmail(raw: string): string {
  const trimmed = String(raw ?? '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return '';
  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) return '';

  const cleanDomain = domain.toLowerCase();
  if (cleanDomain === 'gmail.com' || cleanDomain === 'googlemail.com') {
    const strippedLocal = localPart.replace(/\./g, '').split('+')[0] || '';
    return `${strippedLocal}@gmail.com`;
  }
  return `${localPart}@${cleanDomain}`;
}

/** Formats a numeric sequence into stable standard customer code (e.g. 168 -> KH000168). */
export function formatCustomerCode(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  return `KH${String(safeSeq).padStart(6, '0')}`;
}

/**
 * Normalizes customer code representation so that KH-000168, kh000168, and KH000168
 * all evaluate to the canonical KH000168.
 */
export function normalizeCustomerCode(raw: string): string {
  const clean = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('KH')) {
    const numPart = clean.slice(2);
    if (/^\d+$/.test(numPart)) {
      return `KH${numPart.padStart(6, '0')}`;
    }
  }
  return clean;
}

/** Checks if two phones match after strict normalization. */
export function isMatchingPhone(p1: string, p2: string): boolean {
  const n1 = rawNormPhone(p1);
  const n2 = rawNormPhone(p2);
  if (!n1 || !n2) return false;
  if (!isDedupable(n1) || !isDedupable(n2)) return false;
  return n1 === n2;
}

/** Checks if two emails match after domain-aware normalization. */
export function isMatchingEmail(e1: string, e2: string): boolean {
  const n1 = normalizeEmail(e1);
  const n2 = normalizeEmail(e2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

export type MatchConfidence = 'EXACT_PHONE' | 'EXACT_EMAIL' | 'HIGH' | 'MEDIUM' | 'NONE';

/**
 * Determines deduplication match confidence between two records.
 */
export function calculateMatchConfidence(params: {
  phoneMatched: boolean;
  emailMatched: boolean;
  nameSimilar: boolean;
}): { confidence: MatchConfidence; reason: string } {
  if (params.phoneMatched && params.emailMatched) {
    return {
      confidence: 'HIGH',
      reason: 'Trùng khớp cả số điện thoại và địa chỉ email',
    };
  }
  if (params.phoneMatched) {
    return {
      confidence: 'EXACT_PHONE',
      reason: 'Trùng khớp số điện thoại đăng ký',
    };
  }
  if (params.emailMatched) {
    return {
      confidence: 'EXACT_EMAIL',
      reason: 'Trùng khớp địa chỉ email liên hệ',
    };
  }
  if (params.nameSimilar) {
    return {
      confidence: 'MEDIUM',
      reason: 'Tên khách hàng tương đồng cao, cần nhân viên đối soát',
    };
  }
  return {
    confidence: 'NONE',
    reason: 'Không phát hiện trùng lặp',
  };
}
