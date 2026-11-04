'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { operationKey } from '../../lib/finance';
import type { StockItem, StockMovement } from '../../lib/stock';
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
    }),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<StockItem | null>(null),
    [kind, setKind] = useState('receipt'),
    [qty, setQty] = useState('1'),
    [note, setNote] = useState(''),
    [low, setLow] = useState('5');
  const key = useRef(operationKey()),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
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
      setNotice(v.replayed ? 'Đã ghi trước đó, không ghi trùng.' : 'Đã cập nhật kho');
      key.current = operationKey();
      setSelected(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Chưa xác nhận được kết quả');
    } finally {
      setBusy(false);
      await load();
    }
  }
  function choose(item: StockItem) {
    setSelected(item);
    setLow(String(item.low_level ?? 5));
    setKind('receipt');
    setQty('1');
    setNote('');
    key.current = operationKey();
  }
  return (
    <section>
      <div className="info-strip">
        Kho theo đơn vị bán nguyên chiếc / chai / phần. Đơn đang chờ giữ hàng; đã phục vụ mới xuất
        kho. Nhập kho chưa tạo phiếu chi.
      </div>
      {notice && (
        <div className="info-strip" role="status">
          {notice}
        </div>
      )}
      <div className="section-heading">
        <h2>Tồn kho F&B</h2>
        <button className="secondary" onClick={load}>
          Tải lại
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Món / đơn vị</th>
              <th>Tồn thực tế</th>
              <th>Đang giữ</th>
              <th>Khả dụng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.name}</strong>
                  <small>{i.unit}</small>
                </td>
                <td>{i.low_level === null ? 'Chưa theo dõi' : i.on_hand}</td>
                <td>{i.low_level === null ? '—' : i.reserved}</td>
                <td>
                  {i.low_level === null ? (
                    '—'
                  ) : (
                    <span className={'badge ' + (i.available <= i.low_level ? 'paused' : 'served')}>
                      {i.available}
                      {i.available <= i.low_level ? ' · Sắp hết' : ''}
                    </span>
                  )}
                </td>
                <td>
                  <button className="secondary" onClick={() => choose(i)}>
                    {i.low_level === null ? 'Bật theo dõi' : 'Nhập / điều chỉnh'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.items.length && <p>Thêm món trong Thực đơn & bếp trước khi thiết lập kho.</p>}
      <h2>Lịch sử kho gần nhất</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Món</th>
              <th>Loại</th>
              <th>Thay đổi</th>
              <th>Lý do</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.map((m) => (
              <tr key={m.id}>
                <td>
                  {new Date(m.created).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </td>
                <td>{m.item_name}</td>
                <td>{kinds[m.kind]}</td>
                <td>
                  {m.delta > 0 ? '+' : ''}
                  {m.delta} {m.unit}
                </td>
                <td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <dialog
          ref={dialog}
          className="native-dialog"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setSelected(null);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true" aria-label="Ghi nhận kho">
            <div className="stock-form">
              <h2>{selected.name}</h2>
              {notice && (
                <div className="info-strip" role="status">
                  {notice}
                </div>
              )}
              <p>
                Đơn vị: {selected.unit}. Đã bật theo dõi sẽ giữ sổ kho và khóa đơn vị; đổi đơn vị
                cần tạo mã món mới.
              </p>
              <label>
                Ngưỡng cảnh báo
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={low}
                  disabled={busy}
                  onChange={(e) => setLow(e.target.value)}
                />
              </label>
              <button
                className="secondary"
                disabled={busy || !/^\d+$/.test(low)}
                onClick={() => save(true)}
              >
                {selected.low_level === null ? 'Bật theo dõi từ tồn 0' : 'Lưu ngưỡng cảnh báo'}
              </button>
              {selected.low_level !== null && (
                <>
                  <label>
                    Loại phiếu
                    <select value={kind} disabled={busy} onChange={(e) => setKind(e.target.value)}>
                      {Object.entries(kinds)
                        .filter(([k]) => k !== 'sale')
                        .map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Số lượng ({selected.unit})
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      value={qty}
                      disabled={busy}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </label>
                  <label>
                    Lý do / tham chiếu nhập hàng
                    <textarea
                      value={note}
                      maxLength={300}
                      disabled={busy}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={
                      busy || note.trim().length < 5 || !/^\d+$/.test(qty) || Number(qty) < 1
                    }
                    onClick={() => save()}
                  >
                    Ghi nhận phiếu kho
                  </button>
                </>
              )}
              <button className="secondary" disabled={busy} onClick={() => setSelected(null)}>
                Đóng
              </button>
            </div>
          </section>
        </dialog>
      )}
    </section>
  );
}
