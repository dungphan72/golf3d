import type { Metadata } from 'next';
import { BRAND } from '../lib/brand';
import { money } from '../lib/club';
import { OFFICIAL_PACKAGES } from '../lib/official-packages';
import { KIND_LABELS, UNLIMITED } from '../lib/member';
import BookingPage from './ui/BookingPage';
import ScrollCraftMount from './ui/ScrollCraftMount';
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
    note: 'giờ vàng',
    gdr: 100_000,
    h9: 300_000,
    h18: 400_000,
  },
  { when: 'Thứ 2 – Thứ 6 · 11:00–23:00', note: '', gdr: 250_000, h9: 500_000, h18: 650_000 },
  { when: 'Thứ 7, Chủ nhật & lễ · 08:00–23:00', note: '', gdr: 250_000, h9: 500_000, h18: 650_000 },
];

const GROUPS: { title: string; keys: string[]; note?: string }[] = [
  { title: 'Chơi 9 hố', keys: ['h9-10', 'h9-20'] },
  { title: 'Chơi 18 hố', keys: ['h18-10', 'h18-20'] },
  {
    title: 'Luyện tập GDR',
    keys: ['gdr-peak-10', 'gdr-10', 'gdr-20', 'gdr-1m', 'gdr-3m', 'gdr-6m', 'gdr-12m'],
  },
  { title: 'Thẻ VIP', keys: ['vip-platinum', 'vip-diamond'] },
];

const grantsText = (grants: (typeof OFFICIAL_PACKAGES)[number]['grants']) =>
  grants
    .map((g) => `${g.qty >= UNLIMITED ? 'Không giới hạn' : g.qty} ${KIND_LABELS[g.kind]}`)
    .join(' + ');
const validText = (days: number) => (days % 30 === 0 ? `${days / 30} tháng` : `${days} ngày`);

const STEPS = [
  {
    t: 'Chọn line và giờ chơi.',
    p: 'Đặt online ngay trên trang này hoặc gọi hotline. Nhân viên xác nhận line phù hợp.',
  },
  {
    t: 'Vào line riêng, vung gậy.',
    p: 'Mỗi line là một không gian riêng, hướng tới màn hình mô phỏng sân. Nắng mưa đều chơi được.',
  },
  {
    t: 'Foresight GC3 đo từng cú đánh.',
    p: 'Tốc độ, góc phóng, độ xoáy và quỹ đạo bóng hiện ngay trên màn hình để bạn chỉnh swing.',
  },
  {
    t: 'Chơi tiếp, thanh toán sau.',
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
  const byKey = new Map(OFFICIAL_PACKAGES.map((p) => [p.key, p]));
  return (
    <div className="sg">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/scrollcraft/scrollcraft.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&display=swap"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <span data-sc-progress aria-hidden="true" />

      <div className="sg-folio">
        <span className="sg-folio-title" data-folio>
          {BRAND.name}
        </span>
        <a className="sg-folio-cta" href={bookHref}>
          {bookLabel} →
        </a>
      </div>

      <main id="top">
        {/* TITLE PAGE — quiet, type only, on bone paper */}
        <section className="sg-title sg-bone" data-chapter="Trang bìa">
          <div className="sg-wrap" data-sc-in data-sc-stagger="90">
            <p className="sg-kicker">
              {BRAND.name} · {BRAND.address.replace(', Phường', ' ·')}
            </p>
            <h1 className="sg-h1">
              Play.
              <br />
              Connect.
              <br />
              <em>Repeat.</em>
            </h1>
            <p className="sg-lede">
              Golf 3D mô phỏng Foresight GC3 giữa thành phố. Chơi 9 hố, 18 hố hay luyện tập, nắng
              mưa đều được, mở cửa mỗi ngày từ 08:00 đến 23:00.
            </p>
            <p className="sg-links">
              <a href={bookHref}>{slug ? 'Đặt chỗ online' : `Gọi ${BRAND.hotline}`}</a>
              <span aria-hidden="true">/</span>
              <a href={`tel:${BRAND.hotline}`}>Hotline {BRAND.hotline}</a>
            </p>
          </div>
        </section>

        {/* CHAPTER I — the round. Pinned; the ball flight draws with scroll. PEAK. */}
        <section
          id="c1"
          className="sg-forest"
          data-chapter="I · Một buổi chơi"
          data-sc-act="pin"
          data-sc-span="5.2"
        >
          <div data-sc-stage className="sg-round">
            <div className="sg-round-art" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path className="sg-ground" d="M0 84 C 25 78, 60 88, 100 80 L100 100 L0 100 Z" />
                <path className="sg-ground2" d="M0 92 C 30 88, 70 96, 100 90 L100 100 L0 100 Z" />
                <line
                  className="sg-pole"
                  x1="88"
                  y1="80"
                  x2="88"
                  y2="62"
                  vectorEffect="non-scaling-stroke"
                />
                <path className="sg-flag" d="M88 62 L96 65 L88 68 Z" />
              </svg>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="sg-arc-svg">
                <path
                  className="sg-arc"
                  d="M12 82 Q 50 -4 88 80"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="sg-ball" />
              <div className="sg-gc3" data-sc-cue="0.46 0.9">
                <strong>Foresight GC3</strong>
                <span>tốc độ · góc phóng · độ xoáy</span>
              </div>
            </div>
            <div className="sg-round-copy">
              <h2 className="sg-h2">
                Một buổi chơi, <em>bốn bước.</em>
              </h2>
              <div className="sg-steps">
                {STEPS.map((s, i) => (
                  <div
                    key={s.t}
                    className="sg-step"
                    data-sc-cue={['0 0.3 0', '0.26 0.52', '0.48 0.74', '0.7 1'][i]}
                  >
                    <h3 className="sg-h3">{s.t}</h3>
                    <p>{s.p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* authored silence: the landing is felt */}
        <div className="sg-silence sg-bone" aria-hidden="true" />

        {/* CHAPTER II — golden hour. Real prices tick in; the figures are wiped on. */}
        <section id="c2" className="sg-amber" data-chapter="II · Giờ vàng">
          <div className="sg-wrap sg-gold">
            <div data-sc-in data-sc-stagger="70">
              <p className="sg-kicker">Thứ 2 – Thứ 6 · 08:00–11:00</p>
              <h2 className="sg-h2">Giờ vàng, đồ ăn thức uống miễn phí.</h2>
            </div>
            <div className="sg-figures" data-sc-reveal="up" data-sc-reveal-at="0.1 0.5">
              <div>
                <span className="sg-fig">
                  <span data-sc-count="0 100">100</span>.000đ
                </span>
                <span className="sg-cap">luyện tập GDR, mỗi giờ</span>
              </div>
              <div>
                <span className="sg-fig">
                  <span data-sc-count="0 300">300</span>.000đ
                </span>
                <span className="sg-cap">9 hố, mỗi người</span>
              </div>
              <div>
                <span className="sg-fig">
                  <span data-sc-count="0 400">400</span>.000đ
                </span>
                <span className="sg-cap">18 hố, mỗi người</span>
              </div>
            </div>
            <p className="sg-note" data-sc-in>
              Không áp dụng cuối tuần và ngày lễ. Giá chưa gồm VAT.
            </p>
          </div>
        </section>

        {/* CHAPTER III — the price list, set as printed columns on a lateral rail */}
        <section
          id="c3"
          className="sg-bone sg-pan"
          data-chapter="III · Bảng giá & gói"
          data-sc-act="pan"
          data-sc-span="6"
        >
          <div data-sc-stage>
            <div className="sg-rail" data-sc-pan="0.06">
              <div className="sg-col sg-col-lead">
                <p className="sg-kicker">Bảng giá</p>
                <h2 className="sg-h2">Giá niêm yết, không phụ phí ẩn.</h2>
                <p className="sg-body">
                  Giá chưa gồm VAT. Nhóm 4 người dùng giá nhóm cả ngày: {money(900_000)} cho 9 hố,{' '}
                  {money(1_000_000)} cho 18 hố.
                </p>
              </div>
              <div className="sg-col">
                <h3 className="sg-h3">Theo lượt và giờ</h3>
                <dl className="sg-prices">
                  {PRICES.map((p) => (
                    <div key={p.when}>
                      <dt>
                        {p.when}
                        {p.note && <em> · {p.note}</em>}
                      </dt>
                      <dd>
                        <span>GDR / giờ</span>
                        <b>{money(p.gdr)}</b>
                        <span>9 hố</span>
                        <b>{money(p.h9)}</b>
                        <span>18 hố</span>
                        <b>{money(p.h18)}</b>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              {GROUPS.map((g) => (
                <div key={g.title} className="sg-col">
                  <h3 className="sg-h3">{g.title}</h3>
                  <ul className="sg-pk">
                    {g.keys
                      .map((k) => byKey.get(k))
                      .filter((p): p is NonNullable<typeof p> => !!p)
                      .map((p) => (
                        <li key={p.key}>
                          <div>
                            <span>{p.name}</span>
                            <b>{money(p.price)}</b>
                          </div>
                          <small>
                            {grantsText(p.grants)} · hiệu lực {validText(p.validDays)}
                            {p.perks ? ` · ${p.perks}` : ''}
                          </small>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
              <div className="sg-col sg-col-end">
                <p className="sg-body">
                  Mỗi lượt 9 hố hoặc 18 hố tích 1 điểm; đủ 10 điểm đổi 1 lượt miễn phí. Combo và thẻ
                  VIP dùng được cho cả phòng VIP. Đăng ký gói tại quầy hoặc gọi{' '}
                  <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPTER IV — booking, on paper */}
        <section id="dat-cho" className="sg-paper" data-chapter="IV · Đặt chỗ">
          <div className="sg-wrap sg-booking">
            <div data-sc-in data-sc-stagger="70">
              <p className="sg-kicker">Đặt chỗ</p>
              <h2 className="sg-h2">Chọn giờ, nhân viên xác nhận.</h2>
              <p className="sg-body">
                Gửi yêu cầu chưa đầy một phút. Chúng tôi xếp line phù hợp và gọi xác nhận; không cần
                thanh toán trước. Trạng thái yêu cầu tự cập nhật ngay trên trang.
              </p>
              <div className="sg-faq">
                {FAQ.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className="sg-form" data-sc-in>
              {slug ? (
                <BookingPage slug={slug} embedded />
              ) : (
                <div className="sg-callcard">
                  <h3 className="sg-h3">Đặt chỗ qua hotline</h3>
                  <p className="sg-body">
                    Đặt lịch online sẽ mở trong thời gian tới. Hiện tại vui lòng gọi để được giữ
                    line và xác nhận ngay.
                  </p>
                  <a className="sg-btn" href={`tel:${BRAND.hotline}`}>
                    Gọi {BRAND.hotline}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COLOPHON — the last element; the rail is complete */}
        <section
          id="c5"
          className="sg-forest sg-colophon"
          data-chapter="Cuối trang"
          data-sc-act="pin"
          data-sc-span="1.3"
        >
          <div data-sc-stage className="sg-close">
            <div data-sc-cue="0 1 0 0">
              <p className="sg-h2">
                Hẹn gặp bạn ở <em>line số một.</em>
              </p>
              <p className="sg-colo">
                {BRAND.name} · {BRAND.address}
                <br />
                Mở cửa mỗi ngày 08:00–23:00 ·{' '}
                <a href={`tel:${BRAND.hotline}`}>Hotline {BRAND.hotline}</a> ·{' '}
                <a href={mapHref} target="_blank" rel="noopener noreferrer">
                  Chỉ đường
                </a>{' '}
                · <a href={bookHref}>{slug ? 'Đặt chỗ online' : 'Gọi đặt chỗ'}</a>
              </p>
              <p className="sg-colo sg-colo-small">
                © {new Date().getFullYear()} {BRAND.name} · {BRAND.website} ·{' '}
                <a href="/quan-ly">Dành cho nhân viên</a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <ScrollCraftMount />
    </div>
  );
}
