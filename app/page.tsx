import type { Metadata } from 'next';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import BookingPage from './ui/BookingPage';
import LandingFx from './ui/LandingFx';
import { PromoCards } from './ui/PromoCards';
import QuickBookingBar from './ui/QuickBookingBar';
import RoomShowcase from './ui/RoomShowcase';
import ClubAmenities from './ui/ClubAmenities';
import ClubGalleryAlbum from './ui/ClubGalleryAlbum';
import PriceEstimator from './ui/PriceEstimator';
import TestimonialSection from './ui/TestimonialSection';
import ClubFooter from './ui/ClubFooter';
import { grantLine, validityText, type PriceTable } from '../lib/price-table';
import { publicPricing } from '../lib/server/pricing-service';
import { getPublicLandingConfig } from '../lib/server/landing-service';
import { bookingSlug } from '../lib/server/online-service';
import './landing.css';

export const dynamic = 'force-dynamic';

const TITLE = 'Saigon Golf 3D Club — Golf 3D Foresight GC3 tại Bình Trưng, TP.HCM';
const DESCRIPTION =
  'Chơi golf 3D mô phỏng Foresight GC3, luyện tập và phòng VIP riêng tại 250 Lương Đình Của, Bình Trưng, TP.HCM. Mở cửa mỗi ngày. Đặt lịch online, hotline 0902030185.';

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
    p: 'Chơi theo giờ đã đặt, gọi đồ uống tại line. Trả tiền mặt, thẻ hoặc quét mã QR.',
  },
];

const faqFor = (group: string, tax: string, goldText: string, holes: boolean) => [
  holes
    ? {
        q: 'Giá 9 hố, 18 hố tính thế nào?',
        a: `Tính theo đầu người cho nhóm 1–3 người. Nhóm 4 người dùng giá nhóm${group} cho cả buổi, áp dụng cả ngày.`,
      }
    : {
        q: 'Giá theo giờ tính thế nào?',
        a: 'Tính theo giờ cho mỗi phòng. Phòng tiêu chuẩn và phòng VIP có giá riêng; giá thay đổi theo khung giờ như bảng bên trên.',
      },
  {
    q: 'Người mới chưa từng chơi golf có đến tập được không?',
    a: 'Hoàn toàn được! Câu lạc bộ có sẵn gậy tập cho người mới, nhân viên hỗ trợ cài đặt máy và hướng dẫn cơ bản. Bạn cũng có thể đăng ký gói hướng dẫn cùng Huấn luyện viên.',
  },
  {
    q: 'Có cần tự mang theo gậy và bóng riêng không?',
    a: 'Không bắt buộc. Câu lạc bộ miễn phí mượn các bộ gậy cao cấp (TaylorMade, Callaway, Titleist) và bóng chuyên dụng. Golfer vẫn có thể mang túi gậy cá nhân nếu muốn làm quen.',
  },
  {
    q: 'Câu lạc bộ có chỗ đỗ xe ô tô không?',
    a: 'Có. Bãi đỗ xe ô tô và xe máy rộng rãi, an ninh ngay trước cửa cơ sở tại số 250 Lương Đình Của với bảo vệ hỗ trợ tận tình suốt buổi chơi.',
  },
  {
    q: 'Giờ vàng là gì?',
    a: `${goldText}. Giá trong khung giờ này thấp hơn khung thường.`,
  },
  {
    q: 'Đặt lịch online có cần thanh toán trước không?',
    a: 'Không. Bạn chỉ cần gửi yêu cầu, nhân viên gọi xác nhận lịch và line. Bạn chỉ thanh toán sau khi kết thúc buổi chơi bằng tiền mặt, thẻ hoặc chuyển khoản quét mã VietQR.',
  },
  {
    q: 'Gói trả trước dùng thế nào?',
    a: 'Mua gói tại quầy hoặc gọi hotline. Gói ghi rõ số giờ, thời hạn và loại phòng áp dụng; nhân viên sẽ trừ giờ mỗi lần bạn đến chơi.',
  },
];

// Counting animation only when the price is a round thousand (it renders as N.000đ).
function Count({ v }: { v: number | null }) {
  if (v == null) return <>—</>;
  if (v % 1000 !== 0) return <>{money(v)}</>;
  return (
    <>
      <span data-sc-count={`0 ${v / 1000}`}>{v / 1000}</span>.000đ
    </>
  );
}

const dong = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('vi-VN')}đ / VND`);

/** Price grid, one per room: navy header, one row per time slot. */
function RateGrid({ title, table }: { title?: string; table: PriceTable }) {
  return (
    <div className="fw-grid-wrap" data-sc-in>
      {title && <h3>{title}</h3>}
      <div className="fw-table-card fw-grid">
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Luyện tập / 1 giờ</th>
              <th>Game 9 hố</th>
              <th>Game 18 hố</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.key}>
                <td>
                  {r.days} | {r.from}–{r.to}
                  {r.gold ? ' (Giờ vàng)' : ''}
                </td>
                <td>{dong(r.gdr)}</td>
                <td>{dong(r.h9)}</td>
                <td>{dong(r.h18)}</td>
              </tr>
            ))}
            {(table.group.h9 != null || table.group.h18 != null) && (
              <tr>
                <td>Đánh nhóm 4 người (cả ngày)</td>
                <td>—</td>
                <td>{dong(table.group.h9)}</td>
                <td>{dong(table.group.h18)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const [slug, pricing, landing] = await Promise.all([bookingSlug(), publicPricing(), getPublicLandingConfig()]);
  const rows = pricing.standard.rows;
  const group = pricing.standard.group;
  const gold = rows.find((r) => r.gold) ?? rows[0];
  const lowestGdr = Math.min(...rows.map((r) => r.gdr ?? Infinity));
  const groupText =
    group.h9 != null && group.h18 != null
      ? `: ${money(group.h9)} (9 hố) hoặc ${money(group.h18)} (18 hố)`
      : '';
  const hours = `${pricing.open}–${pricing.close}`;
  const hasHoles = rows.some((r) => r.h9 != null || r.h18 != null);
  const vipRows = new Map((pricing.vip?.rows ?? []).map((r) => [r.key, r]));
  const faq = faqFor(
    groupText,
    pricing.vat != null ? ` ${pricing.vat}%` : '',
    `Giờ vàng là khung giá ưu đãi: ${gold.days}, ${gold.from}–${gold.to}`,
    hasHoles,
  );
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
        opens: pricing.open,
        closes: pricing.close,
      },
    ],
  };
  const nav = [
    ['#dich-vu', 'Trải nghiệm'],
    ['#album-anh', 'Hình ảnh'],
    ['#tien-ich', 'Tiện ích'],
    ['#gio-vang', 'Giờ vàng'],
    ['#bang-gia', 'Bảng giá'],
    ...(pricing.promotions.length ? [['#khuyen-mai', 'Khuyến mãi']] : []),
    ['#danh-gia', 'Đánh giá'],
    ['#lien-he', 'Liên hệ'],
  ];
  return (
    <div className="fw">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/scrollcraft/scrollcraft.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
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
        {}
        <a
          className="fw-acct"
          href="/tai-khoan"
          aria-label="Đăng nhập / Đăng ký hội viên"
          title="Đăng nhập / Đăng ký"
        >
          <UserRound size={18} />
        </a>
        <a className="fw-pill-cta" href={bookHref}>
          {bookLabel} <ArrowUpRight size={16} />
        </a>
      </header>

      <main id="top">
        <section className="fw-hero">
          <div className="fw-stage">
            <picture>
              <source media="(max-width: 860px)" srcSet={landing.heroMobileImage || '/img/hero-room-m.webp'} />
              {}
              <img
                className="fw-scene"
                src={landing.heroDesktopImage || '/img/hero-room.webp'}
                alt={landing.brandName || 'Phòng chơi Saigon Golf 3D Club'}
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
            <div className="fw-top-right">
              {}
              <a
                className="fw-arrow-dot fw-acct-hero"
                href="/tai-khoan"
                aria-label="Đăng nhập / Đăng ký hội viên"
                title="Đăng nhập / Đăng ký"
              >
                <UserRound size={19} />
              </a>
              <a className="fw-top-book" href={bookHref}>
                {bookLabel}{' '}
                <span className="fw-arrow-dot">
                  <ArrowUpRight size={17} />
                </span>
              </a>
            </div>

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

            <div className="fw-side-time" aria-label="Giờ mở cửa">
              <span>
                {pricing.open} – {pricing.close}
              </span>
              <small>Mỗi ngày</small>
            </div>

            <a className="fw-card fw-card-gold" href="#gio-vang">
              <div className="fw-chips" aria-hidden="true">
                {hasHoles && (
                  <>
                    <i>9</i>
                    <i>18</i>
                  </>
                )}
                <i>Luyện tập</i>
                <i>VIP</i>
                <em>10 line</em>
              </div>
              <div className="fw-card-foot">
                <span>
                  <b>Giờ vàng giá ưu đãi</b>
                  <small>
                    {gold.days} · {gold.from}–{gold.to} · từ {money(lowestGdr)}/giờ
                  </small>
                </span>
                <span className="fw-arrow-dot">
                  <ArrowRight size={18} />
                </span>
              </div>
            </a>

            <a className="fw-card fw-card-discover" href="#dich-vu">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/fs-castle.webp" alt="Không gian phòng chơi golf 3D cao cấp" />
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
          <QuickBookingBar
            lowestPrice={lowestGdr}
            goldTimeText={`${gold.days}, ${gold.from}–${gold.to}`}
          />
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

          <div className="fw-head" style={{ marginTop: '3.5rem' }} data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Không gian & Tiêu chuẩn</p>
            <h2>Chọn phòng chơi phù hợp với bạn</h2>
            <p className="fw-sub">
              Hệ thống 10 line hiện đại: 8 line tiêu chuẩn thoáng đãng và 2 phòng VIP riêng tư.
            </p>
          </div>
          <RoomShowcase
            standardPrice={lowestGdr}
            vipPrice={vipRows.get(gold.key)?.gdr ?? 350000}
          />

          <div className="fw-gc3" data-sc-in data-sc-stagger="90">
            <div>
              <p className="fw-kicker fw-kicker-light">Công nghệ</p>
              <h3>Foresight GC3 đo từng cú đánh</h3>
              <p>
                Thiết bị theo dõi bóng với ba camera tốc độ cao, ghi lại tốc độ đầu gậy, góc phóng,
                độ xoáy và quỹ đạo của từng cú đánh rồi hiển thị tức thì trên màn hình mô phỏng để
                bạn hoàn thiện kỹ thuật swing.
              </p>
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

        {/* Real Club Space Photo Album Gallery */}
        <ClubGalleryAlbum photos={landing.galleryPhotos} />

        <section id="tien-ich" className="fw-section fw-tint">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Đặc quyền hội viên & khách chơi</p>
            <h2>Tiện ích trọn vẹn từng buổi tập</h2>
            <p className="fw-sub">
              Từ thiết bị đo đạc PGA, gậy tập miễn phí đến quầy đồ uống phục vụ tận nơi.
            </p>
          </div>
          <ClubAmenities />
        </section>

        <section id="gio-vang" className="fw-section fw-tight">
          <div className="fw-gold-panel" data-sc-in data-sc-stagger="90">
            <div>
              <p className="fw-kicker fw-kicker-light">
                {gold.days} · {gold.from}–{gold.to}
              </p>
              <h2>Giờ vàng, giá tốt nhất trong ngày</h2>
              <p className="fw-sub fw-sub-light">
                Giá trong khung giờ này thấp hơn khung thường. Giá chưa gồm VAT
                {pricing.vat != null ? ` ${pricing.vat}%` : ''}.
              </p>
            </div>
            <div className="fw-figs">
              {hasHoles ? (
                <>
                  <div>
                    <strong>
                      <Count v={gold.gdr} />
                    </strong>
                    <span>luyện tập / giờ</span>
                  </div>
                  <div>
                    <strong>
                      <Count v={gold.h9} />
                    </strong>
                    <span>9 hố / người</span>
                  </div>
                  <div>
                    <strong>
                      <Count v={gold.h18} />
                    </strong>
                    <span>18 hố / người</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong>
                      <Count v={gold.gdr} />
                    </strong>
                    <span>phòng tiêu chuẩn / giờ</span>
                  </div>
                  {vipRows.get(gold.key)?.gdr != null && (
                    <div>
                      <strong>
                        <Count v={vipRows.get(gold.key)!.gdr} />
                      </strong>
                      <span>phòng VIP / giờ</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <section id="bang-gia" className="fw-section">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Bảng giá</p>
            <h2>Giá niêm yết, không phụ phí ẩn</h2>
            <p className="fw-sub">
              Giá chưa gồm VAT{pricing.vat != null ? ` ${pricing.vat}%` : ''}.
              {group.h9 != null && group.h18 != null
                ? ` Nhóm 4 người dùng giá nhóm cả ngày: ${money(group.h9)} cho 9 hố, ${money(group.h18)} cho 18 hố.`
                : hasHoles
                  ? ' Game 9 hố và 18 hố tính theo người, Luyện tập tính theo giờ.'
                  : ''}
            </p>
          </div>
          {hasHoles ? (
            <>
              <RateGrid
                title={pricing.vip ? 'Phòng tiêu chuẩn' : undefined}
                table={pricing.standard}
              />
              {pricing.vip && <RateGrid title="Phòng VIP" table={pricing.vip} />}
            </>
          ) : (
            <div className="fw-table-card" data-sc-in>
              <table>
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    {hasHoles ? (
                      <>
                        <th>Luyện tập / giờ</th>
                        <th>9 hố / người</th>
                        <th>18 hố / người</th>
                      </>
                    ) : (
                      <>
                        <th>{pricing.vip ? 'Phòng tiêu chuẩn / giờ' : 'Giá / giờ'}</th>
                        {pricing.vip && <th>Phòng VIP / giờ</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        {r.days} · {r.from}–{r.to}
                        {r.gold && <em>Giờ vàng</em>}
                      </td>
                      <td>{r.gdr == null ? '—' : money(r.gdr)}</td>
                      {hasHoles ? (
                        <>
                          <td>{r.h9 == null ? '—' : money(r.h9)}</td>
                          <td>{r.h18 == null ? '—' : money(r.h18)}</td>
                        </>
                      ) : (
                        pricing.vip && (
                          <td>
                            {vipRows.get(r.key)?.gdr == null
                              ? '—'
                              : money(vipRows.get(r.key)!.gdr!)}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                  {hasHoles && (group.h9 != null || group.h18 != null) && (
                    <tr className="fw-group">
                      <td>Nhóm 4 người (cả ngày)</td>
                      <td>—</td>
                      <td>{group.h9 == null ? '—' : `${money(group.h9)} / nhóm`}</td>
                      <td>{group.h18 == null ? '—' : `${money(group.h18)} / nhóm`}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PriceEstimator
            standardTable={pricing.standard}
            vipTable={pricing.vip}
            vat={pricing.vat}
          />
          <p className="fw-note">
            <a href="/bang-gia">Xem bảng giá đầy đủ</a> · <a href="/thanh-vien">Thẻ hội viên</a> ·{' '}
            <a href="/tai-khoan">Tài khoản hội viên</a>
          </p>
        </section>

        {pricing.promotions.length > 0 && (
          <section id="khuyen-mai" className="fw-section fw-tight">
            <div className="fw-head" data-sc-in data-sc-stagger="70">
              <p className="fw-kicker">Khuyến mãi</p>
              <h2>Đang có ưu đãi</h2>
              <p className="fw-sub">
                Giá khuyến mãi tự áp dụng khi đặt và tính tiền, không cần nhập mã.
              </p>
            </div>
            <PromoCards promotions={pricing.promotions} />
          </section>
        )}

        <section id="goi" className="fw-section fw-tint">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Gói hội viên</p>
            <h2>Mua trước, chơi nhiều hơn</h2>
            <p className="fw-sub">
              {hasHoles
                ? 'Mỗi lượt 9 hố hoặc 18 hố tích 1 điểm; đủ 10 điểm đổi 1 lượt miễn phí. '
                : ''}
              Đăng ký tại quầy hoặc gọi hotline để được tư vấn gói phù hợp.
            </p>
          </div>
          <div className="fw-pk-groups">
            {pricing.groups.map((g) => (
              <div key={g.id} className="fw-pk-group" data-sc-in data-sc-stagger="60">
                <h3>{g.title}</h3>
                <div className="fw-pk-grid">
                  {g.items.map((p) => (
                    <article key={p.id} className={'fw-pk' + (g.vip ? ' vip' : '')}>
                      <h4>{p.name}</h4>
                      <strong>{money(p.price)}</strong>
                      <p>{p.grants.map(grantLine).join(' + ')}</p>
                      <small>
                        {validityText(p.validDays)}
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

        <section id="danh-gia" className="fw-section">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Cộng đồng Golfer</p>
            <h2>Khách hàng nói gì về Saigon Golf 3D</h2>
            <p className="fw-sub">
              Hơn 1,200 Golfer tại TP.HCM đã lựa chọn chúng tôi để luyện tập và giao lưu mỗi tuần.
            </p>
          </div>
          <TestimonialSection />
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
                {faq.map((f) => (
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
                  <Clock size={18} /> Mở cửa mỗi ngày {hours}
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

      <ClubFooter hours={hours} />
      <LandingFx />
    </div>
  );
}
