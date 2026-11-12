import type { Metadata } from 'next';
import '../home.css';
import '../site.css';
import { BRAND } from '../../lib/brand';
import { money } from '../../lib/club';
import { packageBullets, type PackageGroup, type PriceRow, type PriceTable } from '../../lib/price-table';
import { publicPricing } from '../../lib/server/pricing-service';
import { bookingSlug } from '../../lib/server/online-service';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bảng giá — Saigon Golf 3D Club',
  description:
    'Bảng giá chơi golf 3D Foresight GC3 tại Saigon Golf 3D Club: giá theo giờ, theo lượt 9 hố và 18 hố, thẻ giờ và thẻ tháng. Cập nhật theo giá hiện hành.',
  openGraph: {
    title: 'Bảng giá — Saigon Golf 3D Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 675 }],
  },
};

/** "Tiêu đề | Giá hoặc mức giảm | Điều kiện" -> parts; missing parts are simply left out. */
const parseOffer = (line: string) => {
  const [title, value = '', note = ''] = line.split('|').map((s) => s.trim());
  return { title, value, note };
};
const price = (v: number | null) => (v == null ? '—' : money(v));
const slot = (r: PriceRow) => `${r.days} · ${r.from}–${r.to}`;

function HoleTable({ title, table }: { title?: string; table: PriceTable }) {
  const g = table.group;
  return (
    <div className="hm-grid">
      {title && <h3>{title}</h3>}
      <div className="hm-table">
        <table>
          <thead>
            <tr>
              <th>Khung giờ</th>
              <th>Luyện tập / giờ</th>
              <th>Game 9 hố / người</th>
              <th>Game 18 hố / người</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.key}>
                <td>
                  {slot(r)}
                  {r.gold && <em> Giờ vàng</em>}
                </td>
                <td>{price(r.gdr)}</td>
                <td>{price(r.h9)}</td>
                <td>{price(r.h18)}</td>
              </tr>
            ))}
            {(g.h9 != null || g.h18 != null) && (
              <tr>
                <td>Nhóm 4 người (cả ngày)</td>
                <td>—</td>
                <td>{price(g.h9)} / nhóm</td>
                <td>{price(g.h18)} / nhóm</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Packages({ group }: { group: PackageGroup }) {
  return (
    <div id={group.id} className="hm-pk-group">
      <h3>{group.title}</h3>
      <div className="hm-pk-grid">
        {group.items.map((p) => (
          <article key={p.id} className={group.vip ? 'vip' : undefined}>
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

export default async function PricingPage() {
  const [pricing, slug] = await Promise.all([publicPricing(), bookingSlug()]);
  const bookHref = slug ? '/#dat-cho' : `tel:${BRAND.hotline}`;
  const bookLabel = slug ? 'Đặt chỗ' : 'Gọi đặt chỗ';
  const goldRow = pricing.standard.rows.find((r) => r.gold);
  const hasHoles = pricing.standard.rows.some((r) => r.h9 != null || r.h18 != null);
  const vipByKey = new Map((pricing.vip?.rows ?? []).map((r) => [r.key, r]));
  const mergeVip = !hasHoles && !!pricing.vip;
  const vat = pricing.vat != null ? `${pricing.vat}%` : null;
  const fee = pricing.fee ? `${pricing.fee}%` : null;

  return (
    <div className="hm">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref={bookHref} bookLabel={bookLabel} />
      <main id="top">
        <section className="hm-page">
          <h1>Bảng giá</h1>
          <p>Luôn khớp với giá đang áp dụng tại quầy.</p>
          <ul className="hm-meta">
            <li>
              Mở cửa {pricing.open}–{pricing.close} mỗi ngày
            </li>
            <li>
              Chưa gồm VAT{vat ? ` ${vat}` : ''}
              {fee ? ` và phí dịch vụ ${fee}` : ''}
            </li>
          </ul>
        </section>

        <section className="hm-section" id="gia-theo-gio">
          <h2>Giá theo giờ</h2>
          {hasHoles ? (
            <>
              <HoleTable title={pricing.vip ? 'Phòng tiêu chuẩn' : undefined} table={pricing.standard} />
              {pricing.vip && <HoleTable title="Bảng giá phòng VIP" table={pricing.vip} />}
            </>
          ) : (
            <div className="hm-table">
              <table>
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    <th>{mergeVip ? 'Phòng tiêu chuẩn / giờ' : 'Giá / giờ'}</th>
                    {mergeVip && <th>Phòng VIP / giờ</th>}
                  </tr>
                </thead>
                <tbody>
                  {pricing.standard.rows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        {slot(r)}
                        {r.gold && <em> Giờ vàng</em>}
                      </td>
                      <td>{price(r.gdr)}</td>
                      {mergeVip && <td>{price(vipByKey.get(r.key)?.gdr ?? null)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!pricing.vip && (
            <p className="hm-note" style={{ margin: '1.25rem 0 0' }}>
              Phòng VIP dùng chung bảng giá trên.
            </p>
          )}
        </section>

        {(pricing.offers.length > 0 || pricing.promotions.length > 0) && (
          <section className="hm-section" id="uu-dai">
            <h2>Khuyến mãi</h2>
            <div className="hm-promos">
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

        <section className="hm-section" id="goi">
          <h2>Gói trả trước</h2>
          <p className="hm-note">
            Đăng ký tại quầy hoặc gọi <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>. Xem thêm{' '}
            <a href="/thanh-vien">thẻ hội viên</a>.
          </p>
          <nav className="hm-sub-nav" aria-label="Nhóm gói">
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

        <section className="hm-section" id="luu-y">
          <h2>Lưu ý</h2>
          <ul className="hm-list">
            <li>
              <h3>Thuế và phí</h3>
              <p>
                Giá niêm yết chưa gồm VAT{vat ? ` ${vat}` : ''}
                {fee ? ` và phí dịch vụ ${fee}` : ''}; các khoản này cộng thêm trên hóa đơn.
              </p>
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

        <section className="hm-end">
          <h2>Đặt chỗ</h2>
          <p>Gửi yêu cầu, nhân viên xác nhận. Không cần trả trước.</p>
          <div className="hm-hero-cta">
            <a className="hm-btn hm-btn-brass" href={bookHref}>
              {bookLabel}
            </a>
            <a className="hm-btn hm-btn-line" href={`tel:${BRAND.hotline}`}>
              {BRAND.hotline}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
