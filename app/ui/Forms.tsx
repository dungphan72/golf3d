'use client';
import { useEffect, useState } from 'react';
import { Flag, Check, ArrowRight, Save, Crown, Clock, Users, Calendar, Award } from 'lucide-react';
import { DialogHeading, ModalDialog } from './kit';
import { planBooking } from '../../lib/booking';
import { PriceEditor } from './PriceEditor';
import { CallQrSheet } from './CallQrSheet';
import { OffersField } from './OffersField';
import { PromotionsEditor } from './PromotionsEditor';
import { DEFAULT_BENEFITS } from '../../lib/member-benefits';
import { type Service } from '../../lib/pricing';
import { rooms, ready, money, type Config } from '../../lib/club';
import { MemberSelector } from './MemberSelector';

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
  initialCustomer,
  initialPhone,
}: {
  initialRoom: string;
  initialCustomer?: string;
  initialPhone?: string;
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
    [minutes, setMinutes] = useState(60),
    [customer, setCustomer] = useState(initialCustomer ?? ''),
    [phone, setPhone] = useState(initialPhone ?? '');

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

  // Quick jump time helper (adds minutes to current start)
  function adjustTime(addMinutes: number) {
    const curr = Date.parse(start + ':00+07:00') || Date.now();
    const target = curr + addMinutes * 60_000;
    setStart(new Date(target + 7 * 3600000).toISOString().slice(0, 16));
  }

  return (
    <ModalDialog label="Tạo lịch đặt" onClose={onClose}>
      <DialogHeading onClose={onClose} eyebrow="LỄ TÂN & ĐẶT LỊCH">
        Tạo lịch đặt
      </DialogHeading>

      <form
        className="operate-booking-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const finalCustomer = String(f.get('customer') || customer || 'Khách đặt lịch');
          const finalPhone = String(f.get('phone') || phone || '');

          onSave({
            room,
            service,
            expectedRevision: config.pricingRevision,
            start: Date.parse(start + ':00+07:00'),
            people,
            minutes,
            customer: finalCustomer,
            phone: finalPhone,
          });
        }}
      >
        {!ready(config) && (
          <div className="info-strip">
            Cần hoàn tất giờ mở cửa, sức chứa, VAT và phí dịch vụ trong Cài đặt trước khi tạo lịch.
          </div>
        )}

        {/* 1. KHÁCH HÀNG & HỘI VIÊN */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">01</span>
            <h3 className="section-title">Khách hàng & Hội viên</h3>
          </div>
          <MemberSelector
            customer={customer}
            phone={phone}
            allowWalkIn={false}
            required={true}
            onChange={(c, p) => {
              setCustomer(c);
              setPhone(p);
            }}
          />
        </div>

        {/* 2. CHỌN LINE / PHÒNG */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">02</span>
            <h3 className="section-title">Chọn không gian (Line / Phòng)</h3>
          </div>
          <div className="room-picker operate-room-picker">
            {rooms.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setRoom(r.id)}
                className={`room-picker-btn ${room === r.id ? 'chosen' : ''} ${r.vip ? 'vip' : ''}`}
              >
                <div className="r-btn-top">
                  {r.vip ? <Crown size={14} className="text-amber" /> : <Flag size={14} />}
                  <strong>{r.name}</strong>
                  {room === r.id && <Check size={14} className="check-icon" />}
                </div>
                <div className="r-btn-tags">
                  {r.vip && <span className="tag-vip">VIP</span>}
                  {r.left && <span className="tag-left">Tay trái</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. DỊCH VỤ & THỜI GIAN */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">03</span>
            <h3 className="section-title">Dịch vụ & Thời gian chơi</h3>
          </div>

          <div className="service-cards-grid">
            <button
              type="button"
              className={`service-card ${service === 'gdr' ? 'selected' : ''}`}
              onClick={() => setService('gdr')}
            >
              <div className="service-card-top">
                <Clock size={16} />
                <strong>Luyện tập GDR</strong>
              </div>
              <span className="service-desc">Tính cước theo giờ linh hoạt</span>
            </button>

            <button
              type="button"
              className={`service-card ${service === '9' ? 'selected' : ''}`}
              onClick={() => setService('9')}
            >
              <div className="service-card-top">
                <Flag size={16} />
                <strong>Game 9 hố</strong>
              </div>
              <span className="service-desc">Theo lượt 9 hố tiêu chuẩn</span>
            </button>

            <button
              type="button"
              className={`service-card ${service === '18' ? 'selected' : ''}`}
              onClick={() => setService('18')}
            >
              <div className="service-card-top">
                <Award size={16} />
                <strong>Game 18 hố</strong>
              </div>
              <span className="service-desc">Theo lượt 18 hố trọn gói</span>
            </button>
          </div>

          <div className="booking-datetime-grid">
            <label className="datetime-field">
              <span className="field-title">
                <Calendar size={14} /> Ngày, giờ bắt đầu (Việt Nam) *
              </span>
              <input
                type="datetime-local"
                step="900"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
              <div className="quick-time-presets">
                <button type="button" onClick={() => adjustTime(15)}>+15 phút</button>
                <button type="button" onClick={() => adjustTime(30)}>+30 phút</button>
                <button type="button" onClick={() => adjustTime(60)}>+1 giờ</button>
              </div>
            </label>

            <div className="specs-inputs-grid">
              <div className="spec-group">
                <label className="spec-label">
                  <Users size={14} /> Số người chơi:
                </label>
                <div className="spec-btn-group">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`btn-spec-pill ${people === n ? 'active' : ''}`}
                      onClick={() => setPeople(n)}
                    >
                      {n} người
                    </button>
                  ))}
                </div>
              </div>

              {service === 'gdr' && (
                <div className="spec-group">
                  <label className="spec-label">
                    <Clock size={14} /> Thời lượng giữ chỗ:
                  </label>
                  <div className="spec-btn-group">
                    {[60, 90, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`btn-spec-pill ${minutes === m ? 'active' : ''}`}
                        onClick={() => setMinutes(m)}
                      >
                        {m} phút
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. BÁO GIÁ DỰ KIẾN TRƯỚC KHI XÁC NHẬN */}
        <div className="booking-estimate operate-estimate-card" aria-live="polite">
          <div className="estimate-header">
            <h3>Báo giá trước khi xác nhận</h3>
            {estimate && <span className="estimate-rule-tag">{estimate.ruleLabel}</span>}
          </div>

          {estimate ? (
            <div className="estimate-body">
              <p className="estimate-note">
                {service === 'gdr'
                  ? 'Ước tính theo thời lượng giữ chỗ; thanh toán theo thời gian thực tế.'
                  : `Giá trọn lượt theo giờ đã chọn · ${estimate.ruleLabel}`}
              </p>

              <div className="estimate-lines">
                {estimate.bill.lines.map((line, i) => (
                  <div key={i} className="estimate-line-row">
                    <span>
                      {line.label} · {line.minutes.toFixed(1)} phút × {money(line.rate)}/giờ
                    </span>
                    <strong>{money(line.amount)}</strong>
                  </div>
                ))}
                <div className="estimate-line-row subtotal">
                  <span>Tiền dịch vụ</span>
                  <strong>{money(estimate.bill.subtotal)}</strong>
                </div>
                <div className="estimate-line-row fee">
                  <span>
                    Phí dịch vụ (
                    {config.feeMode === 'fixed' ? money(config.fee ?? 0) : `${config.fee ?? 0}%`})
                  </span>
                  <strong>{money(estimate.bill.fee)}</strong>
                </div>
                <div className="estimate-line-row vat">
                  <span>VAT ({config.vat ?? 0}%)</span>
                  <strong>{money(estimate.bill.vat)}</strong>
                </div>
                <div className="estimate-total-row">
                  <span>Tổng dự kiến</span>
                  <strong>{money(estimate.bill.total)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <p role="status" className="estimate-error">{estimateError}</p>
          )}
        </div>

        <div className="form-footer operate-modal-footer">
          <button className="secondary" type="button" onClick={onClose}>
            Để sau
          </button>
          <button className="primary btn-confirm-booking" disabled={busy || !ready(config) || !estimate}>
            {busy ? 'Đang lưu…' : 'Xác nhận lịch đặt'}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
export type SettingsTab = 'facility' | 'price' | 'promo' | 'booking' | 'payment';
export function SettingsForm({
  config,
  busy,
  tab,
  onSave,
}: {
  config: Config;
  busy: boolean;
  tab: SettingsTab;
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
      {tab === 'facility' && (
        <>
          <section className="settings-section">
            <div>
              <h2>Thông tin & giờ hoạt động</h2>
              <p>
                Giờ theo múi giờ Việt Nam. Giờ đóng nhỏ hơn giờ mở được hiểu là hoạt động qua đêm.
              </p>
            </div>
            <div className="form-grid">
              <label>
                Tên cơ sở
                <input
                  value={c.name}
                  required
                  onChange={(e) => setC({ ...c, name: e.target.value })}
                />
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
        </>
      )}
      {tab === 'price' && (
        <>
          <section className="settings-section">
            <div>
              <h2>VAT và phí dịch vụ</h2>
              <p>
                Phí tính một lần cho mỗi phiên. VAT tính trên tiền dịch vụ cộng phí. Mọi khoản đều
                được hiển thị trước khi xác nhận.
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
                    ['gdr', 'Luyện tập'],
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
              <h2>Khung giá theo lịch</h2>
              <p>
                Tách ngày thường, cuối tuần và ngày lễ; giá riêng theo loại phòng và số người. Chỉ
                lịch đặt mới dùng giá mới, phiên cũ giữ bản giá đã xác nhận.
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
                <small>
                  Ngày dạng YYYY-MM-DD, cách nhau dấu phẩy. Không tự suy đoán lịch nghỉ lễ.
                </small>
              </label>
            </div>
            <PriceEditor
              rules={c.priceRules ?? []}
              onChange={(priceRules) => setC({ ...c, priceRules })}
            />
          </section>
        </>
      )}
      {tab === 'promo' && (
        <>
          <section className="settings-section">
            <div>
              <h2>Khuyến mãi và quyền lợi hội viên</h2>
              <p>Khuyến mãi tự áp vào báo giá và phiếu, đồng thời hiện trên trang chủ.</p>
            </div>
            <PromotionsEditor
              promotions={c.promotions ?? []}
              onChange={(promotions) => setC({ ...c, promotions })}
            />
            <OffersField
              offers={c.memberBenefits ?? DEFAULT_BENEFITS}
              onChange={(memberBenefits) => setC({ ...c, memberBenefits })}
              label="Quyền lợi hội viên (hiện trên trang thẻ hội viên)"
              placeholder="Mỗi dòng một quyền lợi: Tiêu đề | Mô tả"
              hint="Ví dụ: Gửi gậy miễn phí | Gửi bộ gậy tại câu lạc bộ, không tính phí. Để trống nếu không muốn hiện mục này."
              max={12}
            />
          </section>
        </>
      )}
      {tab === 'booking' && (
        <>
          <section className="settings-section">
            <div>
              <h2>Giữ phòng 9 & 18 hố</h2>
              <p>
                Thời lượng theo số người để xếp lịch, không phải giới hạn tính tiền. Cộng thêm biên
                độ dự phòng bên dưới.
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
              <h2>Khoảng đệm & chính sách</h2>
              <p>
                Các mốc khách online sẽ áp dụng khi mở cổng golfer. Nhân viên bản thử được đặt trước
                tối đa 90 ngày.
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
                      : 'Sẵn sàng: khách đặt lịch tại /book/' +
                        c.onlineSlug +
                        ' và trên trang chủ.'}
                </p>
              )}
            </div>
          </section>
          {c.onlineEnabled && c.onlineSlug && !onlineMissing(c).length && (
            <section className="settings-section">
              <div>
                <h2>Chuông gọi phục vụ</h2>
                <p>
                  Khách quét mã QR tại line để gọi nhân viên. Yêu cầu hiện ở Lịch đặt → Yêu cầu hỗ
                  trợ kèm âm chuông; bật thông báo đẩy ở đó để điện thoại nhân viên báo ngay cả khi
                  khóa màn hình. Lưu cấu hình trước khi in mã.
                </p>
              </div>
              <CallQrSheet slug={c.onlineSlug} />
            </section>
          )}
        </>
      )}
      {tab === 'payment' && (
        <>
          <section className="settings-section">
            <div>
              <h2>Tài khoản nhận tiền</h2>
              <p>Dùng để tạo mã QR chuyển khoản trên phiếu thanh toán.</p>
            </div>
            <div className="form-grid">
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
            </div>
          </section>
        </>
      )}
      <div className="form-footer sticky-save">
        <span>
          <ShieldText />
        </span>
        <button className="primary" disabled={busy}>
          <Save size={17} />
          {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
        </button>
      </div>
    </form>
  );
}
function ShieldText() {
  return <small>Thay đổi được lưu vào nhật ký cơ sở.</small>;
}
