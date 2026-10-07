// One-time migration. Uses a private JSON export; never logs identity details.
// Usage: node --env-file=<neon env> scripts/migrate-neon.mjs /absolute/private/backup.json
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Pool, neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = WebSocket;
const backup = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL });
const db = await pool.connect();
try {
  console.log('Checking empty target');
  assert.equal((await db.query("SELECT to_regclass('public.profiles') AS table_name")).rows[0].table_name, null, 'Target must be empty. Never overwrite an existing workspace.');
  await db.query('BEGIN');
  console.log('Installing schema');
  await db.query(fs.readFileSync(new URL('../db/migrations/001_neon.sql',import.meta.url),'utf8'));
  console.log('Importing identities');
  await db.query('SET search_path = public');
  for (const user of backup.users) await db.query('INSERT INTO accounts (id,email,legacy_email_verified) VALUES ($1,$2,$3)', [user.id,user.email,Boolean(user.email_confirmed_at)]);
  const remaining = new Set(Object.keys(backup.tables));
  const constraints = (await db.query(`SELECT cl.relname AS child, pl.relname AS parent FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_class pl ON pl.oid=c.confrelid WHERE c.contype='f' AND cl.relnamespace='public'::regnamespace`)).rows;
  while (remaining.size) {
    const table = [...remaining].find(name => !constraints.some(c => c.child===name && c.parent!==name && remaining.has(c.parent)));
    assert(table, 'Unresolved table dependency');
    assert(/^[a-z_]+$/.test(table));
    const columns = new Set((await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',table])).rows.map(r=>r.column_name));
    for (const row of backup.tables[table]) {
      const keys=Object.keys(row);assert(keys.every(key=>columns.has(key)),'Source column missing in target');
      await db.query(`INSERT INTO "${table}" (${keys.map(key=>`"${key}"`).join(',')}) SELECT ${keys.map(key=>`r."${key}"`).join(',')} FROM jsonb_populate_record(NULL::"${table}", $1::jsonb) r`, [JSON.stringify(row)]);
    }
    const count=Number((await db.query(`SELECT count(*) AS count FROM "${table}"`)).rows[0].count);
    assert.equal(count,backup.tables[table].length,`${table} count mismatch`);
    console.log(table,count);
    remaining.delete(table);
  }
  // Preserve trusted roles from the old auth service, never client metadata.
  for (const user of backup.users) {
    const profile=backup.tables.profiles.find(p=>p.id===user.id);
    const role=user.app_metadata?.role || (profile?.is_admin ? 'admin' : 'user');
    assert(['owner','admin','editor','user'].includes(role));
    await db.query('UPDATE profiles SET role=$1 WHERE id=$2',[role,user.id]);
  }
  await db.query('COMMIT');
  console.log('Migration committed. Source database was not modified.');
} catch (error) { await db.query('ROLLBACK'); console.error('Migration rolled back:',error.message, 'position',error.position, 'context',error.where); process.exitCode=1; }
finally { db.release(); await pool.end(); }
