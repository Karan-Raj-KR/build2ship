# Deployment

Elara uses Supabase Auth, the Supabase Data API, and Supabase Postgres. The existing Vercel project and deployed domain are not changed by this repository update.

## Manual Supabase setup

1. In your Supabase project dashboard, copy the Project URL and publishable key into `.env.local`; set the secret key only in server environments. Confirm the project is the intended new/empty target before applying migrations.
2. Copy the transaction-pooler connection string from **Connect → Transaction pooler** into `SUPABASE_DB_URL`. It is server-only and includes a database password. Never commit it.
3. Once `SUPABASE_DB_URL` is configured, inspect with `node --env-file=.env.local scripts/setup-supabase.mjs`, then initialize with the same command plus `--apply`. This refuses nonempty public schemas, checks the project identity, installs all migrations in one transaction, and records Supabase migration history. It does not migrate Neon accounts or saved data. For subsequent changes use Supabase CLI `db push` against the confirmed project.
4. In **Authentication → URL Configuration**, set the local Site URL during development and add both `http://localhost:3000/auth/callback` and the exact deployed origin's `/auth/callback` to Redirect URLs. Configure email confirmation and a production SMTP sender.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_APP_URL`, and existing provider/cron variables in local and Vercel environments. `SUPABASE_SERVICE_ROLE_KEY` remains a supported legacy alias. Use the new project's credentials in Preview and Production only when ready; no deployment is performed here.
6. After creating and verifying your first account, assign the initial owner with `node --env-file=.env.local scripts/set-owner.mjs you@example.com`.
7. Keep Neon and its backups available. Existing passwords/sessions are not portable through this app change. User tables/catalogue are not copied, and the previous Neon importer is not safe for Supabase Auth IDs. Plan a reviewed data migration and identity mapping before importing saved work.

## Release checks

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
node --env-file=/absolute/private/release.env scripts/check-release.mjs
```

The read-only release script checks project credentials, key grants, AI quota function, RLS, and catalogue state. It does not prove SMTP delivery, authenticated browser flows, live concurrency, catalogue freshness, or migrated user data. Verify those separately against a non-production Supabase project before cutover.

Checkout stays disabled until payment and refund flows are verified. Push delivery is unavailable. The source crawler is not scheduled; review and publish sources manually.

## Recovery

Record the previous deployment and database recovery point before cutover. Retain the original Neon database/export until the new deployment and any user-data migration are verified. Restore the prior app deployment only after assessing schema compatibility; keep alert and payment kill switches available.
