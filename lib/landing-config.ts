/**
 * Landing Page Configuration Data & Type Definitions
 * Saigon Golf 3D Club (Foresight Sports GC3 USA)
 */

export interface GalleryPhoto {
  id: string;
  src: string;
  title: string;
  category: 'vip' | 'standard' | 'lounge';
  categoryLabel: string;
  desc: string;
}

export interface AmenityCard {
  id: string;
  icon: 'target' | 'shield' | 'award' | 'coffee' | 'car' | 'sun';
  badge: string;
  title: string;
  desc: string;
  chips?: string[];
}

export interface TestimonialItem {
  id: string;
  name: string;
  handicap: string;
  avatar: string;
  content: string;
  stars: number;
}

export interface LandingConfig {
  // Brand & General
  brandName: string;
  brandShort: string;
  brandSub: string;
  hotline: string;
  zalo: string;
  address: string;
  hours: string;
  goldTimeText: string;
  mapUrl: string;

  // Hero Section
  heroDesktopImage: string;
  heroMobileImage: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroCallCtaText: string;

  // Rooms & Lines
  standardTitle: string;
  standardDesc: string;
  standardPriceFrom: number;
  standardImage: string;
  standardHighlights: string[];

  vipTitle: string;
  vipDesc: string;
  vipPriceFrom: number;
  vipImage: string;
  vipHighlights: string[];

  // Gallery (9 authentic photos)
  galleryPhotos: GalleryPhoto[];

  // 6 Bento Amenities
  amenities: AmenityCard[];

  // Testimonials
  testimonials: TestimonialItem[];

  // Footer & Mobile
  hideFooterOnMobile: boolean;
  copyrightText: string;
}

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  brandName: 'Saigon Golf 3D Club',
  brandShort: 'SAIGON GOLF',
  brandSub: '3D CLUB',
  hotline: '0902030185',
  zalo: 'https://zalo.me/0902030185',
  address: '250 Lương Đình Của, Phường An Phú, TP. Thủ Đức (Bình Trưng), TP.HCM',
  hours: '06:00 – 23:00 mỗi ngày',
  goldTimeText: 'T2–T6 06:00 – 11:00 (Giờ vàng)',
  mapUrl: 'https://maps.google.com/?q=250+Lương+Đình+Của+Bình+Trưng+Hồ+Chí+Minh',

  heroDesktopImage: '/img/hero-room.webp',
  heroMobileImage: '/img/hero-room-m.webp',
  heroBadge: 'Hệ Thống Golf 3D Foresight Sports GC3 USA',
  heroHeadline: 'Nâng Tầm Cú Đánh',
  heroSubheadline:
    'Golf 3D mô phỏng Foresight GC3, trải nghiệm khó quên và một cộng đồng cùng chung đam mê, giữa lòng thành phố.',
  heroCtaText: 'Đặt Chỗ Ngay',
  heroCtaLink: '#dat-cho',
  heroCallCtaText: 'Gọi Hotline',

  standardTitle: 'Line Golf 3D Tiêu Chuẩn',
  standardDesc:
    'Không gian thiết kế mở nhưng vẫn đảm bảo sự riêng tư giữa các line. Màn hình mô phỏng 4K sắc nét kết hợp công nghệ 3 camera Foresight GC3 ghi nhận từng milimet cú đánh.',
  standardPriceFrom: 180000,
  standardImage: '/img/space-wide.webp',
  standardHighlights: [
    'Miễn phí mượn gậy tập cao cấp nam / nữ & bóng thi đấu',
    'Hiển thị tức thì: Tốc độ đầu gậy, độ xoáy (spin), góc bóng cất cánh',
    'Hệ thống điều hòa lọc khí mát lạnh quanh năm',
  ],

  vipTitle: 'Phòng VIP Doanh Nhân',
  vipDesc:
    'Không gian khép kín đẳng cấp thượng lưu với sofa thư giãn ngả lưng, bàn trà cẩm thạch và vách tường tiêu âm 3D cao cấp. Tận hưởng trọn vẹn sự riêng tư tuyệt đối.',
  vipPriceFrom: 350000,
  vipImage: '/img/fs-lounge.webp',
  vipHighlights: [
    'Phòng riêng tư 100% cách âm tiêu chuẩn khách sạn 5 sao',
    'Sofa da cao cấp, phục vụ F&B tận line',
    'Màn chiếu siêu rộng Panoramic với đồ họa Unreal Engine chân thực',
  ],

  galleryPhotos: [
    {
      id: 'panoramic-lines',
      src: '/img/album-bays-panoramic.webp',
      title: 'Hệ Thống 8 Line Tiêu Chuẩn Màn Chiếu Panoramic 4K',
      category: 'standard',
      categoryLabel: '8 Line Tiêu Chuẩn',
      desc: 'Không gian mở rộng rãi với các line GB6, GB8, GB9, GB10, tích hợp công nghệ Foresight Sports & GOPICK đa chế độ chơi.',
    },
    {
      id: 'vip-lounge-suite',
      src: '/img/album-vip-lounge.webp',
      title: 'Phòng VIP Doanh Nhân — Sofa Da Ngả Lưng & Vách Tiêu Âm',
      category: 'vip',
      categoryLabel: 'Phòng VIP Riêng Tư',
      desc: 'Không gian tiếp khách thượng lưu với sofa thư giãn, bàn trà cẩm thạch và tường tiêu âm 3D cao cấp.',
    },
    {
      id: 'golfers-playing',
      src: '/img/album-golfers-playing.webp',
      title: 'Golfer Trải Nghiệm Thực Tế Tại Line Tiêu Chuẩn',
      category: 'standard',
      categoryLabel: '8 Line Tiêu Chuẩn',
      desc: 'Trải nghiệm đánh bóng chân thực trên thảm cỏ nhân tạo cao cấp hướng thẳng vào màn chiếu thiên nhiên sống động.',
    },
    {
      id: 'bar-counter',
      src: '/img/album-bar-counter.webp',
      title: 'Quầy Bar F&B Gỗ Tự Nhiên & Ghế Xoay Da Cao Cấp',
      category: 'lounge',
      categoryLabel: 'Quầy Bar & Lounge',
      desc: 'Khu vực phục vụ cocktail, cà phê và đồ uống giải khát sau những cú swing thăng hoa.',
    },
    {
      id: 'club-lounge',
      src: '/img/album-club-lounge.webp',
      title: 'Sảnh Chờ & Bàn Tròn Giao Lưu Golfer Thư Giãn',
      category: 'lounge',
      categoryLabel: 'Quầy Bar & Lounge',
      desc: 'Khu vực bàn đàm đạo giữa sân với tầm nhìn bao quát toàn bộ các line đánh 3D hiện đại.',
    },
    {
      id: 'vip-bay-marble',
      src: '/img/album-vip-bay.webp',
      title: 'Line Đánh Phòng VIP & Bàn Trà Sang Trọng',
      category: 'vip',
      categoryLabel: 'Phòng VIP Riêng Tư',
      desc: 'Trang bị túi gậy tập cao cấp, thảm cỏ 3 lớp địa hình và màn hình 4K sắc nét.',
    },
    {
      id: 'bar-to-bays',
      src: '/img/album-bar-to-bays.webp',
      title: 'Góc Nhìn Từ Quầy Bar Hướng Về Các Line Golf 3D',
      category: 'lounge',
      categoryLabel: 'Quầy Bar & Lounge',
      desc: 'Không gian mở kết nối hài hòa giữa khu vực ẩm thực thư giãn và khu vực thể thao chuyên nghiệp.',
    },
    {
      id: 'foresight-analytics',
      src: '/img/album-foresight-screen.webp',
      title: 'Màn Hình Phân Tích Thông Số Cú Đánh Foresight GC3',
      category: 'standard',
      categoryLabel: 'Công Nghệ Foresight',
      desc: 'Đo lường tức thì 14 chỉ số quan trọng: Tốc độ bóng, góc phóng, độ xoáy ngang/dọc, đường bay 3D trung thực.',
    },
    {
      id: 'ambient-vip-night',
      src: '/img/album-ambient-night.webp',
      title: 'Ánh Đèn LED Vàng Hắt Sàn Phòng VIP Về Đêm',
      category: 'vip',
      categoryLabel: 'Phòng VIP Riêng Tư',
      desc: 'Hệ thống đèn ấm cúng tạo cảm giác riêng tư tuyệt đối cho các buổi họp mặt gia đình và đối tác kinh doanh.',
    },
  ],

  amenities: [
    {
      id: 'gc3',
      icon: 'target',
      badge: 'Công Nghệ Đỉnh Cao',
      title: 'Foresight Sports GC3 (USA)',
      desc: 'Hệ thống 3 camera quang học tốc độ cao ghi lại chính xác tốc độ bóng, độ xoáy (Backspin/Sidespin), góc cất cánh và đường bay bóng thực tế với độ chuẩn xác 99.9%.',
      chips: ['Chuẩn PGA Tour', '50+ Sân Đẳng Cấp Thế Giới', 'Driving Range & 18 hố'],
    },
    {
      id: 'gear',
      icon: 'shield',
      badge: 'Tiết Kiệm Chi Phí',
      title: 'Mượn Bộ Gậy & Bóng Miễn Phí',
      desc: 'Trang bị sẵn các dòng gậy thương hiệu hàng đầu: TaylorMade, Callaway, Titleist cho cả Golfer nam, nữ và người thuận tay trái. Không cần mang theo túi gậy cồng kềnh.',
    },
    {
      id: 'coach',
      icon: 'award',
      badge: 'Nâng Trình Nhanh',
      title: 'Huấn Luyện Viên Hướng Dẫn 1-on-1',
      desc: 'Có Pro hỗ trợ phân tích video quay chậm cú swing, hướng dẫn tư thế cầm gậy, xoay hông và khắc phục lỗi slice/hook cho Golfer mới hoặc Golfer muốn hạ Handicap.',
    },
    {
      id: 'fnb',
      icon: 'coffee',
      badge: 'Thư Giãn',
      title: 'Menu Đồ Uống & Đồ Ăn Phục Vụ Tại Line',
      desc: 'Cà phê pha máy hạt tươi, nước ép bổ dưỡng, mocktail và thức ăn nhẹ sẵn sàng phục vụ ngay khi bạn đang thi đấu hoặc giải lao cùng bạn bè.',
    },
    {
      id: 'parking',
      icon: 'car',
      badge: 'Tiện Lợi',
      title: 'Bãi Đậu Xe Ô Tô Rộng Rãi',
      desc: 'Vị trí đắc địa tại 250 Lương Đình Của (Bình Trưng, TP.HCM), bãi đỗ xe ô tô và xe máy an ninh, bảo vệ hỗ trợ tận tình suốt buổi chơi.',
    },
    {
      id: 'comfort',
      icon: 'sun',
      badge: 'Quanh Năm',
      title: 'Không Lo Thời Tiết Nắng Mưa',
      desc: 'Không gian điều hòa trung tâm mát rượi 22-24°C, hệ thống lọc không khí trong lành, cho bạn thoải mái swing bất kể trưa hè nắng gắt hay mùa mưa bão.',
    },
  ],

  testimonials: [
    {
      id: 'rev-1',
      name: 'Anh Trần Minh Tuấn',
      handicap: 'HDC 14',
      avatar: 'T',
      stars: 5,
      content:
        'Line đánh rộng rãi, màn hình cực nét. Cảm biến GC3 đo thông số chính xác giúp tôi chỉnh được lỗi slice driver chỉ sau 3 buổi tập.',
    },
    {
      id: 'rev-2',
      name: 'Chị Nguyễn Phương Thảo',
      handicap: 'Golfer mới',
      avatar: 'P',
      stars: 5,
      content:
        'Không gian sang trọng, sạch sẽ và mát mẻ. Đặc biệt nhân viên rất thân thiện hướng dẫn từng chút, gậy tập xịn không mất phí mượn.',
    },
    {
      id: 'rev-3',
      name: 'Anh Lê Hoàng Nam',
      handicap: 'HDC 18',
      avatar: 'H',
      stars: 5,
      content:
        'Phòng VIP tuyệt vời để tiếp đối tác cuối tuần. Vừa đánh 18 hố vừa uống cà phê đàm đạo rất riêng tư và thư thái.',
    },
  ],

  hideFooterOnMobile: true,
  copyrightText: '© 2026 Saigon Golf 3D Club. Bảo lưu mọi quyền.',
};
