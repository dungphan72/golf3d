import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import '../landing.css';
import '../bang-gia/pricing.css';
import './portal.css';
import { BRAND } from '../../lib/brand';
import MemberPortal from '../ui/MemberPortal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tài khoản hội viên — Saigon Golf 3D Club',
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="fw pp mp">
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
          <a href="/bang-gia">Bảng giá</a>
          <a href="/thanh-vien">Thẻ hội viên</a>
        </nav>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="fw-pill-cta" href="/#dat-cho">
          Đặt chỗ <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <MemberPortal registerFirst={sp['dang-ky'] !== undefined} />
      </main>
      <footer className="fw-footer">
        <span>
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.address}
        </span>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Về trang chủ</a>
      </footer>
    </div>
  );
}
