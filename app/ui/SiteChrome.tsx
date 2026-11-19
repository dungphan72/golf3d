/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import {
  CalendarDays,
  Car,
  Crown,
  Globe,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Receipt,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
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

export function ZaloIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M24 4C12.954 4 4 12.954 4 24c0 4.108 1.242 7.93 3.376 11.114L5.13 41.69a1.5 1.5 0 001.902 1.902l6.576-2.246A19.866 19.866 0 0024 44c11.046 0 20-8.954 20-20S35.046 4 24 4z"
        fill="#0068FF"
      />
      <path
        d="M17 19h7.5l-6.8 9.2a1 1 0 00.8 1.6H27v-3h-5.5l6.8-9.2a1 1 0 00-.8-1.6H17v3z"
        fill="#ffffff"
      />
    </svg>
  );
}

export async function SiteFooter() {
  const c = await club();
  return (
    <footer className="hd-footer" id="lien-he" aria-label="Chân trang SiGolf">
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
            <a href={BRAND.zalo || `https://zalo.me/${c.hotline}`} aria-label="Liên hệ qua Zalo" target="_blank" rel="noopener noreferrer">
              <ZaloIcon size={18} />
              <span>Zalo</span>
            </a>
            <a href={`tel:${c.hotline}`} aria-label="Gọi câu lạc bộ">
              <Phone size={17} />
              <span>Hotline</span>
            </a>
          </div>
        </div>
        <nav aria-label="Về chúng tôi">
          <h3>Về chúng tôi</h3>
          <a href="/#tien-ich"><Sparkles size={16} /> Không gian &amp; tiện ích</a>
          <a href="/bang-gia"><Receipt size={16} /> Bảng giá</a>
          <a href="/tin-tuc"><Newspaper size={16} /> Tin tức</a>
        </nav>
        <nav aria-label="Dịch vụ">
          <h3>Dịch vụ</h3>
          <a href="/#dat-cho-nhanh"><CalendarDays size={16} /> Đặt sân Golf 3D</a>
          <a href="/parking"><Car size={16} /> Đặt chỗ đậu xe</a>
          <a href="/thanh-vien"><Crown size={16} /> Thẻ hội viên</a>
          <a href="/#giai-dau"><Trophy size={16} /> Giải đấu &amp; Sự kiện</a>
          <a href="/tai-khoan"><UserRound size={16} /> Tài khoản</a>
        </nav>
        <address>
          <h3>Liên hệ</h3>
          <p>
            <MapPin size={16} />
            <span>{c.address}</span>
          </p>
          <a href={`tel:${c.hotline}`}>
            <Phone size={16} />
            <strong>{c.hotline}</strong>
          </a>
          <a href={`https://${BRAND.website}`}>
            <Globe size={16} />
            <span>{BRAND.website}</span>
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
