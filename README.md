# build2ship

A workspace for finding programmes, checking known eligibility requirements, saving applications, and preparing reusable evidence and answers.

## Stack

Next.js 16.3.8, React 19, TypeScript, Tailwind CSS, Supabase Auth/PostgREST, and Supabase Postgres. Server jobs and privileged mutations use parameterized SQL. User queries enforce row-level security in Postgres.

## Run

Use Node.js 22.16 or newer. Copy `.env.example` to `.env.local`, add the credentials from your Supabase project, then:

```sh
npm ci
npm run dev
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted).
- `SUPABASE_SECRET_KEY`: server-only key for account deletion (`SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy alias).
- `SUPABASE_DB_URL`: server-only Postgres transaction-pooler URI for parameterized SQL.
- `NEXT_PUBLIC_APP_URL`: your application origin.

Enable email confirmation in Supabase Auth, add local and deployed callback URLs, and configure custom SMTP before relying on production authentication email.

## Database migration

`supabase/migrations/` is the runtime schema history. It contains RLS policies, payment functions, progress rewards, AI quota reservation and notification scheduling. It does not copy existing Neon data or opportunity catalogue rows.

The former Neon exporter/importer is not compatible with Supabase Auth user IDs. Keep the Neon project and its private backup intact; saved profiles, applications, catalogue rows, and passwords are not automatically copied or linked by this code change. Plan and verify an identity-to-workspace mapping before importing any user data.

To assign owner access to a verified account after it has signed in:

```sh
node --env-file=.env.local scripts/set-owner.mjs owner@example.com
```

## Verification

```sh
npm test
npx tsc --noEmit
npm run lint
npx next build --webpack
npm audit
```

`scripts/smoke-release.mjs` checks public HTTP behavior; `scripts/check-release.mjs` checks configuration and database grants in a read-only transaction. Neither replaces authenticated integration tests or real inbox/browser QA.

Use a separate Supabase project for integration tests. Configure a private environment file and verify authenticated flows before using production:

```sh
npm run dev
```

The existing Neon-specific integration fixture is historical and is not a Supabase verification. Do not run it against the new project.

## Deployment

The existing Vercel project/deployment is unchanged. Update its environment variables manually before any future deployment. Keep provider secrets outside Git. Checkout stays disabled until the payment provider and webhook paths are verified.

Keep the original Neon database available for recovery until data migration and a verified Supabase release are complete. Configure reliable custom SMTP for production authentication email.

## Current boundaries

- Catalogue results come from stored records. Automatic source crawling is not implemented.
- Funding, eligibility, and deadline claims depend on source evidence and freshness. Unknown requirements stay unknown.
- Landing programme cards are illustrative examples, not a live feed.
- Email opportunity alerts require a configured provider and opt-in; push delivery is not configured.
- Checkout is disabled. No payment success is inferred from local tests.

See `docs/REDESIGN_QA.md` for the earlier design QA notes and `DEPLOYMENT.md` for Supabase setup.

## Build your experience

Visit `/contributions` from My profile or More tools. Matching uses your existing profile. GitHub reads and AI planning run on the server; saved plans use Supabase workspace records. See `docs/CONTRIBUTIONS_HANDOFF.md`.
