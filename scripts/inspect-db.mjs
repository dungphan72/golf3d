import { env } from './cf-mock.mjs';

async function main() {
  const allSpots = await env.DB.prepare('SELECT tenant, code, is_active, section, row_index, col_index FROM parking_spots').all();
  console.log('Total spots in DB:', allSpots.results.length);
  
  const gopickSpots = allSpots.results.filter(s => s.tenant === 'gopick');
  console.log('GoPick spots in DB:', gopickSpots.length);
  
  const gopickActive = gopickSpots.filter(s => s.is_active === 1);
  console.log('GoPick active spots:', gopickActive.length);

  const aSpots = gopickSpots.filter(s => s.code.startsWith('A'));
  console.log('GoPick A spots:', aSpots.map(s => `${s.code}(active=${s.is_active})`));

  const p65 = gopickSpots.find(s => s.code === 'P65');
  console.log('P65 in GoPick:', p65);

  const pushSubs = await env.DB.prepare('SELECT * FROM push_subscriptions').all();
  console.log('Push subscriptions count:', pushSubs.results.length, pushSubs.results);

  const pushKeys = await env.DB.prepare('SELECT id, public_key, created FROM push_keys').all();
  console.log('Push keys:', pushKeys.results);
}

main().catch(console.error);
