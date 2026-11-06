'use client';
import { useCallback, useEffect, useState } from 'react';
import { PageTabs } from '../kit';
import { Phone, MessageCircle } from 'lucide-react';
import { money } from '../../../lib/club';
import { CHANNELS, CHANNEL_LABELS, SEGMENT_LABELS, type Channel } from '../../../lib/crm';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../../lib/member';
import { LEAD_STATUS_LABELS, SOURCE_LABELS, type LeadSource } from '../../../lib/leads';
import {
  type LeadInfo,
  EVENT_TEXT,
  type Detail,
  SERVICE,
  day,
  stamp,
  call,
  zaloLink,
  dueText,
} from './shared';

export function CustomerDetail({
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
