'use client';
import { useEffect, useState } from 'react';

type Row = { id: string; action: string; detail: string; created: number };

const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
/** Readable one-line summary of the JSON detail stored by triggers and services. */
function summary(detail: string) {
  try {
    const v = JSON.parse(detail) as Record<string, unknown>;
    return Object.entries(v)
      .filter(([, x]) => x !== null && x !== undefined && x !== '')
      .map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : x}`)
      .join(' · ');
  } catch {
    return detail;
  }
}

/** Read-only activity log: who did what, newest first. */
export function AuditPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(id);
  }, [search]);
  async function load(before?: number) {
    const r = await fetch(
      '/api/audit?q=' + encodeURIComponent(query) + (before ? '&before=' + before : ''),
      { cache: 'no-store' },
    );
    const v = (await r.json()) as { rows?: Row[]; hasMore?: boolean; error?: string };
    if (!r.ok || !v.rows) throw new Error(v.error || 'Không tải được nhật ký');
    setError('');
    setRows((old) => (before ? [...old, ...v.rows!] : v.rows!));
    setHasMore(!!v.hasMore);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch when the search settles
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the search text settles
  }, [query]);

  return (
    <section className="members-panel">
      <label>
        Tìm trong nhật ký
        <input
          value={search}
          placeholder="Ví dụ: Ghi sổ tiền, tên nhân viên, mã phiếu"
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Hành động</th>
            <th>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{when(r.created)}</td>
              <td>{r.action}</td>
              <td style={{ wordBreak: 'break-word' }}>{summary(r.detail)}</td>
            </tr>
          ))}
          {!rows.length && !error && (
            <tr>
              <td colSpan={3}>Chưa có hoạt động nào</td>
            </tr>
          )}
        </tbody>
      </table>
      {hasMore && (
        <button
          className="secondary"
          onClick={() => load(rows[rows.length - 1].created).catch((e) => setError(String(e)))}
        >
          Xem thêm
        </button>
      )}
    </section>
  );
}
