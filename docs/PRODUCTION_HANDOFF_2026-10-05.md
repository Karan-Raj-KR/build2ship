# Production handoff — 5 October 2026

**Status: not ready for a public launch.** Security migration `002` is now applied and verified on both QA and production databases. The current app code has not been deployed.

## Completed in this pass

- Production build and TypeScript passed. All 221 Vitest tests passed. ESLint had zero errors and 104 warnings.
- Added `scripts/check-release.mjs`: configuration checks and a read-only database transaction inspecting security grants, quota presence, cleanup trigger, RLS and catalogue counts. It prints no credentials or personal records. Redacted values report `UNKNOWN` rather than inventing a result.
- Added `scripts/smoke-release.mjs`: public page availability, login redirect, anonymous API denial, cron authorization denial and response security headers. All 19 checks passed against the local production build and `https://app.karanrajkr.com`.
- Extended `scripts/verify-neon.mjs` with client profile-deletion/AI-usage denial and five concurrent quota reservations against an allowance of one. These Auth/Data API assertions are prepared and syntax-checked, but not yet run on a live app preview.
- Identified the dedicated Neon branch `qa/security-migration-2026-10-05` (parent `main`) from the user's screenshots. Applied `002_audit_hardening.sql` there, then ran `tests/audit-hardening.sql` as `neondb_owner`; it passed and rolled back its fixtures.
- Ran five real parallel reservations for one disposable QA identity. Exactly one succeeded, and the identity was removed afterward.
- Removed the scheduled `/api/cron/refresh-sources` invocation from `vercel.json`; its implementation returns 501. The endpoint remains explicit about unavailable crawling. This schedule change takes effect after deployment.
- Replaced the obsolete Supabase deployment guide with the current Neon release order and repeatable commands.

The HTTP checks are anonymous. The payment-order request is rejected by auth middleware before the checkout feature gate, so a passing smoke check does not establish that signed-in checkout is disabled.

## Verified production findings

Vercel reports deployment `dpl_DLjFFVpKR4yCP1ks6TqiBgpFvMCp`, created 2 October 2026, as Ready and aliased to `app.karanrajkr.com`. That hosting status is not application release approval.

Read-only checks using the project's exported production database configuration found:

| Gate | Current result |
| --- | --- |
| Client profile DELETE denied | **PASS** on production after migration |
| Client AI usage INSERT/UPDATE/DELETE denied | **PASS** on production after migration |
| `reserve_ai_usage` installed and private | **PASS** on production after migration |
| Account import-cleanup trigger installed | **PASS** on production after migration |
| Account identity mapping private | PASS |
| Public tables have RLS enabled | PASS; does not independently prove every policy |
| Non-demo published catalogue | 26 records; all 26 lack `last_verified_at` |
| Vercel notification email configuration | `BREVO_API_KEY` and `EMAIL_FROM` absent |
| Cookie secret strength and checkout flag values | UNKNOWN: sensitive Vercel values are redacted on export |

The migration was applied to QA, its rollback-only regression passed, and five live concurrent AI reservations allowed exactly one request for an allowance of one. The same migration was then applied to the exact production endpoint fetched from Vercel Production. Read-only production checks passed all five migration gates. The app deployment is still pending.

## Manual work, in order

### 1. Give QA its own current Neon branch

The dedicated `qa/security-migration-2026-10-05` branch exists. Its migration regression and live concurrency check pass. The older release record's temporary QA branch expired on 3 October; this new branch replaces it. Enable managed Auth and the Data API for this QA branch if they are not already enabled; allow `http://localhost:3000` and the chosen preview origin there. Disable automatic public-schema grants.

Configure Vercel Preview or a private local env file with the QA branch's database URL, Auth endpoint, cookie secret and Data API URL. The checked Vercel Preview environment still points to a different endpoint. Do not paste database credentials into chat.

**Still to run:** configure Vercel Preview for this branch, then run the signed-in Neon Auth/Data API integration suite and browser QA. The Vercel Preview environment currently points at a different Neon endpoint. The SQL regression fixtures were rolled back; the concurrency account was deleted. Never point fixture scripts at production, and never run `tests/audit-hardening.sql` there.

### 2. Configure and prove email

- Verify your sender/domain with the email provider and publish the requested DNS records.
- Configure custom SMTP in Neon Auth. For the documented Brevo setup, use its SMTP login and SMTP key, not the notification API key.
- Set server-only `BREVO_API_KEY` and `EMAIL_FROM` in the appropriate Vercel environments.
- Use an inbox you control: create a fresh account, receive its verification code, verify it, sign out/in, request a password reset, receive the code and actually reset the password. Confirm an unverified account cannot open a workspace.
- Opt into notification email on QA, trigger a controlled notification for your test account, confirm receipt and unsubscribe. A provider acceptance response alone is not inbox delivery.

### 3. Review the launch catalogue

Review every programme you intend to launch with against its official provider page. Confirm the current edition, deadline/timezone, funding coverage and nationality/residence/education constraints. Record source evidence and a truthful last-checked timestamp using the admin workflow. Archive expired or unsupported entries; keep uncertain claims explicitly unknown. Start with a smaller reviewed catalogue if necessary. A timestamp alone is not verification.

### 4. Test the actual UI

On the QA preview, use desktop and a real phone:

- Complete onboarding, edit profile fields, immediately reload, and confirm persistence.
- Find a programme, save it, start preparation, change a checklist item and notes, then reload. Confirm progress survives re-importing the same programme.
- Disconnect the network during a note/profile save, confirm the error remains visible, reconnect and retry without losing edits.
- Test sign-out/in, account export, and deletion using a disposable QA account. Confirm it cannot regain access after deletion.
- Check dialogs with keyboard/Tab/Escape, focus return, narrow screens, 200% zoom and reduced motion.
- Confirm email preferences are understandable, browser push is unavailable, and signed-in checkout is disabled.

See `docs/APPLLAMA_REDESIGN_QA.md` for detailed viewport and interaction coverage. No browser was connected for this pass, so no new visual or authenticated browser verification is claimed.

### 5. Confirm production settings and finish cutover

In Vercel and Neon, confirm all production endpoints belong to the same intended production branch. Check the actual cookie secret is at least 32 random characters, `ENABLE_CHECKOUT=false`, `NEXT_PUBLIC_ENABLE_CHECKOUT` absent/false, and `NEXT_PUBLIC_APP_URL=https://app.karanrajkr.com`. Allow the production app origin in Neon Auth and disable localhost on production. Keep notification delivery disabled until its real delivery check passes.

Run `npm audit --omit=dev` from a working network. The registry request failed here even after escalation (TLS connection failure); dependency advisory status is **unverified**, not clean.

After the signed-in QA suite, SMTP, catalogue and browser checks pass, preserve a database recovery point and deploy the tested revision; `002` is already applied on production. Run the saved read-only check and public smoke check again, then repeat the real-inbox and signed-in persistence smoke tests. Do not launch until catalogue, configuration, authenticated flow and provider gates pass.
