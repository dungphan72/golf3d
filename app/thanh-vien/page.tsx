import type { Metadata } from 'next';
import '../home.css';
import '../site.css';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import { parseBenefit } from '../../lib/member-benefits';
import { packageBullets, type PackageGroup } from '../../lib/price-table';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thẻ hội viên — Saigon Golf 3D Club',
  description:
    'Thẻ hội viên và gói giờ chơi golf 3D tại Saigon Golf 3D Club: chơi mỗi ngày trong tháng, giữ chỗ trước 4 tuần, bảo lưu thẻ, ưu đãi đặt thêm giờ.',
  openGraph: {
    title: 'Thẻ hội viên — Saigon Golf 3D Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 675 }],
  },
};

const isCard = (g: PackageGroup) => /^thẻ/i.test(g.title);

function Cards({ group }: { group: PackageGroup }) {
  return (
    <div id={group.id} className="hm-pk-group">
      <h3>{group.title}</h3>
      <div className="hm-pk-grid">
        {group.items.map((p) => (
          <article key={p.id} className={p.room === 'vip' ? 'vip' : undefined}>
            <h4>{p.name}</h4>
            <strong>{money(p.price)}</strong>
            <ul>
              {packageBullets(p).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

export default async function MembershipPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
  const benefits = pricing.benefits.map(parseBenefit).filter((b) => b.title);
  const cards = pricing.groups.filter(isCard);
  const hourly = pricing.groups.filter((g) => !isCard(g));
  const cheapest = Math.min(...cards.flatMap((g) => g.items.map((p) => p.price)));

  return (
    <div className="hm">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref={bookHref} bookLabel={bookLabel} />
      <main id="top">
        <section className="hm-page">
          <h1>Chơi golf mỗi ngày, trả một lần</h1>
          <p>Thẻ cho người chơi đều đặn và gói giờ trả trước. Phòng tiêu chuẩn hoặc VIP.</p>
          <ul className="hm-meta">
            {Number.isFinite(cheapest) && <li>Thẻ từ {money(cheapest)}</li>}
            <li>
              Mở cửa {pricing.open}–{pricing.close} mỗi ngày
            </li>
          </ul>
          <div className="hm-hero-cta">
            <a className="hm-btn hm-btn-brass" href={`tel:${BRAND.hotline}`}>
              Đăng ký: {BRAND.hotline}
            </a>
            <a className="hm-link" href="/tai-khoan?dang-ky">
              Đăng ký tài khoản online
            </a>
            <a className="hm-link" href="/bang-gia">
              Xem bảng giá
            </a>
          </div>
        </section>

        {benefits.length > 0 && (
          <section className="hm-section" id="quyen-loi">
            <h2>Quyền lợi</h2>
            <ul className="hm-list">
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
          <section className="hm-section" id="the">
            <h2>Thẻ hội viên</h2>
            <p className="hm-note">
              Thẻ tiêu chuẩn dùng cho phòng tiêu chuẩn, thẻ VIP dùng được cả hai loại phòng.
            </p>
            {cards.map((g) => (
              <Cards key={g.id} group={g} />
            ))}
          </section>
        )}

        {hourly.length > 0 && (
          <section className="hm-section" id="goi-gio">
            <h2>Gói giờ</h2>
            <p className="hm-note">Giờ trong gói không có hạn dùng và có thể chuyển cho người khác.</p>
            {hourly.map((g) => (
              <Cards key={g.id} group={g} />
            ))}
          </section>
        )}

        <section className="hm-end">
          <h2>Đăng ký hội viên</h2>
          <p>Đến câu lạc bộ hoặc gọi {BRAND.hotline}, nhân viên tư vấn thẻ phù hợp và làm thẻ ngay.</p>
          <div className="hm-hero-cta">
            <a className="hm-btn hm-btn-brass" href={`tel:${BRAND.hotline}`}>
              {BRAND.hotline}
            </a>
            <a className="hm-btn hm-btn-line" href={bookHref}>
              {bookLabel}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
