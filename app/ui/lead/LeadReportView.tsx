'use client';
import { useEffect, useState } from 'react';
import { Chips, DataTable, FilterBar } from '../kit';
import { STAGES, STAGE_LABELS, SOURCE_LABELS, type LeadSource } from '../../../lib/leads';
import { call } from './shared';

type Report = {
  days: number;
  total: number;
  stages: { stage: string; n: number }[];
  sources: { source: string; leads: number; won: number; lost: number; value: number }[];
  lost: { reason: string; n: number }[];
  agents: {
    user_id: string | null;
    name: string;
    leads: number;
    called: number;
    won: number;
    value: number;
    avg_ms: number | null;
  }[];
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '0%');
const minutes = (ms: number | null) =>
  ms == null
    ? '—'
    : ms < 60_000
      ? Math.round(ms / 1000) + ' giây'
      : Math.round(ms / 60_000) + ' phút';

export function LeadReportView() {
  const [days, setDays] = useState('30');
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    call('/api/crm/leads?report=' + days)
      .then((v) => {
        if (live) {
          setR(v as unknown as Report);
          setError('');
        }
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [days]);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!r) return <p>Đang tải…</p>;
  const count = (st: string) => r.stages.find((x) => x.stage === st)?.n ?? 0;
  const won = count('won');
  const reached = r.total - count('new');
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
        ].map(([label, v]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <h3>Phễu tư vấn</h3>
      <DataTable
        columns={[
          {
            key: 'stage',
            header: 'Giai đoạn',
            cell: (st: (typeof STAGES)[number]) => STAGE_LABELS[st],
          },
          { key: 'n', header: 'Số lead', cell: (st) => count(st) },
          { key: 'pct', header: 'Tỷ lệ', cell: (st) => pct(count(st), r.total) },
        ]}
        rows={[...STAGES]}
        rowKey={(st) => st}
        empty="Chưa có lead"
      />
      <h3>Hiệu quả theo nguồn</h3>
      <DataTable
        columns={[
          {
            key: 'source',
            header: 'Nguồn',
            cell: (x: (typeof r.sources)[number]) =>
              SOURCE_LABELS[x.source as LeadSource] ?? x.source,
          },
          { key: 'leads', header: 'Lead', cell: (x) => x.leads },
          { key: 'won', header: 'Chốt', cell: (x) => x.won },
          { key: 'rate', header: 'Tỷ lệ chốt', cell: (x) => pct(x.won, x.leads) },
          {
            key: 'value',
            header: 'Giá trị chốt',
            cell: (x) => x.value.toLocaleString('vi-VN') + 'đ',
          },
        ]}
        rows={r.sources}
        rowKey={(x) => x.source}
        empty="Chưa có lead theo nguồn trong kỳ này"
      />
      <h3>Theo nhân viên và tốc độ phản hồi</h3>
      <DataTable
        columns={[
          { key: 'name', header: 'Nhân viên', cell: (x: (typeof r.agents)[number]) => x.name },
          { key: 'leads', header: 'Lead', cell: (x) => x.leads },
          { key: 'called', header: 'Đã gọi', cell: (x) => x.called },
          { key: 'won', header: 'Chốt', cell: (x) => x.won },
          { key: 'avg', header: 'Phản hồi trung bình', cell: (x) => minutes(x.avg_ms) },
          {
            key: 'value',
            header: 'Giá trị chốt',
            cell: (x) => x.value.toLocaleString('vi-VN') + 'đ',
          },
        ]}
        rows={r.agents}
        rowKey={(x) => x.user_id ?? 'none'}
        empty="Chưa có lead được giao trong kỳ này"
      />
      <h3>Lý do không thành</h3>
      <DataTable
        columns={[
          { key: 'reason', header: 'Lý do', cell: (x: (typeof r.lost)[number]) => x.reason },
          { key: 'n', header: 'Số lead', cell: (x) => x.n },
        ]}
        rows={r.lost}
        rowKey={(x) => x.reason}
        empty="Chưa có lead không thành trong kỳ này."
      />
    </>
  );
}
