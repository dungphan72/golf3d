import '../../home2.css';
import '../../sub.css';
import BookingPage from '../../ui/BookingPage';
import { FONT_URL, SiteFooter, SiteHeader } from '../../ui/SiteChrome';

export const metadata = { title: 'Đặt line — SaiGon Indoor Golf Club', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="sg-page hd-home hd-inner">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader />
      <main className="sg-solo" id="dat-cho">
        <div className="sg-form">
          <BookingPage slug={slug} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
