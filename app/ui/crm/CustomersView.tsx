'use client';
import { useCallback, useEffect, useState } from 'react';
import { Chips, DataTable, FilterBar } from '../kit';
import { money } from '../../../lib/club';
import { SEGMENT_LABELS, type Segment } from '../../../lib/crm';
import { type CustomerRow, day, call } from './shared';
import { CustomerDetail } from './CustomerDetail';

export function CustomersView({ canWork, focus }: { canWork: boolean; focus: string | null }) {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | Segment>('all');
  const [selected, setSelected] = useState<string | null>(focus);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const v = (await call(
        '/api/crm?view=customers&q=' + encodeURIComponent(query),
      )) as unknown as {
        customers: CustomerRow[];
      };
      setRows(v.customers);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [query]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  const shown = (rows ?? []).filter((c) => segment === 'all' || c.segments.includes(segment));
  return (
    <div className="crm-customers">
      <div>
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Tìm theo tên hoặc số điện thoại"
          label="Tìm khách hàng"
        >
          <Chips
            value={segment}
            onChange={(v) => setSegment(v as 'all' | Segment)}
            options={[
              { key: 'all', label: 'Tất cả' },
              ...(Object.keys(SEGMENT_LABELS) as Segment[]).map((k) => ({
                key: k,
                label: SEGMENT_LABELS[k],
              })),
            ]}
          />
        </FilterBar>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {rows && (
          <DataTable
            rows={shown}
            rowKey={(c) => c.id}
            empty="Chưa có khách phù hợp"
            onRowClick={(c) => setSelected(c.id)}
            rowActive={(c) => c.id === selected}
            columns={[
              {
                key: 'name',
                header: 'Khách',
                cell: (c) => (
                  <>
                    <strong>{c.name}</strong>
                    <small>
                      {c.phone}
                      {c.open_tasks > 0 && <b className="crm-dot"> · {c.open_tasks} việc</b>}
                    </small>
                  </>
                ),
              },
              {
                key: 'seg',
                header: 'Nhóm',
                cell: (c) =>
                  c.segments.map((x) => (
                    <span key={x} className={'crm-chip seg-' + x}>
                      {SEGMENT_LABELS[x]}
                    </span>
                  )),
              },
              { key: 'visits', header: 'Lần chơi', cell: (c) => c.visits },
              {
                key: 'last',
                header: 'Gần nhất',
                cell: (c) => (c.last_visit ? day(c.last_visit) : '—'),
              },
              { key: 'spend', header: 'Chi tiêu', align: 'right', cell: (c) => money(c.spend) },
            ]}
          />
        )}
      </div>
      {selected && (
        <CustomerDetail
          id={selected}
          canWork={canWork}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
