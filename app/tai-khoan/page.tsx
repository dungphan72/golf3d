import type { Metadata } from 'next';
import '../landing.css';
import '../home.css';
import '../site.css';
import './portal.css';
import MemberPortal from '../ui/MemberPortal';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cổng khách hàng — Saigon Golf 3D Club',
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="hm">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref="/#dat-cho" bookLabel="Đặt chỗ" />
      <div className="fw mp">
        <main>
          <MemberPortal registerFirst={sp['dang-ky'] !== undefined} />
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
