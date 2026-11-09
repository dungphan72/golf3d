'use client';
import { Target, Shield, Coffee, Car, Award, Sparkles, SunMoon, HeartHandshake } from 'lucide-react';

export default function ClubAmenities() {
  return (
    <div className="fw-amenities-bento" data-sc-in>
      {/* Item 1 - Featured large */}
      <div className="fw-bento-card bento-gc3">
        <div className="fw-bento-icon">
          <Target size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Công Nghệ Đỉnh Cao</span>
          <h3>Foresight Sports GC3 (USA)</h3>
          <p>
            Hệ thống 3 camera quang học tốc độ cao ghi lại chính xác tốc độ bóng, độ xoáy (Backspin/Sidespin), góc cất cánh và đường bay bóng thực tế với độ chuẩn xác 99.9%.
          </p>
        </div>
        <div className="fw-bento-chips">
          <span>Chuẩn PGA Tour</span>
          <span>50+ Sân Đẳng Cấp Thế Giới</span>
          <span>Chế độ Driving Range & Game 18 hố</span>
        </div>
      </div>

      {/* Item 2 - Clubs & Accessories */}
      <div className="fw-bento-card bento-gear">
        <div className="fw-bento-icon">
          <Shield size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Tiết Kiệm Chi Phí</span>
          <h3>Mượn Bộ Gậy & Bóng Miễn Phí</h3>
          <p>
            Trang bị sẵn các dòng gậy thương hiệu hàng đầu: TaylorMade, Callaway, Titleist cho cả Golfer nam, nữ và người thuận tay trái. Không cần mang theo túi gậy cồng kềnh.
          </p>
        </div>
      </div>

      {/* Item 3 - Pro Coaching */}
      <div className="fw-bento-card bento-coach">
        <div className="fw-bento-icon">
          <Award size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Nâng Trình Nhanh</span>
          <h3>Huấn Luyện Viên Hướng Dẫn 1-on-1</h3>
          <p>
            Có Pro hỗ trợ phân tích video quay chậm cú swing, hướng dẫn tư thế cầm gậy, xoay hông và khắc phục lỗi slice/hook cho Golfer mới hoặc Golfer muốn hạ Handicap.
          </p>
        </div>
      </div>

      {/* Item 4 - F&B Lounge */}
      <div className="fw-bento-card bento-fnb">
        <div className="fw-bento-icon">
          <Coffee size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Thư Giãn</span>
          <h3>Menu Đồ Uống & Đồ Ăn Nhẹ Phục Vụ Tại Line</h3>
          <p>
            Cà phê pha máy hạt tươi, nước ép bổ dưỡng, mocktail và thức ăn nhẹ sẵn sàng phục vụ ngay khi bạn đang thi đấu hoặc giải lao cùng bạn bè.
          </p>
        </div>
      </div>

      {/* Item 5 - Parking & Convenience */}
      <div className="fw-bento-card bento-parking">
        <div className="fw-bento-icon">
          <Car size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Tiện Lợi</span>
          <h3>Bãi Đậu Xe Ô Tô Rộng Rãi</h3>
          <p>
            Vị trí đắc địa tại 250 Lương Đình Của (Bình Trưng, TP.HCM), bãi đỗ xe ô tô và xe máy an ninh, bảo vệ hỗ trợ tận tình suốt buổi chơi.
          </p>
        </div>
      </div>

      {/* Item 6 - Climate & Comfort */}
      <div className="fw-bento-card bento-comfort">
        <div className="fw-bento-icon">
          <SunMoon size={24} />
        </div>
        <div className="fw-bento-content">
          <span className="fw-bento-badge">Quanh Năm</span>
          <h3>Không Lo Thời Tiết Nắng Mưa</h3>
          <p>
            Không gian điều hòa trung tâm mát rượi 22-24°C, hệ thống lọc không khí trong lành, cho bạn thoải mái swing bất kể trưa hè nắng gắt hay mùa mưa bão.
          </p>
        </div>
      </div>
    </div>
  );
}
