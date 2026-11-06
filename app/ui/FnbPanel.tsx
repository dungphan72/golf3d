'use client';
import { useRef, useState } from 'react';
import { DialogHeading, ModalDialog, PageTabs } from './kit';
import StockPanel from './StockPanel';
import { Plus, UtensilsCrossed, Pencil, RefreshCw } from 'lucide-react';
import { money, rooms } from '../../lib/club';
import { operationKey } from '../../lib/finance';
import { foodLabels, type FoodOrder, type FoodLine, type MenuItem } from '../../lib/fnb';
import { useFood } from './SessionFood';
const categories = { food: 'Đồ ăn', drink: 'Thức uống', other: 'Khác' };
const when = (n: number) =>
  new Date(n).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
export default function FnbPanel({ onChanged }: { onChanged: () => Promise<void> }) {
  const food = useFood(),
    [tab, setTab] = useState('kitchen'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [editor, setEditor] = useState<MenuItem | 'new' | null>(null),
    [cancel, setCancel] = useState<FoodOrder | null>(null);
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
  const orders = food.data?.orders ?? [],
    pending = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status));
  return (
    <section className="fnb-panel">
      <PageTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'kitchen', label: 'Bếp / bar', count: pending.length },
          { key: 'menu', label: `Thực đơn · ${food.data?.menu.length ?? 0}` },
          { key: 'stock', label: 'Kho' },
        ]}
      />
      {tab !== 'stock' && (
        <div className="ds-filterbar">
          <div className="ds-filter-right">
            <button
              aria-label="Tải lại"
              className="secondary"
              onClick={food.reload}
              disabled={busy || food.loading}
            >
              <RefreshCw size={15} /> Tải lại
            </button>
            {tab === 'menu' && (
              <button
                className="primary"
                disabled={!food.data || busy}
                onClick={() => setEditor('new')}
              >
                <Plus size={16} />
                Thêm món
              </button>
            )}
          </div>
        </div>
      )}
      {tab === 'stock' && <StockPanel />}
      {food.error && (
        <div className="error-box" role="alert">
          {food.error}
        </div>
      )}
      {message && (
        <div className="info-strip" role="status">
          {message}
        </div>
      )}
      {food.data && tab === 'menu' && (
        <div className="menu-grid">
          {food.data.menu.length ? (
            food.data.menu.map((m) => (
              <article key={m.id} className={!m.active ? 'inactive' : ''}>
                <div className="menu-category">
                  {categories[m.category]}
                  <span className="badge">{m.active ? 'Đang bán' : 'Tạm ngưng'}</span>
                </div>
                <h3>{m.name}</h3>
                <strong>
                  {money(m.price)} <small>/ {m.unit}</small>
                </strong>
                <p>
                  Phí {m.fee_bps / 100}% · VAT {m.vat_bps / 100}%
                </p>
                <button className="secondary" disabled={busy} onClick={() => setEditor(m)}>
                  <Pencil size={14} />
                  Sửa món / trạng thái
                </button>
              </article>
            ))
          ) : (
            <div className="empty">
              <UtensilsCrossed size={25} />
              <h3>Thực đơn đang trống</h3>
              <p>Thêm món, giá và VAT/phí thực tế trước khi nhận đơn.</p>
            </div>
          )}
        </div>
      )}
      {food.data && tab === 'kitchen' && (
        <>
          <div className="kitchen-board">
            {(['new', 'preparing', 'ready'] as const).map((status) => (
              <section key={status}>
                <h3 role="heading" aria-level={2}>
                  {foodLabels[status]}{' '}
                  <span>{orders.filter((o) => o.status === status).length}</span>
                </h3>
                {orders
                  .filter((o) => o.status === status)
                  .map((o) => (
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
                {!orders.some((o) => o.status === status) && (
                  <p className="kitchen-empty">Chưa có đơn</p>
                )}
              </section>
            ))}
          </div>
          <h2 className="audit-title">Đơn gần đây đã hoàn tất</h2>
          <div className="completed-food">
            {orders
              .filter((o) => ['served', 'cancelled'].includes(o.status))
              .slice(0, 40)
              .map((o) => (
                <div key={o.id}>
                  <span>
                    {rooms.find((r) => r.id === o.room)?.name ?? o.room} · #{o.id.slice(-6)}
                  </span>
                  <span>{money(o.total)}</span>
                  <span className={'badge ' + o.status}>{foodLabels[o.status]}</span>
                  {o.reason && <small>{o.reason}</small>}
                </div>
              ))}
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
  return (
    <article className="kitchen-card">
      <div>
        <strong>{rooms.find((r) => r.id === o.room)?.name ?? o.room}</strong>
        <small>
          {when(o.created)} · #{o.id.slice(-6)}
        </small>
      </div>
      {(JSON.parse(o.items) as FoodLine[]).map((l, i) => (
        <p key={i}>
          <b>{l.qty}×</b>
          {l.name}
          <span>{l.unit}</span>
        </p>
      ))}
      {o.note && <blockquote>{o.note}</blockquote>}
      <div className="kitchen-buttons">
        <button className="primary" disabled={busy} onClick={onNext}>
          {o.status === 'new'
            ? 'Tiếp nhận'
            : o.status === 'preparing'
              ? 'Đã chuẩn bị xong'
              : 'Đã phục vụ'}
        </button>
        <button className="secondary" disabled={busy} onClick={onCancel}>
          Hủy đơn
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
        {item ? 'Sửa món' : 'Thêm món mới'}
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
              placeholder="Ly, chai, phần…"
              maxLength={20}
              required
            />
          </label>
          <label>
            Giá trước VAT/phí (₫)
            <input
              type="number"
              name="price"
              min="1"
              max="100000000"
              step="1"
              required
              defaultValue={item?.price ?? ''}
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
              defaultValue={item ? item.fee_bps / 100 : ''}
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
              defaultValue={item ? item.vat_bps / 100 : ''}
            />
          </label>
          <label className="menu-active">
            <input type="checkbox" name="active" defaultChecked={item ? !!item.active : true} />
            Cho phép gọi món
          </label>
        </div>
        <p className="form-note">
          Nhập 0 nếu thực tế không thu. Đơn đã gửi giữ giá cũ; tạm ngưng bán không hủy đơn đã có.
          Không áp phí giờ chơi lần nữa lên tiền món.
        </p>
        <div className="form-footer">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Để sau
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu món'}
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
  return (
    <ModalDialog label="Hủy đơn" onClose={onClose} locked={busy}>
      <DialogHeading onClose={onClose} locked={busy}>
        Hủy đơn #{order.id.slice(-6)}
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
          Lý do hủy
          <input name="reason" minLength={5} maxLength={300} required />
        </label>
        <p className="form-note">
          Chỉ hủy khi chưa phục vụ. Món đã phục vụ cần quy trình duyệt điều chỉnh riêng.
        </p>
        <div className="form-footer">
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>
            Để sau
          </button>
          <button className="primary" disabled={busy}>
            Xác nhận hủy
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
