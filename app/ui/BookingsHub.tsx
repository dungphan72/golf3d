'use client';
import { useState } from 'react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, date, type Data } from './shared';
import { BookingTable } from './widgets';
import { Chips, DataTable, FilterBar, PageTabs } from './kit';
import { OnlineRequests } from './OnlineRequests';
import { BellSettings } from './BellAlerts';

export const HUB_VIEWS = ['bookings', 'online'] as const;

/** "Lịch đặt": the booking list and online requests as tabs of one page. */
export function BookingsHub({
  view,
  onView,
  data,
  canOnline,
  onSelect,
  onChanged,
}: {
  view: string;
  onView: (v: string) => void;
  data: Data;
  canOnline: boolean;
  onSelect: (b: Booking) => void;
  onChanged: () => void;
}) {
  return (
    <>
      <PageTabs
        value={view}
        onChange={onView}
        tabs={[
          { key: 'bookings', label: 'Lịch đặt' },
          {
            key: 'online',
            label: 'Đặt online',
            count: data.onlinePending ?? 0,
            hidden: !canOnline,
          },
        ]}
      />
      {view === 'bookings' && <BookingList bookings={data.bookings} onSelect={onSelect} />}
      {view === 'online' && canOnline && <OnlineRequests onChanged={onChanged} />}
    </>
  );
}

const STATUS_GROUPS: Record<string, string[]> = {
  upcoming: ['booked'],
  playing: ['playing', 'paused'],
  unpaid: ['finished'],
  paid: ['paid'],
  cancelled: ['cancelled'],
};

function BookingList({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const count = (k: string) => bookings.filter((b) => STATUS_GROUPS[k].includes(b.status)).length;
  const t = search.trim().toLowerCase();
  const rows = bookings
    .filter((b) => filter === 'all' || STATUS_GROUPS[filter].includes(b.status))
    .filter((b) => !t || `${b.customer} ${b.phone}`.toLowerCase().includes(t))
    .sort((a, b) => (filter === 'upcoming' ? a.start - b.start : b.start - a.start));
  return (
    <>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Tìm tên, điện thoại…"
        label="Tìm lịch đặt"
      >
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Tất cả', count: bookings.length },
            { key: 'upcoming', label: 'Sắp tới', count: count('upcoming') },
            { key: 'playing', label: 'Đang chơi', count: count('playing') },
            { key: 'unpaid', label: 'Chờ thanh toán', count: count('unpaid') },
            { key: 'paid', label: 'Đã thanh toán', count: count('paid') },
            { key: 'cancelled', label: 'Đã hủy', count: count('cancelled') },
          ]}
        />
      </FilterBar>
      <BookingTable bookings={rows} onSelect={onSelect} empty="Không có lượt đặt phù hợp" />
    </>
  );
}

/** Invoices: finished and paid sessions, with what is still to collect. */
export function InvoiceList({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('unpaid');
  const all = bookings.filter((b) => ['finished', 'paid'].includes(b.status));
  const unpaid = all.filter((b) => b.status === 'finished');
  const owed = unpaid.reduce((n, b) => n + (b.amount ?? 0), 0);
  const t = search.trim().toLowerCase();
  const rows = all
    .filter((b) => filter === 'all' || (filter === 'unpaid') === (b.status === 'finished'))
    .filter((b) => !t || `${b.customer} ${b.phone}`.toLowerCase().includes(t))
    .sort((a, b) => b.start - a.start);
  return (
    <>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Tìm tên, điện thoại…"
        label="Tìm hóa đơn"
        right={
          unpaid.length > 0 && (
            <span>
              Chờ thu:{' '}
              <strong>
                {unpaid.length} phiếu · {money(owed)}
              </strong>
            </span>
          )
        }
      >
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'unpaid', label: 'Chờ thu', count: unpaid.length },
            { key: 'paid', label: 'Đã thu', count: all.length - unpaid.length },
            { key: 'all', label: 'Tất cả', count: all.length },
          ]}
        />
      </FilterBar>
      <BookingTable
        bookings={rows}
        onSelect={onSelect}
        empty={filter === 'unpaid' ? 'Không có phiếu nào chờ thu' : 'Chưa có hóa đơn'}
      />
    </>
  );
}

/** "Chuông gọi": guest bell rings and support requests from running sessions. */
export function SupportList({
  data,
  busy,
  onMutate,
}: {
  data: Data;
  busy: boolean;
  onMutate: (v: Record<string, unknown>) => Promise<boolean>;
}) {
  const [filter, setFilter] = useState('open');
  const open = data.requests.filter((r) => r.status !== 'done');
  const rows = filter === 'open' ? open : data.requests;
  const waiting = data.requests.filter((r) => r.status === 'new').length;
  return (
    <>
      <p className={'bell-summary' + (waiting ? ' ringing' : '')} role="status">
        {waiting
          ? `${waiting} yêu cầu đang chờ nhân viên tiếp nhận`
          : 'Chưa có khách gọi. Yêu cầu mới sẽ hiện ở đây kèm âm chuông.'}
      </p>
      <BellSettings />
      <FilterBar>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'open', label: 'Đang chờ', count: open.length },
            { key: 'all', label: 'Tất cả', count: data.requests.length },
          ]}
        />
      </FilterBar>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="Mọi yêu cầu đã được chăm sóc"
        emptyText="Yêu cầu hỗ trợ từ phiên chơi sẽ xuất hiện tại đây."
        columns={[
          { key: 'kind', header: 'Yêu cầu', cell: (r) => <strong>{r.kind}</strong> },
          {
            key: 'who',
            header: 'Line · khách',
            cell: (r) => {
              const b = data.bookings.find((x) => x.id === r.booking);
              return (
                <>
                  {rooms.find((x) => x.id === b?.room)?.name}
                  <small>{b?.customer}</small>
                </>
              );
            },
          },
          {
            key: 'when',
            header: 'Lúc',
            cell: (r) => (
              <>
                {date(r.created)} · {time(r.created)}
              </>
            ),
          },
          {
            key: 'status',
            header: 'Trạng thái',
            cell: (r) => (
              <span className={'badge ' + r.status}>
                {r.status === 'new'
                  ? 'Chờ tiếp nhận'
                  : r.status === 'received'
                    ? 'Đang xử lý'
                    : 'Hoàn thành'}
              </span>
            ),
          },
          {
            key: 'act',
            header: '',
            cell: (r) =>
              r.status !== 'done' && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    onMutate({
                      action: 'request-update',
                      id: r.id,
                      status: r.status === 'new' ? 'received' : 'done',
                    })
                  }
                >
                  {r.status === 'new' ? 'Tiếp nhận' : 'Hoàn thành'}
                </button>
              ),
          },
        ]}
      />
    </>
  );
}
