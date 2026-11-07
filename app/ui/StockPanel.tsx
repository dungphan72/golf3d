'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable, ModalDialog } from './kit';
import { operationKey } from '../../lib/finance';
import type { StockItem, StockMovement } from '../../lib/stock';
import {
  PackageCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

const kinds: Record<string, string> = {
  receipt: 'Nhập hàng',
  adjust_in: 'Điều chỉnh tăng',
  adjust_out: 'Điều chỉnh giảm',
  sale: 'Đã phục vụ',
};

export default function StockPanel() {
  const [data, setData] = useState<{ items: StockItem[]; movements: StockMovement[] }>({
    items: [],
    movements: [],
  });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'move' | 'config'>('move');
  const [kind, setKind] = useState<'receipt' | 'adjust_in' | 'adjust_out'>('receipt');
  const [qty, setQty] = useState('10');
  const [note, setNote] = useState('');
  const [low, setLow] = useState('5');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLow, setFilterLow] = useState(false);

  const key = useRef(operationKey());

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/stock', { cache: 'no-store' });
      const v = (await r.json()) as {
        items: StockItem[];
        movements: StockMovement[];
        error?: string;
      };
      if (!r.ok) throw Error(v.error);
      setData(v);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Chưa tải được kho');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function save(configure = false) {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          configure
            ? { action: 'configure', itemId: selected.id, lowLevel: Number(low) }
            : {
                action: 'move',
                itemId: selected.id,
                requestId: key.current,
                kind,
                qty: Number(qty),
                note,
              },
        ),
      });
      const v = (await r.json()) as { error?: string; replayed?: boolean };
      if (!r.ok) throw Error(v.error);
      setNotice(v.replayed ? 'Đã ghi trước đó, không ghi trùng.' : 'Đã cập nhật kho.');
      key.current = operationKey();
      setSelected(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Chưa xác nhận được kết quả');
    } finally {
      setBusy(false);
      await load();
    }
  }

  function choose(item: StockItem, mode: 'move' | 'config' = 'move') {
    setSelected(item);
    setAdjustMode(mode);
    setLow(String(item.low_level ?? 5));
    setKind('receipt');
    setQty('10');
    setNote('');
    key.current = operationKey();
  }

  // Stock KPIs
  const trackedItems = data.items.filter((i) => i.low_level !== null);
  const lowStockItems = trackedItems.filter((i) => i.available <= (i.low_level ?? 0));
  const totalReserved = trackedItems.reduce((acc, i) => acc + i.reserved, 0);

  // Filter items
  const filteredItems = data.items.filter((i) => {
    if (filterLow && !(i.low_level !== null && i.available <= i.low_level)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.unit.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <section className="operate-stock-section">
      {/* Top Inventory Summary Ribbon */}
      <div className="operate-ribbon">
        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Món theo dõi tồn</div>
          <div className="operate-kpi-val">
            {trackedItems.length}
            <span className="operate-kpi-sub" style={{ marginLeft: '6px' }}>
              / {data.items.length} món
            </span>
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Cảnh báo sắp hết hàng</div>
          <div
            className="operate-kpi-val"
            style={{ color: lowStockItems.length > 0 ? '#dc2626' : 'var(--text)' }}
          >
            {lowStockItems.length}
            {lowStockItems.length > 0 && (
              <span className="operate-kpi-sub" style={{ color: '#dc2626', marginLeft: '6px' }}>
                món cần nhập
              </span>
            )}
          </div>
        </div>

        <div className="operate-kpi-card">
          <div className="operate-kpi-label">Đang giữ cho đơn chờ</div>
          <div className="operate-kpi-val" style={{ color: '#2563eb' }}>
            {totalReserved}
            <span className="operate-kpi-sub" style={{ marginLeft: '6px' }}>
              phần
            </span>
          </div>
        </div>
      </div>

      <div className="info-strip">
        <PackageCheck size={16} />
        <span>
          Kho quản lý theo đơn vị thành phẩm bán ra (lon, chai, phần). Đơn đang chuẩn bị giữ số
          lượng; khi hoàn tất phục vụ hệ thống tự động trừ kho. Nhập kho là phiếu kiểm đếm nội bộ.
        </span>
      </div>

      {notice && (
        <div className="info-strip" role="status">
          <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="operate-filterbar">
        <div className="operate-filter-left">
          <div className="operate-search-wrap">
            <Search size={15} className="operate-search-icon" />
            <input
              type="search"
              placeholder="Tìm tên món hàng, đơn vị…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="operate-search-input"
            />
          </div>
          <button
            type="button"
            className={`operate-pill ${filterLow ? 'active' : ''}`}
            onClick={() => setFilterLow(!filterLow)}
          >
            <AlertTriangle size={13} style={{ marginRight: '4px' }} />
            Sắp hết hàng ({lowStockItems.length})
          </button>
        </div>
        <div className="operate-filter-right">
          <button
            aria-label="Tải lại"
            className="secondary operate-btn"
            onClick={load}
            disabled={busy}
          >
            <RefreshCw size={15} /> Tải lại
          </button>
        </div>
      </div>

      <div className="operate-stock-table-wrap">
        <DataTable
          rows={filteredItems}
          rowKey={(i) => i.id}
          empty="Chưa có món để theo dõi kho"
          emptyText="Thêm món trong tab Thực đơn trước khi thiết lập kho."
          columns={[
            {
              key: 'name',
              header: 'Món / Đơn vị',
              cell: (i) => (
                <div className="stock-name-cell">
                  <strong>{i.name}</strong>
                  <span className="stock-unit-badge">{i.unit}</span>
                </div>
              ),
            },
            {
              key: 'onhand',
              header: 'Tồn thực tế',
              cell: (i) =>
                i.low_level === null ? (
                  <span className="text-muted">Chưa theo dõi</span>
                ) : (
                  <strong className="stock-qty-val">{i.on_hand}</strong>
                ),
            },
            {
              key: 'reserved',
              header: 'Đang giữ (chờ)',
              cell: (i) =>
                i.low_level === null ? (
                  '—'
                ) : i.reserved > 0 ? (
                  <span className="badge paused">{i.reserved}</span>
                ) : (
                  <span className="text-muted">0</span>
                ),
            },
            {
              key: 'available',
              header: 'Khả dụng bán',
              cell: (i) => {
                if (i.low_level === null) return '—';
                const isLow = i.available <= i.low_level;
                return (
                  <span className={`badge ${isLow ? 'paused' : 'served'}`}>
                    {i.available}
                    {isLow ? ' · Sắp hết' : ' · Sẵn sàng'}
                  </span>
                );
              },
            },
            {
              key: 'low',
              header: 'Ngưỡng báo',
              cell: (i) =>
                i.low_level === null ? '—' : <small className="text-muted">≤ {i.low_level}</small>,
            },
            {
              key: 'act',
              header: 'Thao tác kho',
              cell: (i) => (
                <div className="stock-action-cell">
                  <button
                    className="secondary operate-btn-sm"
                    onClick={() => choose(i, i.low_level === null ? 'config' : 'move')}
                  >
                    {i.low_level === null ? (
                      <>
                        <Plus size={13} /> Bật theo dõi
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={13} /> Nhập / Điều chỉnh
                      </>
                    )}
                  </button>
                  {i.low_level !== null && (
                    <button
                      className="secondary operate-btn-sm"
                      title="Sửa ngưỡng cảnh báo"
                      onClick={() => choose(i, 'config')}
                    >
                      <SlidersHorizontal size={13} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="operate-movements-section">
        <h2 className="ds-subhead" style={{ marginTop: '24px', marginBottom: '12px' }}>
          Biến động kho gần nhất
        </h2>
        <DataTable
          rows={data.movements}
          rowKey={(m) => m.id}
          empty="Chưa có biến động kho"
          columns={[
            {
              key: 'time',
              header: 'Thời điểm',
              cell: (m) =>
                new Date(m.created).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            },
            { key: 'item', header: 'Món', cell: (m) => <strong>{m.item_name}</strong> },
            {
              key: 'kind',
              header: 'Loại biến động',
              cell: (m) => {
                const isPositive = m.delta > 0;
                return (
                  <span className={`badge ${isPositive ? 'served' : 'paused'}`}>
                    {kinds[m.kind] ?? m.kind}
                  </span>
                );
              },
            },
            {
              key: 'delta',
              header: 'Thay đổi',
              cell: (m) => (
                <span
                  style={{
                    fontWeight: 700,
                    color: m.delta > 0 ? '#16a34a' : '#dc2626',
                  }}
                >
                  {m.delta > 0 ? '+' : ''}
                  {m.delta} {m.unit}
                </span>
              ),
            },
            { key: 'note', header: 'Lý do / Phiên', cell: (m) => m.note || '—' },
          ]}
        />
      </div>

      {/* Adjust & Config Dialog */}
      {selected && (
        <ModalDialog
          label={adjustMode === 'config' ? 'Cấu hình kho' : 'Ghi nhận kho'}
          onClose={() => setSelected(null)}
          locked={busy}
        >
          <div className="stock-dialog-inner">
            <h2 className="dialog-title">{selected.name}</h2>
            <div className="stock-dialog-meta">
              <span>Đơn vị: <strong>{selected.unit}</strong></span>
              {selected.low_level !== null && (
                <>
                  <span>Tồn hiện tại: <strong>{selected.on_hand}</strong></span>
                  <span>Đang giữ: <strong>{selected.reserved}</strong></span>
                  <span>Khả dụng: <strong>{selected.available}</strong></span>
                </>
              )}
            </div>

            {notice && (
              <div className="info-strip" role="status">
                {notice}
              </div>
            )}

            {adjustMode === 'config' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save(true);
                }}
              >
                <p className="form-note">
                  Đặt mức tồn kho tối thiểu. Khi tồn khả dụng giảm xuống hoặc thấp hơn mức này, hệ thống
                  sẽ hiển thị nhãn cảnh báo đỏ để nhân viên kịp thời nhập hàng.
                </p>
                <label className="operate-label">
                  Ngưỡng cảnh báo sắp hết (đơn vị: {selected.unit})
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={low}
                    disabled={busy}
                    onChange={(e) => setLow(e.target.value)}
                    required
                    className="operate-input"
                  />
                </label>
                <div className="form-footer" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Hủy
                  </button>
                  <button className="primary" disabled={busy || !/^\d+$/.test(low)}>
                    {busy ? 'Đang lưu…' : 'Lưu thiết lập'}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save(false);
                }}
              >
                <div className="form-grid">
                  <label className="operate-label">
                    Nghiệp vụ kho
                    <select
                      value={kind}
                      disabled={busy}
                      onChange={(e) => setKind(e.target.value as 'receipt' | 'adjust_in' | 'adjust_out')}
                      className="operate-select"
                    >
                      <option value="receipt">Nhập thêm hàng vào kho (+)</option>
                      <option value="adjust_in">Kiểm kê thừa / Điều chỉnh tăng (+)</option>
                      <option value="adjust_out">Hỏng vỡ, hao hụt / Điều chỉnh giảm (-)</option>
                    </select>
                  </label>

                  <label className="operate-label">
                    Số lượng ({selected.unit})
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      value={qty}
                      disabled={busy}
                      onChange={(e) => setQty(e.target.value)}
                      required
                      className="operate-input"
                    />
                  </label>

                  <label className="operate-label" style={{ gridColumn: '1 / -1' }}>
                    Lý do / Ghi chú
                    <input
                      value={note}
                      disabled={busy}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Nhập thêm thùng bia từ NCC, Kiểm kê kho ca chiều, vỡ 1 chai…"
                      minLength={2}
                      maxLength={140}
                      required
                      className="operate-input"
                    />
                  </label>
                </div>

                <p className="form-note">
                  Phiếu này ghi nhận sự thay đổi thực tế vào thẻ kho. Đối với điều chỉnh giảm, số lượng
                  tồn khả dụng sẽ bị trừ ngay lập tức.
                </p>

                <div className="form-footer" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Hủy
                  </button>
                  <button
                    className="primary"
                    disabled={busy || !/^\d+$/.test(qty) || Number(qty) <= 0 || !note.trim()}
                  >
                    {busy ? 'Đang ghi nhận…' : 'Xác nhận ghi kho'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalDialog>
      )}
    </section>
  );
}
