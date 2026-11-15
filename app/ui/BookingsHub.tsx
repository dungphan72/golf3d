'use client';
import { useState } from 'react';
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Plus,
  ReceiptText,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { rooms, money, type Booking } from '../../lib/club';
import { time, date, type Data } from './shared';
import { BookingTable } from './widgets';
import { DataTable } from './kit';
import { OnlineRequests } from './OnlineRequests';
import { BellSettings } from './BellAlerts';

export const HUB_VIEWS = ['bookings', 'online'] as const;

const STATUS_GROUPS: Record<string, string[]> = {
  upcoming: ['booked'],
  playing: ['playing', 'paused'],
  unpaid: ['finished'],
  paid: ['paid'],
  cancelled: ['cancelled'],
};

/** "Đặt sân & Lịch hẹn": Quản lý toàn diện lịch đặt sân, đặt online và chuông gọi hỗ trợ theo thiết kế mới. */
export function BookingsHub({
  view,
  onView,
  data,
  canOnline,
  onSelect,
  onChanged,
  onNewBooking,
  onMutate,
  busy = false,
}: {
  view: string;
  onView: (v: string) => void;
  data: Data;
  canOnline: boolean;
  onSelect: (b: Booking) => void;
  onChanged: () => void;
  onNewBooking?: () => void;
  onMutate?: (v: Record<string, unknown>) => Promise<boolean>;
  busy?: boolean;
}) {
  const [subTab, setSubTab] = useState<'schedule' | 'online' | 'invoices' | 'support'>(
    view === 'online' ? 'online' : 'schedule',
  );
  const activeTab = view === 'online' ? 'online' : subTab;

  const bookings = data.bookings ?? [];
  const upcomingCount = bookings.filter((b) => STATUS_GROUPS.upcoming.includes(b.status)).length;
  const playingCount = bookings.filter((b) => STATUS_GROUPS.playing.includes(b.status)).length;
  const unpaidBookings = bookings.filter((b) => STATUS_GROUPS.unpaid.includes(b.status));
  const unpaidAmount = unpaidBookings.reduce((s, b) => s + (b.amount ?? 0), 0);
  const openSupportCount = (data.requests ?? []).filter((r) => r.status !== 'done').length;

  function selectTab(next: 'schedule' | 'online' | 'invoices' | 'support') {
    setSubTab(next);
    if (next === 'online') onView('online');
    else if (view === 'online') onView('bookings');
  }

  return (
    <div className="mod-workspace">
      {/* Top Page Header */}
      <div className="mod-page-header">
        <div className="mod-page-title-group">
          <div className="mod-page-icon green">
            <CalendarDays size={22} />
          </div>
          <div>
            <h2>Quản lý Đặt sân & Lịch hẹn</h2>
            <p>Theo dõi lịch đặt Line/Phòng VIP, duyệt yêu cầu đặt sân Online và hỗ trợ tại line</p>
          </div>
        </div>
        <div className="mod-page-actions">
          {canOnline && (
            <button
              type="button"
              className={`mod-btn-outline ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => selectTab('online')}
            >
              <Globe size={16} />
              <span>Đặt sân Online</span>
              {(data.onlinePending ?? 0) > 0 && (
                <span className="mod-badge-pill danger">{data.onlinePending}</span>
              )}
            </button>
          )}
          {onNewBooking && (
            <button type="button" className="mod-btn-primary" onClick={onNewBooking}>
              <Plus size={16} />
              <span>Tạo lịch đặt sân</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="mod-kpi-strip">
        <div className="mod-kpi-card">
          <div className="mod-kpi-icon blue">
            <CalendarClock size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Lịch sắp tới</span>
            <div className="mod-kpi-val-row">
              <strong>{upcomingCount}</strong>
              <span className="mod-kpi-sub">lượt đặt trước</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon green">
            <UserCheck size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Đang chơi trên sân</span>
            <div className="mod-kpi-val-row">
              <strong className="text-green">{playingCount}</strong>
              <span className="mod-kpi-sub">/ {rooms.length} line hoạt động</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon amber">
            <ReceiptText size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Chờ thanh toán</span>
            <div className="mod-kpi-val-row">
              <strong className="text-amber">{unpaidBookings.length} phiếu</strong>
              <span className="mod-kpi-sub">{money(unpaidAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon purple">
            <Globe size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Chờ duyệt Online & Chuông</span>
            <div className="mod-kpi-val-row">
              <strong>{(data.onlinePending ?? 0) + openSupportCount}</strong>
              <span className="mod-kpi-sub">
                {data.onlinePending ?? 0} online · {openSupportCount} gọi phục vụ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pill Navigation Tabs */}
      <div className="mod-pill-nav" role="tablist" aria-label="Phân mục Đặt sân">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'schedule'}
          className={`mod-pill-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => selectTab('schedule')}
        >
          <CalendarCheck size={15} />
          <span>Tất cả lịch đặt ({bookings.length})</span>
        </button>
        {canOnline && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'online'}
            className={`mod-pill-tab ${activeTab === 'online' ? 'active' : ''}`}
            onClick={() => selectTab('online')}
          >
            <Globe size={15} />
            <span>Đặt online ({data.onlinePending ?? 0})</span>
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'invoices'}
          className={`mod-pill-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => selectTab('invoices')}
        >
          <ReceiptText size={15} />
          <span>Phiếu chờ thu & Hóa đơn ({unpaidBookings.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'support'}
          className={`mod-pill-tab ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => selectTab('support')}
        >
          <BellRing size={15} />
          <span>Chuông gọi tại Line ({openSupportCount})</span>
        </button>
      </div>

      {/* Tab Content Card */}
      <div className="mod-surface-card">
        {activeTab === 'schedule' && <BookingList bookings={bookings} onSelect={onSelect} />}
        {activeTab === 'online' && canOnline && <OnlineRequests onChanged={onChanged} />}
        {activeTab === 'invoices' && <InvoiceList bookings={bookings} onSelect={onSelect} />}
        {activeTab === 'support' && (
          <SupportList
            data={data}
            busy={busy}
            onMutate={onMutate ?? (async () => false)}
          />
        )}
      </div>
    </div>
  );
}

function BookingList({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const count = (k: string) => bookings.filter((b) => STATUS_GROUPS[k].includes(b.status)).length;
  const t = search.trim().toLowerCase();
  const rows = bookings
    .filter((b) => filter === 'all' || STATUS_GROUPS[filter].includes(b.status))
    .filter((b) => roomFilter === 'all' || b.room === roomFilter)
    .filter((b) => !t || `${b.customer} ${b.phone}`.toLowerCase().includes(t))
    .sort((a, b) => (filter === 'upcoming' ? a.start - b.start : b.start - a.start));

  const filterOptions = [
    { key: 'all', label: 'Tất cả', count: bookings.length },
    { key: 'upcoming', label: 'Sắp tới', count: count('upcoming') },
    { key: 'playing', label: 'Đang chơi', count: count('playing') },
    { key: 'unpaid', label: 'Chờ thanh toán', count: count('unpaid') },
    { key: 'paid', label: 'Đã thanh toán', count: count('paid') },
    { key: 'cancelled', label: 'Đã hủy', count: count('cancelled') },
  ];

  return (
    <div className="mod-section-body">
      <div className="mod-toolbar">
        <div className="mod-search-input">
          <Search size={15} />
          <input
            type="search"
            aria-label="Tìm lịch đặt"
            placeholder="Tìm tên khách hàng, số điện thoại…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="mod-select"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          aria-label="Lọc theo Line/Phòng"
        >
          <option value="all">Tất cả Line & Phòng VIP</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.vip ? '(VIP)' : ''}
            </option>
          ))}
        </select>

        <div className="mod-chip-group" role="group" aria-label="Lọc trạng thái đặt sân">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`mod-filter-chip ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              <span>{opt.label}</span>
              <span className="mod-chip-count">{opt.count}</span>
            </button>
          ))}
        </div>
      </div>

      <BookingTable bookings={rows} onSelect={onSelect} empty="Không có lượt đặt phù hợp" />
    </div>
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
    <div className="mod-section-body">
      <div className="mod-toolbar">
        <div className="mod-search-input">
          <Search size={15} />
          <input
            type="search"
            aria-label="Tìm hóa đơn"
            placeholder="Tìm tên khách, số điện thoại…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mod-chip-group">
          {[
            { key: 'unpaid', label: 'Chờ thu', count: unpaid.length },
            { key: 'paid', label: 'Đã thu', count: all.length - unpaid.length },
            { key: 'all', label: 'Tất cả', count: all.length },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`mod-filter-chip ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              <span>{opt.label}</span>
              <span className="mod-chip-count">{opt.count}</span>
            </button>
          ))}
        </div>
        {unpaid.length > 0 && (
          <div className="mod-toolbar-summary">
            Chờ thu:{' '}
            <strong>
              {unpaid.length} phiếu · {money(owed)}
            </strong>
          </div>
        )}
      </div>
      <BookingTable
        bookings={rows}
        onSelect={onSelect}
        empty={filter === 'unpaid' ? 'Không có phiếu nào chờ thu' : 'Chưa có hóa đơn'}
      />
    </div>
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
    <div className="mod-section-body">
      <div className="mod-support-banner">
        <div className="mod-support-status" role="status">
          <BellRing size={18} className={waiting ? 'text-amber' : 'text-emerald'} />
          <span>
            {waiting
              ? `${waiting} yêu cầu đang chờ nhân viên tiếp nhận tại Line`
              : 'Chưa có khách gọi mới. Yêu cầu từ mã QR tại Line sẽ hiển thị trực tiếp kèm âm báo.'}
          </span>
        </div>
        <BellSettings />
      </div>

      <div className="mod-toolbar">
        <div className="mod-chip-group">
          {[
            { key: 'open', label: 'Đang chờ xử lý', count: open.length },
            { key: 'all', label: 'Tất cả lịch sử', count: data.requests.length },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`mod-filter-chip ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              <span>{opt.label}</span>
              <span className="mod-chip-count">{opt.count}</span>
            </button>
          ))}
        </div>
      </div>

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
                  <strong>{rooms.find((x) => x.id === b?.room)?.name ?? 'Line'}</strong>
                  <small style={{ display: 'block', color: '#64748b' }}>{b?.customer}</small>
                </>
              );
            },
          },
          {
            key: 'when',
            header: 'Thời gian',
            cell: (r) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} /> {date(r.created)} · {time(r.created)}
              </span>
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
            header: 'Thao tác',
            cell: (r) =>
              r.status !== 'done' && (
                <button
                  className="mod-btn-primary sm"
                  disabled={busy}
                  onClick={() =>
                    onMutate({
                      action: 'request-update',
                      id: r.id,
                      status: r.status === 'new' ? 'received' : 'done',
                    })
                  }
                >
                  <CheckCircle2 size={14} />
                  <span>{r.status === 'new' ? 'Tiếp nhận' : 'Hoàn thành'}</span>
                </button>
              ),
          },
        ]}
      />
    </div>
  );
}
