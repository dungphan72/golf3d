'use client';

import { useEffect, useState } from 'react';

import { Flag, Check, ArrowRight, Crown, Clock, Users, Calendar, Award } from 'lucide-react';

import { DialogHeading, ModalDialog } from './kit';

import {
  bookingDateTimeLocal,
  latestStaffBookingStart,
  nextBookingStart,
  planBooking,
} from '../../lib/booking';






import { type Service } from '../../lib/pricing';

import { rooms, ready, money, type Config } from '../../lib/club';

import { MemberSelector } from './MemberSelector';
import { normalizePhone, validPhone } from '../../lib/member';



/** What still blocks online booking (the public page quotes prices with VAT and service fee). */









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



  const startMs = Date.parse(start + ':00+07:00');
  const plan = (svc: string, n: number) => {
    try {
      return {
        quote: planBooking(
          { room, service: svc as Service, start: startMs, people: n, minutes },
          config,
          now,
        ),
        error: '',
      };
    } catch (e) {
      return { quote: null, error: e instanceof Error ? e.message : 'Chưa có báo giá' };
    }
  };
  // A group size without a price in the table cannot be booked: it is disabled, never guessed.
  const pricedPeople = [1, 2, 3, 4].map((n) => ({ n, ok: plan(service, n).quote !== null }));
  const firstPriced = pricedPeople.find((x) => x.ok)?.n;
  const guests = pricedPeople.find((x) => x.n === people)?.ok ? people : (firstPriced ?? people);
  const { quote: estimate, error: estimateError } = plan(service, guests);
  const noPrice = estimateError.startsWith('Chưa có giá');
  const phoneOk = validPhone(normalizePhone(phone));
  const startOk = Number.isFinite(startMs) && start >= minStart && start <= maxStart;
  const conditions = [
    { ok: customer.trim().length >= 2, text: 'Nhập tên khách' },
    { ok: phoneOk, text: 'Nhập số điện thoại hợp lệ (bắt đầu bằng 0)' },
    { ok: startOk, text: 'Chọn giờ bắt đầu trong khoảng cho phép đặt lịch' },
    {
      ok: !!estimate,
      text: noPrice
        ? 'Chưa có giá cho lựa chọn này: chọn dịch vụ, giờ hoặc số người khác'
        : estimateError || 'Chưa có báo giá',
    },
  ];
  const unmet = conditions.filter((c) => !c.ok);
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
          if (unmet.length || !ready(config)) return;
          const finalCustomer = customer.trim();
          const finalPhone = normalizePhone(phone);
          onSave({

            room,

            service,

            expectedRevision: config.pricingRevision,

            start: startMs,
            people: guests,
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

                  {pricedPeople.map(({ n, ok }) => (
                    <button
                      key={n}
                      type="button"
                      className={`btn-spec-pill ${guests === n ? 'active' : ''}`}
                      disabled={!ok}
                      title={ok ? undefined : 'Chưa có giá cho số người này'}
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

            <p role="status" className="estimate-empty">
              {noPrice
                ? 'Chưa có báo giá cho lựa chọn này. Hãy chọn số người, dịch vụ hoặc giờ khác; nếu vẫn thiếu, bổ sung khung giá trong Cài đặt › Giá.'
                : estimateError}
            </p>

          )}

        </div>



        {unmet.length > 0 && (
          <ul className="booking-unmet" aria-label="Điều kiện còn thiếu">
            {unmet.map((c) => (
              <li key={c.text}>{c.text}</li>
            ))}
          </ul>
        )}
        <div className="form-footer operate-modal-footer">
          <button className="secondary" type="button" onClick={onClose}>
            Để sau
          </button>
          <button className="primary btn-confirm-booking" disabled={busy || !ready(config) || unmet.length > 0}>

            {busy ? 'Đang lưu…' : 'Xác nhận lịch đặt'}

            <ArrowRight size={17} />

          </button>

        </div>

      </form>

    </ModalDialog>

  );

}
