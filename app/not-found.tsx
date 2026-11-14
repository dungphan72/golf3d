import { BRAND } from '../lib/brand';
import './home2.css';
import './sub.css';
import { FONT_URL, SiteFooter, SiteHeader } from './ui/SiteChrome';

export const metadata = { title: 'Không tìm thấy trang — ' + BRAND.name, robots: { index: false } };

export default function NotFound() {
  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref="/#dat-cho" bookLabel="Đặt line" />
      <main className="sg-lost">
        <span className="sg-plate">
          <b>404</b>
          <span>Không tìm thấy trang</span>
        </span>
        <h1>Trang này không còn ở đây</h1>
        <p>Đường dẫn có thể đã đổi hoặc nhập sai. Quay lại trang chủ hoặc xem bảng giá.</p>
        <div className="sg-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="sg-btn" href="/">
            Về trang chủ
          </a>
          <a className="sg-btn sg-btn--quiet" href="/bang-gia">
            Xem bảng giá
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
