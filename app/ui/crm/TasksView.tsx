'use client';
import { useCallback, useEffect, useState } from 'react';
import { CRM_RULES, type CrmTask } from '../../../lib/crm';
import { type Counts, call } from './shared';
import { TaskCard } from './TaskCard';

export function TasksView({
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
