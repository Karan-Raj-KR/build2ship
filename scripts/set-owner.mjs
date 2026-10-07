// Usage: node --env-file=.env.local scripts/set-owner.mjs <verified account email>
import assert from 'node:assert/strict';
import pg from 'pg';
assert(process.argv[2], 'Specify the verified account email.');
assert(process.env.SUPABASE_DB_URL, 'Set SUPABASE_DB_URL to the Supabase database connection string.');
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, max: 1 });
try {
  const { rows } = await pool.query(`UPDATE profiles p SET role = 'owner', is_admin = true FROM auth.users u
    WHERE p.id = u.id AND lower(u.email) = lower($1) AND u.email_confirmed_at IS NOT NULL RETURNING p.id`, [process.argv[2]]);
  assert.equal(rows.length, 1, 'Expected one verified workspace account. Sign in first.');
  console.log('Owner role assigned to the verified account.');
} finally {
  await pool.end();
}
