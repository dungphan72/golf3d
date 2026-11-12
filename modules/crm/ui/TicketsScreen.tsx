'use client';
import { useState } from 'react';
import { Chips, DataTable, FilterBar, KpiTile, Loading } from '../../../app/ui/kit';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  canRate,
  type Summary,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../core/tickets';
import { call, errText, stamp } from './api';
import { useLoad } from './Screens';

type Row = {
  id: string;
  code: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customerName: string;
  phone: string;
  assignee: string | null;
  assigneeName: string;
  created: number;
  dueAt: number;
  overdue: boolean;
};
type List = { tickets: Row[]; summary: Summary; staff: { id: string; name: string }[]; now: number };
type Note = { at: number; byName: string; kind: string; text: string };
type Detail = {
  ticket: Row & { description: string; rating: number | null; notes: Note[] };
  assigneeName: string;
  now: number;
};

const PRIORITY_TONE: Record<TicketPriority, string> = { low: '#64748b', normal: '#0369a1', high: '#b45309', urgent: '#b91c1c' };

const left = (due: number, now: number) => {
  const min = Math.round((due - now) / 60_000);
  const abs = Math.abs(min);
  const t = abs >= 1440 ? `${Math.floor(abs / 1440)} ngày ${Math.floor((abs % 1440) / 60)} giờ` : abs >= 60 ? `${Math.floor(abs / 60)} giờ ${abs % 60} phút` : `${abs} phút`;
  return min < 0 ? `quá hạn ${t}` : `còn ${t}`;
};

function TicketDetail({ id, manager, staff, onClose }: { id: string; manager: boolean; staff: { id: string; name: string }[]; onClose: () => void }) {
  const { data, error, reload } = useLoad<Detail>(`/api/crm2/tickets?id=${id}`);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const t = data.ticket;
  const act = async (patch: Record<string, unknown>) => {
    setMsg('');
    try {
      await call('/api/crm2/tickets', { action: 'update', id, ...patch });
      setNote('');
      reload();
    } catch (e) {
      setMsg(errText(e));
    }
  };
  const moves: [TicketStatus, string][] =
    t.status === 'closed'
      ? manager
        ? [['in_progress', 'Mở lại']]
        : []
      : t.status === 'resolved'
        ? [['closed', 'Đóng ticket'], ['in_progress', 'Mở lại']]
        : [
            ...(t.status === 'new' ? ([['in_progress', 'Nhận xử lý']] as [TicketStatus, string][]) : []),
            ...(t.status !== 'waiting' ? ([['waiting', 'Chờ khách']] as [TicketStatus, string][]) : ([['in_progress', 'Tiếp tục xử lý']] as [TicketStatus, string][])),
            ['resolved', 'Đã giải quyết'],
          ];
  return (
    <section aria-label={`Ticket ${t.code}`} style={{ display: 'grid', gap: 14 }}>
      <button className="secondary" style={{ justifySelf: 'start' }} onClick={onClose}>
        ← Danh sách ticket
      </button>
      <div>
        <small className="muted">{t.code} · {CATEGORY_LABELS[t.category]}</small>
        <h3 style={{ margin: '2px 0' }}>{t.subject}</h3>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>{STATUS_LABELS[t.status]}</span>
          <span style={{ color: PRIORITY_TONE[t.priority], fontWeight: 600 }}>Ưu tiên: {PRIORITY_LABELS[t.priority]}</span>
          <span>Khách: {t.customerName || 'chưa rõ'} {t.phone}</span>
          <span>Phụ trách: {data.assigneeName || 'chưa giao'}</span>
          {(t.status === 'new' || t.status === 'in_progress') && (
            <strong style={{ color: t.overdue ? '#b91c1c' : '#15803d' }}>Hạn xử lý: {left(t.dueAt, data.now)}</strong>
          )}
        </div>
        {t.description && <p style={{ whiteSpace: 'pre-wrap' }}>{t.description}</p>}
      </div>

      {msg && (
        <div className="error-box" role="alert">
          {msg}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {moves.map(([to, label]) => (
          <button key={to + label} onClick={() => act({ status: to })}>
            {label}
          </button>
        ))}
        {manager && (
          <>
            <select aria-label="Giao cho" value={t.assignee ?? ''} onChange={(e) => act({ assignee: e.target.value || null })}>
              <option value="">Chưa giao</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select aria-label="Mức ưu tiên" value={t.priority} onChange={(e) => act({ priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {canRate(t.status) && (
        <div role="group" aria-label="Điểm hài lòng của khách" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>Khách chấm:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={t.rating === n ? 'primary' : 'secondary'} aria-label={`${n} sao`} onClick={() => act({ rating: n })}>
              {n}★
            </button>
          ))}
        </div>
      )}

      <form
        style={{ display: 'grid', gap: 6, maxWidth: 640 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) void act({ note });
        }}
      >
        <textarea aria-label="Ghi chú xử lý" rows={3} placeholder="Ghi chú xử lý, trao đổi với khách…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="secondary" style={{ justifySelf: 'start' }} disabled={!note.trim()}>
          Thêm ghi chú
        </button>
      </form>

      <ol aria-label="Lịch sử xử lý" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {[...t.notes].reverse().map((n, i) => (
          <li key={i} style={{ borderLeft: '3px solid #e3e7e4', paddingLeft: 10 }}>
            <small className="muted">
              {stamp(n.at)} · {n.byName}
            </small>
            <div>{n.text}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Support tickets: complaints and requests from customers, with owner, SLA deadline and satisfaction score. */
export function TicketsScreen({ manager }: { manager: boolean }) {
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ subject: '', description: '', category: 'support' as TicketCategory, priority: 'normal' as TicketPriority, customerName: '', phone: '' });
  const [msg, setMsg] = useState('');
  const { data, error, reload } = useLoad<List>(`/api/crm2/tickets?filter=${filter}`, 60_000);
  if (open && data) return <TicketDetail id={open} manager={manager} staff={data.staff} onClose={() => { setOpen(null); reload(); }} />;
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const s = data.summary;
  const create = async () => {
    setMsg('');
    try {
      await call('/api/crm2/tickets', { action: 'create', ...f });
      setF({ ...f, subject: '', description: '', customerName: '', phone: '' });
      setAdding(false);
      reload();
    } catch (e) {
      setMsg(errText(e));
    }
  };
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="ds-tiles" aria-label="Tổng quan ticket">
        <KpiTile label="Đang mở" value={s.open} />
        <KpiTile label="Quá hạn SLA" value={s.overdue} />
        <KpiTile label="Chờ khách" value={s.waiting} />
        <KpiTile label="Giải quyết 30 ngày" value={s.resolvedInPeriod} />
        <KpiTile label="Hài lòng TB" value={s.avgRating == null ? '—' : s.avgRating + '/5'} hint={`${s.rated} lượt chấm`} />
        <KpiTile label="Giờ xử lý TB" value={s.avgResolveHours == null ? '—' : s.avgResolveHours + ' giờ'} />
      </section>

      <FilterBar
        right={
          <button className="primary" onClick={() => setAdding(!adding)}>
            + Tạo ticket
          </button>
        }
      >
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'open', label: 'Đang mở' },
            { key: 'overdue', label: 'Quá hạn' },
            { key: 'mine', label: 'Của tôi' },
            { key: 'done', label: 'Đã xong' },
            { key: 'all', label: 'Tất cả' },
          ]}
        />
      </FilterBar>

      {adding && (
        <form
          aria-label="Tạo ticket"
          style={{ display: 'grid', gap: 8, maxWidth: 640 }}
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input aria-label="Tiêu đề ticket" placeholder="Tiêu đề (ví dụ: Máy chiếu line 2 không lên hình)" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select aria-label="Loại ticket" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as TicketCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select aria-label="Mức ưu tiên mới" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TicketPriority })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Ưu tiên {PRIORITY_LABELS[p].toLowerCase()}
                </option>
              ))}
            </select>
            <input aria-label="Tên khách" placeholder="Tên khách" value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} />
            <input aria-label="Số điện thoại khách" placeholder="Số điện thoại" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <textarea aria-label="Mô tả" rows={3} placeholder="Mô tả chi tiết" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          {msg && (
            <div className="error-box" role="alert">
              {msg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">Tạo và tự giao người xử lý</button>
            <button type="button" className="secondary" onClick={() => setAdding(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      <DataTable
        label="Danh sách ticket"
        rows={data.tickets}
        rowKey={(r) => r.id}
        empty="Không có ticket nào"
        onRowClick={(r) => setOpen(r.id)}
        columns={[
          { key: 'c', header: 'Mã', cell: (r) => <strong>{r.code}</strong> },
          { key: 's', header: 'Tiêu đề', cell: (r) => r.subject },
          { key: 't', header: 'Loại', cell: (r) => CATEGORY_LABELS[r.category] },
          { key: 'p', header: 'Ưu tiên', cell: (r) => <span style={{ color: PRIORITY_TONE[r.priority], fontWeight: 600 }}>{PRIORITY_LABELS[r.priority]}</span> },
          { key: 'k', header: 'Khách', cell: (r) => r.customerName || r.phone || '—' },
          { key: 'a', header: 'Phụ trách', cell: (r) => r.assigneeName || '—' },
          { key: 'st', header: 'Trạng thái', cell: (r) => STATUS_LABELS[r.status] },
          {
            key: 'd',
            header: 'Hạn',
            cell: (r) =>
              r.status === 'new' || r.status === 'in_progress' ? (
                <span style={{ color: r.overdue ? '#b91c1c' : undefined }}>{left(r.dueAt, data.now)}</span>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </div>
  );
}
