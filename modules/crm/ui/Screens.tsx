'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Phone,
  MessageCircle,
  Calendar,
  FileText,
  Check,
  AlertCircle,
  Clock,
  Upload,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
        <div className="crm-section-card">
          <header>
            <h3 role="heading" aria-level={2}>
              Phễu 30 ngày
            </h3>
            <small className="muted">Tỷ lệ chuyển đổi qua các giai đoạn</small>
          </header>
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
        </div>

        <div className="crm-section-card">
          <header>
            <h3>Nguồn khách</h3>
            <small className="muted">Hiệu quả các kênh tiếp cận 30 ngày</small>
          </header>
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
        </div>
      </div>

      {cron && (
        <div style={{ background: '#f8faf8', border: '1px solid var(--kv-line, #dde5de)', borderRadius: 6, padding: '10px 14px' }}>
          <p className="crm-meta" style={{ margin: 0, fontSize: 12.5 }}>
            🕒 Lần chạy nền gần nhất: <strong>{stamp(cron.updated)}</strong> — hết hạn giữ chỗ{' '}
            <span className="crm-chip">{String(cron.value.holdsExpired ?? 0)}</span>, cảnh báo quá hạn{' '}
            <span className="crm-chip">{String(cron.value.slaAlerts ?? 0)}</span>
          </p>
        </div>
      )}
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

export function WorkScreen({ s }: { s: Shared }) {
  const { data, error, reload } = useLoad<WorkDeskData>('/api/crm2/leads?view=work', 15_000);
  const [subTab, setSubTab] = useState<'new' | 'overdue' | 'today' | 'appointments' | 'care'>('new');
  
  // Call result modal state
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);
  const [callResult, setCallResult] = useState<CallResult>('INTERESTED');
  const [callNote, setCallNote] = useState('');
  const [callWhen, setCallWhen] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [modalErr, setModalErr] = useState('');

  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;

  const leads = data.leads ?? [];
  const appointments = data.appointments ?? [];
  const careTasks = data.careTasks ?? [];
  const dayEnd = data.dayEnd ?? (s.now + 86_400_000);

  // Partition leads
  const newNeeded = leads.filter(
    (l) => l.stage === 'NEW' || l.callAttempts === 0 || l.nextAction === 'NEW',
  );
  const overdue = leads.filter(
    (l) => l.nextDue != null && l.nextDue < s.now,
  );
  const today = leads.filter(
    (l) => l.nextDue != null && l.nextDue >= s.now && l.nextDue <= dayEnd,
  );

  const unassignedCount = leads.filter((l) => !l.owner).length;

  const handleSaveResult = async () => {
    if (!callModalLead) return;
    setSavingResult(true);
    setModalErr('');
    try {
      await call('/api/crm2/leads', {
        action: 'result',
        id: callModalLead.id,
        result: callResult,
        note: callNote,
        ...(callWhen ? { when: toMs(callWhen) } : {}),
      });
      setCallModalLead(null);
      setCallNote('');
      setCallWhen('');
      await reload();
    } catch (e) {
      setModalErr(errText(e));
    } finally {
      setSavingResult(false);
    }
  };

  const handleFinishCare = async (id: string) => {
    try {
      await call('/api/crm2/tasks', {
        action: 'care-done',
        id,
        channel: 'call',
        note: 'Đã liên hệ chăm sóc khách hàng',
      });
      await reload();
    } catch (e) {
      alert(errText(e));
    }
  };

  const renderLeadActions = (r: Lead) => {
    const cleanPhone = r.phone.replace(/[^0-9]/g, '');
    return (
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <a
          href={`tel:${r.phone}`}
          className="crm-action-btn"
          title="Gọi điện trực tiếp (không tự động hoàn tất)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            background: '#e0f2fe',
            color: '#0369a1',
            textDecoration: 'none',
          }}
        >
          <Phone size={15} />
        </a>
        {cleanPhone && (
          <a
            href={`https://zalo.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-action-btn"
            title="Mở nhắn tin Zalo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              background: '#e0e7ff',
              color: '#3730a3',
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={15} />
          </a>
        )}
        <button
          type="button"
          className="secondary"
          title="Ghi kết quả cuộc gọi"
          onClick={() => {
            setCallModalLead(r);
            setCallResult('INTERESTED');
            setCallNote('');
            setCallWhen('');
            setModalErr('');
          }}
          style={{ height: 32, padding: '0 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <FileText size={14} /> Ghi KQ
        </button>
        <button
          type="button"
          className="primary"
          title="Đặt lịch phòng tập cho khách"
          onClick={() => s.onNavigate?.('rooms', { name: r.fullName, phone: r.phone })}
          style={{ height: 32, padding: '0 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <Calendar size={14} /> Đặt lịch
        </button>
      </div>
    );
  };

  const leadColumns = [
    {
      key: 'n',
      header: 'Khách hàng',
      cell: (r: Lead) => (
        <div>
          <strong style={{ fontSize: 14 }}>{r.fullName}</strong>
          <div style={{ color: '#64748b', fontSize: 13 }}>{r.phone}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {!r.owner && (
              <span className="crm-chip" style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, margin: 0 }}>
                ⚠️ Chưa phân công
              </span>
            )}
            {(!r.nextAction || !r.nextDue) && (
              <span className="crm-chip" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11, margin: 0 }}>
                ⚠️ Thiếu việc kế tiếp
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Nhu cầu & Nguồn',
      cell: (r: Lead) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.targetService || 'Chưa rõ nhu cầu'}</div>
          <small className="muted">{r.source || 'Trực tiếp'}</small>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Phụ trách',
      cell: (r: Lead) =>
        r.owner ? (s.staff.find((m) => m.id === r.owner)?.name ?? r.owner) : (
          <span style={{ color: '#d97706', fontWeight: 600 }}>Hàng chờ (Kho số)</span>
        ),
    },
    {
      key: 'next',
      header: 'Việc kế tiếp & Hạn',
      cell: (r: Lead) => {
        const c = countdown(r.nextDue, s.now);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{NEXT_ACTION_LABELS[r.nextAction as NextAction] || 'Gọi tư vấn'}</div>
            <span className={c.late ? 'late' : ''} style={{ fontSize: 12 }}>
              {r.nextDue ? `${stamp(r.nextDue)} · ${c.text}` : '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác nhanh',
      cell: (r: Lead) => renderLeadActions(r),
    },
  ];

  return (
    <>
      <Err text={error} />
      
      {unassignedCount > 0 && s.manager && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontSize: 13, fontWeight: 500 }}>
            <AlertTriangle size={16} />
            <span>
              Có <strong>{unassignedCount}</strong> lead mới trong hàng chờ chưa phân công. Quản lý vui lòng phân công để đảm bảo SLA gọi trong 5 phút!
            </span>
          </div>
        </div>
      )}

      {/* 5 View Subtabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { key: 'new', label: 'Lead mới cần gọi', count: newNeeded.length, isWarning: newNeeded.some((l) => l.nextDue && l.nextDue < s.now) },
          { key: 'overdue', label: 'Việc quá hạn', count: overdue.length, isDanger: overdue.length > 0 },
          { key: 'today', label: 'Việc hôm nay', count: today.length },
          { key: 'appointments', label: 'Lịch khách sắp đến', count: appointments.length },
          { key: 'care', label: 'Chăm sóc sau chơi', count: careTasks.length },
        ].map((tab) => {
          const active = subTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key as typeof subTab)}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 8,
                border: active ? '1px solid var(--kv-blue, #1f7a4d)' : '1px solid #e2e8f0',
                background: active ? '#f0fdf4' : '#ffffff',
                color: active ? '#15803d' : '#334155',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background: tab.isDanger ? '#fee2e2' : tab.isWarning ? '#fef3c7' : active ? '#dcfce7' : '#f1f5f9',
                  color: tab.isDanger ? '#dc2626' : tab.isWarning ? '#b45309' : active ? '#166534' : '#64748b',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* View 1: Lead mới cần gọi */}
      {subTab === 'new' && (
        <DataTable
          rows={newNeeded}
          rowKey={(r) => r.id}
          empty="Không có lead mới cần gọi"
          emptyText="Khách mới tiếp nhận sẽ hiển thị ở đây với hạn gọi 5 phút đầu tiên."
          onRowClick={(r) => s.open(r.id)}
          columns={leadColumns}
        />
      )}

      {/* View 2: Việc quá hạn */}
      {subTab === 'overdue' && (
        <DataTable
          rows={overdue}
          rowKey={(r) => r.id}
          empty="Không có việc quá hạn"
          emptyText="Tuyệt vời! Tất cả các tác vụ và cuộc gọi hẹn trước đều đúng hạn."
          onRowClick={(r) => s.open(r.id)}
          columns={leadColumns}
        />
      )}

      {/* View 3: Việc hôm nay */}
      {subTab === 'today' && (
        <DataTable
          rows={today}
          rowKey={(r) => r.id}
          empty="Không có việc đến hạn hôm nay"
          emptyText="Các lịch hẹn gọi lại trong ngày sẽ xuất hiện ở đây."
          onRowClick={(r) => s.open(r.id)}
          columns={leadColumns}
        />
      )}

      {/* View 4: Lịch khách sắp đến */}
      {subTab === 'appointments' && (
        <DataTable
          rows={appointments}
          rowKey={(r) => r.id}
          empty="Chưa có lịch hẹn sắp đến"
          emptyText="Lịch hẹn trải nghiệm hoặc đặt lịch của golfer trong 48h tới sẽ hiện ở đây."
          columns={[
            {
              key: 'cust',
              header: 'Khách hàng',
              cell: (r) => (
                <div>
                  <strong style={{ fontSize: 14 }}>{r.fullName}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{r.phone}</div>
                </div>
              ),
            },
            {
              key: 'sv',
              header: 'Dịch vụ / Gói hẹn',
              cell: (r) => <strong>{r.service}</strong>,
            },
            {
              key: 'time',
              header: 'Thời gian hẹn',
              cell: (r) => (
                <div>
                  <strong style={{ color: '#0369a1' }}>{stamp(r.at)}</strong>
                  {r.note && <div style={{ fontSize: 12, color: '#64748b' }}>{r.note}</div>}
                </div>
              ),
            },
            {
              key: 'st',
              header: 'Trạng thái',
              cell: (r) => (
                <StatusBadge
                  tone={
                    r.status === 'ARRIVED' ? 'ok' : r.status === 'CONFIRMED' ? 'info' : r.status === 'CANCELLED' || r.status === 'NO_SHOW' ? 'warn' : 'muted'
                  }
                >
                  {r.status === 'PENDING' ? 'Chờ duyệt' : r.status === 'CONFIRMED' ? 'Đã xác nhận' : r.status === 'ARRIVED' ? 'Đã đến' : r.status === 'NO_SHOW' ? 'Vắng mặt' : r.status}
                </StatusBadge>
              ),
            },
            {
              key: 'staff',
              header: 'Phụ trách',
              cell: (r) => (r.owner ? (s.staff.find((m) => m.id === r.owner)?.name ?? r.owner) : '—'),
            },
            {
              key: 'act',
              header: 'Thao tác',
              cell: (r) => {
                const cleanPhone = r.phone.replace(/[^0-9]/g, '');
                return (
                  <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <a
                      href={`tel:${r.phone}`}
                      className="crm-action-btn"
                      title="Gọi điện"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      <Phone size={15} />
                    </a>
                    {cleanPhone && (
                      <a
                        href={`https://zalo.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crm-action-btn"
                        title="Zalo"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="primary"
                      onClick={() => s.onNavigate?.('rooms', { name: r.fullName, phone: r.phone })}
                      style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                    >
                      Mở đặt phòng
                    </button>
                    {r.leadId && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => s.open(r.leadId!)}
                        style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                      >
                        Xem Lead
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      )}

      {/* View 5: Chăm sóc sau chơi */}
      {subTab === 'care' && (
        <DataTable
          rows={careTasks}
          rowKey={(r) => r.id}
          empty="Không có lịch chăm sóc sau chơi"
          emptyText="Các tác vụ cảm ơn sau chơi, hỏi thăm trải nghiệm và mời quay lại sẽ hiện ở đây."
          columns={[
            {
              key: 'cust',
              header: 'Khách hàng',
              cell: (r) => (
                <div>
                  <strong style={{ fontSize: 14 }}>{r.customerName}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{r.phone}</div>
                </div>
              ),
            },
            {
              key: 'title',
              header: 'Nội dung chăm sóc',
              cell: (r) => (
                <div>
                  <strong>{r.title}</strong>
                  {r.targetService && <small className="muted" style={{ display: 'block' }}>Quan tâm: {r.targetService}</small>}
                </div>
              ),
            },
            {
              key: 'due',
              header: 'Hạn xử lý',
              cell: (r) => (r.dueAt ? stamp(r.dueAt) : '—'),
            },
            {
              key: 'staff',
              header: 'Phụ trách',
              cell: (r) => (r.assignee ? (s.staff.find((m) => m.id === r.assignee)?.name ?? r.assignee) : 'Chưa gán'),
            },
            {
              key: 'act',
              header: 'Thao tác',
              cell: (r) => {
                const cleanPhone = r.phone.replace(/[^0-9]/g, '');
                return (
                  <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <a
                      href={`tel:${r.phone}`}
                      className="crm-action-btn"
                      title="Gọi điện"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      <Phone size={15} />
                    </a>
                    {cleanPhone && (
                      <a
                        href={`https://zalo.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crm-action-btn"
                        title="Zalo"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="primary"
                      onClick={() => handleFinishCare(r.id)}
                      style={{ height: 32, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Check size={14} /> Hoàn tất
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      )}

      {/* Modal: Ghi kết quả cuộc gọi */}
      {callModalLead && (
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
          onClick={() => setCallModalLead(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 17 }}>
              Ghi kết quả cuộc gọi
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 13 }}>
              Khách: <strong>{callModalLead.fullName}</strong> ({callModalLead.phone})
            </p>

            {modalErr && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                {modalErr}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                Kết quả liên hệ:
              </label>
              <select
                style={{ width: '100%', height: 38, fontSize: 13 }}
                value={callResult}
                onChange={(e) => setCallResult(e.target.value as CallResult)}
              >
                {CALL_RESULTS.map((cr) => (
                  <option key={cr} value={cr}>
                    {CALL_RESULT_LABELS[cr]}
                  </option>
                ))}
              </select>
            </div>

            {(callResult === 'INTERESTED' || callResult === 'THINKING' || callResult === 'APPOINTMENT') && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  Hẹn liên hệ lại / Thời gian đến:
                </label>
                <input
                  type="datetime-local"
                  style={{ width: '100%', height: 38, fontSize: 13 }}
                  value={callWhen}
                  onChange={(e) => setCallWhen(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                Ghi chú chi tiết trao đổi:
              </label>
              <textarea
                rows={3}
                style={{ width: '100%', fontSize: 13, padding: 8, boxSizing: 'border-box' }}
                placeholder="Nhu cầu golfer, tình trạng swing, gói quan tâm, lịch rảnh..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" onClick={() => setCallModalLead(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="primary"
                disabled={savingResult}
                onClick={handleSaveResult}
              >
                {savingResult ? 'Đang lưu…' : 'Lưu kết quả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
      <div style={{ background: '#fff', border: '1px solid var(--kv-line, #dde5de)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <p className="crm-meta" style={{ margin: 0, fontWeight: 500 }}>
          {s.manager
            ? 'Chọn lead để giao cho nhân viên.'
            : `Hạn mức nhận số hôm nay: còn ${Math.max(data.quota - data.claimedToday, 0)}/${data.quota}`}
        </p>
        <span className="crm-chip" style={{ margin: 0 }}>
          Tổng số: <strong>{data.leads.length}</strong> lead trong kho
        </span>
      </div>
      {s.manager && picked.length > 0 && (
        <div className="crm-actions" style={{ background: '#f0f7f3', border: '1px solid #b5dec6', borderRadius: 8, padding: '10px 14px' }}>
          <select style={{ height: 36, fontSize: 13 }} aria-label="Giao cho" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Giao {picked.length} lead cho…</option>
            {s.staff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            className="primary"
            style={{ height: 36, padding: '0 16px', fontSize: 13 }}
            disabled={!to}
            onClick={() => act({ action: 'assign', ids: picked, userId: to })}
          >
            Giao ngay
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
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [f, setF] = useState({ fullName: '', phone: '', targetService: '', notes: '' });
  const url = `/api/crm2/leads?limit=200&q=${encodeURIComponent(q)}${stage ? '&stage=' + stage : ''}`;
  const { data, error, reload, setError } = useLoad<{ leads: Lead[]; total: number }>(url);
  if (error && !data) return <Err text={error} />;
  if (!data) return <Loading />;
  const rows = data.leads ?? [];

  const handleDoImport = async () => {
    setImportLoading(true);
    setImportStatus('');
    try {
      const lines = importText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const parsedLeads: Array<{
        fullName: string;
        phone: string;
        email?: string;
        targetService?: string;
        source?: string;
        notes?: string;
      }> = [];

      for (const line of lines) {
        if (line.toLowerCase().includes('họ tên') || line.toLowerCase().includes('fullname')) continue;
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const fullName = parts[0]?.trim();
        const phone = parts[1]?.trim() || '';
        const email = parts[2]?.trim() || '';
        const targetService = parts[3]?.trim() || '';
        const source = parts[4]?.trim() || 'Excel/CSV';
        const notes = parts.slice(5).join(', ').trim() || '';

        if (fullName) {
          parsedLeads.push({ fullName, phone, email, targetService, source, notes });
        }
      }

      if (parsedLeads.length === 0) {
        setImportStatus('Lỗi: Không tìm thấy dữ liệu hợp lệ để nhập.');
        setImportLoading(false);
        return;
      }

      const res = await call<{
        ok: boolean;
        total: number;
        created: number;
        absorbed: number;
        errors?: string[];
      }>('/api/crm2/leads', {
        action: 'import',
        leads: parsedLeads,
      });

      setImportStatus(
        `Thành công: Đã tạo mới ${res.created} lead, gộp ${res.absorbed} lead trùng lặp. ${res.errors?.length ? `Có ${res.errors.length} cảnh báo.` : ''}`,
      );
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
              Dán dữ liệu từ bảng tính (Excel/Google Sheets) hoặc tệp CSV. Mỗi dòng một khách hàng theo định dạng:
              <br />
              <code>Họ tên, Số điện thoại, Email, Dịch vụ quan tâm, Nguồn, Ghi chú</code>
            </p>

            <textarea
              rows={8}
              style={{ width: '100%', fontSize: 13, padding: 10, fontFamily: 'monospace', boxSizing: 'border-box' }}
              placeholder={`Nguyễn Văn A, 0901234567, a@gmail.com, Gói 18 hố, Facebook Ads, Muốn tập cuối tuần\nTrần Thị B, 0987654321, , GDR 30 giờ, Bạn giới thiệu, `}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
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

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="secondary" onClick={() => setImporting(false)}>
                Đóng
              </button>
              <button
                type="button"
                className="primary"
                disabled={!importText.trim() || importLoading}
                onClick={handleDoImport}
              >
                {importLoading ? 'Đang nhập…' : 'Bắt đầu nhập dữ liệu'}
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
