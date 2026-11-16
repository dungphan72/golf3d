/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CarFront,
  Coffee,
  Crown,
  Flag,
  Globe,
  Grid2X2,
  Layers,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import { publicPricing } from '../lib/server/pricing-service';
import { bookingSlug } from '../lib/server/online-service';
import { publicContent } from '../lib/server/content-service';
import { publicTenant } from '../lib/server/member-account-service';
import BookingPage from './ui/BookingPage';
import QuickBook from './ui/QuickBook';
import './home-reference.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'SaiGon Indoor Golf Club — Golf 3D Foresight GC3',
  description:
    'Golf 3D · Tập luyện · Giải đấu · Cộng đồng. Đặt sân tại SaiGon Indoor Golf Club, 250 Lương Định Của, TP.HCM.',
};
const img = (name: string) => `/img/home/${name}.webp`;
const services = [
  {
    image: 'service-book',
    icon: CalendarDays,
    title: 'Đặt sân Golf 3D',
    text: 'Linh hoạt, tiện lợi',
    href: '#dat-cho',
  },
  {
    image: 'service-coach',
    icon: Flag,
    title: 'Huấn luyện Golf',
    text: 'Cá nhân hoá lộ trình',
    href: '#huan-luyen',
  },
  {
    image: 'service-event',
    icon: Trophy,
    title: 'Giải đấu & Sự kiện',
    text: 'Giao lưu – Kết nối – Thi đấu',
    href: '/tin-tuc',
  },
  {
    image: 'service-member',
    icon: UsersRound,
    title: 'Gói giờ & Hội viên',
    text: 'Ưu đãi hấp dẫn',
    href: '/thanh-vien',
  },
];
const shortcuts = [
  { icon: CalendarDays, label: 'Đặt sân', href: '#dat-cho' },
  { icon: Layers, label: 'Mua gói giờ', href: '/thanh-vien', gold: true },
  { icon: Crown, label: 'Hội viên', href: '/thanh-vien', gold: true },
  { icon: Trophy, label: 'Giải đấu', href: '/tin-tuc', gold: true },
  { icon: Flag, label: 'Huấn luyện', href: '#huan-luyen' },
  { icon: UsersRound, label: 'Tìm bạn chơi', href: '/tai-khoan' },
  { icon: ShoppingBag, label: 'Cửa hàng', href: '#dich-vu' },
  { icon: Grid2X2, label: 'Khác', href: '#tien-ich' },
];
const facilities = [
  ['facility-lines', 'Khu Line tiêu chuẩn', '(10 Line)'],
  ['facility-vip', 'Phòng VIP riêng tư', '(2 Phòng)'],
  ['facility-parking', 'Bãi đậu xe rộng', '(1.500 m²)'],
  ['facility-food', 'Dịch vụ F&B', 'Đa dạng, tiện lợi'],
  ['facility-locker', 'Tiện ích khác', 'Tủ đồ, nghỉ ngơi, thư giãn'],
];
function Heading({
  title,
  href,
  more = 'Xem tất cả',
}: {
  title: string;
  href?: string;
  more?: string;
}) {
  return (
    <div className="ref-heading">
      <h2>{title}</h2>
      {href && (
        <a href={href}>
          {more}
          <ArrowRight size={16} />
        </a>
      )}
    </div>
  );
}
export default async function LandingPage() {
  const [slug, pricing, tenant] = await Promise.all([
    bookingSlug(),
    publicPricing(),
    publicTenant(),
  ]);
  const content = tenant ? await publicContent(tenant) : { news: [], upcoming: [], past: [] };
  const event = content.upcoming[0];
  const bookHref = '#dat-cho';
  const clubName = pricing.clubName || BRAND.name;
  const clubAddress = pricing.clubAddress || BRAND.address;
  const clubHotline = pricing.hotline || BRAND.hotline;
  const clubLogo = pricing.logo || BRAND.logo;
  const strength = [
    { icon: Flag, title: '10 Line', text: 'Tiêu chuẩn' },
    { icon: Crown, title: '2 Phòng VIP', text: 'Riêng tư' },
    { icon: Flag, title: 'Line tay trái', text: 'Cho golfer thuận tay trái' },
    { icon: UsersRound, title: 'Huấn luyện viên', text: 'Chuyên nghiệp' },
    { icon: Coffee, title: 'Dịch vụ F&B', text: 'Đa dạng' },
    { icon: CarFront, title: 'Bãi đậu xe', text: '1.500 m²' },
  ];
  return (
    <div className="ref-home">
      <header className="ref-header">
        <a className="ref-brand" href="/" aria-label="SaiGon Indoor Golf Club — Trang chủ">
          <img src={clubLogo} alt="" width="52" height="52" />
          <span>
            <strong>{clubName}</strong>
            <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
          </span>
        </a>
        <nav className="ref-desktop-nav" aria-label="Điều hướng chính">
          <a className="active" href="/">
            Trang chủ
          </a>
          <a href="#tien-ich">Giới thiệu</a>
          <a href="#dich-vu">Dịch vụ⌄</a>
          <a href="/bang-gia">Bảng giá</a>
          <a href="#huan-luyen">Huấn luyện</a>
          <a href="/tin-tuc">Giải đấu</a>
          <a href="/tin-tuc">Tin tức</a>
        </nav>
        <div className="ref-header-actions">
          <a className="ref-search" href="/tin-tuc" aria-label="Tìm tin tức">
            <Search size={18} />
          </a>
          <a className="ref-notifications" href="/tai-khoan" aria-label="Thông báo">
            <Bell />
          </a>
          <a className="ref-login" href="/tai-khoan">
            <UserRound size={18} />
            <span>Đăng nhập</span>
          </a>
          <a className="ref-button ref-header-book" href={bookHref}>
            <CalendarDays size={15} />
            Đặt sân ngay
          </a>
        </div>
      </header>
      <main>
        <section className="ref-hero" aria-label="Trải nghiệm Golf 3D đẳng cấp">
          <h1 className="ref-sr">Trải nghiệm Golf 3D đẳng cấp — Công nghệ Foresight GC3</h1>
          <picture>
            <source media="(max-width: 700px)" srcSet={img('hero-mobile')} />
            <img
              src={img('hero-desktop')}
              alt="Không gian tập luyện golf 3D cao cấp với công nghệ Foresight GC3"
              fetchPriority="high"
            />
          </picture>
        </section>
        <div className="ref-quick ref-container">
          <QuickBook open={pricing.open} close={pricing.close} hasVip={!!pricing.vip} />
        </div>
        <div className="ref-shortcuts ref-container" aria-label="Dịch vụ nhanh">
          {shortcuts.map(({ icon: I, label, href, gold }) => (
            <a href={href} key={label} className={gold ? 'gold' : ''}>
              {label === 'Huấn luyện' ? (
                <img className="ref-golfer" src={img('golfer')} alt="" />
              ) : (
                <I strokeWidth={1.9} />
              )}
              <span>{label}</span>
            </a>
          ))}
        </div>
        <section className="ref-strengths">
          <div className="ref-container">
            {strength.map(({ title, text }, index) => (
              <div key={title}>
                <span className="ref-icon-box">
                  <img src={img(`strength-${index}`)} alt="" width="40" height="37" />
                </span>
                <p>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </p>
              </div>
            ))}
          </div>
        </section>
        <a className="ref-mobile-member ref-container" href="/thanh-vien">
          <img
            src={img('member-mobile')}
            alt="Hội viên Gold — Ưu đãi đến 10% phí tập luyện. Nâng cấp ngay"
          />
        </a>
        <section className="ref-my-bookings ref-container">
          <Heading title="Lịch đặt sân của tôi" href="/tai-khoan" />
          <a className="ref-booking-login" href="/tai-khoan">
            <CalendarDays />
            <span>Đăng nhập để xem lịch đặt sân của bạn</span>
            <ArrowRight />
          </a>
        </section>
        <section className="ref-services ref-container" id="dich-vu">
          <Heading title="Dịch vụ nổi bật" href="#dich-vu" more="Xem tất cả dịch vụ" />
          <div className="ref-service-grid">
            {services.map(({ image, icon: I, title, text, href }) => (
              <a className="ref-service" key={title} href={href}>
                <img src={img(image)} alt="" width="466" height="206" />
                <div>
                  <I />
                  <span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </span>
                  <ArrowRight className="ref-service-arrow" />
                </div>
              </a>
            ))}
          </div>
        </section>
        <div className="ref-price-member ref-container">
          <section id="bang-gia">
            <Heading title="Bảng giá tập luyện" href="/bang-gia" more="Xem bảng giá chi tiết" />
            <div className="ref-price-panel">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Line tiêu chuẩn</th>
                    <th>Phòng VIP</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.standard.rows.slice(0, 3).map((row) => {
                    const vip = pricing.vip?.rows.find((v) => v.key === row.key);
                    return (
                      <tr key={row.key}>
                        <td>
                          <strong>{row.days}</strong>
                          <small>
                            {row.from} – {row.to}
                          </small>
                        </td>
                        <td>{row.gdr == null ? 'Liên hệ' : `${money(row.gdr)} đ/giờ`}</td>
                        <td>
                          {(vip?.gdr ?? row.gdr) == null
                            ? 'Liên hệ'
                            : `${money(vip?.gdr ?? row.gdr ?? 0)} đ/giờ`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="ref-price-actions">
                <a href="/bang-gia">Xem đầy đủ bảng giá</a>
                <a className="ref-button" href={bookHref}>
                  Đặt sân ngay
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>
          <a className="ref-desktop-member" href="/thanh-vien">
            <img
              src={img('member-desktop')}
              alt="Hội viên SaiGon Golf — Tập luyện thỏa thích, ưu đãi vượt trội. Đăng ký hội viên ngay"
              width="459"
              height="223"
            />
          </a>
        </div>
        <section className="ref-facilities ref-container" id="tien-ich">
          <Heading title="Không gian & Tiện ích" />
          <div>
            {facilities.map(([image, title, text]) => (
              <figure key={image}>
                <img src={img(image)} alt={title} loading="lazy" />
                <figcaption>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
        <div className="ref-updates ref-container">
          <section>
            <Heading title="Giải đấu & Sự kiện" href="/tin-tuc" />
            {event ? (
              <a className="ref-event" href={`/tin-tuc/${event.id}`}>
                <img src={event.image || img('event')} alt="" />
                <div>
                  <span>Sắp diễn ra</span>
                  <h3>{event.title}</h3>
                  <p>{event.summary}</p>
                  <small>
                    <CalendarDays size={14} />
                    {event.event_at
                      ? new Date(event.event_at).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : ''}
                  </small>
                  <b>
                    Đăng ký tham gia <ArrowRight size={17} />
                  </b>
                </div>
              </a>
            ) : (
              <a className="ref-event ref-event-empty" href="/tin-tuc">
                <div>
                  <span>Giải đấu tại SaiGon Golf</span>
                  <h3>Kết nối cùng đam mê</h3>
                  <p>Theo dõi lịch giải đấu và sự kiện mới nhất của câu lạc bộ.</p>
                  <b>
                    Xem các sự kiện <ArrowRight size={17} />
                  </b>
                </div>
              </a>
            )}
          </section>
          <section>
            <Heading title="Tin tức & Cập nhật" href="/tin-tuc" />
            <div className="ref-news">
              {content.news.length ? (
                content.news.slice(0, 3).map((post) => (
                  <a href={`/tin-tuc/${post.id}`} key={post.id}>
                    <img src={post.image || img('service-book')} alt="" />
                    <span>
                      <strong>{post.title}</strong>
                      <small>
                        <CalendarDays size={13} />
                        {new Date(post.created).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </small>
                    </span>
                  </a>
                ))
              ) : (
                <>
                  <a href="#tien-ich">
                    <img src={img('facility-vip')} alt="" />
                    <span>
                      <strong>Khám phá không gian Golf 3D & Phòng VIP</strong>
                      <small>Trải nghiệm tại SaiGon Indoor Golf Club</small>
                    </span>
                  </a>
                  <a href="#huan-luyen">
                    <img src={img('service-coach')} alt="" />
                    <span>
                      <strong>Huấn luyện Golf theo lộ trình cá nhân</strong>
                      <small>Tìm hiểu chương trình huấn luyện</small>
                    </span>
                  </a>
                  <a href="/thanh-vien">
                    <img src={img('service-member')} alt="" />
                    <span>
                      <strong>Gói giờ & Quyền lợi hội viên</strong>
                      <small>Khám phá các gói tập luyện</small>
                    </span>
                  </a>
                </>
              )}
            </div>
          </section>
        </div>
        <section className="ref-coaching ref-container" id="huan-luyen">
          <Heading title="Huấn luyện Golf" />
          <p>Cá nhân hoá lộ trình cùng huấn luyện viên chuyên nghiệp.</p>
          <a className="ref-button" href={`tel:${BRAND.hotline}`}>
            Liên hệ tư vấn <Phone size={16} />
          </a>
        </section>
        <section className="ref-book-section ref-container" id="dat-cho">
          <Heading title="Đặt sân Golf 3D" />
          {slug ? (
            <BookingPage slug={slug} embedded />
          ) : (
            <p>
              Liên hệ câu lạc bộ để chọn khung giờ và giữ chỗ.{' '}
              <a className="ref-button" href={`tel:${BRAND.hotline}`}>
                <Phone size={16} />
                0877 834 888
              </a>
            </p>
          )}
        </section>
      </main>
      <footer className="ref-footer">
        <div className="ref-container">
          <div className="ref-footer-brand">
            <a className="ref-brand" href="/">
              <img src={clubLogo} alt="" width="50" height="50" />
              <span>
                <strong>{clubName}</strong>
                <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
              </span>
            </a>
            <p>
              Hệ thống phòng tập Golf 3D hiện đại với công nghệ Foresight GC3, không gian chuyên
              nghiệp, dịch vụ đa dạng tại TP.HCM.
            </p>
            <div className="ref-social">
              <a href={BRAND.zalo} aria-label="Liên hệ Zalo">
                Zalo
              </a>
              <a href={`tel:${clubHotline}`} aria-label="Gọi câu lạc bộ">
                <Phone size={18} />
              </a>
            </div>
          </div>
          <div>
            <h3>Về chúng tôi</h3>
            <a href="#tien-ich">Giới thiệu</a>
            <a href="#tien-ich">Cơ sở vật chất</a>
            <a href="#huan-luyen">Đội ngũ huấn luyện</a>
          </div>
          <div>
            <h3>Dịch vụ</h3>
            <a href={bookHref}>Đặt sân Golf 3D</a>
            <a href="#huan-luyen">Huấn luyện Golf</a>
            <a href="/tin-tuc">Giải đấu & Sự kiện</a>
            <a href="/thanh-vien">Gói giờ & Hội viên</a>
          </div>
          <div>
            <h3>Hỗ trợ</h3>
            <a href={bookHref}>Hướng dẫn đặt sân</a>
            <a href="/tai-khoan">Tài khoản của tôi</a>
            <a href={`tel:${clubHotline}`}>Liên hệ</a>
          </div>
          <address>
            <p>
              <MapPin size={22} />
              {clubAddress}
            </p>
            <a href={`tel:${clubHotline}`}>
              <Phone size={21} />
              <strong>{clubHotline}</strong>
            </a>
            <a href="https://sigolf.vn">
              <Globe size={21} /> <span>sigolf.vn</span>
            </a>
          </address>
        </div>
      </footer>
    </div>
  );
}
