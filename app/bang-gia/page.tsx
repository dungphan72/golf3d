import type { Metadata } from 'next';
import '../home2.css';
import '../sub.css';
import { BRAND } from '../../lib/brand';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { Icon } from '../ui/Icon';
import { HourlyGrid, PackageGrid, RateGrid } from '../ui/PriceUi';

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

/** "Tiêu đề | Giá hoặc mức giảm | Điều kiện" -> parts; missing parts are simply left out. */
const parseOffer = (line: string) => {
  const [title, value = '', note = ''] = line.split('|').map((s) => s.trim());
  return { title, value, note };
};

export default async function PricingPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt line' : 'Gọi đặt line';
  const goldRow = pricing.standard.rows.find((r) => r.gold);
  const hasHoles = pricing.standard.rows.some((r) => r.h9 != null || r.h18 != null);
  const vipByKey = new Map((pricing.vip?.rows ?? []).map((r) => [r.key, r]));
  const mergeVip = !hasHoles && !!pricing.vip;
  const vat = pricing.vat != null ? `${pricing.vat}%` : null;
  const fee = pricing.fee ? `${pricing.fee}%` : null;
  const tax = `Chưa gồm VAT${vat ? ` ${vat}` : ''}${fee ? ` và phí dịch vụ ${fee}` : ''}`;

  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref={bookHref} bookLabel={bookLabel} />
      <main id="top">
        <section className="sg-pagehead">
          <p className="sg-kicker">Bảng giá</p>
          <h1>Giá theo giờ, theo lượt và theo gói</h1>
          <p className="sg-lead">Luôn khớp với giá đang áp dụng tại quầy.</p>
          <ul className="sg-meta">
            <li>
              Mở cửa {pricing.open}–{pricing.close} mỗi ngày
            </li>
            <li>{tax}</li>
          </ul>
        </section>

        <section className="sg-in sg-block" id="gia-theo-gio">
          <header className="sg-head">
            <h2>Giá theo giờ</h2>
            {!pricing.vip && <p>Phòng VIP dùng chung bảng giá này.</p>}
          </header>
          {hasHoles ? (
            <div className="sg-stack">
              <RateGrid title={pricing.vip ? 'Phòng tiêu chuẩn' : undefined} table={pricing.standard} />
              {pricing.vip && <RateGrid title="Phòng VIP" table={pricing.vip} />}
            </div>
          ) : (
            <HourlyGrid rows={pricing.standard.rows} vip={mergeVip ? vipByKey : undefined} />
          )}
        </section>

        {(pricing.offers.length > 0 || pricing.promotions.length > 0) && (
          <section className="sg-in sg-block" id="uu-dai" style={{ paddingTop: 0 }}>
            <header className="sg-head">
              <h2>Khuyến mãi</h2>
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

        <section className="sg-in sg-block" id="goi" style={{ paddingTop: 0 }}>
          <header className="sg-head">
            <h2>Gói trả trước</h2>
          </header>
          <p className="sg-note">
            Đăng ký tại quầy hoặc gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>. Xem thêm{' '}
            <a href="/thanh-vien">thẻ hội viên</a>.
          </p>
          <nav className="sg-chips" aria-label="Nhóm gói">
            {pricing.groups.map((g) => (
              <a key={g.id} href={`#${g.id}`}>
                {g.title}
              </a>
            ))}
          </nav>
          {pricing.groups.map((g) => (
            <PackageGrid key={g.id} group={g} vipOf={() => !!g.vip} />
          ))}
        </section>

        <section className="sg-in sg-block" id="luu-y" style={{ paddingTop: 0 }}>
          <header className="sg-head">
            <h2>Lưu ý</h2>
          </header>
          <ul className="sg-facts-list">
            <li>
              <h3>Thuế và phí</h3>
              <p>{tax}; các khoản này cộng thêm trên hóa đơn.</p>
            </li>
            <li>
              <h3>Giờ vàng</h3>
              <p>
                {goldRow
                  ? `${goldRow.days}, ${goldRow.from}–${goldRow.to}. Giá thấp hơn khung thường.`
                  : 'Khung giá ưu đãi (nếu có) ghi ở bảng trên.'}
              </p>
            </li>
            {hasHoles && (
              <li>
                <h3>Tích điểm</h3>
                <p>Mỗi lượt 9 hoặc 18 hố được 1 điểm, đủ 10 điểm đổi 1 lượt chơi miễn phí.</p>
              </li>
            )}
          </ul>
        </section>

        <section className="sg-end">
          <h2>Giữ line cho buổi chơi của bạn</h2>
          <p>Gửi yêu cầu, nhân viên xác nhận. Không cần trả trước.</p>
          <div className="sg-actions">
            <a className="sg-btn" href={bookHref}>
              <Icon name="event" size={20} />
              {bookLabel}
            </a>
            <a className="sg-btn sg-btn--quiet" href={`tel:${BRAND.hotline}`}>
              <Icon name="phone" size={20} />
              {BRAND.hotline}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
