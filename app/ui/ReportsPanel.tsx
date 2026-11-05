'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { money } from '../../lib/club';
import { toCsv } from '../../lib/csv';

type Day = {
  day: string;
  cash: number;
  transfer: number;
  card: number;
  packages: number;
  expenses: number;
  payments: number;
};
type Service = { service: string; rounds: number; revenue: number; food: number };
type Report = { days: Day[]; services: Service[] };

const SERVICE: Record<string, string> = { gdr: 'Luyện tập GDR', '9': '9 hố', '18': '18 hố' };
const vnDate = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
const shortDay = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

/** Revenue overview from the immutable ledger; read-only. */
export function ReportsPanel() {
  const [to, setTo] = useState(() => vnDate(Date.now()));
  const [from, setFrom] = useState(() => vnDate(Date.now() - 29 * 86_400_000));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`/api/reports?from=${from}&to=${to}`, { cache: 'no-store' })
      .then(async (r) => {
        const v = (await r.json()) as Report & { error?: string };
        if (!live) return;
        if (!r.ok) throw new Error(v.error || 'Không tải được báo cáo');
        setError('');
        setReport(v);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [from, to]);

  const totals = useMemo(() => {
    const t = { cash: 0, transfer: 0, card: 0, packages: 0, expenses: 0, payments: 0 };
    for (const d of report?.days ?? []) {
      t.cash += d.cash;
      t.transfer += d.transfer;
      t.card += d.card;
      t.packages += d.packages;
      t.expenses += d.expenses;
      t.payments += d.payments;
    }
    return t;
  }, [report]);
  const received = totals.cash + totals.transfer + totals.card;
  const peak = Math.max(1, ...(report?.days ?? []).map((d) => d.cash + d.transfer + d.card));
  function download() {
    if (!report) return;
    const rows: (string | number)[][] = [
      [
        'Ngày',
        'Tiền mặt',
        'Chuyển khoản',
        'Thẻ',
        'Tổng thu',
        'Bán gói',
        'Chi tiền mặt',
        'Lượt thanh toán',
      ],
      ...report.days.map((d) => [
        d.day,
        d.cash,
        d.transfer,
        d.card,
        d.cash + d.transfer + d.card,
        d.packages,
        d.expenses,
        d.payments,
      ]),
      [],
      ['Dịch vụ', 'Số lượt', 'Doanh thu phiếu', 'F&B'],
      ...report.services.map((s) => [SERVICE[s.service] ?? s.service, s.rounds, s.revenue, s.food]),
    ];
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-doanh-thu_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const chart = [...(report?.days ?? [])].reverse();

  return (
    <section className="members-panel">
      <div className="form-grid">
        <label>
          Từ ngày
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          data-tip="Tải file CSV"
          aria-label="Tải file CSV"
          type="button"
          className="secondary icon-only"
          disabled={!report}
          onClick={download}
        >
          <Download size={16} />
          <span className="btn-label">Tải file CSV</span>
        </button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <table>
        <tbody>
          <tr>
            <th>Tổng thu</th>
            <td>
              <strong>{money(received)}</strong> ({totals.payments} lượt thanh toán)
            </td>
          </tr>
          <tr>
            <th>Tiền mặt · Chuyển khoản · Thẻ</th>
            <td>
              {money(totals.cash)} · {money(totals.transfer)} · {money(totals.card)}
            </td>
          </tr>
          <tr>
            <th>Trong đó bán gói hội viên</th>
            <td>{money(totals.packages)}</td>
          </tr>
          <tr>
            <th>Chi tiền mặt</th>
            <td>{money(totals.expenses)}</td>
          </tr>
        </tbody>
      </table>

      <h2>Doanh thu theo ngày</h2>
      <div
        role="img"
        aria-label="Biểu đồ doanh thu theo ngày"
        style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, overflowX: 'auto' }}
      >
        {chart.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${money(d.cash + d.transfer + d.card)}`}
            style={{
              flex: '1 0 10px',
              minWidth: 10,
              height: `${Math.max(2, ((d.cash + d.transfer + d.card) / peak) * 100)}%`,
              background: 'var(--brand, #0b4d14)',
              borderRadius: '3px 3px 0 0',
            }}
          />
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Tiền mặt</th>
            <th>Chuyển khoản</th>
            <th>Thẻ</th>
            <th>Tổng thu</th>
            <th>Bán gói</th>
            <th>Chi</th>
          </tr>
        </thead>
        <tbody>
          {report?.days.map((d) => (
            <tr key={d.day}>
              <td>{shortDay(d.day)}</td>
              <td>{money(d.cash)}</td>
              <td>{money(d.transfer)}</td>
              <td>{money(d.card)}</td>
              <td>
                <strong>{money(d.cash + d.transfer + d.card)}</strong>
              </td>
              <td>{money(d.packages)}</td>
              <td>{money(d.expenses)}</td>
            </tr>
          ))}
          {report && !report.days.length && (
            <tr>
              <td colSpan={7}>Chưa có giao dịch trong khoảng này</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Theo dịch vụ (phiếu đã thanh toán)</h2>
      <table>
        <thead>
          <tr>
            <th>Dịch vụ</th>
            <th>Số lượt</th>
            <th>Doanh thu phiếu</th>
            <th>Trong đó F&amp;B</th>
          </tr>
        </thead>
        <tbody>
          {report?.services.map((s) => (
            <tr key={s.service}>
              <td>{SERVICE[s.service] ?? s.service}</td>
              <td>{s.rounds}</td>
              <td>{money(s.revenue)}</td>
              <td>{money(s.food)}</td>
            </tr>
          ))}
          {report && !report.services.length && (
            <tr>
              <td colSpan={4}>Chưa có phiếu thanh toán</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="form-note">
        Doanh thu phiếu gồm cả phần đã trừ bằng lượt gói (không thu tiền); tổng thu chỉ tính tiền
        thực nhận trong sổ ca.
      </p>
    </section>
  );
}
