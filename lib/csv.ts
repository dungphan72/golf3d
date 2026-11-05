/** RFC 4180 CSV with a UTF-8 BOM so Excel opens Vietnamese text correctly. Guards against formula injection. */
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
};
export const toCsv = (rows: (string | number)[][]) =>
  '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
