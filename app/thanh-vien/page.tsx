import type { Metadata } from 'next';
import '../home2.css';
import '../sub.css';
import '../tai-khoan/portal.css';
import '../tai-khoan/portal-theme.css';
import '../member-app.css';
import '../member-reference.css';
import MemberPortal, { type Overview } from '../ui/MemberPortal';
import { publicPricing } from '../../lib/server/pricing-service';
import { BRAND } from '../../lib/brand';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Hội viên — SaiGon Indoor Golf Club',
  description: 'Thẻ hội viên, gói giờ, quyền lợi và lịch tập tại SaiGon Indoor Golf Club.',
  openGraph: {
    title: 'Hội viên — SaiGon Indoor Golf Club',
    type: 'website',
    locale: 'vi_VN',
    images: [{ url: '/og.jpg', width: 1200, height: 628 }],
  },
};
export default async function MembershipPage() {
  const pricing = await publicPricing();
  const overview: Overview = {
    profile: { name: 'Đăng nhập để xem thẻ', phone: '', email: '', verified: false },
    club: { name: BRAND.name, address: BRAND.address },
    benefits: pricing.benefits,
    catalog: pricing.groups.flatMap((g) =>
      g.items.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        room: p.room || 'standard',
        section: g.title,
        valid_days: p.validDays,
      })),
    ),
    wallet: 0,
    points: 0,
    packages: [],
    activity: [],
    booking: { enabled: true, vip: true, services: ['gdr'], days: 28 },
  };
  return (
    <div className="sg-page">
      <div className="mp">
        <main>
          <MemberPortal publicOverview={overview} />
        </main>
      </div>
    </div>
  );
}
