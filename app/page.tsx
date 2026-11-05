import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  CalendarCheck,
  CloudRain,
  Clock,
  Crosshair,
  Crown,
  Flag,
  Gift,
  MapPin,
  Phone,
  QrCode,
  Sparkles,
  Target,
  Users,
  Utensils,
} from 'lucide-react';
import './landing.css';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import { OFFICIAL_PACKAGES } from '../lib/official-packages';
import { KIND_LABELS, UNLIMITED } from '../lib/member';
import BookingPage from './ui/BookingPage';
import { bookingSlug } from '../lib/server/online-service';

export const dynamic = 'force-dynamic';

const TITLE = 'Saigon Golf 3D Club — Golf 3D Foresight GC3 tại Bình Trưng, TP.HCM';
const DESCRIPTION =
  'Chơi golf 3D mô phỏng Foresight GC3, luyện tập GDR và phòng VIP riêng tại 250 Lương Đình Của, Bình Trưng, TP.HCM. Mở cửa 08:00–23:00. Đặt lịch online, hotline 0902030185.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: BRAND.banner }],
  },
};

const PRICES = [
  { when: 'Thứ 2 – Thứ 6 · 08:00–11:00 (giờ vàng)', gdr: 100_000, h9: 300_000, h18: 400_000 },
  { when: 'Thứ 2 – Thứ 6 · 11:00–23:00', gdr: 250_000, h9: 500_000, h18: 650_000 },
  { when: 'Thứ 7, Chủ nhật & ngày lễ · 08:00–23:00', gdr: 250_000, h9: 500_000, h18: 650_000 },
];

const grantsText = (grants: (typeof OFFICIAL_PACKAGES)[number]['grants']) =>
  grants
    .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
    .join(' + ');
const validText = (days: number) => (days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`);

const WHY = [
  {
    Icon: CloudRain,
    title: 'Nắng mưa đều chơi',
    text: 'Chơi trong nhà, không phụ thuộc thời tiết, mở cửa 08:00–23:00 mỗi ngày.',
  },
  {
    Icon: Activity,
    title: 'Hệ thống Foresight GC3',
    text: 'Mô phỏng sân và đo cú đánh bằng thiết bị Foresight GC3.',
  },
  {
    Icon: Users,
    title: 'Chơi nhóm ưu đãi',
    text: 'Nhóm 4 người dùng giá nhóm cả ngày: 900.000đ (9 hố), 1.000.000đ (18 hố).',
  },
  {
    Icon: Crown,
    title: 'Phòng VIP riêng tư',
    text: '2 phòng VIP cho nhóm bạn, gia đình, đối tác; combo và thẻ VIP đều dùng được.',
  },
  {
    Icon: Utensils,
    title: 'Đồ ăn & thức uống',
    text: 'Gọi món ngay tại line, phục vụ tận nơi; giờ vàng được miễn phí.',
  },
  {
    Icon: Gift,
    title: 'Tích điểm đổi lượt',
    text: 'Mỗi lượt 9 hố hoặc 18 hố được 1 điểm, đủ 10 điểm đổi 1 lượt miễn phí.',
  },
];

const FAQ = [
  {
    q: 'Giá 9 hố, 18 hố tính thế nào?',
    a: 'Tính theo đầu người cho nhóm 1–3 người. Nhóm 4 người dùng giá nhóm: 900.000đ (9 hố) hoặc 1.000.000đ (18 hố) cho cả buổi, áp dụng cả ngày.',
  },
  {
    q: 'Giá niêm yết đã gồm thuế và phí chưa?',
    a: 'Giá niêm yết chưa gồm VAT và phí dịch vụ; hai khoản này được cộng thêm trên hóa đơn khi thanh toán.',
  },
  {
    q: 'Giờ vàng là gì?',
    a: 'Từ Thứ 2 đến Thứ 6, 08:00–11:00. Giá luyện tập GDR, 9 hố và 18 hố thấp hơn khung thường, kèm đồ ăn & thức uống miễn phí. Giờ vàng không áp dụng cuối tuần và ngày lễ.',
  },
  {
    q: 'Đặt lịch online có cần thanh toán trước không?',
    a: 'Không. Anh/chị gửi yêu cầu, nhân viên xác nhận lại lịch và phòng. Thanh toán khi chơi xong bằng tiền mặt, thẻ hoặc quét mã QR chuyển khoản.',
  },
  {
    q: 'Có tích điểm cho khách quen không?',
    a: 'Có. Mỗi lượt 9 hố hoặc 18 hố được 1 điểm; đủ 10 điểm đổi 1 lượt chơi miễn phí.',
  },
  {
    q: 'Combo và thẻ VIP có dùng được cho phòng VIP không?',
    a: 'Được. Combo lượt chơi, gói luyện tập và thẻ VIP đều dùng được cho cả line thường và phòng VIP.',
  },
];

export default async function LandingPage() {
  const slug = await bookingSlug();
  const bookHref = slug ? '#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ online' : `Gọi ${BRAND.hotline}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: BRAND.name,
    description: DESCRIPTION,
    telephone: BRAND.hotline,
    image: BRAND.banner,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '250 Lương Đình Của',
      addressLocality: 'Phường Bình Trưng, TP. Hồ Chí Minh',
      addressCountry: 'VN',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '08:00',
        closes: '23:00',
      },
    ],
  };
  return (
    <div className="lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="lp-header">
        <Link href="/" className="lp-brand" aria-label={BRAND.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={40} height={40} />
          <span>
            {BRAND.short} <small>{BRAND.sub}</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng">
          <a href="#dich-vu">Dịch vụ</a>
          <a href="#bang-gia">Bảng giá</a>
          <a href="#goi">Gói hội viên</a>
          <a href="#dat-cho">Đặt chỗ</a>
          <a href="#lien-he">Liên hệ</a>
        </nav>
        <a className="lp-btn lp-btn-gold" href={bookHref}>
          <CalendarCheck size={17} />
          {bookLabel}
        </a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-text">
            <span className="lp-chip">
              <Sparkles size={14} /> Golf 3D mô phỏng Foresight GC3
            </span>
            <h1>
              Play. Connect. <em>Repeat.</em>
            </h1>
            <p>
              Chơi 9 hố, 18 hố hay luyện tập GDR ngay giữa thành phố, bất kể nắng mưa. Phòng riêng
              cho nhóm bạn, đồ uống phục vụ tận nơi, mở cửa mỗi ngày 08:00–23:00.
            </p>
            <div className="lp-actions">
              <a className="lp-btn lp-btn-gold" href={bookHref}>
                <CalendarCheck size={18} />
                {bookLabel}
              </a>
              <a className="lp-btn lp-btn-ghost" href={`tel:${BRAND.hotline}`}>
                <Phone size={18} />
                Hotline {BRAND.hotline}
              </a>
            </div>
            <ul className="lp-facts">
              <li>
                <strong>10</strong> line (8 thường + 2 VIP)
              </li>
              <li>
                <strong>08–23h</strong> mở cửa hằng ngày
              </li>
              <li>
                <strong>Từ 100.000đ</strong> giờ vàng luyện tập
              </li>
            </ul>
          </div>
          <div className="lp-hero-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.banner} alt="Saigon Golf 3D Club — Play. Connect. Repeat." />
          </div>
        </section>

        <section className="lp-promo" aria-label="Ưu đãi giờ vàng">
          <Clock size={26} />
          <div>
            <strong>Giờ vàng · Thứ 2 – Thứ 6 · 08:00–11:00</strong>
            <span>
              Luyện tập GDR 100.000đ/giờ, 9 hố 300.000đ, 18 hố 400.000đ — kèm đồ ăn & thức uống miễn
              phí.
            </span>
          </div>
          <a className="lp-btn lp-btn-gold" href={slug ? '#dat-cho' : `tel:${BRAND.hotline}`}>
            Đặt khung giờ vàng
          </a>
        </section>

        <section id="dich-vu" className="lp-section">
          <h2>Trải nghiệm tại Saigon Golf 3D Club</h2>
          <p className="lp-lead">
            Một địa điểm cho cả người mới làm quen lẫn golfer muốn giữ phong độ.
          </p>
          <div className="lp-grid3">
            <article className="lp-card">
              <Flag size={26} />
              <h3>Chơi 9 hố · 18 hố</h3>
              <p>
                Mô phỏng sân thật trên hệ thống Foresight GC3. Giá theo đầu người cho nhóm 1–3
                người, giá nhóm ưu đãi cho 4 người.
              </p>
            </article>
            <article className="lp-card">
              <Target size={26} />
              <h3>Luyện tập GDR</h3>
              <p>
                Đặt line theo giờ để tập swing và đánh giá cú đánh. Gói buổi tập 90 phút, giờ vàng
                từ 100.000đ.
              </p>
            </article>
            <article className="lp-card">
              <Crown size={26} />
              <h3>Phòng VIP riêng tư</h3>
              <p>
                Không gian riêng cho nhóm bạn, gia đình hoặc đối tác. Combo và thẻ VIP đều dùng được
                cho phòng VIP.
              </p>
            </article>
          </div>
        </section>

        <section className="lp-section lp-why">
          <h2>Vì sao chọn Saigon Golf 3D Club</h2>
          <div className="lp-features">
            {WHY.map(({ Icon, title, text }) => (
              <div key={title} className="lp-feature">
                <Icon size={22} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="bang-gia" className="lp-section lp-alt">
          <h2>Bảng giá</h2>
          <p className="lp-lead">Giá niêm yết, chưa gồm VAT và phí dịch vụ.</p>
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Khung giờ</th>
                  <th>Luyện tập GDR / giờ</th>
                  <th>9 hố / người</th>
                  <th>18 hố / người</th>
                </tr>
              </thead>
              <tbody>
                {PRICES.map((p) => (
                  <tr key={p.when}>
                    <td>{p.when}</td>
                    <td>{money(p.gdr)}</td>
                    <td>{money(p.h9)}</td>
                    <td>{money(p.h18)}</td>
                  </tr>
                ))}
                <tr className="lp-group-row">
                  <td>
                    <Users size={15} /> Nhóm 4 người (cả ngày)
                  </td>
                  <td>—</td>
                  <td>{money(900_000)} / nhóm</td>
                  <td>{money(1_000_000)} / nhóm</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="lp-note">
            Giờ vàng (Thứ 2 – Thứ 6, 08:00–11:00) được miễn phí đồ ăn & thức uống. Mỗi lượt 9 hố
            hoặc 18 hố tích 1 điểm, đủ 10 điểm đổi 1 lượt miễn phí.
          </p>
        </section>

        <section id="goi" className="lp-section">
          <h2>Gói hội viên & combo</h2>
          <p className="lp-lead">Mua trước để chơi nhiều hơn với giá tốt hơn.</p>
          <div className="lp-packages">
            {OFFICIAL_PACKAGES.map((p) => (
              <article
                key={p.key}
                className={'lp-package' + (p.key.startsWith('vip') ? ' vip' : '')}
              >
                <h3>{p.name}</h3>
                <strong className="lp-price">{money(p.price)}</strong>
                <p>{grantsText(p.grants)}</p>
                <small>
                  Hiệu lực {validText(p.validDays)}
                  {p.perks ? ` · ${p.perks}` : ''}
                </small>
              </article>
            ))}
          </div>
          <p className="lp-note">
            Liên hệ quầy hoặc hotline để đăng ký gói và được hướng dẫn sử dụng.
          </p>
        </section>

        <section id="dat-cho" className="lp-section lp-alt lp-booking">
          <div className="lp-booking-info">
            <h2>Đặt chỗ online</h2>
            <p className="lp-lead">
              Chọn dịch vụ, số người và giờ bạn muốn. Nhân viên xác nhận lại ngay, không cần thanh
              toán trước.
            </p>
            <ol className="lp-steps">
              <li>
                <span>
                  <CalendarCheck size={20} />
                </span>
                <div>
                  <h3>Gửi yêu cầu</h3>
                  <p>Điền thông tin bên cạnh, chưa đầy một phút.</p>
                </div>
              </li>
              <li>
                <span>
                  <Crosshair size={20} />
                </span>
                <div>
                  <h3>Nhân viên xác nhận</h3>
                  <p>
                    Chúng tôi xếp line phù hợp và gọi xác nhận. Trạng thái tự cập nhật ngay trên
                    trang.
                  </p>
                </div>
              </li>
              <li>
                <span>
                  <QrCode size={20} />
                </span>
                <div>
                  <h3>Đến chơi, thanh toán gọn</h3>
                  <p>Thanh toán sau khi chơi: tiền mặt, thẻ hoặc quét mã QR chuyển khoản.</p>
                </div>
              </li>
            </ol>
            <p className="lp-note">
              Cần gấp hoặc nhóm đông? Gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>.
            </p>
          </div>
          <div className="lp-booking-form">
            {slug ? (
              <BookingPage slug={slug} embedded />
            ) : (
              <div className="lp-callcard">
                <Phone size={30} />
                <h3>Đặt chỗ qua hotline</h3>
                <p>
                  Đặt lịch online sẽ mở trong thời gian tới. Hiện tại vui lòng gọi để được giữ line
                  và xác nhận ngay.
                </p>
                <a className="lp-btn lp-btn-primary" href={`tel:${BRAND.hotline}`}>
                  <Phone size={18} />
                  Gọi {BRAND.hotline}
                </a>
              </div>
            )}
          </div>
        </section>

        <section id="hoi-dap" className="lp-section">
          <h2>Câu hỏi thường gặp</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="lien-he" className="lp-section lp-contact">
          <div>
            <h2>Ghé thăm chúng tôi</h2>
            <ul>
              <li>
                <MapPin size={18} /> {BRAND.address}
              </li>
              <li>
                <Clock size={18} /> Mở cửa mỗi ngày 08:00–23:00
              </li>
              <li>
                <Phone size={18} />
                <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
              </li>
            </ul>
            <div className="lp-actions">
              <a className="lp-btn lp-btn-gold" href={bookHref}>
                <CalendarCheck size={18} />
                {bookLabel}
              </a>
              <a
                className="lp-btn lp-btn-ghost"
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={18} />
                Chỉ đường
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-cols">
          <div>
            <strong>{BRAND.name}</strong>
            <p>Golf 3D mô phỏng Foresight GC3 · Play. Connect. Repeat.</p>
          </div>
          <div>
            <strong>Khám phá</strong>
            <a href="#dich-vu">Dịch vụ</a>
            <a href="#bang-gia">Bảng giá</a>
            <a href="#goi">Gói hội viên</a>
            <a href="#hoi-dap">Hỏi đáp</a>
          </div>
          <div>
            <strong>Liên hệ</strong>
            <a href={`tel:${BRAND.hotline}`}>Hotline {BRAND.hotline}</a>
            <span>{BRAND.address}</span>
            <span>Mở cửa 08:00–23:00 mỗi ngày</span>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>
            © {new Date().getFullYear()} {BRAND.name} · {BRAND.website}
          </span>
          <a href="/quan-ly">Dành cho nhân viên</a>
        </div>
      </footer>
      <div className="lp-sticky">
        <a className="lp-btn lp-btn-gold" href={bookHref}>
          <CalendarCheck size={18} />
          {bookLabel}
        </a>
        {slug && (
          <a className="lp-btn lp-btn-ghost" href={`tel:${BRAND.hotline}`} aria-label="Gọi hotline">
            <Phone size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
