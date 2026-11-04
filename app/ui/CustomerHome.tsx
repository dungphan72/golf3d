'use client';
import { Flag, ArrowUpRight, MapPin, Activity } from 'lucide-react';
import { type Config } from '../../lib/club';
import { TariffPreview } from './PriceEditor';
export function CustomerHome({
  onBook,
  onSession,
  config,
}: {
  onBook: () => void;
  onSession: () => void;
  config: Config;
}) {
  return (
    <>
      <div className="customer-hero">
        <div>
          <span className="eyebrow">SAIGON GOLF 3D CLUB</span>
          <h1>
            Sân chơi của bạn.
            <br />
            <em>Ngay giữa thành phố.</em>
          </h1>
          <p>
            10 line luyện tập. 2 phòng VIP.
            <br />
            Một không gian để kết nối cùng đam mê.
          </p>
          <button className="gold-button" onClick={onBook}>
            Đặt lịch chơi <ArrowUpRight size={18} />
          </button>
          <span className="hero-location">
            <MapPin size={15} />
            {config.address}
          </span>
        </div>
        <div className="hero-art golf-art">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="green" />
          <span className="pole" />
          <span className="flag" />
          <span className="ball" />
        </div>
      </div>
      <div className="customer-services">
        <button onClick={onBook}>
          <Flag />
          <strong>Đặt line / phòng</strong>
          <span>Chọn giờ chơi của bạn</span>
          <ArrowUpRight />
        </button>
        <button onClick={onSession}>
          <Activity />
          <strong>Phiên đang chơi</strong>
          <span>Gọi hỗ trợ · Xem tạm tính</span>
          <ArrowUpRight />
        </button>
      </div>
      <div className="info-strip">
        Chế độ xem khách hàng trong bản thử của chủ cơ sở. Đăng nhập golfer bằng OTP sẽ triển khai
        khi kết nối nhà cung cấp.
      </div>
      <div className="section-heading">
        <h2>Bảng giá dịch vụ</h2>
        <span className="muted">Giá gốc · VAT và phí được tách trong báo giá</span>
      </div>
      <TariffPreview config={config} />
    </>
  );
}
