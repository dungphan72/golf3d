'use client';
import { useCallback, useEffect, useState } from 'react';
import { Chips, FilterBar } from '../kit';
import { STAGES, STAGE_LABELS, workDue, NEEDS, NEED_LABELS, type Need } from '../../../lib/leads';
import { type Lead, call, stamp } from './shared';
import { LeadCard } from './LeadCard';

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
  const [view, setView] = useState<'list' | 'desk' | 'board'>('list');
  const [stageFilter, setStageFilter] = useState('all');
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
      <FilterBar>
        <Chips
          value={view}
          onChange={(k) => setView(k as typeof view)}
          options={[
            { key: 'list', label: 'Danh sách' },
            { key: 'desk', label: 'Bàn làm việc' },
            { key: 'board', label: 'Pipeline' },
          ]}
        />
        {view === 'list' && (
          <Chips
            value={stageFilter}
            onChange={setStageFilter}
            options={[
              { key: 'all', label: 'Mọi giai đoạn', count: open.length },
              ...STAGES.filter((st) => st !== 'won' && st !== 'lost').map((st) => ({
                key: st,
                label: STAGE_LABELS[st],
                count: open.filter((l) => l.stage === st).length,
              })),
            ]}
          />
        )}
      </FilterBar>
      {view === 'board' && (
        <div className="crm-board">
          {STAGES.map((st) => {
            const col = data.leads.filter((l) => l.stage === st);
            return (
              <section key={st} className="crm-col" aria-label={STAGE_LABELS[st]}>
                <h4>
                  {STAGE_LABELS[st]} <span>{col.length}</span>
                </h4>
                {col.map((l) => (
                  <div key={l.id} className="crm-mini">
                    <strong>{l.name || l.phone || 'Khách chưa có tên'}</strong>
                    <span>{NEED_LABELS[l.need as Need] ?? 'Nhu cầu chưa rõ'}</span>
                    {l.next_at != null && st !== 'won' && st !== 'lost' && (
                      <span className={l.next_at < now ? 'late' : ''}>
                        {l.next_note || 'Kế tiếp'}: {stamp(l.next_at)}
                      </span>
                    )}
                    <span>{l.assignee_name ?? 'Chưa có người phụ trách'}</span>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
      {view === 'desk' &&
        (() => {
          const mineOrAll = open
            .filter((l) => l.status !== 'queued' && (manager || l.assignee === data.mine))
            .sort((a, b) => workDue(a) - workDue(b));
          return mineOrAll.length ? (
            mineOrAll.map((l) => (
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
              <h3>Không còn việc đến hạn</h3>
              <p>Khách cần gọi hoặc gặp sẽ hiện ở đây, việc gấp nhất lên đầu.</p>
            </div>
          );
        })()}
      {view === 'list' &&
        (open.filter((l) => stageFilter === 'all' || l.stage === stageFilter).length ? (
          open
            .filter((l) => stageFilter === 'all' || l.stage === stageFilter)
            .map((l) => (
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
        ))}
      {view === 'list' && closed.length > 0 && (
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
