import type { Metadata } from 'next';
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  Crown,
  Package,
  Pause,
  Percent,
  Phone,
  Sun,
  UserRound,
} from 'lucide-react';
import '../landing.css';
import '../bang-gia/pricing.css';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import { parseBenefit } from '../../lib/member-benefits';
import { packageBullets, type PackageGroup } from '../../lib/price-table';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import LandingFx from '../ui/LandingFx';

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

const ICONS = [Sun, CalendarCheck, Package, Pause, Percent, Check];

const isCard = (g: PackageGroup) => /^thẻ/i.test(g.title);

function Cards({ group }: { group: PackageGroup }) {
  return (
    <section id={group.id} className="pp-pk-group" data-sc-in data-sc-stagger="60">
      <h3>
        {group.vip && <Crown size={20} />}
        {group.title}
      </h3>
      <div className="pp-pk-grid">
        {group.items.map((p) => (
          <article key={p.id} className={'pp-pk' + (p.room === 'vip' ? ' vip' : '')}>
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

export default async function MembershipPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
  const benefits = pricing.benefits.map(parseBenefit).filter((b) => b.title);
  const cards = pricing.groups.filter(isCard);
  const hourly = pricing.groups.filter((g) => !isCard(g));
  const cheapest = Math.min(...cards.flatMap((g) => g.items.map((p) => p.price)));
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
          {}
          <a href="/bang-gia">Bảng giá</a>
          {benefits.length > 0 && <a href="#quyen-loi">Quyền lợi</a>}
          {}
          <a href="/tai-khoan">Tài khoản</a>
          {cards.length > 0 && <a href="#the">Thẻ hội viên</a>}
          {hourly.length > 0 && <a href="#goi-gio">Gói giờ</a>}
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
        <section className="pp-hero">
          <div className="pp-hero-inner" data-sc-in data-sc-stagger="80">
            <p className="fw-kicker fw-kicker-light">Hội viên</p>
            <h1>Chơi golf mỗi ngày, trả một lần</h1>
            <p className="pp-hero-sub">
              Thẻ hội viên cho người chơi đều đặn và gói giờ trả trước dùng lúc nào cũng được. Phòng
              tiêu chuẩn hoặc phòng VIP, bạn chọn theo cách chơi của mình.
            </p>
            <ul className="pp-chips">
              {Number.isFinite(cheapest) && (
                <li>
                  <Crown size={15} /> Thẻ từ {money(cheapest)}
                </li>
              )}
              <li>
                <Sun size={15} /> Mở cửa {pricing.open} – {pricing.close} mỗi ngày
              </li>
            </ul>
            <div className="pp-hero-actions">
              <a className="fw-btn fw-btn-light" href={`tel:${BRAND.hotline}`}>
                <Phone size={16} /> Đăng ký: {BRAND.hotline}
              </a>
              {}
              <a className="fw-btn fw-btn-ghost" href="/tai-khoan?dang-ky">
                Đăng ký tài khoản online
              </a>
              {}
              <a className="fw-btn fw-btn-ghost" href="/bang-gia">
                Xem bảng giá
              </a>
            </div>
          </div>
        </section>

        {benefits.length > 0 && (
          <section id="quyen-loi" className="pp-section">
            <div className="fw-head" data-sc-in data-sc-stagger="70">
              <p className="fw-kicker">Quyền lợi</p>
              <h2>Hội viên nhận được gì</h2>
            </div>
            <div className="pp-benefits" data-sc-in data-sc-stagger="70">
              {benefits.map(({ title, text }, i) => {
                const Icon = ICONS[i % ICONS.length];
                return (
                  <article key={title + i}>
                    <Icon size={22} />
                    <h3>{title}</h3>
                    {text && <p>{text}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {cards.length > 0 && (
          <section id="the" className="pp-section pp-tint">
            <div className="fw-head" data-sc-in data-sc-stagger="70">
              <p className="fw-kicker">Thẻ hội viên</p>
              <h2>Chọn thẻ theo cách bạn chơi</h2>
              <p className="fw-sub">
                Mỗi thẻ gồm số giờ chơi mỗi ngày. Thẻ tiêu chuẩn dùng cho phòng tiêu chuẩn, thẻ VIP
                dùng được cả hai loại phòng.
              </p>
            </div>
            {cards.map((g) => (
              <Cards key={g.id} group={g} />
            ))}
          </section>
        )}

        {hourly.length > 0 && (
          <section id="goi-gio" className="pp-section">
            <div className="fw-head" data-sc-in data-sc-stagger="70">
              <p className="fw-kicker">Gói giờ</p>
              <h2>Mua giờ trước, dùng lúc nào cũng được</h2>
              <p className="fw-sub">
                Giờ trong gói không có hạn dùng và có thể chuyển cho người khác.
              </p>
            </div>
            {hourly.map((g) => (
              <Cards key={g.id} group={g} />
            ))}
          </section>
        )}

        <section className="pp-section pp-cta-wrap">
          <div className="pp-cta" data-sc-in data-sc-stagger="80">
            <div>
              <h2>Đăng ký hội viên</h2>
              <p>
                Đến câu lạc bộ hoặc gọi {BRAND.hotline}, nhân viên sẽ tư vấn thẻ phù hợp và làm thẻ
                ngay.
              </p>
            </div>
            <div className="pp-hero-actions">
              <a className="fw-btn fw-btn-light" href={`tel:${BRAND.hotline}`}>
                <Phone size={16} /> {BRAND.hotline}
              </a>
              <a className="fw-btn fw-btn-ghost" href={bookHref}>
                {bookLabel} <ArrowUpRight size={16} />
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
