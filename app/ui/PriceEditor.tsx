'use client';
import { Fragment, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { money, type Config } from '../../lib/club';
import { validateRules, type PriceRule, type Service, type DayType } from '../../lib/pricing';
const services = {
  gdr: 'Luyện tập · theo giờ',
  '9': '9 hố · trọn lượt',
  '18': '18 hố · trọn lượt',
};
const days = { weekday: 'T2–T6', weekend: 'T7 & CN', holiday: 'Ngày lễ' };
const rooms = { standard: 'Line tiêu chuẩn', vip: 'Phòng VIP' } as const;

export function PriceEditor({
  rules,
  onChange,
}: {
  rules: PriceRule[];
  onChange: (r: PriceRule[]) => void;
}) {
  const [room, setRoom] = useState('all'),
    [service, setService] = useState('all'),
    [day, setDay] = useState('all'),
    [editing, setEditing] = useState<string | null>(null),
    [confirmDel, setConfirmDel] = useState<string | null>(null),
    [folded, setFolded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setFolded((f) => {
      const n = new Set(f);
      if (!n.delete(k)) n.add(k);
      return n;
    });
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
    const id = `rate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    onChange([
      ...rules,
      {
        id,
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
    setEditing(id);
  }
  function remove(id: string) {
    onChange(rules.filter((x) => x.id !== id));
    setConfirmDel(null);
    if (editing === id) setEditing(null);
  }
  const groups = (Object.keys(rooms) as (keyof typeof rooms)[])
    .map((k) => ({
      key: k,
      rows: visible
        .filter((r) => r.room === k)
        .sort(
          (a, b) =>
            a.service.localeCompare(b.service) ||
            Object.keys(days).indexOf(a.day) - Object.keys(days).indexOf(b.day) ||
            a.from.localeCompare(b.from),
        ),
    }))
    .filter((g) => g.rows.length);
  return (
    <div className="price-editor pt">
      <div className="pt-bar">
        <div className="pt-filters">
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
        <button className="primary" type="button" onClick={add} disabled={rules.length >= 300}>
          <Plus size={16} />
          Thêm khung giá
        </button>
      </div>
      {issue && (
        <div className="error-box" role="alert">
          {issue}
        </div>
      )}
      {!groups.length && (
        <p className="muted">
          Chưa có khung giá phù hợp bộ lọc. Dịch vụ chưa có giá sẽ không được đặt.
        </p>
      )}
      {groups.map((g) => (
        <section className="pt-group" key={g.key}>
          <h3>
            {rooms[g.key]} <span>{g.rows.length} khung giá</span>
          </h3>
          <div className="pt-scroll">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Tên khung giá</th>
                  <th>Số người</th>
                  <th>Ngày</th>
                  <th>Khung giờ</th>
                  <th className="num">Đơn giá</th>
                  <th>Trạng thái</th>
                  <th className="act">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => {
                  const gk = `${g.key}:${r.service}`;
                  const shut = folded.has(gk) && editing !== r.id && confirmDel !== r.id;
                  return (
                    <Fragment key={r.id}>
                      {(i === 0 || g.rows[i - 1].service !== r.service) && (
                        <tr className="pt-sub">
                          <td colSpan={7}>
                            <button
                              type="button"
                              aria-expanded={!folded.has(gk)}
                              onClick={() => toggle(gk)}
                            >
                              <ChevronDown size={14} className={folded.has(gk) ? 'shut' : ''} />
                              {services[r.service]}
                              <span>
                                {g.rows.filter((x) => x.service === r.service).length} khung giá
                              </span>
                            </button>
                          </td>
                        </tr>
                      )}
                      <tr
                        hidden={shut}
                        className={(r.enabled ? '' : 'off ') + (editing === r.id ? 'open' : '')}
                      >
                        <td>
                          <strong>{r.label}</strong>
                        </td>
                        <td>{r.people ? `${r.people} người` : '—'}</td>
                        <td>{days[r.day]}</td>
                        <td>
                          {r.from}–{r.to}
                        </td>
                        <td className="num">
                          {money(r.amount)}
                          <small>{r.service === 'gdr' ? ' /giờ' : ' /nhóm'}</small>
                        </td>
                        <td>
                          <span className={'pt-state ' + (r.enabled ? 'on' : 'off')}>
                            {r.enabled ? 'Áp dụng' : 'Tạm tắt'}
                          </span>
                        </td>
                        <td className="act">
                          {confirmDel === r.id ? (
                            <>
                              <button
                                type="button"
                                className="pt-danger"
                                onClick={() => remove(r.id)}
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => setConfirmDel(null)}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="secondary"
                                aria-label={`Sửa ${r.label}`}
                                onClick={() => setEditing(editing === r.id ? null : r.id)}
                              >
                                <Pencil size={14} />
                                {editing === r.id ? 'Đóng' : 'Sửa'}
                              </button>
                              <button
                                type="button"
                                className="secondary pt-del"
                                aria-label={`Xóa ${r.label}`}
                                onClick={() => setConfirmDel(r.id)}
                              >
                                <Trash2 size={14} />
                                Xóa
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {editing === r.id && (
                        <tr className="pt-edit">
                          <td colSpan={7}>
                            <div className="pt-fields">
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
                                    update(r.id, {
                                      service: s,
                                      people: s === 'gdr' ? null : (r.people ?? 1),
                                    });
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
                                  onChange={(e) =>
                                    update(r.id, { room: e.target.value as PriceRule['room'] })
                                  }
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
                                    onChange={(e) =>
                                      update(r.id, { people: Number(e.target.value) })
                                    }
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
                                  onChange={(e) =>
                                    update(r.id, { enabled: e.target.value === 'on' })
                                  }
                                >
                                  <option value="on">Áp dụng</option>
                                  <option value="off">Tạm tắt</option>
                                </select>
                              </label>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="form-note">
        Giá trọn lượt tính theo giờ bắt đầu đã đặt. Quy tắc ngày lễ ưu tiên hơn thứ trong tuần.
        Khung qua đêm áp dụng theo ngày lịch Việt Nam của từng phút. Các khung cùng dịch
        vụ/phòng/nhóm/ngày không được chồng nhau. Nhớ lưu cài đặt sau khi thêm, sửa hoặc xóa.
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
        kiến gồm VAT và phí. Luyện tập tính theo thời gian thực; 9/18 hố trọn lượt.
      </p>
    </div>
  );
}
