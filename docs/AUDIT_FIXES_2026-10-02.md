# Audit fixes — October 2, 2026

All 11 reported issues have code fixes. These changes have not been deployed or applied to a live database.

| Finding | Change |
| --- | --- |
| Suspension reset through profile deletion | Removed the client DELETE policy and permission for profiles. Account deletion stays server-managed. |
| Unrestricted Ask spending and disconnected quotas | Every shared AI provider call must reserve authenticated usage in Postgres before the provider is contacted. Reservations serialize per profile, enforce 20 requests/minute, and use the configured monthly free/paid limits. |
| Imported source data surviving deletion | Attached private-import cleanup to accounts BEFORE DELETE. Private drafts are removed; shared listings retain other users' work while losing the deleted user's source content/evidence and identity. |
| Imports conflicting with RLS | Both user imports save private drafts. AI Bridge uses the existing field sanitizer, discards client IDs/publication flags/UI metadata, and creates saved applications for Library access. |
| Re-import resetting application progress | Application conflicts preserve existing rows and return the existing application. |
| Notes lost through failed/overlapping saves | Reused the serialized autosave queue; edits remain pending on failure, with visible save status, retry, and a browser unload warning. |
| Admin deletion claiming a nonexistent queue | Endpoint and admin UI explicitly describe suspension for manual deletion review. They retain the account in the roster and do not claim deletion or queue creation. |
| AI prompts inventing experience | Removed hardcoded accomplishments and verification labels. Prompts use saved self-reported experience/portfolio or ask for missing details. |
| Push activation without delivery | Status returns disabled, subscription activation returns 503, and the UI offers email/in-app settings without requesting browser permission. Existing subscriptions can still be removed. |
| Stale notification email | Session linking synchronizes the current verified identity email. Jobs use the authoritative identity and recheck email, verification, suspension and opt-in immediately before sending queued mail. |
| Billing errors pretending to be free accounts | Entitlement queries propagate errors; endpoint returns 503 and UI shows an unavailable state with retry rather than an invented free plan. |

## AI allowance semantics

Ask, extraction, and AI profile analysis share the analysis allowance. Draft provider requests have their own allowance. Deterministic eligibility, extraction fallback and profile guidance do not spend AI usage. A reserved provider request consumes one allowance even when the provider fails; its bounded retries are part of that request. This prevents ambiguous provider outcomes from resetting the spending limit. Monthly windows use UTC.

## Database rollout

Apply `db/migrations/002_audit_hardening.sql` to an isolated Neon branch with the existing schema first, using its direct connection. Run `tests/audit-hardening.sql` there as the schema owner. It uses generated reserved fixture accounts inside a transaction and rolls them back. Do not run this fixture check on production.

```sh
psql "$QA_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_audit_hardening.sql
psql "$QA_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/audit-hardening.sql
```

Apply the reviewed migration to the target database before deploying the app changes. The original `001_neon.sql` includes the same hardening for fresh installs. The upgrade is safe to re-run and does not delete existing accounts or application data. Without the migration, the new AI reservation query fails closed and existing database vulnerabilities remain.

## Validation

- 221 Vitest tests passed, including actual endpoint/provider checks for quotas, unavailable billing, private imports, application preservation, identity email updates and queued email recipient checks. Existing autosave tests exercise ordering, retained edits and retry.
- Fresh-schema and pre-fix-schema upgrades executed in temporary local PGlite PostgreSQL instances, with repeated migration application. SQL checks verified grants, free/paid allowances, the minute limit, suspension, private-import cleanup and preservation of another user's application.
- TypeScript and the production webpack build passed.
- ESLint: zero errors; existing warnings remain.
- UI detector reported only an existing checkout-theme color advisory.

Local SQL tests do not establish Neon Auth/Data API integration or concurrent transactions on a live Neon branch. Live branch checks, deployment, browser interaction QA and real provider delivery remain unverified.
