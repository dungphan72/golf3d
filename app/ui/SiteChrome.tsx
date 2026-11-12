import { BRAND } from '../../lib/brand';

/** Shared top bar and footer for the inner pages (same look as the home page). */
export function SiteHeader({ bookHref, bookLabel }: { bookHref: string; bookLabel: string }) {
  const nav = [
    ['/bang-gia', 'Giá'],
    ['/thanh-vien', 'Thẻ hội viên'],
    ['/tai-khoan', 'Hội viên'],
  ];
  return (
    <header className="hm-bar">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="hm-brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo} alt="" width={32} height={32} />
        <span>{BRAND.name}</span>
      </a>
      <nav aria-label="Điều hướng">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Trang chủ</a>
        {nav.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <a className="hm-btn hm-btn-solid" href={bookHref}>
        {bookLabel}
      </a>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="hm-foot">
      <div className="hm-foot-in">
        <div>
          <strong>{BRAND.name}</strong>
          <p>{BRAND.address}</p>
        </div>
        <nav aria-label="Chân trang">
          <a href="/bang-gia">Bảng giá</a>
          <a href="/thanh-vien">Thẻ hội viên</a>
          <a href="/tai-khoan">Cổng khách hàng</a>
          <a href="/quan-ly">Dành cho nhân viên</a>
        </nav>
        <div>
          <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
          <a href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`} target="_blank" rel="noopener noreferrer">
            Zalo
          </a>
        </div>
      </div>
      <small>
        © {new Date().getFullYear()} {BRAND.name}
      </small>
    </footer>
  );
}

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';
