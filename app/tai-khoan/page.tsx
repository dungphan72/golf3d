import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import '../landing.css';
import './portal.css';
import { BRAND } from '../../lib/brand';
import MemberPortal from '../ui/MemberPortal';
import ClubFooter from '../ui/ClubFooter';

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
    <div className="fw mp">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap"
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
      <ClubFooter hours="06:00–23:00" />
    </div>
  );
}
