'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Chips,
  DataTable,
  FilterBar,
  Loading,
  StatusBadge,
  useDialogs,
  type Tone,
} from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { NEXT_ACTION_LABELS, type NextAction } from '../core/calls';
import { STAGES, STAGE_LABELS, type Stage } from '../core/stages';
import { call, countdown, dateOnly, errText, stamp, toMs, type Lead, type Staff } from './api';

export type Shared = {
  now: number;
  me: string;
  manager: boolean;
  staff: Staff[];
  open: (id: string) => void;
};

/** Loads a URL now and every `every` ms; returns the data, an error and a reload function. */
export function useLoad<T>(url: string, every = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setData(await call<T>(url));
      setError('');
    } catch (e) {
      setError(errText(e));
    }
  }, [url]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and on url change
    reload();
    if (!every) return;
    const t = setInterval(reload, every);
    return () => clearInterval(t);
  }, [reload, every]);
  return { data, error, reload, setError };
}
const stageTone = (st: string): Tone =>
  st === 'WON' ? 'ok' : st === 'LOST' ? 'muted' : st === 'NEW' ? 'warn' : 'info';
const apptTone = (st: string): Tone =>
  (
    ({
      PENDING: 'warn',
      CONFIRMED: 'info',
      ARRIVED: 'ok',
      NO_SHOW: 'late',
      CANCELLED: 'muted',
    }) as Record<string, Tone>
  )[st] ?? 'muted';
const Err = ({ text }: { text: string }) =>
  text ? (
    <div className="error-box" role="alert">
      {text}
    </div>
  ) : null;

// ---------------------------------------------------------------- overview

type Overview = {
  stages: { stage: string; n: number }[];
  sources: { source: string; leads: number; won: number }[];
  newUnhandled: number;
  overdueTasks: number;
  todayTasks: number;
};
export function OverviewScreen({
  cron,
}: {
  cron: { value: Record<string, unknown>; updated: number } | null;
  manager: boolean;
}) {
  const { data, error } = useLoad<Overview>('/api/crm2/overview', 30_000);
  if (error) return <Err text={error} />;
  if (!data) return <Loading />;
  const n = (s: string) => data.stages.find((x) => x.stage === s)?.n ?? 0;
  const total = data.stages.reduce((a, x) => a + x.n, 0);
  return (
    <>
      <div className="crm-kpis">
        {[
          ['Việc quá hạn', data.overdueTasks],
          ['Việc hôm nay', data.todayTasks],
          ['Lead mới chưa xử lý', data.newUnhandled],
          ['Lead 30 ngày', total],
        ].map(([label, v]) => (
          <div
            key={String(label)}
            className={label === 'Việc quá hạn' && Number(v) > 0 ? 'late' : ''}
          >
            <span>{label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <h3 role="heading" aria-level={2}>
        Phễu 30 ngày
      </h3>
      <DataTable
        rows={STAGES.map((s) => ({ s, n: n(s) }))}
        rowKey={(r) => r.s}
        empty="Chưa có dữ liệu"
        columns={[
          { key: 's', header: 'Giai đoạn', cell: (r) => STAGE_LABELS[r.s] },
          { key: 'n', header: 'Số lead', align: 'right', cell: (r) => r.n },
          {
            key: 'p',
            header: 'Tỷ lệ',
            align: 'right',
            cell: (r) => (total ? Math.round((r.n / total) * 100) + '%' : '0%'),
          },
        ]}
      />
      <h3>Nguồn khách</h3>
      <DataTable
        rows={data.sources}
        rowKey={(r) => r.source}
        empty="Chưa có nguồn khách"
        columns={[
          { key: 's', header: 'Nguồn', cell: (r) => r.source || 'Không rõ' },
          { key: 'l', header: 'Lead', align: 'right', cell: (r) => r.leads },
          { key: 'w', header: 'Chốt', align: 'right', cell: (r) => r.won ?? 0 },
        ]}
      />
      {cron && (
        <p className="crm-meta">
          Lần chạy nền gần nhất: {stamp(cron.updated)} — hết hạn giữ chỗ{' '}
          {String(cron.value.holdsExpired ?? 0)}, cảnh báo quá hạn{' '}
          {String(cron.value.slaAlerts ?? 0)}
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------- work desk

export function WorkScreen({ s }: { s: Shared }) {
  const { data, error } = useLoad<{ leads: Lead[] }>('/api/crm2/leads?view=work', 15_000);
  if (error) return <Err text={error} />;
  if (!data) return <Loading />;
  return (
    <DataTable
      rows={data.leads}
      rowKey={(r) => r.id}
      empty="Không còn việc cần gọi"
      emptyText="Khách mới được chia cho bạn hoặc đến hạn gọi lại sẽ hiện ở đây, việc gấp nhất lên đầu."
      onRowClick={(r) => s.open(r.id)}
      columns={[
        {
          key: 'n',
          header: 'Khách',
          cell: (r) => (
            <>
              <strong>{r.fullName}</strong>
              <br />
              {r.phone}
            </>
          ),
        },
        {
          key: 'a',
          header: 'Việc kế tiếp',
          cell: (r) => NEXT_ACTION_LABELS[r.nextAction as NextAction] || '—',
        },
        {
          key: 'd',
          header: 'Hạn',
          cell: (r) => {
            const c = countdown(r.nextDue, s.now);
            return (
              <span className={c.late ? 'late' : ''}>
                {r.nextDue ? stamp(r.nextDue) + ' · ' + c.text : '—'}
              </span>
            );
          },
        },
        {
          key: 'st',
          header: 'Giai đoạn',
          cell: (r) => (
            <StatusBadge tone={stageTone(r.stage)}>
              {STAGE_LABELS[r.stage as Stage] ?? r.stage}
            </StatusBadge>
          ),
        },
        { key: 'c', header: 'Gọi hụt', align: 'right', cell: (r) => r.callAttempts },
      ]}
    />
  );
}

// ---------------------------------------------------------------- pool

type PoolData = { leads: Lead[]; quota: number; claimedToday: number };
export function PoolScreen({ s }: { s: Shared }) {
  const { data, error, reload, setError } = useLoad<PoolData>('/api/crm2/leads?view=pool', 20_000);
  const [picked, setPicked] = useState<string[]>([]);
  const [to, setTo] = useState('');
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;
  const act = async (body: Record<string, unknown>) => {
    try {
      await call('/api/crm2/leads', body);
      setPicked([]);
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <>
      <Err text={error} />
      <p className="crm-meta">
        {s.manager
          ? 'Chọn lead để giao cho nhân viên.'
          : `Hạn mức nhận số hôm nay: còn ${Math.max(data.quota - data.claimedToday, 0)}/${data.quota}`}
      </p>
      {s.manager && picked.length > 0 && (
        <div className="crm-actions">
          <select aria-label="Giao cho" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Giao {picked.length} lead cho…</option>
            {s.staff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            className="primary"
            disabled={!to}
            onClick={() => act({ action: 'assign', ids: picked, userId: to })}
          >
            Giao
          </button>
        </div>
      )}
      <DataTable
        rows={data.leads}
        rowKey={(r) => r.id}
        empty="Kho số trống"
        emptyText="Lead chưa có người phụ trách sẽ nằm ở đây."
        columns={[
          ...(s.manager
            ? [
                {
                  key: 'pick',
                  header: '',
                  cell: (r: Lead) => (
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${r.fullName}`}
                      checked={picked.includes(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  ),
                },
              ]
            : []),
          { key: 'n', header: 'Khách', cell: (r) => r.fullName },
          { key: 'p', header: 'Điện thoại', cell: (r) => r.phone },
          { key: 'sv', header: 'Quan tâm', cell: (r) => r.targetService || '—' },
          { key: 'src', header: 'Nguồn', cell: (r) => r.source || '—' },
          { key: 'c', header: 'Vào kho', cell: (r) => stamp(r.created) },
          {
            key: 'a',
            header: '',
            cell: (r) =>
              s.manager ? (
                <button className="secondary" onClick={() => s.open(r.id)}>
                  Mở
                </button>
              ) : (
                <button className="primary" onClick={() => act({ action: 'claim', ids: [r.id] })}>
                  Nhận số
                </button>
              ),
          },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------- lead list and pipeline

export function LeadsScreen({ s, board }: { s: Shared; board: boolean }) {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ fullName: '', phone: '', targetService: '', notes: '' });
  const url = `/api/crm2/leads?limit=200&q=${encodeURIComponent(q)}${stage ? '&stage=' + stage : ''}`;
  const { data, error, reload, setError } = useLoad<{ leads: Lead[]; total: number }>(url);
  if (error && !data) return <Err text={error} />;
  const rows = data?.leads ?? [];
  return (
    <>
      <Err text={error} />
      <FilterBar search={q} onSearch={setQ} placeholder="Tìm theo tên hoặc số điện thoại">
        {!board && (
          <Chips
            value={stage}
            onChange={setStage}
            options={[
              { key: '', label: 'Tất cả' },
              ...STAGES.map((x) => ({ key: x, label: STAGE_LABELS[x] })),
            ]}
          />
        )}
        <button className="secondary" onClick={() => setAdding(!adding)}>
          Thêm lead
        </button>
      </FilterBar>
      {adding && (
        <div className="crm-actions">
          <input
            aria-label="Tên khách"
            placeholder="Tên khách"
            value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
          />
          <input
            aria-label="Số điện thoại"
            placeholder="Số điện thoại"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
          <input
            aria-label="Dịch vụ quan tâm"
            placeholder="Dịch vụ quan tâm"
            value={f.targetService}
            onChange={(e) => setF({ ...f, targetService: e.target.value })}
          />
          <button
            className="primary"
            onClick={async () => {
              try {
                await call('/api/crm2/leads', { action: 'create', ...f });
                setAdding(false);
                setF({ fullName: '', phone: '', targetService: '', notes: '' });
                await reload();
              } catch (e) {
                setError(errText(e));
              }
            }}
          >
            Tạo lead
          </button>
        </div>
      )}
      {board ? (
        <div className="crm-board">
          {STAGES.map((st) => {
            const col = rows.filter((l) => l.stage === st);
            return (
              <section key={st} className="crm-col" aria-label={STAGE_LABELS[st]}>
                <h4>
                  {STAGE_LABELS[st]} <span>{col.length}</span>
                </h4>
                {col.map((l) => (
                  <button key={l.id} className="crm-mini" onClick={() => s.open(l.id)}>
                    <strong>{l.fullName}</strong>
                    <span>{l.targetService || 'Nhu cầu chưa rõ'}</span>
                    {l.nextDue != null && (
                      <span className={l.nextDue < s.now ? 'late' : ''}>
                        {NEXT_ACTION_LABELS[l.nextAction as NextAction]}: {stamp(l.nextDue)}
                      </span>
                    )}
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty="Chưa có lead"
          onRowClick={(r) => s.open(r.id)}
          columns={[
            {
              key: 'n',
              header: 'Khách',
              cell: (r) => (
                <>
                  <strong>{r.fullName}</strong>
                  <br />
                  {r.phone}
                </>
              ),
            },
            {
              key: 'st',
              header: 'Giai đoạn',
              cell: (r) => (
                <StatusBadge tone={stageTone(r.stage)}>
                  {STAGE_LABELS[r.stage as Stage] ?? r.stage}
                </StatusBadge>
              ),
            },
            { key: 'sv', header: 'Quan tâm', cell: (r) => r.targetService || '—' },
            {
              key: 'o',
              header: 'Phụ trách',
              cell: (r) =>
                r.owner ? (s.staff.find((m) => m.id === r.owner)?.name ?? '—') : 'Kho số',
            },
            { key: 'src', header: 'Nguồn', cell: (r) => r.source || '—' },
            { key: 'c', header: 'Ngày vào', cell: (r) => dateOnly(r.created) },
          ]}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- tasks

type Task = {
  id: string;
  leadId: string | null;
  leadName: string | null;
  title: string;
  dueAt: number | null;
  doneAt: number | null;
  createdBy: string;
};
export function TasksScreen({ s }: { s: Shared }) {
  const [scope, setScope] = useState('mine');
  const { data, error, reload, setError } = useLoad<{ tasks: Task[] }>(
    `/api/crm2/tasks?scope=${scope}&done=1`,
    30_000,
  );
  const [title, setTitle] = useState('');
  if (error && !data) return <Err text={error} />;
  const tasks = data?.tasks ?? [];
  const act = async (body: Record<string, unknown>) => {
    try {
      await call('/api/crm2/tasks', body);
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <>
      <Err text={error} />
      <FilterBar>
        {s.manager && (
          <Chips
            value={scope}
            onChange={setScope}
            options={[
              { key: 'mine', label: 'Việc của tôi' },
              { key: 'all', label: 'Cả đội' },
            ]}
          />
        )}
        <input
          aria-label="Việc mới"
          placeholder="Thêm việc cần làm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="secondary"
          disabled={title.trim().length < 2}
          onClick={async () => {
            await act({ action: 'create', title: title.trim(), days: 0 });
            setTitle('');
          }}
        >
          Thêm việc
        </button>
      </FilterBar>
      <DataTable
        rows={tasks}
        rowKey={(r) => r.id}
        empty="Không có việc nào"
        columns={[
          {
            key: 't',
            header: 'Việc',
            cell: (r) => (
              <span style={r.doneAt ? { textDecoration: 'line-through' } : undefined}>
                {r.title}
              </span>
            ),
          },
          {
            key: 'l',
            header: 'Khách',
            cell: (r) =>
              r.leadId ? (
                <button className="link" onClick={() => s.open(r.leadId!)}>
                  {r.leadName}
                </button>
              ) : (
                '—'
              ),
          },
          {
            key: 'd',
            header: 'Hạn',
            cell: (r) => {
              const c = countdown(r.dueAt, s.now);
              return (
                <span className={!r.doneAt && c.late ? 'late' : ''}>
                  {stamp(r.dueAt)}
                  {!r.doneAt && r.dueAt ? ` · ${c.text}` : ''}
                </span>
              );
            },
          },
          { key: 'by', header: 'Tạo bởi', cell: (r) => r.createdBy },
          {
            key: 'a',
            header: '',
            cell: (r) =>
              r.doneAt ? (
                'Đã xong'
              ) : (
                <button className="secondary" onClick={() => act({ action: 'done', id: r.id })}>
                  Xong
                </button>
              ),
          },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------- appointments

type Appt = {
  id: string;
  leadId: string;
  leadName: string;
  service: string;
  at: number;
  status: string;
  owner: string | null;
};
const APPT_TEXT: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  ARRIVED: 'Khách đã đến',
  NO_SHOW: 'Khách không đến',
  CANCELLED: 'Đã hủy',
};
export function AppointmentsScreen({ s }: { s: Shared }) {
  const from = s.now - 24 * 3_600_000;
  const { data, error, reload, setError } = useLoad<{ appointments: Appt[]; arrivalRate: number }>(
    `/api/crm2/appointments?from=${from}&to=${from + 60 * 86_400_000}`,
  );
  if (error && !data) return <Err text={error} />;
  const set = async (id: string, status: string) => {
    try {
      await call('/api/crm2/appointments', { action: 'status', id, status });
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <>
      <Err text={error} />
      <p className="crm-meta">Tỷ lệ khách đến hẹn: {data?.arrivalRate ?? 0}%</p>
      <DataTable
        rows={data?.appointments ?? []}
        rowKey={(r) => r.id}
        empty="Chưa có lịch hẹn"
        emptyText="Đặt lịch trải nghiệm từ hồ sơ lead."
        columns={[
          { key: 'at', header: 'Giờ hẹn', cell: (r) => stamp(r.at) },
          {
            key: 'l',
            header: 'Khách',
            cell: (r) => (
              <button className="link" onClick={() => s.open(r.leadId)}>
                {r.leadName}
              </button>
            ),
          },
          { key: 'sv', header: 'Dịch vụ', cell: (r) => r.service || '—' },
          {
            key: 'st',
            header: 'Trạng thái',
            cell: (r) => (
              <StatusBadge tone={apptTone(r.status)}>{APPT_TEXT[r.status] ?? r.status}</StatusBadge>
            ),
          },
          {
            key: 'a',
            header: '',
            cell: (r) => (
              <span className="crm-actions">
                {r.status === 'PENDING' && s.manager && (
                  <button className="primary" onClick={() => set(r.id, 'CONFIRMED')}>
                    Duyệt
                  </button>
                )}
                {r.status === 'CONFIRMED' && (
                  <button className="secondary" onClick={() => set(r.id, 'ARRIVED')}>
                    Đã đến
                  </button>
                )}
                {r.status === 'CONFIRMED' && (
                  <button className="secondary" onClick={() => set(r.id, 'NO_SHOW')}>
                    Không đến
                  </button>
                )}
                {['PENDING', 'CONFIRMED'].includes(r.status) && (
                  <button className="secondary" onClick={() => set(r.id, 'CANCELLED')}>
                    Hủy
                  </button>
                )}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------- customers

type Cust = {
  phoneNorm: string;
  fullName: string;
  phone: string;
  code: string | null;
  total: number;
  deals: number;
  lastWon: number | null;
  tier: { name: string; color: string };
};
export function CustomersScreen() {
  const [q, setQ] = useState('');
  const { data, error } = useLoad<{
    customers: Cust[];
    summary: { total: number; wonToday: number; birthdayToday: number; birthdayMonth: number };
  }>(`/api/crm2/customers?q=${encodeURIComponent(q)}`);
  if (error && !data) return <Err text={error} />;
  const sm = data?.summary;
  return (
    <>
      <div className="crm-kpis">
        {[
          ['Tổng khách', sm?.total ?? 0],
          ['Chốt hôm nay', sm?.wonToday ?? 0],
          ['Sinh nhật hôm nay', sm?.birthdayToday ?? 0],
          ['Sinh nhật tháng này', sm?.birthdayMonth ?? 0],
        ].map(([label, v]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <FilterBar search={q} onSearch={setQ} placeholder="Tìm theo tên, số, mã KH" />
      <DataTable
        rows={data?.customers ?? []}
        rowKey={(r) => r.phoneNorm}
        empty="Chưa có khách hàng"
        emptyText="Lead được chốt sẽ trở thành khách hàng và có mã KH."
        columns={[
          { key: 'c', header: 'Mã KH', cell: (r) => r.code ?? '—' },
          {
            key: 'n',
            header: 'Khách',
            cell: (r) => (
              <>
                <strong>{r.fullName}</strong>
                <br />
                {r.phone}
              </>
            ),
          },
          {
            key: 't',
            header: 'Hạng',
            cell: (r) => (
              <span className="crm-chip" style={{ borderColor: r.tier.color }}>
                {r.tier.name}
              </span>
            ),
          },
          { key: 'v', header: 'Tổng giá trị', align: 'right', cell: (r) => money(r.total) },
          { key: 'd', header: 'Giao dịch', align: 'right', cell: (r) => r.deals },
          { key: 'w', header: 'Chốt gần nhất', cell: (r) => dateOnly(r.lastWon) },
        ]}
      />
    </>
  );
}

// ---------------------------------------------------------------- holds and orders

type Hold = {
  id: string;
  productName: string;
  leadId: string;
  leadName: string;
  kind: string;
  amount: number;
  status: string;
  expiresAt: number | null;
};
export function HoldsScreen({ s }: { s: Shared }) {
  const dlg = useDialogs();
  const { data, error, reload, setError } = useLoad<{ holds: Hold[] }>(
    '/api/crm2/sales?view=holds',
    30_000,
  );
  if (error && !data) return <Err text={error} />;
  const act = async (body: Record<string, unknown>) => {
    try {
      await call('/api/crm2/sales', body);
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <>
      {dlg.node}
      <Err text={error} />
      <DataTable
        rows={data?.holds ?? []}
        rowKey={(r) => r.id}
        empty="Chưa có giữ chỗ"
        emptyText="Giữ chỗ dịch vụ cho khách từ hồ sơ lead."
        columns={[
          { key: 'p', header: 'Dịch vụ', cell: (r) => r.productName },
          {
            key: 'l',
            header: 'Khách',
            cell: (r) => (
              <button className="link" onClick={() => s.open(r.leadId)}>
                {r.leadName}
              </button>
            ),
          },
          {
            key: 'st',
            header: 'Trạng thái',
            cell: (r) =>
              (
                ({
                  ACTIVE: 'Đang giữ',
                  CONVERTED: 'Đã thành đơn',
                  EXPIRED: 'Hết hạn',
                  RELEASED: 'Đã nhả',
                  CANCELLED: 'Đã hủy',
                }) as Record<string, string>
              )[r.status] ?? r.status,
          },
          { key: 'e', header: 'Hết hạn', cell: (r) => stamp(r.expiresAt) },
          {
            key: 'a',
            header: 'Cọc',
            align: 'right',
            cell: (r) => (r.amount ? money(r.amount) : '—'),
          },
          {
            key: 'x',
            header: '',
            cell: (r) =>
              r.status === 'ACTIVE' ? (
                <span className="crm-actions">
                  {s.manager && (
                    <button
                      className="primary"
                      onClick={async () => {
                        const v = await dlg.prompt({
                          title: `Ghi cọc cho ${r.productName}`,
                          label: 'Số tiền cọc (đồng)',
                          numeric: true,
                          confirmLabel: 'Ghi cọc',
                        });
                        if (v) act({ action: 'deposit', id: r.id, amount: Number(v) });
                      }}
                    >
                      Ghi cọc
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => act({ action: 'release', id: r.id })}
                  >
                    Nhả
                  </button>
                </span>
              ) : null,
          },
        ]}
      />
    </>
  );
}

type OrderRow = {
  id: string;
  code: string;
  leadName: string;
  productName: string;
  price: number;
  status: string;
  summary: {
    paid: number;
    outstanding: number;
    overdue: number;
    overdueCount: number;
    unscheduled: number;
    nextDueDate: string | null;
  };
};
type OrderDetail = {
  order: {
    id: string;
    code: string;
    productName: string;
    price: number;
    status: string;
    refundDue: number;
    cancelReason: string;
  };
  leadName: string;
  payments: {
    id: string;
    kind: string;
    label: string;
    amount: number;
    paidAmount: number;
    dueDate: string | null;
    status: string;
  }[];
  summary: OrderRow['summary'] & { percentPaid: number };
  cancel: { allowed: boolean; needsOwner: boolean };
};
export function OrdersScreen({ s }: { s: Shared }) {
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const { data, error, reload } = useLoad<{
    orders: OrderRow[];
    totals: { price: number; paid: number; outstanding: number; overdue: number };
  }>(`/api/crm2/sales?overdue=${onlyOverdue ? 1 : 0}`, 60_000);
  if (sel)
    return (
      <OrderPanel
        id={sel}
        s={s}
        onClose={() => {
          setSel(null);
          reload();
        }}
      />
    );
  if (error && !data) return <Err text={error} />;
  const t = data?.totals;
  return (
    <>
      <div className="crm-kpis">
        {[
          ['Tổng giá trị', t?.price ?? 0],
          ['Đã thu', t?.paid ?? 0],
          ['Còn phải thu', t?.outstanding ?? 0],
          ['Quá hạn', t?.overdue ?? 0],
        ].map(([label, v]) => (
          <div key={String(label)} className={label === 'Quá hạn' && Number(v) > 0 ? 'late' : ''}>
            <span>{label}</span>
            <strong>{money(Number(v))}</strong>
          </div>
        ))}
      </div>
      <FilterBar>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
          />{' '}
          Chỉ đơn quá hạn
        </label>
      </FilterBar>
      <DataTable
        rows={data?.orders ?? []}
        rowKey={(r) => r.id}
        empty="Chưa có đơn bán"
        emptyText="Ghi cọc cho một giữ chỗ để tạo đơn."
        onRowClick={(r) => setSel(r.id)}
        columns={[
          { key: 'c', header: 'Mã', cell: (r) => r.code },
          { key: 'l', header: 'Khách', cell: (r) => r.leadName },
          { key: 'p', header: 'Dịch vụ', cell: (r) => r.productName },
          { key: 'v', header: 'Giá bán', align: 'right', cell: (r) => money(r.price) },
          { key: 'pd', header: 'Đã thu', align: 'right', cell: (r) => money(r.summary.paid) },
          { key: 'o', header: 'Còn nợ', align: 'right', cell: (r) => money(r.summary.outstanding) },
          {
            key: 'st',
            header: 'Trạng thái',
            cell: (r) =>
              (
                ({ ACTIVE: 'Đang thu', COMPLETED: 'Đã thu đủ', CANCELLED: 'Đã hủy' }) as Record<
                  string,
                  string
                >
              )[r.status] ?? r.status,
          },
        ]}
      />
    </>
  );
}

function OrderPanel({ id, s, onClose }: { id: string; s: Shared; onClose: () => void }) {
  const dlg = useDialogs();
  const { data, error, reload, setError } = useLoad<OrderDetail>(
    '/api/crm2/sales?view=order&id=' + id,
  );
  const [plan, setPlan] = useState({ installments: '3', firstDue: '', intervalDays: '30' });
  const act = async (body: Record<string, unknown>) => {
    try {
      await call('/api/crm2/sales', { action: 'order-action', id, ...body });
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  if (!data) return error ? <Err text={error} /> : <Loading />;
  const { order, summary } = data;
  const live = order.status !== 'CANCELLED';
  return (
    <div className="crm-panel">
      {dlg.node}
      <p>
        <button className="secondary" onClick={onClose}>
          ← Quay lại
        </button>
      </p>
      <Err text={error} />
      <header>
        <div>
          <strong>{order.code}</strong> · {data.leadName} · {order.productName}
        </div>
        <span className="crm-chip">{order.status}</span>
      </header>
      <div className="crm-kpis">
        {[
          ['Giá bán', money(order.price)],
          ['Đã thu', `${money(summary.paid)} (${summary.percentPaid}%)`],
          ['Còn phải thu', money(summary.outstanding)],
          ['Quá hạn', money(summary.overdue)],
        ].map(([l, v]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      {summary.unscheduled > 0 && live && (
        <p className="crm-warn">
          Còn {money(summary.unscheduled)} chưa nằm trong lịch thanh toán nào, hệ thống sẽ không
          nhắc phần này.
        </p>
      )}
      {order.status === 'CANCELLED' && (
        <p className="crm-warn">
          Đã hủy: {order.cancelReason}. Cần hoàn khách {money(order.refundDue)}.
        </p>
      )}
      <DataTable
        rows={data.payments.filter((p) => p.status !== 'CANCELLED')}
        rowKey={(r) => r.id}
        empty="Chưa có lịch thanh toán"
        columns={[
          { key: 'l', header: 'Đợt', cell: (r) => r.label },
          { key: 'd', header: 'Hạn', cell: (r) => r.dueDate ?? '—' },
          { key: 'a', header: 'Số tiền', align: 'right', cell: (r) => money(r.amount) },
          { key: 'p', header: 'Đã thu', align: 'right', cell: (r) => money(r.paidAmount) },
          {
            key: 'st',
            header: 'Trạng thái',
            cell: (r) =>
              (
                ({ PLANNED: 'Chưa thu', PARTIAL: 'Thu một phần', PAID: 'Đã thu' }) as Record<
                  string,
                  string
                >
              )[r.status] ?? r.status,
          },
          {
            key: 'x',
            header: '',
            cell: (r) =>
              live && s.manager && r.status !== 'PAID' ? (
                <button
                  className="primary"
                  onClick={async () => {
                    const v = await dlg.prompt({
                      title: `Ghi thu ${r.label}`,
                      label: 'Số tiền thu (đồng)',
                      initial: String(r.amount - r.paidAmount),
                      numeric: true,
                      confirmLabel: 'Ghi thu',
                    });
                    if (v)
                      act({ op: 'pay', paymentId: r.id, amount: Number(v), method: 'Tiền mặt' });
                  }}
                >
                  Ghi thu
                </button>
              ) : null,
          },
        ]}
      />
      {live && s.manager && (
        <>
          <h4>Lập lịch thanh toán phần còn lại</h4>
          <div className="crm-actions">
            <input
              aria-label="Số đợt"
              inputMode="numeric"
              value={plan.installments}
              onChange={(e) => setPlan({ ...plan, installments: e.target.value })}
            />
            <input
              aria-label="Hạn đợt đầu"
              type="date"
              value={plan.firstDue}
              onChange={(e) => setPlan({ ...plan, firstDue: e.target.value })}
            />
            <input
              aria-label="Cách nhau (ngày)"
              inputMode="numeric"
              value={plan.intervalDays}
              onChange={(e) => setPlan({ ...plan, intervalDays: e.target.value })}
            />
            <button
              className="secondary"
              disabled={!plan.firstDue}
              onClick={() =>
                act({
                  op: 'schedule',
                  installments: Number(plan.installments),
                  firstDue: plan.firstDue,
                  intervalDays: Number(plan.intervalDays),
                })
              }
            >
              Lập lịch chia đều
            </button>
            <button className="secondary" onClick={() => act({ op: 'won' })}>
              Chốt khách (ghi giá trị)
            </button>
            {data.cancel.allowed && (
              <button
                className="secondary"
                onClick={async () => {
                  const r = await dlg.prompt({
                    title: `Hủy đơn ${order.code}`,
                    label: 'Lý do hủy đơn',
                    min: 2,
                    danger: true,
                    confirmLabel: 'Hủy đơn',
                  });
                  if (r) act({ op: 'cancel', reason: r });
                }}
              >
                Hủy đơn
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { toMs };
