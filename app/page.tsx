import type { Metadata } from 'next';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import BookingPage from './ui/BookingPage';
import HomeGallery from './ui/HomeGallery';
import { grantLine, validityText, type PriceTable } from '../lib/price-table';
import { publicPricing } from '../lib/server/pricing-service';
import { getPublicLandingConfig } from '../lib/server/landing-service';
import { bookingSlug } from '../lib/server/online-service';
import { SiteFooter } from './ui/SiteChrome';
import './home.css';

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
  ['Chọn giờ', 'Đặt trên trang này hoặc gọi hotline. Nhân viên xác nhận line.'],
  ['Vào line', 'Mỗi line riêng, hướng vào màn hình mô phỏng sân.'],
  ['Đo từng cú', 'Tốc độ, góc phóng, độ xoáy và quỹ đạo hiện ngay trên màn hình.'],
  ['Thanh toán sau', 'Chơi xong mới trả: tiền mặt, thẻ hoặc QR.'],
];

const faqFor = (group: string, goldText: string, holes: boolean) => [
  holes
    ? {
        q: 'Giá 9 hố, 18 hố tính thế nào?',
        a: `Tính theo đầu người cho nhóm 1–3 người. Nhóm 4 người dùng giá nhóm${group} cho cả buổi, áp dụng cả ngày.`,
      }
    : {
        q: 'Giá theo giờ tính thế nào?',
        a: 'Tính theo giờ cho mỗi phòng. Phòng tiêu chuẩn và phòng VIP có giá riêng; giá thay đổi theo khung giờ như bảng giá.',
      },
  { q: 'Giờ vàng là gì?', a: `${goldText}. Giá trong khung giờ này thấp hơn khung thường.` },
  {
    q: 'Đặt lịch online có cần thanh toán trước không?',
    a: 'Mặc định không cần đặt cọc. Nhân viên sẽ xác nhận yêu cầu và thông tin thanh toán trước buổi chơi.',
  },
  {
    q: 'Gói trả trước dùng thế nào?',
    a: 'Mua tại quầy hoặc gọi hotline. Mỗi lần chơi nhân viên trừ giờ trong gói.',
  },
];

const dong = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('vi-VN')}đ / VND`);

/** Price grid, one per room: one row per time slot. */
function RateGrid({ title, table }: { title?: string; table: PriceTable }) {
  return (
    <div className="hm-grid">
      {title && <h3>{title}</h3>}
      <div className="hm-table">
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
  const [slug, pricing, landing] = await Promise.all([
    bookingSlug(),
    publicPricing(),
    getPublicLandingConfig(),
  ]);
  const rows = pricing.standard.rows;
  const group = pricing.standard.group;
  const gold = rows.find((r) => r.gold) ?? rows[0];
  const lowestGdr = Math.min(...rows.map((r) => r.gdr ?? Infinity));
  const vipRows = new Map((pricing.vip?.rows ?? []).map((r) => [r.key, r]));
  const vipFrom = vipRows.get(gold.key)?.gdr ?? null;
  const groupText =
    group.h9 != null && group.h18 != null
      ? `: ${money(group.h9)} (9 hố) hoặc ${money(group.h18)} (18 hố)`
      : '';
  const hours = `${pricing.open}–${pricing.close}`;
  const hasHoles = rows.some((r) => r.h9 != null || r.h18 != null);
  const vat = pricing.vat != null ? ` ${pricing.vat}%` : '';
  const faq = faqFor(
    groupText,
    `Giờ vàng là khung giá ưu đãi: ${gold.days}, ${gold.from}–${gold.to}`,
    hasHoles,
  );
  const bookHref = slug ? '#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`;
  const heroImage =
    landing.heroDesktopImage && landing.heroDesktopImage !== '/img/hero-room.webp'
      ? landing.heroDesktopImage
      : '/img/album-bays-panoramic.webp';
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
    ['#phong', 'Phòng'],
    ['#bang-gia', 'Giá'],
    ['#goi', 'Gói'],
    ['#lien-he', 'Liên hệ'],
  ];

  return (
    <div className="hm">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header className="hm-bar">
        <a className="hm-brand" href="#top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={32} height={32} />
          <span>{BRAND.name}</span>
        </a>
        <nav aria-label="Điều hướng">
          {nav.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a href="/tai-khoan">Cổng khách hàng</a>
        </nav>
        <a className="hm-btn hm-btn-portal hm-portal-top" href="/tai-khoan">
          Cổng khách hàng
        </a>
        <a className="hm-btn hm-btn-solid hm-book-top" href={bookHref}>
          {bookLabel}
        </a>
      </header>

      <main id="top">
        <section className="hm-hero">
          <div className="hm-hero-copy">
            <p className="hm-badge">Foresight GC3 · Bình Trưng, TP.HCM</p>
            <h1>
              Trải nghiệm golf 3D, đo từng <em>cú đánh</em>
            </h1>
            <p>Phòng riêng, thiết bị Foresight GC3, mở cửa mỗi ngày.</p>
            <div className="hm-hero-cta">
              <a className="hm-btn hm-btn-brass" href={bookHref}>
                {bookLabel}
              </a>
              <a className="hm-btn hm-btn-line" href={`tel:${BRAND.hotline}`}>
                {BRAND.hotline}
              </a>
            </div>
          </div>
          <figure className="hm-hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={landing.brandName || 'Phòng chơi Saigon Golf 3D Club'}
              width={1024}
              height={768}
              fetchPriority="high"
            />
          </figure>
          <dl className="hm-facts">
            <div>
              <dt>Line</dt>
              <dd>10 + 2 VIP</dd>
            </div>
            <div>
              <dt>Mở cửa</dt>
              <dd>{hours}</dd>
            </div>
            <div>
              <dt>Từ</dt>
              <dd>{money(lowestGdr)}/giờ</dd>
            </div>
            <div>
              <dt>Thiết bị</dt>
              <dd>Foresight GC3</dd>
            </div>
          </dl>
        </section>

        <section className="hm-section" id="dich-vu">
          <h2>Một buổi chơi</h2>
          <ol className="hm-steps">
            {STEPS.map(([t, p], i) => (
              <li key={t}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="hm-section" id="phong">
          <h2>Phòng chơi</h2>
          <div className="hm-rooms">
            <article>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/space-wide.webp" alt="Line tiêu chuẩn" width={1024} height={768} loading="lazy" />
              <h3>Line tiêu chuẩn</h3>
              <p>10 line tiêu chuẩn, sử dụng thiết bị Foresight GC3.</p>
              <p className="hm-price">
                Từ <strong>{money(lowestGdr)}</strong> / giờ
              </p>
            </article>
            <article>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/fs-lounge.webp" alt="Phòng VIP" width={1024} height={576} loading="lazy" />
              <h3>Phòng VIP</h3>
              <p>2 phòng VIP riêng.</p>
              <p className="hm-price">
                Từ <strong>{money(vipFrom ?? 350000)}</strong> / giờ
              </p>
            </article>
          </div>
        </section>

        <section className="hm-dark" id="gc3">
          <div className="hm-dark-in">
            <div>
              <h2>Thiết bị Foresight GC3</h2>
              <p>Foresight GC3 được trang bị tại các line tiêu chuẩn của câu lạc bộ.</p>
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

        <section className="hm-section" id="album-anh">
          <h2>Không gian</h2>
          <HomeGallery photos={landing.galleryPhotos} />
        </section>

        <section className="hm-section hm-gold" id="gio-vang">
          <div>
            <p className="hm-eyebrow">
              {gold.days} · {gold.from}–{gold.to}
            </p>
            <h2>Giờ vàng</h2>
            <p>Giá thấp hơn khung thường. Chưa gồm VAT{vat}.</p>
          </div>
          <ul>
            {hasHoles ? (
              <>
                <li>
                  <strong>{money(gold.gdr ?? 0)}</strong>
                  <span>luyện tập / giờ</span>
                </li>
                <li>
                  <strong>{gold.h9 == null ? '—' : money(gold.h9)}</strong>
                  <span>9 hố / người</span>
                </li>
                <li>
                  <strong>{gold.h18 == null ? '—' : money(gold.h18)}</strong>
                  <span>18 hố / người</span>
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>{money(gold.gdr ?? 0)}</strong>
                  <span>phòng tiêu chuẩn / giờ</span>
                </li>
                {vipFrom != null && (
                  <li>
                    <strong>{money(vipFrom)}</strong>
                    <span>phòng VIP / giờ</span>
                  </li>
                )}
              </>
            )}
          </ul>
        </section>

        <section className="hm-section" id="bang-gia">
          <h2>Bảng giá</h2>
          <p className="hm-note">
            Giá chưa gồm VAT{vat}.
            {group.h9 != null && group.h18 != null
              ? ` Nhóm 4 người dùng giá nhóm cả ngày: ${money(group.h9)} cho 9 hố, ${money(group.h18)} cho 18 hố.`
              : ''}
          </p>
          {hasHoles ? (
            <>
              <RateGrid title={pricing.vip ? 'Phòng tiêu chuẩn' : undefined} table={pricing.standard} />
              {pricing.vip && <RateGrid title="Phòng VIP" table={pricing.vip} />}
            </>
          ) : (
            <div className="hm-table">
              <table>
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    <th>{pricing.vip ? 'Phòng tiêu chuẩn / giờ' : 'Giá / giờ'}</th>
                    {pricing.vip && <th>Phòng VIP / giờ</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        {r.days} · {r.from}–{r.to}
                        {r.gold && <em> Giờ vàng</em>}
                      </td>
                      <td>{r.gdr == null ? '—' : money(r.gdr)}</td>
                      {pricing.vip && (
                        <td>
                          {vipRows.get(r.key)?.gdr == null ? '—' : money(vipRows.get(r.key)!.gdr!)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="hm-note">
            <a href="/bang-gia">Bảng giá đầy đủ</a> · <a href="/thanh-vien">Thẻ hội viên</a> ·{' '}
            <a href="/tai-khoan">Cổng khách hàng</a>
          </p>
        </section>

        {pricing.promotions.length > 0 && (
          <section className="hm-section" id="khuyen-mai">
            <h2>Khuyến mãi</h2>
            <p className="hm-note">Tự áp dụng khi đặt và tính tiền.</p>
            <div className="hm-promos">
              {pricing.promotions.map((p) => (
                <article key={p.id}>
                  <h3>{p.name}</h3>
                  <strong>{p.benefit}</strong>
                  <p>{p.condition}</p>
                  {p.description && <p>{p.description}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="hm-section" id="goi">
          <h2>Gói hội viên</h2>
          <p className="hm-note">
            Đăng ký tại quầy hoặc gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>.
          </p>
          {pricing.groups.map((g) => (
            <div key={g.id} className="hm-pk-group">
              <h3>{g.title}</h3>
              <div className="hm-pk-grid">
                {g.items.map((p) => (
                  <article key={p.id} className={g.vip ? 'vip' : undefined}>
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
        </section>

        <section className="hm-portal" id="cong-khach-hang">
          <div>
            <p className="hm-eyebrow">Dành riêng cho khách hàng</p>
            <h2>Cổng khách hàng</h2>
            <p>
              Đăng nhập để theo dõi yêu cầu đặt chỗ, lịch chơi, gói hội viên và lịch sử sử dụng của
              bạn.
            </p>
          </div>
          <ul>
            <li>Yêu cầu đặt chỗ và lịch chơi</li>
            <li>Thẻ, gói và số dư hiện có</li>
            <li>Thông tin tài khoản và lịch sử</li>
          </ul>
          <a className="hm-btn hm-btn-brass" href="/tai-khoan">
            Vào cổng khách hàng
          </a>
        </section>

        <section className="hm-section hm-booking" id="dat-cho">
          <div>
            <h2>Đặt chỗ</h2>
            <p className="hm-note">Gửi yêu cầu, chúng tôi gọi xác nhận. Không cần trả trước.</p>
            <div className="hm-faq">
              {faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="hm-form">
            {slug ? (
              <BookingPage slug={slug} embedded />
            ) : (
              <div className="hm-call">
                <h3>Đặt chỗ qua hotline</h3>
                <p>Chưa mở đặt online. Vui lòng gọi để giữ line.</p>
                <a className="hm-btn hm-btn-solid" href={`tel:${BRAND.hotline}`}>
                  Gọi {BRAND.hotline}
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="hm-dark hm-contact" id="lien-he">
          <div className="hm-dark-in">
            <div>
              <h2>Liên hệ</h2>
              <ul>
                <li>{BRAND.address}</li>
                <li>Mở cửa mỗi ngày {hours}</li>
                <li>
                  <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
                </li>
              </ul>
              <div className="hm-hero-cta">
                <a className="hm-btn hm-btn-brass" href={bookHref}>
                  {bookLabel}
                </a>
                <a className="hm-btn hm-btn-line" href={mapHref} target="_blank" rel="noopener noreferrer">
                  Chỉ đường
                </a>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/space-ball.webp"
              alt="Quả bóng golf trên thảm cỏ trong phòng chơi Saigon Golf 3D Club"
              width={1024}
              height={576}
              loading="lazy"
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
