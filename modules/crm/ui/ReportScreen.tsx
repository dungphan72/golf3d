'use client';
import { useState } from 'react';
import { Chips, DataTable, FilterBar, Loading } from '../../../app/ui/kit';
import { careRuleName } from '../core/care';
import { STAGES, STAGE_LABELS, type Stage } from '../core/stages';
import { useLoad } from './Screens';

type Report = {
  days: number;
  total: number;
  stages: { stage: string; n: number }[];
  sources: { source: string; leads: number; won: number; lost: number; value: number; paidValue?: number }[];
  lost: { reason: string; n: number }[];
  agents: {
    userId: string | null;
    name: string;
    leads: number;
    responded: number;
    won: number;
    value: number;
    paidValue?: number;
    avgMin: number | null;
  }[];
  care: { rule: string; total: number; done: number; skipped: number }[];
  actualPaidTotal?: number;
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '0%');
const minutes = (m: number | null) =>
  m == null
    ? '—'
    : m < 1
      ? 'dưới 1 phút'
      : m < 90
        ? Math.round(m) + ' phút'
        : Math.round(m / 60) + ' giờ';

/** Consulting and care report for managers: how many leads came, from where, who closed them, how fast. */
export function ReportScreen() {
  const [days, setDays] = useState('30');
  const { data: r, error } = useLoad<Report>(`/api/crm2/report?days=${days}`);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!r) return <Loading />;
  const count = (st: string) => r.stages.find((x) => x.stage === st)?.n ?? 0;
  const won = count('WON');
  const reached = r.total - count('NEW');
  return (
    <>
      <FilterBar>
        <Chips
          value={days}
          onChange={setDays}
          options={[
            { key: '7', label: '7 ngày' },
            { key: '30', label: '30 ngày' },
            { key: '90', label: '90 ngày' },
          ]}
        />
      </FilterBar>
      <div className="crm-kpis">
        {[
          ['Lead nhận được', String(r.total)],
          ['Đã liên hệ được', pct(reached, r.total)],
          ['Chốt dịch vụ', String(won)],
          ['Tỷ lệ chốt', pct(won, r.total)],
          ['Doanh thu thực thu', (r.actualPaidTotal || 0).toLocaleString('vi-VN') + 'đ'],
        ].map(([label, v]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div className="crm-section-card">
          <header>
            <h3>Phễu tư vấn</h3>
            <small className="muted">Tỷ lệ chuyển đổi tổng thể</small>
          </header>
          <DataTable
            columns={[
              { key: 'stage', header: 'Giai đoạn', cell: (st: Stage) => STAGE_LABELS[st] },
              { key: 'n', header: 'Số lead', cell: (st) => count(st) },
              { key: 'pct', header: 'Tỷ lệ', cell: (st) => pct(count(st), r.total) },
            ]}
            rows={[...STAGES]}
            rowKey={(st) => st}
            empty="Chưa có lead"
          />
        </div>

        <div className="crm-section-card">
          <header>
            <h3>Hiệu quả theo nguồn</h3>
            <small className="muted">Chi tiết các kênh tiếp thị</small>
          </header>
          <DataTable
            columns={[
              {
                key: 'source',
                header: 'Nguồn',
                cell: (x: Report['sources'][number]) => x.source || '—',
              },
              { key: 'leads', header: 'Lead', cell: (x) => x.leads },
              { key: 'won', header: 'Chốt', cell: (x) => x.won },
              { key: 'rate', header: 'Tỷ lệ chốt', cell: (x) => pct(x.won, x.leads) },
              {
                key: 'value',
                header: 'Giá trị chốt',
                cell: (x) => x.value.toLocaleString('vi-VN') + 'đ',
              },
              {
                key: 'paid',
                header: 'Thực thu',
                cell: (x) => (x.paidValue || 0).toLocaleString('vi-VN') + 'đ',
              },
            ]}
            rows={r.sources}
            rowKey={(x) => x.source}
            empty="Chưa có lead theo nguồn trong kỳ này"
          />
        </div>
      </div>

      <div className="crm-section-card">
        <header>
          <h3>Theo nhân viên</h3>
          <small className="muted">Tốc độ phản hồi & doanh thu từng tư vấn viên</small>
        </header>
        <DataTable
          columns={[
            { key: 'name', header: 'Nhân viên', cell: (x: Report['agents'][number]) => x.name },
            { key: 'leads', header: 'Lead', cell: (x) => x.leads },
            {
              key: 'responded',
              header: 'Đã liên hệ',
              cell: (x) => `${x.responded} (${pct(x.responded, x.leads)})`,
            },
            { key: 'avg', header: 'Phản hồi đầu tiên (TB)', cell: (x) => minutes(x.avgMin) },
            { key: 'won', header: 'Chốt', cell: (x) => x.won },
            {
              key: 'value',
              header: 'Giá trị chốt',
              cell: (x) => x.value.toLocaleString('vi-VN') + 'đ',
            },
            {
              key: 'paid',
              header: 'Thực thu',
              cell: (x) => (x.paidValue || 0).toLocaleString('vi-VN') + 'đ',
            },
          ]}
          rows={r.agents}
          rowKey={(x) => x.userId ?? 'pool'}
          empty="Chưa có lead trong kỳ này"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div className="crm-section-card">
          <header>
            <h3>Việc chăm sóc khách</h3>
            <small className="muted">Tiến độ thực hiện các kịch bản tự động</small>
          </header>
          <DataTable
            columns={[
              {
                key: 'rule',
                header: 'Loại việc',
                cell: (x: Report['care'][number]) => careRuleName(x.rule),
              },
              { key: 'total', header: 'Đã tạo', cell: (x) => x.total },
              { key: 'done', header: 'Đã liên hệ', cell: (x) => `${x.done} (${pct(x.done, x.total)})` },
              { key: 'skipped', header: 'Bỏ qua', cell: (x) => x.skipped },
              { key: 'open', header: 'Còn mở', cell: (x) => x.total - x.done - x.skipped },
            ]}
            rows={r.care}
            rowKey={(x) => x.rule}
            empty="Chưa có việc chăm sóc trong kỳ này"
          />
        </div>

        <div className="crm-section-card">
          <header>
            <h3>Lý do thất bại</h3>
            <small className="muted">Phân tích nguyên nhân không chốt được đơn</small>
          </header>
          <DataTable
            columns={[
              { key: 'reason', header: 'Lý do', cell: (x: Report['lost'][number]) => x.reason },
              { key: 'n', header: 'Số lead', cell: (x) => x.n },
            ]}
            rows={r.lost}
            rowKey={(x) => x.reason}
            empty="Chưa có lead thất bại kèm lý do"
          />
        </div>
      </div>
    </>
  );
}
