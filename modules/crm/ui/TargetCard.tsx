'use client';
import { useState } from 'react';
import { DataTable, Loading } from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { STATE_LABELS, monthKey, type Progress } from '../core/targets';
import { call, errText } from './api';
import { useLoad } from './Screens';

type Row = { id: string; name: string } & Progress;
type Data = {
  month: string;
  days: number;
  club: Progress;
  staff: Row[];
  editable: boolean;
  people: { id: string; name: string }[];
};

const shift = (month: string, d: number) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 7);
};
const TONE: Record<Progress['state'], string> = {
  none: '#64748b',
  ahead: '#15803d',
  'on-track': '#0369a1',
  behind: '#b91c1c',
  reached: '#15803d',
};

function Bar({ p }: { p: Progress }) {
  const width = Math.min(100, p.pct ?? 0);
  const mark = p.target > 0 ? Math.min(100, Math.round((p.expected / p.target) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={p.pct ?? 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Tiến độ so với mục tiêu"
      style={{ position: 'relative', height: 12, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}
    >
      <div style={{ width: width + '%', height: '100%', background: TONE[p.state] }} />
      {p.target > 0 && p.state !== 'reached' && (
        <div title="Tiến độ cần đạt hôm nay" style={{ position: 'absolute', top: 0, bottom: 0, left: mark + '%', width: 2, background: '#1b2420' }} />
      )}
    </div>
  );
}

/** Monthly revenue target of the club and of each salesperson, with progress and a month-end forecast. */
export function TargetCard() {
  const [month, setMonth] = useState(() => monthKey(Date.now()));
  const { data, error, reload } = useLoad<Data>(`/api/crm2/targets?month=${month}`, 120_000);
  const [editing, setEditing] = useState(false);
  const [club, setClub] = useState('');
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const p = data.club;
  const startEdit = () => {
    setClub(p.target ? String(p.target) : '');
    setStaff(Object.fromEntries(data.staff.map((s) => [s.id, s.target ? String(s.target) : ''])));
    setMsg('');
    setEditing(true);
  };
  const save = async () => {
    try {
      await call('/api/crm2/targets', {
        action: 'set',
        month: data.month,
        club: Number(club) || 0,
        staff: Object.fromEntries(Object.entries(staff).map(([id, v]) => [id, Number(v) || 0])),
      });
      setEditing(false);
      reload();
    } catch (e) {
      setMsg(errText(e));
    }
  };
  const label = `Tháng ${data.month.slice(5)}/${data.month.slice(0, 4)}`;
  return (
    <div className="crm-section-card" style={{ gridColumn: '1 / -1' }}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ flex: 1, margin: 0 }}>Mục tiêu doanh thu</h3>
        <button className="secondary" aria-label="Tháng trước" onClick={() => setMonth(shift(month, -1))}>
          ‹
        </button>
        <strong>{label}</strong>
        <button className="secondary" aria-label="Tháng sau" onClick={() => setMonth(shift(month, 1))}>
          ›
        </button>
        {data.editable && !editing && (
          <button className="secondary" onClick={startEdit}>
            Đặt mục tiêu
          </button>
        )}
      </header>

      {editing ? (
        <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
          <label>
            Mục tiêu cả câu lạc bộ (đồng)
            <input aria-label="Mục tiêu câu lạc bộ" inputMode="numeric" value={club} onChange={(e) => setClub(e.target.value.replace(/\D/g, ''))} />
          </label>
          {data.people.map((s) => (
            <label key={s.id}>
              {s.name}
              <input
                aria-label={`Mục tiêu của ${s.name}`}
                inputMode="numeric"
                value={staff[s.id] ?? ''}
                onChange={(e) => setStaff({ ...staff, [s.id]: e.target.value.replace(/\D/g, '') })}
              />
            </label>
          ))}
          {msg && (
            <div className="error-box" role="alert">
              {msg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save}>Lưu mục tiêu</button>
            <button className="secondary" onClick={() => setEditing(false)}>
              Hủy
            </button>
          </div>
        </div>
      ) : p.target > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <strong style={{ fontSize: 26 }}>{p.pct}%</strong>
            <span style={{ color: TONE[p.state], fontWeight: 600 }}>{STATE_LABELS[p.state]}</span>
          </div>
          <Bar p={p} />
          <div className="crm-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <div>
              <span>Mục tiêu</span>
              <strong>{money(p.target)}</strong>
            </div>
            <div>
              <span>Đã thu</span>
              <strong>{money(p.actual)}</strong>
            </div>
            <div>
              <span>Còn thiếu</span>
              <strong>{money(p.remaining)}</strong>
            </div>
            <div>
              <span>Dự báo cuối tháng</span>
              <strong>{money(p.forecast)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Chưa đặt mục tiêu cho {label.toLowerCase()}. Đã thu từ CRM: <strong>{money(p.actual)}</strong>.
          {data.editable ? ' Bấm "Đặt mục tiêu" để bắt đầu.' : ' Quản lý sẽ đặt mục tiêu cho tháng này.'}
        </p>
      )}

      {data.staff.length > 0 && !editing && (
        <DataTable
          label="Mục tiêu theo nhân viên"
          rows={data.staff}
          rowKey={(r) => r.id}
          empty="Chưa có nhân viên"
          columns={[
            { key: 'n', header: 'Nhân viên', cell: (r) => <strong>{r.name}</strong> },
            { key: 't', header: 'Mục tiêu', align: 'right', cell: (r) => (r.target ? money(r.target) : '—') },
            { key: 'a', header: 'Đã thu', align: 'right', cell: (r) => money(r.actual) },
            { key: 'p', header: 'Đạt', align: 'right', cell: (r) => (r.pct == null ? '—' : r.pct + '%') },
            { key: 'r', header: 'Còn thiếu', align: 'right', cell: (r) => (r.target ? money(r.remaining) : '—') },
            { key: 's', header: 'Tiến độ', cell: (r) => <span style={{ color: TONE[r.state] }}>{STATE_LABELS[r.state]}</span> },
          ]}
        />
      )}
      <small className="muted">
        Doanh thu tính từ tiền đã thu (đặt cọc, thanh toán từng đợt) của các đơn bán trong CRM, ghi cho nhân viên phụ trách lead. Vạch đen là tiến độ cần đạt hôm nay.
      </small>
    </div>
  );
}
