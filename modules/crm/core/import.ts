/** Pasted spreadsheet / CSV text -> lead rows, and the preview verdict for each row. Pure: no I/O. */
import { MIN_DEDUP_DIGITS, normalizePhone } from './phone.ts';

export type ImportRow = {
  fullName: string;
  phone: string;
  email: string;
  targetService: string;
  source: string;
  campaign: string;
  notes: string;
};

/** Column order when the text has no header line. */
const DEFAULT_COLS = ['fullName', 'phone', 'email', 'targetService', 'source', 'campaign', 'notes'] as const;
type Col = (typeof DEFAULT_COLS)[number];

const HEADER_NAMES: Record<string, Col> = {
  'họ tên': 'fullName',
  'ho ten': 'fullName',
  'tên': 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  'số điện thoại': 'phone',
  'điện thoại': 'phone',
  sdt: 'phone',
  'sđt': 'phone',
  phone: 'phone',
  email: 'email',
  'dịch vụ': 'targetService',
  'dịch vụ quan tâm': 'targetService',
  service: 'targetService',
  'nguồn': 'source',
  source: 'source',
  'chiến dịch': 'campaign',
  campaign: 'campaign',
  'ghi chú': 'notes',
  notes: 'notes',
  note: 'notes',
};

const splitLine = (line: string) => (line.includes('\t') ? line.split('\t') : line.split(','));

/**
 * Reads pasted text. A first line made of known column names is a header and sets the column order (so a file may
 * have the columns in any order, with or without the campaign column); without a header the default order is used.
 */
export function parseImportText(text: string): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  let cols: Col[] = [...DEFAULT_COLS];
  const first = splitLine(lines[0]).map((c) => HEADER_NAMES[c.trim().toLowerCase()]);
  if (first.filter(Boolean).length >= 2) {
    cols = first.map((c, i) => c ?? (DEFAULT_COLS[i] as Col));
    lines.shift();
  }
  const rows: ImportRow[] = [];
  for (const line of lines) {
    const parts = splitLine(line).map((p) => p.trim());
    const get = (c: Col) => {
      const i = cols.indexOf(c);
      return i >= 0 ? (parts[i] ?? '') : '';
    };
    const notesAt = cols.indexOf('notes');
    const notes = notesAt >= 0 && notesAt === cols.length - 1 ? parts.slice(notesAt).join(', ') : get('notes');
    const fullName = get('fullName');
    if (!fullName) continue;
    rows.push({
      fullName,
      phone: get('phone'),
      email: get('email'),
      targetService: get('targetService'),
      source: get('source') || 'Excel/CSV',
      campaign: get('campaign'),
      notes,
    });
  }
  return rows;
}

export type Verdict = 'new' | 'existing' | 'repeat' | 'blocked' | 'invalid';
export const VERDICT_LABELS: Record<Verdict, string> = {
  new: 'Sẽ tạo mới',
  existing: 'Đã có trong CRM (gộp vào lead cũ)',
  repeat: 'Trùng số trong file',
  blocked: 'Số bị chặn (bỏ qua)',
  invalid: 'Số điện thoại không hợp lệ',
};

export type PreviewRow = { line: number; fullName: string; phone: string; verdict: Verdict };

/** Verdict per row, given the numbers already in the CRM and the blocked ones. */
export function classifyRows(
  rows: Pick<ImportRow, 'fullName' | 'phone'>[],
  existing: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
): { rows: PreviewRow[]; counts: Record<Verdict, number> } {
  const seen = new Set<string>();
  const counts: Record<Verdict, number> = { new: 0, existing: 0, repeat: 0, blocked: 0, invalid: 0 };
  const out = rows.map((r, i) => {
    const norm = normalizePhone(r.phone);
    let verdict: Verdict;
    if (norm.length < MIN_DEDUP_DIGITS || norm.length > 15) verdict = 'invalid';
    else if (blocked.has(norm)) verdict = 'blocked';
    else if (seen.has(norm)) verdict = 'repeat';
    else if (existing.has(norm)) verdict = 'existing';
    else verdict = 'new';
    if (verdict !== 'invalid') seen.add(norm);
    counts[verdict]++;
    return { line: i + 1, fullName: r.fullName, phone: r.phone, verdict };
  });
  return { rows: out, counts };
}
