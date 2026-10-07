// Catalogue only: source is read-only; target writes are atomic and --apply gated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const sourceUrl = new URL(process.env.NEON_DATABASE_URL);
assert.equal(sourceUrl.hostname, process.env.CATALOGUE_SOURCE_EXPECTED_HOST, 'Confirm CATALOGUE_SOURCE_EXPECTED_HOST before importing.');
const targetUrl = new URL(process.env.SUPABASE_DB_URL);
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
assert(targetUrl.hostname === `db.${project}.supabase.co`
  || (targetUrl.hostname.endsWith('.pooler.supabase.com') && targetUrl.username === `postgres.${project}`), 'Supabase target identity mismatch.');
const source = new pg.Pool({ connectionString: sourceUrl.toString(), max: 1, connectionTimeoutMillis: 15000 });
const target = new pg.Pool({ connectionString: targetUrl.toString(), max: 1, connectionTimeoutMillis: 15000 });
let transaction = false;
try {
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const { rows: originals } = await source.query('SELECT to_jsonb(o) AS row FROM public.opportunities o ORDER BY id');
  await source.query('ROLLBACK');
  const rows = originals.map(({ row }) => row);
  assert(rows.length > 0, 'Source catalogue is empty.');
  assert(rows.every(row => row.status === 'published' && row.publication_status === 'published'), 'Private/archived records require a separate identity-aware migration.');
  const { rows: columns } = await target.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='opportunities'");
  const allowed = new Set(columns.map(row => row.column_name));
  assert(rows.every(row => Object.keys(row).every(key => allowed.has(key))), 'Target schema is missing source columns.');
  // Published catalogue content is shared. Auth IDs are not portable without mapping.
  const imported = rows.map(row => ({ ...row, created_by: null }));
  await target.query('BEGIN'); transaction = true;
  await target.query('LOCK TABLE public.opportunities IN SHARE ROW EXCLUSIVE MODE');
  const { rows: existing } = await target.query('SELECT to_jsonb(o) AS row FROM public.opportunities o ORDER BY id');
  const current = new Map(existing.map(({ row }) => [row.id, row]));
  for (const row of imported) {
    const previous = current.get(row.id);
    if (previous && !previous.is_demo) assert.deepEqual(previous, row, 'An existing real destination record differs; refusing to overwrite it.');
  }
  console.log(`Source records: ${rows.length}; already present: ${imported.filter(row => current.has(row.id)).length}; legacy creator references: ${rows.filter(row => row.created_by).length}.`);
  if (process.argv.includes('--apply')) {
    const backupRoot = path.join(os.homedir(), '.local', 'share', 'elara', 'backups');
    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
    const directory = fs.mkdtempSync(path.join(backupRoot, 'catalogue-'));
    fs.chmodSync(directory, 0o700);
    fs.writeFileSync(path.join(directory, 'catalogue.json'), JSON.stringify({ exportedAt: new Date().toISOString(), sourceHost: sourceUrl.hostname, destinationProject: project, source: rows, destinationBefore: existing.map(({ row }) => row) }), { mode: 0o600 });
    const names = Object.keys(imported[0]);
    assert(imported.every(row => names.length === Object.keys(row).length), 'Inconsistent source shape.');
    const quote = name => { assert(/^[a-z_]+$/.test(name)); return `"${name}"`; };
    const fields = names.map(quote).join(',');
    await target.query(`INSERT INTO public.opportunities (${fields}) SELECT ${names.map(name => `r.${quote(name)}`).join(',')} FROM jsonb_populate_recordset(NULL::public.opportunities,$1::jsonb) r ON CONFLICT(id) DO UPDATE SET ${names.filter(name => name !== 'id').map(name => `${quote(name)}=EXCLUDED.${quote(name)}`).join(',')}`, [JSON.stringify(imported)]);
    const { rows: copied } = await target.query('SELECT to_jsonb(o) AS row FROM public.opportunities o WHERE id=ANY($1::uuid[]) ORDER BY id', [imported.map(row => row.id)]);
    assert.deepEqual(copied.map(({ row }) => row), imported, 'Imported content mismatch; transaction will roll back.');
    await target.query('COMMIT'); transaction = false;
    console.log(`PASS: ${copied.length} IDs and all imported fields verified. Private backup: ${directory}`);
  } else {
    await target.query('ROLLBACK'); transaction = false;
    console.log('Inspection only; add --apply to import.');
  }
} catch (error) {
  if (transaction) await target.query('ROLLBACK');
  console.error('Catalogue migration failed; target transaction rolled back.', error.code || error.name);
  process.exitCode = 1;
} finally { await Promise.all([source.end(), target.end()]); }
