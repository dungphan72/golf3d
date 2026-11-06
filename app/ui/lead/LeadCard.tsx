'use client';
import { useState } from 'react';
import { Phone, MessageCircle, Clock } from 'lucide-react';
import {
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TAGS,
  LOST_REASONS,
  STAGES,
  STAGE_LABELS,
  stageLabel,
  NEED_LABELS,
  SOURCE_LABELS,
  type CallResult,
  type Need,
} from '../../../lib/leads';
import { type Lead, tagsOf, call, stamp, mmss, toMs } from './shared';
import { Consult } from './Consult';

export function LeadCard({
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
  const [mode, setMode] = useState<'' | 'call' | 'consult' | 'stage' | 'profile'>('');
  const [at, setAt] = useState('');
  const [stageTo, setStageTo] = useState('qualified');
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  const [dealValue, setDealValue] = useState('');
  const [prof, setProf] = useState({
    interest: lead.interest,
    budget: lead.budget ? String(lead.budget) : '',
    tags: tagsOf(lead),
    note: lead.note,
  });
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
        <span className={'crm-chip lead-' + lead.status}>
          {lead.status === 'queued' || lead.status === 'assigned' || lead.stage === 'new'
            ? LEAD_STATUS_LABELS[lead.status]
            : stageLabel(lead.stage)}
        </span>
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
      {(lead.interest || tagsOf(lead).length > 0 || lead.budget > 0) && (
        <p className="crm-meta">
          {lead.interest && <span>Quan tâm: {lead.interest}</span>}
          {lead.budget > 0 && <span>· ngân sách {lead.budget.toLocaleString('vi-VN')}đ</span>}
          {tagsOf(lead).map((t) => (
            <span key={t} className="crm-chip">
              {t}
            </span>
          ))}
        </p>
      )}
      {lead.note && <p className="crm-quote">Ghi chú: {lead.note}</p>}
      {lead.message && <p className="crm-quote">{lead.message}</p>}
      {open && lead.next_at != null && (
        <p className={lead.next_at < now ? 'crm-sla late' : 'crm-sla'}>
          <Clock size={14} /> {lead.next_note || 'Việc kế tiếp'}: {stamp(lead.next_at)}
          {lead.next_at < now ? ' (đã quá hạn)' : ''}
          {lead.missed > 0 && ` · đã gọi hụt ${lead.missed} lần`}
        </p>
      )}
      {!open && lead.stage === 'won' && lead.deal_value > 0 && (
        <p className="crm-meta">Giá trị đã chốt: {lead.deal_value.toLocaleString('vi-VN')}đ</p>
      )}
      {!open && lead.stage === 'lost' && lead.lost_reason && (
        <p className="crm-meta">Lý do không thành: {lead.lost_reason}</p>
      )}
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
            <button className="secondary" onClick={() => setMode(mode === 'stage' ? '' : 'stage')}>
              Chuyển giai đoạn
            </button>
          )}
          {canAct && (
            <button
              className="secondary"
              onClick={() => setMode(mode === 'profile' ? '' : 'profile')}
            >
              Nhu cầu, nhãn
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
          {!noPhone && ['trial', 'trial_moved', 'callback'].includes(result) && (
            <input
              aria-label={result === 'callback' ? 'Giờ gọi lại' : 'Giờ trải nghiệm'}
              type="datetime-local"
              step={900}
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
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
                  : { action: 'call', id: lead.id, result, note, ...(at ? { at: toMs(at) } : {}) },
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
      {mode === 'stage' && canAct && (
        <div className="crm-actions">
          <select
            aria-label="Giai đoạn mới"
            value={stageTo}
            onChange={(e) => setStageTo(e.target.value)}
          >
            {STAGES.filter((st) => st !== lead.stage).map((st) => (
              <option key={st} value={st}>
                {STAGE_LABELS[st]}
              </option>
            ))}
          </select>
          {stageTo === 'trial' && (
            <input
              aria-label="Giờ trải nghiệm"
              type="datetime-local"
              step={900}
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          )}
          {stageTo === 'won' && (
            <input
              aria-label="Giá trị dịch vụ đã chốt (đồng)"
              inputMode="numeric"
              placeholder="Giá trị đã chốt (đồng)"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value.replace(/\D/g, ''))}
            />
          )}
          {stageTo === 'lost' && (
            <select
              aria-label="Lý do không thành"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {LOST_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          )}
          <button
            className="primary"
            onClick={() =>
              act({
                action: 'stage',
                id: lead.id,
                stage: stageTo,
                ...(stageTo === 'lost' ? { reason } : {}),
                ...(stageTo === 'won' ? { dealValue: Number(dealValue) || 0 } : {}),
                ...(stageTo === 'trial' && at ? { at: toMs(at) } : {}),
              })
            }
          >
            Chuyển
          </button>
          <button className="secondary" onClick={() => setMode('')}>
            Hủy
          </button>
        </div>
      )}
      {mode === 'profile' && canAct && (
        <div className="crm-actions">
          <input
            aria-label="Dịch vụ quan tâm"
            placeholder="Dịch vụ quan tâm"
            value={prof.interest}
            maxLength={200}
            onChange={(e) => setProf({ ...prof, interest: e.target.value })}
          />
          <input
            aria-label="Ngân sách (đồng)"
            inputMode="numeric"
            placeholder="Ngân sách (đồng)"
            value={prof.budget}
            onChange={(e) => setProf({ ...prof, budget: e.target.value.replace(/\D/g, '') })}
          />
          <div className="crm-meta">
            {LEAD_TAGS.map((t) => (
              <label key={t} className="check">
                <input
                  type="checkbox"
                  checked={prof.tags.includes(t)}
                  onChange={(e) =>
                    setProf({
                      ...prof,
                      tags: e.target.checked ? [...prof.tags, t] : prof.tags.filter((x) => x !== t),
                    })
                  }
                />{' '}
                {t}
              </label>
            ))}
          </div>
          <input
            aria-label="Ghi chú về khách"
            placeholder="Ghi chú về khách"
            value={prof.note}
            maxLength={1000}
            onChange={(e) => setProf({ ...prof, note: e.target.value })}
          />
          <button
            className="primary"
            onClick={() =>
              act({
                action: 'profile',
                id: lead.id,
                interest: prof.interest,
                budget: Number(prof.budget) || 0,
                tags: prof.tags,
                note: prof.note,
              })
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
