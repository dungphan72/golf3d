import type { Metadata } from 'next';
import { ArrowDown, ArrowUpRight, Clock, Crown, Flag, MapPin, Phone, Target } from 'lucide-react';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import { OFFICIAL_PACKAGES } from '../lib/official-packages';
import { KIND_LABELS, UNLIMITED } from '../lib/member';
import BookingPage from './ui/BookingPage';
import LandingFx from './ui/LandingFx';
import { bookingSlug } from '../lib/server/online-service';
import './landing.css';

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
  {
    when: 'Thứ 2 – Thứ 6 · 08:00–11:00',
    note: 'Giờ vàng',
    gdr: 100_000,
    h9: 300_000,
    h18: 400_000,
  },
  { when: 'Thứ 2 – Thứ 6 · 11:00–23:00', note: '', gdr: 250_000, h9: 500_000, h18: 650_000 },
  {
    when: 'Thứ 7, Chủ nhật & ngày lễ · 08:00–23:00',
    note: '',
    gdr: 250_000,
    h9: 500_000,
    h18: 650_000,
  },
];

const grantsText = (grants: (typeof OFFICIAL_PACKAGES)[number]['grants']) =>
  grants
    .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
    .join(' + ');
const validText = (days: number) => (days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`);

const STEPS = [
  {
    t: 'Chọn line và giờ',
    p: 'Đặt online ngay trên trang này hoặc gọi hotline; nhân viên xác nhận line phù hợp.',
  },
  {
    t: 'Vào line riêng, vung gậy',
    p: 'Mỗi line là một không gian riêng hướng tới màn hình mô phỏng sân. Nắng mưa đều chơi được.',
  },
  {
    t: 'Foresight GC3 đo từng cú',
    p: 'Tốc độ, góc phóng, độ xoáy và quỹ đạo bóng hiện ngay trên màn hình để bạn chỉnh swing.',
  },
  {
    t: 'Chơi tiếp, thanh toán sau',
    p: 'Chơi 9 hoặc 18 hố, gọi đồ uống tại line. Trả tiền mặt, thẻ hoặc quét mã QR.',
  },
];

const FAQ = [
  {
    q: 'Giá 9 hố, 18 hố tính thế nào?',
    a: 'Tính theo đầu người cho nhóm 1–3 người. Nhóm 4 người dùng giá nhóm: 900.000đ (9 hố) hoặc 1.000.000đ (18 hố) cho cả buổi, áp dụng cả ngày.',
  },
  {
    q: 'Giá niêm yết đã gồm thuế chưa?',
    a: 'Giá niêm yết chưa gồm VAT; thuế được cộng thêm trên hóa đơn khi thanh toán.',
  },
  {
    q: 'Giờ vàng là gì?',
    a: 'Thứ 2 đến Thứ 6, 08:00–11:00. Giá luyện tập GDR, 9 hố và 18 hố thấp hơn khung thường, kèm đồ ăn và thức uống miễn phí. Không áp dụng cuối tuần và ngày lễ.',
  },
  {
    q: 'Đặt lịch online có cần thanh toán trước không?',
    a: 'Không. Bạn gửi yêu cầu, nhân viên xác nhận lại lịch và line. Thanh toán sau khi chơi bằng tiền mặt, thẻ hoặc quét mã QR chuyển khoản.',
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

// A row of pines: [x, base y, height]
const PINES: [number, number, number][] = [
  [30, 640, 150],
  [90, 650, 190],
  [150, 645, 130],
  [210, 655, 170],
  [270, 650, 120],
  [1180, 640, 140],
  [1240, 650, 200],
  [1300, 645, 150],
  [1360, 655, 185],
  [1420, 648, 130],
  [1480, 652, 175],
  [1550, 646, 145],
];

/** Stylised course scene for the hero: sky, clouds, mountains, lake, fairway, flag and a golfer. */
function CourseScene() {
  return (
    <svg
      className="fw-scene"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Sân golf với núi và hồ nước"
    >
      <defs>
        <linearGradient id="fwSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d5cae" />
          <stop offset="0.5" stopColor="#4f9be0" />
          <stop offset="0.78" stopColor="#a9d3f1" />
          <stop offset="1" stopColor="#dcecf6" />
        </linearGradient>
        <linearGradient id="fwLake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc0e0" />
          <stop offset="1" stopColor="#5f9cc6" />
        </linearGradient>
        <linearGradient id="fwFair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6db35a" />
          <stop offset="1" stopColor="#2f7d32" />
        </linearGradient>
        <linearGradient id="fwFair2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f9140" />
          <stop offset="1" stopColor="#1d5f2c" />
        </linearGradient>
        <filter id="fwBlur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#fwSky)" />
      <g fill="#fff" filter="url(#fwBlur)" opacity="0.95">
        <ellipse cx="260" cy="170" rx="210" ry="48" />
        <ellipse cx="380" cy="145" rx="150" ry="52" />
        <ellipse cx="1180" cy="120" rx="230" ry="42" />
        <ellipse cx="1330" cy="150" rx="150" ry="40" />
        <ellipse cx="760" cy="250" rx="180" ry="30" opacity="0.8" />
        <ellipse cx="60" cy="330" rx="150" ry="34" opacity="0.8" />
      </g>
      <path
        d="M0 470 L120 395 L230 440 L370 340 L520 430 L640 385 L790 455 V560 H0 Z"
        fill="#7d9bc2"
      />
      <path
        d="M640 470 L800 380 L930 430 L1070 340 L1200 420 L1340 360 L1480 430 L1600 395 V560 H640 Z"
        fill="#6384ad"
      />
      <path
        d="M0 520 L160 470 L300 505 L470 455 L640 510 L820 475 L1000 520 L1180 470 L1360 510 L1600 475 V600 H0 Z"
        fill="#3e6f56"
      />
      <rect y="560" width="1600" height="70" fill="url(#fwLake)" />
      <path
        d="M180 585 H520 M700 600 H1080 M1180 580 H1500"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g fill="#1c4a2b">
        {PINES.map(([x, y, h]) => (
          <path key={x} d={`M${x} ${y - h} L${x + 34} ${y} L${x - 34} ${y} Z`} />
        ))}
      </g>
      <path
        d="M0 640 C 260 600, 600 640, 900 650 C 1150 660, 1400 630, 1600 650 V900 H0 Z"
        fill="url(#fwFair)"
      />
      <path
        d="M0 720 C 300 690, 700 740, 1100 730 C 1350 724, 1500 710, 1600 720 V900 H0 Z"
        fill="url(#fwFair2)"
      />
      <ellipse cx="1180" cy="690" rx="118" ry="16" fill="#8ccf78" />
      <ellipse cx="560" cy="676" rx="70" ry="9" fill="#e9dcb4" opacity="0.95" />
      <line x1="1180" y1="690" x2="1180" y2="560" stroke="#fff" strokeWidth="4" />
      <path d="M1180 560 L1240 578 L1180 596 Z" fill="#fff" />
      <g
        transform="translate(500 396) scale(1.18)"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M-14 128 L-2 206 L-16 276" stroke="#e9e2d2" strokeWidth="30" />
        <path d="M-4 128 L30 204 L48 274" stroke="#d9d1bf" strokeWidth="30" />
        <path d="M22 34 L-18 128" stroke="#215c36" strokeWidth="50" />
        <path d="M26 50 L66 150" stroke="#d7a483" strokeWidth="13" />
        <path d="M66 150 L158 284" stroke="#2a2f38" strokeWidth="4" />
        <ellipse cx="-18" cy="282" rx="24" ry="8" fill="#242a33" stroke="none" />
        <ellipse cx="52" cy="280" rx="24" ry="8" fill="#242a33" stroke="none" />
        <rect
          x="150"
          y="278"
          width="22"
          height="9"
          rx="3"
          fill="#2a2f38"
          stroke="none"
          transform="rotate(30 158 284)"
        />
        <circle cx="178" cy="289" r="6" fill="#fff" stroke="none" />
        <circle cx="30" cy="2" r="22" fill="#d9a888" stroke="none" />
        <path d="M8 -2 A22 22 0 0 1 52 -2 L72 0 L52 8 L8 8 Z" fill="#fff" stroke="none" />
      </g>
    </svg>
  );
}

export default async function LandingPage() {
  const slug = await bookingSlug();
  const bookHref = slug ? '#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
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
  const nav = [
    ['#dich-vu', 'Trải nghiệm'],
    ['#gio-vang', 'Giờ vàng'],
    ['#bang-gia', 'Bảng giá'],
    ['#goi', 'Gói hội viên'],
    ['#lien-he', 'Liên hệ'],
  ];
  const groups = [
    { title: 'Combo 9 hố', filter: (k: string) => k.startsWith('h9-') },
    { title: 'Combo 18 hố', filter: (k: string) => k.startsWith('h18-') },
    { title: 'Luyện tập GDR', filter: (k: string) => k.startsWith('gdr-') },
    { title: 'Thẻ VIP', filter: (k: string) => k.startsWith('vip-') },
  ];
  return (
    <div className="fw">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/scrollcraft/scrollcraft.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@200;300;400;500;600;700&display=swap"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="fw-fixed" aria-label="Điều hướng nhanh">
        <a className="fw-brand" href="#top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={30} height={30} />
          <span>{BRAND.short}</span>
        </a>
        <nav>
          {nav.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="fw-pill-cta" href={bookHref}>
          {bookLabel} <ArrowUpRight size={16} />
        </a>
      </header>

      <main id="top">
        <section className="fw-hero">
          <div className="fw-stage">
            <CourseScene />
            <div className="fw-shade" aria-hidden="true" />

            <div className="fw-top-left">
              <a className="fw-brand" href="#top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BRAND.logo} alt="" width={34} height={34} />
                <span>{BRAND.short}</span>
              </a>
              <nav>
                {nav.slice(0, 4).map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
            <a className="fw-top-right" href={bookHref}>
              {bookLabel}{' '}
              <span className="fw-arrow-dot">
                <ArrowUpRight size={15} />
              </span>
            </a>

            <div className="fw-headline">
              <h1>
                <span>Nâng tầm</span>
                <strong>cú đánh</strong>
              </h1>
              <p>
                Golf 3D mô phỏng Foresight GC3 giữa lòng thành phố. Nắng mưa đều chơi, phòng riêng
                cho bạn bè, mở cửa mỗi ngày 08:00–23:00.
              </p>
            </div>

            <div className="fw-bubble">Hơn cả một buổi chơi, một phiên bản tốt hơn của bạn.</div>

            <div className="fw-side-time" aria-label="Giờ mở cửa">
              <span>08:00 – 23:00</span>
              <small>Mỗi ngày</small>
            </div>

            <a className="fw-card fw-card-gold" href="#gio-vang">
              <span className="fw-card-icon">
                <Clock size={20} />
              </span>
              <span>
                <b>Giờ vàng</b>
                <small>T2–T6 · 08:00–11:00 · GDR từ 100.000đ</small>
              </span>
              <span className="fw-arrow-dot">
                <ArrowUpRight size={15} />
              </span>
            </a>

            <a className="fw-card fw-card-discover" href="#dich-vu">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND.banner} alt="Phòng chơi Foresight GC3" />
              <span>
                <b>Khám phá phòng chơi</b>
                <small>10 line, trong đó 2 phòng VIP riêng tư.</small>
              </span>
              <span className="fw-arrow-dot">
                <ArrowUpRight size={15} />
              </span>
            </a>

            <a className="fw-scroll" href="#dich-vu" aria-label="Cuộn xuống">
              <ArrowDown size={18} />
            </a>
          </div>
        </section>

        <section id="dich-vu" className="fw-section">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Trải nghiệm</p>
            <h2>Một buổi chơi, bốn bước</h2>
            <p className="fw-sub">Từ lúc đặt chỗ đến lúc thanh toán, mọi thứ gọn trong một buổi.</p>
          </div>
          <ol className="fw-steps" data-sc-in data-sc-stagger="80">
            {STEPS.map((s, i) => (
              <li key={s.t} className="fw-tile">
                <span className="fw-num">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
          <div className="fw-three" data-sc-in data-sc-stagger="80">
            {[
              {
                Icon: Flag,
                t: 'Chơi 9 hố · 18 hố',
                p: 'Mô phỏng sân thật. Giá theo đầu người cho nhóm 1–3 người, giá nhóm cho 4 người.',
              },
              {
                Icon: Target,
                t: 'Luyện tập GDR',
                p: 'Đặt line theo giờ để tập swing. Gói buổi tập 90 phút, giờ vàng từ 100.000đ.',
              },
              {
                Icon: Crown,
                t: 'Phòng VIP riêng tư',
                p: 'Không gian riêng cho nhóm bạn, gia đình, đối tác. Combo và thẻ VIP dùng được.',
              },
            ].map(({ Icon, t, p }) => (
              <article key={t} className="fw-tile fw-tile-line">
                <Icon size={22} />
                <h3>{t}</h3>
                <p>{p}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="gio-vang" className="fw-section fw-tight">
          <div className="fw-gold-panel" data-sc-in data-sc-stagger="90">
            <div>
              <p className="fw-kicker fw-kicker-light">Thứ 2 – Thứ 6 · 08:00–11:00</p>
              <h2>Giờ vàng, đồ ăn và thức uống miễn phí</h2>
              <p className="fw-sub fw-sub-light">
                Không áp dụng cuối tuần và ngày lễ. Giá chưa gồm VAT.
              </p>
            </div>
            <div className="fw-figs">
              <div>
                <strong>
                  <span data-sc-count="0 100">100</span>.000đ
                </strong>
                <span>luyện tập GDR / giờ</span>
              </div>
              <div>
                <strong>
                  <span data-sc-count="0 300">300</span>.000đ
                </strong>
                <span>9 hố / người</span>
              </div>
              <div>
                <strong>
                  <span data-sc-count="0 400">400</span>.000đ
                </strong>
                <span>18 hố / người</span>
              </div>
            </div>
          </div>
        </section>

        <section id="bang-gia" className="fw-section">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Bảng giá</p>
            <h2>Giá niêm yết, không phụ phí ẩn</h2>
            <p className="fw-sub">
              Giá chưa gồm VAT. Nhóm 4 người dùng giá nhóm cả ngày: {money(900_000)} cho 9 hố,{' '}
              {money(1_000_000)} cho 18 hố.
            </p>
          </div>
          <div className="fw-table-card" data-sc-in>
            <table>
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
                    <td>
                      {p.when}
                      {p.note && <em>{p.note}</em>}
                    </td>
                    <td>{money(p.gdr)}</td>
                    <td>{money(p.h9)}</td>
                    <td>{money(p.h18)}</td>
                  </tr>
                ))}
                <tr className="fw-group">
                  <td>Nhóm 4 người (cả ngày)</td>
                  <td>—</td>
                  <td>{money(900_000)} / nhóm</td>
                  <td>{money(1_000_000)} / nhóm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="goi" className="fw-section fw-tint">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Gói hội viên</p>
            <h2>Mua trước, chơi nhiều hơn</h2>
            <p className="fw-sub">
              Mỗi lượt 9 hố hoặc 18 hố tích 1 điểm; đủ 10 điểm đổi 1 lượt miễn phí. Combo và thẻ VIP
              dùng được cho cả phòng VIP.
            </p>
          </div>
          <div className="fw-pk-groups">
            {groups.map((g) => (
              <div key={g.title} className="fw-pk-group" data-sc-in data-sc-stagger="60">
                <h3>{g.title}</h3>
                <div className="fw-pk-grid">
                  {OFFICIAL_PACKAGES.filter((p) => g.filter(p.key)).map((p) => (
                    <article
                      key={p.key}
                      className={'fw-pk' + (p.key.startsWith('vip') ? ' vip' : '')}
                    >
                      <h4>{p.name}</h4>
                      <strong>{money(p.price)}</strong>
                      <p>{grantsText(p.grants)}</p>
                      <small>
                        Hiệu lực {validText(p.validDays)}
                        {p.perks ? ` · ${p.perks}` : ''}
                      </small>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="fw-note">
            Đăng ký gói tại quầy hoặc gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>.
          </p>
        </section>

        <section id="dat-cho" className="fw-section">
          <div className="fw-booking">
            <div data-sc-in data-sc-stagger="70">
              <p className="fw-kicker">Đặt chỗ</p>
              <h2>Chọn giờ, nhân viên xác nhận</h2>
              <p className="fw-sub">
                Gửi yêu cầu chưa đầy một phút. Chúng tôi xếp line phù hợp và gọi xác nhận; không cần
                thanh toán trước. Trạng thái yêu cầu tự cập nhật ngay trên trang.
              </p>
              <div className="fw-faq">
                {FAQ.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className="fw-form" data-sc-in>
              {slug ? (
                <BookingPage slug={slug} embedded />
              ) : (
                <div className="fw-call">
                  <Phone size={26} />
                  <h3>Đặt chỗ qua hotline</h3>
                  <p>
                    Đặt lịch online sẽ mở trong thời gian tới. Hiện tại vui lòng gọi để được giữ
                    line và xác nhận ngay.
                  </p>
                  <a className="fw-btn" href={`tel:${BRAND.hotline}`}>
                    Gọi {BRAND.hotline}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="lien-he" className="fw-section fw-tight">
          <div className="fw-contact" data-sc-in data-sc-stagger="70">
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
                  <Phone size={18} /> <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
                </li>
              </ul>
            </div>
            <div className="fw-contact-actions">
              <a className="fw-btn fw-btn-light" href={bookHref}>
                {bookLabel} <ArrowUpRight size={16} />
              </a>
              <a
                className="fw-btn fw-btn-ghost"
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chỉ đường
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="fw-footer">
        <span>
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.website}
        </span>
        <a href="/quan-ly">Dành cho nhân viên</a>
      </footer>
      <div className="fw-sticky">
        <a className="fw-btn" href={bookHref}>
          {bookLabel} <ArrowUpRight size={16} />
        </a>
      </div>
      <LandingFx />
    </div>
  );
}
