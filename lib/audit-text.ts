/** Turns the raw detail stored in the activity log (JSON from triggers, bare ids) into a readable line. */

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** Same short code the bill shows (#ABC123). */
const shortCode = (id: string) => '#' + id.slice(-6).toUpperCase();

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const KIND: Record<string, string> = {
  payment: 'Thu tiền',
  refund: 'Hoàn tiền',
  cash_in: 'Nạp quỹ',
  cash_out: 'Rút quỹ',
  in: 'Nạp quỹ',
  out: 'Rút quỹ',
};
const METHOD: Record<string, string> = {
  cash: 'tiền mặt',
  transfer: 'chuyển khoản',
  card: 'thẻ',
  wallet: 'ví hội viên',
  package: 'gói hội viên',
};
const MONEY_KEYS: Record<string, string> = {
  openingCash: 'Tiền đầu ca',
  countedCash: 'Tiền mặt kiểm đếm',
  countedTransfer: 'Chuyển khoản xác nhận',
  countedCard: 'Thẻ xác nhận',
  expectedCash: 'Tiền mặt lý thuyết',
  difference: 'Chênh lệch',
};

export function auditDetailText(detail: string): string {
  const raw = (detail ?? '').trim();
  if (raw.startsWith('{')) {
    try {
      const v = JSON.parse(raw) as Record<string, unknown>;
      const parts: string[] = [];
      const kind = typeof v.kind === 'string' ? KIND[v.kind] : undefined;
      const method = typeof v.method === 'string' ? METHOD[v.method] : undefined;
      if (kind || method) parts.push([kind, method].filter(Boolean).join(' '));
      if (typeof v.name === 'string' && v.name) parts.push(v.name);
      if (typeof v.amount === 'number') parts.push(vnd(v.amount));
      for (const [k, label] of Object.entries(MONEY_KEYS))
        if (typeof v[k] === 'number') parts.push(`${label}: ${vnd(v[k] as number)}`);
      if (typeof v.booking === 'string' && v.booking) parts.push(`phiếu ${shortCode(v.booking)}`);
      if (typeof v.note === 'string' && v.note) parts.push(v.note);
      return parts.join(' · ');
    } catch {
      /* not JSON after all: fall through */
    }
  }
  return raw.replace(UUID, (id) => shortCode(id));
}
