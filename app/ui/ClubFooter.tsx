import { BRAND } from '../../lib/brand';

export default function ClubFooter({ hours }: { hours: string }) {
  return (
    <footer className="fw-foot" aria-label="Chân trang">
      <div className="fw-foot-in">
        <div>
          <h3>{BRAND.name}</h3>
          <p>{BRAND.address}</p>
          <p>Mở cửa mỗi ngày {hours}</p>
        </div>
        <ul>
          <li>
            <a href={`tel:${BRAND.hotline}`}>{BRAND.hotline}</a>
          </li>
          <li>
            <a href={BRAND.zalo || `https://zalo.me/${BRAND.hotline}`} target="_blank" rel="noopener noreferrer">
              Zalo
            </a>
          </li>
          <li>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- same-page anchor needs a plain link */}
            <a href="/#dat-cho">Đặt chỗ</a>
          </li>
          <li>
            <a href="/tai-khoan">Hội viên</a>
          </li>
          <li>
            <a href="/quan-ly">Nhân viên</a>
          </li>
        </ul>
      </div>
      <p className="fw-foot-copy">© {new Date().getFullYear()} {BRAND.name}</p>
    </footer>
  );
}
