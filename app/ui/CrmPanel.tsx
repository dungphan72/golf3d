'use client';
import { useCallback, useEffect, useState } from 'react';
import { Phone, MessageCircle, Copy, Check } from 'lucide-react';
import { money } from '../../lib/club';
import {
  CRM_RULES,
  CHANNELS,
  CHANNEL_LABELS,
  SEGMENT_LABELS,
  ruleName,
  type Channel,
  type CrmSettings,
  type CrmTask,
  type Segment,
} from '../../lib/crm';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../lib/member';

type Counts = { overdue: number; today: number; upcoming: number; doneWeek: number };
type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  created: number;
  visits: number;
  last_visit: number | null;
  spend: number;
  points: number;
  open_tasks: number;
  account: number | null;
  segments: Segment[];
};
type Detail = {
  customer: CustomerRow;
  visits: { id: string; service: string; room: string; finished: number; amount: number }[];
  packages: { id: string; name: string; expires: number; balances: string | null }[];
  interactions: {
    id: string;
    channel: Channel;
    content: string;
    created: number;
    actor_name: string | null;
  }[];
  tasks: CrmTask[];
  now: number;
};

const DAY = 86_400_000;
const SERVICE: Record<string, string> = { gdr: 'Luyện tập', '9': 'Game 9 hố', '18': 'Game 18 hố' };
const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const stamp = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

async function call(url: string, body?: Record<string, unknown>) {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  const v = (await r.json()) as Record<string, unknown> & { error?: string };
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}
const zaloLink = (phone: string) => `https://zalo.me/${phone}`;

function dueText(due: number, now: number) {
  const startToday = Math.floor((now + 7 * 3_600_000) / DAY) * DAY - 7 * 3_600_000;
  if (due < startToday) return `quá hạn ${Math.ceil((startToday - due) / DAY)} ngày`;
  if (due < startToday + DAY) return 'hôm nay';
  return day(due);
}

function TaskCard({
  task,
  now,
  canWork,
  onChanged,
  onOpenCustomer,
}: {
  task: CrmTask;
  now: number;
  canWork: boolean;
  onChanged: () => void;
  onOpenCustomer: (id: string) => void;
}) {
  const [done, setDone] = useState(false);
  const [channel, setChannel] = useState<Channel>('call');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const open = task.status === 'open';
  async function act(body: Record<string, unknown>) {
    setError('');
    try {
      await call('/api/crm', body);
      setDone(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <article className={'crm-task' + (open ? '' : ' closed')}>
      <header>
        <span className="crm-chip">{ruleName(task.rule)}</span>
        <strong>{task.title}</strong>
        <small className={open && task.due < now - DAY ? 'late' : ''}>
          {open
            ? dueText(task.due, now)
            : task.status === 'done'
              ? `đã liên hệ ${stamp(task.handled_at ?? 0)}`
              : `đã bỏ qua ${stamp(task.handled_at ?? 0)}`}
        </small>
      </header>
      <p>
        <button className="crm-link" onClick={() => onOpenCustomer(task.customer_id)}>
          {task.name}
        </button>{' '}
        ·{' '}
        <a href={`tel:${task.phone}`}>
          <Phone size={13} /> {task.phone}
        </a>{' '}
        ·{' '}
        <a href={zaloLink(task.phone)} target="_blank" rel="noreferrer">
          <MessageCircle size={13} /> Zalo
        </a>
        {task.assignee_name && <> · phụ trách: {task.assignee_name}</>}
      </p>
      {open && (
        <div className="crm-message">
          <span>{task.message}</span>
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard?.writeText(task.message).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã chép' : 'Sao chép'}
          </button>
        </div>
      )}
      {!open && task.note && <p className="muted">{task.note}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {open && canWork && !done && (
        <div className="crm-actions">
          <button className="primary" onClick={() => setDone(true)}>
            Đã liên hệ
          </button>
          {!task.assignee && (
            <button
              className="secondary"
              onClick={() => act({ action: 'task-claim', id: task.id })}
            >
              Nhận việc
            </button>
          )}
          <select
            aria-label="Hẹn lại"
            value=""
            onChange={(e) =>
              e.target.value &&
              act({ action: 'task-snooze', id: task.id, days: Number(e.target.value) })
            }
          >
            <option value="">Hẹn lại…</option>
            <option value="1">Sau 1 ngày</option>
            <option value="3">Sau 3 ngày</option>
            <option value="7">Sau 7 ngày</option>
          </select>
          <button
            className="secondary"
            onClick={() => {
              const reason = window.prompt('Lý do bỏ qua:');
              if (reason && reason.trim().length >= 2)
                act({ action: 'task-skip', id: task.id, reason: reason.trim() });
            }}
          >
            Bỏ qua
          </button>
        </div>
      )}
      {open && canWork && done && (
        <div className="crm-actions">
          <select
            aria-label="Kênh liên hệ"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            {CHANNELS.filter((c) => c !== 'note').map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            aria-label="Kết quả liên hệ"
            placeholder="Kết quả (ví dụ: hẹn đặt lịch thứ 7)"
            value={note}
            maxLength={600}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="primary"
            onClick={() => act({ action: 'task-done', id: task.id, channel, note })}
          >
            Lưu kết quả
          </button>
          <button className="secondary" onClick={() => setDone(false)}>
            Hủy
          </button>
        </div>
      )}
    </article>
  );
}

function TasksView({
  canWork,
  onOpenCustomer,
}: {
  canWork: boolean;
  onOpenCustomer: (id: string) => void;
}) {
  const [data, setData] = useState<{ tasks: CrmTask[]; counts: Counts } | null>(null);
  const [rule, setRule] = useState('all');
  const [mine, setMine] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call('/api/crm?view=tasks')) as unknown as {
        tasks: CrmTask[];
        counts: Counts;
      };
      setData(v);
      setNow(Date.now());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <p>Đang tải…</p>;
  const visible = data.tasks.filter(
    (t) => (rule === 'all' || t.rule === rule) && (!mine || t.mine),
  );
  const open = visible.filter((t) => t.status === 'open');
  const closed = visible.filter((t) => t.status !== 'open');
  return (
    <>
      <div className="crm-kpis">
        {[
          ['Quá hạn', data.counts.overdue],
          ['Hôm nay', data.counts.today],
          ['Sắp tới', data.counts.upcoming],
          ['Đã liên hệ 7 ngày qua', data.counts.doneWeek],
        ].map(([label, n]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="crm-filters">
        <select
          aria-label="Lọc theo quy trình"
          value={rule}
          onChange={(e) => setRule(e.target.value)}
        >
          <option value="all">Tất cả quy trình</option>
          {CRM_RULES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          <option value="manual">Việc thêm tay</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Việc
          của tôi
        </label>
      </div>
      {open.length ? (
        open.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            now={now}
            canWork={canWork}
            onChanged={load}
            onOpenCustomer={onOpenCustomer}
          />
        ))
      ) : (
        <div className="empty">
          <h3>Không có việc cần làm</h3>
          <p>
            Việc chăm sóc tự xuất hiện khi có khách mới, buổi chơi vừa xong, gói sắp hết, sinh nhật…
          </p>
        </div>
      )}
      {closed.length > 0 && (
        <details>
          <summary>Đã xử lý gần đây ({closed.length})</summary>
          {closed.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              now={now}
              canWork={false}
              onChanged={load}
              onOpenCustomer={onOpenCustomer}
            />
          ))}
        </details>
      )}
    </>
  );
}

function CustomerDetail({
  id,
  canWork,
  onClose,
  onChanged,
}: {
  id: string;
  canWork: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [channel, setChannel] = useState<Channel>('call');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call(
        '/api/crm?view=customer&id=' + encodeURIComponent(id),
      )) as unknown as Detail;
      setD(v);
      setBirthday(v.customer.birthday);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the customer changes
    load();
  }, [load]);
  async function act(body: Record<string, unknown>, after?: () => void) {
    setError('');
    try {
      await call('/api/crm', body);
      after?.();
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  if (!d) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  const c = d.customer;
  return (
    <section className="crm-detail">
      <header>
        <div>
          <h3>{c.name}</h3>
          <p>
            <a href={`tel:${c.phone}`}>
              <Phone size={13} /> {c.phone}
            </a>{' '}
            ·{' '}
            <a href={zaloLink(c.phone)} target="_blank" rel="noreferrer">
              <MessageCircle size={13} /> Zalo
            </a>
          </p>
          <p>
            {c.segments.map((s) => (
              <span key={s} className={'crm-chip seg-' + s}>
                {SEGMENT_LABELS[s]}
              </span>
            ))}
          </p>
        </div>
        <button className="secondary" onClick={onClose}>
          Đóng
        </button>
      </header>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="crm-kpis">
        <div>
          <span>Số lần chơi</span>
          <strong>{c.visits}</strong>
        </div>
        <div>
          <span>Chơi gần nhất</span>
          <strong>{c.last_visit ? day(c.last_visit) : '—'}</strong>
        </div>
        <div>
          <span>Tổng chi tiêu</span>
          <strong>{money(c.spend)}</strong>
        </div>
        <div>
          <span>Điểm</span>
          <strong>{c.points}</strong>
        </div>
      </div>
      {canWork && (
        <div className="crm-actions">
          <label>
            Ngày sinh
            <input
              type="text"
              placeholder="YYYY-MM-DD hoặc MM-DD"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            onClick={() =>
              act({ action: 'birthday-set', customerId: id, birthday: birthday.trim() })
            }
          >
            Lưu ngày sinh
          </button>
        </div>
      )}
      {canWork && (
        <>
          <h4>Ghi nhận liên hệ</h4>
          <div className="crm-actions">
            <select
              aria-label="Kênh"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              {CHANNELS.map((x) => (
                <option key={x} value={x}>
                  {CHANNEL_LABELS[x]}
                </option>
              ))}
            </select>
            <input
              aria-label="Nội dung ghi chú"
              placeholder="Nội dung trao đổi"
              value={content}
              maxLength={800}
              onChange={(e) => setContent(e.target.value)}
            />
            <button
              className="primary"
              disabled={!content.trim()}
              onClick={() =>
                act({ action: 'note-add', customerId: id, channel, content: content.trim() }, () =>
                  setContent(''),
                )
              }
            >
              Lưu
            </button>
          </div>
          <div className="crm-actions">
            <input
              aria-label="Việc cần làm thêm"
              placeholder="Thêm việc cần làm (ví dụ: gọi báo giá gói VIP)"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              className="secondary"
              disabled={title.trim().length < 2}
              onClick={() =>
                act({ action: 'task-create', customerId: id, title: title.trim(), days: 1 }, () =>
                  setTitle(''),
                )
              }
            >
              Thêm việc (ngày mai)
            </button>
          </div>
        </>
      )}
      <h4>Lịch sử chăm sóc</h4>
      <ul className="crm-timeline">
        {d.interactions.map((i) => (
          <li key={i.id}>
            <strong>{CHANNEL_LABELS[i.channel]}</strong> · {stamp(i.created)}
            {i.actor_name ? ` · ${i.actor_name}` : ''}
            <br />
            {i.content}
          </li>
        ))}
        {!d.interactions.length && <li>Chưa có liên hệ nào được ghi nhận.</li>}
      </ul>
      <h4>Việc chăm sóc</h4>
      <ul className="crm-timeline">
        {d.tasks.map((t) => (
          <li key={t.id}>
            <strong>{t.title}</strong> ·{' '}
            {t.status === 'open' ? 'đang chờ' : t.status === 'done' ? 'đã liên hệ' : 'đã bỏ qua'}
            {t.status === 'open' && <> · {dueText(t.due, d.now)}</>}
          </li>
        ))}
        {!d.tasks.length && <li>Chưa có việc nào.</li>}
      </ul>
      <h4>Gói và thẻ</h4>
      <ul className="crm-timeline">
        {d.packages.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> · hạn {day(p.expires)} ·{' '}
            {(JSON.parse(p.balances ?? '[]') as { kind: GrantKind; remaining: number }[])
              .map(
                (b) =>
                  `${b.remaining >= UNLIMITED ? 'không giới hạn' : b.remaining} ${KIND_LABELS[b.kind].toLowerCase()}`,
              )
              .join(', ')}
          </li>
        ))}
        {!d.packages.length && <li>Chưa có gói.</li>}
      </ul>
      <h4>Các buổi chơi gần đây</h4>
      <ul className="crm-timeline">
        {d.visits.map((v) => (
          <li key={v.id}>
            {day(v.finished)} · {SERVICE[v.service] ?? v.service} · {money(v.amount)}
          </li>
        ))}
        {!d.visits.length && <li>Chưa có buổi chơi đã thanh toán.</li>}
      </ul>
    </section>
  );
}

function CustomersView({ canWork, focus }: { canWork: boolean; focus: string | null }) {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | Segment>('all');
  const [selected, setSelected] = useState<string | null>(focus);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call(
        '/api/crm?view=customers&q=' + encodeURIComponent(query),
      )) as unknown as {
        customers: CustomerRow[];
      };
      setRows(v.customers);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [query]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  const shown = (rows ?? []).filter((c) => segment === 'all' || c.segments.includes(segment));
  return (
    <div className="crm-customers">
      <div>
        <div className="crm-filters">
          <input
            type="search"
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Nhóm khách"
            value={segment}
            onChange={(e) => setSegment(e.target.value as 'all' | Segment)}
          >
            <option value="all">Tất cả nhóm</option>
            {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách</th>
                <th>Nhóm</th>
                <th>Lần chơi</th>
                <th>Gần nhất</th>
                <th>Chi tiêu</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr
                  key={c.id}
                  className={c.id === selected ? 'selected' : ''}
                  onClick={() => setSelected(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <small>{c.phone}</small>
                    {c.open_tasks > 0 && <b className="crm-dot"> · {c.open_tasks} việc</b>}
                  </td>
                  <td>
                    {c.segments.map((s) => (
                      <span key={s} className={'crm-chip seg-' + s}>
                        {SEGMENT_LABELS[s]}
                      </span>
                    ))}
                  </td>
                  <td>{c.visits}</td>
                  <td>{c.last_visit ? day(c.last_visit) : '—'}</td>
                  <td>{money(c.spend)}</td>
                </tr>
              ))}
              {rows && !shown.length && (
                <tr>
                  <td colSpan={5}>Chưa có khách phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <CustomerDetail
          id={selected}
          canWork={canWork}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function FlowsView() {
  const [s, setS] = useState<CrmSettings | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    call('/api/crm?view=tasks')
      .then((v) => setS(v.settings as CrmSettings))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (!s) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  return (
    <div className="crm-flows">
      <p className="muted">
        Mỗi quy trình tự sinh việc chăm sóc cho nhân viên khi có sự kiện tương ứng. Chỉnh mẫu tin
        nhắn bằng các biến: {'{ten}'} {'{cs}'} {'{ngay}'} {'{goi}'} {'{han}'} {'{con}'}{' '}
        {'{so_ngay}'} {'{diem}'}.
      </p>
      {CRM_RULES.map((r) => (
        <article key={r.id} className="crm-flow">
          <header>
            <label className="check">
              <input
                type="checkbox"
                checked={s.rules[r.id].enabled}
                onChange={(e) =>
                  setS({
                    ...s,
                    rules: { ...s.rules, [r.id]: { ...s.rules[r.id], enabled: e.target.checked } },
                  })
                }
              />
              <strong>{r.name}</strong>
            </label>
            <small>{r.help}</small>
          </header>
          {r.param && (
            <label>
              {r.param.label}
              <input
                type="number"
                min={r.param.min}
                max={r.param.max}
                value={s.rules[r.id].value}
                onChange={(e) =>
                  setS({
                    ...s,
                    rules: {
                      ...s.rules,
                      [r.id]: { ...s.rules[r.id], value: Number(e.target.value) },
                    },
                  })
                }
              />
            </label>
          )}
          <label>
            Mẫu tin nhắn
            <textarea
              rows={3}
              value={s.templates[r.id]}
              onChange={(e) =>
                setS({ ...s, templates: { ...s.templates, [r.id]: e.target.value } })
              }
            />
          </label>
        </article>
      ))}
      <label>
        Chi tiêu từ (đồng) thì gắn nhóm VIP
        <input
          type="number"
          min={0}
          value={s.vipSpend}
          onChange={(e) => setS({ ...s, vipSpend: Number(e.target.value) })}
        />
      </label>
      {msg && <p role="status">{msg}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button
        className="primary"
        onClick={async () => {
          setError('');
          setMsg('');
          try {
            await call('/api/crm', { action: 'settings-save', settings: s });
            setMsg('Đã lưu quy trình chăm sóc');
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        Lưu quy trình
      </button>
    </div>
  );
}

export function CrmPanel({ permissions }: { permissions: string[] }) {
  const canWork = permissions.includes('crm.work');
  const canManage = permissions.includes('crm.manage');
  const [tab, setTab] = useState<'tasks' | 'customers' | 'flows'>('tasks');
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <section className="crm-panel">
      <div className="tabs" role="tablist">
        {(
          [
            ['tasks', 'Việc cần làm'],
            ['customers', 'Khách hàng'],
            ...(canManage ? [['flows', 'Quy trình tự động']] : []),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'tasks' && (
        <TasksView
          canWork={canWork}
          onOpenCustomer={(id) => {
            setFocus(id);
            setTab('customers');
          }}
        />
      )}
      {tab === 'customers' && (
        <CustomersView key={focus ?? 'all'} canWork={canWork} focus={focus} />
      )}
      {tab === 'flows' && canManage && <FlowsView />}
    </section>
  );
}
