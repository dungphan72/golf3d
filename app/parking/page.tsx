import '../sub.css';
import '../parking.css';
import ParkingCustomerApp from '../../modules/parking/ui/ParkingCustomerApp';
import { FONT_URL, SiteFooter, SiteHeader } from '../ui/SiteChrome';

export const metadata = {
  title: 'Đặt chỗ đậu xe — SaiGon Indoor Golf Club',
  description: 'Đặt chỗ đậu xe thông minh tại bãi xe SIGOLF GoPick, liên kết lịch chơi Golf và kiểm tra quyền miễn phí.',
};

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bookingId = typeof sp.bookingId === 'string' ? sp.bookingId : undefined;
  const room = typeof sp.room === 'string' ? sp.room : undefined;
  const start = sp.start
    ? Number(sp.start) || (!isNaN(Date.parse(String(sp.start))) ? Date.parse(String(sp.start)) : undefined)
    : undefined;
  const end = sp.end
    ? Number(sp.end) || (!isNaN(Date.parse(String(sp.end))) ? Date.parse(String(sp.end)) : undefined)
    : undefined;
  const customerName = typeof sp.customerName === 'string' ? sp.customerName : undefined;
  const customerPhone = typeof sp.customerPhone === 'string' ? sp.customerPhone : undefined;
  const facility = typeof sp.facility === 'string' ? sp.facility : 'gopick';

  return (
    <div className="sg-page hd-home hd-inner">
      <link rel="stylesheet" href={FONT_URL} />
      <SiteHeader />
      <main className="sg-solo" style={{ padding: '20px 0', background: '#f1f5f9' }}>
        <ParkingCustomerApp
          initialTenant={facility}
          initialBookingId={bookingId}
          initialRoom={room}
          initialStart={start}
          initialEnd={end}
          initialCustomerName={customerName}
          initialCustomerPhone={customerPhone}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

