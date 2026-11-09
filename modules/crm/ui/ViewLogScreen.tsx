'use client';
import { useState } from 'react';
import { Chips, DataTable, FilterBar, Loading } from '../../../app/ui/kit';
import { stamp } from './api';
import { useLoad } from './Screens';

type Log = {
  days: number;
  rows: { id: string; userId: string; userName: string; leadId: string; leadName: string; created: number }[];
  perUser: { userId: string; userName: string; views: number; leads: number }[];
};

/** Who opened which customer's phone number (staff other than managers), to trace a data leak. */
export function ViewLogScreen({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const [days, setDays] = useState('7');
  const [user, setUser] = useState('');
  const { data, error } = useLoad<Log>(`/api/crm2/view-log?days=${days}${user ? '&user=' + encodeURIComponent(user) : ''}`);
  if (error)
    return (
      <div className="error-box" role="alert">
        {error}
      </div>
    );
  if (!data) return <Loading />;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <p className="muted" style={{ margin: 0 }}>
        Ghi lại mỗi lần nhân viên (không phải quản lý) mở hồ sơ lead và thấy đủ số điện thoại, tối đa một lần cho mỗi người
        và lead trong 10 phút. Lead trong kho số chưa nhận chỉ hiện số đã che nên không ghi.
      </p>
      <FilterBar>
        <Chips
          value={days}
          onChange={setDays}
          options={[
            { key: '1', label: 'Hôm nay' },
            { key: '7', label: '7 ngày' },
            { key: '30', label: '30 ngày' },
          ]}
        />
        {user && (
          <button className="secondary" onClick={() => setUser('')}>
            Bỏ lọc nhân viên
          </button>
        )}
      </FilterBar>
      <h3>Theo nhân viên</h3>
      <DataTable
        label="Lượt xem theo nhân viên"
        rows={data.perUser}
        rowKey={(r) => r.userId}
        empty="Chưa có lượt xem nào"
        onRowClick={(r) => setUser(r.userId)}
        columns={[
          { key: 'u', header: 'Nhân viên', cell: (r) => <strong>{r.userName}</strong> },
          { key: 'v', header: 'Lượt xem', align: 'right', cell: (r) => r.views },
          { key: 'l', header: 'Số lead khác nhau', align: 'right', cell: (r) => r.leads },
        ]}
      />
      <h3>Chi tiết</h3>
      <DataTable
        label="Chi tiết lượt xem"
        rows={data.rows}
        rowKey={(r) => r.id}
        empty="Không có dữ liệu"
        columns={[
          { key: 't', header: 'Lúc', cell: (r) => stamp(r.created) },
          { key: 'u', header: 'Nhân viên', cell: (r) => r.userName },
          {
            key: 'l',
            header: 'Lead',
            cell: (r) => (
              <button className="link" onClick={() => onOpenLead(r.leadId)}>
                {r.leadName}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
