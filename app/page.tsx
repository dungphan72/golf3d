import type { Metadata } from 'next';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import BookingPage from './ui/BookingPage';
import HomeGallery from './ui/HomeGallery';
import { packageBullets, type PriceTable } from '../lib/price-table';
import { publicPricing } from '../lib/server/pricing-service';
import { getPublicLandingConfig } from '../lib/server/landing-service';
import { bookingSlug } from '../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from './ui/SiteChrome';
import { Icon, type IconName } from './ui/Icon';
import './home2.css';

export const dynamic = 'force-dynamic';

const TITLE = 'SaiGon Indoor Golf Club — Golf 3D Foresight GC3 tại Bình Trưng, TP.HCM';
const DESCRIPTION =
  'Chơi golf 3D mô phỏng Foresight GC3, luyện tập và phòng VIP riêng tại 250 Lương Định Của, Bình Trưng, TP.HCM. Mở cửa mỗi ngày. Đặt lịch online, hotline 0877834888.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 628 }],
  },
};

const STEPS = [
  ['Chọn giờ', 'Đặt trên trang này hoặc gọi hotline. Nhân viên xác nhận line cho bạn.'],
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

const dong = (v: number | null) => (v == null ? '—' : money(v));

/** Price grid, one per room: one row per time slot. */
function RateGrid({ title, table }: { title: string; table: PriceTable }) {
  return (
    <div className="sg-panel">
      <h3>{title}</h3>
      <div className="sg-table">
        <table>
          <thead>
            <tr>
              <th>Khung giờ</th>
              <th>Luyện tập / giờ</th>
              <th>9 hố</th>
              <th>18 hố</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.key} className={r.gold ? 'gold' : undefined}>
                <td>
                  {r.days} · {r.from}–{r.to}
                  {r.gold && <span className="sg-tag">Giờ vàng</span>}
                </td>
                <td data-label="Luyện tập / giờ">{dong(r.gdr)}</td>
                <td data-label="9 hố">{dong(r.h9)}</td>
                <td data-label="18 hố">{dong(r.h18)}</td>
              </tr>
            ))}
            {(table.group.h9 != null || table.group.h18 != null) && (
              <tr>
                <td>Nhóm 4 người, cả ngày</td>
                <td data-label="Luyện tập / giờ">—</td>
                <td data-label="9 hố">{dong(table.group.h9)}</td>
                <td data-label="18 hố">{dong(table.group.h18)}</td>
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
  const bookLabel = slug ? 'Đặt line' : 'Gọi đặt line';
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`;
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(BRAND.address)}&output=embed`;
  const heroImage =
    landing.heroDesktopImage && landing.heroDesktopImage !== '/img/hero-room.webp'
      ? landing.heroDesktopImage
      : '/img/album-bays-panoramic.webp';
  const quick = pricing.groups[0]?.items.slice(0, 3) ?? [];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: BRAND.name,
    description: DESCRIPTION,
    telephone: BRAND.hotline,
    image: '/og.jpg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '250 Lương Định Của',
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
  const facts: [IconName, string, string][] = [
    ['flag', '10 + 2', '10 line tiêu chuẩn và 2 phòng VIP'],
    ['schedule', hours, 'Mở cửa mỗi ngày, kể cả cuối tuần'],
    ['payments', money(lowestGdr), 'Giá thấp nhất mỗi giờ, chưa gồm VAT'],
    ['speed', 'GC3', 'Đo tốc độ, góc phóng và độ xoáy từng cú'],
  ];
  const spaces = [
    {
      img: '/img/album-golfers-playing.webp',
      title: 'Line tiêu chuẩn',
      text: 'Mỗi line có thảm đánh, hộc bóng và hướng vào màn hình mô phỏng sân.',
      rows: [
        ['Số line', '10'],
        ['Nhóm', 'Tối đa 4 người'],
        ['Chơi', 'Luyện tập, 9 hố hoặc 18 hố'],
        ['Giá từ', `${money(lowestGdr)} / giờ`],
      ],
    },
    {
      img: '/img/album-vip-lounge.webp',
      title: 'Phòng VIP',
      text: 'Phòng đóng cửa cho nhóm bạn hoặc khách mời, có ghế sofa nghỉ ngay cạnh line.',
      rows: [
        ['Số phòng', '2'],
        ['Không gian', 'Riêng tư, có khu nghỉ'],
        ['Giá từ', `${money(vipFrom ?? 350000)} / giờ`],
      ],
    },
    {
      img: '/img/gc3.webp',
      dark: true,
      title: 'Radar Foresight GC3',
      text: 'Thiết bị đặt cạnh thảm đánh, đo từng cú và hiện số liệu ngay trên màn hình.',
      rows: [
        ['Đầu gậy', 'Tốc độ'],
        ['Bóng', 'Tốc độ, góc phóng, độ xoáy'],
        ['Màn hình', 'Quỹ đạo bay và điểm rơi'],
      ],
    },
  ];

  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <SiteHeader bookHref={bookHref} bookLabel={bookLabel} />

      <main id="top">
        <section className="sg-hero">
          <div className="sg-hero-copy">
            <p className="sg-kicker">250 Lương Định Của, Bình Trưng</p>
            <h1>Golf trong nhà, thấy từng cú đánh</h1>
            <p className="sg-lead">
              10 line tiêu chuẩn và 2 phòng VIP, đo bằng radar Foresight GC3. Mở cửa {hours} mỗi ngày.
            </p>
            <div className="sg-actions">
              <a className="sg-btn" href={bookHref}>
                <Icon name="event" size={20} />
                {bookLabel}
              </a>
              <a className="sg-btn sg-btn--quiet" href="#bang-gia">
                Xem bảng giá
              </a>
            </div>
            <p className="sg-assure">Không cần trả trước. Nhân viên gọi lại để xác nhận.</p>
          </div>
          <figure className="sg-hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt="Dãy line GB1 đến GB10 hướng vào màn hình mô phỏng sân"
              width={1024}
              height={768}
              fetchPriority="high"
            />
            <figcaption>
              <span className="sg-plate">
                <b>GB1–GB10</b>
                <span>10 line tiêu chuẩn</span>
              </span>
            </figcaption>
          </figure>
        </section>

        <ul className="sg-facts" aria-label="Thông tin nhanh">
          {facts.map(([icon, big, label]) => (
            <li key={label}>
              <i className="sg-chip">
                <Icon name={icon} size={22} />
              </i>
              <b>{big}</b>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <section className="sg-in sg-block" id="phong">
          <header className="sg-head">
            <p className="sg-kicker">Chỗ chơi</p>
            <h2>Chọn line hay phòng VIP</h2>
            <p>Cùng một hệ thống đo Foresight GC3, khác nhau ở độ riêng tư và giá.</p>
          </header>
          <div className="sg-spaces">
            {spaces.map((s) => (
              <article key={s.title} className="sg-space">
                <div className={`sg-space-img${s.dark ? ' sg-space-img--dark' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.title} width={1024} height={768} loading="lazy" />
                </div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <dl>
                    {s.rows.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {!s.dark && (
                    <a className="sg-more" href="#bang-gia">
                      Xem bảng giá
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sg-flow sg-block" id="tien-ich">
          <div className="sg-in">
            <header className="sg-head">
              <p className="sg-kicker">Một buổi chơi</p>
              <h2>Từ lúc đặt đến lúc thanh toán</h2>
            </header>
            <ol className="sg-steps">
              {STEPS.map(([t, p]) => (
                <li key={t}>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="sg-in sg-block" id="album-anh">
          <header className="sg-head">
            <p className="sg-kicker">Không gian</p>
            <h2>Ảnh chụp tại câu lạc bộ</h2>
          </header>
          <HomeGallery photos={landing.galleryPhotos} />
        </section>

        <section className="sg-in sg-block" id="bang-gia" style={{ paddingTop: 0 }}>
          <header className="sg-head">
            <p className="sg-kicker">Giá chưa gồm VAT{vat}</p>
            <h2>Bảng giá</h2>
            <p>
              {group.h9 != null && group.h18 != null
                ? `Nhóm 4 người dùng giá nhóm cả ngày: ${money(group.h9)} cho 9 hố, ${money(group.h18)} cho 18 hố.`
                : 'Giá theo giờ cho từng loại phòng.'}
            </p>
          </header>
          <div className="sg-price">
            <div className="sg-price-main">
              {hasHoles ? (
                <>
                  <RateGrid title={pricing.vip ? 'Phòng tiêu chuẩn' : 'Bảng giá'} table={pricing.standard} />
                  {pricing.vip && <RateGrid title="Phòng VIP" table={pricing.vip} />}
                </>
              ) : (
                <div className="sg-panel">
                  <h3>Giá theo giờ</h3>
                  <div className="sg-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Khung giờ</th>
                          <th>{pricing.vip ? 'Tiêu chuẩn / giờ' : 'Giá / giờ'}</th>
                          {pricing.vip && <th>VIP / giờ</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.key} className={r.gold ? 'gold' : undefined}>
                            <td>
                              {r.days} · {r.from}–{r.to}
                              {r.gold && <span className="sg-tag">Giờ vàng</span>}
                            </td>
                            <td data-label={pricing.vip ? 'Tiêu chuẩn / giờ' : 'Giá / giờ'}>
                              {r.gdr == null ? '—' : money(r.gdr)}
                            </td>
                            {pricing.vip && (
                              <td data-label="VIP / giờ">
                                {vipRows.get(r.key)?.gdr == null ? '—' : money(vipRows.get(r.key)!.gdr!)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <aside className="sg-price-side">
              <div className="sg-panel sg-gold" id="gio-vang">
                <h3>
                  Giờ vàng <span className="sg-tag">Giá thấp hơn</span>
                </h3>
                <p className="sg-gold-when">
                  {gold.days} · {gold.from}–{gold.to}
                </p>
                <ul>
                  {hasHoles ? (
                    <>
                      <li>
                        <b>Luyện tập</b>
                        <strong>{money(gold.gdr ?? 0)}</strong>
                        <span>/ giờ</span>
                      </li>
                      <li>
                        <b>Game 9 hố</b>
                        <strong>{gold.h9 == null ? '—' : money(gold.h9)}</strong>
                        <span>/ người</span>
                      </li>
                      <li>
                        <b>Game 18 hố</b>
                        <strong>{gold.h18 == null ? '—' : money(gold.h18)}</strong>
                        <span>/ người</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <b>Phòng tiêu chuẩn</b>
                        <strong>{money(gold.gdr ?? 0)}</strong>
                        <span>/ giờ</span>
                      </li>
                      {vipFrom != null && (
                        <li>
                          <b>Phòng VIP</b>
                          <strong>{money(vipFrom)}</strong>
                          <span>/ giờ</span>
                        </li>
                      )}
                    </>
                  )}
                </ul>
                <p className="sg-fine">Tự áp dụng khi bạn đặt trong khung giờ này.</p>
              </div>

              {quick.length > 0 && (
                <div className="sg-panel sg-pk" id="goi">
                  <h3>{pricing.groups[0].title}</h3>
                  <ul>
                    {quick.map((p) => (
                      <li key={p.id}>
                        <span>
                          <b>{p.name}</b>
                          <small>{packageBullets(p)[0]}</small>
                        </span>
                        <strong>{money(p.price)}</strong>
                      </li>
                    ))}
                  </ul>
                  <a className="sg-btn sg-btn--quiet" href="/thanh-vien">
                    Xem tất cả gói và thẻ
                  </a>
                </div>
              )}
              <p className="sg-fine">
                <a href="/bang-gia">Bảng giá đầy đủ</a> · <a href="/tai-khoan">Tài khoản khách hàng</a>
              </p>
            </aside>
          </div>
        </section>

        {pricing.promotions.length > 0 && (
          <section className="sg-in sg-block" id="khuyen-mai" style={{ paddingTop: 0 }}>
            <header className="sg-head">
              <p className="sg-kicker">Ưu đãi</p>
              <h2>Khuyến mãi đang chạy</h2>
              <p>Tự áp dụng khi đặt và khi tính tiền.</p>
            </header>
            <div className="sg-promos">
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

        <section className="sg-book sg-in sg-block" id="dat-cho">
          <div className="sg-book-grid">
            <div id="lien-he">
              <p className="sg-kicker" style={{ color: 'var(--sg-gold)' }}>
                Đặt chỗ
              </p>
              <h2>Giữ line cho buổi chơi của bạn</h2>
              <p className="sg-lead">Gửi yêu cầu, nhân viên gọi xác nhận. Không cần trả trước.</p>
              <dl className="sg-contact">
                <div>
                  <dt>
                    <Icon name="location" size={20} />
                    Địa chỉ
                  </dt>
                  <dd>{BRAND.address}</dd>
                </div>
                <div>
                  <dt>
                    <Icon name="phone" size={20} />
                    Hotline
                  </dt>
                  <dd>
                    <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Icon name="schedule" size={20} />
                    Giờ mở cửa
                  </dt>
                  <dd>{hours} mỗi ngày</dd>
                </div>
              </dl>
              <div className="sg-map">
                <iframe
                  title="Bản đồ SaiGon Indoor Golf Club"
                  src={mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a className="sg-map-link" href={mapHref} target="_blank" rel="noopener noreferrer">
                <Icon name="directions" size={20} />
                Mở chỉ đường trên Google Maps
              </a>
            </div>

            <div className="sg-form">
              <h3>Đặt line hoặc phòng VIP</h3>
              <p>Điền thông tin bên dưới, chúng tôi gọi lại để chốt giờ.</p>
              {slug ? (
                <BookingPage slug={slug} embedded />
              ) : (
                <div className="sg-call">
                  <h3>Đặt chỗ qua hotline</h3>
                  <p>Chưa mở đặt online. Vui lòng gọi để giữ line.</p>
                  <a className="sg-btn" href={`tel:${BRAND.hotline}`}>
                    Gọi {BRAND.hotline}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="sg-in sg-block">
          <header className="sg-head">
            <p className="sg-kicker">Giải đáp</p>
            <h2>Câu hỏi thường gặp</h2>
          </header>
          <div className="sg-faq">
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
