# Eligent launch status — 1 October 2026

## Ready in the code

- Profile editing and conservative requirement checks shared by the opportunity views and alerts.
- Public GitHub README or pasted Markdown import in Admin → Import list. It extracts Markdown links only and saves selected records as private drafts with unknown funding, deadlines, eligibility, and source status.
- Manual publication gate requiring an official URL and a written source review note.
- $9 USD one-time pass for 30 days; there is no auto-renewal. Checkout remains disabled until the admin setting and Razorpay credentials are configured.
- Server-side payment verification, idempotent grant path, refund revocation, email/in-app digest and deadline jobs, account export/deletion, and password reset flows.
- Production build and TypeScript currently pass.

## Must happen before real customers

1. Apply the existing migrations in timestamp order, including `20240916000000_global_catalogue_and_admin.sql` and then `20261001000000_launch_repairs.sql`, to a reviewed Supabase project. The app has not applied them. Back up production and review the SQL before running it; it changes RLS, auth deletion behavior, payment tables, and notification tables.
2. Configure Supabase URL/keys, Razorpay USD checkout/webhook secrets, `CRON_SECRET`, and an email provider API key/from address. Confirm international USD collection in the actual Razorpay account. Enable payments only after a sandbox payment and refund exercise.
3. Add and manually review the opportunity list. Imported GitHub README links are drafts; there is no opportunity web crawler or profile-directed live search.
4. Run authenticated browser QA for signup, onboarding, eligibility, alerts/unsubscribe, payment/cancellation/refund, data export, and account deletion. Hosted mail, payment, cron, and account capabilities cannot be verified from this checkout alone.

## Known check results

- `npx tsc --noEmit`: passes.
- `npx next build --webpack`: passes. Next reports the existing deprecated `middleware` convention.
- `npm run lint`: fails on existing repo-wide lint errors (including `any`, React effect rules, and unescaped apostrophes); this task did not reformat unrelated screens to silence them.
- `npm test`: 16 failures / 196 tests. Most failing assertions expect the old eligibility and ranking behavior that treated missing verification or requirements as a positive match. One suite also fails to resolve Next's `server-only` marker in Vitest. Those expectations and the test import setup need to be aligned with the conservative production behavior; do not weaken eligibility to make the old assertions pass.

## Deferred by design

Automated opportunity scraping/live search, web push, auto-application, referrals/rewards, mobile app, browser autofill, and broad category expansion. Build live discovery after the supplied catalogue is reviewed and the import → verify → match → alert loop is reliable.
