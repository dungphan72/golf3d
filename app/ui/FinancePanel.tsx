'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  LockKeyhole,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { money } from '../../lib/club';
import {
  operationKey,
  reconciliation,
  shiftTotals,
  type ShiftSummary,
  type Entry,
} from '../../lib/finance';
type FinanceData = {
  shifts: ShiftSummary[];
  selectedId: string | null;
  entries: Entry[];
  hasMore: boolean;
};
const when = (n: number) =>
  new Date(n).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
const safeCount = (value: string) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000 ? n : 0;
};
const methods = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
export default function FinancePanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const [data, setData] = useState<FinanceData | null>(null),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<'open' | 'cash' | 'close' | null>(null),
    [notice, setNotice] = useState('');
  const generation = useRef(0);
  async function load() {
    const id = ++generation.current;
    setLoading(true);
    try {
      const response = await fetch(
        '/api/finance' + (selected ? '?shift=' + encodeURIComponent(selected) : ''),
        { cache: 'no-store' },
      );
      const result = (await response.json()) as FinanceData & { error?: string };
      if (!response.ok) throw Error(result.error ?? 'Không tải được sổ ca');
      if (id === generation.current) {
        setData(result);
        setError('');
      }
    } catch (e) {
      if (id === generation.current)
        setError(e instanceof Error ? e.message : 'Không tải được sổ ca');
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => {
      clearInterval(timer);
      generation.current++;
    };
  }, [selected]);
  async function save(input: Record<string, unknown>) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { error?: string; replayed?: boolean };
      if (!response.ok) throw Error(result.error ?? 'Không thể ghi sổ');
      setForm(null);
      setNotice(
        result.replayed
          ? 'Thao tác đã được ghi trước đó; không ghi trùng.'
          : 'Đã ghi sổ thành công.',
      );
      await load();
      await onChanged();
      return true;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Không thể ghi sổ');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const shift = data?.shifts.find((s) => s.id === data.selectedId),
    active = data?.shifts.find((s) => s.status === 'open');
  const summary = shift
    ? reconciliation(shiftTotals(shift), {
        cash: shift.counted_cash ?? 0,
        transfer: shift.counted_transfer ?? 0,
        card: shift.counted_card ?? 0,
      })
    : null;
  return (
    <section className="finance-panel">
      <div className="finance-toolbar">
        <div>
          <h2>
            <Wallet size={20} />
            Ca làm việc & sổ tiền
          </h2>
          <p>
            Đối soát riêng tiền mặt, chuyển khoản và thẻ. Các khoản nộp quỹ không tính vào thực thu
            dịch vụ.
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary" onClick={load} disabled={loading || busy}>
            <RefreshCw size={15} />
            Tải lại
          </button>
          <button
            className="primary"
            disabled={!!active || busy || loading || !data}
            onClick={() => setForm('open')}
          >
            <Plus size={16} />
            Mở ca
          </button>
        </div>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="info-strip" role="status">
          {notice}
        </div>
      )}
      {!data ? (
        <div className="empty">
          <Wallet size={28} />
          <h3>{error ? 'Chưa tải được dữ liệu ca' : 'Đang tải sổ ca…'}</h3>
        </div>
      ) : (
        <>
          <div className="finance-select">
            <label>
              30 ca gần nhất
              <select
                value={data.selectedId ?? ''}
                disabled={busy || loading}
                onChange={(e) => setSelected(e.target.value)}
              >
                {!data.shifts.length && <option value="">Chưa có ca</option>}
                {data.shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {when(s.opened_at)} · {s.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                  </option>
                ))}
              </select>
            </label>
            {active && <span className="badge playing">Đang mở: {active.name}</span>}
          </div>
          {!shift || !summary ? (
            <div className="empty">
              <h3>Bắt đầu ca làm việc đầu tiên</h3>
              <p>
                Kiểm đếm tiền mặt đầu ca rồi bấm “Mở ca”. Mọi khoản thu mới sẽ được gắn với ca đang
                mở.
              </p>
            </div>
          ) : (
            <>
              <div className="shift-banner">
                <div>
                  <span className="eyebrow">
                    {shift.status === 'open' ? 'CA ĐANG HOẠT ĐỘNG' : 'CA ĐÃ KHÓA'}
                  </span>
                  <h2>{shift.name}</h2>
                  <p>
                    Mở lúc {when(shift.opened_at)}
                    {shift.closed_at ? ` · Đóng lúc ${when(shift.closed_at)}` : ''}
                  </p>
                </div>
                {shift.status === 'open' ? (
                  <div className="heading-actions">
                    <button
                      className="secondary"
                      disabled={busy || loading}
                      onClick={() => setForm('cash')}
                    >
                      <Plus size={16} />
                      Thu / chi tiền mặt
                    </button>
                    <button
                      className="primary"
                      disabled={busy || loading}
                      onClick={() => setForm('close')}
                    >
                      <LockKeyhole size={16} />
                      Đối soát & đóng ca
                    </button>
                  </div>
                ) : (
                  <ShieldCheck size={30} />
                )}
              </div>
              <div className="finance-stats">
                {[
                  ['Tiền mặt đầu ca', shift.opening_cash],
                  ['Thực thu dịch vụ', summary.receipts],
                  ['Tiền mặt dự kiến trong quỹ', summary.expectedCash],
                  ['Thu chuyển khoản / thẻ', summary.expectedTransfer + summary.expectedCard],
                ].map(([t, n]) => (
                  <article key={String(t)}>
                    <span>{t}</span>
                    <strong>{money(Number(n))}</strong>
                  </article>
                ))}
              </div>
              <div className="cash-breakdown">
                <div>
                  <span>Thu dịch vụ bằng tiền mặt</span>
                  <strong>{money(shift.cash_received)}</strong>
                </div>
                <div>
                  <span>Nộp thêm vào quỹ</span>
                  <strong>+ {money(shift.cash_in)}</strong>
                </div>
                <div>
                  <span>Chi / rút khỏi quỹ</span>
                  <strong>− {money(shift.cash_out)}</strong>
                </div>
                <div>
                  <span>Thu chuyển khoản</span>
                  <strong>{money(shift.transfer_received)}</strong>
                </div>
                <div>
                  <span>Thu thẻ</span>
                  <strong>{money(shift.card_received)}</strong>
                </div>
              </div>
              {shift.status === 'closed' && (
                <div className="closed-summary">
                  <h3>Kết quả đối soát</h3>
                  {[
                    ['Tiền mặt', shift.counted_cash, summary.cashDifference],
                    ['Chuyển khoản', shift.counted_transfer, summary.transferDifference],
                    ['Thẻ', shift.counted_card, summary.cardDifference],
                  ].map(([label, counted, difference]) => (
                    <div key={String(label)}>
                      <span>{label}</span>
                      <strong>{money(Number(counted))}</strong>
                      <span
                        className={
                          Number(difference) === 0 ? 'balance-match' : 'balance-difference'
                        }
                      >
                        {Number(difference) === 0
                          ? 'Khớp sổ'
                          : `Chênh ${money(Number(difference))}`}
                      </span>
                    </div>
                  ))}
                  {shift.note && <p>Ghi chú bàn giao: {shift.note}</p>}
                  <small>Ca đã khóa; không mở lại hoặc sửa số liệu trực tiếp.</small>
                </div>
              )}
              <div className="section-heading">
                <h2>
                  Sổ giao dịch <span>{shift.entry_count}</span>
                </h2>
                <span>
                  {data.hasMore
                    ? '100 dòng mới nhất · tổng tính trên toàn bộ sổ'
                    : 'Tổng hợp toàn bộ giao dịch của ca'}
                </span>
              </div>
              <div className="finance-entries">
                {data.entries.length ? (
                  data.entries.map((e) => (
                    <article key={e.id}>
                      <span className={'entry-icon ' + e.kind}>
                        {e.kind === 'cash_out' ? (
                          <ArrowUpRight size={18} />
                        ) : (
                          <ArrowDownLeft size={18} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {e.kind === 'payment'
                            ? 'Thu tiền dịch vụ'
                            : e.kind === 'cash_in'
                              ? 'Nộp vào quỹ'
                              : 'Chi / rút tiền mặt'}
                        </strong>
                        <p>{e.note}</p>
                        <small>
                          {when(e.created)} · {methods[e.method]}
                        </small>
                      </div>
                      <b>
                        {e.kind === 'cash_out' ? '−' : '+'}
                        {money(e.amount)}
                      </b>
                    </article>
                  ))
                ) : (
                  <div className="empty">
                    <h3>Chưa có giao dịch trong ca</h3>
                    <p>Tiền đầu ca được ghi riêng, không phải doanh thu dịch vụ.</p>
                  </div>
                )}
              </div>
            </>
          )}
          <p className="form-note">
            Sổ này ghi nhận thanh toán thủ công từ phiên bản 0.3. Các phiếu cũ đã thanh toán trước
            đó giữ nguyên và không tự nhập vào quỹ ca hiện tại. Mỗi cơ sở thử nội bộ có một ca đang
            mở.
          </p>
        </>
      )}
      {form && (
        <FinanceDialog
          key={form}
          kind={form}
          shift={shift}
          busy={busy}
          notice={notice}
          onClose={() => {
            if (!busy) setForm(null);
          }}
          onSave={save}
        />
      )}
    </section>
  );
}
function FinanceDialog({
  kind,
  shift,
  busy,
  notice,
  onClose,
  onSave,
}: {
  kind: 'open' | 'cash' | 'close';
  shift?: ShiftSummary;
  busy: boolean;
  notice: string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    requestId = useRef(operationKey());
  const [version, setVersion] = useState(shift?.version ?? 0),
    [cash, setCash] = useState(''),
    [transfer, setTransfer] = useState(''),
    [card, setCard] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const summary = shift
    ? reconciliation(shiftTotals(shift), {
        cash: safeCount(cash),
        transfer: safeCount(transfer),
        card: safeCount(card),
      })
    : null;
  const noLongerOpen = kind !== 'open' && shift?.status !== 'open';
  const changed = kind === 'close' && shift?.version !== version;
  const difference =
    summary &&
    [summary.cashDifference, summary.transferDifference, summary.cardDifference].some(
      (n) => n !== 0,
    );
  return (
    <dialog
      className="native-dialog"
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <section className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">GOLF3D / CASH DESK</span>
            <h2>
              {kind === 'open'
                ? 'Mở ca mới'
                : kind === 'cash'
                  ? 'Ghi thu / chi tiền mặt'
                  : 'Đối soát & bàn giao'}
            </h2>
          </div>
          <button
            className="icon-btn"
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (kind === 'open')
              onSave({
                action: 'open',
                requestId: requestId.current,
                name: f.get('name'),
                openingCash: Number(f.get('openingCash')),
              });
            else if (kind === 'cash')
              onSave({
                action: 'cash-entry',
                requestId: requestId.current,
                shiftId: shift!.id,
                kind: f.get('kind'),
                amount: Number(f.get('amount')),
                note: f.get('note'),
              });
            else
              onSave({
                action: 'close',
                shiftId: shift!.id,
                expectedVersion: version,
                countedCash: Number(cash),
                countedTransfer: Number(transfer),
                countedCard: Number(card),
                note: f.get('note'),
              });
          }}
        >
          {notice && (
            <div className="info-strip" role="status">
              {notice}
            </div>
          )}
          {noLongerOpen && (
            <div className="info-strip">
              Ca đã được đóng ở thiết bị khác. Đóng hộp này để xem kết quả.
            </div>
          )}
          {kind === 'open' ? (
            <>
              <p className="dialog-intro">
                Nhập số tiền mặt đã kiểm đếm thực tế trong quỹ. Khoản này không tính là thực thu
                dịch vụ.
              </p>
              <div className="form-grid">
                <label>
                  Tên ca
                  <input
                    name="name"
                    defaultValue="Ca làm việc"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Tiền mặt đầu ca (₫)
                  <input
                    name="openingCash"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="1"
                    defaultValue="0"
                    required
                  />
                </label>
              </div>
            </>
          ) : kind === 'cash' ? (
            <>
              <p className="dialog-intro">
                Ghi nộp quỹ, chi phí hoặc rút quỹ; không dùng thao tác này thay cho thanh toán phiếu
                dịch vụ.
              </p>
              <div className="form-grid">
                <label>
                  Loại giao dịch
                  <select name="kind">
                    <option value="cash_in">Nộp thêm vào quỹ</option>
                    <option value="cash_out">Chi / rút tiền mặt</option>
                  </select>
                </label>
                <label>
                  Số tiền (₫)
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max="1000000000000"
                    step="1"
                    required
                  />
                </label>
                <label className="full-width">
                  Lý do
                  <input
                    name="note"
                    minLength={3}
                    maxLength={300}
                    required
                    placeholder="Ví dụ: mua vật tư vệ sinh"
                  />
                </label>
              </div>
            </>
          ) : (
            summary && (
              <>
                <p className="dialog-intro">
                  Kiểm đếm tiền mặt và đối chiếu chứng từ chuyển khoản/thẻ. Chỉ đóng ca sau khi đã
                  xác nhận các số dưới đây.
                </p>
                {changed && (
                  <div className="info-strip">
                    Có giao dịch mới trong ca. Hãy xem lại số dự kiến trước khi đóng.
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setVersion(shift!.version)}
                    >
                      Cập nhật số đối soát
                    </button>
                  </div>
                )}
                <div className="reconciliation-fields">
                  {[
                    ['Tiền mặt', summary.expectedCash, cash, setCash],
                    ['Chuyển khoản', summary.expectedTransfer, transfer, setTransfer],
                    ['Thẻ', summary.expectedCard, card, setCard],
                  ].map(([label, expected, value, setter]) => (
                    <label key={String(label)}>
                      <span>
                        {String(label)}
                        <small>Dự kiến: {money(Number(expected))}</small>
                      </span>
                      <input
                        aria-label={'Thực tế ' + String(label)}
                        type="number"
                        min="0"
                        max="1000000000000"
                        step="1"
                        required
                        value={String(value)}
                        onChange={(e) => (setter as (s: string) => void)(e.target.value)}
                      />
                      <small
                        className={
                          Number(value) === Number(expected)
                            ? 'balance-match'
                            : 'balance-difference'
                        }
                      >
                        {value === ''
                          ? 'Chưa nhập'
                          : `Chênh ${money(Number(value) - Number(expected))}`}
                      </small>
                    </label>
                  ))}
                </div>
                <label className="close-note">
                  Ghi chú / lý do chênh lệch
                  <input
                    name="note"
                    minLength={difference ? 5 : 0}
                    maxLength={500}
                    required={!!difference}
                    placeholder={
                      difference ? 'Bắt buộc ghi rõ lý do chênh lệch' : 'Ghi chú bàn giao (nếu có)'
                    }
                  />
                </label>
                <p className="form-note">
                  Sau khi đóng, ca và sổ giao dịch được khóa. Phiên đang chơi có thể tiếp tục; khoản
                  thu sau đó thuộc ca mới.
                </p>
              </>
            )
          )}
          <div className="form-footer">
            <button className="secondary" type="button" disabled={busy} onClick={onClose}>
              Để sau
            </button>
            <button className="primary" disabled={busy || changed || noLongerOpen}>
              {busy ? 'Đang ghi sổ…' : kind === 'close' ? 'Xác nhận đóng ca' : 'Xác nhận ghi sổ'}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  );
}
