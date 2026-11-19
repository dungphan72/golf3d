import { env } from './cf-mock.mjs';
import { hashPassword, normalizeEmail } from '../lib/auth/password.ts';
import { login } from '../lib/server/auth-service.ts';

async function main() {
  const email = normalizeEmail(process.argv[2] || 'dungphan72@gmail.com');
  const targetPassword = process.argv[3] || 'SiGolf@2026';

  console.log(`=== Reissue Admin for: ${email} ===`);

  // 1. Gather all tenants across all relevant tables
  const foundTenants = new Set(['golf3d-main', 'gopick']);
  for (const table of ['memberships', 'settings', 'parking_spots', 'parking_settings']) {
    try {
      const q = await env.DB.prepare(`SELECT DISTINCT tenant FROM ${table}`).all();
      for (const row of q.results) {
        if (row.tenant) foundTenants.add(row.tenant);
      }
    } catch (e) {
      // table might not exist
    }
  }
  const tenants = Array.from(foundTenants);
  console.log('All active tenants in system:', tenants);

  // 2. Check existing users
  const existingUsers = await env.DB.prepare('SELECT id, email, name, active, failed_count, locked_until FROM users WHERE email=?')
    .bind(email)
    .all();

  console.log('Existing users found:', existingUsers.results);

  const passwordHash = await hashPassword(targetPassword);
  let userId;

  if (existingUsers.results.length > 0) {
    userId = existingUsers.results[0].id;
    console.log(`Updating existing user ${userId}...`);
    await env.DB.prepare(
      'UPDATE users SET password_hash=?, active=1, must_change=0, failed_count=0, locked_until=0 WHERE id=?'
    ).bind(passwordHash, userId).run();
    console.log('User password and lock status updated successfully.');
  } else {
    userId = crypto.randomUUID();
    console.log(`Creating new user ${userId} for ${email}...`);
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, must_change, failed_count, locked_until, active, created) VALUES (?, ?, ?, ?, 0, 0, 0, 1, ?)'
    ).bind(userId, email, 'Chủ cơ sở', passwordHash, Date.now()).run();
    console.log('User created successfully.');
  }

  // 3. Ensure memberships for all tenants
  for (const t of tenants) {
    const existingMembership = await env.DB.prepare(
      'SELECT * FROM memberships WHERE user_id=? AND tenant=?'
    ).bind(userId, t).first();

    if (existingMembership) {
      console.log(`Updating membership for tenant '${t}' to role 'owner'...`);
      await env.DB.prepare(
        "UPDATE memberships SET role='owner' WHERE user_id=? AND tenant=?"
      ).bind(userId, t).run();
    } else {
      console.log(`Adding membership for tenant '${t}' with role 'owner'...`);
      await env.DB.prepare(
        "INSERT INTO memberships (user_id, tenant, role, created) VALUES (?, ?, 'owner', ?)"
      ).bind(userId, t, Date.now()).run();
    }
  }

  // 4. Verify result
  const finalUser = await env.DB.prepare('SELECT id, email, name, active, must_change, failed_count, locked_until FROM users WHERE id=?')
    .bind(userId)
    .first();
  const finalMemberships = await env.DB.prepare('SELECT * FROM memberships WHERE user_id=?')
    .bind(userId)
    .all();

  console.log('\n=== REISSUE RESULT ===');
  console.log('User:', finalUser);
  console.log('Memberships:', finalMemberships.results);
  console.log(`Login credentials:\n  Email: ${email}\n  Password: ${targetPassword}\n======================`);

  // 5. Test real login function
  const loginTest = await login(email, targetPassword);
  console.log('\n[Verification] login() test outcome:');
  if (loginTest.ok) {
    console.log('  SUCCESS! Logged in as:', loginTest.user);
  } else {
    console.error('  FAILED!', loginTest.result);
  }
}

main().catch(console.error);
