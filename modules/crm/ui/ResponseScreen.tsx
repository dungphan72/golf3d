'use client';
import { useState } from 'react';
import { Chips, DataTable, Loading } from '../../../app/ui/kit';
import { durationText, type ResponseStats } from '../core/response';
import { stamp } from './api';
import { useLoad } from './Screens';

type Group = { name: string } & ResponseStats;
type Data = {
  days: number;
  slaMinutes: number;
  overall: ResponseStats;
  byStaff: Group[];
  byTeam: Group[];
  bySource: Group[];
  waiting: { id: string; fullName: string; source: string; ownedAt: number; ownerName: string }[];
  now: number;
};

const pct = (v: number | null) => (v == null ? '—' : v + '%');

/** How fast leads get their first contact, from the moment they have an owner. */
export function ResponseScreen({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const [days, setDays] = useState('30');
  const { data, error } = useLoad<Data>(`/api/crm2/response?days=${days}`, 60_000);
  if (error && !data)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  const table = (label: string, rows: Group[], first: string) => (
    <DataTable
      label={label}
      rows={rows}
      rowKey={(r) => r.name}
      empty="Chưa có dữ liệu"
      columns={[
        { key: 'n', header: first, cell: (r) => <strong>{r.name}</strong> },
        { key: 'l', header: 'Lead', align: 'right', cell: (r) => r.leads },
        { key: 'r', header: 'Đã liên hệ', align: 'right', cell: (r) => r.responded },
        { key: 'a', header: 'Trung bình', align: 'right', cell: (r) => durationText(r.avgMin) },
        { key: 'm', header: 'Trung vị', align: 'right', cell: (r) => durationText(r.medianMin) },
        { key: 'w', header: 'Giờ làm việc (TB)', align: 'right', cell: (r) => durationText(r.avgWorkMin) },
        { key: 's', header: `Trong ${data.slaMinutes} phút`, align: 'right', cell: (r) => pct(r.withinSlaPct) },
      ]}
    />
  );
  const o = data.overall;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Chips
        value={days}
        onChange={setDays}
        options={[
          { key: '7', label: '7 ngày' },
          { key: '30', label: '30 ngày' },
          { key: '90', label: '90 ngày' },
        ]}
      />
      <div className="crm-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div>
          <span>Lead có người phụ trách</span>
          <strong>{o.leads}</strong>
        </div>
        <div>
          <span>Đã được liên hệ</span>
          <strong>{o.responded}</strong>
        </div>
        <div>
          <span>Thời gian phản hồi TB</span>
          <strong>{durationText(o.avgMin)}</strong>
        </div>
        <div>
          <span>Trung vị</span>
          <strong>{durationText(o.medianMin)}</strong>
        </div>
        <div className={o.withinSlaPct != null && o.withinSlaPct < 80 ? 'late' : ''}>
          <span>Liên hệ trong {data.slaMinutes} phút</span>
          <strong>{pct(o.withinSlaPct)}</strong>
        </div>
      </div>
      <h3>Theo nhân viên</h3>
      {table('Phản hồi theo nhân viên', data.byStaff, 'Nhân viên')}
      <h3>Theo nhóm</h3>
      {table('Phản hồi theo nhóm', data.byTeam, 'Nhóm')}
      <h3>Theo nguồn</h3>
      {table('Phản hồi theo nguồn', data.bySource, 'Nguồn')}
      <h3>Lead đang chờ quá {data.slaMinutes} phút</h3>
      <DataTable
        label="Lead chờ quá hạn"
        rows={data.waiting}
        rowKey={(r) => r.id}
        empty="Không có lead nào đang chờ quá hạn"
        onRowClick={(r) => onOpenLead(r.id)}
        columns={[
          { key: 'n', header: 'Khách', cell: (r) => <strong>{r.fullName}</strong> },
          { key: 'o', header: 'Phụ trách', cell: (r) => r.ownerName || '—' },
          { key: 's', header: 'Nguồn', cell: (r) => r.source || '—' },
          { key: 'a', header: 'Nhận lúc', cell: (r) => stamp(r.ownedAt) },
          { key: 'w', header: 'Đã chờ', align: 'right', cell: (r) => durationText(Math.round((data.now - r.ownedAt) / 60_000)) },
        ]}
      />
    </div>
  );
}
