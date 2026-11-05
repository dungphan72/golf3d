'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  benefitText,
  conditionText,
  newPromotion,
  validatePromotions,
  SERVICE_NAMES,
  WEEKDAY_NAMES,
  type Promotion,
  type PromoService,
} from '../../lib/promotions';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function PromotionForm({
  draft,
  others,
  onSave,
  onCancel,
}: {
  draft: Promotion;
  others: Promotion[];
  onSave: (p: Promotion) => void;
  onCancel: () => void;
}) {
  const [p, setP] = useState(draft);
  let issue = '';
  try {
    validatePromotions([...others, p]);
  } catch (e) {
    issue = e instanceof Error ? e.message : 'Khuyến mãi không hợp lệ';
  }
  const set = (patch: Partial<Promotion>) => setP({ ...p, ...patch });
  const unit = p.services.length === 1 && p.services[0] === 'gdr' ? 'giờ' : 'giờ hoặc người';
  return (
    <div className="promo-form">
      <div className="form-grid">
        <label>
          Tên chương trình
          <input value={p.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label>
          Mô tả ngắn (hiện trên website)
          <input
            value={p.description}
            maxLength={300}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>
        <label>
          Cách giảm
          <select
            value={p.kind}
            onChange={(e) => set({ kind: e.target.value as Promotion['kind'] })}
          >
            <option value="percent">Giảm theo phần trăm</option>
            <option value="amount">Giảm số tiền mỗi {unit}</option>
            <option value="price">Giá ưu đãi cố định mỗi {unit}</option>
          </select>
        </label>
        <label>
          {p.kind === 'percent' ? 'Phần trăm giảm (1–90)' : 'Số tiền (đồng)'}
          <input
            inputMode="numeric"
            value={p.value || ''}
            onChange={(e) => set({ value: Number(e.target.value.replace(/\D/g, '')) })}
          />
        </label>
      </div>
      <fieldset>
        <legend>Dịch vụ (không chọn = tất cả)</legend>
        {(Object.keys(SERVICE_NAMES) as PromoService[]).map((s) => (
          <label key={s} className="check">
            <input
              type="checkbox"
              checked={p.services.includes(s)}
              onChange={() => set({ services: toggle(p.services, s) })}
            />
            {SERVICE_NAMES[s]}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Phòng (không chọn = tất cả)</legend>
        {(['standard', 'vip'] as const).map((r) => (
          <label key={r} className="check">
            <input
              type="checkbox"
              checked={p.rooms.includes(r)}
              onChange={() => set({ rooms: toggle(p.rooms, r) })}
            />
            {r === 'vip' ? 'Phòng VIP' : 'Phòng tiêu chuẩn'}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Ngày trong tuần (không chọn = mỗi ngày)</legend>
        {DAY_ORDER.map((d) => (
          <label key={d} className="check">
            <input
              type="checkbox"
              checked={p.weekdays.includes(d)}
              onChange={() => set({ weekdays: toggle(p.weekdays, d) })}
            />
            {WEEKDAY_NAMES[d]}
          </label>
        ))}
      </fieldset>
      <div className="form-grid">
        <label>
          Từ giờ
          <input
            type="time"
            value={p.from === '24:00' ? '00:00' : p.from}
            onChange={(e) => set({ from: e.target.value || '00:00' })}
          />
        </label>
        <label>
          Đến giờ (để trống = hết ngày)
          <input
            type="time"
            value={p.to === '24:00' ? '' : p.to}
            onChange={(e) => set({ to: e.target.value || '24:00' })}
          />
        </label>
        <label>
          Từ ngày (không bắt buộc)
          <input
            type="date"
            value={p.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </label>
        <label>
          Đến ngày (không bắt buộc)
          <input type="date" value={p.endDate} onChange={(e) => set({ endDate: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={p.auto} onChange={(e) => set({ auto: e.target.checked })} />
        Tự động áp dụng khi đặt và tính tiền (bỏ chọn nếu chỉ hiển thị, nhân viên xác nhận điều kiện
        tại quầy)
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={p.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        Đang chạy
      </label>
      {!issue && p.name.trim() && (
        <p role="status">
          <strong>{benefitText(p)}</strong> · {conditionText(p)}
        </p>
      )}
      {issue && (
        <div className="error-box" role="alert">
          {issue}
        </div>
      )}
      <p>
        <button type="button" className="primary" disabled={!!issue} onClick={() => onSave(p)}>
          Lưu khuyến mãi
        </button>{' '}
        <button type="button" className="secondary" onClick={onCancel}>
          Hủy
        </button>
      </p>
    </div>
  );
}

/** Add, edit, delete and switch promotions on/off. Changes are saved with the settings form. */
export function PromotionsEditor({
  promotions,
  onChange,
}: {
  promotions: Promotion[];
  onChange: (list: Promotion[]) => void;
}) {
  const [editing, setEditing] = useState<Promotion | null>(null);
  const isNew = editing != null && !promotions.some((p) => p.id === editing.id);
  return (
    <div className="promo-editor">
      <h3>Khuyến mãi</h3>
      <p className="muted">
        Chương trình tự động áp dụng khi đặt lịch và tính tiền, đồng thời hiện trên trang chủ và
        trang bảng giá. Mỗi lần chỉ áp dụng một chương trình có giá thấp nhất. Nhớ bấm lưu cài đặt ở
        cuối trang.
      </p>
      <ul className="promo-list">
        {promotions.map((p) => (
          <li key={p.id} className={p.enabled ? '' : 'off'}>
            <div>
              <strong>{p.name}</strong> · {benefitText(p)}
              <br />
              <small>
                {conditionText(p)}
                {p.auto ? '' : ' · chỉ hiển thị'}
                {p.enabled ? '' : ' · đang tắt'}
              </small>
            </div>
            <div>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  onChange(
                    promotions.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)),
                  )
                }
              >
                {p.enabled ? 'Tắt' : 'Bật'}
              </button>{' '}
              <button
                type="button"
                className="secondary icon-only"
                aria-label={`Sửa ${p.name}`}
                title="Sửa"
                onClick={() => setEditing(p)}
              >
                <Pencil size={15} />
              </button>{' '}
              <button
                type="button"
                className="secondary icon-only"
                aria-label={`Xóa ${p.name}`}
                title="Xóa"
                onClick={() => {
                  if (window.confirm(`Xóa khuyến mãi "${p.name}"?`))
                    onChange(promotions.filter((x) => x.id !== p.id));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
        {!promotions.length && <li>Chưa có chương trình khuyến mãi nào.</li>}
      </ul>
      {editing ? (
        <PromotionForm
          key={editing.id}
          draft={editing}
          others={promotions.filter((p) => p.id !== editing.id)}
          onCancel={() => setEditing(null)}
          onSave={(p) => {
            onChange(isNew ? [...promotions, p] : promotions.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
          }}
        />
      ) : (
        <button type="button" className="secondary" onClick={() => setEditing(newPromotion())}>
          <Plus size={15} /> Thêm khuyến mãi
        </button>
      )}
    </div>
  );
}
