import type { Metadata } from 'next';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Crown,
  Flag,
  MapPin,
  Phone,
  Target,
} from 'lucide-react';
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
    images: [{ url: '/og.jpg', width: 1200, height: 675 }],
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
    image: '/og.jpg',
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
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@200;300;400;500;600;700&family=Be+Vietnam+Pro:wght@400;500;600&display=swap"
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
            <picture>
              <source media="(max-width: 860px)" srcSet="/img/hero-room-m.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="fw-scene"
                src="/img/hero-room.webp"
                alt="Phòng chơi Saigon Golf 3D Club với màn hình mô phỏng sân golf"
                width={1458}
                height={1201}
                fetchPriority="high"
              />
            </picture>
            <div className="fw-shade" aria-hidden="true" />

            <div className="fw-nav">
              <a className="fw-brand" href="#top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BRAND.logo} alt="" width={36} height={36} />
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
                <ArrowUpRight size={17} />
              </span>
            </a>

            <div className="fw-headline">
              <h1>
                <span>Nâng tầm</span>
                <strong>cú đánh</strong>
              </h1>
              <p>
                Golf 3D mô phỏng Foresight GC3, trải nghiệm khó quên và một cộng đồng cùng chung đam
                mê, giữa lòng thành phố.
              </p>
            </div>

            <div className="fw-bubble">Hơn cả một buổi chơi, một phiên bản tốt hơn của bạn.</div>

            <div className="fw-side-time" aria-label="Giờ mở cửa">
              <span>08:00 – 23:00</span>
              <small>Mỗi ngày</small>
            </div>

            <a className="fw-card fw-card-gold" href="#gio-vang">
              <div className="fw-chips" aria-hidden="true">
                <i>9</i>
                <i>18</i>
                <i>GDR</i>
                <i>VIP</i>
                <em>10 line</em>
              </div>
              <div className="fw-card-foot">
                <span>
                  <b>Giờ vàng miễn phí đồ uống</b>
                  <small>T2–T6 · 08:00–11:00 · GDR từ 100.000đ</small>
                </span>
                <span className="fw-arrow-dot">
                  <ArrowRight size={18} />
                </span>
              </div>
            </a>

            <a className="fw-card fw-card-discover" href="#dich-vu">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/space-wide.webp" alt="Khu vực chờ và line chơi" />
              <div className="fw-card-foot">
                <span>
                  <b>Khám phá phòng chơi của bạn.</b>
                  <small>10 line, trong đó 2 phòng VIP riêng tư.</small>
                </span>
                <span className="fw-arrow-dot">
                  <ArrowRight size={18} />
                </span>
              </div>
            </a>

            <a className="fw-scroll" href="#dich-vu" aria-label="Cuộn xuống">
              <ArrowDown size={20} />
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

          <div className="fw-gallery" data-sc-in>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/space-wide.webp"
              alt="Khu vực chờ và line chơi với màn hình mô phỏng tại Saigon Golf 3D Club"
              width={2000}
              height={667}
              loading="lazy"
            />
          </div>
          <div className="fw-gc3" data-sc-in data-sc-stagger="90">
            <div>
              <p className="fw-kicker fw-kicker-light">Công nghệ</p>
              <h3>Foresight GC3 đo từng cú đánh</h3>
              <p>
                Thiết bị theo dõi bóng với ba camera, ghi lại tốc độ, góc phóng, độ xoáy và quỹ đạo
                của từng cú đánh rồi hiển thị ngay trên màn hình mô phỏng để bạn chỉnh swing.
              </p>
              <small>Ảnh thiết bị: Foresight Sports.</small>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/gc3.webp"
              alt="Thiết bị Foresight GC3 nhìn từ phía trước, bên cạnh và phía sau"
              width={1200}
              height={1019}
              loading="lazy"
            />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="fw-contact-img"
              src="/img/space-ball.webp"
              alt="Quả bóng golf trên thảm cỏ trong phòng chơi Saigon Golf 3D Club"
              width={900}
              height={900}
              loading="lazy"
            />
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
