// Read-only release checks. No fixtures, provider calls, or database mutations.
// Usage: node --env-file=/absolute/private/release.env scripts/check-release.mjs
import pg from 'pg';

let failures = 0;
const redacted = value => Boolean(value && (/redact|sensitive|encrypted|hidden/i.test(value) || [...value].every(character => character === '*')));
function check(name, passed) {
  if (passed === null) {
    console.log(`UNKNOWN: ${name} (export redacted; inspect in Vercel)`);
    failures++;
    return;
  }
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
  if (!passed) failures++;
}

for (const key of ['SUPABASE_DB_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_APP_URL', 'CRON_SECRET']) {
  check(`${key} configured`, Boolean(process.env[key]?.trim()));
}
check('Supabase server key configured', Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
check('Supabase public key configured', Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
check('Checkout remains disabled', [process.env.ENABLE_CHECKOUT, process.env.NEXT_PUBLIC_ENABLE_CHECKOUT].some(redacted) ? null : process.env.ENABLE_CHECKOUT !== 'true' && process.env.NEXT_PUBLIC_ENABLE_CHECKOUT !== 'true');
check('Demo mode is not forced', redacted(process.env.NEXT_PUBLIC_FORCE_DEMO_MODE) ? null : process.env.NEXT_PUBLIC_FORCE_DEMO_MODE !== 'true');
check('Notification email configured', Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM));

if (!process.env.SUPABASE_DB_URL || redacted(process.env.SUPABASE_DB_URL)) {
  check('Database credentials available for inspection', null);
} else {
  const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, max: 1, connectionTimeoutMillis: 20000 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN READ ONLY');
      const { rows: [security] } = await db.query(`SELECT
        NOT has_table_privilege('authenticated','public.profiles','DELETE') AS profile_deletion_blocked,
        NOT has_table_privilege('authenticated','auth.users','SELECT') AS auth_users_private,
        NOT has_table_privilege('authenticated','public.ai_usage','INSERT,UPDATE,DELETE') AS usage_forgery_blocked,
        to_regprocedure('public.reserve_ai_usage(uuid,text,integer,integer)') IS NOT NULL AS quota_installed,
        CASE WHEN to_regprocedure('public.reserve_ai_usage(uuid,text,integer,integer)') IS NOT NULL
          THEN NOT has_function_privilege('authenticated','public.reserve_ai_usage(uuid,text,integer,integer)','EXECUTE') ELSE false END AS quota_private,
        NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) AS public_tables_have_rls`);
      const { rows: [catalogue] } = await db.query(`SELECT
        count(*) FILTER (WHERE status='published' AND publication_status='published' AND NOT is_demo) AS published,
        count(*) FILTER (WHERE status='published' AND publication_status='published' AND NOT is_demo AND last_verified_at IS NULL) AS never_verified
        FROM public.opportunities`);
      await db.query('ROLLBACK');
      for (const [name, passed] of Object.entries(security)) check(name, passed === true);
      console.log(`INFO: published catalogue=${catalogue.published}, never verified=${catalogue.never_verified}`);
      check('Catalogue has non-demo published records', Number(catalogue.published) > 0);
      check('Catalogue has records with a verification timestamp', Number(catalogue.published) > Number(catalogue.never_verified));
    } finally {
      db.release();
    }
  } catch {
    check('Database security checks completed (check connection/schema privately)', false);
  } finally {
    await pool.end();
  }
}

console.log('SMTP delivery, live concurrency, authenticated browser flows and source freshness require separate checks.');
process.exitCode = failures ? 1 : 0;
