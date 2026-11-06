'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { money } from '../../lib/club';
import { toCsv } from '../../lib/csv';
import { DataTable, FilterBar } from './kit';

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

const SERVICE: Record<string, string> = { gdr: 'Luyện tập', '9': '9 hố', '18': '18 hố' };
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

  const range = (days: number) => {
    setTo(vnDate(Date.now()));
    setFrom(vnDate(Date.now() - (days - 1) * 86_400_000));
  };
  const monthStart = () => {
    setTo(vnDate(Date.now()));
    setFrom(vnDate(Date.now()).slice(0, 8) + '01');
  };
  const tiles: [string, number, string?][] = [
    ['Tiền mặt', totals.cash],
    ['Chuyển khoản', totals.transfer],
    ['Thẻ', totals.card],
    ['Trong đó bán gói', totals.packages],
    ['Chi tiền mặt', totals.expenses],
  ];

  return (
    <section className="ds-reports">
      <FilterBar
        right={
          <button
            aria-label="Tải file CSV"
            type="button"
            className="secondary"
            disabled={!report}
            onClick={download}
          >
            <Download size={16} /> Tải file CSV
          </button>
        }
      >
        <div className="ds-seg" role="group" aria-label="Khoảng nhanh">
          <button onClick={() => range(7)}>7 ngày</button>
          <button onClick={() => range(30)}>30 ngày</button>
          <button onClick={monthStart}>Tháng này</button>
        </div>
        <label className="ds-date">
          Từ ngày
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="ds-date">
          Đến ngày
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </FilterBar>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="ds-tiles">
        <article className="ds-tile ds-tile-main">
          <span className="ds-tile-text">
            <small>Tổng thu</small>
            <strong>{money(received)}</strong>
            <small>{totals.payments} lượt thanh toán</small>
          </span>
        </article>
        {tiles.map(([label, value]) => (
          <article className="ds-tile" key={label}>
            <span className="ds-tile-text">
              <small>{label}</small>
              <strong>{money(value)}</strong>
            </span>
          </article>
        ))}
      </div>

      <h2 className="ds-subhead">Doanh thu theo ngày</h2>
      <div role="img" aria-label="Biểu đồ doanh thu theo ngày" className="ds-chart">
        {chart.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${money(d.cash + d.transfer + d.card)}`}
            style={{
              height: `${Math.max(2, ((d.cash + d.transfer + d.card) / peak) * 100)}%`,
            }}
          />
        ))}
      </div>
      {report && (
        <DataTable
          rows={report.days}
          rowKey={(d) => d.day}
          empty="Chưa có giao dịch trong khoảng này"
          columns={[
            { key: 'day', header: 'Ngày', cell: (d) => shortDay(d.day) },
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
              header: 'Tổng thu',
              align: 'right',
              cell: (d) => <strong>{money(d.cash + d.transfer + d.card)}</strong>,
            },
            { key: 'pk', header: 'Bán gói', align: 'right', cell: (d) => money(d.packages) },
            { key: 'ex', header: 'Chi', align: 'right', cell: (d) => money(d.expenses) },
          ]}
        />
      )}

      <h2 className="ds-subhead">Theo dịch vụ (phiếu đã thanh toán)</h2>
      {report && (
        <DataTable
          rows={report.services}
          rowKey={(x) => x.service}
          empty="Chưa có phiếu thanh toán"
          columns={[
            { key: 's', header: 'Dịch vụ', cell: (x) => SERVICE[x.service] ?? x.service },
            { key: 'n', header: 'Số lượt', align: 'right', cell: (x) => x.rounds },
            { key: 'r', header: 'Doanh thu phiếu', align: 'right', cell: (x) => money(x.revenue) },
            { key: 'f', header: 'Trong đó F&B', align: 'right', cell: (x) => money(x.food) },
          ]}
        />
      )}
      <p className="ds-note">
        Doanh thu phiếu gồm cả phần đã trừ bằng lượt gói (không thu tiền); tổng thu chỉ tính tiền
        thực nhận trong sổ ca.
      </p>
    </section>
  );
}
