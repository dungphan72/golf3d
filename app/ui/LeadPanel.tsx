'use client';
import { useCallback, useEffect, useState } from 'react';
import { Phone, MessageCircle, Copy, Check, Clock } from 'lucide-react';
import {
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  LEAD_STATUS_LABELS,
  NEEDS,
  NEED_LABELS,
  SOURCE_LABELS,
  type CallResult,
  type LeadSource,
  type Need,
} from '../../lib/leads';

type Lead = {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  source: LeadSource;
  campaign: string;
  channel_ref: string;
  need: string;
  guests: number;
  message: string;
  status: 'queued' | 'assigned' | 'contacted' | 'booked' | 'lost';
  assignee: string | null;
  assignee_name: string | null;
  due_at: number | null;
  first_call_at: number | null;
  received_at: number;
  contacts: number;
  marketing_consent: number | null;
};
type Avail = {
  lines: number;
  freeRooms: { id: string; name: string }[];
  enough: boolean;
  totalText: string;
  note: string;
  alternatives: { start: number; label: string; free: number }[];
};

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
const stamp = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const mmss = (ms: number) => {
  const s = Math.abs(Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const toMs = (local: string) => Date.parse(local + ':00+07:00');

function Consult({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const [service, setService] = useState<'gdr' | '9' | '18'>(
    lead.need === '9' ? '9' : lead.need === '18' ? '18' : lead.need === 'swing' ? 'gdr' : '18',
  );
  const [start, setStart] = useState('');
  const [guests, setGuests] = useState(String(lead.guests || 1));
  const [vip, setVip] = useState(false);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [sent, setSent] = useState<{ url: string; manual: boolean } | null>(null);
  const [error, setError] = useState('');
  const body = () => ({ service, start: toMs(start), guests: Number(guests) || 1, vip });
  async function check(at?: number) {
    setError('');
    setSent(null);
    try {
      const b = body();
      setAvail(
        (await call('/api/crm/availability', at ? { ...b, start: at } : b)) as unknown as Avail,
      );
    } catch (e) {
      setAvail(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="crm-consult">
      <div className="crm-actions">
        <select
          aria-label="Dịch vụ"
          value={service}
          onChange={(e) => setService(e.target.value as typeof service)}
        >
          <option value="gdr">Luyện tập (swing)</option>
          <option value="9">Game 9 hố</option>
          <option value="18">Game 18 hố</option>
        </select>
        <input
          aria-label="Giờ chơi"
          type="datetime-local"
          step={900}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          aria-label="Số khách"
          type="number"
          min={1}
          max={1000}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          style={{ minWidth: '6rem', flex: 0 }}
        />
        <label className="check">
          <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} /> Phòng
          VIP
        </label>
        <button className="secondary" disabled={!start} onClick={() => check()}>
          Kiểm tra lịch trống và báo giá
        </button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {avail && (
        <div className="crm-avail" role="status">
          <p>
            {avail.enough ? (
              <>
                <strong>Còn {avail.freeRooms.length} phòng trống</strong>
                {avail.lines > 1 && ` (cần ${avail.lines} line)`}:{' '}
                {avail.freeRooms.map((r) => r.name).join(', ')}
              </>
            ) : (
              <strong>Không đủ phòng trống ở giờ này (cần {avail.lines} line)</strong>
            )}
          </p>
          <p>
            Tạm tính: <strong>{avail.totalText}</strong> · {avail.note}
          </p>
          {avail.alternatives.length > 0 && (
            <p>
              Giờ gần đó còn trống:{' '}
              {avail.alternatives.map((a) => (
                <button
                  key={a.start}
                  className="secondary"
                  onClick={() => {
                    const d = new Date(a.start + 7 * 3_600_000).toISOString().slice(0, 16);
                    setStart(d);
                    check(a.start);
                  }}
                >
                  {a.label}
                </button>
              ))}
            </p>
          )}
          {avail.enough && (
            <button
              className="primary"
              onClick={async () => {
                setError('');
                try {
                  const v = (await call('/api/crm/leads', {
                    action: 'send-link',
                    id: lead.id,
                    ...body(),
                  })) as { url: string; manual: boolean };
                  setSent(v);
                  onDone();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Gửi link đặt lịch cho khách
            </button>
          )}
        </div>
      )}
      {sent && (
        <div className="crm-avail" role="status">
          <p>
            {sent.manual
              ? 'Khách chưa có email hoặc Zalo trong hồ sơ: hãy gửi link này cho khách bằng tay (tin nhắn, Zalo cá nhân).'
              : 'Đã đưa link vào hàng gửi tin cho khách (gửi ngay khi kênh email/Zalo đã cấu hình).'}
          </p>
          <p className="crm-url">{sent.url}</p>
          <button className="secondary" onClick={() => navigator.clipboard?.writeText(sent.url)}>
            <Copy size={14} /> Sao chép link
          </button>
        </div>
      )}
    </div>
  );
}

function LeadCard({
  lead,
  now,
  me,
  manager,
  onChanged,
  onOpenCustomer,
}: {
  lead: Lead;
  now: number;
  me: string;
  manager: boolean;
  onChanged: () => void;
  onOpenCustomer: (id: string) => void;
}) {
  const [mode, setMode] = useState<'' | 'call' | 'consult'>('');
  const [result, setResult] = useState<CallResult>('answered');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState(
    lead.source === 'zalo' ? 'Zalo' : lead.source === 'facebook' ? 'Facebook' : 'Zalo',
  );
  const [error, setError] = useState('');
  const open = !['booked', 'lost'].includes(lead.status);
  const mine = lead.assignee === me;
  const canAct = open && (mine || manager);
  const waiting = lead.first_call_at == null && open;
  const remaining = lead.due_at != null ? lead.due_at - now : null;
  const overdue = waiting && remaining != null && remaining < 0;
  const noPhone = !lead.phone;
  async function act(body: Record<string, unknown>) {
    setError('');
    try {
      await call('/api/crm/leads', body);
      setMode('');
      setNote('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <article className={'crm-lead' + (overdue ? ' late' : '') + (open ? '' : ' closed')}>
      <header>
        <div>
          <strong>
            {lead.name || (lead.phone ? 'Khách ' + lead.phone.slice(-4) : 'Khách chưa có tên')}
          </strong>
          {lead.phone ? (
            <>
              {' '}
              ·{' '}
              <a href={`tel:${lead.phone}`}>
                <Phone size={13} /> {lead.phone}
              </a>{' '}
              ·{' '}
              <a href={`https://zalo.me/${lead.phone}`} target="_blank" rel="noreferrer">
                <MessageCircle size={13} /> Zalo
              </a>
            </>
          ) : (
            <b className="crm-warn">
              {' '}
              · Chưa có số điện thoại: trả lời qua {SOURCE_LABELS[lead.source]}
            </b>
          )}
        </div>
        <span className={'crm-chip lead-' + lead.status}>{LEAD_STATUS_LABELS[lead.status]}</span>
      </header>
      <p className="crm-meta">
        <span className="crm-chip">{SOURCE_LABELS[lead.source]}</span>
        {lead.campaign && <span className="crm-chip">{lead.campaign}</span>}
        <span>
          {NEED_LABELS[lead.need as Need] ?? 'Nhu cầu chưa rõ'}
          {lead.guests ? ` · ${lead.guests} khách` : ''}
        </span>
        <span>· nhận lúc {stamp(lead.received_at)}</span>
        {lead.contacts > 1 && <span>· khách liên hệ {lead.contacts} lần</span>}
        <span>· phụ trách: {lead.assignee_name ?? 'chưa có'}</span>
        {lead.marketing_consent === 1 && <span className="crm-chip">Đồng ý nhận tin ưu đãi</span>}
      </p>
      {lead.message && <p className="crm-quote">{lead.message}</p>}
      {waiting && lead.status === 'assigned' && remaining != null && (
        <p className={overdue ? 'crm-sla late' : 'crm-sla'}>
          <Clock size={14} />{' '}
          {overdue
            ? `Quá hạn ${mmss(remaining)}: chưa ghi nhận cuộc gọi`
            : `Cần gọi trong ${mmss(remaining)}`}
        </p>
      )}
      {lead.status === 'queued' && (
        <p className="crm-sla late">Đang trong hàng chờ: chưa có nhân viên trực nhận lead</p>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {open && (
        <div className="crm-actions">
          {lead.status === 'queued' && (
            <button className="primary" onClick={() => act({ action: 'claim', id: lead.id })}>
              Nhận lead này
            </button>
          )}
          {canAct && mode !== 'call' && (
            <button className="primary" onClick={() => setMode('call')}>
              {noPhone ? 'Ghi nhận đã trả lời' : 'Ghi nhận cuộc gọi'}
            </button>
          )}
          {canAct && (
            <button
              className="secondary"
              onClick={() => setMode(mode === 'consult' ? '' : 'consult')}
            >
              Tư vấn, lịch trống, báo giá
            </button>
          )}
          {lead.customer_id && (
            <button className="secondary" onClick={() => onOpenCustomer(lead.customer_id!)}>
              Hồ sơ khách
            </button>
          )}
          {canAct && (
            <button className="secondary" onClick={() => act({ action: 'booked', id: lead.id })}>
              Đã đặt lịch
            </button>
          )}
          {canAct && (
            <button
              className="secondary"
              onClick={() => {
                const reason = window.prompt('Lý do khách không đặt:');
                if (reason && reason.trim().length >= 2)
                  act({ action: 'lost', id: lead.id, reason: reason.trim() });
              }}
            >
              Không đặt
            </button>
          )}
        </div>
      )}
      {mode === 'call' && canAct && (
        <div className="crm-actions">
          {noPhone ? (
            <input
              aria-label="Kênh đã trả lời"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="Kênh đã trả lời (Zalo, Facebook...)"
            />
          ) : (
            <select
              aria-label="Kết quả cuộc gọi"
              value={result}
              onChange={(e) => setResult(e.target.value as CallResult)}
            >
              {CALL_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {CALL_RESULT_LABELS[r]}
                </option>
              ))}
            </select>
          )}
          <input
            aria-label="Ghi chú cuộc gọi"
            placeholder="Ghi chú (nhu cầu, hẹn lịch...)"
            value={note}
            maxLength={600}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="primary"
            onClick={() =>
              act(
                noPhone
                  ? { action: 'replied', id: lead.id, channel, note }
                  : { action: 'call', id: lead.id, result, note },
              )
            }
          >
            Lưu
          </button>
          <button className="secondary" onClick={() => setMode('')}>
            Hủy
          </button>
        </div>
      )}
      {mode === 'consult' && canAct && <Consult lead={lead} onDone={onChanged} />}
    </article>
  );
}

export function LeadsView({
  canWork,
  manager,
  onOpenCustomer,
}: {
  canWork: boolean;
  manager: boolean;
  onOpenCustomer: (id: string) => void;
}) {
  const [data, setData] = useState<{ leads: Lead[]; now: number; mine: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', need: '' as '' | Need, message: '' });
  const [duty, setDuty] = useState<boolean | null>(null);
  // A once-a-second clock drives the 5-minute countdowns (kept in state so render stays pure).
  const [clock, setClock] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock on mount
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const load = useCallback(async () => {
    try {
      const v = (await call('/api/crm/leads')) as unknown as {
        leads: Lead[];
        now: number;
        mine: string;
      };
      setData(v);
      setOffset(v.now - Date.now());
      const agents = (await call('/api/crm/agents')) as unknown as {
        agents: { userId: string; onDuty: boolean }[];
      };
      setDuty(agents.agents.find((a) => a.userId === v.mine)?.onDuty ?? false);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data || !clock) return <p>Đang tải…</p>;
  const now = clock + offset;
  const open = data.leads.filter((l) => !['booked', 'lost'].includes(l.status));
  const waiting = open.filter((l) => l.first_call_at == null);
  const overdue = waiting.filter(
    (l) => l.status === 'assigned' && l.due_at != null && l.due_at < now,
  );
  const queued = open.filter((l) => l.status === 'queued');
  const closed = data.leads.filter((l) => ['booked', 'lost'].includes(l.status));
  return (
    <>
      <div className="crm-kpis">
        {[
          ['Chờ gọi', waiting.length - queued.length],
          ['Quá 5 phút', overdue.length],
          ['Hàng chờ (chưa có người trực)', queued.length],
          ['Đã liên hệ', open.length - waiting.length],
        ].map(([label, n]) => (
          <div
            key={String(label)}
            className={label === 'Quá 5 phút' && Number(n) > 0 ? 'late' : ''}
          >
            <span>{label}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="crm-actions">
        {canWork && duty != null && (
          <button
            className={duty ? 'primary' : 'secondary'}
            onClick={async () => {
              try {
                await call('/api/crm/agents', { userId: data.mine, onDuty: !duty });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            {duty ? 'Tôi đang trực: nhận lead (bấm để nghỉ)' : 'Vào ca trực để nhận lead'}
          </button>
        )}
        {canWork && (
          <button className="secondary" onClick={() => setAdding(!adding)}>
            Thêm lead thủ công
          </button>
        )}
      </div>
      {adding && (
        <div className="crm-actions">
          <input
            aria-label="Tên khách"
            placeholder="Tên khách"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            aria-label="Số điện thoại"
            placeholder="Số điện thoại"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <select
            aria-label="Nhu cầu"
            value={form.need}
            onChange={(e) => setForm({ ...form, need: e.target.value as '' | Need })}
          >
            <option value="">Nhu cầu</option>
            {NEEDS.map((n) => (
              <option key={n} value={n}>
                {NEED_LABELS[n]}
              </option>
            ))}
          </select>
          <input
            aria-label="Nội dung lead"
            placeholder="Nội dung"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <button
            className="primary"
            onClick={async () => {
              try {
                await call('/api/crm/leads', {
                  action: 'create',
                  name: form.name,
                  phone: form.phone,
                  ...(form.need ? { need: form.need } : {}),
                  message: form.message,
                });
                setAdding(false);
                setForm({ name: '', phone: '', need: '', message: '' });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Tạo lead
          </button>
        </div>
      )}
      {open.length ? (
        open.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            now={now}
            me={data.mine}
            manager={manager}
            onChanged={load}
            onOpenCustomer={onOpenCustomer}
          />
        ))
      ) : (
        <div className="empty">
          <h3>Chưa có lead đang xử lý</h3>
          <p>
            Lead từ Facebook, Zalo, website và form quảng cáo tự xuất hiện ở đây và được giao cho
            nhân viên đang trực.
          </p>
        </div>
      )}
      {closed.length > 0 && (
        <details>
          <summary>Đã đóng 3 ngày qua ({closed.length})</summary>
          {closed.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              now={now}
              me={data.mine}
              manager={manager}
              onChanged={load}
              onOpenCustomer={onOpenCustomer}
            />
          ))}
        </details>
      )}
    </>
  );
}

type Agent = {
  userId: string;
  name: string;
  email: string;
  role: string;
  receivesLeads: boolean;
  onDuty: boolean;
  lastAssigned: number | null;
  zaloId: string;
  notifyEmail: string;
};
export function AgentsView({ manager }: { manager: boolean }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [me, setMe] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call('/api/crm/agents')) as unknown as { agents: Agent[]; me: string };
      setAgents(v.agents);
      setMe(v.me);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);
  async function save(body: Record<string, unknown>) {
    setError('');
    setNotice('');
    try {
      await call('/api/crm/agents', body);
      setNotice('Đã lưu');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  if (!agents) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  return (
    <div className="crm-flows">
      <p className="muted">
        Lead được chia luân phiên cho nhân viên vừa được bật &quot;Nhận lead&quot; vừa đang trực.
        Nhân viên tự bật &quot;Đang trực&quot; khi vào ca; công tắc tự tắt sau 12 giờ. Email và Zalo
        dùng để báo lead mới và lead quá hạn.
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Nhận lead</th>
              <th>Đang trực</th>
              <th>Email báo tin</th>
              <th>Zalo ID báo tin</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <AgentRow
                key={a.userId}
                a={a}
                manager={manager}
                self={a.userId === me}
                onSave={save}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function AgentRow({
  a,
  manager,
  self,
  onSave,
}: {
  a: Agent;
  manager: boolean;
  self: boolean;
  onSave: (b: Record<string, unknown>) => void;
}) {
  const [email, setEmail] = useState(a.notifyEmail);
  const [zalo, setZalo] = useState(a.zaloId);
  return (
    <tr>
      <td>
        <strong>{a.name}</strong>
        <br />
        <small>{a.email}</small>
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`Nhận lead ${a.name}`}
          checked={a.receivesLeads}
          disabled={!manager}
          onChange={(e) =>
            onSave({
              userId: a.userId,
              receivesLeads: e.target.checked,
              ...(e.target.checked ? {} : { onDuty: false }),
            })
          }
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`Đang trực ${a.name}`}
          checked={a.onDuty}
          disabled={!(manager || self) || !a.receivesLeads}
          onChange={(e) => onSave({ userId: a.userId, onDuty: e.target.checked })}
        />
      </td>
      <td>
        <input
          aria-label={`Email báo tin ${a.name}`}
          value={email}
          placeholder={a.email}
          disabled={!manager && !self}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email !== a.notifyEmail && onSave({ userId: a.userId, email })}
        />
      </td>
      <td>
        <input
          aria-label={`Zalo ID ${a.name}`}
          value={zalo}
          disabled={!manager && !self}
          onChange={(e) => setZalo(e.target.value)}
          onBlur={() => zalo !== a.zaloId && onSave({ userId: a.userId, zaloId: zalo })}
        />
      </td>
    </tr>
  );
}

type Channels = {
  channels: {
    id: string;
    label: string;
    direction: 'in' | 'out';
    configured: boolean;
    needs: string[];
    note: string;
  }[];
  tokens: { website: boolean; ads: boolean };
  urls: Record<string, string>;
  counts: { channel: string; audience: string; status: string; n: number }[];
  recent: {
    id: string;
    channel: string;
    audience: string;
    kind: string;
    recipient: string;
    subject: string;
    status: string;
    last_error: string;
    created: number;
  }[];
};
export function ChannelsView({ manager }: { manager: boolean }) {
  const [d, setD] = useState<Channels | null>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState<{ kind: string; value: string } | null>(null);
  const [copied, setCopied] = useState('');
  const load = useCallback(async () => {
    try {
      setD((await call('/api/crm/channels')) as unknown as Channels);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);
  if (!d) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  const copy = async (text: string, id: string) => {
    await navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };
  const count = (status: string) =>
    d.counts.filter((c) => c.status === status).reduce((n, c) => n + c.n, 0);
  return (
    <div className="crm-flows">
      <h3>Kênh nhận lead và gửi tin</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kênh</th>
              <th>Hướng</th>
              <th>Trạng thái</th>
              <th>Còn thiếu</th>
            </tr>
          </thead>
          <tbody>
            {d.channels.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.label}</strong>
                  <br />
                  <small>{c.note}</small>
                </td>
                <td>{c.direction === 'in' ? 'Nhận lead' : 'Gửi tin'}</td>
                <td>
                  <span className={'crm-chip ' + (c.configured ? 'seg-loyal' : 'seg-lapsing')}>
                    {c.configured ? 'Sẵn sàng' : 'Cần cấu hình'}
                  </span>
                </td>
                <td>{c.needs.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Địa chỉ webhook</h3>
      <ul className="crm-timeline">
        {Object.entries(d.urls).map(([k, u]) => (
          <li key={k}>
            <strong>{k}</strong>: <code>{u}</code>{' '}
            <button className="secondary" onClick={() => copy(u, k)}>
              {copied === k ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </li>
        ))}
      </ul>
      {manager && (
        <div className="crm-actions">
          {(['website', 'ads'] as const).map((kind) => (
            <button
              key={kind}
              className="secondary"
              onClick={async () => {
                if (
                  d.tokens[kind] &&
                  !window.confirm('Tạo mã mới sẽ làm mã cũ ngừng hoạt động. Tiếp tục?')
                )
                  return;
                try {
                  const v = (await call('/api/crm/channels', {
                    action: 'rotate',
                    kind,
                  })) as unknown as { token: string };
                  setToken({ kind, value: v.token });
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              {d.tokens[kind] ? 'Tạo lại' : 'Tạo'} mã webhook{' '}
              {kind === 'website' ? 'Website (3dgolf.vn)' : 'Quảng cáo'}
            </button>
          ))}
        </div>
      )}
      {token && (
        <div className="crm-avail" role="status">
          <p>
            Mã webhook {token.kind === 'website' ? 'Website' : 'Quảng cáo'} (chỉ hiện một lần, hãy
            lưu lại; gửi trong header <code>x-lead-token</code>):
          </p>
          <p className="crm-url">{token.value}</p>
          <button className="secondary" onClick={() => copy(token.value, 'token')}>
            {copied === 'token' ? 'Đã chép' : 'Sao chép mã'}
          </button>
        </div>
      )}
      <h3>Hàng gửi tin (7 ngày qua)</h3>
      <p>
        Đã gửi: <strong>{count('sent')}</strong> · Đang chờ (kênh chưa cấu hình hoặc chưa đến giờ):{' '}
        <strong>{count('pending')}</strong> · Lỗi: <strong>{count('failed')}</strong> · Hết hạn:{' '}
        {count('expired')} · Đã hủy: {count('cancelled')}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lúc</th>
              <th>Kênh</th>
              <th>Gửi cho</th>
              <th>Loại</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {d.recent.slice(0, 30).map((m) => (
              <tr key={m.id}>
                <td>{stamp(m.created)}</td>
                <td>{m.channel}</td>
                <td>
                  {m.audience === 'staff' ? 'Nhân viên' : 'Khách'} · {m.recipient}
                </td>
                <td>{m.kind}</td>
                <td>
                  {m.status}
                  {m.last_error ? ` (${m.last_error})` : ''}
                </td>
              </tr>
            ))}
            {!d.recent.length && (
              <tr>
                <td colSpan={5}>Chưa có tin nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
