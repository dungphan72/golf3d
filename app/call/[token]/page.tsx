import { Metadata } from 'next';
import { CallClient } from './CallClient';

export const metadata: Metadata = {
  title: 'Gọi phục vụ tại Line · Saigon Indoor Golf',
  description: 'Hệ thống gọi nhân viên phục vụ trực tiếp tại Line và Phòng VIP',
};

export default async function ServiceCallPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CallClient token={token} />;
}
