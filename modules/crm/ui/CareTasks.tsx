'use client';
import { useState } from 'react';
import { Check, Copy, MessageCircle, Phone } from 'lucide-react';
import { Chips, FilterBar, askText } from '../../../app/ui/kit';
import { CARE_CHANNELS, CARE_CHANNEL_LABELS, careRuleName, type CareChannel } from '../core/care';
import { call, countdown, errText, stamp } from './api';
import { useLoad, type Shared } from './Screens';

export type CareTask = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  consent: number;
  rule: string;
  title: string;
  dueAt: number | null;
  doneAt: number | null;
  assignee: string | null;
  assigneeName: string | null;
  channel: string;
  note: string;
  outcome: string;
  message: string;
  marketing: boolean;
};

const DAY = 86_400_000;

function CareCard({
  task,
  now,
  onChanged,
  onOpenCustomer,
  onNavigate,
}: {
  task: CareTask;
  now: number;
  onChanged: () => void;
  onOpenCustomer: (id: string) => void;
  onNavigate?: Shared['onNavigate'];
}) {
  const [closing, setClosing] = useState(false);
  const [channel, setChannel] = useState<CareChannel>('call');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const open = !task.doneAt;
  const late = open && task.dueAt != null && task.dueAt < now - DAY;
  async function act(body: Record<string, unknown>) {
    setError('');
    try {
      await call('/api/crm2/tasks', { id: task.id, ...body });
      setClosing(false);
      onChanged();
    } catch (e) {
      setError(errText(e));
    }
  }
  const due = countdown(task.dueAt, now);
  return (
    <article className={'crm-task' + (open ? '' : ' closed')}>
      <header>
        <span className="crm-chip">{careRuleName(task.rule)}</span>
        <strong>{task.title}</strong>
        <small className={late ? 'late' : ''}>
          {open
            ? due.text
            : task.outcome === 'skipped'
              ? `đã bỏ qua ${stamp(task.doneAt)}`
              : `đã liên hệ ${stamp(task.doneAt)}`}
        </small>
      </header>
      <p>
        <button className="crm-link" onClick={() => onOpenCustomer(task.customerId)}>
          {task.name}
        </button>{' '}
        ·{' '}
        <a href={`tel:${task.phone}`}>
          <Phone size={13} /> {task.phone}
        </a>{' '}
        ·{' '}
        <a href={`https://zalo.me/${task.phone}`} target="_blank" rel="noreferrer">
          <MessageCircle size={13} /> Zalo
        </a>
        {task.assigneeName && <> · phụ trách: {task.assigneeName}</>}
        {task.marketing && !task.consent && open && (
          <> · chưa đồng ý nhận tin khuyến mãi: chỉ gọi hỏi thăm, đừng gửi quảng cáo</>
        )}
      </p>
      {open && (
        <div className="crm-message">
          <span>{task.message}</span>
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard?.writeText(task.message).catch(() => undefined);
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
      {open && !closing && (
        <div className="crm-actions">
          <button className="primary" onClick={() => setClosing(true)}>
            Đã liên hệ
          </button>
          {!task.assignee && (
            <button className="secondary" onClick={() => act({ action: 'care-claim' })}>
              Nhận việc
            </button>
          )}
          {onNavigate && (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onNavigate('rooms', {
                    customerId: task.customerId,
                    phone: task.phone,
                    name: task.name,
                  })
                }
              >
                ⛳ Xếp line
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onNavigate('members', {
                    customerId: task.customerId,
                    phone: task.phone,
                    name: task.name,
                  })
                }
              >
                🎟️ Bán gói
              </button>
            </>
          )}
          <select
            aria-label="Hẹn lại"
            value=""
            onChange={(e) =>
              e.target.value && act({ action: 'care-snooze', days: Number(e.target.value) })
            }
          >
            <option value="">Hẹn lại…</option>
            <option value="1">Sau 1 ngày</option>
            <option value="3">Sau 3 ngày</option>
            <option value="7">Sau 7 ngày</option>
          </select>
          <button
            className="secondary"
            onClick={async () => {
              const reason = await askText({
                title: 'Bỏ qua việc này',
                label: 'Lý do bỏ qua',
                min: 2,
              });
              if (reason) act({ action: 'care-skip', reason });
            }}
          >
            Bỏ qua
          </button>
        </div>
      )}
      {open && closing && (
        <div className="crm-actions">
          <select
            aria-label="Kênh liên hệ"
            value={channel}
            onChange={(e) => setChannel(e.target.value as CareChannel)}
          >
            {CARE_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CARE_CHANNEL_LABELS[c]}
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
          <button className="primary" onClick={() => act({ action: 'care-done', channel, note })}>
            Lưu kết quả
          </button>
          <button className="secondary" onClick={() => setClosing(false)}>
            Hủy
          </button>
        </div>
      )}
    </article>
  );
}

/** Tasks the system creates for existing customers: welcome, thanks, comeback, packages, birthday, points. */
export function CareTasksView({
  s,
  onOpenCustomer,
}: {
  s: Shared;
  onOpenCustomer: (id: string) => void;
}) {
  const [scope, setScope] = useState('mine');
  const [filter, setFilter] = useState('open');
  const { data, error, reload } = useLoad<{ tasks: CareTask[]; now: number }>(
    `/api/crm2/tasks?kind=care&scope=${scope}&done=1`,
    30_000,
  );
  const tasks = data?.tasks ?? [];
  const open = tasks.filter((t) => !t.doneAt);
  const shown = filter === 'open' ? open : tasks.filter((t) => t.doneAt);
  return (
    <>
      <FilterBar>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'open', label: 'Cần làm', count: open.length },
            { key: 'done', label: 'Đã xử lý (3 ngày)', count: tasks.length - open.length },
          ]}
        />
        {s.manager && (
          <Chips
            value={scope}
            onChange={setScope}
            options={[
              { key: 'mine', label: 'Của tôi và chưa ai nhận' },
              { key: 'all', label: 'Cả đội' },
            ]}
          />
        )}
      </FilterBar>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="crm-tasks">
        {shown.map((t) => (
          <CareCard
            key={t.id}
            task={t}
            now={data?.now ?? s.now}
            onChanged={reload}
            onOpenCustomer={onOpenCustomer}
            onNavigate={s.onNavigate}
          />
        ))}
        {data && !shown.length && (
          <p className="muted">
            {filter === 'open'
              ? 'Chưa có khách nào cần chăm sóc. Việc mới tự xuất hiện khi có khách mới, sau buổi chơi, gói sắp hết hạn…'
              : 'Chưa xử lý việc nào trong 3 ngày qua.'}
          </p>
        )}
      </div>
    </>
  );
}
