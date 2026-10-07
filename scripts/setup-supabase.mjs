// New-project bootstrap only. Existing databases must use Supabase migration tooling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';

assert(process.env.SUPABASE_DB_URL, 'Add SUPABASE_DB_URL to .env.local; never paste it into chat.');
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const connection = new URL(process.env.SUPABASE_DB_URL);
assert(connection.hostname === `db.${project}.supabase.co`
  || (connection.hostname.endsWith('.pooler.supabase.com') && connection.username === `postgres.${project}`),
  'Database URL must identify the same Supabase project as NEXT_PUBLIC_SUPABASE_URL.');
const pool = new pg.Pool({ connectionString: connection.toString(), max: 1, connectionTimeoutMillis: 10000 });
let transaction = false;
try {
  const { rows: tables } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables.length, 0, 'Public tables already exist. Refusing bootstrap; use supabase db push for incremental migrations.');
  const { rows: history } = await pool.query("SELECT to_regclass('supabase_migrations.schema_migrations') AS history");
  if (history[0].history) {
    const { rows } = await pool.query('SELECT version FROM supabase_migrations.schema_migrations');
    assert.equal(rows.length, 0, 'Migration history already exists; use supabase db push.');
  }
  const directory = new URL('../supabase/migrations/', import.meta.url);
  const files = fs.readdirSync(directory).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  console.log(`Confirmed empty Supabase target; ${files.length} migrations ready.`);
  if (process.argv.includes('--apply')) {
    await pool.query('BEGIN'); transaction = true;
    await pool.query('CREATE SCHEMA IF NOT EXISTS supabase_migrations');
    await pool.query('CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text)');
    for (const file of files) {
      const sql = fs.readFileSync(new URL(file, directory), 'utf8');
      await pool.query(sql);
      const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/);
      await pool.query('INSERT INTO supabase_migrations.schema_migrations(version,statements,name) VALUES($1,$2,$3)', [version, [sql], name]);
      console.log(`Applied ${file}`);
    }
    await pool.query("NOTIFY pgrst, 'reload schema'");
    await pool.query('COMMIT'); transaction = false;
    console.log('Schema committed. Accounts/data from Neon have NOT been imported.');
  } else console.log('Inspection only. Add --apply to install atomically.');
} catch (error) {
  if (transaction) await pool.query('ROLLBACK');
  console.error(error instanceof Error ? error.message.replaceAll(process.env.SUPABASE_DB_URL, '[database URL]') : 'Supabase setup failed.');
  process.exitCode = 1;
} finally { await pool.end(); }
