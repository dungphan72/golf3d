/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import { Globe, MapPin, Phone, UserRound } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { publicPricing } from '../../lib/server/pricing-service';
import '../home-dark.css';
import '../site-dark.css';
import '../member-dark.css';

/**
 * Shared header and footer of every customer page: the same dark premium look as the home page.
 * Club name, logo, address and hotline come from the club's own settings (fallback: brand file).
 * The page wrapper must carry the classes "hd-home hd-inner" (colour tokens and the phone bottom bar).
 */
const NAV: [string, string][] = [
  ['Trang chủ', '/'],
  ['Dịch vụ', '/#dich-vu'],
  ['Đặt sân', '/#dat-cho-nhanh'],
  ['Giải đấu', '/#giai-dau'],
  ['Hội viên', '/thanh-vien'],
  ['Đậu xe', '/parking'],
  ['Bảng giá', '/bang-gia'],
  ['Tin tức', '/tin-tuc'],
];

async function club() {
  const p = await publicPricing();
  return {
    name: p.clubName || BRAND.name,
    logo: p.logo || BRAND.logo,
    address: p.clubAddress || BRAND.address,
    hotline: p.hotline || BRAND.hotline,
  };
}

export async function SiteHeader({ active }: { active?: string }) {
  const c = await club();
  return (
    <header className="hd-header">
      <a className="hd-brand" href="/" aria-label={`${c.name}: Trang chủ`}>
        <img src={c.logo} alt="" width="44" height="44" />
        <span>
          <strong>{c.name}</strong>
          <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
        </span>
      </a>
      <nav className="hd-nav" aria-label="Điều hướng chính">
        {NAV.map(([label, href]) => (
          <a key={label} href={href} className={href === active ? 'on' : ''} aria-current={href === active ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <div className="hd-actions">
        <a className="hd-btn ghost" href="/tai-khoan">
          <UserRound size={17} />
          <span>Đăng nhập</span>
        </a>
        <a className="hd-btn solid" href="/tai-khoan?dang-ky">
          Đăng ký
        </a>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const c = await club();
  return (
    <footer className="hd-footer" id="lien-he">
      <div className="hd-footer-grid">
        <div>
          <a className="hd-brand" href="/">
            <img src={c.logo} alt="" width="44" height="44" />
            <span>
              <strong>{c.name}</strong>
              <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
            </span>
          </a>
          <p>
            Phòng tập Golf 3D hiện đại với công nghệ Foresight GC3, không gian chuyên nghiệp và dịch vụ đa dạng tại TP.HCM.
          </p>
          <div className="hd-social">
            <a href={BRAND.zalo || `https://zalo.me/${c.hotline}`} aria-label="Liên hệ qua Zalo">
              Zalo
            </a>
            <a href={`tel:${c.hotline}`} aria-label="Gọi câu lạc bộ">
              <Phone size={18} />
            </a>
          </div>
        </div>
        <nav aria-label="Về chúng tôi">
          <h3>Về chúng tôi</h3>
          <a href="/#tien-ich">Không gian &amp; tiện ích</a>
          <a href="/bang-gia">Bảng giá</a>
          <a href="/tin-tuc">Tin tức</a>
        </nav>
        <nav aria-label="Dịch vụ">
          <h3>Dịch vụ</h3>
          <a href="/#dat-cho-nhanh">Đặt sân Golf 3D</a>
          <a href="/parking">Đặt chỗ đậu xe</a>
          <a href="/thanh-vien">Thẻ hội viên</a>
          <a href="/#giai-dau">Giải đấu &amp; Sự kiện</a>
          <a href="/tai-khoan">Tài khoản</a>
        </nav>
        <address>
          <h3>Liên hệ</h3>
          <p>
            <MapPin size={18} />
            {c.address}
          </p>
          <a href={`tel:${c.hotline}`}>
            <Phone size={18} />
            <strong>{c.hotline}</strong>
          </a>
          <a href={`https://${BRAND.website}`}>
            <Globe size={18} />
            {BRAND.website}
          </a>
        </address>
      </div>
      <p className="hd-copy">
        © {new Date().getFullYear()} {c.name}. Mọi quyền được bảo lưu.
      </p>
    </footer>
  );
}

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap';
