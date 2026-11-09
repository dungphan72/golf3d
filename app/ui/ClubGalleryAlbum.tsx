'use client';
import { useState } from 'react';
import { Camera, Eye, X, ChevronLeft, ChevronRight, Sparkles, Layers } from 'lucide-react';

interface PhotoItem {
  id: string;
  src: string;
  title: string;
  category: 'vip' | 'standard' | 'lounge';
  categoryLabel: string;
  desc: string;
}

const PHOTOS: PhotoItem[] = [
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
];

export default function ClubGalleryAlbum({ photos }: { photos?: PhotoItem[] } = {}) {
  const photoList = photos && photos.length > 0 ? photos : PHOTOS;
  const [filter, setFilter] = useState<'all' | 'vip' | 'standard' | 'lounge'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredPhotos = filter === 'all' ? photoList : photoList.filter((p) => p.category === filter);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  };

  return (
    <section className="fw-gallery-section" id="album-anh" data-sc-in>
      <div className="fw-gallery-wrap">
        {/* Header */}
        <div className="fw-gallery-head">
          <div className="fw-gallery-badge">
            <Camera size={14} />
            <span>Album Hình Ảnh Thực Tế</span>
          </div>
          <h2>Không Gian Đẳng Cấp Tại Saigon Golf 3D Club</h2>
          <p>
            Hình ảnh chân thực 100% về cơ sở vật chất, hệ thống 8 line tiêu chuẩn 4K, 2 phòng VIP Doanh Nhân riêng tư và quầy Bar Lounge tại số 250 Lương Đình Của, TP.HCM.
          </p>

          {/* Filter Pills */}
          <div className="fw-gallery-filters">
            <button
              type="button"
              className={`fw-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <Layers size={14} />
              <span>Tất cả ({PHOTOS.length})</span>
            </button>
            <button
              type="button"
              className={`fw-filter-btn ${filter === 'vip' ? 'active' : ''}`}
              onClick={() => setFilter('vip')}
            >
              <Sparkles size={14} />
              <span>Phòng VIP Doanh Nhân</span>
            </button>
            <button
              type="button"
              className={`fw-filter-btn ${filter === 'standard' ? 'active' : ''}`}
              onClick={() => setFilter('standard')}
            >
              <span>8 Line Tiêu Chuẩn 4K</span>
            </button>
            <button
              type="button"
              className={`fw-filter-btn ${filter === 'lounge' ? 'active' : ''}`}
              onClick={() => setFilter('lounge')}
            >
              <span>Quầy Bar & Lounge</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="fw-gallery-grid">
          {filteredPhotos.map((photo, idx) => (
            <article
              key={photo.id}
              className="fw-gallery-card"
              onClick={() => openLightbox(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openLightbox(idx)}
              aria-label={`Xem ảnh lớn: ${photo.title}`}
            >
              <div className="fw-gallery-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.title}
                  width={640}
                  height={360}
                  loading="lazy"
                />
                <span className="fw-gallery-tag">{photo.categoryLabel}</span>
                <div className="fw-gallery-hover">
                  <div className="fw-zoom-circle">
                    <Eye size={18} />
                  </div>
                  <span>Xem chi tiết</span>
                </div>
              </div>
              <div className="fw-gallery-caption">
                <h4>{photo.title}</h4>
                <p>{photo.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fw-lightbox-overlay" onClick={closeLightbox}>
          <div className="fw-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="fw-lightbox-close"
              onClick={closeLightbox}
              aria-label="Đóng ảnh"
            >
              <X size={22} />
            </button>

            <button
              type="button"
              className="fw-lightbox-arrow prev"
              onClick={prevPhoto}
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={28} />
            </button>

            <div className="fw-lightbox-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filteredPhotos[lightboxIndex].src}
                alt={filteredPhotos[lightboxIndex].title}
              />
            </div>

            <button
              type="button"
              className="fw-lightbox-arrow next"
              onClick={nextPhoto}
              aria-label="Ảnh kế tiếp"
            >
              <ChevronRight size={28} />
            </button>

            <div className="fw-lightbox-footer">
              <div>
                <span className="fw-lightbox-category">
                  {filteredPhotos[lightboxIndex].categoryLabel}
                </span>
                <h3>{filteredPhotos[lightboxIndex].title}</h3>
                <p>{filteredPhotos[lightboxIndex].desc}</p>
              </div>
              <span className="fw-lightbox-counter">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
