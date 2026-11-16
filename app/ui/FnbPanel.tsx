'use client';
import { useRef, useState } from 'react';
import { DialogHeading, ModalDialog, PageTabs } from './kit';
import StockPanel from './StockPanel';
import {
  Plus,
  UtensilsCrossed,
  Pencil,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Coffee,
  XCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import { money, rooms } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { foodLabels, type FoodOrder, type FoodLine, type MenuItem } from '../../lib/fnb';
import { useFood } from './SessionFood';

const categories: Record<string, string> = { food: 'Đồ ăn', drink: 'Thức uống', other: 'Khác' };

const when = (n: number) =>
  new Date(n).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function FnbPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const food = useFood();
  const [tab, setTab] = useState('kitchen');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editor, setEditor] = useState<MenuItem | 'new' | null>(null);
  const [cancel, setCancel] = useState<FoodOrder | null>(null);
  const [menuFilter, setMenuFilter] = useState<'all' | 'food' | 'drink' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await r.json()) as { error?: string; replayed?: boolean };
      if (!r.ok) throw Error(result.error ?? 'Chưa xác minh được thao tác');
      setEditor(null);
      setCancel(null);
      setMessage(result.replayed ? 'Đã ghi trước đó; không ghi trùng.' : 'Đã cập nhật.');
      await food.reload();
      await onChanged();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Chưa xác minh được thao tác');
      await food.reload();
      return false;
    } finally {
      setBusy(false);
    }
  }

  const orders = food.data?.orders ?? [];
  const pending = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status));
  const newOrders = orders.filter((o) => o.status === 'new');
  const prepOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const servedOrders = orders.filter((o) => ['served', 'cancelled'].includes(o.status));

  // Filtered menu
  const menuItems = food.data?.menu ?? [];
  const filteredMenu = menuItems.filter((m) => {
    if (menuFilter !== 'all' && m.category !== menuFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <section className="mod-workspace fnb-panel operate-fnb">
      {/* Top Page Header */}
      <div className="mod-page-header">
        <div className="mod-page-title-group">
          <div className="mod-page-icon green">
            <UtensilsCrossed size={22} />
          </div>
          <div>
            <h2>Sản phẩm F&B, Dịch vụ & Quản lý Kho</h2>
            <p>
              Điều phối đơn Bếp/Bar thời gian thực (KDS), thiết lập thực đơn đồ ăn thức uống và kiểm
              soát tồn kho
            </p>
          </div>
        </div>
        <div className="mod-page-actions">
          <button
            type="button"
            className="mod-btn-outline"
            onClick={food.reload}
            disabled={busy || food.loading}
          >
            <RefreshCw size={15} />
            <span>Làm mới dữ liệu</span>
          </button>
          <button
            type="button"
            className="mod-btn-primary"
            disabled={!food.data || busy}
            onClick={() => {
              setTab('menu');
              setEditor('new');
            }}
          >
            <Plus size={15} />
            <span>Thêm món / Dịch vụ mới</span>
          </button>
        </div>
      </div>

      {/* Top Header & Metrics Ribbon */}
      <div className="mod-kpi-strip">
        <div className="mod-kpi-card">
          <div className="mod-kpi-icon amber">
            <BellRing size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Đơn cần xử lý</span>
            <div className="mod-kpi-val-row">
              <strong style={{ color: pending.length > 0 ? '#dc2626' : '#0f172a' }}>
                {pending.length}
              </strong>
              <span className="mod-kpi-sub">
                {newOrders.length > 0 ? `${newOrders.length} đơn mới` : 'ổn định'}
              </span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon blue">
            <ChefHat size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Đang chế biến</span>
            <div className="mod-kpi-val-row">
              <strong style={{ color: '#d97706' }}>{prepOrders.length}</strong>
              <span className="mod-kpi-sub">tại quầy Bếp/Bar</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Sẵn sàng phục vụ</span>
            <div className="mod-kpi-val-row">
              <strong className="text-green">{readyOrders.length}</strong>
              <span className="mod-kpi-sub">chờ mang ra Line</span>
            </div>
          </div>
        </div>

        <div className="mod-kpi-card">
          <div className="mod-kpi-icon purple">
            <Coffee size={18} />
          </div>
          <div className="mod-kpi-info">
            <span className="mod-kpi-label">Món trong thực đơn</span>
            <div className="mod-kpi-val-row">
              <strong>
                {menuItems.filter((m) => m.active).length} / {menuItems.length}
              </strong>
              <span className="mod-kpi-sub">đang mở bán</span>
            </div>
          </div>
        </div>
      </div>

      <PageTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'kitchen', label: 'Bếp & Pha chế (KDS)', count: pending.length },
          { key: 'menu', label: `Thực đơn & Dịch vụ (${menuItems.length})` },
          { key: 'stock', label: 'Quản lý Tồn kho' },
        ]}
      />

      {tab !== 'stock' && (
        <div className="operate-filterbar">
          <div className="operate-filter-left">
            {tab === 'menu' && (
              <>
                <div className="operate-search-wrap">
                  <Search size={15} className="operate-search-icon" />
                  <input
                    type="search"
                    placeholder="Tìm tên món, đơn vị…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="operate-search-input"
                  />
                </div>
                <div className="operate-cat-pills">
                  <button
                    type="button"
                    className={`operate-pill ${menuFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setMenuFilter('all')}
                  >
                    Tất cả ({menuItems.length})
                  </button>
                  <button
                    type="button"
                    className={`operate-pill ${menuFilter === 'drink' ? 'active' : ''}`}
                    onClick={() => setMenuFilter('drink')}
                  >
                    Thức uống ({menuItems.filter((m) => m.category === 'drink').length})
                  </button>
                  <button
                    type="button"
                    className={`operate-pill ${menuFilter === 'food' ? 'active' : ''}`}
                    onClick={() => setMenuFilter('food')}
                  >
                    Đồ ăn ({menuItems.filter((m) => m.category === 'food').length})
                  </button>
                  <button
                    type="button"
                    className={`operate-pill ${menuFilter === 'other' ? 'active' : ''}`}
                    onClick={() => setMenuFilter('other')}
                  >
                    Khác ({menuItems.filter((m) => m.category === 'other').length})
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="operate-filter-right">
            <button
              aria-label="Tải lại"
              className="secondary operate-btn"
              onClick={food.reload}
              disabled={busy || food.loading}
            >
              <RefreshCw size={15} /> Tải lại
            </button>
            {tab === 'menu' && (
              <button
                className="primary operate-btn"
                disabled={!food.data || busy}
                onClick={() => setEditor('new')}
              >
                <Plus size={16} />
                Thêm món mới
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'stock' && <StockPanel />}

      {food.error && (
        <div className="error-box" role="alert">
          <AlertCircle size={16} /> {food.error}
        </div>
      )}
      {message && (
        <div className="info-strip" role="status">
          <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> {message}
        </div>
      )}

      {/* Menu Tab */}
      {food.data && tab === 'menu' && (
        <div className="operate-menu-grid">
          {filteredMenu.length ? (
            filteredMenu.map((m) => (
              <article key={m.id} className={`operate-menu-card ${!m.active ? 'inactive' : ''}`}>
                <div className="operate-menu-top">
                  <span className="operate-category-tag">
                    {categories[m.category] ?? m.category}
                  </span>
                  <span className={`badge ${m.active ? 'served' : 'paused'}`}>
                    {m.active ? 'Đang bán' : 'Tạm ngưng'}
                  </span>
                </div>
                <h3 className="operate-menu-title">{m.name}</h3>
                <div className="operate-menu-price-row">
                  <span className="operate-menu-price">{money(m.price)}</span>
                  <span className="operate-menu-unit">/ {m.unit}</span>
                </div>
                <div className="operate-menu-tax-info">
                  Phí PV: <strong>{m.fee_bps / 100}%</strong> · VAT:{' '}
                  <strong>{m.vat_bps / 100}%</strong>
                </div>
                <button
                  className="secondary operate-menu-btn"
                  disabled={busy}
                  onClick={() => setEditor(m)}
                >
                  <Pencil size={14} />
                  Sửa món / trạng thái
                </button>
              </article>
            ))
          ) : (
            <div className="empty">
              <UtensilsCrossed size={36} />
              <h3>{searchQuery ? 'Không tìm thấy món phù hợp' : 'Thực đơn đang trống'}</h3>
              <p>
                {searchQuery
                  ? 'Thử thay đổi từ khóa hoặc bộ lọc nhóm món'
                  : 'Thêm món, giá và VAT/phí thực tế trước khi nhận đơn.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Kitchen KDS Board */}
      {food.data && tab === 'kitchen' && (
        <>
          <div className="kitchen-board operate-kds-board">
            {(['new', 'preparing', 'ready'] as const).map((status) => {
              const list = orders.filter((o) => o.status === status);
              return (
                <section key={status} className={`kds-column col-${status}`}>
                  <h3 role="heading" aria-level={2} className="kds-col-header">
                    <span className="kds-col-title">
                      {status === 'new' && <BellRing size={16} className="text-red" />}
                      {status === 'preparing' && <ChefHat size={16} className="text-amber" />}
                      {status === 'ready' && <CheckCircle2 size={16} className="text-emerald" />}
                      {foodLabels[status]}
                    </span>
                    <span className="kds-col-count">{list.length}</span>
                  </h3>
                  <div className="kds-cards-wrap">
                    {list.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        busy={busy}
                        onNext={() =>
                          save({
                            action: 'transition',
                            id: o.id,
                            expectedVersion: o.version,
                            status:
                              status === 'new'
                                ? 'preparing'
                                : status === 'preparing'
                                  ? 'ready'
                                  : 'served',
                            reason: '',
                          })
                        }
                        onCancel={() => setCancel(o)}
                      />
                    ))}
                    {!list.length && (
                      <div className="kitchen-empty">
                        <UtensilsCrossed size={22} style={{ opacity: 0.35, marginBottom: '6px' }} />
                        <div>Chưa có đơn</div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Completed Orders List */}
          <div className="operate-completed-section">
            <h2 className="audit-title">Đơn gần đây đã hoàn tất</h2>
            <div className="completed-food operate-completed-list">
              {servedOrders.slice(0, 40).map((o) => (
                <div key={o.id} className="operate-completed-row">
                  <div className="operate-completed-bay">
                    <strong>{rooms.find((r) => r.id === o.room)?.name ?? o.room}</strong>
                    <span className="operate-completed-id">#{o.id.slice(-6)}</span>
                  </div>
                  <div className="operate-completed-total">{money(o.total)}</div>
                  <span className={'badge ' + o.status}>{foodLabels[o.status]}</span>
                  {o.reason && <small className="operate-completed-reason">{o.reason}</small>}
                </div>
              ))}
              {!servedOrders.length && (
                <p className="kitchen-empty">Chưa có đơn đã hoàn tất trong ca này</p>
              )}
            </div>
          </div>

          <p className="form-note">
            Đơn đang chờ được ưu tiên hiển thị. Giới hạn 200 đơn chờ/cơ sở, 100 đơn/phiên. Theo dõi
            tồn thành phẩm tại Kho F&B. Công thức nguyên liệu sẽ triển khai sau.
          </p>
        </>
      )}

      {!food.data && !food.error && <div className="empty">Đang tải thực đơn…</div>}

      {editor && (
        <ItemEditor
          item={editor === 'new' ? null : editor}
          busy={busy}
          message={message}
          onClose={() => {
            if (!busy) setEditor(null);
          }}
          onSave={save}
        />
      )}

      {cancel && (
        <CancelOrder
          order={cancel}
          busy={busy}
          message={message}
          onClose={() => {
            if (!busy) setCancel(null);
          }}
          onSave={save}
        />
      )}
    </section>
  );
}

function OrderCard({
  order: o,
  busy,
  onNext,
  onCancel,
}: {
  order: FoodOrder;
  busy: boolean;
  onNext: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const roomName = rooms.find((r) => r.id === o.room)?.name ?? o.room;
  const items = JSON.parse(o.items) as FoodLine[];
  // eslint-disable-next-line react-hooks/purity -- urgency is relative to the current time
  const isUrgent = o.status === 'new' && Date.now() - o.created > 10 * 60 * 1000;

  return (
    <article className={`kitchen-card operate-kds-card ${isUrgent ? 'urgent' : ''}`}>
      <div className="kds-card-head">
        <div className="kds-bay-badge">{roomName}</div>
        <div className="kds-time-stamp">
          <Clock size={12} /> {when(o.created)} · #{o.id.slice(-6)}
        </div>
      </div>
      <div className="kds-items-list">
        {items.map((l, i) => (
          <div key={i} className="kds-item-line">
            <span className="kds-qty">{l.qty}×</span>
            <span className="kds-name">{l.name}</span>
            <span className="kds-unit">{l.unit}</span>
          </div>
        ))}
      </div>
      {o.note && (
        <blockquote className="kds-note">
          <strong>Ghi chú:</strong> {o.note}
        </blockquote>
      )}
      <div className="kitchen-buttons operate-kds-buttons">
        <button className="primary kds-action-btn" disabled={busy} onClick={onNext}>
          {o.status === 'new' && (
            <>
              <ChefHat size={15} /> Tiếp nhận
            </>
          )}
          {o.status === 'preparing' && (
            <>
              <CheckCircle2 size={15} /> Xong, báo phục vụ
            </>
          )}
          {o.status === 'ready' && (
            <>
              <CheckCircle2 size={15} /> Đã phục vụ khách
            </>
          )}
        </button>
        <button className="secondary kds-cancel-btn" disabled={busy} onClick={onCancel} title="Hủy đơn">
          <XCircle size={15} /> Hủy
        </button>
      </div>
    </article>
  );
}

function ItemEditor({
  item,
  busy,
  message,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  busy: boolean;
  message: string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<boolean>;
}) {
  const key = useRef(operationKey());
  return (
    <ModalDialog label={item ? 'Sửa món' : 'Thêm món mới'} onClose={onClose} locked={busy}>
      <DialogHeading onClose={onClose} locked={busy}>
        {item ? `Sửa món: ${item.name}` : 'Thêm món mới vào thực đơn'}
      </DialogHeading>
      {message && (
        <div className="info-strip" role="status">
          {message}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            action: item ? 'item-update' : 'item-create',
            ...(item ? { id: item.id, expectedVersion: item.version } : { requestId: key.current }),
            name: f.get('name'),
            category: f.get('category'),
            unit: f.get('unit'),
            price: Number(f.get('price')),
            feeBps: Math.round(Number(f.get('fee')) * 100),
            vatBps: Math.round(Number(f.get('vat')) * 100),
            active: f.get('active') === 'on',
          });
        }}
      >
        <div className="form-grid">
          <label>
            Tên món
            <input
              name="name"
              defaultValue={item?.name ?? ''}
              placeholder="VD: Cà phê đen đá, Nước chanh, Cơm rang dưa bò…"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Nhóm món
            <select name="category" defaultValue={item?.category ?? 'drink'}>
              {Object.entries(categories).map(([v, t]) => (
                <option value={v} key={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đơn vị
            <input
              name="unit"
              defaultValue={item?.unit ?? ''}
              placeholder="Ly, chai, lon, đĩa, phần…"
              maxLength={20}
              required
            />
          </label>
          <label>
            Giá niêm yết (₫)
            <input
              type="number"
              name="price"
              min="1"
              max="100000000"
              step="1"
              required
              defaultValue={item?.price ?? ''}
              placeholder="VD: 35000"
            />
          </label>
          <label>
            Phí phục vụ F&B (%)
            <input
              name="fee"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={item ? item.fee_bps / 100 : '0'}
            />
          </label>
          <label>
            VAT món (%)
            <input
              name="vat"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={item ? item.vat_bps / 100 : '8'}
            />
          </label>
          <label className="menu-active" style={{ gridColumn: '1 / -1' }}>
            <input type="checkbox" name="active" defaultChecked={item ? !!item.active : true} />
            Cho phép khách và thu ngân gọi món này ngay
          </label>
        </div>
        <p className="form-note">
          Nhập 0 nếu thực tế không thu phí PV hoặc VAT. Đơn đã gửi giữ nguyên giá cũ; tạm ngưng bán
          không hủy các đơn đang phục vụ.
        </p>
        <div className="form-footer">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Để sau
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Đang lưu…' : item ? 'Cập nhật món' : 'Tạo món'}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function CancelOrder({
  order,
  busy,
  message,
  onClose,
  onSave,
}: {
  order: FoodOrder;
  busy: boolean;
  message: string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<boolean>;
}) {
  const roomName = rooms.find((r) => r.id === order.room)?.name ?? order.room;
  return (
    <ModalDialog label="Hủy đơn" onClose={onClose} locked={busy}>
      <DialogHeading onClose={onClose} locked={busy}>
        Hủy đơn #{order.id.slice(-6)} · {roomName}
      </DialogHeading>
      {message && (
        <div className="info-strip" role="status">
          {message}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            action: 'transition',
            id: order.id,
            expectedVersion: order.version,
            status: 'cancelled',
            reason: new FormData(e.currentTarget).get('reason'),
          });
        }}
      >
        <label className="order-note">
          Lý do hủy đơn
          <input
            name="reason"
            placeholder="VD: Khách đổi ý, Hết nguyên liệu, Nhầm line…"
            minLength={5}
            maxLength={300}
            required
          />
        </label>
        <p className="form-note">
          Chỉ hủy khi chưa phục vụ. Món đã phục vụ cần quy trình hoàn tiền / điều chỉnh riêng tại
          thu ngân.
        </p>
        <div className="form-footer">
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>
            Quay lại
          </button>
          <button className="primary danger" disabled={busy}>
            Xác nhận hủy đơn
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
