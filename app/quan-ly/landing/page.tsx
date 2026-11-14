import type { Metadata } from 'next';
import LandingCmsPanel from '../../ui/LandingCmsPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quản trị Landing Page — SaiGon Indoor Golf Club',
  robots: { index: false },
};

export default function LandingAdminPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem 0' }}>
      <LandingCmsPanel />
    </div>
  );
}
