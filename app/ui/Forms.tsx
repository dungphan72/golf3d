'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Flag, Check, ArrowRight, Save, Info } from 'lucide-react';
import { planBooking } from '../../lib/booking';
import { PriceEditor } from './PriceEditor';
import { OffersField } from './OffersField';
import { type Service } from '../../lib/pricing';
import { rooms, ready, money, type Config } from '../../lib/club';
/** What still blocks online booking (the public page quotes prices with VAT and service fee). */
const onlineMissing = (c: Config) =>
  [
    !c.open || !c.close ? 'giờ mở/đóng cửa' : '',
    !c.capacity ? 'số line tiêu chuẩn' : '',
    !c.vipCapacity ? 'số phòng VIP' : '',
    c.vat == null ? 'VAT' : '',
    c.fee == null ? 'phí dịch vụ' : '',
  ].filter(Boolean);
export function BookingForm({
  config,
  busy,
  onClose,
  onSave,
  initialRoom,
}: {
  initialRoom: string;
  config: Config;
  busy: boolean;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [local] = useState(() => {
    const next = Math.ceil((Date.now() + 60000) / 900000) * 900000;
    return new Date(next + 7 * 3600000).toISOString().slice(0, 16);
  });
  const [room, setRoom] = useState(initialRoom),
    [service, setService] = useState('gdr'),
    [start, setStart] = useState(local),
    [people, setPeople] = useState(1),
    [minutes, setMinutes] = useState(60);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  let estimate: ReturnType<typeof planBooking> | null = null,
    estimateError = '';
  try {
    estimate = planBooking(
      {
        room,
        service: service as Service,
        start: Date.parse(start + ':00+07:00'),
        people,
        minutes,
      },
      config,
      // eslint-disable-next-line react-hooks/purity -- quote is relative to the current time
      Date.now(),
    );
  } catch (e) {
    estimateError = e instanceof Error ? e.message : 'Chưa có báo giá';
  }
  return (
    <dialog className="native-dialog" ref={ref} onCancel={onClose}>
      <section className="modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">MỘT TRẢI NGHIỆM MỚI</span>
            <h2>Tạo lịch đặt</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              room,
              service,
              expectedRevision: config.pricingRevision,
              start: Date.parse(start + ':00+07:00'),
              people,
              minutes,
              customer: f.get('customer'),
              phone: f.get('phone'),
            });
          }}
        >
          {!ready(config) && (
            <div className="info-strip">
              Cần hoàn tất giờ mở cửa, sức chứa, VAT và phí dịch vụ trong Cài đặt trước khi tạo
              lịch.
            </div>
          )}
          <h3 className="form-label">01 / Chọn không gian</h3>
          <div className="room-picker">
            {rooms.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setRoom(r.id)}
                className={room === r.id ? 'chosen' : ''}
              >
                <Flag size={15} />
                {r.name}
                {r.left && <small>Tay trái</small>}
                {room === r.id && <Check size={14} />}
              </button>
            ))}
          </div>
          <h3 className="form-label">02 / Lịch chơi</h3>
          <div className="form-grid">
            <label>
              Dịch vụ
              <select value={service} onChange={(e) => setService(e.target.value)}>
                <option value="gdr">Luyện tập GDR</option>
                <option value="9">Chơi 9 hố</option>
                <option value="18">Chơi 18 hố</option>
              </select>
            </label>
            <label>
              Ngày, giờ bắt đầu (Việt Nam)
              <input
                type="datetime-local"
                step="900"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              Số người
              <select value={people} onChange={(e) => setPeople(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} người
                  </option>
                ))}
              </select>
            </label>
            {service === 'gdr' && (
              <label>
                Thời lượng giữ chỗ
                <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                  {[60, 90, 120, 150, 180, 210, 240].map((n) => (
                    <option key={n} value={n}>
                      {n} phút
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="booking-estimate" aria-live="polite">
            <h3>Báo giá trước khi xác nhận</h3>
            {estimate ? (
              <>
                <p>
                  {service === 'gdr'
                    ? 'Ước tính theo thời lượng giữ chỗ; thanh toán theo thời gian thực tế.'
                    : `Giá trọn lượt theo giờ đã chọn · ${estimate.ruleLabel}`}
                </p>
                {estimate.bill.lines.map((line, i) => (
                  <div key={i}>
                    <span>
                      {line.label} · {line.minutes.toFixed(1)} phút × {money(line.rate)}/giờ
                    </span>
                    <strong>{money(line.amount)}</strong>
                  </div>
                ))}
                <div>
                  <span>Tiền dịch vụ</span>
                  <strong>{money(estimate.bill.subtotal)}</strong>
                </div>
                <div>
                  <span>
                    Phí dịch vụ (
                    {config.feeMode === 'fixed' ? money(config.fee ?? 0) : `${config.fee ?? 0}%`})
                  </span>
                  <strong>{money(estimate.bill.fee)}</strong>
                </div>
                <div>
                  <span>VAT ({config.vat ?? 0}%)</span>
                  <strong>{money(estimate.bill.vat)}</strong>
                </div>
                <div className="estimate-total">
                  <span>Tổng dự kiến</span>
                  <strong>{money(estimate.bill.total)}</strong>
                </div>
                <small>
                  Đơn giá tính chính xác đến thời gian thực, làm tròn tiền đến 1 đồng. VAT tính sau
                  phí dịch vụ.
                </small>
              </>
            ) : (
              <p role="status">{estimateError}</p>
            )}
          </div>
          <h3 className="form-label">03 / Thông tin khách</h3>
          <div className="form-grid">
            <label>
              Họ và tên
              <input
                name="customer"
                placeholder="Tên khách hàng"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label>
              Số điện thoại
              <input name="phone" type="tel" placeholder="+84…" required />
            </label>
          </div>
          <p className="form-note">
            Nhân viên tạo lịch trong bản thử nội bộ. Đặt online bắt buộc đăng nhập golfer sẽ được mở
            sau khi kết nối OTP. Lịch và giá được kiểm tra lại trên máy chủ.
          </p>
          <div className="form-footer">
            <button className="secondary" type="button" onClick={onClose}>
              Để sau
            </button>
            <button className="primary" disabled={busy || !ready(config) || !estimate}>
              {busy ? 'Đang lưu…' : 'Xác nhận lịch đặt'}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
      </section>
    </dialog>
  );
}
export function SettingsForm({
  config,
  busy,
  onSave,
}: {
  config: Config;
  busy: boolean;
  onSave: (c: Config) => Promise<boolean>;
}) {
  const [c, setC] = useState(config);
  const [holidayText, setHolidayText] = useState((config.holidays ?? []).join(', '));
  const signature = JSON.stringify(config);
  useEffect(() => {
    const next = JSON.parse(signature);
    /* eslint-disable react-hooks/set-state-in-effect -- re-sync editable copy when saved config changes */
    setC(next);
    setHolidayText((next.holidays ?? []).join(', '));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [signature]);
  function num(key: keyof Config, value: string) {
    setC({ ...c, [key]: value === '' ? null : Number(value) });
  }
  const numberField = (key: keyof Config, label: string, nullable = false) => (
    <label key={key}>
      {label}
      <input
        type="number"
        min="0"
        step="any"
        value={c[key] == null ? '' : String(c[key])}
        onChange={(e) => num(key, e.target.value)}
        placeholder={nullable ? 'Chưa cấu hình' : ''}
        required={!nullable}
      />
    </label>
  );
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(c);
      }}
    >
      <div className="info-strip">
        <Info size={17} />
        Chưa mở nhận khách công khai. Giá tham khảo từ website cũ; các ô trống cần chủ cơ sở xác
        nhận.
      </div>
      <section className="settings-section">
        <div>
          <span className="eyebrow">01 / CƠ SỞ</span>
          <h2>Thông tin & giờ hoạt động</h2>
          <p>Giờ theo múi giờ Việt Nam. Giờ đóng nhỏ hơn giờ mở được hiểu là hoạt động qua đêm.</p>
        </div>
        <div className="form-grid">
          <label>
            Tên cơ sở
            <input value={c.name} required onChange={(e) => setC({ ...c, name: e.target.value })} />
          </label>
          <label>
            Địa chỉ
            <input
              value={c.address}
              required
              onChange={(e) => setC({ ...c, address: e.target.value })}
            />
          </label>
          <label>
            Giờ mở cửa
            <input
              type="time"
              value={c.open}
              required
              onChange={(e) => setC({ ...c, open: e.target.value })}
            />
          </label>
          <label>
            Giờ đóng cửa
            <input
              type="time"
              value={c.close}
              required
              onChange={(e) => setC({ ...c, close: e.target.value })}
            />
          </label>
          {numberField('capacity', 'Sức chứa line tiêu chuẩn', true)}
          {numberField('vipCapacity', 'Sức chứa VIP', true)}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <span className="eyebrow">02 / THUẾ & PHÍ</span>
          <h2>VAT và phí dịch vụ</h2>
          <p>
            Phí tính một lần cho mỗi phiên. VAT tính trên tiền dịch vụ cộng phí. Mọi khoản đều được
            hiển thị trước khi xác nhận.
          </p>
        </div>
        <div className="form-grid">
          {numberField('vat', 'VAT (%) · nhập 0 nếu không thu', true)}
          <label>
            Loại phí dịch vụ
            <select
              value={c.feeMode ?? 'percent'}
              onChange={(e) =>
                setC({ ...c, feeMode: e.target.value as 'percent' | 'fixed', fee: 0 })
              }
            >
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định / phiên (₫)</option>
            </select>
          </label>
          {numberField(
            'fee',
            c.feeMode === 'fixed' ? 'Phí cố định (₫ / phiên)' : 'Phí dịch vụ (%)',
            true,
          )}
          <fieldset className="fee-services">
            <legend>Dịch vụ chịu phí</legend>
            {(
              [
                ['gdr', 'GDR'],
                ['9', '9 hố'],
                ['18', '18 hố'],
              ] as const
            ).map(([service, label]) => (
              <label key={service}>
                <input
                  type="checkbox"
                  checked={(c.feeServices ?? ['gdr', '9', '18']).includes(service)}
                  onChange={(e) => {
                    const current = c.feeServices ?? ['gdr', '9', '18'];
                    setC({
                      ...c,
                      feeServices: e.target.checked
                        ? [...current, service]
                        : current.filter((s) => s !== service),
                    });
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <span className="eyebrow">03 / BẢNG GIÁ</span>
          <h2>Khung giá theo lịch</h2>
          <p>
            Tách ngày thường, cuối tuần và ngày lễ; giá riêng theo loại phòng và số người. Chỉ lịch
            đặt mới dùng giá mới, phiên cũ giữ bản giá đã xác nhận.
          </p>
          <label className="holiday-label">
            Danh sách ngày lễ
            <input
              placeholder="2026-12-25, 2027-01-01"
              value={holidayText}
              onChange={(e) => {
                setHolidayText(e.target.value);
                setC({
                  ...c,
                  holidays: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
              }}
            />
            <small>Ngày dạng YYYY-MM-DD, cách nhau dấu phẩy. Không tự suy đoán lịch nghỉ lễ.</small>
          </label>
        </div>
        <PriceEditor
          rules={c.priceRules ?? []}
          onChange={(priceRules) => setC({ ...c, priceRules })}
        />
        <OffersField offers={c.offers ?? []} onChange={(offers) => setC({ ...c, offers })} />
      </section>
      <section className="settings-section">
        <div>
          <span className="eyebrow">03B / THỜI LƯỢNG</span>
          <h2>Giữ phòng 9 & 18 hố</h2>
          <p>
            Thời lượng theo số người để xếp lịch, không phải giới hạn tính tiền. Cộng thêm biên độ
            dự phòng bên dưới.
          </p>
        </div>
        <div>
          {(['holeMinutes9', 'holeMinutes18'] as const).map((key) => (
            <div className="package-row" key={key}>
              <strong>{key === 'holeMinutes9' ? '9 hố (phút)' : '18 hố (phút)'}</strong>
              <div className="four-cols">
                {c[key].map((v, i) => (
                  <label key={i}>
                    {i + 1} người
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={v}
                      onChange={(e) => {
                        const a = [...c[key]];
                        a[i] = Number(e.target.value);
                        setC({ ...c, [key]: a });
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <span className="eyebrow">04 / ĐẶT LỊCH</span>
          <h2>Khoảng đệm & chính sách</h2>
          <p>
            Các mốc khách online sẽ áp dụng khi mở cổng golfer. Nhân viên bản thử được đặt trước tối
            đa 90 ngày.
          </p>
        </div>
        <div className="form-grid">
          {numberField('buffer', 'Dự phòng lượt 9/18 hố (phút)')}
          {numberField('clean', 'Dọn line tiêu chuẩn (phút)')}
          {numberField('vipClean', 'Dọn VIP (phút)')}
          {numberField('days', 'Khách online đặt trước (ngày)')}
          {numberField('grace', 'Giữ chỗ khách muộn (phút)')}
          {numberField('cancelHours', 'Đổi/hủy trước giờ chơi (giờ)')}
          <label>
            Mã BIN ngân hàng nhận tiền (6 số, vd 970436 = Vietcombank)
            <input
              value={c.bankBin ?? ''}
              inputMode="numeric"
              pattern="(\d{6})?"
              onChange={(e) => setC({ ...c, bankBin: e.target.value.trim() })}
            />
          </label>
          <label>
            Số tài khoản nhận tiền
            <input
              value={c.bankAccount ?? ''}
              inputMode="numeric"
              pattern="(\d{6,20})?"
              onChange={(e) => setC({ ...c, bankAccount: e.target.value.trim() })}
            />
          </label>
          <label>
            Tên chủ tài khoản (hiện trên mã QR)
            <input
              value={c.bankHolder ?? ''}
              maxLength={60}
              onChange={(e) => setC({ ...c, bankHolder: e.target.value })}
            />
          </label>
          <label>
            <span>Nhận yêu cầu đặt lịch online</span>
            <input
              type="checkbox"
              checked={!!c.onlineEnabled}
              onChange={(e) => setC({ ...c, onlineEnabled: e.target.checked })}
            />
          </label>
          <label>
            Mã đường dẫn trang đặt lịch (/book/mã)
            <input
              value={c.onlineSlug ?? ''}
              pattern="[a-z0-9][a-z0-9\-]{2,39}"
              placeholder="vd: golf3d-binhtrung"
              onChange={(e) => setC({ ...c, onlineSlug: e.target.value.trim().toLowerCase() })}
            />
          </label>
          {c.onlineEnabled && (
            <p className="form-note" role="status">
              {onlineMissing(c).length
                ? 'Chưa mở được cho khách vì còn thiếu: ' + onlineMissing(c).join(', ') + '.'
                : !c.onlineSlug
                  ? 'Hãy đặt mã đường dẫn để mở trang đặt lịch.'
                  : 'Sẵn sàng: khách đặt lịch tại /book/' + c.onlineSlug + ' và trên trang chủ.'}
            </p>
          )}
        </div>
      </section>
      <div className="form-footer sticky-save">
        <span>
          <ShieldText />
        </span>
        <button className="primary" disabled={busy}>
          <Save size={17} />
          {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
        </button>
      </div>
      <div className="integration-grid">
        {[
          'OTP / Đăng nhập golfer',
          'Chuyển khoản tự động',
          'Zalo OA / SMS / Email',
          'Hóa đơn điện tử',
          'Foresight Sports GC3',
        ].map((t) => (
          <div key={t}>
            <strong>{t}</strong>
            <span>Chưa kết nối · triển khai giai đoạn sau</span>
          </div>
        ))}
      </div>
    </form>
  );
}
function ShieldText() {
  return <small>Thay đổi được lưu vào nhật ký cơ sở.</small>;
}
