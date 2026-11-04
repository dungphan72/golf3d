import BookingPage from '../../ui/BookingPage';

export const metadata = { title: 'Đặt lịch — Golf3D', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingPage slug={slug} />;
}
