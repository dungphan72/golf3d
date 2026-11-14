'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Phone,
  MessageCircle,
  MessageSquare,
  Copy,
  Upload,
  Plus,
} from 'lucide-react';
import {
  Chips,
  DataTable,
  Card,
  KpiTile,
  FilterBar,
  DialogHeading,
  Field,
  Loading,
  ModalDialog,
  PageTabs,
  StatusBadge,
  useDialogs,
  type Tone,
} from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { VERDICT_LABELS, parseImportText, type PreviewRow, type Verdict } from '../core/import';
import { TargetCard } from './TargetCard';
import { RANGE_DAYS, WIDGETS, visibleWidgets, type DashLayout } from '../core/dashboard';
import {
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  NEXT_ACTION_LABELS,
  type CallResult,
  type NextAction,
} from '../core/calls';
import { STAGES, STAGE_LABELS, type Stage } from '../core/stages';
import { call, countdown, dateOnly, errText, stamp, toMs, type Lead, type Staff } from './api';

export type CrmNavigateFn = (
  view: string,
  extra?: { customerId?: string; phone?: string; name?: string; room?: string },
) => void;

export type Shared = {
  now: number;
  me: string;
  manager: boolean;
  staff: Staff[];
  open: (id: string) => void;
  onNavigate?: CrmNavigateFn;
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
  ranking: { userId: string; name: string; leads: number; won: number }[];
  newUnhandled: number;
  overdueTasks: number;
  todayTasks: number;
  apptToday: number;
  days: number;
  layout: DashLayout;
};
export function OverviewScreen({
  cron,
}: {
  cron: { value: Record<string, unknown>; updated: number } | null;
  manager: boolean;
}) {
  const { data, error, reload, setError } = useLoad<Overview>('/api/crm2/overview', 30_000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashLayout | null>(null);
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;
  const layout = draft ?? data.layout;
  const n = (s: string) => data.stages.find((x) => x.stage === s)?.n ?? 0;
  const total = data.stages.reduce((a, x) => a + x.n, 0);
  const won = n('WON');
  const label = (id: string) => WIDGETS.find((w) => w.id === id)?.label ?? id;
  const kpi: Record<string, [string, string | number, boolean?]> = {
    kpi_overdue: ['Việc quá hạn', data.overdueTasks, data.overdueTasks > 0],
    kpi_today: ['Việc hôm nay', data.todayTasks],
    kpi_new: ['Lead mới chưa xử lý', data.newUnhandled],
    kpi_leads: [`Lead ${data.days} ngày`, total],
    kpi_won: [`Đã chốt ${data.days} ngày`, won],
    kpi_rate: ['Tỷ lệ chốt', total ? Math.round((won / total) * 100) + '%' : '—'],
    kpi_appts: ['Lịch hẹn hôm nay', data.apptToday],
  };
  const save = async (next: DashLayout | { reset: true }) => {
    try {
      await call('/api/crm2/overview', { action: 'layout', ...next });
      setDraft(null);
      setEditing(false);
      reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  const move = (id: string, d: -1 | 1) => {
    const order = [...layout.order];
    const i = order.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setDraft({ ...layout, order });
  };
  const toggle = (id: string) =>
    setDraft({
      ...layout,
      hidden: layout.hidden.includes(id) ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id],
    });
  const shown = visibleWidgets(layout);
  const kpis = shown.filter((id) => id.startsWith('kpi_'));
  const cards = shown.filter((id) => !id.startsWith('kpi_'));
  const render = (id: string) => {
    if (id === 'target') return <TargetCard key={id} />;
    if (id === 'funnel')
      return (
        <Card key={id} title={`Phễu ${data.days} ngày`} sub="Tỷ lệ chuyển đổi qua các giai đoạn">
          <DataTable
            rows={STAGES.map((s) => ({ s, n: n(s) }))}
            rowKey={(r) => r.s}
            empty="Chưa có dữ liệu"
            columns={[
              { key: 's', header: 'Giai đoạn', cell: (r) => STAGE_LABELS[r.s] },
              { key: 'n', header: 'Số lead', align: 'right', cell: (r) => r.n },
              { key: 'p', header: 'Tỷ lệ', align: 'right', cell: (r) => (total ? Math.round((r.n / total) * 100) + '%' : '0%') },
            ]}
          />
        </Card>
      );
    if (id === 'sources')
      return (
        <Card key={id} title="Nguồn khách" sub={`Hiệu quả các kênh, ${data.days} ngày`}>
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
        </Card>
      );
    if (id === 'ranking')
      return (
        <Card key={id} title="Xếp hạng nhân viên" sub={`Theo số lead chốt, ${data.days} ngày`}>
          <DataTable
            rows={data.ranking}
            rowKey={(r) => r.userId}
            empty="Chưa có dữ liệu"
            columns={[
              { key: 'n', header: 'Nhân viên', cell: (r) => r.name },
              { key: 'l', header: 'Lead', align: 'right', cell: (r) => r.leads },
              { key: 'w', header: 'Chốt', align: 'right', cell: (r) => r.won ?? 0 },
            ]}
          />
        </Card>
      );
    if (id === 'cron' && cron)
      return (
        <div key={id} style={{ background: '#f8faf8', border: '1px solid var(--kv-line, #dde5de)', borderRadius: 6, padding: '10px 14px' }}>
          <p className="crm-meta" style={{ margin: 0, fontSize: 12.5 }}>
            🕒 Lần chạy nền gần nhất: <strong>{stamp(cron.updated)}</strong> — hết hạn giữ chỗ{' '}
            <span className="crm-chip">{String(cron.value.holdsExpired ?? 0)}</span>, cảnh báo quá hạn{' '}
            <span className="crm-chip">{String(cron.value.slaAlerts ?? 0)}</span>
          </p>
        </div>
      );
    return null;
  };
  return (
    <>
      <Err text={error} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {editing ? (
          <Chips
            value={String(layout.days)}
            onChange={(v) => setDraft({ ...layout, days: Number(v) })}
            options={RANGE_DAYS.map((d) => ({ key: String(d), label: `${d} ngày` }))}
          />
        ) : (
          <small className="muted">Số liệu {data.days} ngày gần nhất</small>
        )}
        {editing ? (
          <span style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void save(layout)}>Lưu bố cục</button>
            <button className="secondary" onClick={() => void save({ reset: true })}>
              Về mặc định
            </button>
            <button
              className="secondary"
              onClick={() => {
                setDraft(null);
                setEditing(false);
              }}
            >
              Hủy
            </button>
          </span>
        ) : (
          <button className="secondary" onClick={() => setEditing(true)}>
            Tùy biến
          </button>
        )}
      </div>

      {editing && (
        <ul aria-label="Các thẻ trên tổng quan" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {layout.order.map((id, i) => (
            <li key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                <input type="checkbox" checked={!layout.hidden.includes(id)} onChange={() => toggle(id)} />
                {label(id)}
              </label>
              <button className="secondary" aria-label={`Đưa ${label(id)} lên`} disabled={i === 0} onClick={() => move(id, -1)}>
                ↑
              </button>
              <button
                className="secondary"
                aria-label={`Đưa ${label(id)} xuống`}
                disabled={i === layout.order.length - 1}
                onClick={() => move(id, 1)}
              >
                ↓
              </button>
            </li>
          ))}
        </ul>
      )}

      {kpis.length > 0 && (
        <div className="crm-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {kpis.map((id) => (
            <div key={id} className={kpi[id]?.[2] ? 'late' : ''}>
              <span>{kpi[id]?.[0]}</span>
              <strong>{kpi[id]?.[1]}</strong>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
        {cards.map(render)}
      </div>
      {shown.length === 0 && <p className="muted">Bạn đã ẩn hết các thẻ. Bấm Tùy biến để hiện lại.</p>}
    </>
  );
}

// ---------------------------------------------------------------- work desk

type WorkDeskAppointment = {
  id: string;
  leadId: string | null;
  service: string;
  at: number;
  status: string;
  note: string;
  owner: string | null;
  fullName: string;
  phone: string;
  targetService: string;
};

type WorkDeskCareTask = {
  id: string;
  leadId: string | null;
  title: string;
  type: string;
  dueAt: number | null;
  doneAt: number | null;
  assignee: string | null;
  rule: string | null;
  customerName: string;
  phone: string;
  targetService: string;
};

type WorkDeskData = {
  leads: Lead[];
  appointments: WorkDeskAppointment[];
  careTasks: WorkDeskCareTask[];
  now: number;
  mine: string;
  isManager: boolean;
  dayStart?: number;
  dayEnd?: number;
};

export const TELESALES_SCRIPTS = [
  {
    id: 'intro',
    title: '1. Chào mừng & Mời trải nghiệm 99k',
    template: (name: string, sale: string) =>
      'Dạ em chào anh/chị ' + name + ', em là ' + sale + ' bên SaiGon Indoor Golf Club. Em thấy anh/chị có quan tâm đến trải nghiệm phòng tập Golf 3D tại CLB. Em xin phép gửi anh/chị ưu đãi trải nghiệm 60 phút chỉ 99k/người cùng chuyên viên hướng dẫn sensor cảm biến đo swing. Không biết hôm nay hoặc ngày mai anh/chị tiện giờ nào ghé trải nghiệm thử ạ?',
  },
  {
    id: 'quote',
    title: '2. Báo giá thẻ hội viên & Gói GDR',
    template: (name: string, sale: string) =>
      'Dạ anh/chị ' + name + ' ơi, em ' + sale + ' gửi anh/chị bảng giá gói hội viên ưu đãi tháng này tại SaiGon Indoor Golf:\n- Gói Tập Không Giới Hạn: 3.500.000đ/tháng\n- Gói 30 giờ GDR linh hoạt: 4.800.000đ (hạn 3 tháng)\n- Gói 18 Hố 3D màn hình cong VIP: 350.000đ/giờ\nAnh/chị đăng ký trong tuần này được tặng thêm 2 buổi chỉnh swing cùng HLV nữa ạ!',
  },
  {
    id: 'appointment',
    title: '3. Xác nhận lịch hẹn trải nghiệm',
    template: (name: string, sale: string) =>
      'SaiGon Indoor Golf xin chào anh/chị ' + name + '. CLB đã giữ chỗ phòng tập trải nghiệm cho anh/chị tại số 18 Tôn Dực, Q.7. Khi đến nơi anh/chị chỉ cần đọc tên và SĐT tại quầy lễ tân là được hỗ trợ ngay ạ. Em ' + sale + ' chúc anh/chị có buổi tập thật sảng khoái!',
  },
  {
    id: 'after',
    title: '4. Thăm hỏi sau buổi tập & Khảo sát',
    template: (name: string, sale: string) =>
      'Dạ em chào anh/chị ' + name + ', em là ' + sale + ' bên SaiGon Indoor Golf. Buổi tập hôm trước của anh/chị tại phòng 3D thế nào ạ? Thiết bị và cảm biến đo bóng có ưng ý anh/chị không ạ? Nếu anh/chị cần hỗ trợ thêm thông tin gói tập dài hạn thì nhắn em nhé!',
  },
];

export function WorkScreen({ s }: { s: Shared }) {
  const { data, error, reload } = useLoad<WorkDeskData>('/api/crm2/leads?view=work', 15_000);
  const [tab, setTab] = useState<'call' | 'overdue' | 'today' | 'appointments' | 'care'>('call');
  const [result, setResult] = useState<Lead | null>(null);
  const [script, setScript] = useState<Lead | null>(null);
  const [f, setF] = useState<{ result: CallResult; note: string; when: string }>({
    result: 'INTERESTED',
    note: '',
    when: '',
  });
  const [scriptId, setScriptId] = useState('intro');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;

  const leads = data.leads ?? [];
  const appointments = data.appointments ?? [];
  const care = data.careTasks ?? [];
  const dayEnd = data.dayEnd ?? s.now + 86_400_000;
  const fresh = leads.filter((l) => l.stage === 'NEW' || l.callAttempts === 0 || l.nextAction === 'NEW');
  const overdue = leads.filter((l) => l.nextDue != null && l.nextDue < s.now);
  const today = leads.filter((l) => l.nextDue != null && l.nextDue >= s.now && l.nextDue <= dayEnd);
  const saleName = s.staff.find((m) => m.id === s.me)?.name || 'chuyên viên tư vấn';

  const openResult = (l: Lead) => {
    setF({ result: 'INTERESTED', note: '', when: '' });
    setMsg('');
    setResult(l);
  };
  const openScript = (l: Lead, id = 'intro') => {
    setScriptId(id);
    setText((TELESALES_SCRIPTS.find((x) => x.id === id) ?? TELESALES_SCRIPTS[0]).template(l.fullName, saleName));
    setScript(l);
  };
  const saveResult = async () => {
    if (!result) return;
    setBusy(true);
    setMsg('');
    try {
      await call('/api/crm2/leads', {
        action: 'result',
        id: result.id,
        result: f.result,
        note: f.note,
        ...(f.when ? { when: toMs(f.when) } : {}),
      });
      setResult(null);
      await reload();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const finishCare = async (id: string) => {
    try {
      await call('/api/crm2/tasks', { action: 'care-done', id, channel: 'call', note: 'Đã liên hệ chăm sóc khách hàng' });
      await reload();
    } catch (e) {
      setMsg(errText(e));
    }
  };
  const due = (at: number | null) => {
    const c = countdown(at, s.now);
    return <span className={c.late ? 'late tnum' : 'tnum'}>{c.text}</span>;
  };

  const leadCols = [
    {
      key: 'n',
      header: 'Khách',
      cell: (r: Lead) => (
        <button className="link" onClick={() => s.open(r.id)}>
          <strong>{r.fullName}</strong>
        </button>
      ),
    },
    { key: 'p', header: 'Điện thoại', cell: (r: Lead) => <span className="tnum">{r.phone}</span> },
    { key: 'sv', header: 'Quan tâm', cell: (r: Lead) => r.targetService || '—' },
    {
      key: 'na',
      header: 'Việc kế tiếp',
      cell: (r: Lead) => (
        <StatusBadge tone="info">{NEXT_ACTION_LABELS[r.nextAction as NextAction] ?? 'Khách mới'}</StatusBadge>
      ),
    },
    { key: 'due', header: 'Hạn', cell: (r: Lead) => due(r.nextDue) },
    {
      key: 'a',
      header: '',
      cell: (r: Lead) => (
        <span className="crm-actions">
          <a className="button primary" href={`tel:${r.phone}`} onClick={() => openResult(r)} aria-label={`Gọi ${r.fullName}`}>
            <Phone size={14} /> Gọi
          </a>
          <button className="secondary" onClick={() => openResult(r)}>
            Ghi kết quả
          </button>
          <button className="secondary" aria-label={`Kịch bản tin cho ${r.fullName}`} onClick={() => openScript(r)}>
            <MessageSquare size={14} />
          </button>
        </span>
      ),
    },
  ];
  const tabs = [
    { key: 'call', label: 'Cần gọi', count: fresh.length },
    { key: 'overdue', label: 'Quá hạn', count: overdue.length },
    { key: 'today', label: 'Hôm nay', count: today.length },
    { key: 'appointments', label: 'Lịch hẹn', count: appointments.length },
    { key: 'care', label: 'Chăm sóc', count: care.length },
  ];
  const list = tab === 'call' ? fresh : tab === 'overdue' ? overdue : today;

  return (
    <>
      <Err text={error || msg} />
      <section className="ds-tiles" aria-label="Việc hôm nay">
        <KpiTile label="Đang xử lý" value={leads.length} />
        <KpiTile label="Chưa gọi" value={fresh.length} />
        <KpiTile label="Quá hạn" value={overdue.length} />
        <KpiTile label="Lịch hẹn" value={appointments.length} />
      </section>
      <PageTabs tabs={tabs} value={tab} onChange={(k) => setTab(k as typeof tab)} />
      {(tab === 'call' || tab === 'overdue' || tab === 'today') && (
        <Card title={tabs.find((t) => t.key === tab)!.label} sub="Mỗi dòng một khách, việc kế tiếp và hạn gọi.">
          <DataTable
            rows={list}
            rowKey={(r) => r.id}
            empty="Không có khách nào"
            emptyText="Khách mới và việc gọi lại sẽ hiện ở đây."
            columns={leadCols}
          />
        </Card>
      )}
      {tab === 'appointments' && (
        <Card title="Lịch hẹn sắp tới">
          <DataTable
            rows={appointments}
            rowKey={(r) => r.id}
            empty="Chưa có lịch hẹn"
            columns={[
              { key: 'at', header: 'Giờ hẹn', cell: (r) => stamp(r.at) },
              {
                key: 'n',
                header: 'Khách',
                cell: (r) =>
                  r.leadId ? (
                    <button className="link" onClick={() => s.open(r.leadId!)}>
                      {r.fullName}
                    </button>
                  ) : (
                    r.fullName
                  ),
              },
              { key: 'p', header: 'Điện thoại', cell: (r) => <span className="tnum">{r.phone}</span> },
              { key: 'sv', header: 'Dịch vụ', cell: (r) => r.service || r.targetService || '—' },
              { key: 'st', header: 'Trạng thái', cell: (r) => <StatusBadge tone="info">{r.status}</StatusBadge> },
            ]}
          />
        </Card>
      )}
      {tab === 'care' && (
        <Card title="Việc chăm sóc khách hàng">
          <DataTable
            rows={care}
            rowKey={(r) => r.id}
            empty="Không có việc chăm sóc"
            columns={[
              { key: 'n', header: 'Khách', cell: (r) => r.customerName },
              { key: 'p', header: 'Điện thoại', cell: (r) => <span className="tnum">{r.phone}</span> },
              { key: 't', header: 'Việc', cell: (r) => r.title },
              { key: 'd', header: 'Hạn', cell: (r) => due(r.dueAt) },
              {
                key: 'a',
                header: '',
                cell: (r) => (
                  <button className="primary" onClick={() => finishCare(r.id)}>
                    Đã liên hệ
                  </button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {result && (
        <ModalDialog label="Ghi kết quả cuộc gọi" onClose={() => setResult(null)} locked={busy}>
          <DialogHeading onClose={() => setResult(null)} eyebrow={result.phone} locked={busy}>
            Kết quả cuộc gọi: {result.fullName}
          </DialogHeading>
          <Err text={msg} />
          <Field label="Kết quả">
            <select value={f.result} onChange={(e) => setF({ ...f, result: e.target.value as CallResult })}>
              {CALL_RESULTS.map((cr) => (
                <option key={cr} value={cr}>
                  {CALL_RESULT_LABELS[cr]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </Field>
          <Field label="Hẹn giờ (nếu có)">
            <input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
          </Field>
          <div className="crm-actions">
            <button className="primary" disabled={busy} onClick={saveResult}>
              {busy ? 'Đang lưu…' : 'Lưu kết quả'}
            </button>
            <button className="secondary" disabled={busy} onClick={() => setResult(null)}>
              Hủy
            </button>
          </div>
        </ModalDialog>
      )}
      {script && (
        <ModalDialog label="Kịch bản tin nhắn" onClose={() => setScript(null)}>
          <DialogHeading onClose={() => setScript(null)} eyebrow={script.phone}>
            Tin nhắn cho {script.fullName}
          </DialogHeading>
          <Field label="Kịch bản">
            <select value={scriptId} onChange={(e) => openScript(script, e.target.value)}>
              {TELESALES_SCRIPTS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nội dung">
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="crm-actions">
            <button className="primary" onClick={() => void navigator.clipboard?.writeText(text)}>
              <Copy size={14} /> Sao chép
            </button>
            <a
              className="button secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://zalo.me/${script.phone.replace(/[^0-9]/g, '')}`}
            >
              <MessageCircle size={14} /> Mở Zalo
            </a>
          </div>
        </ModalDialog>
      )}
    </>
  );
}

// ---------------------------------------------------------------- pool

type PoolData = { leads: Lead[]; quota?: number; claimedToday?: number };
/** Kho số: leads nobody owns. Staff claim; managers hand out, and recall leads that stalled (back to the pool, with a reason). */
export function PoolScreen({ s }: { s: Shared }) {
  const [mode, setMode] = useState<'pool' | 'assigned'>('pool');
  const { data, error, reload, setError } = useLoad<PoolData>(
    mode === 'pool' ? '/api/crm2/leads?view=pool' : '/api/crm2/leads?limit=300',
    20_000,
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [to, setTo] = useState('');
  const { prompt, node } = useDialogs();
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;
  const rows =
    mode === 'pool' ? data.leads : data.leads.filter((l) => l.owner && l.stage !== 'WON' && l.stage !== 'LOST');
  const act = async (body: Record<string, unknown>) => {
    try {
      await call('/api/crm2/leads', body);
      setPicked([]);
      await reload();
    } catch (e) {
      setError(errText(e));
    }
  };
  const recall = async () => {
    const reason = await prompt({ title: `Thu hồi ${picked.length} lead về kho số`, label: 'Lý do', initial: 'Quản lý thu hồi để chia lại' });
    if (reason) await act({ action: 'recall', ids: picked, reason });
  };
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const owner = (id: string | null) => s.staff.find((m) => m.id === id)?.name ?? '—';
  return (
    <>
      {node}
      <Err text={error} />
      {s.manager && (
        <PageTabs
          sub
          value={mode}
          onChange={(k) => {
            setPicked([]);
            setMode(k as 'pool' | 'assigned');
          }}
          tabs={[
            { key: 'pool', label: 'Chưa chia' },
            { key: 'assigned', label: 'Đã chia' },
          ]}
        />
      )}
      <Card
        title={mode === 'pool' ? 'Lead chưa có người phụ trách' : 'Lead đã chia, còn đang xử lý'}
        sub={
          s.manager
            ? mode === 'pool'
              ? 'Chọn lead để giao cho nhân viên.'
              : 'Chọn lead để thu hồi về kho số.'
            : `Hạn mức nhận số hôm nay: còn ${Math.max((data.quota ?? 0) - (data.claimedToday ?? 0), 0)}/${data.quota ?? 0}`
        }
      >
        {s.manager && picked.length > 0 && (
          <div className="crm-actions">
            {mode === 'pool' ? (
              <>
                <select aria-label="Giao cho" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">Giao {picked.length} lead cho…</option>
                  {s.staff.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button className="primary" disabled={!to} onClick={() => act({ action: 'assign', ids: picked, userId: to })}>
                  Giao ngay
                </button>
              </>
            ) : (
              <button className="secondary" onClick={recall}>
                Thu hồi {picked.length} lead
              </button>
            )}
          </div>
        )}
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={mode === 'pool' ? 'Kho số trống' : 'Không có lead nào đang chia'}
          emptyText={mode === 'pool' ? 'Lead chưa có người phụ trách sẽ nằm ở đây.' : undefined}
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
            ...(mode === 'assigned' ? [{ key: 'o', header: 'Phụ trách', cell: (r: Lead) => owner(r.owner) }] : []),
            { key: 'c', header: mode === 'pool' ? 'Vào kho' : 'Ngày tạo', cell: (r) => stamp(r.created) },
            {
              key: 'a',
              header: '',
              cell: (r) =>
                s.manager || mode === 'assigned' ? (
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
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- lead list and pipeline

export function LeadsScreen({ s, board }: { s: Shared; board: boolean }) {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [viewName, setViewName] = useState('');
  const [saving, setSaving] = useState(false);
  const views = useLoad<{ views: { id: string; name: string; stage: string; q: string }[] }>('/api/crm2/views');
  const [importPreview, setImportPreview] = useState<{ total: number; counts: Record<Verdict, number>; rows: PreviewRow[] } | null>(null);
  const [importBatch, setImportBatch] = useState('');
  const [f, setF] = useState({ fullName: '', phone: '', targetService: '', notes: '' });
  const url = `/api/crm2/leads?limit=200&q=${encodeURIComponent(q)}${stage ? '&stage=' + stage : ''}`;
  const { data, error, reload, setError } = useLoad<{ leads: Lead[]; total: number }>(url);
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;
  const rows = data.leads ?? [];

  const rowsToImport = () => parseImportText(importText);
  const handlePreview = async () => {
    setImportLoading(true);
    setImportStatus('');
    setImportBatch('');
    try {
      const leads = rowsToImport();
      if (!leads.length) {
        setImportStatus('Lỗi: Không tìm thấy dữ liệu hợp lệ để nhập.');
        return;
      }
      setImportPreview(
        await call<{ total: number; counts: Record<Verdict, number>; rows: PreviewRow[] }>('/api/crm2/leads', {
          action: 'import-preview',
          leads,
        }),
      );
    } catch (e) {
      setImportStatus(`Lỗi: ${errText(e)}`);
    } finally {
      setImportLoading(false);
    }
  };
  const handleDoImport = async () => {
    setImportLoading(true);
    setImportStatus('');
    try {
      const res = await call<{ created: number; absorbed: number; batch: string; errors?: string[] }>('/api/crm2/leads', {
        action: 'import',
        leads: rowsToImport(),
      });
      setImportStatus(
        `Thành công: Đã tạo mới ${res.created} lead, gộp ${res.absorbed} lead trùng lặp. ${res.errors?.length ? `Có ${res.errors.length} cảnh báo.` : ''}`,
      );
      setImportBatch(res.batch);
      setImportPreview(null);
      await reload();
    } catch (e) {
      setImportStatus(`Lỗi: ${errText(e)}`);
    } finally {
      setImportLoading(false);
    }
  };
  const handleUndo = async () => {
    setImportLoading(true);
    try {
      const res = await call<{ removed: number; kept: number }>('/api/crm2/leads', { action: 'import-undo', batch: importBatch });
      setImportStatus(`Đã hoàn tác: xóa ${res.removed} lead${res.kept ? `, giữ ${res.kept} lead đã có người xử lý` : ''}.`);
      setImportBatch('');
      await reload();
    } catch (e) {
      setImportStatus(`Lỗi: ${errText(e)}`);
    } finally {
      setImportLoading(false);
    }
  };

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
        <button className="secondary" onClick={() => setImporting(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> Nhập Excel/CSV
        </button>
        <button className="secondary" onClick={() => setAdding(!adding)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Thêm lead
        </button>
      </FilterBar>

      {!board && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px' }} aria-label="Chế độ xem đã lưu" role="group">
          {(views.data?.views ?? []).map((v) => (
            <span key={v.id} style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
              <button
                className={q === v.q && stage === v.stage ? 'primary' : 'secondary'}
                onClick={() => {
                  setQ(v.q);
                  setStage(v.stage);
                }}
              >
                {v.name}
              </button>
              <button
                className="secondary"
                aria-label={`Xóa chế độ xem ${v.name}`}
                onClick={async () => {
                  await call('/api/crm2/views', { action: 'delete', id: v.id });
                  views.reload();
                }}
              >
                ×
              </button>
            </span>
          ))}
          {saving ? (
            <form
              style={{ display: 'inline-flex', gap: 6 }}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await call('/api/crm2/views', { action: 'save', name: viewName, stage, q });
                  setViewName('');
                  setSaving(false);
                  views.reload();
                } catch (err) {
                  setError(errText(err));
                }
              }}
            >
              <input aria-label="Tên chế độ xem" placeholder="Tên chế độ xem" value={viewName} onChange={(e) => setViewName(e.target.value)} />
              <button type="submit">Lưu</button>
              <button type="button" className="secondary" onClick={() => setSaving(false)}>
                Hủy
              </button>
            </form>
          ) : (
            <button className="secondary" onClick={() => setSaving(true)}>
              Lưu bộ lọc hiện tại
            </button>
          )}
        </div>
      )}

      {importing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setImporting(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 24,
              width: '100%',
              maxWidth: 580,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 17 }}>
              Nhập danh sách Lead từ Excel / CSV
            </h3>
            <p style={{ margin: '0 0 14px 0', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
              Dán dữ liệu từ bảng tính (Excel/Google Sheets) hoặc tệp CSV. Dòng đầu có thể là tiêu đề cột (Họ tên, Số điện thoại, Email, Dịch vụ, Nguồn, Chiến dịch, Ghi chú) theo thứ tự bất kỳ; không có tiêu đề thì dùng thứ tự đó.
              <br />
              Bấm <strong>Xem trước</strong> để biết dòng nào mới, trùng, bị chặn hay sai số trước khi nhập.
            </p>

            <textarea
              rows={8}
              style={{ width: '100%', fontSize: 13, padding: 10, fontFamily: 'monospace', boxSizing: 'border-box' }}
              placeholder={`Nguyễn Văn A, 0901234567, a@gmail.com, Gói 18 hố, Facebook Ads, Muốn tập cuối tuần\nTrần Thị B, 0987654321, , GDR 30 giờ, Bạn giới thiệu, `}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportPreview(null);
              }}
            />

            {importStatus && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  marginTop: 12,
                  fontSize: 13,
                  background: importStatus.startsWith('Lỗi') ? '#fee2e2' : '#f0fdf4',
                  color: importStatus.startsWith('Lỗi') ? '#991b1b' : '#166534',
                }}
              >
                {importStatus}
              </div>
            )}

            {importPreview && (
              <div role="region" aria-label="Xem trước nhập" style={{ marginTop: 12, fontSize: 13 }}>
                <p style={{ margin: '0 0 6px' }}>
                  {(Object.keys(VERDICT_LABELS) as Verdict[])
                    .filter((v) => importPreview.counts[v] > 0)
                    .map((v) => `${VERDICT_LABELS[v]}: ${importPreview.counts[v]}`)
                    .join(' · ')}
                </p>
                <div style={{ maxHeight: 180, overflow: 'auto' }}>
                  <DataTable
                    label="Các dòng sẽ nhập"
                    rows={importPreview.rows}
                    rowKey={(r) => String(r.line)}
                    empty="Không có dòng nào"
                    columns={[
                      { key: 'l', header: 'Dòng', align: 'right', cell: (r) => r.line },
                      { key: 'n', header: 'Họ tên', cell: (r) => r.fullName },
                      { key: 'p', header: 'Số điện thoại', cell: (r) => r.phone || '—' },
                      { key: 'v', header: 'Kết quả', cell: (r) => VERDICT_LABELS[r.verdict] },
                    ]}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="secondary" onClick={() => setImporting(false)}>
                Đóng
              </button>
              {importBatch && s.manager && (
                <button type="button" className="secondary" disabled={importLoading} onClick={handleUndo}>
                  Hoàn tác lần nhập này
                </button>
              )}
              <button type="button" className="secondary" disabled={!importText.trim() || importLoading} onClick={handlePreview}>
                Xem trước
              </button>
              <button
                type="button"
                className="primary"
                disabled={!importPreview || importPreview.counts.new + importPreview.counts.existing === 0 || importLoading}
                onClick={handleDoImport}
              >
                {importLoading ? 'Đang xử lý…' : 'Bắt đầu nhập dữ liệu'}
              </button>
            </div>
          </div>
        </div>
      )}
      {adding && (
        <div style={{ background: '#f8faf8', border: '1px solid var(--kv-line, #dde5de)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--kv-text, #24332b)' }}>
            + Thêm khách hàng tiềm năng (Lead) mới:
          </div>
          <div className="crm-actions">
            <input
              aria-label="Tên khách"
              placeholder="Tên khách hàng"
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
              disabled={!f.fullName || !f.phone}
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
            <button className="secondary" onClick={() => setAdding(false)}>
              Hủy
            </button>
          </div>
        </div>
      )}
      {board ? (
        <div className="crm-board">
          {STAGES.map((st) => {
            const col = rows.filter((l) => l.stage === st);
            const borderTopColor =
              st === 'NEW'
                ? '#2563eb'
                : st === 'CONTACTED'
                  ? '#7c3aed'
                  : st === 'QUALIFIED'
                    ? '#d97706'
                    : st === 'VISIT_SCHEDULED'
                      ? '#0d9488'
                      : st === 'WON'
                        ? '#16a34a'
                        : '#64748b';
            return (
              <section key={st} className="crm-col" style={{ borderTopColor }} aria-label={STAGE_LABELS[st]}>
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


// ---------------------------------------------------------------- appointments

type Appt = {
  id: string;
  leadId: string;
  leadName: string;
  phoneNorm?: string;
  customerId?: string;
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
      <div style={{ background: '#fff', border: '1px solid var(--kv-line, #dde5de)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--kv-text, #24332b)' }}>📅 Lịch hẹn khách hàng</span>
          <p className="crm-meta" style={{ margin: 0, marginTop: 2 }}>Tỷ lệ khách đến hẹn: <strong>{data?.arrivalRate ?? 0}%</strong></p>
        </div>
        <span className="crm-chip" style={{ margin: 0 }}>
          {data?.appointments?.length ?? 0} lịch hẹn
        </span>
      </div>
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
                {r.status === 'ARRIVED' && s.onNavigate && (
                  <>
                    <button
                      className="primary"
                      onClick={() =>
                        s.onNavigate?.('rooms', {
                          customerId: r.customerId,
                          phone: r.phoneNorm,
                          name: r.leadName,
                        })
                      }
                    >
                      ⛳ Xếp line
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        s.onNavigate?.('members', {
                          customerId: r.customerId,
                          phone: r.phoneNorm,
                          name: r.leadName,
                        })
                      }
                    >
                      🎟️ Bán gói
                    </button>
                  </>
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


// ---------------------------------------------------------------- holds and orders


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
