'use client';
import { Star, ShieldCheck, Clock, ThumbsUp, Quote } from 'lucide-react';

const REVIEWS = [
  {
    name: 'Anh Minh Tuấn',
    title: 'Hội viên HDC 14 · Golfer Quận 2',
    comment:
      'Máy Foresight GC3 ở Saigon Golf 3D Club cực kỳ chuẩn xác, chỉ số spin và góc bóng cất cánh gần như y hệt khi mình đánh ngoài sân Tân Sơn Nhất. Phòng máy lạnh mát rượi, đồ uống ngon và nhân viên hỗ trợ set up gậy rất chu đáo.',
    stars: 5,
    tag: 'Tập luyện thường xuyên',
  },
  {
    name: 'Anh Trần Hoàng',
    title: 'Giám đốc Doanh nghiệp',
    comment:
      'Phòng VIP ở đây rất riêng tư và lịch sự, có sofa rộng để tiếp khách đối tác. Vừa trao đổi công việc vừa làm trận 18 hố Pebble Beach rất thoải mái, không sợ nắng gắt hay mưa gió thất thường.',
    stars: 5,
    tag: 'Khách hàng VIP',
  },
  {
    name: 'Chị Mai Linh',
    title: 'New Golfer · Khóa học Swing cơ bản',
    comment:
      'Lúc đầu mình chưa biết gì về golf, tới đây được mượn bộ gậy nữ miễn phí và huấn luyện viên hướng dẫn chỉnh grip với backswing rất tận tình. Có camera quay lại cú swing xem ngay trên màn hình nên tiến bộ rất nhanh!',
    stars: 5,
    tag: 'Golfer mới',
  },
];

export default function TestimonialSection() {
  return (
    <div className="fw-testimonials" data-sc-in>
      {/* Proof Stats Bar */}
      <div className="fw-stats-bar">
        <div className="fw-stat-cell">
          <strong>4.9 / 5.0</strong>
          <div className="fw-stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={15} fill="#f5b50a" color="#f5b50a" />
            ))}
          </div>
          <span>Đánh giá từ khách hàng</span>
        </div>
        <div className="fw-stat-cell">
          <strong>10 Line 4K</strong>
          <span>Trang bị Foresight GC3 USA</span>
        </div>
        <div className="fw-stat-cell">
          <strong>1,200+</strong>
          <span>Lượt chơi mỗi tháng</span>
        </div>
        <div className="fw-stat-cell">
          <strong>100%</strong>
          <span>Giữ line đúng hẹn theo yêu cầu</span>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="fw-reviews-grid">
        {REVIEWS.map((r, i) => (
          <article key={i} className="fw-review-card">
            <Quote size={28} className="fw-quote-icon" />
            <div className="fw-review-stars">
              {[...Array(r.stars)].map((_, idx) => (
                <Star key={idx} size={16} fill="#f5b50a" color="#f5b50a" />
              ))}
              <span className="fw-review-tag">{r.tag}</span>
            </div>
            <p className="fw-review-comment">&ldquo;{r.comment}&rdquo;</p>
            <div className="fw-review-author">
              <div className="fw-author-avatar">
                {r.name.charAt(r.name.lastIndexOf(' ') + 1)}
              </div>
              <div>
                <h4>{r.name}</h4>
                <small>{r.title}</small>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Club Commitments */}
      <div className="fw-commitments">
        <div className="fw-commit-item">
          <ShieldCheck size={20} className="text-gold" />
          <span>Cam kết dữ liệu đo đạc chuẩn xác tuyệt đối</span>
        </div>
        <div className="fw-commit-item">
          <Clock size={20} className="text-gold" />
          <span>Miễn phí dời lịch hẹn trước 2 giờ</span>
        </div>
        <div className="fw-commit-item">
          <ThumbsUp size={20} className="text-gold" />
          <span>Không cần trả trước — Chơi xong mới thanh toán</span>
        </div>
      </div>
    </div>
  );
}
