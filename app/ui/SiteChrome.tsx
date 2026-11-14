import { BRAND } from '../../lib/brand';
import '../chrome.css';
import { Icon } from './Icon';

/** Shared top bar and footer (same look on the home page and the inner pages). */
export function SiteHeader({ bookHref, bookLabel }: { bookHref: string; bookLabel: string }) {
  const nav = [
    ['/#phong', 'Chỗ chơi'],
    ['/#tien-ich', 'Một buổi chơi'],
    ['/bang-gia', 'Bảng giá'],
    ['/thanh-vien', 'Thẻ hội viên'],
    ['/#lien-he', 'Liên hệ'],
    ['/tai-khoan', 'Tài khoản'],
  ];
  return (
    <header className="sg-bar">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="sg-brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo} alt="" width={40} height={40} />
        <b>
          {BRAND.name.slice(0, BRAND.name.lastIndexOf(' '))}
          <br />
          {BRAND.name.slice(BRAND.name.lastIndexOf(' ') + 1)}
        </b>
      </a>
      <nav aria-label="Điều hướng">
        {nav.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <a className="sg-phone" href={`tel:${BRAND.hotline}`} aria-label={`Gọi hotline ${BRAND.hotline}`}>
        <Icon name="phone" size={20} />
        <b>{BRAND.hotline}</b>
      </a>
      <a className="sg-btn" href={bookHref}>
        {bookLabel}
      </a>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sg-foot" id="chan-trang">
      <div className="sg-foot-in">
        <div>
          <p className="sg-foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={36} height={36} />
            <b>{BRAND.name}</b>
          </p>
          <p>Phòng golf 3D với radar Foresight GC3: 10 line tiêu chuẩn và 2 phòng VIP riêng.</p>
        </div>
        <div>
          <h4>Liên hệ</h4>
          <p>{BRAND.address}</p>
          <p>
            Hotline: <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
          </p>
          <p>
            <a href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={18} />
              Nhắn Zalo
            </a>
          </p>
        </div>
        <div>
          <h4>Trang</h4>
          <a href="/bang-gia">Bảng giá</a>
          <a href="/thanh-vien">Thẻ hội viên</a>
          <a href="/tai-khoan">Tài khoản</a>
          <a href="/quan-ly">Nhân viên</a>
        </div>
        <div>
          <h4>Đặt chỗ</h4>
          <p>Gửi yêu cầu, nhân viên gọi xác nhận. Không cần trả trước.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="sg-btn" href="/#dat-cho">
            Đặt line
          </a>
        </div>
      </div>
      <div className="sg-foot-bar">
        <span>
          © {new Date().getFullYear()} {BRAND.name}
        </span>
        <span>{BRAND.website}</span>
      </div>
    </footer>
  );
}

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';
