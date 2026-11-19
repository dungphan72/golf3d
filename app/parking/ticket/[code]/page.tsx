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

  // Privacy protection: If visited without matching access_token, mask sensitive PII
  if (plainTicket && (!token || token !== plainTicket.access_token)) {
    if (plainTicket.customer_name) {
      const parts = String(plainTicket.customer_name).trim().split(/\s+/);
      plainTicket.customer_name = parts
        .map((p: string) => (p.length <= 2 ? p : p[0] + '*'.repeat(Math.min(3, p.length - 2)) + p[p.length - 1]))
        .join(' ');
    }
    if (plainTicket.customer_phone && String(plainTicket.customer_phone).length >= 7) {
      const s = String(plainTicket.customer_phone);
      plainTicket.customer_phone = s.slice(0, 4) + '***' + s.slice(-3);
    }
    if (plainTicket.license_plate && String(plainTicket.license_plate).length >= 5) {
      const s = String(plainTicket.license_plate);
      plainTicket.license_plate = s.slice(0, 3) + '***' + s.slice(-2);
    }
    plainTicket.access_token = '';
  }

  return (
    <div className="pk-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <TicketDetailClient code={code} initialTicket={plainTicket} token={token} />
    </div>
  );
}
