import type { Metadata } from 'next';
import '../home2.css';
import '../sub.css';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import { parseBenefit } from '../../lib/member-benefits';
import type { PackageGroup } from '../../lib/price-table';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';
import { Icon } from '../ui/Icon';
import { PackageGrid } from '../ui/PriceUi';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thẻ hội viên — SaiGon Indoor Golf Club',
  description:
    'Thẻ hội viên và gói giờ chơi golf 3D tại SaiGon Indoor Golf Club: chơi mỗi ngày trong tháng, giữ chỗ trước 4 tuần, bảo lưu thẻ, ưu đãi đặt thêm giờ.',
  openGraph: {
    title: 'Thẻ hội viên — SaiGon Indoor Golf Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 628 }],
  },
};

const isCard = (g: PackageGroup) => /^thẻ/i.test(g.title);

export default async function MembershipPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt line' : 'Gọi đặt line';
  const benefits = pricing.benefits.map(parseBenefit).filter((b) => b.title);
  const cards = pricing.groups.filter(isCard);
  const hourly = pricing.groups.filter((g) => !isCard(g));
  const cheapest = Math.min(...cards.flatMap((g) => g.items.map((p) => p.price)));

  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref={bookHref} bookLabel={bookLabel} />
      <main id="top">
        <section className="sg-pagehead">
          <p className="sg-kicker">Thẻ hội viên</p>
          <h1>Chơi golf mỗi ngày, trả một lần</h1>
          <p className="sg-lead">
            Thẻ cho người chơi đều đặn và gói giờ trả trước. Phòng tiêu chuẩn hoặc VIP.
          </p>
          <ul className="sg-meta">
            {Number.isFinite(cheapest) && <li>Thẻ từ {money(cheapest)}</li>}
            <li>
              Mở cửa {pricing.open}–{pricing.close} mỗi ngày
            </li>
          </ul>
          <div className="sg-actions">
            <a className="sg-btn" href={`tel:${BRAND.hotline}`}>
              <Icon name="phone" size={20} />
              Đăng ký: {BRAND.hotline}
            </a>
            <a className="sg-link" href="/tai-khoan?dang-ky">
              Đăng ký tài khoản online
            </a>
            <a className="sg-link" href="/bang-gia">
              Xem bảng giá
            </a>
          </div>
        </section>

        {benefits.length > 0 && (
          <section className="sg-in sg-block" id="quyen-loi">
            <header className="sg-head">
              <h2>Quyền lợi hội viên</h2>
            </header>
            <ul className="sg-facts-list">
              {benefits.map(({ title, text }, i) => (
                <li key={title + i}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {cards.length > 0 && (
          <section className="sg-in sg-block" id="the" style={{ paddingTop: 0 }}>
            <header className="sg-head">
              <h2>Thẻ hội viên</h2>
              <p>Thẻ tiêu chuẩn dùng cho phòng tiêu chuẩn, thẻ VIP dùng được cả hai loại phòng.</p>
            </header>
            {cards.map((g) => (
              <PackageGrid key={g.id} group={g} vipOf={(p) => p.room === 'vip'} />
            ))}
          </section>
        )}

        {hourly.length > 0 && (
          <section className="sg-in sg-block" id="goi-gio" style={{ paddingTop: 0 }}>
            <header className="sg-head">
              <h2>Gói giờ</h2>
              <p>Giờ trong gói không có hạn dùng và có thể chuyển cho người khác.</p>
            </header>
            {hourly.map((g) => (
              <PackageGrid key={g.id} group={g} vipOf={(p) => p.room === 'vip'} />
            ))}
          </section>
        )}

        <section className="sg-end">
          <h2>Đăng ký hội viên</h2>
          <p>
            Đến câu lạc bộ hoặc gọi {BRAND.hotline}, nhân viên tư vấn thẻ phù hợp và làm thẻ ngay.
          </p>
          <div className="sg-actions">
            <a className="sg-btn" href={`tel:${BRAND.hotline}`}>
              <Icon name="phone" size={20} />
              {BRAND.hotline}
            </a>
            <a className="sg-btn sg-btn--quiet" href={bookHref}>
              <Icon name="event" size={20} />
              {bookLabel}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
