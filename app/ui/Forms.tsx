'use client';

import { DEFAULT_TIER_THRESHOLDS } from '../../lib/member-card';
import { useEffect, useState } from 'react';

import { Flag, Check, ArrowRight, Save, Crown, Clock, Users, Calendar, Award, Building2, Printer, QrCode, Smartphone, Sparkles, X, Trash2 } from 'lucide-react';

import { DialogHeading, ModalDialog } from './kit';

import {
  bookingDateTimeLocal,
  latestStaffBookingStart,
  nextBookingStart,
  planBooking,
} from '../../lib/booking';

import { PriceEditor } from './PriceEditor';

import { CallQrSheet } from './CallQrSheet';

import { OffersField } from './OffersField';

import { PromotionsEditor } from './PromotionsEditor';

import { DEFAULT_BENEFITS } from '../../lib/member-benefits';

import { type Service } from '../../lib/pricing';

import { rooms, ready, money, type Config } from '../../lib/club';

import { MemberSelector } from './MemberSelector';



/** What still blocks online booking (the public page quotes prices with VAT and service fee). */



const POPULAR_BANKS = [

  { bin: '970422', code: 'MB', name: 'MBBank (Quân Đội)' },

  { bin: '970436', code: 'VCB', name: 'Vietcombank (Ngoại Thương)' },

  { bin: '970407', code: 'TCB', name: 'Techcombank (Kỹ Thương)' },

  { bin: '970415', code: 'CTG', name: 'VietinBank (Công Thương)' },

  { bin: '970418', code: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển)' },

  { bin: '970416', code: 'ACB', name: 'ACB (Á Châu)' },

  { bin: '970432', code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },

  { bin: '970423', code: 'TPB', name: 'TPBank (Tiên Phong)' },

  { bin: '970403', code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },

  { bin: '970441', code: 'VIB', name: 'VIB (Quốc Tế)' },

  { bin: '970437', code: 'HDB', name: 'HDBank (Phát Triển TP.HCM)' },

  { bin: '970405', code: 'VBA', name: 'Agribank (Nông Nghiệp)' },

  { bin: '970426', code: 'MSB', name: 'MSB (Hàng Hải)' },

  { bin: '970448', code: 'OCB', name: 'OCB (Phương Đông)' },

  { bin: '970428', code: 'NAB', name: 'Nam A Bank' },

  { bin: '970454', code: 'VCCB', name: 'BVBank (Bản Việt)' },

];






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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const [local] = useState(() => bookingDateTimeLocal(nextBookingStart(Date.now())));
  const minStart = bookingDateTimeLocal(nextBookingStart(now));
  const maxStart = bookingDateTimeLocal(latestStaffBookingStart(now));

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

      now,

    );

  } catch (e) {

    estimateError = e instanceof Error ? e.message : 'Chưa có báo giá';

  }



  // Quick jump time helper (adds minutes to current start)
  function adjustTime(addMinutes: number) {
    const curr = Date.parse(start + ':00+07:00');
    const target = Number.isFinite(curr) && curr > now
      ? curr + addMinutes * 60_000
      : nextBookingStart(now);
    setStart(bookingDateTimeLocal(target));

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

                min={minStart}
                max={maxStart}
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



          <section className="settings-section clean-data-section" style={{
            borderTop: '1px solid #fee2e2',
            paddingTop: 24,
            marginTop: 24,
          }}>
            <div>
              <span className="eyebrow" style={{ color: '#dc2626', fontWeight: 600 }}>06 / CHUẨN BỊ VẬN HÀNH (GO-LIVE)</span>
              <h2>Khởi tạo dữ liệu sạch ngày khai trương</h2>
              <p>
                Dọn dẹp sạch toàn bộ các lượt booking thử nghiệm, đơn nước F&B test và reset ca thu ngân về 0đ. Bảng giá, menu đồ uống, tài khoản nhân viên và thông tin ngân hàng được giữ nguyên an toàn 100%.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="secondary"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  background: '#fef2f2',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  const conf = window.prompt('⚠️ CẢNH BÁO: Thao tác này sẽ xóa mọi đơn booking và ca thu ngân thử nghiệm.\n\nNhập "XACNHAN" để làm sạch hệ thống:');
                  if (conf === 'XACNHAN') {
                    try {
                      const r = await fetch('/api/club', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clean-test-data', value: { confirm: 'XACNHAN' } }),
                      });
                      if (r.ok) {
                        alert('✓ Đã làm sạch toàn bộ dữ liệu chạy thử! Hệ thống sẵn sàng cho ngày khai trương.');
                        window.location.reload();
                      } else {
                        const res = (await r.json()) as { error?: string };
                        alert('Lỗi: ' + (res.error || 'Không thể thực hiện'));
                      }
                    } catch (e) {
                      alert('Lỗi kết nối máy chủ');
                    }
                  }
                }}
              >
                <Trash2 size={16} /> Dọn dẹp dữ liệu thử nghiệm (Reset về 0)
              </button>
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

            <fieldset className="tier-settings">
              <legend>Hạng hội viên theo tổng chi tiêu (đồng)</legend>
              <p className="form-note">
                Hạng tính trên tổng khách đã chi: mua gói, nạp ví và thanh toán trực tiếp, trừ tiền hoàn.
                Đạt mốc nào thì lên hạng đó.
              </p>
              <div className="form-grid">
                {(
                  [
                    ['gold', 'Gold từ'],
                    ['platinum', 'Platinum từ'],
                    ['diamond', 'Diamond từ'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      inputMode="numeric"
                      value={String((c.tierThresholds ?? DEFAULT_TIER_THRESHOLDS)[key])}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/\D/g, '')) || 0;
                        setC({
                          ...c,
                          tierThresholds: { ...(c.tierThresholds ?? DEFAULT_TIER_THRESHOLDS), [key]: n },
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

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
                Khách online tự chọn ngày giờ mong muốn; nhân viên kiểm tra và xác nhận. Nhân viên
                tạo lịch thủ công tối đa 90 ngày trước.

              </p>

            </div>

            <div className="form-grid">

              {numberField('buffer', 'Dự phòng lượt 9/18 hố (phút)')}

              {numberField('clean', 'Dọn line tiêu chuẩn (phút)')}

              {numberField('vipClean', 'Dọn VIP (phút)')}

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
                  {!c.onlineSlug
                    ? 'Hãy đặt mã đường dẫn để mở trang đặt lịch.'
                    : 'Khách có thể gửi yêu cầu tại /book/' +
                      c.onlineSlug +
                      '. Nhân viên sẽ kiểm tra giờ hoạt động, tình trạng phòng và báo giá trước khi xác nhận.'}
                </p>
              )}

            </div>

          </section>

          {c.onlineEnabled && c.onlineSlug && (

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

          <section className="settings-section payment-config-card">

            <div>

              <span className="eyebrow" style={{ color: '#025c0a', fontWeight: 600 }}>04 / TÀI KHOẢN NGÂN HÀNG & VIETQR</span>

              <h2>Tài khoản ngân hàng câu lạc bộ</h2>

              <p>

                Thông tin này dùng để sinh mã VietQR động tự động cho từng hóa đơn trên màn hình thu ngân và in trực tiếp lên phiếu in nhiệt K80 gửi khách.

              </p>

            </div>

            <div className="form-grid">

              <label>

                Chọn Ngân hàng thụ hưởng

                <select

                  value={POPULAR_BANKS.some((b) => b.bin === c.bankBin) ? c.bankBin : c.bankBin ? 'custom' : ''}

                  onChange={(e) => {

                    const val = e.target.value;

                    if (val !== 'custom') {

                      setC({ ...c, bankBin: val });

                    }

                  }}

                  style={{ fontWeight: 500 }}

                >

                  <option value="">-- Chọn ngân hàng trong hệ thống NAPAS --</option>

                  {POPULAR_BANKS.map((b) => (

                    <option key={b.bin} value={b.bin}>

                      {b.code} · {b.name} (BIN {b.bin})

                    </option>

                  ))}

                  <option value="custom">Ngân hàng khác (Tự nhập mã BIN)</option>

                </select>

              </label>



              {(!POPULAR_BANKS.some((b) => b.bin === c.bankBin) || c.bankBin === 'custom') && (

                <label>

                  Mã BIN ngân hàng (6 chữ số)

                  <input

                    value={c.bankBin ?? ''}

                    placeholder="Ví dụ: 970436"

                    inputMode="numeric"

                    pattern="(\d{6})?"

                    maxLength={6}

                    onChange={(e) => setC({ ...c, bankBin: e.target.value.trim() })}

                  />

                </label>

              )}



              <label>

                Số tài khoản nhận tiền

                <input

                  value={c.bankAccount ?? ''}

                  inputMode="numeric"

                  placeholder="Nhập số tài khoản ngân hàng..."

                  pattern="(\d{6,20})?"

                  onChange={(e) => setC({ ...c, bankAccount: e.target.value.trim() })}

                  style={{ fontWeight: 600, letterSpacing: '0.5px' }}

                />

              </label>



              <label>

                Tên chủ tài khoản (hiện trên mã VietQR)

                <input

                  value={c.bankHolder ?? ''}

                  placeholder="VD: SAIGON INDOOR GOLF hoặc NGUYEN VAN A"

                  maxLength={60}

                  onChange={(e) => setC({ ...c, bankHolder: e.target.value.toUpperCase() })}

                  style={{ textTransform: 'uppercase' }}

                />

              </label>

            </div>



            {c.bankBin && c.bankAccount && (

              <div className="bank-live-preview-box" style={{

                marginTop: 20,

                padding: '18px 20px',

                borderRadius: 12,

                background: '#f8fafc',

                border: '1px solid #cbd5e1',

                display: 'flex',

                flexWrap: 'wrap',

                gap: 20,

                alignItems: 'center',

              }}>

                <div style={{

                  background: '#ffffff',

                  padding: 10,

                  borderRadius: 10,

                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',

                  border: '1px solid #e2e8f0',

                  textAlign: 'center',

                }}>

                  {/* eslint-disable-next-line @next/next/no-img-element */}

                  <img

                    alt="Mã QR kiểm tra tài khoản"

                    width={160}

                    height={160}

                    src={`https://img.vietqr.io/image/${encodeURIComponent(c.bankBin)}-${encodeURIComponent(c.bankAccount)}-compact2.png?amount=50000&addInfo=TEST%20GOLF3D&accountName=${encodeURIComponent(c.bankHolder || 'SAIGON GOLF')}`}

                    style={{ display: 'block', borderRadius: 6 }}

                  />

                  <small style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 6 }}>

                    Quét thử xác thực

                  </small>

                </div>

                <div style={{ flex: 1, minWidth: 240 }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#025c0a', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>

                    <Smartphone size={18} />

                    <span>Mã VietQR kiểm tra tài khoản</span>

                  </div>

                  <p style={{ margin: '0 0 6px 0', fontSize: 14 }}>

                    <strong>Ngân hàng:</strong> {POPULAR_BANKS.find((b) => b.bin === c.bankBin)?.name || `Mã BIN ${c.bankBin}`}

                  </p>

                  <p style={{ margin: '0 0 6px 0', fontSize: 14 }}>

                    <strong>Số tài khoản:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{c.bankAccount}</code>

                  </p>

                  <p style={{ margin: '0 0 10px 0', fontSize: 14 }}>

                    <strong>Chủ tài khoản:</strong> {c.bankHolder || '(Chưa nhập)'}

                  </p>

                  <div style={{ fontSize: 13, color: '#475569', background: '#e0f2fe', padding: '8px 12px', borderRadius: 6, border: '1px solid #bae6fd' }}>

                    💡 <strong>Mẹo kiểm tra:</strong> Hãy mở App ngân hàng trên điện thoại quét thử mã QR này xem đúng tên chủ tài khoản và số tài khoản chưa trước khi bấm Lưu cấu hình.

                  </div>

                </div>

              </div>

            )}



            <div style={{

              marginTop: 20,

              padding: '16px 20px',

              borderRadius: 10,

              background: '#f0fdf4',

              border: '1px solid #bbf7d0',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between',

              gap: 16,

              flexWrap: 'wrap',

            }}>

              <div>

                <strong style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>

                  <Printer size={18} /> Test in hóa đơn K80 quầy Lễ tân

                </strong>

                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#15803d' }}>

                  In thử hóa đơn mẫu 80mm để kiểm tra máy in nhiệt tại quầy, căn lề và độ sắc nét của mã VietQR.

                </p>

              </div>

              <button

                type="button"

                className="secondary"

                onClick={() => {

                  const w = window.open('', '_blank', 'width=380,height=600');

                  if (!w) return;

                  const qrUrl = c.bankBin && c.bankAccount

                    ? `https://img.vietqr.io/image/${encodeURIComponent(c.bankBin)}-${encodeURIComponent(c.bankAccount)}-compact2.png?amount=570000&addInfo=TEST%20K80&accountName=${encodeURIComponent(c.bankHolder || 'SAIGON INDOOR GOLF')}`

                    : '';

                  w.document.write(`

                    <!DOCTYPE html>

                    <html>

                    <head>

                      <meta charset="utf-8">

                      <title>Phiếu in thử K80 · SaiGon Indoor Golf</title>

                      <style>

                        body { font-family: 'Be Vietnam Pro', monospace, sans-serif; width: 72mm; margin: 0 auto; padding: 10px 0; font-size: 12px; line-height: 1.35; color: #000; }

                        .center { text-align: center; }

                        .title { font-size: 15px; font-weight: bold; margin-bottom: 2px; }

                        .sub { font-size: 11px; margin-bottom: 6px; }

                        .divider { border-top: 1px dashed #000; margin: 8px 0; }

                        .row { display: flex; justify-content: space-between; margin-bottom: 3px; }

                        .bold { font-weight: bold; }

                        .total { font-size: 14px; font-weight: bold; }

                        .qr-box { text-align: center; margin: 10px 0; }

                        .qr-box img { width: 140px; height: 140px; }

                        .footer { font-size: 10px; text-align: center; margin-top: 8px; }

                        @media print { body { width: 100%; margin: 0; padding: 0; } }

                      </style>

                    </head>

                    <body>

                      <div class="center title">SAIGON INDOOR GOLF CLUB</div>

                      <div class="center sub">250 Lương Định Của, P. An Phú, TP. Thủ Đức<br>Hotline: 0877.834.888</div>

                      <div class="center bold" style="font-size: 13px; margin: 6px 0;">PHIẾU THANH TOÁN (MẪU TEST K80)</div>

                      <div class="divider"></div>

                      <div class="row"><span>Line: <strong>VIP 01 (GC3 USA)</strong></span><span>14:30 · 08/11</span></div>

                      <div class="row"><span>Khách hàng: Anh Minh Tuấn</span><span>0988.xxx.xxx</span></div>

                      <div class="row"><span>Thời gian: 14:30 - 16:30 (2h00)</span></div>

                      <div class="divider"></div>

                      <div class="row"><span>1. Giờ chơi VIP (2.0h x 250k)</span><span>500.000đ</span></div>

                      <div class="row"><span>2. Trà đào cam sả (x2)</span><span>70.000đ</span></div>

                      <div class="divider"></div>

                      <div class="row total"><span>TỔNG THANH TOÁN:</span><span>570.000đ</span></div>

                      <div class="row" style="font-size: 11px; color: #444;"><span>Hình thức: Chuyển khoản VietQR</span></div>

                      ${qrUrl ? `<div class="qr-box"><img src="${qrUrl}" alt="QR Code"><div style="font-size: 10px;">Quét VietQR chuyển khoản chính xác</div></div>` : ''}

                      <div class="divider"></div>

                      <div class="footer">Cảm ơn Quý khách & Hẹn gặp lại!<br>SaiGon Indoor Golf Club · Foresight GC3</div>

                      <script>

                        window.onload = function() { window.print(); }

                      </script>

                    </body>

                    </html>

                  `);

                  w.document.close();

                }}

                style={{

                  display: 'inline-flex',

                  alignItems: 'center',

                  gap: 6,

                  padding: '8px 16px',

                  fontWeight: 600,

                  cursor: 'pointer',

                }}

              >

                <Printer size={16} /> In thử phiếu mẫu K80

              </button>

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
