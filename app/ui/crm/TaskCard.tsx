'use client';
import { useState } from 'react';
import { askText } from '../kit';
import { Phone, MessageCircle, Copy, Check } from 'lucide-react';
import { CHANNELS, CHANNEL_LABELS, ruleName, type Channel, type CrmTask } from '../../../lib/crm';
import { DAY, stamp, call, zaloLink, dueText } from './shared';

export function TaskCard({
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
            onClick={async () => {
              const reason = await askText({
                title: 'Bỏ qua việc này',
                label: 'Lý do bỏ qua',
                min: 2,
              });
              if (reason) act({ action: 'task-skip', id: task.id, reason });
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
