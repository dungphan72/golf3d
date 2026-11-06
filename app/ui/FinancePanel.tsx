'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Wallet,
  Plus,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { money } from '../../lib/club';
import { reconciliation, shiftTotals } from '../../lib/finance';
import { type FinanceData, when, methods } from './finance/shared';
import { FinanceDialog } from './finance/FinanceDialog';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const timer = setInterval(load, 15000);
    return () => {
      clearInterval(timer);
      // Bumping the counter (not reading a DOM ref) invalidates in-flight loads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
    // Reload when the selected shift changes; `load` is recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="ds-filterbar">
        <div className="ds-filter-right">
          <button
            data-tip="Tải lại"
            aria-label="Tải lại"
            className="secondary icon-only"
            onClick={load}
            disabled={loading || busy}
          >
            <RefreshCw size={15} />
            <span className="btn-label">Tải lại</span>
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
              <h3 role="heading" aria-level={2}>
                Bắt đầu ca làm việc đầu tiên
              </h3>
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
                      data-tip="Thu / chi tiền mặt"
                      aria-label="Thu / chi tiền mặt"
                      className="secondary icon-only"
                      disabled={busy || loading}
                      onClick={() => setForm('cash')}
                    >
                      <Banknote size={16} />
                      <span className="btn-label">Thu / chi tiền mặt</span>
                    </button>
                    <button
                      data-tip="Đối soát & đóng ca"
                      aria-label="Đối soát & đóng ca"
                      className="primary icon-only"
                      disabled={busy || loading}
                      onClick={() => setForm('close')}
                    >
                      <LockKeyhole size={16} />
                      <span className="btn-label">Đối soát & đóng ca</span>
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
                {shift.cash_refund + shift.transfer_refund + shift.card_refund > 0 && (
                  <div>
                    <span>Đã hoàn lại cho khách (trừ vào quỹ / chuyển khoản / thẻ)</span>
                    <strong>
                      − {money(shift.cash_refund)} / {money(shift.transfer_refund)} /{' '}
                      {money(shift.card_refund)}
                    </strong>
                  </div>
                )}
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
                        {e.kind === 'cash_out' || e.kind === 'refund' ? (
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
                              : e.kind === 'refund'
                                ? 'Hoàn tiền cho khách'
                                : 'Chi / rút tiền mặt'}
                        </strong>
                        <p>{e.note}</p>
                        <small>
                          {when(e.created)} · {methods[e.method]}
                        </small>
                      </div>
                      <b>
                        {e.kind === 'cash_out' || e.kind === 'refund' ? '−' : '+'}
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
