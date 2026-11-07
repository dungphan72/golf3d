'use client';
import { useState } from 'react';
import { DialogHeading, ModalDialog } from './kit';
import { rooms } from '../../lib/club';
import { MemberSelector } from './MemberSelector';
import { Flag, Users, Clock, Zap, Crown, Play, Award } from 'lucide-react';

/** A customer who walks in: the session starts and the meter runs at once, with no prior booking. */
export function WalkInDialog({
  room,
  busy,
  onClose,
  onStart,
}: {
  room: string;
  busy: boolean;
  onClose: () => void;
  onStart: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [service, setService] = useState<'gdr' | '9' | '18'>('gdr');
  const [people, setPeople] = useState(1);
  const [minutes, setMinutes] = useState(60);
  const [customer, setCustomer] = useState('Khách vãng lai');
  const [phone, setPhone] = useState('');

  const targetRoom = rooms.find((r) => r.id === room);
  const name = targetRoom?.name ?? room;

  return (
    <ModalDialog label="Vào chơi ngay" onClose={onClose}>
      <DialogHeading onClose={onClose} eyebrow="BẮT ĐẦU PHIÊN CHƠI">
        Vào chơi ngay · {name}
      </DialogHeading>

      <form
        className="operate-walkin-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const finalCustomer = String(f.get('customer') || customer || 'Khách vãng lai');
          const finalPhone = String(f.get('phone') || phone || '');

          onStart({
            room,
            service,
            people,
            minutes: service === 'gdr' ? minutes : 0,
            customer: finalCustomer,
            phone: finalPhone,
          });
        }}
      >
        <p className="operate-form-intro">
          Không cần đặt chỗ trước: phiên chơi bắt đầu tính giờ ngay khi bấm nút. Kết nối hội viên
          để tự động trừ lượt gói hoặc tích lũy điểm thưởng.
        </p>

        {/* 1. KHÁCH HÀNG & HỘI VIÊN */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">01</span>
            <h3 className="section-title">Khách hàng & Hội viên</h3>
          </div>
          <MemberSelector
            customer={customer}
            phone={phone}
            allowWalkIn={true}
            onChange={(c, p) => {
              setCustomer(c);
              setPhone(p);
            }}
          />
        </div>

        {/* 2. HÌNH THỨC DỊCH VỤ */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">02</span>
            <h3 className="section-title">Chọn hình thức chơi</h3>
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
              <span className="service-desc">Tính cước theo giờ thực tế</span>
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
              <span className="service-desc">Trọn gói theo lượt 9 hố</span>
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
              <span className="service-desc">Trọn gói theo lượt 18 hố</span>
            </button>
          </div>

          {/* Fallback hidden select for form consistency */}
          <select
            value={service}
            onChange={(e) => setService(e.target.value as typeof service)}
            style={{ display: 'none' }}
          >
            <option value="gdr">Luyện tập (tính theo giờ)</option>
            <option value="9">Game 9 hố</option>
            <option value="18">Game 18 hố</option>
          </select>
        </div>

        {/* 3. SỐ NGƯỜI CHƠI & THỜI LƯỢNG GIỮ LINE */}
        <div className="operate-form-section">
          <div className="section-label-row">
            <span className="step-num">03</span>
            <h3 className="section-title">Số người & Thời lượng</h3>
          </div>

          <div className="specs-inputs-grid">
            {/* Golfer Count */}
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
              <select
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                style={{ display: 'none' }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} người
                  </option>
                ))}
              </select>
            </div>

            {/* Hold Minutes (for GDR) */}
            {service === 'gdr' && (
              <div className="spec-group">
                <label className="spec-label">
                  <Clock size={14} /> Giữ line tối thiểu:
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
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  style={{ display: 'none' }}
                >
                  {[60, 90, 120, 150, 180].map((n) => (
                    <option key={n} value={n}>
                      {n} phút
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Room badge display */}
        {targetRoom?.vip && (
          <div className="vip-room-notice">
            <Crown size={15} className="text-amber" />
            <span>Phòng VIP Lounge áp dụng biểu giá VIP và tiêu chuẩn phục vụ riêng biệt.</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="operate-form-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="primary btn-start-game" disabled={busy}>
            <Play size={16} /> Bắt đầu chơi và tính tiền ngay
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
