import type { Metadata } from 'next';
import './call.css';
import { CallPanel } from './CallPanel';

export const metadata: Metadata = {
  title: 'Gọi phục vụ — SaiGon Indoor Golf Club',
  robots: { index: false, follow: false },
};

export default async function CallPage({
  params,
}: {
  params: Promise<{ slug: string; room: string }>;
}) {
  const { slug, room } = await params;
  return <CallPanel slug={slug} room={room} />;
}
