'use client';
import { useCallback, useEffect, useState } from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { money } from '../../../lib/club';
import {
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  NEXT_ACTION_LABELS,
  type NextAction,
} from '../core/calls';
import { STAGES, STAGE_LABELS, LOST_REASONS, type Stage } from '../core/stages';
import { call, countdown, errText, stamp, toMs, type Lead, type Staff } from './api';

type Detail = {
  lead: Lead;
  ownerName: string | null;
  activities: { id: string; type: string; content: string; actor: string; created: number }[];
  tasks: { id: string; title: string; dueAt: number | null; doneAt: number | null }[];
  appointments: { id: string; service: string; at: number; status: string }[];
  holds: {
    id: string;
    productName: string;
    kind: string;
    amount: number;
    status: string;
    expiresAt: number | null;
  }[];
  orders: { id: string; code: string; productName: string; price: number; status: string }[];
};
type Product = { code: string; name: string; listPrice: number; active: number };

const ACT_LABEL: Record<string, string> = {
  NOTE: 'Ghi chú',
  CALL: 'Cuộc gọi',
  ZALO: 'Zalo',
  EMAIL: 'Email',
  VISIT: 'Trải nghiệm',
  STAGE: 'Giai đoạn',
  ASSIGN: 'Phân công',
  INQUIRY: 'Khách gửi lại',
  SYSTEM: 'Hệ thống',
  CHAT: 'Chat',
  HOLD: 'Giữ chỗ',
};

export function LeadDetail({
  id,
  now,
  me,
  manager,
  staff,
  onClose,
  onChanged,
}: {
  id: string;
  now: number;
  me: string;
  manager: boolean;
  staff: Staff[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string>('INTERESTED');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<string>('QUALIFIED');
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  const [dealValue, setDealValue] = useState('');
  const [apptAt, setApptAt] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [holdCode, setHoldCode] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const load = useCallback(async () => {
    try {
      setD(await call<Detail>('/api/crm2/leads?id=' + id));
      setError('');
    } catch (e) {
      setError(errText(e));
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on open
    load();
    call<{ products: Product[] }>('/api/crm2/sales?view=products')
      .then((v) => setProducts(v.products.filter((p) => p.active)))
      .catch(() => undefined);
  }, [load]);

  async function act(url: string, body: Record<string, unknown>, after?: () => void) {
    setError('');
    try {
      await call(url, body);
      after?.();
      await load();
      onChanged();
    } catch (e) {
      setError(errText(e));
    }
  }

  if (!d)
    return (
      <>
        <button className="secondary" onClick={onClose}>
          ← Quay lại
        </button>
        {error ? (
          <div className="error-box" role="alert">
            {error}
          </div>
        ) : (
          <p>Đang tải…</p>
        )}
      </>
    );
  const l = d.lead;
  const open = l.stage !== 'WON' && l.stage !== 'LOST';
  const canEdit = manager || l.owner === me;
  const cd = countdown(l.nextDue, now);
  const needsDate = result === 'APPOINTMENT' || result === 'NOT_MET';
  return (
    <div className="crm-lead">
      <p>
        <button className="secondary" onClick={onClose}>
          ← Quay lại
        </button>
      </p>
      <header>
        <div>
          <strong>{l.fullName}</strong> ·{' '}
          <a href={`tel:${l.phone}`}>
            <Phone size={13} /> {l.phone}
          </a>
          {!l.masked && l.phoneNorm && (
            <>
              {' · '}
              <a href={`https://zalo.me/${l.phoneNorm}`} target="_blank" rel="noreferrer">
                <MessageCircle size={13} /> Zalo
              </a>
            </>
          )}
        </div>
        <span className="crm-chip">{STAGE_LABELS[l.stage as Stage] ?? l.stage}</span>
      </header>
      <p className="crm-meta">
        <span className="crm-chip">{l.source || 'Không rõ nguồn'}</span>
        <span>Quan tâm: {l.targetService || 'chưa rõ'}</span>
        <span>· phụ trách: {d.ownerName ?? 'chưa có (kho số)'}</span>
        {l.inquiryCount > 1 && <span>· khách gửi {l.inquiryCount} lần</span>}
        {l.expectedValue > 0 && <span>· giá trị chốt {money(l.expectedValue)}</span>}
      </p>
      {l.masked && <p className="crm-warn">Số điện thoại được che cho đến khi bạn nhận số này.</p>}
      {l.notes && <p className="crm-quote">{l.notes}</p>}
      {open && l.nextDue != null && (
        <p className={cd.late ? 'crm-sla late' : 'crm-sla'}>
          {NEXT_ACTION_LABELS[l.nextAction as NextAction] || 'Việc kế tiếp'}: {stamp(l.nextDue)} (
          {cd.text})
        </p>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {open && canEdit && (
        <section aria-label="Khung ghi kết quả">
          <h4>Ghi kết quả cuộc gọi</h4>
          <div className="crm-actions">
            <select
              aria-label="Kết quả cuộc gọi"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              {CALL_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {CALL_RESULT_LABELS[r]}
                </option>
              ))}
            </select>
            {needsDate && (
              <input
                aria-label="Giờ hẹn"
                type="datetime-local"
                step={900}
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            )}
            <input
              aria-label="Ghi chú cuộc gọi"
              placeholder="Ghi chú"
              value={note}
              maxLength={600}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="primary"
              onClick={() =>
                act(
                  '/api/crm2/leads',
                  {
                    action: 'result',
                    id,
                    result,
                    note,
                    ...(needsDate && when ? { when: toMs(when) } : {}),
                  },
                  () => {
                    setNote('');
                    setWhen('');
                  },
                )
              }
            >
              Lưu kết quả
            </button>
          </div>
        </section>
      )}

      {canEdit && (
        <section aria-label="Chuyển giai đoạn">
          <h4>Chuyển giai đoạn</h4>
          <div className="crm-actions">
            <select
              aria-label="Giai đoạn mới"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {STAGES.filter((s) => s !== l.stage).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            {stage === 'LOST' && (
              <select
                aria-label="Lý do thất bại"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {LOST_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
            {stage === 'WON' && (
              <input
                aria-label="Giá trị giao dịch (đồng)"
                inputMode="numeric"
                placeholder="Giá trị giao dịch (đồng)"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value.replace(/\D/g, ''))}
              />
            )}
            <button
              className="secondary"
              onClick={() =>
                act('/api/crm2/leads', {
                  action: 'stage',
                  id,
                  stage,
                  ...(stage === 'LOST' ? { lostReason: reason } : {}),
                  ...(stage === 'WON' ? { dealValue: Number(dealValue) || 0 } : {}),
                })
              }
            >
              Chuyển
            </button>
          </div>
        </section>
      )}

      {manager && (
        <section aria-label="Giao lead">
          <div className="crm-actions">
            <select
              aria-label="Giao cho"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            >
              <option value="">Giao cho…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              className="secondary"
              disabled={!assignTo}
              onClick={() =>
                act('/api/crm2/leads', { action: 'assign', ids: [id], userId: assignTo })
              }
            >
              Giao
            </button>
            {l.owner && open && (
              <button
                className="secondary"
                onClick={() => {
                  const r = window.prompt('Lý do thu hồi về kho số:');
                  if (r && r.trim().length >= 2)
                    act('/api/crm2/leads', { action: 'recall', ids: [id], reason: r.trim() });
                }}
              >
                Thu hồi về kho số
              </button>
            )}
          </div>
        </section>
      )}
      {!l.owner && open && !manager && (
        <button
          className="primary"
          onClick={() => act('/api/crm2/leads', { action: 'claim', ids: [id] })}
        >
          Nhận số này
        </button>
      )}

      {open && canEdit && (
        <section aria-label="Lịch trải nghiệm và giữ chỗ">
          <h4>Lịch trải nghiệm</h4>
          <div className="crm-actions">
            <input
              aria-label="Giờ trải nghiệm"
              type="datetime-local"
              step={900}
              value={apptAt}
              onChange={(e) => setApptAt(e.target.value)}
            />
            <button
              className="secondary"
              disabled={!apptAt}
              onClick={() =>
                act(
                  '/api/crm2/appointments',
                  { action: 'create', leadId: id, at: toMs(apptAt) },
                  () => setApptAt(''),
                )
              }
            >
              Đặt lịch hẹn
            </button>
          </div>
          <h4>Giữ chỗ dịch vụ</h4>
          <div className="crm-actions">
            <select
              aria-label="Dịch vụ giữ chỗ"
              value={holdCode}
              onChange={(e) => setHoldCode(e.target.value)}
            >
              <option value="">Chọn dịch vụ…</option>
              {products.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} · {money(p.listPrice)}
                </option>
              ))}
            </select>
            <button
              className="secondary"
              disabled={!holdCode}
              onClick={() =>
                act('/api/crm2/sales', { action: 'hold', leadId: id, productCode: holdCode }, () =>
                  setHoldCode(''),
                )
              }
            >
              Giữ chỗ
            </button>
          </div>
        </section>
      )}

      <section aria-label="Ghi chú nhanh">
        <div className="crm-actions">
          <input
            aria-label="Ghi chú mới"
            placeholder="Thêm ghi chú về khách"
            onKeyDown={(e) => {
              const el = e.currentTarget;
              if (e.key === 'Enter' && el.value.trim())
                act(
                  '/api/crm2/leads',
                  { action: 'note', id, type: 'NOTE', content: el.value.trim() },
                  () => (el.value = ''),
                );
            }}
          />
        </div>
      </section>

      {(d.appointments.length > 0 || d.holds.length > 0 || d.orders.length > 0) && (
        <section aria-label="Liên quan">
          <h4>Liên quan</h4>
          <ul>
            {d.appointments.map((a) => (
              <li key={a.id}>
                Lịch hẹn {stamp(a.at)} · {a.service || 'trải nghiệm'} · {a.status}
              </li>
            ))}
            {d.holds.map((h) => (
              <li key={h.id}>
                Giữ chỗ {h.productName} · {h.status}
                {h.amount ? ` · cọc ${money(h.amount)}` : ''}
              </li>
            ))}
            {d.orders.map((o) => (
              <li key={o.id}>
                Đơn {o.code} · {o.productName} · {money(o.price)} · {o.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Lịch sử">
        <h4>Lịch sử hoạt động</h4>
        <ul>
          {d.activities.map((a) => (
            <li key={a.id}>
              <strong>{ACT_LABEL[a.type] ?? a.type}</strong> · {stamp(a.created)} — {a.content}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
