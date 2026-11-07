'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Banknote,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { money } from '../../lib/club';
import { reconciliation, shiftTotals, type Entry } from '../../lib/finance';
import { DataTable, EmptyState, StatusBadge } from './kit';
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
  const [data, setData] = useState<FinanceData | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'open' | 'cash' | 'close' | null>(null);
  const [notice, setNotice] = useState('');

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
      generation.current++;
    };
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

  const shift = data?.shifts.find((s) => s.id === data.selectedId);
  const active = data?.shifts.find((s) => s.status === 'open');
  const summary = shift
    ? reconciliation(shiftTotals(shift), {
        cash: shift.counted_cash ?? 0,
        transfer: shift.counted_transfer ?? 0,
        card: shift.counted_card ?? 0,
      })
    : null;

  return (
    <section className="finance-panel operate-finance">
      {/* Top Shift Management Ribbon */}
      <div className="operate-filterbar">
        <div className="operate-filter-left">
          <label className="operate-shift-select-wrap">
            <span className="operate-shift-select-label">Chọn ca thu ngân:</span>
            <select
              value={data?.selectedId ?? ''}
              disabled={busy || loading || !data}
              onChange={(e) => setSelected(e.target.value)}
              className="operate-select"
            >
              {!data?.shifts.length && <option value="">Chưa có ca làm việc</option>}
              {data?.shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {when(s.opened_at)} {s.status === 'open' ? '🟢 (Đang mở)' : '🔒 (Đã đóng)'}
                </option>
              ))}
            </select>
          </label>
          {active && (
            <span className="badge playing" style={{ fontSize: '13px', padding: '6px 12px' }}>
              🟢 Đang mở: <strong>{active.name}</strong>
            </span>
          )}
        </div>
        <div className="operate-filter-right">
          <button
            aria-label="Tải lại"
            className="secondary operate-btn"
            onClick={load}
            disabled={loading || busy}
          >
            <RefreshCw size={15} /> Tải lại
          </button>
          <button
            className="primary operate-btn"
            disabled={!!active || busy || loading || !data}
            onClick={() => setForm('open')}
          >
            <Plus size={16} /> Mở ca mới
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="info-strip" role="status">
          <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> {notice}
        </div>
      )}

      {!data ? (
        <EmptyState title={error ? 'Chưa tải được dữ liệu ca' : 'Đang tải sổ ca…'} />
      ) : !shift || !summary ? (
        <EmptyState
          title="Bắt đầu ca làm việc đầu tiên"
          text="Kiểm đếm tiền mặt đầu ca rồi bấm “Mở ca mới”. Mọi khoản thanh toán sẽ được liên kết tự động vào ca này."
        />
      ) : (
        <>
          {/* Active Shift Card Header */}
          <div className={`operate-shift-banner ${shift.status === 'open' ? 'open' : 'closed'}`}>
            <div className="shift-banner-info">
              <span className={`eyebrow ${shift.status === 'open' ? 'status-open' : 'status-closed'}`}>
                {shift.status === 'open' ? '🟢 CA ĐANG HOẠT ĐỘNG' : '🔒 CA ĐÃ KHÓA & ĐỐI SOÁT'}
              </span>
              <h2 className="shift-banner-title">{shift.name}</h2>
              <p className="shift-banner-time">
                <Calendar size={14} /> Mở lúc: <strong>{when(shift.opened_at)}</strong>
                {shift.closed_at ? (
                  <>
                    {' '}· Khóa lúc: <strong>{when(shift.closed_at)}</strong>
                  </>
                ) : null}
              </p>
            </div>
            {shift.status === 'open' ? (
              <div className="shift-banner-actions">
                <button
                  className="secondary operate-banner-btn"
                  disabled={busy || loading}
                  onClick={() => setForm('cash')}
                >
                  <Banknote size={16} />
                  <span>Thu / Chi quỹ</span>
                </button>
                <button
                  className="primary operate-banner-btn"
                  disabled={busy || loading}
                  onClick={() => setForm('close')}
                >
                  <LockKeyhole size={16} />
                  <span>Đối soát & Đóng ca</span>
                </button>
              </div>
            ) : (
              <div className="shift-locked-indicator">
                <ShieldCheck size={28} style={{ color: '#16a34a' }} />
                <span>Đã niêm phong sổ ca</span>
              </div>
            )}
          </div>

          {/* Key Financial KPIs */}
          <div className="operate-ribbon">
            <div className="operate-kpi-card">
              <div className="operate-kpi-label">Tiền mặt đầu ca</div>
              <div className="operate-kpi-val">{money(shift.opening_cash)}</div>
            </div>

            <div className="operate-kpi-card">
              <div className="operate-kpi-label">Thực thu dịch vụ</div>
              <div className="operate-kpi-val" style={{ color: '#16a34a' }}>
                {money(summary.receipts)}
              </div>
            </div>

            <div className="operate-kpi-card">
              <div className="operate-kpi-label">Tiền mặt dự kiến trong quỹ</div>
              <div className="operate-kpi-val" style={{ color: '#2563eb' }}>
                {money(summary.expectedCash)}
              </div>
            </div>

            <div className="operate-kpi-card">
              <div className="operate-kpi-label">Thu Chuyển khoản / Thẻ</div>
              <div className="operate-kpi-val">
                {money(summary.expectedTransfer + summary.expectedCard)}
              </div>
            </div>
          </div>

          {/* Cash & Payment Breakdown Grid */}
          <div className="operate-cash-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Thu dịch vụ tiền mặt:</span>
              <strong className="breakdown-val text-green">{money(shift.cash_received)}</strong>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Nộp thêm vào quỹ:</span>
              <strong className="breakdown-val text-blue">+{money(shift.cash_in)}</strong>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Chi / rút khỏi quỹ:</span>
              <strong className="breakdown-val text-red">−{money(shift.cash_out)}</strong>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Thu chuyển khoản (QR/App):</span>
              <strong className="breakdown-val">{money(shift.transfer_received)}</strong>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Thu quẹt thẻ (POS):</span>
              <strong className="breakdown-val">{money(shift.card_received)}</strong>
            </div>
            {shift.cash_refund + shift.transfer_refund + shift.card_refund > 0 && (
              <div className="breakdown-item full-width">
                <span className="breakdown-label">Đã hoàn lại cho khách (Tiền mặt / CK / Thẻ):</span>
                <strong className="breakdown-val text-red">
                  −{money(shift.cash_refund)} / {money(shift.transfer_refund)} / {money(shift.card_refund)}
                </strong>
              </div>
            )}
          </div>

          {/* Closed Reconciliation Summary */}
          {shift.status === 'closed' && (
            <div className="operate-reconciliation-box">
              <h3 className="reconciliation-title">
                <ShieldCheck size={18} /> Kết quả đối soát bàn giao ca
              </h3>
              <DataTable
                columns={[
                  { key: 'method', header: 'Hình thức', cell: (r: ClosedRow) => <strong>{r.label}</strong> },
                  {
                    key: 'counted',
                    header: 'Thực tế đếm được',
                    align: 'right',
                    cell: (r) => money(r.counted),
                  },
                  {
                    key: 'diff',
                    header: 'Kết quả đối soát',
                    cell: (r) =>
                      r.difference === 0 ? (
                        <StatusBadge tone="ok">Khớp sổ (0₫)</StatusBadge>
                      ) : (
                        <StatusBadge tone="late">
                          {r.difference > 0 ? 'Thừa' : 'Thiếu'} {money(Math.abs(r.difference))}
                        </StatusBadge>
                      ),
                  },
                ]}
                rows={[
                  {
                    label: 'Tiền mặt trong két',
                    counted: shift.counted_cash ?? 0,
                    difference: summary.cashDifference,
                  },
                  {
                    label: 'Chuyển khoản SePay / VietQR',
                    counted: shift.counted_transfer ?? 0,
                    difference: summary.transferDifference,
                  },
                  {
                    label: 'Thẻ thanh toán POS',
                    counted: shift.counted_card ?? 0,
                    difference: summary.cardDifference,
                  },
                ]}
                rowKey={(r) => r.label}
                label="Kết quả đối soát"
                empty="Chưa có số đối soát"
              />
              {shift.note && (
                <div className="reconciliation-note">
                  <strong>Ghi chú bàn giao:</strong> {shift.note}
                </div>
              )}
            </div>
          )}

          {/* Transaction Journal Table */}
          <div className="operate-journal-section">
            <div className="journal-header">
              <h2 className="journal-title">
                Sổ giao dịch thu chi <span className="journal-badge">{shift.entry_count}</span>
              </h2>
              <span className="journal-subtitle">
                {data.hasMore
                  ? '100 dòng mới nhất · tổng tính trên toàn bộ sổ'
                  : 'Toàn bộ dòng tiền phát sinh trong ca làm việc'}
              </span>
            </div>
            <DataTable
              columns={[
                { key: 'when', header: 'Thời gian', cell: (e: Entry) => when(e.created) },
                {
                  key: 'kind',
                  header: 'Nghiệp vụ',
                  cell: (e) => (
                    <div>
                      <strong>{KIND_TEXT[e.kind] ?? KIND_TEXT.cash_out}</strong>
                      <small className="show-phone">
                        {methods[e.method]}
                        {e.note ? ' · ' + e.note : ''}
                      </small>
                    </div>
                  ),
                },
                {
                  key: 'method',
                  header: 'Phương thức',
                  hideOnPhone: true,
                  cell: (e) => <span className="badge">{methods[e.method]}</span>,
                },
                { key: 'note', header: 'Diễn giải / Ghi chú', hideOnPhone: true, cell: (e) => e.note || '—' },
                {
                  key: 'amount',
                  header: 'Số tiền',
                  align: 'right',
                  cell: (e) => {
                    const isMinus = e.kind === 'cash_out' || e.kind === 'refund';
                    return (
                      <strong
                        style={{
                          color: isMinus ? '#dc2626' : '#16a34a',
                          fontSize: '14px',
                        }}
                      >
                        {isMinus ? '− ' : '+ '}
                        {money(e.amount)}
                      </strong>
                    );
                  },
                },
              ]}
              rows={data.entries}
              rowKey={(e) => e.id}
              label="Sổ giao dịch"
              empty="Chưa có giao dịch trong ca"
              emptyText="Tiền đầu ca được ghi riêng, không tính vào doanh thu dịch vụ."
            />
          </div>

          <p className="form-note">
            Sổ này tự động ghi nhận doanh thu từ phiên chơi, F&B, và bán gói hội viên. Tiền mặt đầu ca
            và rút chi tiêu quỹ nội bộ được kiểm soát chặt chẽ với lịch sử đối soát độc lập.
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
