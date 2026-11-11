'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { Chips, DataTable, FilterBar, PageTabs } from '../../../app/ui/kit';
import { money } from '../../../lib/club';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../../lib/member';
import {
  CARE_CHANNELS,
  CARE_CHANNEL_LABELS,
  SEGMENT_LABELS,
  careRuleName,
  type Segment,
} from '../core/care';
import { call, dateOnly, errText, stamp } from './api';
import { useLoad } from './Screens';

type Row = {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  email: string;
  zalo_id: string;
  marketing_consent: number;
  created: number;
  visits: number;
  last_visit: number | null;
  spend: number;
  points: number;
  open_tasks: number;
  account: number | null;
  segments: Segment[];
};
type Detail = {
  customer: Row;
  visits: { id: string; service: string; finished: number; amount: number }[];
  packages: { id: string; name: string; expires: number; balances: string | null }[];
  notes: { id: string; channel: string; content: string; created: number; actor: string }[];
  tasks: {
    id: string;
    rule: string;
    title: string;
    dueAt: number | null;
    doneAt: number | null;
    outcome: string;
  }[];
  leads: { id: string; stage: string; source: string; created: number }[];
  timeline: {
    id: string;
    kind: string;
    at: number;
    title: string;
    detail: string;
    amount?: number;
  }[];
  now: number;
};
const SERVICE: Record<string, string> = { gdr: 'Luyện tập', '9': 'Game 9 hố', '18': 'Game 18 hố' };

function FilePanel({
  id,
  onClose,
  onChanged,
  onNavigate,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
  onNavigate?: (
    view: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => void;
}) {
  const {
    data: d,
    error,
    reload,
    setError,
  } = useLoad<Detail>(`/api/crm2/care-customers?id=${encodeURIComponent(id)}`);
  const [sub, setSub] = useState('overview');
  const [birthday, setBirthday] = useState('');
  const [contact, setContact] = useState({ email: '', zaloId: '' });
  const [channel, setChannel] = useState<string>('call');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  useEffect(() => {
    if (!d) return;
    /* eslint-disable react-hooks/set-state-in-effect -- copy the loaded fields into the forms */
    setBirthday(d.customer.birthday);
    setContact({ email: d.customer.email, zaloId: d.customer.zalo_id });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [d]);
  async function act(body: Record<string, unknown>, after?: () => void) {
    setError('');
    try {
      await call('/api/crm2/care-customers', { customerId: id, ...body });
      after?.();
      await reload();
      onChanged();
    } catch (e) {
      setError(errText(e));
    }
  }
  if (!d) return error ? <div className="error-box">{error}</div> : <p>Đang tải…</p>;
  const c = d.customer;
  return (
    <section className="crm-detail" aria-label={`Hồ sơ ${c.name}`}>
      <header>
        <div>
          <h3>{c.name}</h3>
          <p>
            <a href={`tel:${c.phone}`}>
              <Phone size={13} /> {c.phone}
            </a>{' '}
            ·{' '}
            <a href={`https://zalo.me/${c.phone}`} target="_blank" rel="noreferrer">
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
      {onNavigate && (
        <div
          className="crm-actions"
          style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <button
            type="button"
            className="primary"
            onClick={() => onNavigate('rooms', { customerId: c.id, phone: c.phone, name: c.name })}
          >
            ⛳ Xếp line chơi ngay
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              onNavigate('members', { customerId: c.id, phone: c.phone, name: c.name })
            }
          >
            🎟️ Bán gói hội viên
          </button>
        </div>
      )}
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
          <strong>{c.last_visit ? dateOnly(c.last_visit) : '—'}</strong>
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
      {sub === 'overview' && (
        <>
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
              onClick={() => act({ action: 'birthday-set', birthday: birthday.trim() })}
            >
              Lưu ngày sinh
            </button>
          </div>
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
              onChange={(e) => act({ action: 'consent-set', consent: e.target.checked })}
            />
            Khách đồng ý nhận tin ưu đãi (tin đặt lịch, biên nhận, cảm ơn vẫn gửi khi chưa đồng ý)
          </label>
          {d.leads.length > 0 && (
            <>
              <h4>Lead của khách này</h4>
              <ul className="crm-timeline">
                {d.leads.map((l) => (
                  <li key={l.id}>
                    {l.stage} · {l.source || '—'} · {dateOnly(l.created)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h4>Gói và thẻ</h4>
          <ul className="crm-timeline">
            {d.packages.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> · hạn {dateOnly(p.expires)} ·{' '}
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
          <h4>Các buổi chơi gần đây</h4>
          <ul className="crm-timeline">
            {d.visits.map((v) => (
              <li key={v.id}>
                {dateOnly(v.finished)} · {SERVICE[v.service] ?? v.service} · {money(v.amount)}
              </li>
            ))}
            {!d.visits.length && <li>Chưa có buổi chơi đã thanh toán.</li>}
          </ul>
        </>
      )}
      {sub === 'care' && (
        <>
          <h4>Ghi nhận liên hệ</h4>
          <div className="crm-actions">
            <select aria-label="Kênh" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CARE_CHANNELS.map((x) => (
                <option key={x} value={x}>
                  {CARE_CHANNEL_LABELS[x]}
                </option>
              ))}
              <option value="note">Ghi chú</option>
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
                act({ action: 'note-add', channel, content: content.trim() }, () => setContent(''))
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
                act({ action: 'task-create', title: title.trim(), days: 1 }, () => setTitle(''))
              }
            >
              Thêm việc (ngày mai)
            </button>
          </div>
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
                act({ action: 'feedback', rating, comment: comment.trim() }, () => setComment(''))
              }
            >
              Ghi nhận phản hồi
            </button>
          </div>
          <p className="muted">
            Từ 3 sao trở xuống là phản ánh: tự tạo việc cho quản lý xử lý và báo quản lý ngay.
          </p>
          <h4>Việc chăm sóc</h4>
          <ul className="crm-timeline">
            {d.tasks.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong> · {careRuleName(t.rule)} ·{' '}
                {!t.doneAt ? 'đang chờ' : t.outcome === 'skipped' ? 'đã bỏ qua' : 'đã liên hệ'}
              </li>
            ))}
            {!d.tasks.length && <li>Chưa có việc nào.</li>}
          </ul>
        </>
      )}
      {sub === 'history' && (
        <>
          <h4>Lịch sử khách hàng</h4>
          <ul className="crm-timeline">
            {d.timeline.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong> · {stamp(item.at)}
                {item.detail && (
                  <>
                    <br />
                    {item.detail}
                  </>
                )}
                {item.amount !== undefined && (
                  <>
                    <br />
                    <strong>{money(item.amount)}</strong>
                  </>
                )}
              </li>
            ))}
            {!d.timeline.length && <li>Chưa có lịch sử nào được ghi nhận.</li>}
          </ul>
        </>
      )}
    </section>
  );
}

/** Customer files for care: everyone who bought or played, not only people who became a lead. */
export function CareCustomersView({
  focus,
  onNavigate,
}: {
  focus: string | null;
  onNavigate?: (
    view: string,
    extra?: { customerId?: string; phone?: string; name?: string; room?: string },
  ) => void;
}) {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | Segment>('all');
  const [selected, setSelected] = useState<string | null>(focus);
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data, error, reload } = useLoad<{ customers: Row[] }>(
    `/api/crm2/care-customers?q=${encodeURIComponent(q)}`,
  );
  const shown = (data?.customers ?? []).filter(
    (c) => segment === 'all' || c.segments.includes(segment),
  );
  return (
    <div className="crm-customers">
      <div>
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Tìm theo tên hoặc số điện thoại"
          label="Tìm hồ sơ khách"
        >
          <Chips
            value={segment}
            onChange={(v) => setSegment(v as 'all' | Segment)}
            options={[
              { key: 'all', label: 'Tất cả' },
              ...(Object.keys(SEGMENT_LABELS) as Segment[]).map((k) => ({
                key: k,
                label: SEGMENT_LABELS[k],
              })),
            ]}
          />
        </FilterBar>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {data && (
          <DataTable
            rows={shown}
            rowKey={(c) => c.id}
            empty="Chưa có khách phù hợp"
            onRowClick={(c) => setSelected(c.id)}
            rowActive={(c) => c.id === selected}
            columns={[
              {
                key: 'name',
                header: 'Khách',
                cell: (c) => (
                  <>
                    <strong>{c.name}</strong>
                    <small>
                      {c.phone}
                      {c.open_tasks > 0 && <b className="crm-dot"> · {c.open_tasks} việc</b>}
                    </small>
                  </>
                ),
              },
              {
                key: 'seg',
                header: 'Nhóm',
                cell: (c) =>
                  c.segments.map((x) => (
                    <span key={x} className={'crm-chip seg-' + x}>
                      {SEGMENT_LABELS[x]}
                    </span>
                  )),
              },
              { key: 'visits', header: 'Lần chơi', cell: (c) => c.visits },
              {
                key: 'last',
                header: 'Gần nhất',
                cell: (c) => (c.last_visit ? dateOnly(c.last_visit) : '—'),
              },
              { key: 'spend', header: 'Chi tiêu', align: 'right', cell: (c) => money(c.spend) },
            ]}
          />
        )}
      </div>
      {selected && (
        <FilePanel
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
          onChanged={reload}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
