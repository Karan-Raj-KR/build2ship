# Neon migration release record

Status: pushed on `codex/neon-production`. Vercel QA preview built successfully and its full integration check passed. Production cutover remains pending verified custom SMTP.

## Imported source data

The source Supabase database remains unchanged. Its private export is outside Git.
Neon imported the three accounts/profiles, 26 opportunities, five applications,
one profile-evidence record, two profile-insight records, two analytics events,
and one workspace-preference record. IDs and trusted roles are retained.
Other exported tables were empty. New workflow tables were created without seed records.

Passwords were not migrated. Returning users must sign up with the same email and verify it.
Previously verified legacy accounts can recover their original workspace IDs;
unverified legacy accounts need administrator review.

## Security and validation

- All user tables enforce RLS. Identity mappings have no client grants.
- Privileged SQL functions are inaccessible to client roles. Users cannot assign themselves roles or XP.
- QA runs on a separate Neon branch using reserved example.com identities.
- Integration checks passed for verified-session requirements, repeat login, legacy recovery,
  profile persistence, cross-user isolation, save/prepare/tasks/rewards, export,
  account deletion and session revocation, and disabled checkout.
- Browser signup/login and onboarding progression/reload were verified locally on that QA branch.
- The deployed preview at `opportunityos-git-codex-ne-d3093d-karanrajkr2008-3547s-projects.vercel.app` passed the same integration check on October 2, 2026. The user explicitly authorized Vercel protection bypass for these test requests; project protection remains enabled.
- 204 unit tests passed; TypeScript passed. The final production webpack build and the Vercel Turbopack build passed. Lint has zero errors (115 warnings).
- Password-reset requests are supported; valid-code reset and real inbox delivery require SMTP verification.

Managed identity deletion currently uses an atomic database deletion alongside workspace deletion,
because the managed delete-user endpoint returned 404. Managed foreign keys revoke its sessions;
the application's authoritative identity check also rejects cached cookies for deleted users.

## Free email setup

Brevo Free provides 300 emails/day shared between transactional and marketing mail.
The allowance does not roll over. Notifications and Neon authentication share this quota
when they use the same Brevo account. No payment card or time-limited trial is required.

1. Create and verify a Brevo Free account.
2. Verify the sender and authenticate its domain in Brevo.
3. Configure Neon Auth custom SMTP with Brevo's SMTP login and SMTP key
   (not the API key), using smtp-relay.brevo.com and port 587 with STARTTLS.
4. Set server-only `BREVO_API_KEY` and `EMAIL_FROM` in Vercel for notification delivery.
5. Verify signup, password reset and delivery using an authorized real inbox.

Notification requests use the delivery UUID as Brevo's idempotency key. Provider deduplication
has a limited time window; it does not guarantee exactly-once delivery across long retries.
Missing credentials hold mail. Rejected/quota-limited sends never count as successful.

## Cutover checks

The pushed branch preview is connected to the isolated QA database and verified. The temporary QA branch expires October 3, 2026; renew or replace it before further testing.
Before updating the production branch, finish custom SMTP and trusted-origin configuration,
disable localhost on the production Neon branch, and verify the authenticated application.
Keep checkout disabled; live payments and automatic catalogue crawling remain unimplemented/unverified.
Keep the source database and private export until the new deployment's recovery window is agreed.

Sources: [Brevo free limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan),
[SMTP relay](https://developers.brevo.com/docs/smtp-integration),
[Neon production checklist](https://neon.com/docs/auth/production-checklist).
