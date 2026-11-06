/** Phone helpers of the CRM module. Pure: no I/O. */

/** Digits only; 0084.. and 84.. (11+ digits) become the national form 0.. */
export function normalizePhone(raw: string): string {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('0084')) d = '0' + d.slice(4);
  else if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d;
}

/** Duplicate detection only applies to numbers of at least this many digits. */
export const MIN_DEDUP_DIGITS = 8;
export const isDedupable = (norm: string) => norm.length >= MIN_DEDUP_DIGITS;

/** 0399123999 -> 039****999; short numbers are hidden completely. */
export function maskPhone(phone: string): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 7) return '****';
  return d.slice(0, 3) + '****' + d.slice(-3);
}

/** Mobile carrier guessed from the prefix; '' when unknown. */
export function carrierOf(norm: string): string {
  const p = norm.slice(0, 3);
  if (
    ['032', '033', '034', '035', '036', '037', '038', '039', '086', '096', '097', '098'].includes(p)
  )
    return 'Viettel';
  if (['070', '076', '077', '078', '079', '089', '090', '093'].includes(p)) return 'MobiFone';
  if (['081', '082', '083', '084', '085', '088', '091', '094'].includes(p)) return 'VinaPhone';
  if (['052', '056', '058', '092'].includes(p)) return 'Vietnamobile';
  if (['059', '099'].includes(p)) return 'Gmobile';
  return '';
}
