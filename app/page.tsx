/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import type { Metadata } from 'next';
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  Clock,
  Coffee,
  Crown,
  Flag,
  Globe,
  GraduationCap,
  MapPin,
  Phone,
  Target,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { BRAND } from '../lib/brand';
import { rooms } from '../lib/club';
import { packageBullets, type PackageItem, type PriceRow } from '../lib/price-table';
import { STATUS_LABEL, tournamentStatus } from '../lib/tournament';
import { getCachedLandingData } from '../lib/server/landing-service';
import type { Post } from '../lib/server/content-service';
import BookingPage from './ui/BookingPage';
import QuickBook from './ui/QuickBook';
import './home-reference.css';
import './home-dark.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'SaiGon Indoor Golf Club — Golf 3D Foresight GC3',
  description:
    'Golf 3D · Tập luyện · Giải đấu · Cộng đồng. Đặt sân tại SaiGon Indoor Golf Club, 250 Lương Định Của, TP.HCM.',
  openGraph: {
    title: 'SaiGon Indoor Golf Club — Golf 3D Foresight GC3',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 628 }],
  },
};

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const photo = (name: string) => `/img/${name}.webp`;
/** Lowest hourly price of a price table ("từ X đ/giờ"); null when no hourly price is set. */
const fromHourly = (rows: PriceRow[] | undefined) => {
  const v = (rows ?? []).map((r) => r.gdr).filter((n): n is number => n != null);
  return v.length ? Math.min(...v) : null;
};
const dateText = (ms: number | null) =>
  ms == null
    ? ''
    : new Date(ms).toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
const timeText = (ms: number | null) =>
  ms == null
    ? ''
    : new Date(ms).toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
      });
/** A package name without the section prefix ("Thẻ tháng · 1 tháng" -> "1 tháng"). */
const shortName = (p: PackageItem, section: string) =>
  p.name.startsWith(`${section} · `) ? p.name.slice(section.length + 3) : p.name;

/** Drops repeated lines (same text ignoring case and spacing), keeping the first. */
const uniqueLines = (lines: string[]) => {
  const seen = new Set<string>();
  return lines.filter((l) => {
    const k = l.toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

function SectionHead({
  kicker,
  title,
  text,
  href,
  more,
}: {
  kicker: string;
  title: string;
  text?: string;
  href?: string;
  more?: string;
}) {
  return (
    <header className="hd-head">
      <div>
        <p className="hd-kicker">{kicker}</p>
        <h2>{title}</h2>
        {text && <p className="hd-lead">{text}</p>}
      </div>
      {href && (
        <a className="hd-more" href={href}>
          {more ?? 'Xem tất cả'}
          <ArrowRight size={16} />
        </a>
      )}
    </header>
  );
}

export default async function LandingPage() {
  const { slug, pricing, content } = await getCachedLandingData();
  const clubName = pricing.clubName || BRAND.name;
  const clubAddress = pricing.clubAddress || BRAND.address;
  const clubHotline = pricing.hotline || BRAND.hotline;
  const clubLogo = pricing.logo || BRAND.logo;

  // Facts shown on the page come from the club's own set-up, never typed into the page.
  const standardLines = rooms.filter((r) => !r.vip).length;
  const vipRooms = rooms.filter((r) => r.vip).length;
  const leftLines = rooms.filter((r) => r.left).length;
  const standardFrom = fromHourly(pricing.standard.rows);
  const vipFrom = fromHourly((pricing.vip ?? pricing.standard).rows);
  const goldRow = pricing.standard.rows.find((r) => r.gold && r.gdr != null);

  const events: Post[] = [...content.upcoming, ...content.past].slice(0, 3);

  // Membership plans = the packages the club sells now: the cheapest three of the first section.
  const planGroup = pricing.groups.find((g) => /thẻ tháng/i.test(g.title)) ?? pricing.groups[0];
  const plans = planGroup ? planGroup.items.slice(0, 3) : [];

  const utility = [
    { icon: Target, title: `${standardLines} line tiêu chuẩn`, text: 'Công nghệ Foresight GC3' },
    vipRooms > 0 && { icon: Crown, title: `${vipRooms} phòng VIP`, text: 'Riêng tư, đẳng cấp' },
    leftLines > 0 && { icon: Flag, title: 'Line tay trái', text: 'Dành cho golfer thuận tay trái' },
    { icon: CarFront, title: 'Bãi đậu xe', text: 'Ngay tại câu lạc bộ' },
    { icon: Coffee, title: 'Dịch vụ F&B', text: 'Đa dạng, tiện lợi' },
    { icon: Trophy, title: 'Giải đấu & Sự kiện', text: 'Thường xuyên, chuyên nghiệp' },
  ].filter(Boolean) as { icon: typeof Target; title: string; text: string }[];

  const services = [
    {
      image: 'album-line-hall',
      title: 'Simulator tiêu chuẩn',
      text: `${standardLines} line Foresight GC3, phân tích cú đánh chi tiết.`,
      price: standardFrom,
      href: '#dat-cho-nhanh',
      cta: 'Đặt line',
    },
    vipRooms > 0 && {
      image: 'album-vip-bay',
      title: 'Phòng VIP riêng tư',
      text: `${vipRooms} phòng riêng cho nhóm bạn và khách hàng.`,
      price: vipFrom,
      href: '#dat-cho-nhanh',
      cta: 'Đặt phòng VIP',
    },
    {
      image: 'album-golfers-playing',
      title: 'Huấn luyện 1-1',
      text: 'Lộ trình cá nhân cùng huấn luyện viên.',
      price: null,
      href: `tel:${clubHotline}`,
      cta: 'Liên hệ tư vấn',
      id: 'huan-luyen',
    },
    {
      image: 'album-bar-counter',
      title: 'Quầy bar & khu nghỉ',
      text: 'Đồ uống, đồ ăn nhẹ và không gian giao lưu.',
      price: null,
      href: '#tien-ich',
      cta: 'Khám phá',
    },
  ].filter(Boolean) as {
    image: string;
    title: string;
    text: string;
    price: number | null;
    href: string;
    cta: string;
    id?: string;
  }[];

  const nav: [string, string][] = [
    ['Trang chủ', '/'],
    ['Dịch vụ', '#dich-vu'],
    ['Đặt sân', '#dat-cho-nhanh'],
    ['Giải đấu', '#giai-dau'],
    ['Hội viên', '#hoi-vien'],
    ['Bảng giá', '/bang-gia'],
    ['Tin tức', '/tin-tuc'],
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: clubName,
    address: clubAddress,
    telephone: clubHotline,
    url: `https://${BRAND.website}`,
    image: `https://${BRAND.website}/og.jpg`,
    openingHours: `Mo-Su ${pricing.open}-${pricing.close}`,
  };

  return (
    <div className="hd-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="hd-header">
        <a className="hd-brand" href="/" aria-label={`${clubName}: Trang chủ`}>
          <img src={clubLogo} alt="" width="44" height="44" />
          <span>
            <strong>{clubName}</strong>
            <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
          </span>
        </a>
        <nav className="hd-nav" aria-label="Điều hướng chính">
          {nav.map(([label, href], i) => (
            <a key={label} href={href} className={i === 0 ? 'on' : ''} aria-current={i === 0 ? 'page' : undefined}>
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

      <main>
        <section className="hd-hero" aria-labelledby="hd-hero-title">
          <img
            className="hd-hero-img"
            src={photo('album-bays-panoramic')}
            alt="Khu line golf 3D Foresight GC3 tại câu lạc bộ"
            fetchPriority="high"
            width="1600"
            height="1200"
          />
          <div className="hd-hero-shade" aria-hidden="true" />
          <div className="hd-hero-body">
            <p className="hd-eyebrow">{clubName.toLocaleUpperCase('vi-VN')}</p>
            <h1 id="hd-hero-title">
              Trải nghiệm
              <span> Golf 3D đỉnh cao</span>
            </h1>
            <p className="hd-hero-text">
              Công nghệ Foresight GC3 hiện đại, không gian đẳng cấp, luyện tập – thi đấu – giải trí
              trong nhà, bất chấp thời tiết.
            </p>
            <ul className="hd-chips">
              <li>
                <Target size={20} strokeWidth={1.5} />
                Luyện tập
              </li>
              <li>
                <Trophy size={20} strokeWidth={1.5} />
                Thi đấu &amp; Giải đấu
              </li>
              <li>
                <GraduationCap size={20} strokeWidth={1.5} />
                Huấn luyện
              </li>
              <li>
                <UsersRound size={20} strokeWidth={1.5} />
                Cộng đồng golfer
              </li>
            </ul>
            <div className="hd-cta">
              <a className="hd-btn solid lg" href="#dat-cho-nhanh">
                <CalendarDays size={19} />
                Đặt sân ngay
                <ArrowRight size={18} />
              </a>
              <a className="hd-btn ghost lg" href="/bang-gia">
                Xem bảng giá
              </a>
            </div>
          </div>
          <ul className="hd-utility" aria-label="Tiện ích câu lạc bộ">
            {utility.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon size={26} strokeWidth={1.4} aria-hidden="true" />
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hd-section" id="dich-vu" aria-labelledby="hd-services">
          <SectionHead
            kicker="Dịch vụ nổi bật"
            title="Không gian luyện tập & thi đấu độc bản"
            text="Từ line tiêu chuẩn đến phòng VIP riêng tư, mọi trải nghiệm được thiết kế cho golfer."
            href="/bang-gia"
            more="Xem bảng giá"
          />
          <h2 id="hd-services" className="hd-sr">
            Dịch vụ
          </h2>
          <ul className="hd-cards hd-cards--4">
            {services.map((s) => (
              <li key={s.title} id={s.id}>
                <a className="hd-card" href={s.href}>
                  <img src={photo(s.image)} alt="" width="640" height="420" loading="lazy" />
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <footer>
                      <span className="hd-price">
                        {s.price != null ? (
                          <>
                            Từ <strong>{vnd(s.price)}đ</strong>/giờ
                          </>
                        ) : (
                          <small>Liên hệ để biết giá</small>
                        )}
                      </span>
                      <b>
                        {s.cta} <ArrowRight size={15} />
                      </b>
                    </footer>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="hd-section hd-book" id="dat-cho-nhanh" aria-labelledby="hd-book-title">
          <div className="hd-book-copy">
            <p className="hd-kicker">Đặt sân nhanh</p>
            <h2 id="hd-book-title">Khởi đầu cú swing hoàn hảo ngay hôm nay</h2>
            <p className="hd-lead">
              Chọn ngày, giờ và loại chỗ. Nhân viên xác nhận lịch của bạn, không cần trả trước.
            </p>
            <ul className="hd-checks">
              <li>
                <Clock size={18} />
                Mở cửa {pricing.open} – {pricing.close} mỗi ngày
              </li>
              {goldRow && goldRow.gdr != null && (
                <li>
                  <Check size={18} />
                  Giờ vàng {goldRow.from} – {goldRow.to} từ {vnd(goldRow.gdr)}đ/giờ
                </li>
              )}
              <li>
                <Phone size={18} />
                Cần hỗ trợ đặt lịch: <a href={`tel:${clubHotline}`}>{clubHotline}</a>
              </li>
            </ul>
          </div>
          <div className="hd-quick">
            <QuickBook open={pricing.open} close={pricing.close} hasVip={!!pricing.vip} />
          </div>
        </section>

        <section className="hd-section" id="giai-dau" aria-labelledby="hd-events-title">
          <SectionHead
            kicker="Giải đấu & Sự kiện"
            title="Giải đấu & Sự kiện Indoor Golf thường niên"
            href="/tin-tuc"
          />
          <h2 id="hd-events-title" className="hd-sr">
            Giải đấu và sự kiện
          </h2>
          {events.length ? (
            <ul className="hd-cards hd-cards--3">
              {events.map((p) => {
                const st = tournamentStatus(p);
                const open = st === 'live' || st === 'upcoming';
                return (
                  <li key={p.id}>
                    <a className="hd-card hd-event" href={`/tin-tuc/${p.id}`}>
                      <img src={p.image || photo('album-hall-wide')} alt="" width="640" height="360" loading="lazy" />
                      <div>
                        <span className={`hd-tag ${st}`}>{STATUS_LABEL[st]}</span>
                        <h3>{p.title}</h3>
                        {p.summary && <p>{p.summary}</p>}
                        <ul className="hd-meta">
                          <li>
                            <CalendarDays size={15} />
                            {dateText(p.event_at)} · {timeText(p.event_at)}
                          </li>
                          {p.place && (
                            <li>
                              <MapPin size={15} />
                              {p.place.replace(/Lượng\s*Định\s*Của/gi, 'Lương Định Của')}
                            </li>
                          )}
                        </ul>
                        <footer>
                          <b>
                            {open ? 'Đăng ký tham gia' : 'Xem chi tiết'} <ArrowRight size={15} />
                          </b>
                        </footer>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="hd-empty">
              Chưa có giải đấu nào được công bố. Theo dõi <a href="/tin-tuc">trang tin tức</a> để nhận
              thông tin mới nhất.
            </p>
          )}
        </section>

        <section className="hd-section hd-members" id="hoi-vien" aria-labelledby="hd-members-title">
          <SectionHead
            kicker="Hội viên"
            title={`Gói hội viên ${clubName}`}
            text="Quyền lợi và mức giá lấy trực tiếp từ danh mục gói đang bán tại câu lạc bộ."
            href="/thanh-vien"
            more="Xem thẻ hội viên"
          />
          <h2 id="hd-members-title" className="hd-sr">
            Gói hội viên
          </h2>
          {plans.length ? (
            <ul className={`hd-plans n${plans.length}`}>
              {plans.map((p, i) => (
                <li key={p.id} className={plans.length === 3 && i === 1 ? 'feature' : ''}>
                  <h3>{planGroup ? shortName(p, planGroup.title) : p.name}</h3>
                  <p className="hd-plan-price">
                    <strong>{vnd(p.price)}đ</strong>
                  </p>
                  <ul>
                    {uniqueLines(packageBullets(p))
                      .slice(0, 5)
                      .map((b) => (
                        <li key={b}>
                          <Check size={16} />
                          {b}
                        </li>
                      ))}
                  </ul>
                  <a className="hd-btn solid block" href="/thanh-vien">
                    Đăng ký hội viên
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hd-empty">Danh mục gói hội viên đang được cập nhật. Liên hệ {clubHotline} để được tư vấn.</p>
          )}
          {pricing.benefits.length > 0 && (
            <ul className="hd-benefits" aria-label="Quyền lợi hội viên">
              {pricing.benefits.slice(0, 6).map((b) => {
                // "Tiêu đề | Nội dung" -> a bold title and a muted line.
                const [title, ...rest] = b.split('|').map((t) => t.trim());
                return (
                  <li key={b}>
                    <Check size={16} />
                    <span>
                      <strong>{title}</strong>
                      {rest.length > 0 && <small>{rest.join(' · ')}</small>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Shown when a time is chosen in the quick form (#dat-cho:target), as before. */}
        <section className="hd-section ref-book-section hd-form" id="dat-cho" aria-label="Đặt sân Golf 3D">
          <SectionHead kicker="Giữ chỗ" title="Đặt sân Golf 3D" />
          {slug ? (
            <BookingPage slug={slug} embedded />
          ) : (
            <p>
              Liên hệ câu lạc bộ để chọn khung giờ và giữ chỗ:{' '}
              <a className="hd-btn solid" href={`tel:${clubHotline}`}>
                <Phone size={16} />
                {clubHotline}
              </a>
            </p>
          )}
        </section>

        <section className="hd-section" id="tien-ich" aria-labelledby="hd-space-title">
          <SectionHead kicker="Không gian" title="Không gian & tiện ích" />
          <h2 id="hd-space-title" className="hd-sr">
            Không gian
          </h2>
          <ul className="hd-gallery">
            {[
              ['album-bays-panoramic', 'Khu line tiêu chuẩn'],
              ['album-vip-lounge', 'Khu nghỉ VIP'],
              ['album-bar-to-bays', 'Quầy bar và khu line'],
              ['album-club-lounge', 'Khu nghỉ câu lạc bộ'],
            ].map(([name, alt]) => (
              <li key={name}>
                <img src={photo(name)} alt={alt} width="640" height="420" loading="lazy" />
                <span>{alt}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="hd-footer" id="lien-he">
        <div className="hd-footer-grid">
          <div>
            <a className="hd-brand" href="/">
              <img src={clubLogo} alt="" width="44" height="44" />
              <span>
                <strong>{clubName}</strong>
                <small>Golf 3D · Tập luyện · Giải đấu · Cộng đồng</small>
              </span>
            </a>
            <p>
              Phòng tập Golf 3D hiện đại với công nghệ Foresight GC3, không gian chuyên nghiệp và dịch
              vụ đa dạng tại TP.HCM.
            </p>
            <div className="hd-social">
              <a href={BRAND.zalo} aria-label="Liên hệ qua Zalo">
                Zalo
              </a>
              <a href={`tel:${clubHotline}`} aria-label="Gọi câu lạc bộ">
                <Phone size={18} />
              </a>
            </div>
          </div>
          <nav aria-label="Về chúng tôi">
            <h3>Về chúng tôi</h3>
            <a href="#tien-ich">Không gian & tiện ích</a>
            <a href="/bang-gia">Bảng giá</a>
            <a href="/tin-tuc">Tin tức</a>
          </nav>
          <nav aria-label="Dịch vụ">
            <h3>Dịch vụ</h3>
            <a href="#dat-cho-nhanh">Đặt sân Golf 3D</a>
            <a href="#huan-luyen">Huấn luyện Golf</a>
            <a href="#giai-dau">Giải đấu & Sự kiện</a>
            <a href="#hoi-vien">Gói hội viên</a>
          </nav>
          <address>
            <h3>Liên hệ</h3>
            <p>
              <MapPin size={18} />
              {clubAddress}
            </p>
            <a href={`tel:${clubHotline}`}>
              <Phone size={18} />
              <strong>{clubHotline}</strong>
            </a>
            <a href={`https://${BRAND.website}`}>
              <Globe size={18} />
              {BRAND.website}
            </a>
          </address>
        </div>
        <p className="hd-copy">
          © {new Date().getFullYear()} {clubName}. Mọi quyền được bảo lưu.
        </p>
      </footer>
    </div>
  );
}
