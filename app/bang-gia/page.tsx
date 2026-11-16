import type { Metadata } from 'next';
import '../sub.css';
import './poster.css';
import { BRAND } from '../../lib/brand';
import { WALLET_TIERS } from '../../lib/wallet';
import { buildPackageCards, type PosterCard } from '../../lib/price-poster';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { Icon } from '../ui/Icon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bảng giá — SaiGon Indoor Golf Club',
  description:
    'Bảng giá chơi golf 3D Foresight GC3 tại SaiGon Indoor Golf Club: giá theo giờ, theo lượt 9 hố và 18 hố, thẻ giờ và thẻ tháng. Cập nhật theo giá hiện hành.',
  openGraph: {
    title: 'Bảng giá — SaiGon Indoor Golf Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 628 }],
  },
};

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const cell = (n: number | null) => (n == null ? '—' : vnd(n));

/** "Tiêu đề | Giá hoặc mức giảm | Điều kiện" -> parts; missing parts are simply left out. */
const parseOffer = (line: string) => {
  const [title, value = '', note = ''] = line.split('|').map((s) => s.trim());
  return { title, value, note };
};

function RateCard({ card }: { card: PosterCard }) {
  return (
    <section className="pg-card" aria-labelledby={`pg-${card.key}`}>
      <h2 className="pg-pill" id={`pg-${card.key}`}>
        {card.title}
      </h2>
      {card.blocks.map((b) => (
        <div className="pg-block" key={b.key}>
          {b.title && (
            <h3 className="pg-sub">
              <span>{b.title}</span>
            </h3>
          )}
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Loại line</th>
                <th scope="col">Tập luyện</th>
                <th scope="col">9 hố</th>
                <th scope="col">18 hố</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.room}>
                  <th scope="row">{r.label}</th>
                  <td>{cell(r.gdr)}</td>
                  <td>{cell(r.h9)}</td>
                  <td>{cell(r.h18)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="pg-foot">Tập luyện: đ/line/giờ • 9 và 18 hố: đ/người</p>
    </section>
  );
}

export default async function PricingPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const hotline = pricing.hotline || BRAND.hotline;
  const address = pricing.clubAddress || BRAND.address;
  const clubName = pricing.clubName || BRAND.name;
  const logo = pricing.logo || BRAND.logo;
  const bookHref = slug ? '/#dat-cho' : `tel:${hotline}`;
  const bookLabel = slug ? 'Đặt line' : 'Gọi đặt line';
  const [first, ...rest] = pricing.poster;
  const packageCards = buildPackageCards(pricing.groups);
  const vat = pricing.vat != null ? `${pricing.vat}%` : null;
  const fee = pricing.fee ? `${pricing.fee}%` : null;
  const tax = `Giá chưa gồm VAT${vat ? ` ${vat}` : ''}${fee ? ` và phí dịch vụ ${fee}` : ''}; các khoản này cộng thêm trên hóa đơn.`;

  const wallet = (
    <section className="pg-card" aria-labelledby="pg-wallet">
      <h2 className="pg-pill" id="pg-wallet">
        THẺ GIỜ
      </h2>
      <div className="pg-items pg-items--two">
        {WALLET_TIERS.map((t) => (
          <div key={t.amount} className="pg-item">
            <span className="pg-item-name">Nạp</span>
            <strong>{vnd(t.amount)}đ</strong>
            <span className="pg-item-name">Tặng</span>
            <strong>{vnd(t.bonus)}đ</strong>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="sg-page hd-home hd-inner">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader active="/bang-gia" />
      <main id="top" className="pg">
        <header className="pg-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={88} height={88} />
          <p className="pg-club">{clubName.toLocaleUpperCase('vi-VN')}</p>
          <h1>BẢNG GIÁ</h1>
          <div className="pg-rule" aria-hidden="true">
            <span />
          </div>
          <p className="pg-open">
            Mở cửa {pricing.open} – {pricing.close} mỗi ngày
          </p>
        </header>

        <div className="pg-wrap">
          {first && (
            <div className="pg-top">
              <div className="pg-col">
                <RateCard card={first} />
              </div>
              <div className="pg-col">
                {rest.map((c) => (
                  <RateCard key={c.key} card={c} />
                ))}
                {wallet}
              </div>
            </div>
          )}
          {!first && <div className="pg-top pg-top--single">{wallet}</div>}

          {packageCards.map((g) => (
            <section className="pg-card pg-card--wide" key={g.id} id={g.id} aria-labelledby={`pg-${g.id}`}>
              <h2 className="pg-pill" id={`pg-${g.id}`}>
                {g.title.toLocaleUpperCase('vi-VN')}
              </h2>
              {g.subtitle && <p className="pg-subtitle">{g.subtitle}</p>}
              <div className="pg-items">
                {g.items.map((it) => (
                  <div key={it.id} className="pg-item">
                    <span className="pg-item-name">{it.name}</span>
                    <strong>{vnd(it.price)}đ</strong>
                    {it.lines.length > 0 && <small>{it.lines.join(' · ')}</small>}
                  </div>
                ))}
              </div>
              {g.footnote && <p className="pg-foot">{g.footnote}</p>}
            </section>
          ))}

          {(pricing.offers.length > 0 || pricing.promotions.length > 0) && (
            <section className="pg-card pg-card--wide" id="uu-dai" aria-labelledby="pg-promo">
              <h2 className="pg-pill" id="pg-promo">
                KHUYẾN MÃI
              </h2>
              <div className="pg-promos">
                {pricing.promotions.map((p) => (
                  <article key={p.id}>
                    <h3>{p.name}</h3>
                    <strong>{p.benefit}</strong>
                    <p>{p.condition}</p>
                    {p.description && <p>{p.description}</p>}
                  </article>
                ))}
                {pricing.offers.map(parseOffer).map((o) => (
                  <article key={o.title + o.value}>
                    <h3>{o.title}</h3>
                    {o.value && <strong>{o.value}</strong>}
                    {o.note && <p>{o.note}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          <p className="pg-tax">{tax}</p>
        </div>

        <div className="pg-contact">
          <p>
            <Icon name="location" size={22} />
            {address}
          </p>
          <p>
            <Icon name="home" size={22} />
            Booking: {BRAND.website} • Hotline: <a href={`tel:${hotline}`}>{hotline}</a>
          </p>
          <div className="pg-actions">
            <a className="sg-btn" href={bookHref}>
              <Icon name="event" size={20} />
              {bookLabel}
            </a>
            <a className="sg-btn sg-btn--quiet" href={`tel:${hotline}`}>
              <Icon name="phone" size={20} />
              {hotline}
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
