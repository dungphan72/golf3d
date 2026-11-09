'use client';
import { useState } from 'react';
import { CheckCircle2, Users, Monitor, ShieldCheck, Sparkles, ArrowUpRight, Wine, Trophy } from 'lucide-react';

interface RoomShowcaseProps {
  standardPrice?: number | null;
  vipPrice?: number | null;
}

export default function RoomShowcase({ standardPrice, vipPrice }: RoomShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'standard' | 'vip'>('standard');

  const scrollToBook = (roomType: string) => {
    const el = document.getElementById('dat-cho');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fw-room-showcase" data-sc-in>
      {/* Switcher Tabs */}
      <div className="fw-room-tabs">
        <button
          type="button"
          className={`fw-room-tab ${activeTab === 'standard' ? 'active' : ''}`}
          onClick={() => setActiveTab('standard')}
        >
          <Monitor size={18} />
          <span>Line Tiêu Chuẩn (Standard)</span>
          <span className="fw-tab-badge">Phổ biến nhất</span>
        </button>
        <button
          type="button"
          className={`fw-room-tab ${activeTab === 'vip' ? 'active' : ''}`}
          onClick={() => setActiveTab('vip')}
        >
          <Trophy size={18} />
          <span>Phòng VIP Doanh Nhân (VIP Suite)</span>
          <span className="fw-tab-badge vip">Đẳng cấp riêng tư</span>
        </button>
      </div>

      {/* Content for Standard Room */}
      {activeTab === 'standard' && (
        <div className="fw-room-detail standard fade-in">
          <div className="fw-room-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/space-wide.webp"
              alt="Line Chơi Golf 3D Tiêu Chuẩn với Màn Chiếu Lớn"
              width={900}
              height={550}
              loading="lazy"
            />
            <div className="fw-room-tag">
              <span>8 Line Tiêu Chuẩn Hiện Đại</span>
            </div>
          </div>
          <div className="fw-room-info">
            <div className="fw-room-header">
              <span className="fw-kicker">Tập Luyện & Đấu Sân</span>
              <h3>Line Golf 3D Tiêu Chuẩn</h3>
              <p className="fw-room-desc">
                Không gian thiết kế mở nhưng vẫn đảm bảo sự riêng tư giữa các line. Màn hình mô phỏng 4K sắc nét kết hợp công nghệ 3 camera Foresight GC3 ghi nhận từng milimet cú đánh.
              </p>
            </div>

            <div className="fw-room-specs">
              <div className="fw-spec-item">
                <Users size={16} />
                <span>Sức chứa: 1 – 4 Golfer / Line</span>
              </div>
              <div className="fw-spec-item">
                <Monitor size={16} />
                <span>Foresight GC3 3-Camera Tracking</span>
              </div>
              <div className="fw-spec-item">
                <ShieldCheck size={16} />
                <span>Thảm địa hình: Fairway, Rough, Sand</span>
              </div>
              <div className="fw-spec-item">
                <Sparkles size={16} />
                <span>Hơn 50+ sân golf chuẩn quốc tế</span>
              </div>
            </div>

            <ul className="fw-room-highlights">
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span>Miễn phí mượn gậy tập cao cấp nam / nữ & bóng thi đấu</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span>Hiển thị tức thì: Tốc độ đầu gậy, độ xoáy (spin), góc bóng cất cánh</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span>Hệ thống điều hòa lọc khí mát lạnh quanh năm</span>
              </li>
            </ul>

            <div className="fw-room-footer">
              <div className="fw-room-price">
                <small>Giá chỉ từ</small>
                <strong>{standardPrice ? `${standardPrice.toLocaleString('vi-VN')}đ` : '180.000đ'}</strong>
                <span>/ giờ (Giờ vàng)</span>
              </div>
              <button
                type="button"
                className="fw-btn-room-book"
                onClick={() => scrollToBook('standard')}
              >
                <span>Đặt Line Này</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content for VIP Room */}
      {activeTab === 'vip' && (
        <div className="fw-room-detail vip fade-in">
          <div className="fw-room-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/fs-lounge.webp"
              alt="Phòng VIP Saigon Golf 3D Club với không gian lounge riêng biệt"
              width={900}
              height={550}
              loading="lazy"
            />
            <div className="fw-room-tag vip">
              <span>2 Phòng VIP Đẳng Cấp Thượng Lưu</span>
            </div>
          </div>
          <div className="fw-room-info">
            <div className="fw-room-header">
              <span className="fw-kicker fw-kicker-gold">Đặc Quyền Riêng Tư</span>
              <h3>Phòng VIP Doanh Nhân & Gia Đình</h3>
              <p className="fw-room-desc">
                Không gian phòng khép kín hoàn toàn với tường cách âm, sofa da êm ái, thích hợp tiếp đối tác quan trọng, họp mặt nhóm bạn thân hoặc gia đình tận hưởng những giờ phút thư giãn kín đáo.
              </p>
            </div>

            <div className="fw-room-specs">
              <div className="fw-spec-item">
                <Users size={16} />
                <span>Sức chứa: 4 – 8 khách thoải mái</span>
              </div>
              <div className="fw-spec-item">
                <Monitor size={16} />
                <span>Màn chiếu cong Panorama 4K khổ lớn</span>
              </div>
              <div className="fw-spec-item">
                <Wine size={16} />
                <span>Khu vực Sofa Lounge & Bàn tiệc riêng</span>
              </div>
              <div className="fw-spec-item">
                <Trophy size={16} />
                <span>Hệ thống âm thanh Hi-Fi & Smart TV</span>
              </div>
            </div>

            <ul className="fw-room-highlights">
              <li>
                <CheckCircle2 size={16} className="text-gold" />
                <span>Phục vụ menu đồ uống cao cấp & món ăn nhẹ ngay tại phòng</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-gold" />
                <span>Hỗ trợ thiết bị ghi hình và phân tích chuyển động swing chuyên sâu</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-gold" />
                <span>Quyền riêng tư tuyệt đối cho các cuộc gặp mặt kinh doanh</span>
              </li>
            </ul>

            <div className="fw-room-footer">
              <div className="fw-room-price">
                <small>Giá phòng VIP từ</small>
                <strong>{vipPrice ? `${vipPrice.toLocaleString('vi-VN')}đ` : '350.000đ'}</strong>
                <span>/ giờ</span>
              </div>
              <button
                type="button"
                className="fw-btn-room-book vip"
                onClick={() => scrollToBook('vip')}
              >
                <span>Giữ Phòng VIP Ngay</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
