'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Banknote, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { money } from '../../lib/club';
import { reconciliation, shiftTotals, type Entry } from '../../lib/finance';
import { DataTable, EmptyState, FilterBar, KpiTile, StatusBadge } from './kit';
import { type FinanceData, when, methods } from './finance/shared';
import { FinanceDialog } from './finance/FinanceDialog';

type ClosedRow = { label: string; counted: number; difference: number };
const KIND_TEXT: Record<string, string> = {
  payment: 'Thu tiền dịch vụ',
  cash_in: 'Nộp vào quỹ',
  refund: 'Hoàn tiền cho khách',
  cash_out: 'Chi / rút tiền mặt',
};

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
      <FilterBar
        right={
          <>
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
          </>
        }
      />
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
        <EmptyState title={error ? 'Chưa tải được dữ liệu ca' : 'Đang tải sổ ca…'} />
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
            <EmptyState
              title="Bắt đầu ca làm việc đầu tiên"
              text="Kiểm đếm tiền mặt đầu ca rồi bấm “Mở ca”. Mọi khoản thu mới sẽ được gắn với ca đang mở."
            />
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
              <div className="ds-tiles">
                {[
                  ['Tiền mặt đầu ca', shift.opening_cash],
                  ['Thực thu dịch vụ', summary.receipts],
                  ['Tiền mặt dự kiến trong quỹ', summary.expectedCash],
                  ['Thu chuyển khoản / thẻ', summary.expectedTransfer + summary.expectedCard],
                ].map(([t, n]) => (
                  <KpiTile key={String(t)} label={String(t)} value={money(Number(n))} />
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
                  <DataTable
                    columns={[
                      { key: 'method', header: 'Hình thức', cell: (r: ClosedRow) => r.label },
                      {
                        key: 'counted',
                        header: 'Đã đếm',
                        align: 'right',
                        cell: (r) => money(r.counted),
                      },
                      {
                        key: 'diff',
                        header: 'Đối soát',
                        cell: (r) =>
                          r.difference === 0 ? (
                            <StatusBadge tone="ok">Khớp sổ</StatusBadge>
                          ) : (
                            <StatusBadge tone="late">Chênh {money(r.difference)}</StatusBadge>
                          ),
                      },
                    ]}
                    rows={[
                      {
                        label: 'Tiền mặt',
                        counted: shift.counted_cash ?? 0,
                        difference: summary.cashDifference,
                      },
                      {
                        label: 'Chuyển khoản',
                        counted: shift.counted_transfer ?? 0,
                        difference: summary.transferDifference,
                      },
                      {
                        label: 'Thẻ',
                        counted: shift.counted_card ?? 0,
                        difference: summary.cardDifference,
                      },
                    ]}
                    rowKey={(r) => r.label}
                    label="Kết quả đối soát"
                    empty="Chưa có số đối soát"
                  />
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
              <DataTable
                columns={[
                  { key: 'when', header: 'Thời gian', cell: (e: Entry) => when(e.created) },
                  {
                    key: 'kind',
                    header: 'Loại',
                    cell: (e) => (
                      <>
                        {KIND_TEXT[e.kind] ?? KIND_TEXT.cash_out}
                        <small className="show-phone">
                          {methods[e.method]}
                          {e.note ? ' · ' + e.note : ''}
                        </small>
                      </>
                    ),
                  },
                  {
                    key: 'method',
                    header: 'Hình thức',
                    hideOnPhone: true,
                    cell: (e) => methods[e.method],
                  },
                  { key: 'note', header: 'Ghi chú', hideOnPhone: true, cell: (e) => e.note },
                  {
                    key: 'amount',
                    header: 'Số tiền',
                    align: 'right',
                    cell: (e) =>
                      (e.kind === 'cash_out' || e.kind === 'refund' ? '−' : '+') + money(e.amount),
                  },
                ]}
                rows={data.entries}
                rowKey={(e) => e.id}
                label="Sổ giao dịch"
                empty="Chưa có giao dịch trong ca"
                emptyText="Tiền đầu ca được ghi riêng, không phải doanh thu dịch vụ."
              />
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
