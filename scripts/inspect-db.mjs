import { env } from './cf-mock.mjs';

async function main() {
  const tickets = await env.DB.prepare('SELECT id, ticket_code, spot_code, status FROM parking_tickets').all();
  console.log('Tickets count:', tickets.results.length);
  console.log('Tickets:', tickets.results);

  const spots = await env.DB.prepare('SELECT code, section, is_active FROM parking_spots ORDER BY sort_order ASC').all();
  console.log('Spots count:', spots.results.length);
  const aSpots = spots.results.filter(s => s.code.startsWith('A'));
  console.log('A spots count:', aSpots.length);
  const pSpots = spots.results.filter(s => s.code.startsWith('P'));
  console.log('P spots count:', pSpots.length);
}

main().catch(console.error);
