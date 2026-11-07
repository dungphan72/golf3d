'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, Calendar, DollarSign, ArrowUpRight, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { money } from '../../lib/club';
import { toCsv } from '../../lib/csv';
import { DataTable } from './kit';

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

const SERVICE: Record<string, string> = { gdr: 'Tập kỹ thuật (GDR)', '9': 'Chơi 9 hố', '18': 'Chơi 18 hố' };
const vnDate = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
const shortDay = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

/** Revenue overview from the immutable ledger; read-only. */
export function ReportsPanel() {
  const [to, setTo] = useState(() => vnDate(Date.now()));
  const [from, setFrom] = useState(() => vnDate(Date.now() - 29 * 86_400_000));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch(`/api/reports?from=${from}&to=${to}`, { cache: 'no-store' })
      .then(async (r) => {
        const v = (await r.json()) as Report & { error?: string };
        if (!r.ok) throw new Error(v.error || 'Không tải được báo cáo');
        setError('');
        setReport(v);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const range = (days: number) => {
    setTo(vnDate(Date.now()));
    setFrom(vnDate(Date.now() - (days - 1) * 86_400_000));
  };
  const monthStart = () => {
    setTo(vnDate(Date.now()));
    setFrom(vnDate(Date.now()).slice(0, 8) + '01');
  };

  return (
    <section className="ds-reports operate-reports">
      {/* Top Filter and Actions Ribbon */}
      <div className="operate-filterbar">
        <div className="operate-filter-left">
          <div className="operate-cat-pills" role="group" aria-label="Khoảng nhanh">
            <button type="button" className="operate-pill" onClick={() => range(7)}>
              7 ngày
            </button>
            <button type="button" className="operate-pill" onClick={() => range(30)}>
              30 ngày
            </button>
            <button type="button" className="operate-pill" onClick={monthStart}>
              Từ đầu tháng
            </button>
          </div>
          <div className="operate-date-range-wrap">
            <label className="operate-date-label">
              Từ
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="operate-input-sm"
              />
            </label>
            <label className="operate-date-label">
              Đến
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="operate-input-sm"
              />
            </label>
          </div>
        </div>
        <div className="operate-filter-right">
          <button
            type="button"
            className="secondary operate-btn"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={15} /> Tải lại
          </button>
          <button
            aria-label="Tải file CSV"
            type="button"
            className="primary operate-btn"
            disabled={!report}
            onClick={download}
          >
            <Download size={15} /> Tải file CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      {/* Modern KPI Tiles Ribbon */}
      <div className="operate-ribbon ds-tiles">
        <div className="operate-kpi-card highlight ds-tile ds-tile-main">
          <div className="operate-kpi-label ds-tile-text">
            <small>Tổng thu</small>
          </div>
          <div className="operate-kpi-val text-green">
            <strong>{money(received)}</strong>
          </div>
          <div className="operate-kpi-sub">
            <small>{totals.payments} lượt thanh toán</small>
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Tiền mặt</div>
          <div className="operate-kpi-val">{money(totals.cash)}</div>
          <div className="operate-kpi-sub">
            {received > 0 ? Math.round((totals.cash / received) * 100) : 0}% tổng thu
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Chuyển khoản (VietQR/SePay)</div>
          <div className="operate-kpi-val text-blue">{money(totals.transfer)}</div>
          <div className="operate-kpi-sub">
            {received > 0 ? Math.round((totals.transfer / received) * 100) : 0}% tổng thu
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Quẹt thẻ POS</div>
          <div className="operate-kpi-val">{money(totals.card)}</div>
          <div className="operate-kpi-sub">
            {received > 0 ? Math.round((totals.card / received) * 100) : 0}% tổng thu
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Doanh thu bán gói hội viên</div>
          <div className="operate-kpi-val" style={{ color: '#7c3aed' }}>
            {money(totals.packages)}
          </div>
          <div className="operate-kpi-sub">Gói giờ, gói hố</div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Tổng chi tiền mặt quỹ</div>
          <div className="operate-kpi-val text-red">−{money(totals.expenses)}</div>
          <div className="operate-kpi-sub">Chi mua đồ, phí vận hành</div>
        </div>
      </div>

      {/* Revenue Trend Visual Bar Chart */}
      <div className="operate-chart-container">
        <div className="chart-header">
          <h2 className="chart-title">
            <BarChart3 size={18} /> Biểu đồ doanh thu thực nhận theo ngày
          </h2>
          <span className="chart-subtitle">Đỉnh cao nhất: {money(peak)}/ngày</span>
        </div>
        <div role="img" aria-label="Biểu đồ doanh thu theo ngày" className="operate-bar-chart">
          {chart.map((d) => {
            const dayTotal = d.cash + d.transfer + d.card;
            const pct = Math.max(3, (dayTotal / peak) * 100);
            return (
              <div key={d.day} className="chart-col" title={`${d.day}: ${money(dayTotal)}`}>
                <div className="chart-bar-wrap">
                  <div className="chart-bar-fill" style={{ height: `${pct}%` }}>
                    <span className="chart-tooltip">{money(dayTotal)}</span>
                  </div>
                </div>
                <span className="chart-col-label">{shortDay(d.day)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="operate-table-section">
        <h2 className="ds-subhead" style={{ marginBottom: '12px' }}>
          Doanh thu theo ngày
        </h2>
        {report && (
          <DataTable
            rows={report.days}
            rowKey={(d) => d.day}
            empty="Chưa có giao dịch trong khoảng này"
            columns={[
              { key: 'day', header: 'Ngày', cell: (d) => <strong>{shortDay(d.day)}</strong> },
              { key: 'cash', header: 'Tiền mặt', align: 'right', cell: (d) => money(d.cash) },
              {
                key: 'transfer',
                header: 'Chuyển khoản',
                align: 'right',
                cell: (d) => money(d.transfer),
              },
              { key: 'card', header: 'Thẻ', align: 'right', cell: (d) => money(d.card) },
              {
                key: 'total',
                header: 'Tổng thu thực',
                align: 'right',
                cell: (d) => (
                  <strong style={{ color: '#16a34a', fontSize: '13.5px' }}>
                    {money(d.cash + d.transfer + d.card)}
                  </strong>
                ),
              },
              {
                key: 'pk',
                header: 'Bán gói',
                align: 'right',
                cell: (d) => (d.packages > 0 ? money(d.packages) : '—'),
              },
              {
                key: 'ex',
                header: 'Chi quỹ',
                align: 'right',
                cell: (d) => (d.expenses > 0 ? <span className="text-red">−{money(d.expenses)}</span> : '—'),
              },
            ]}
          />
        )}
      </div>

      {/* Service & FNB Performance */}
      <div className="operate-table-section">
        <h2 className="ds-subhead" style={{ marginTop: '20px', marginBottom: '12px' }}>
          Hiệu quả theo loại dịch vụ & F&B (phiếu đã hoàn tất)
        </h2>
        {report && (
          <DataTable
            rows={report.services}
            rowKey={(x) => x.service}
            empty="Chưa có phiếu thanh toán"
            columns={[
              {
                key: 's',
                header: 'Dịch vụ golf',
                cell: (x) => <strong>{SERVICE[x.service] ?? x.service}</strong>,
              },
              {
                key: 'n',
                header: 'Số lượt chơi',
                align: 'right',
                cell: (x) => <span className="badge">{x.rounds} lượt</span>,
              },
              {
                key: 'r',
                header: 'Doanh thu giờ chơi',
                align: 'right',
                cell: (x) => <strong>{money(x.revenue)}</strong>,
              },
              {
                key: 'f',
                header: 'Doanh thu F&B đi kèm',
                align: 'right',
                cell: (x) => (x.food > 0 ? money(x.food) : '—'),
              },
            ]}
          />
        )}
      </div>

      <p className="ds-note">
        * Doanh thu phiếu gồm cả phần đã cấn trừ bằng gói thành viên trả trước (không phát sinh tiền
        mặt tại quầy); tổng thực thu chỉ tính dòng tiền thực nhận ghi nhận trong sổ ca làm việc.
      </p>
    </section>
  );
}
