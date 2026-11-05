'use client';
import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { money, type Config } from '../../lib/club';
import { validateRules, type PriceRule, type Service, type DayType } from '../../lib/pricing';
const services = { gdr: 'GDR · theo giờ', '9': '9 hố · trọn lượt', '18': '18 hố · trọn lượt' };
const days = { weekday: 'T2–T6', weekend: 'T7 & CN', holiday: 'Ngày lễ' };
export function PriceEditor({
  rules,
  onChange,
}: {
  rules: PriceRule[];
  onChange: (r: PriceRule[]) => void;
}) {
  const [room, setRoom] = useState('all'),
    [service, setService] = useState('all'),
    [day, setDay] = useState('all');
  const visible = rules.filter(
    (r) =>
      (room === 'all' || r.room === room) &&
      (service === 'all' || r.service === service) &&
      (day === 'all' || r.day === day),
  );
  let issue = '';
  try {
    validateRules(rules);
  } catch (e) {
    issue = e instanceof Error ? e.message : 'Bảng giá không hợp lệ';
  }
  function update(id: string, patch: Partial<PriceRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([
      ...rules,
      {
        id: `rate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        label: 'Khung giá mới',
        service: (service === 'all' ? 'gdr' : service) as Service,
        room: (room === 'all' ? 'standard' : room) as 'standard' | 'vip',
        day: (day === 'all' ? 'weekday' : day) as DayType,
        from: '08:00',
        to: '11:00',
        people: service === '9' || service === '18' ? 1 : null,
        amount: 0,
        enabled: true,
      },
    ]);
  }
  return (
    <div className="price-editor">
      <div className="price-filters">
        <label>
          Loại phòng
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="standard">Line tiêu chuẩn</option>
            <option value="vip">VIP</option>
          </select>
        </label>
        <label>
          Dịch vụ
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="all">Tất cả</option>
            {Object.entries(services).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngày áp dụng
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="all">Tất cả</option>
            {Object.entries(days).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {issue && (
        <div className="error-box" role="alert">
          {issue}
        </div>
      )}
      {!visible.length && (
        <p className="muted">
          Chưa có khung giá phù hợp bộ lọc. Dịch vụ chưa có giá sẽ không được đặt.
        </p>
      )}
      <div className="rate-list">
        {visible.map((r) => (
          <details className={'rate-rule ' + (!r.enabled ? 'disabled' : '')} key={r.id}>
            <summary>
              <div>
                <strong>{r.label}</strong>
                <span>
                  {r.room === 'vip' ? 'VIP' : 'Line'} · {services[r.service]}
                  {r.people ? ` · ${r.people} người` : ''}
                </span>
                <small>
                  {days[r.day]} · {r.from}–{r.to}
                  {!r.enabled ? ' · Tắt' : ''}
                </small>
              </div>
              <b>
                {money(r.amount)}
                {r.service === 'gdr' && <small>/giờ</small>}
              </b>
              <ChevronDown size={15} />
            </summary>
            <div className="rate-fields">
              <label>
                Tên khung giá
                <input
                  value={r.label}
                  maxLength={80}
                  onChange={(e) => update(r.id, { label: e.target.value })}
                  required
                />
              </label>
              <label>
                Dịch vụ
                <select
                  value={r.service}
                  onChange={(e) => {
                    const s = e.target.value as Service;
                    update(r.id, { service: s, people: s === 'gdr' ? null : (r.people ?? 1) });
                  }}
                >
                  {Object.entries(services).map(([v, t]) => (
                    <option value={v} key={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Loại phòng
                <select
                  value={r.room}
                  onChange={(e) => update(r.id, { room: e.target.value as PriceRule['room'] })}
                >
                  <option value="standard">Line tiêu chuẩn</option>
                  <option value="vip">VIP</option>
                </select>
              </label>
              <label>
                Ngày áp dụng
                <select
                  value={r.day}
                  onChange={(e) => update(r.id, { day: e.target.value as DayType })}
                >
                  {Object.entries(days).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Từ giờ
                <input
                  type="time"
                  value={r.from}
                  required
                  onChange={(e) => update(r.id, { from: e.target.value })}
                />
              </label>
              <label>
                Đến giờ (24:00 = cuối ngày)
                <input
                  value={r.to}
                  required
                  placeholder="24:00"
                  pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00"
                  onChange={(e) => update(r.id, { to: e.target.value })}
                />
              </label>
              <label>
                Đơn giá (₫){r.service === 'gdr' ? ' / giờ' : ' / cả nhóm'}
                <input
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  value={r.amount}
                  onChange={(e) => update(r.id, { amount: Number(e.target.value) })}
                  required
                />
              </label>
              {r.service !== 'gdr' && (
                <label>
                  Số người
                  <select
                    value={r.people ?? 1}
                    onChange={(e) => update(r.id, { people: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option value={n} key={n}>
                        {n} người
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Trạng thái
                <select
                  value={r.enabled ? 'on' : 'off'}
                  onChange={(e) => update(r.id, { enabled: e.target.value === 'on' })}
                >
                  <option value="on">Áp dụng</option>
                  <option value="off">Tạm tắt</option>
                </select>
              </label>
              <button
                className="delete-rule secondary"
                type="button"
                onClick={() => onChange(rules.filter((x) => x.id !== r.id))}
              >
                <Trash2 size={14} />
                Xóa khung giá
              </button>
            </div>
          </details>
        ))}
      </div>
      <button className="secondary" type="button" onClick={add} disabled={rules.length >= 300}>
        <Plus size={16} />
        Thêm khung giá
      </button>
      <p className="form-note">
        Giá trọn lượt tính theo giờ bắt đầu đã đặt. Quy tắc ngày lễ ưu tiên hơn thứ trong tuần.
        Khung qua đêm áp dụng theo ngày lịch Việt Nam của từng phút. Các khung cùng dịch
        vụ/phòng/nhóm/ngày không được chồng nhau.
      </p>
    </div>
  );
}

export function TariffPreview({ config }: { config: Config }) {
  const [service, setService] = useState<Service>('gdr');
  const rules = (config.priceRules ?? []).filter((r) => r.enabled && r.service === service);
  return (
    <div className="tariff-preview">
      <div className="tabs">
        {Object.entries(services).map(([v, t]) => (
          <button
            type="button"
            key={v}
            onClick={() => setService(v as Service)}
            className={v === service ? 'active' : ''}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="tariff-list">
        {rules.length ? (
          rules.map((r) => (
            <article key={r.id}>
              <div>
                <strong>
                  {r.room === 'vip' ? 'Phòng VIP' : 'Line tiêu chuẩn'}
                  {r.people ? ` · ${r.people} người` : ''}
                </strong>
                <span>
                  {days[r.day]} · {r.from}–{r.to}
                </span>
                <small>{r.label}</small>
              </div>
              <b>
                {money(r.amount)}
                <small>{r.service === 'gdr' ? '/ giờ' : '/ cả nhóm'}</small>
              </b>
            </article>
          ))
        ) : (
          <p className="muted">Dịch vụ này chưa được cấu hình bảng giá.</p>
        )}
      </div>
      <p className="form-note">
        Ngày lễ chỉ áp dụng cho các ngày chủ cơ sở đã khai báo. Vui lòng chọn lịch để xem tổng dự
        kiến gồm VAT và phí. GDR tính theo thời gian thực; 9/18 hố trọn lượt.
      </p>
    </div>
  );
}
