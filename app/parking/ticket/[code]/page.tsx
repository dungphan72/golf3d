import { db } from '../../../../lib/server/common';
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

  let row: any = null;
  try {
    row = await db()
      .prepare('SELECT * FROM parking_tickets WHERE ticket_code=?')
      .bind(code)
      .first<any>();
  } catch (err) {
    console.error('TicketPage DB query error:', err);
  }

  // Sanitize to plain JSON object for safe RSC serialization
  const plainTicket = row ? JSON.parse(JSON.stringify(row)) : null;

  return (
    <div className="pk-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <TicketDetailClient code={code} initialTicket={plainTicket} token={token} />
    </div>
  );
}
