'use client';
import { useCallback, useEffect, useState } from 'react';
import { Chips, DataTable, FilterBar, PageTabs } from './kit';
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
import { LeadsView, AgentsView, ChannelsView, LeadReportView } from './LeadPanel';
import { LEAD_STATUS_LABELS, SOURCE_LABELS, type LeadSource } from '../../lib/leads';

type Counts = { overdue: number; today: number; upcoming: number; doneWeek: number };
type CustomerRow = {
  email: string;
  zalo_id: string;
  marketing_consent: number;
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
type LeadInfo = {
  leads: {
    id: string;
    status: string;
    source: string;
    campaign: string;
    need: string;
    assignee_name: string | null;
    due_at: number | null;
    first_call_at: number | null;
    received_at: number;
  }[];
  events: {
    id: string;
    kind: string;
    detail: string;
    created: number;
    actor_name: string | null;
  }[];
};
const EVENT_TEXT: Record<string, (d: Record<string, unknown>) => string> = {
  received: (d) => `Tiếp nhận lead từ ${d.source}${d.campaign ? ` (${d.campaign})` : ''}`,
  contact: (d) => `Khách liên hệ lại qua ${d.source}`,
  assigned: (d) =>
    `Giao cho ${d.to}${d.mode === 'reassigned' ? ' (chuyển vì nhân viên trước chưa gọi)' : ''}`,
  queued: () => 'Vào hàng chờ: chưa có nhân viên trực',
  overdue: (d) => `Quá hạn 5 phút${d.agent ? `: ${d.agent} chưa ghi nhận cuộc gọi` : ''}`,
  call: (d) =>
    `Cuộc gọi: ${d.label}${d.note ? `. ${d.note}` : ''}${d.seconds != null ? ` (phản hồi sau ${Math.round(Number(d.seconds) / 60)} phút)` : ''}`,
  replied: (d) => `${d.label}${d.note ? `. ${d.note}` : ''}`,
  claimed: () => 'Nhân viên nhận lead',
  booked: () => 'Đã đặt lịch',
  lost: (d) => `Không đặt: ${d.reason}`,
  link_sent: (d) => (d.manual ? 'Tạo link đặt lịch (gửi thủ công)' : 'Gửi link đặt lịch cho khách'),
  notify_gap: (d) => String(d.reason ?? 'Không có kênh thông báo'),
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
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [contact, setContact] = useState({ email: '', zaloId: '' });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [channel, setChannel] = useState<Channel>('call');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [sub, setSub] = useState('overview');
  const load = useCallback(async () => {
    try {
      const v = (await call(
        '/api/crm?view=customer&id=' + encodeURIComponent(id),
      )) as unknown as Detail;
      setD(v);
      setBirthday(v.customer.birthday);
      setContact({ email: v.customer.email, zaloId: v.customer.zalo_id });
      try {
        setLead(
          (await call('/api/crm/leads?customer=' + encodeURIComponent(id))) as unknown as LeadInfo,
        );
      } catch {
        setLead(null);
      }
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
      <PageTabs
        value={sub}
        onChange={setSub}
        tabs={[
          { key: 'overview', label: 'Tổng quan' },
          { key: 'care', label: 'Chăm sóc' },
          { key: 'history', label: 'Lịch sử' },
        ]}
      />
      {sub === 'overview' && canWork && (
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
      {sub === 'care' && canWork && (
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
      {sub === 'overview' && lead && lead.leads.length > 0 && (
        <>
          <h4>Người phụ trách và hạn gọi</h4>
          <ul className="crm-timeline">
            {lead.leads.map((l) => (
              <li key={l.id}>
                <strong>{LEAD_STATUS_LABELS[l.status] ?? l.status}</strong> ·{' '}
                {SOURCE_LABELS[l.source as LeadSource] ?? l.source}
                {l.campaign ? ` · ${l.campaign}` : ''} · phụ trách: {l.assignee_name ?? 'chưa có'}
                <br />
                Nhận lúc {stamp(l.received_at)}
                {l.first_call_at
                  ? ` · đã liên hệ lúc ${stamp(l.first_call_at)}`
                  : l.due_at
                    ? ` · hạn gọi ${stamp(l.due_at)}`
                    : ''}
              </li>
            ))}
          </ul>
        </>
      )}
      {sub === 'overview' && canWork && (
        <>
          <h4>Liên hệ và đồng ý nhận tin</h4>
          <div className="crm-actions">
            <input
              aria-label="Email khách"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
            <input
              aria-label="Zalo ID khách"
              placeholder="Zalo ID (để nhắn qua OA)"
              value={contact.zaloId}
              onChange={(e) => setContact({ ...contact, zaloId: e.target.value })}
            />
            <button
              className="secondary"
              onClick={() =>
                act({
                  action: 'contact-set',
                  customerId: id,
                  email: contact.email.trim(),
                  zaloId: contact.zaloId.trim(),
                })
              }
            >
              Lưu liên hệ
            </button>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={c.marketing_consent === 1}
              onChange={(e) =>
                act({ action: 'consent-set', customerId: id, consent: e.target.checked })
              }
            />
            Khách đồng ý nhận tin ưu đãi (tin đặt lịch, biên nhận, cảm ơn vẫn gửi khi chưa đồng ý)
          </label>
        </>
      )}
      {sub === 'care' && canWork && (
        <>
          <h4>Phản hồi sau buổi chơi</h4>
          <div className="crm-actions">
            <select
              aria-label="Điểm hài lòng"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </select>
            <input
              aria-label="Nhận xét của khách"
              placeholder="Nhận xét của khách"
              value={comment}
              maxLength={600}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              className="secondary"
              onClick={() =>
                act({ action: 'feedback', customerId: id, rating, comment: comment.trim() }, () =>
                  setComment(''),
                )
              }
            >
              Ghi nhận phản hồi
            </button>
          </div>
          <p className="muted">
            Từ 3 sao trở xuống là phản ánh: tự giao quản lý xử lý và báo quản lý ngay.
          </p>
        </>
      )}
      {sub === 'history' && lead && lead.events.length > 0 && (
        <>
          <h4>Lịch sử xử lý lead</h4>
          <ul className="crm-timeline">
            {lead.events.map((e) => {
              const detail = JSON.parse(e.detail || '{}') as Record<string, unknown>;
              return (
                <li key={e.id}>
                  {stamp(e.created)} · {(EVENT_TEXT[e.kind] ?? (() => e.kind))(detail)}
                  {e.actor_name ? ` · ${e.actor_name}` : ''}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {sub === 'history' && (
        <>
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
        </>
      )}
      {sub === 'care' && (
        <>
          <h4>Việc chăm sóc</h4>
          <ul className="crm-timeline">
            {d.tasks.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong> ·{' '}
                {t.status === 'open'
                  ? 'đang chờ'
                  : t.status === 'done'
                    ? 'đã liên hệ'
                    : 'đã bỏ qua'}
                {t.status === 'open' && <> · {dueText(t.due, d.now)}</>}
              </li>
            ))}
            {!d.tasks.length && <li>Chưa có việc nào.</li>}
          </ul>
        </>
      )}
      {sub === 'overview' && (
        <>
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
        </>
      )}
      {sub === 'overview' && (
        <>
          <h4>Các buổi chơi gần đây</h4>
          <ul className="crm-timeline">
            {d.visits.map((v) => (
              <li key={v.id}>
                {day(v.finished)} · {SERVICE[v.service] ?? v.service} · {money(v.amount)}
              </li>
            ))}
            {!d.visits.length && <li>Chưa có buổi chơi đã thanh toán.</li>}
          </ul>
        </>
      )}
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
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Tìm theo tên hoặc số điện thoại"
          label="Tìm khách hàng"
        >
          <Chips
            value={segment}
            onChange={(v) => setSegment(v as 'all' | Segment)}
            options={[
              { key: 'all', label: 'Tất cả' },
              ...(Object.keys(SEGMENT_LABELS) as Segment[]).map((k) => ({
                key: k,
                label: SEGMENT_LABELS[k],
              })),
            ]}
          />
        </FilterBar>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {rows && (
          <DataTable
            rows={shown}
            rowKey={(c) => c.id}
            empty="Chưa có khách phù hợp"
            onRowClick={(c) => setSelected(c.id)}
            rowActive={(c) => c.id === selected}
            columns={[
              {
                key: 'name',
                header: 'Khách',
                cell: (c) => (
                  <>
                    <strong>{c.name}</strong>
                    <small>
                      {c.phone}
                      {c.open_tasks > 0 && <b className="crm-dot"> · {c.open_tasks} việc</b>}
                    </small>
                  </>
                ),
              },
              {
                key: 'seg',
                header: 'Nhóm',
                cell: (c) =>
                  c.segments.map((x) => (
                    <span key={x} className={'crm-chip seg-' + x}>
                      {SEGMENT_LABELS[x]}
                    </span>
                  )),
              },
              { key: 'visits', header: 'Lần chơi', cell: (c) => c.visits },
              {
                key: 'last',
                header: 'Gần nhất',
                cell: (c) => (c.last_visit ? day(c.last_visit) : '—'),
              },
              { key: 'spend', header: 'Chi tiêu', align: 'right', cell: (c) => money(c.spend) },
            ]}
          />
        )}
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

export function CrmPanel({
  permissions,
  initialCustomer = null,
}: {
  permissions: string[];
  initialCustomer?: string | null;
}) {
  const canWork = permissions.includes('crm.work');
  const canManage = permissions.includes('crm.manage');
  const [tab, setTab] = useState<'leads' | 'tasks' | 'customers' | 'report' | 'setup'>(
    initialCustomer ? 'customers' : 'leads',
  );
  const [setup, setSetup] = useState<'agents' | 'channels' | 'flows'>('agents');
  const [focus, setFocus] = useState<string | null>(initialCustomer);
  return (
    <section className="crm-panel">
      <PageTabs
        value={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: 'leads', label: 'Lead mới' },
          { key: 'tasks', label: 'Việc cần làm' },
          { key: 'customers', label: 'Khách hàng' },
          { key: 'report', label: 'Báo cáo tư vấn', hidden: !canManage },
          { key: 'setup', label: 'Thiết lập' },
        ]}
      />
      {tab === 'leads' && (
        <LeadsView
          canWork={canWork}
          manager={canManage}
          onOpenCustomer={(id) => {
            setFocus(id);
            setTab('customers');
          }}
        />
      )}
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
      {tab === 'report' && canManage && <LeadReportView />}
      {tab === 'setup' && (
        <>
          <FilterBar>
            <Chips
              value={setup}
              onChange={(k) => setSetup(k as typeof setup)}
              options={[
                { key: 'agents', label: 'Nhân sự nhận lead' },
                { key: 'channels', label: 'Kênh & tích hợp' },
                ...(canManage ? [{ key: 'flows', label: 'Quy trình tự động' }] : []),
              ]}
            />
          </FilterBar>
          {setup === 'agents' && <AgentsView manager={canManage} />}
          {setup === 'channels' && <ChannelsView manager={canManage} />}
          {setup === 'flows' && canManage && <FlowsView />}
        </>
      )}
    </section>
  );
}
