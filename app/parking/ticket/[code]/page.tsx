import { db } from '../../../../lib/server/common';
import { notFound } from 'next/navigation';
import TicketDetailClient from './TicketDetailClient';

export const metadata = {
  title: 'Vé đậu xe SIGOLF — GoPick',
  robots: { index: false },
};

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { code } = await params;
  const { token } = await searchParams;

  const row = await db()
    .prepare('SELECT * FROM parking_tickets WHERE ticket_code=?')
    .bind(code)
    .first<any>();

  if (!row) {
    notFound();
  }

  // Security check: if ticket requires token for walk-in access
  if (token && row.access_token !== token) {
    notFound();
  }

  return (
    <div className="pk-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <TicketDetailClient ticket={row} />
    </div>
  );
}
