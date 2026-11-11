'use client';
import { useState } from 'react';
import { DataTable, Loading } from '../../../app/ui/kit';
import { call, dateOnly, errText } from './api';
import { useLoad } from './Screens';

type Row = { phone: string; reason: string; created: number; addedBy: string };

/** Numbers that never become leads (spam, competitors, staff test numbers). */
export function BlockedScreen() {
  const { data, error, reload } = useLoad<{ rows: Row[] }>('/api/crm2/blocked');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const act = async (body: Record<string, unknown>) => {
    setMsg('');
    try {
      await call('/api/crm2/blocked', body);
      if (body.action === 'add') {
        setPhone('');
        setReason('');
      }
      reload();
    } catch (e) {
      setMsg(errText(e));
    }
  };
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
        Form và webhook gửi số trong danh sách này sẽ bị bỏ qua mà người gửi không biết. Dùng cho số rác, đối thủ, số thử
        của nhân viên.
      </p>
      <form
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          void act({ action: 'add', phone, reason });
        }}
      >
        <input aria-label="Số cần chặn" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input aria-label="Lý do chặn" placeholder="Lý do (không bắt buộc)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit">Chặn số</button>
      </form>
      {msg && (
        <div className="error-box" role="alert">
          {msg}
        </div>
      )}
      <DataTable
        label="Số bị chặn"
        rows={data.rows}
        rowKey={(r) => r.phone}
        empty="Chưa chặn số nào"
        columns={[
          { key: 'p', header: 'Số điện thoại', cell: (r) => <strong>{r.phone}</strong> },
          { key: 'r', header: 'Lý do', cell: (r) => r.reason || '—' },
          { key: 'b', header: 'Người chặn', cell: (r) => r.addedBy || '—' },
          { key: 'c', header: 'Ngày', cell: (r) => dateOnly(r.created) },
          {
            key: 'x',
            header: '',
            cell: (r) => (
              <button className="secondary" onClick={() => void act({ action: 'remove', phone: r.phone })}>
                Bỏ chặn
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
