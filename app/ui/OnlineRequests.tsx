'use client';
import { useEffect, useState } from 'react';
import { money } from '../../lib/club';
import { REQUEST_STATUS_LABELS } from '../../lib/online';
import { Chips, DataTable, FilterBar, askText } from './kit';

type Row = {
  id: string;
  name: string;
  phone: string;
  service: string;
  vip: number;
  people: number;
  start: number;
  minutes: number;
  note: string;
  status: string;
  room: string | null;
  reason: string;
  quote: { total?: number | null; guests?: number; lines?: number };
  freeRooms: { id: string; name: string }[];
  late: boolean;
};
type Listing = { requests: Row[]; enabled: boolean; slug: string };
const SERVICE: Record<string, string> = { gdr: 'Luyện tập', '9': '9 hố', '18': '18 hố' };
const when = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function OnlineRequests({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('pending');
  // Chosen room for each line of a request (a group of more than 4 needs one room per line).
  const [room, setRoom] = useState<Record<string, string[]>>({});

  async function load() {
    const r = await fetch('/api/online', { cache: 'no-store' });
    const v = (await r.json()) as Listing & { error?: string };
    if (!r.ok) setError(v.error || 'Không tải được yêu cầu');
    else {
      setData(v);
      setError('');
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const v = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const actions = (r: Row) => (
    <div className="ds-cell-actions">
      {r.status === 'pending' && !r.late && (
        <>
          {r.freeRooms.length >= (r.quote.lines ?? 1) ? (
            <>
              {Array.from({ length: r.quote.lines ?? 1 }, (_, i) => {
                const chosen =
                  room[r.id] ?? r.freeRooms.slice(0, r.quote.lines ?? 1).map((f) => f.id);
                return (
                  <select
                    key={i}
                    aria-label={`Phòng cho line ${i + 1}`}
                    value={chosen[i]}
                    onChange={(e) => {
                      const next = [...chosen];
                      next[i] = e.target.value;
                      setRoom({ ...room, [r.id]: next });
                    }}
                  >
                    {r.freeRooms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                );
              })}{' '}
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  const chosen =
                    room[r.id] ?? r.freeRooms.slice(0, r.quote.lines ?? 1).map((f) => f.id);
                  act({
                    action: 'confirm',
                    id: r.id,
                    room: chosen[0],
                    extraRooms: chosen.slice(1),
                  });
                }}
              >
                Xác nhận
              </button>
            </>
          ) : (
            <span>Không đủ phòng trống ({r.quote.lines ?? 1} line)</span>
          )}{' '}
        </>
      )}
      {r.status === 'pending' && (
        <button
          disabled={busy}
          onClick={async () => {
            const reason = await askText({
              title: 'Từ chối yêu cầu',
              label: 'Lý do từ chối (khách sẽ thấy)',
              min: 3,
              danger: true,
              confirmLabel: 'Từ chối',
            });
            if (reason) act({ action: 'reject', id: r.id, reason });
          }}
        >
          Từ chối
        </button>
      )}
    </div>
  );
  const pendingCount = data?.requests.filter((r) => r.status === 'pending').length ?? 0;
  const rows = (data?.requests ?? []).filter((r) => filter === 'all' || r.status === 'pending');
  return (
    <section className="online-panel">
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {data && !data.enabled && (
        <p className="form-note">
          Chưa bật nhận đặt online. Vào Cài đặt cơ sở → mục Đặt lịch để bật và đặt mã đường dẫn.
        </p>
      )}
      {data?.enabled && (
        <p className="form-note">
          Đường dẫn cho khách: <code>/book/{data.slug}</code>
        </p>
      )}
      <FilterBar>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'pending', label: 'Chờ xác nhận', count: pendingCount },
            { key: 'all', label: 'Tất cả', count: data?.requests.length ?? 0 },
          ]}
        />
      </FilterBar>
      {data && (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={
            filter === 'pending'
              ? 'Không có yêu cầu nào chờ xác nhận'
              : 'Chưa có yêu cầu đặt online'
          }
          columns={[
            {
              key: 'who',
              header: 'Khách',
              cell: (r) => (
                <>
                  <strong>{r.name}</strong>
                  <small>
                    <a href={'tel:' + r.phone}>{r.phone}</a>
                  </small>
                </>
              ),
            },
            {
              key: 'req',
              header: 'Yêu cầu',
              cell: (r) => (
                <>
                  {SERVICE[r.service]}
                  {r.service === 'gdr' ? ` ${r.minutes}′` : ''} ·{' '}
                  {r.vip ? 'VIP' : 'line tiêu chuẩn'} · {r.quote.guests || r.people} người
                  {(r.quote.guests ?? 0) > 4 && (
                    <b> (nhóm, {r.quote.lines ?? Math.ceil(r.quote.guests! / 4)} line)</b>
                  )}
                  <small>
                    {when(r.start)}
                    {r.quote.total != null && <> · tạm tính {money(r.quote.total)}</>}
                  </small>
                  {r.note && (
                    <small>
                      <em>{r.note}</em>
                    </small>
                  )}
                </>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              cell: (r) => (
                <>
                  {REQUEST_STATUS_LABELS[r.status] ?? r.status}
                  {r.status === 'rejected' && r.reason ? ` — ${r.reason}` : ''}
                  {r.late && <b> · đã quá giờ</b>}
                </>
              ),
            },
            { key: 'act', header: 'Xử lý', cell: (r) => actions(r) },
          ]}
        />
      )}
    </section>
  );
}
