import type { Metadata } from 'next';
import '../home2.css';
import '../sub.css';
import './portal.css';
import './portal-theme.css';
import MemberPortal from '../ui/MemberPortal';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tài khoản khách hàng — SaiGon Indoor Golf Club',
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="sg-page">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader bookHref="/#dat-cho" bookLabel="Đặt line" />
      <div className="mp">
        <main>
          <MemberPortal registerFirst={sp['dang-ky'] !== undefined} />
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
