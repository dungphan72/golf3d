import type { Metadata } from 'next';
import { ArrowUpRight, Check, Clock, Crown, Gift, Phone, Receipt, Users } from 'lucide-react';
import '../landing.css';
import './pricing.css';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import { packageBullets, type PackageGroup, type PriceRow } from '../../lib/price-table';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import LandingFx from '../ui/LandingFx';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bảng giá — Saigon Golf 3D Club',
  description:
    'Bảng giá chơi golf 3D Foresight GC3 tại Saigon Golf 3D Club: giá theo giờ, theo lượt 9 hố và 18 hố, nhóm 4 người, combo và thẻ VIP. Cập nhật theo giá hiện hành.',
  openGraph: {
    title: 'Bảng giá — Saigon Golf 3D Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 675 }],
  },
};

const price = (v: number | null) => (v == null ? '—' : money(v));
const pct = (v: number | null) => (v == null ? null : `${v}%`);

function RateCard({ row }: { row: PriceRow }) {
  return (
    <article className={'pp-rate' + (row.gold ? ' gold' : '')} data-sc-in>
      <header>
        <div>
          <span className="pp-days">{row.days}</span>
          <strong className="pp-time">
            {row.from} – {row.to}
          </strong>
        </div>
        {row.gold && (
          <span className="pp-badge">
            <Clock size={14} /> Giờ vàng
          </span>
        )}
      </header>
      <dl>
        <div>
          <dt>Luyện tập GDR</dt>
          <dd>{price(row.gdr)}</dd>
          <small>mỗi giờ</small>
        </div>
        <div>
          <dt>Chơi 9 hố</dt>
          <dd>{price(row.h9)}</dd>
          <small>mỗi người</small>
        </div>
        <div>
          <dt>Chơi 18 hố</dt>
          <dd>{price(row.h18)}</dd>
          <small>mỗi người</small>
        </div>
      </dl>
      {row.gold && (
        <p className="pp-perk">
          <Gift size={15} /> Kèm đồ ăn và thức uống miễn phí trong giờ vàng
        </p>
      )}
    </article>
  );
}

function Packages({ group }: { group: PackageGroup }) {
  return (
    <section id={group.id} className="pp-pk-group" data-sc-in data-sc-stagger="60">
      <h3>
        {group.vip && <Crown size={20} />}
        {group.title}
      </h3>
      <div className="pp-pk-grid">
        {group.items.map((p) => (
          <article key={p.id} className={'pp-pk' + (group.vip ? ' vip' : '')}>
            <h4>{p.name}</h4>
            <strong>{money(p.price)}</strong>
            <ul>
              {packageBullets(p).map((b) => (
                <li key={b}>
                  <Check size={15} />
                  {b}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function PricingPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
  const vat = pct(pricing.vat);
  const fee = pricing.fee ? pct(pricing.fee) : null;
  const lowest = Math.min(
    ...pricing.standard.rows.map((r) => r.gdr).filter((v): v is number => v != null),
  );
  const nav = [
    ['#gia-theo-gio', 'Giá theo giờ'],
    ['#goi', 'Gói hội viên'],
    ['#luu-y', 'Lưu ý'],
  ];
  return (
    <div className="fw pp">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/scrollcraft/scrollcraft.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@200;300;400;500;600;700&family=Be+Vietnam+Pro:wght@400;500;600&display=swap"
      />

      <header className="fw-fixed on" aria-label="Điều hướng">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="fw-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={30} height={30} />
          <span>{BRAND.short}</span>
        </a>
        <nav>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Trang chủ</a>
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
        <section className="pp-hero">
          <div className="pp-hero-inner" data-sc-in data-sc-stagger="80">
            <p className="fw-kicker fw-kicker-light">Bảng giá</p>
            <h1>Giá rõ ràng, chơi thoải mái</h1>
            <p className="pp-hero-sub">
              Giá theo giờ và theo lượt, nhóm 4 người, combo trả trước và thẻ VIP. Bảng này luôn
              khớp với giá đang áp dụng tại quầy.
            </p>
            <ul className="pp-chips">
              <li>
                <Clock size={15} /> Mở cửa {pricing.open} – {pricing.close} mỗi ngày
              </li>
              {Number.isFinite(lowest) && (
                <li>
                  <Gift size={15} /> Giờ vàng từ {money(lowest)}
                </li>
              )}
              <li>
                <Receipt size={15} /> {vat ? `Giá chưa gồm VAT ${vat}` : 'Giá chưa gồm VAT'}
                {fee ? ` và phí dịch vụ ${fee}` : ''}
              </li>
            </ul>
            <div className="pp-hero-actions">
              <a className="fw-btn fw-btn-light" href={bookHref}>
                {bookLabel} <ArrowUpRight size={16} />
              </a>
              <a className="fw-btn fw-btn-ghost" href={`tel:${BRAND.hotline}`}>
                <Phone size={16} /> {BRAND.hotline}
              </a>
            </div>
          </div>
        </section>

        <section id="gia-theo-gio" className="pp-section">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Giá theo giờ và lượt</p>
            <h2>Chọn khung giờ phù hợp</h2>
            <p className="fw-sub">
              Luyện tập GDR tính theo giờ. Chơi 9 hố và 18 hố tính theo đầu người cho nhóm 1–3
              người.
            </p>
          </div>
          <div className="pp-rates">
            {pricing.standard.rows.map((r) => (
              <RateCard key={r.key} row={r} />
            ))}
          </div>
          {(pricing.standard.group.h9 != null || pricing.standard.group.h18 != null) && (
            <article className="pp-group" data-sc-in>
              <div className="pp-group-icon">
                <Users size={22} />
              </div>
              <div className="pp-group-text">
                <h3>Nhóm 4 người</h3>
                <p>Giá nhóm cố định cho cả buổi, áp dụng cả ngày, mọi khung giờ.</p>
              </div>
              <dl>
                <div>
                  <dt>9 hố</dt>
                  <dd>{price(pricing.standard.group.h9)}</dd>
                  <small>mỗi nhóm</small>
                </div>
                <div>
                  <dt>18 hố</dt>
                  <dd>{price(pricing.standard.group.h18)}</dd>
                  <small>mỗi nhóm</small>
                </div>
              </dl>
            </article>
          )}
          {pricing.vip ? (
            <div className="pp-vip-rates">
              <div className="fw-head">
                <p className="fw-kicker">Phòng VIP</p>
                <h2>Bảng giá phòng VIP</h2>
              </div>
              <div className="pp-rates">
                {pricing.vip.rows.map((r) => (
                  <RateCard key={'vip' + r.key} row={r} />
                ))}
              </div>
            </div>
          ) : (
            <p className="pp-vip-note">
              <Crown size={16} /> Phòng VIP dùng chung bảng giá trên.
            </p>
          )}
        </section>

        <section id="goi" className="pp-section pp-tint">
          <div className="fw-head" data-sc-in data-sc-stagger="70">
            <p className="fw-kicker">Gói trả trước</p>
            <h2>Mua trước, chơi nhiều hơn</h2>
            <p className="fw-sub">
              Combo lượt chơi, gói luyện tập và thẻ VIP đều dùng được cho cả line thường và phòng
              VIP. Đăng ký tại quầy hoặc gọi {BRAND.hotline}.
            </p>
          </div>
          <nav className="pp-tabs" aria-label="Nhóm gói">
            {pricing.groups.map((g) => (
              <a key={g.id} href={`#${g.id}`}>
                {g.title}
              </a>
            ))}
          </nav>
          {pricing.groups.map((g) => (
            <Packages key={g.id} group={g} />
          ))}
        </section>

        <section id="luu-y" className="pp-section">
          <div className="fw-head" data-sc-in>
            <p className="fw-kicker">Lưu ý</p>
            <h2>Trước khi bạn đến</h2>
          </div>
          <div className="pp-notes" data-sc-in data-sc-stagger="80">
            <article>
              <Receipt size={22} />
              <h3>Thuế và phí</h3>
              <p>
                Giá niêm yết chưa gồm VAT{vat ? ` ${vat}` : ''}
                {fee ? ` và phí dịch vụ ${fee}` : ''}; các khoản này được cộng thêm trên hóa đơn khi
                thanh toán.
              </p>
            </article>
            <article>
              <Gift size={22} />
              <h3>Giờ vàng</h3>
              <p>
                Áp dụng Thứ 2 đến Thứ 6, kèm đồ ăn và thức uống miễn phí. Không áp dụng cuối tuần và
                ngày lễ.
              </p>
            </article>
            <article>
              <Check size={22} />
              <h3>Tích điểm</h3>
              <p>Mỗi lượt 9 hố hoặc 18 hố được 1 điểm; đủ 10 điểm đổi 1 lượt chơi miễn phí.</p>
            </article>
          </div>
        </section>

        <section className="pp-section pp-cta-wrap">
          <div className="pp-cta" data-sc-in data-sc-stagger="80">
            <div>
              <h2>Sẵn sàng ra line?</h2>
              <p>
                Gửi yêu cầu đặt chỗ chưa đầy một phút, nhân viên xác nhận ngay. Không cần thanh toán
                trước.
              </p>
            </div>
            <div className="pp-hero-actions">
              <a className="fw-btn fw-btn-light" href={bookHref}>
                {bookLabel} <ArrowUpRight size={16} />
              </a>
              <a className="fw-btn fw-btn-ghost" href={`tel:${BRAND.hotline}`}>
                <Phone size={16} /> {BRAND.hotline}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="fw-footer">
        <span>
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.address}
        </span>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Về trang chủ</a>
      </footer>
      <LandingFx />
    </div>
  );
}
