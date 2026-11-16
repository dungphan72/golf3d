'use client';
import { Fragment, useState, useEffect } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { money, type Config } from '../../lib/club';
import { validateRules, type PriceRule, type Service, type DayType } from '../../lib/pricing';

const services = {
  gdr: 'Luyện tập · theo giờ',
  '9': '9 hố · trọn lượt',
  '18': '18 hố · trọn lượt',
};
const days = { weekday: 'Thứ 2 – Thứ 6', weekend: 'Thứ 7 & Chủ nhật', holiday: 'Ngày lễ' };
const rooms = { standard: 'Line tiêu chuẩn', vip: 'Phòng VIP' } as const;

/** 9/18 holes: "1 người" is the price of one person; N ≥ 2 is a special price for that whole group. */
const unitLabel = (r: PriceRule) =>
  r.service === 'gdr' ? '/giờ' : (r.people ?? 1) <= 1 ? '/người' : `/nhóm ${r.people} người`;

export function PriceEditor({
  rules,
  onChange,
}: {
  rules: PriceRule[];
  onChange: (r: PriceRule[]) => void;
}) {
  const [room, setRoom] = useState('all');
  const [service, setService] = useState('all');
  const [day, setDay] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [folded, setFolded] = useState<Set<string>>(new Set());

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

  function add(prefill?: { room?: 'standard' | 'vip'; service?: Service }) {
    const id = `rate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const nextRoom = (prefill?.room ?? (room === 'all' ? 'standard' : room)) as 'standard' | 'vip';
    const nextService = (prefill?.service ?? (service === 'all' ? 'gdr' : service)) as Service;
    onChange([
      ...rules,
      {
        id,
        label: 'Khung giá mới',
        service: nextService,
        room: nextRoom,
        day: (day === 'all' ? 'weekday' : day) as DayType,
        from: '08:00',
        to: '11:00',
        people: nextService === '9' || nextService === '18' ? 1 : null,
        amount: 0,
        enabled: true,
      },
    ]);
    // Make sure the new row is visible: unfold its group and open its editor.
    setFolded((f) => {
      const n = new Set(f);
      n.delete(`${nextRoom}:${nextService}`);
      return n;
    });
    setEditing(id);
  }

  // Bring the row being edited into view (the table can be long).
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(
      () => document.getElementById('pt-edit-' + editing)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      60,
    );
    return () => clearTimeout(t);
  }, [editing]);

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
    <div className="price-editor pt operate-price-editor">
      <div className="operate-filterbar" style={{ padding: '0 0 16px 0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="operate-filter-left">
          <label className="operate-label" style={{ minWidth: '140px' }}>
            Khu vực phòng
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="operate-select"
            >
              <option value="all">Tất cả khu vực</option>
              <option value="standard">Line tiêu chuẩn</option>
              <option value="vip">Phòng VIP</option>
            </select>
          </label>
          <label className="operate-label" style={{ minWidth: '160px' }}>
            Dịch vụ golf
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="operate-select"
            >
              <option value="all">Tất cả dịch vụ</option>
              {Object.entries(services).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="operate-label" style={{ minWidth: '150px' }}>
            Ngày áp dụng
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="operate-select"
            >
              <option value="all">Tất cả các ngày</option>
              {Object.entries(days).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="operate-filter-right">
          <button
            className="primary operate-btn"
            type="button"
            onClick={() => add()}
            disabled={rules.length >= 300}
          >
            <Plus size={16} />
            Thêm khung giá mới
          </button>
        </div>
      </div>

      {issue && (
        <div className="error-box" role="alert" style={{ marginTop: '14px' }}>
          <AlertCircle size={16} /> {issue}
        </div>
      )}

      {!groups.length && (
        <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
          Chưa có khung giá phù hợp bộ lọc. Dịch vụ chưa có giá sẽ không thể mở phiên hoặc đặt lịch.
        </p>
      )}

      {groups.map((g) => (
        <section className="pt-group" key={g.key} style={{ marginTop: '20px' }}>
          <h3 className="section-title" style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{rooms[g.key]}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge" style={{ fontSize: '12px' }}>{g.rows.length} khung giá</span>
              <button
                type="button"
                className="secondary"
                disabled={rules.length >= 300}
                onClick={() => add({ room: g.key as 'standard' | 'vip' })}
              >
                <Plus size={14} /> Thêm khung giá
              </button>
            </span>
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
                              className="secondary"
                              style={{ float: 'right' }}
                              disabled={rules.length >= 300}
                              onClick={() => add({ room: g.key as 'standard' | 'vip', service: r.service })}
                            >
                              <Plus size={13} /> Thêm
                            </button>
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
                          <small>{' ' + unitLabel(r)}</small>
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
                        <tr className="pt-edit" id={`pt-edit-${r.id}`}>
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
                                Đơn giá (₫) {unitLabel(r).replace('/', '/ ')}
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
                                  <small>
                                    1 người = đơn giá mỗi người (nhóm N người trả N × đơn giá). Chọn 2–4
                                    người chỉ khi nhóm đó có giá trọn nhóm riêng.
                                  </small>
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
                <small>{unitLabel(r)}</small>
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
