import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  CalendarCheck,
  ChevronDown,
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
import ScrollFx from './ui/ScrollFx';
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

const STORY = [
  {
    title: 'Chọn line & giờ chơi',
    text: 'Đặt online ngay trên trang này hoặc gọi hotline. Nhân viên xác nhận line phù hợp cho bạn.',
  },
  {
    title: 'Vào line riêng, vung gậy',
    text: 'Mỗi line là một không gian riêng, hướng thẳng tới màn hình mô phỏng sân. Nắng mưa đều chơi được.',
  },
  {
    title: 'Foresight GC3 đo từng cú đánh',
    text: 'Hệ thống ghi tốc độ, góc phóng và độ xoáy, hiển thị quỹ đạo bóng ngay trên màn hình để bạn chỉnh swing.',
  },
  {
    title: 'Chơi tiếp, thanh toán gọn',
    text: 'Chơi 9 hoặc 18 hố, gọi đồ uống tại line. Thanh toán sau khi chơi bằng tiền mặt, thẻ hoặc quét mã QR.',
  },
];

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
    a: 'Giá niêm yết chưa gồm VAT; thuế được cộng thêm trên hóa đơn khi thanh toán.',
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

/** Layered course scene for the hero. Layers drift at different speeds with the page scroll. */
function HeroScene() {
  return (
    <svg
      className="lp-scene"
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#082b1c" />
          <stop offset="0.55" stopColor="#0f4a30" />
          <stop offset="1" stopColor="#1d6b48" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe08a" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#f5b50a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f5b50a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a6040" />
          <stop offset="1" stopColor="#12492f" />
        </linearGradient>
        <linearGradient id="hillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#238a58" />
          <stop offset="1" stopColor="#176b43" />
        </linearGradient>
        <linearGradient id="hillC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35a86c" />
          <stop offset="1" stopColor="#1f8a56" />
        </linearGradient>
      </defs>
      <rect width="1440" height="760" fill="url(#sky)" />
      <g className="lp-layer lp-layer-sun">
        <circle cx="1090" cy="250" r="190" fill="url(#sun)" />
        <circle cx="1090" cy="250" r="54" fill="#ffd45a" />
      </g>
      <g className="lp-layer lp-layer-stars" fill="#fff" opacity="0.7">
        <circle cx="140" cy="90" r="1.6" />
        <circle cx="330" cy="150" r="1.2" />
        <circle cx="520" cy="70" r="1.8" />
        <circle cx="740" cy="130" r="1.3" />
        <circle cx="900" cy="60" r="1.5" />
        <circle cx="1280" cy="110" r="1.7" />
        <circle cx="1380" cy="210" r="1.2" />
        <circle cx="60" cy="230" r="1.4" />
      </g>
      <g className="lp-layer lp-layer-a">
        <path
          d="M0 520 C 220 440 420 470 620 500 S 1000 450 1440 500 V760 H0 Z"
          fill="url(#hillA)"
        />
      </g>
      <g className="lp-layer lp-layer-b">
        <path
          d="M0 590 C 260 520 520 560 760 585 S 1180 540 1440 575 V760 H0 Z"
          fill="url(#hillB)"
        />
      </g>
      <g className="lp-layer lp-layer-c">
        <path
          d="M0 665 C 300 615 560 650 820 662 S 1200 630 1440 655 V760 H0 Z"
          fill="url(#hillC)"
        />
        <ellipse cx="1010" cy="672" rx="150" ry="14" fill="#52c487" opacity="0.55" />
        <line x1="1010" y1="672" x2="1010" y2="585" stroke="#f7f7f2" strokeWidth="3" />
        <path d="M1010 585 L1062 600 L1010 615 Z" fill="#f5b50a" />
        <circle cx="880" cy="672" r="6" fill="#fff" />
      </g>
    </svg>
  );
}

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
      <ScrollFx />
      <div className="lp-progress" aria-hidden="true" />
      <header className="lp-header">
        <Link href="/" className="lp-brand" aria-label={BRAND.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={40} height={40} />
          <span>
            {BRAND.short} <small>{BRAND.sub}</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng">
          <a href="#hanh-trinh">Trải nghiệm</a>
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
          <HeroScene />
          <div className="lp-hero-inner">
            <div className="lp-hero-text">
              <span className="lp-chip" data-reveal>
                <Sparkles size={14} /> Golf 3D mô phỏng Foresight GC3
              </span>
              <h1>
                <span className="lp-line" data-reveal style={{ ['--d' as string]: '80ms' }}>
                  Play. Connect.
                </span>
                <span className="lp-line" data-reveal style={{ ['--d' as string]: '220ms' }}>
                  <em>Repeat.</em>
                </span>
              </h1>
              <p data-reveal style={{ ['--d' as string]: '360ms' }}>
                Chơi 9 hố, 18 hố hay luyện tập GDR ngay giữa thành phố, bất kể nắng mưa. Phòng riêng
                cho nhóm bạn, đồ uống phục vụ tận nơi, mở cửa mỗi ngày 08:00–23:00.
              </p>
              <div className="lp-actions" data-reveal style={{ ['--d' as string]: '480ms' }}>
                <a className="lp-btn lp-btn-gold" href={bookHref}>
                  <CalendarCheck size={18} />
                  {bookLabel}
                </a>
                <a className="lp-btn lp-btn-ghost" href={`tel:${BRAND.hotline}`}>
                  <Phone size={18} />
                  Hotline {BRAND.hotline}
                </a>
              </div>
            </div>
            <div className="lp-hero-card" data-reveal style={{ ['--d' as string]: '300ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.banner} alt="Saigon Golf 3D Club — Play. Connect. Repeat." />
            </div>
          </div>
          <a className="lp-scroll-cue" href="#hanh-trinh" aria-label="Cuộn xuống">
            <span>Khám phá</span>
            <ChevronDown size={20} />
          </a>
        </section>

        <section className="lp-stats" aria-label="Con số nổi bật">
          <div data-reveal>
            <strong data-count="10">10</strong>
            <span>line chơi & luyện tập</span>
          </div>
          <div data-reveal style={{ ['--d' as string]: '90ms' }}>
            <strong data-count="2">2</strong>
            <span>phòng VIP riêng tư</span>
          </div>
          <div data-reveal style={{ ['--d' as string]: '180ms' }}>
            <strong data-count="15" data-suffix="h">
              15h
            </strong>
            <span>mở cửa mỗi ngày (08–23h)</span>
          </div>
          <div data-reveal style={{ ['--d' as string]: '270ms' }}>
            <strong data-count={OFFICIAL_PACKAGES.length}>{OFFICIAL_PACKAGES.length}</strong>
            <span>gói combo & thẻ hội viên</span>
          </div>
        </section>

        <section id="hanh-trinh" className="lp-story" data-step="0">
          <div className="lp-story-stage">
            <div className="lp-story-view" aria-hidden="true">
              <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0b3a25" />
                    <stop offset="1" stopColor="#1f7a4d" />
                  </linearGradient>
                </defs>
                <rect width="800" height="500" fill="url(#sSky)" />
                <circle cx="640" cy="120" r="46" fill="#f5b50a" opacity="0.9" />
                <path
                  d="M0 360 C 160 300 320 330 480 350 S 700 320 800 340 V500 H0 Z"
                  fill="#17603f"
                />
                <path d="M0 430 C 200 380 420 420 800 400 V500 H0 Z" fill="#238a58" />
                <ellipse cx="700" cy="420" rx="70" ry="9" fill="#52c487" opacity="0.6" />
                <line x1="700" y1="420" x2="700" y2="352" stroke="#f7f7f2" strokeWidth="3" />
                <path d="M700 352 L740 364 L700 376 Z" fill="#f5b50a" />
                <path
                  d="M90 436 Q 400 40 700 418"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.35"
                  strokeWidth="2"
                  strokeDasharray="6 8"
                />
              </svg>
              <span className="lp-ball" />
              <div className="lp-gc3">
                <strong>Foresight GC3</strong>
                <span>Tốc độ · Góc phóng · Độ xoáy</span>
              </div>
            </div>
            <div className="lp-story-copy">
              <h2 data-reveal>Một buổi chơi, bốn bước</h2>
              <ol>
                {STORY.map((s, i) => (
                  <li key={s.title} className={`lp-step lp-step-${i}`}>
                    <span className="lp-step-n">{i + 1}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <a className="lp-btn lp-btn-gold" href={bookHref}>
                <CalendarCheck size={18} />
                {bookLabel}
              </a>
            </div>
          </div>
        </section>

        <section className="lp-promo" aria-label="Ưu đãi giờ vàng">
          <Clock size={30} data-reveal />
          <div data-reveal style={{ ['--d' as string]: '100ms' }}>
            <strong>Giờ vàng · Thứ 2 – Thứ 6 · 08:00–11:00</strong>
            <span>
              Luyện tập GDR <b>100.000đ</b>/giờ, 9 hố <b>300.000đ</b>, 18 hố <b>400.000đ</b> — kèm
              đồ ăn & thức uống miễn phí.
            </span>
          </div>
          <a
            className="lp-btn lp-btn-dark"
            href={slug ? '#dat-cho' : `tel:${BRAND.hotline}`}
            data-reveal
            style={{ ['--d' as string]: '200ms' }}
          >
            Đặt khung giờ vàng
          </a>
        </section>

        <section id="dich-vu" className="lp-section">
          <h2 data-reveal>Trải nghiệm tại Saigon Golf 3D Club</h2>
          <p className="lp-lead" data-reveal>
            Một địa điểm cho cả người mới làm quen lẫn golfer muốn giữ phong độ.
          </p>
          <div className="lp-grid3">
            {[
              {
                Icon: Flag,
                t: 'Chơi 9 hố · 18 hố',
                p: 'Mô phỏng sân thật trên hệ thống Foresight GC3. Giá theo đầu người cho nhóm 1–3 người, giá nhóm ưu đãi cho 4 người.',
              },
              {
                Icon: Target,
                t: 'Luyện tập GDR',
                p: 'Đặt line theo giờ để tập swing và đánh giá cú đánh. Gói buổi tập 90 phút, giờ vàng từ 100.000đ.',
              },
              {
                Icon: Crown,
                t: 'Phòng VIP riêng tư',
                p: 'Không gian riêng cho nhóm bạn, gia đình hoặc đối tác. Combo và thẻ VIP đều dùng được cho phòng VIP.',
              },
            ].map(({ Icon, t, p }, i) => (
              <article
                key={t}
                className="lp-card"
                data-reveal
                style={{ ['--d' as string]: `${i * 110}ms` }}
              >
                <Icon size={26} />
                <h3>{t}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-why">
          <h2 data-reveal>Vì sao chọn Saigon Golf 3D Club</h2>
          <div className="lp-features">
            {WHY.map(({ Icon, title, text }, i) => (
              <div
                key={title}
                className="lp-feature"
                data-reveal
                style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}
              >
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
          <h2 data-reveal>Bảng giá</h2>
          <p className="lp-lead" data-reveal>
            Giá niêm yết, chưa gồm VAT.
          </p>
          <div className="lp-table-wrap" data-reveal>
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
          <h2 data-reveal>Gói hội viên & combo</h2>
          <p className="lp-lead" data-reveal>
            Mua trước để chơi nhiều hơn với giá tốt hơn.
          </p>
          <div className="lp-packages">
            {OFFICIAL_PACKAGES.map((p, i) => (
              <article
                key={p.key}
                className={'lp-package' + (p.key.startsWith('vip') ? ' vip' : '')}
                data-reveal
                style={{ ['--d' as string]: `${(i % 4) * 70}ms` }}
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
            <h2 data-reveal>Đặt chỗ online</h2>
            <p className="lp-lead" data-reveal>
              Chọn dịch vụ, số người và giờ bạn muốn. Nhân viên xác nhận lại ngay, không cần thanh
              toán trước.
            </p>
            <ol className="lp-steps">
              {[
                {
                  Icon: CalendarCheck,
                  t: 'Gửi yêu cầu',
                  p: 'Điền thông tin bên cạnh, chưa đầy một phút.',
                },
                {
                  Icon: Crosshair,
                  t: 'Nhân viên xác nhận',
                  p: 'Chúng tôi xếp line phù hợp và gọi xác nhận. Trạng thái tự cập nhật ngay trên trang.',
                },
                {
                  Icon: QrCode,
                  t: 'Đến chơi, thanh toán gọn',
                  p: 'Thanh toán sau khi chơi: tiền mặt, thẻ hoặc quét mã QR chuyển khoản.',
                },
              ].map(({ Icon, t, p }, i) => (
                <li key={t} data-reveal style={{ ['--d' as string]: `${i * 100}ms` }}>
                  <span>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{t}</h3>
                    <p>{p}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="lp-note">
              Cần gấp hoặc nhóm đông? Gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>.
            </p>
          </div>
          <div className="lp-booking-form" data-reveal style={{ ['--d' as string]: '150ms' }}>
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
          <h2 data-reveal>Câu hỏi thường gặp</h2>
          <div className="lp-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} data-reveal style={{ ['--d' as string]: `${i * 50}ms` }}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="lien-he" className="lp-section lp-contact">
          <div data-reveal>
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
            <a href="#hanh-trinh">Trải nghiệm</a>
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
