'use client';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { money } from '../../lib/club';
import {
  LEGACY_METHODS,
  LEGACY_METHOD_LABEL,
  LEGACY_SERVICES,
  LEGACY_SERVICE_LABEL,
  LEGACY_STATUS_LABEL,
  linesProblem,
  linesTotal,
  type LegacyLine,
  type LegacyMethod,
  type LegacyService,
} from '../../lib/legacy-bill';
import { askConfirm } from './kit';
import '../legacy-bills.css';

type Bill = {
  id: string;
  code: string;
  bill_at: number;
  customer: string;
  phone: string;
  room: string;
  service: string;
  lines: LegacyLine[];
  total: number;
  method: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by_name: string;
  created: number;
  reviewed_by_name: string;
  reviewed_at: number | null;
  review_note: string;
};
type ListResult = { bills: Bill[]; hasMore: boolean; pending: number; canEnter: boolean; canApprove: boolean };
type Draft = { name: string; qty: string; price: string; fnb: boolean };

const vnTime = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const vnDate = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
const emptyLine = (): Draft => ({ name: '', qty: '1', price: '', fnb: false });

async function api(body?: unknown, query = '') {
  const r = await fetch('/api/legacy-bills' + query, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const v = (await r.json()) as { error?: string } & Record<string, unknown>;
  if (!r.ok) throw new Error(v.error || 'Không thực hiện được');
  return v;
}

/** Old (pre-system) bills: staff and owner type them in; staff entries wait for the owner. */
export function LegacyBillsPanel({ onChanged }: { onChanged?: () => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  const load = useCallback(async () => {
    try {
      const v = (await api(undefined, filter === 'all' ? '' : `?status=${filter}`)) as unknown as ListResult;
      setData(v);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [filter]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the list when the filter changes
    void load();
  }, [load]);

  async function act(task: () => Promise<unknown>, done: string) {
    try {
      await task();
      setNotice(done);
      setError('');
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function review(b: Bill, decision: 'approve' | 'reject' | 'revoke') {
    let note = '';
    if (decision !== 'approve') {
      const v = window.prompt(decision === 'reject' ? 'Lý do không duyệt bill này:' : 'Lý do thu hồi bill đã duyệt:', '');
      if (v === null) return;
      note = v;
    } else if (
      !(await askConfirm({
        title: `Duyệt bill ${money(b.total)} của ${b.customer}?`,
        confirmLabel: 'Duyệt bill',
      }))
    )
      return;
    await act(
      () => api({ action: 'review', id: b.id, decision, note }),
      decision === 'approve' ? 'Đã duyệt bill. Doanh thu được cộng vào đúng ngày của bill.' : 'Đã cập nhật bill.',
    );
  }

  return (
    <section className="lb">
      <header className="lb-head">
        <div>
          <h2>Bill cũ</h2>
          <p>
            Nhập lại các hóa đơn trước khi dùng hệ thống. Bill do nhân viên nhập cần chủ cơ sở duyệt; bill đã duyệt được
            cộng vào báo cáo doanh thu theo đúng ngày của bill và không ảnh hưởng sổ ca hay két tiền.
          </p>
        </div>
        {data?.canEnter && (
          <button type="button" className="lb-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Nhập bill cũ
          </button>
        )}
      </header>

      <div className="lb-filters" role="group" aria-label="Lọc bill">
        {(
          [
            ['all', 'Tất cả'],
            ['pending', `Chờ duyệt${data?.pending ? ` (${data.pending})` : ''}`],
            ['approved', 'Đã duyệt'],
            ['rejected', 'Không duyệt'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="lb-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="lb-notice" role="status">
          {notice}
        </div>
      )}

      <ul className="lb-list">
        {(data?.bills ?? []).map((b) => (
          <li key={b.id} className={'lb-card ' + b.status}>
            <div className="lb-card-top">
              <div>
                <strong>{b.customer}</strong>
                {b.phone && <span> · {b.phone}</span>}
                <small>
                  {vnTime(b.bill_at)}
                  {b.code ? ` · Số bill ${b.code}` : ''}
                  {b.room ? ` · ${b.room}` : ''}
                </small>
              </div>
              <div className="lb-amount">
                <strong>{money(b.total)}</strong>
                <small>{LEGACY_METHOD_LABEL[b.method as LegacyMethod] ?? b.method}</small>
              </div>
            </div>
            <div className="lb-meta">
              <span className={'lb-chip ' + b.status}>{LEGACY_STATUS_LABEL[b.status]}</span>
              <span>{LEGACY_SERVICE_LABEL[b.service as LegacyService] ?? b.service}</span>
              <span>Nhập bởi {b.created_by_name}</span>
              {b.reviewed_by_name && <span>Duyệt bởi {b.reviewed_by_name}</span>}
            </div>
            <ul className="lb-lines">
              {b.lines.map((l, i) => (
                <li key={i}>
                  <span>
                    {l.name}
                    {l.fnb ? ' (F&B)' : ''} × {l.qty}
                  </span>
                  <b>{money(l.qty * l.price)}</b>
                </li>
              ))}
            </ul>
            {b.note && <p className="lb-note">Ghi chú: {b.note}</p>}
            {b.review_note && <p className="lb-note">Ghi chú của chủ cơ sở: {b.review_note}</p>}
            <div className="lb-actions">
              {b.status === 'pending' && data?.canApprove && (
                <>
                  <button type="button" className="lb-primary" onClick={() => review(b, 'approve')}>
                    <CheckCircle2 size={16} /> Duyệt
                  </button>
                  <button type="button" className="lb-ghost" onClick={() => review(b, 'reject')}>
                    <XCircle size={16} /> Không duyệt
                  </button>
                </>
              )}
              {b.status === 'approved' && data?.canApprove && (
                <button type="button" className="lb-ghost" onClick={() => review(b, 'revoke')}>
                  Thu hồi
                </button>
              )}
              {b.status === 'pending' && (
                <button type="button" className="lb-ghost" onClick={() => setEditing(b)}>
                  Sửa
                </button>
              )}
              {b.status === 'pending' && (
                <button
                  type="button"
                  className="lb-ghost danger"
                  onClick={async () => {
                    if (!(await askConfirm({ title: 'Xóa bill đang chờ duyệt này?', confirmLabel: 'Xóa bill' }))) return;
                    await act(() => api({ action: 'withdraw', id: b.id }), 'Đã xóa bill.');
                  }}
                >
                  <Trash2 size={16} /> Xóa
                </button>
              )}
            </div>
          </li>
        ))}
        {data && !data.bills.length && <li className="lb-empty">Chưa có bill cũ nào.</li>}
      </ul>

      {(open || editing) && data && (
        <BillForm
          canApprove={data.canApprove}
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={async (msg) => {
            setOpen(false);
            setEditing(null);
            setNotice(msg);
            await load();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}

function BillForm({
  canApprove,
  initial,
  onClose,
  onSaved,
}: {
  canApprove: boolean;
  initial: Bill | null;
  onClose: () => void;
  onSaved: (msg: string) => Promise<void>;
}) {
  const [today] = useState(() => vnDate(Date.now()));
  const [date, setDate] = useState(() => (initial ? vnDate(initial.bill_at) : vnDate(Date.now() - 86_400_000)));
  const [time, setTime] = useState(() =>
    initial ? new Date(initial.bill_at + 7 * 3_600_000).toISOString().slice(11, 16) : '12:00',
  );
  const [code, setCode] = useState(initial?.code ?? '');
  const [customer, setCustomer] = useState(initial?.customer ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [room, setRoom] = useState(initial?.room ?? '');
  const [service, setService] = useState<LegacyService>((initial?.service as LegacyService) ?? 'gdr');
  const [method, setMethod] = useState<LegacyMethod>((initial?.method as LegacyMethod) ?? 'cash');
  const [note, setNote] = useState(initial?.note ?? '');
  const [lines, setLines] = useState<Draft[]>(() =>
    initial
      ? initial.lines.map((l) => ({ name: l.name, qty: String(l.qty), price: String(l.price), fnb: !!l.fnb }))
      : [emptyLine()],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const parsed: LegacyLine[] = lines.map((l) => ({
    name: l.name,
    qty: Number(l.qty),
    price: Number(l.price.replace(/\D/g, '')),
    ...(l.fnb ? { fnb: true } : {}),
  }));
  const total = parsed.every((l) => Number.isFinite(l.qty) && Number.isFinite(l.price)) ? linesTotal(parsed) : 0;
  const problem = linesProblem(parsed);

  const set = (i: number, patch: Partial<Draft>) =>
    setLines((all) => all.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const v = (await api({
        action: initial ? 'update' : 'create',
        ...(initial ? { id: initial.id } : {}),
        date,
        time,
        code,
        customer,
        phone,
        room,
        service,
        lines: parsed,
        method,
        note,
      })) as { status?: string };
      await onSaved(
        initial
          ? 'Đã cập nhật bill.'
          : v.status === 'approved'
          ? 'Đã lưu và duyệt bill. Doanh thu được cộng vào đúng ngày của bill.'
          : 'Đã gửi bill, chờ chủ cơ sở duyệt.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lb-backdrop" onClick={onClose}>
      <form className="lb-modal" onClick={(e) => e.stopPropagation()} onSubmit={save} aria-label="Nhập bill cũ">
        <h3>{initial ? 'Sửa bill cũ' : 'Nhập bill cũ'}</h3>
        <p className="lb-hint">
          {canApprove
            ? 'Bill do chủ cơ sở nhập được duyệt ngay.'
            : 'Bill sẽ chờ chủ cơ sở duyệt trước khi tính vào báo cáo.'}
        </p>
        <div className="lb-grid">
          <label>
            Ngày
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Giờ
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
          <label>
            Số bill (nếu có)
            <input value={code} maxLength={40} onChange={(e) => setCode(e.target.value)} placeholder="Để chống nhập trùng" />
          </label>
          <label>
            Line / phòng
            <input value={room} maxLength={40} onChange={(e) => setRoom(e.target.value)} placeholder="VD: Line 03" />
          </label>
          <label>
            Tên khách
            <input value={customer} maxLength={100} onChange={(e) => setCustomer(e.target.value)} required />
          </label>
          <label>
            Số điện thoại
            <input value={phone} maxLength={30} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Dịch vụ chính
            <select value={service} onChange={(e) => setService(e.target.value as LegacyService)}>
              {LEGACY_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {LEGACY_SERVICE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hình thức thanh toán
            <select value={method} onChange={(e) => setMethod(e.target.value as LegacyMethod)}>
              {LEGACY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {LEGACY_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="lb-lines-edit">
          <div className="lb-lines-head">
            <strong>Các dòng trên bill</strong>
            <button type="button" className="lb-ghost" onClick={() => setLines((a) => [...a, emptyLine()])}>
              <Plus size={14} /> Thêm dòng
            </button>
          </div>
          {lines.map((l, i) => (
            <div className="lb-line-row" key={i}>
              <input
                aria-label={`Tên dòng ${i + 1}`}
                placeholder="Tên (giờ chơi, nước, …)"
                value={l.name}
                maxLength={120}
                onChange={(e) => set(i, { name: e.target.value })}
              />
              <input
                aria-label={`Số lượng dòng ${i + 1}`}
                inputMode="numeric"
                value={l.qty}
                onChange={(e) => set(i, { qty: e.target.value.replace(/\D/g, '') })}
              />
              <input
                aria-label={`Đơn giá dòng ${i + 1}`}
                inputMode="numeric"
                placeholder="Đơn giá (đ)"
                value={l.price}
                onChange={(e) => set(i, { price: e.target.value.replace(/\D/g, '') })}
              />
              <label className="lb-check" title="Đồ ăn, thức uống">
                <input type="checkbox" checked={l.fnb} onChange={(e) => set(i, { fnb: e.target.checked })} /> F&B
              </label>
              <button
                type="button"
                className="lb-icon"
                aria-label={`Xóa dòng ${i + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((a) => a.filter((_, k) => k !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="lb-total">
            <span>Tổng cộng</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <label className="lb-wide">
          Ghi chú
          <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
        </label>

        {error && (
          <div className="lb-error" role="alert">
            {error}
          </div>
        )}
        <div className="lb-foot">
          <button type="button" className="lb-ghost" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button type="submit" className="lb-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : canApprove ? 'Lưu và duyệt' : 'Gửi chờ duyệt'}
          </button>
        </div>
      </form>
    </div>
  );
}
