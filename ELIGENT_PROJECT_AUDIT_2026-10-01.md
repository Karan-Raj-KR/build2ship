# Eligent project audit — 1 October 2026

## Conclusion

This is the right project. The directory/package is `opportunityos`; the current product configuration calls the app **Eligent**. It contains a substantial Next.js application with real Supabase persistence, profile onboarding, catalogue search, recommendations, and application organization. It also contains unfinished integrations, legacy demo behavior, and misleading success/verification claims.

**The current checkout is not ready for a paid launch.** The production build fails. Matching can claim eligibility without checking mandatory requirements. Background alerts and payment access use the wrong database identity. Catalogue verification and parts of ingestion/admin reporting simulate results without performing the claimed work.

The useful foundation can support the proposed **profile → matching → alerts** product. Most necessary work is repairing and narrowing existing functionality.

## Evidence and limits

- Reviewed source across pages, components, API handlers, matching/ingestion/notification/payment libraries, types, migrations, configuration, and tests. Traced the principal user and background flows.
- Ran the existing test suite, lint, TypeScript checks, and the webpack production build. Used a local development server for unauthenticated route/API probes.
- Read the Supabase database configured in `.env.local`, including aggregate counts, schema, catalogue dates, and public auth settings. No database mutations, emails, payments, account deletion, or security exploits were performed.
- Ran the actual matching, freshness, URL-fetch, verification, and ingestion functions with synthetic inputs. URL-fetch diagnostics used mocked network responses; they did not contact private network addresses.
- Browser automation returned `No browser is available`, and recovery found no browsers. Authenticated browser journeys, responsive layout, accessibility behavior, payment completion, and email receipt remain unverified.
- The hosted deployment, hosted environment variables, scheduler execution, and Razorpay account capabilities were not audited. The configured database is confirmed; its relationship to the currently deployed website is not assumed.
- Official programme pages were not independently verified. A stored title, URL, or deadline is not evidence that the programme currently accepts applications.
- There were 38 modified tracked files and an untracked `.freebuff/` directory before this audit. This report reflects that current working tree. Existing application changes were preserved; this audit does not fix code.

## Current inventory and checks

| Item | Current result |
|---|---|
| Stack | Next.js 16.3.4, React 19.2.8, TypeScript, Tailwind 4, Supabase Auth/Postgres/RLS, OpenAI-compatible client, Razorpay SDK, Vitest |
| Source inventory | 26 page files, 31 API handler files, two auth callback handlers, eight database migrations |
| Tests | **200 passed across 24 test files** |
| Lint | **30 errors, 103 warnings** |
| Initial TypeScript check | Three undefined-symbol errors in the application detail page |
| Production build | **Failed**: invalid named page export in admin, plus the application detail errors |
| Local public pages | Landing, login, signup, privacy, terms, refund, support returned HTTP 200 |
| Protected pages/APIs | Sampled app pages redirected to login; profile/recommendation/admin APIs returned 401 without authentication |
| Cron authentication | Sampled cron endpoints returned 401 without the configured bearer secret |
| Local billing/email/push configuration | Razorpay, Resend, and VAPID configuration absent; Supabase, AI provider, Serper, and cron secret present |

Passing tests establish useful local logic coverage. They do not establish a working product journey. Some security tests reproduce simplified logic inside the test rather than exercise the production function. There are no payment integration checks establishing purchase → persisted entitlement → enforced access.

Historical build/status documents contain older passing results and optimistic completion claims. They should not be treated as the current audit.

### Configured database snapshot

| Data | Count/state |
|---|---|
| Profiles / profile evidence | 3 / 1 |
| Opportunities | 26, all published, none marked demo |
| Categories | 7 internships, 8 fellowships, 6 hackathons, 3 grants, 2 scholarships |
| Applications | 5: three saved, two preparing |
| Application tasks / answers / eligibility analyses | 0 / 0 / 0 |
| Profile insights | 2 |
| Payment passes / recorded AI usage | 0 / 0 |
| Analytics events | 2 |
| Collections / Scout runs / saved searches / recommendation feedback | 0 / 0 / 0 / 0 |
| Notifications / notification preferences / push subscriptions | 0 / 0 / 0 |
| Listings with `last_verified_at` | **0 of 26** |
| Past deadlines / missing deadlines | **3 / 2** |
| Missing admin tables | `admin_sources`, `admin_audit_logs`, `quality_reports`, `system_settings` |

Mitacs, Girls Who Impact, and PennApps have stored deadlines before the audit date while remaining marked `live`. SBI and Kotak have no stored deadline; Kotak has no stored requirements. These counts demonstrate persisted data, not customer acquisition, completed applications, or product-market fit.

## How the application works

1. **Account:** Supabase email/password authentication, confirmation callbacks, cookie sessions, and protected app routes.
2. **Profile:** Manual onboarding, pasted résumé/background text, public GitHub extraction, or externally generated AI JSON produce editable profile facts and evidence. Profiles/evidence are saved in Supabase. Optional AI analysis produces profile insights.
3. **Catalogue:** Published opportunity rows are read from Supabase. Manual URL/text import can extract structured fields. Separate candidate-normalization, source-registry, verification, and search-adapter code exists, with incomplete connections to persistence and discovery.
4. **Matching:** Several different engines operate: older catalogue ranking, Scout matching, country rules, For You ranking, detailed requirement analysis, and comparison. They currently use different rules and can disagree.
5. **Action:** Users save an opportunity, prepare in an application workspace, manage tasks/answers/notes, and open the provider's website to apply. Submission/results are manually recorded.
6. **Alerts:** Scheduled handlers are intended to inspect saved applications/searches and generate notifications. Email templates and a Resend HTTP sender exist. Permissions, recipient lookup, preferences, and delivery gaps prevent a reliable service.
7. **Payment:** Razorpay creates an order, verifies a signature, and attempts to grant a timed access pass. This is a one-time INR pass, with broken persistence/enforcement paths.

The existing user navigation is much broader than the proposed launch: Today, For You, Scout, Applications, Library, Compare, Profile, Ask, AI Bridge, Import, Billing, and Settings. The narrow product direction has not been implemented as a cohesive scope.

## Feature inventory

“Implemented” below means the relevant UI/logic/storage path exists. It does not imply an authenticated browser journey was completed during this audit.

| Feature | What exists and current status |
|---|---|
| Landing and legal/support pages | Locally reachable. Landing contains illustrative scores/verification language; legal/support content needs correction. |
| Email/password accounts | Real Supabase auth/session code; signup and email confirmation enabled. Anonymous access protection verified. Full signup/login/email delivery not exercised. |
| Password reset / social login | Reset flow absent despite support instructions. OAuth providers disabled in the configured project. |
| Manual onboarding | Structured facts and confirmation UI implemented. Graduation-year values bypass consistent date normalization and can fail against a DATE column. |
| Résumé onboarding | **Pasted text parser**, using regex and a short technical skill vocabulary. No PDF/DOCX file upload. |
| GitHub onboarding | Public profile/repository extraction code, without OAuth. Not live-tested against GitHub. |
| AI profile import | JSON parsing/review exists, but onboarding discards parsed profile/evidence objects and applies only candidate facts. |
| Conversational onboarding | Native profile-building conversation absent. “Ask” is a separate guidance feature. |
| Editable profile | Profile GET/PATCH, field whitelist, arrays/date normalization, autosave/cache, education/location/preferences/links/evidence. Three persisted profiles confirmed. Several write paths bypass this validation; errors can be hidden. |
| Profile insights | Deterministic and AI analysis with persisted insights; two rows confirmed. Opportunity-impact counts are hardcoded and evidence descriptions can overstate verification. |
| Database catalogue | 26 publicly readable published records confirmed. Categories/location/mode/funding/deadline/source fields exist. Freshness and eligibility quality are inadequate. |
| Discover catalogue | Search/category/mode/status filters, previews, save/prepare, compare selection. Its compare action only displays a toast. This older route overlaps Scout/For You. |
| Scout search | Actual catalogue query returned HTTP 200 and stored results. Natural-language parser/ranking exists. It searches the stored catalogue; the external search adapter is not connected. Deadline and other requested constraints are ignored. |
| For You | Profile/evidence/feedback-based feed, pagination, explanations, remote/paid filters, hide/dismiss and save UI. Matching semantics and inline “gap resolved” behavior are unsafe. |
| Eligibility analysis | Deterministic per-requirement evaluation, source excerpts, uncertainty, optional AI fallback, cached records. Mandatory unknowns can become “likely eligible”; document facts are invented by the detail page. |
| Opportunity detail | Provider link, requirements, funding/deadline displays, analysis, save/prepare. Questions/documents are read from an outdated nested shape in several paths. |
| Compare | Real page/API for up to three opportunities; eligibility/funding/cost/effort/source summaries. Inherits matching problems and infers some funding guarantees. |
| Saved opportunities | Persisted through applications with one application per user/opportunity. Five real records confirmed. Unsave can delete prepared work and cascade related records. |
| Application board/list | Manual stages, ordering, drag/menu alternatives, submission/result confirmations. Implemented; interaction QA pending. |
| Application workspace | Task/answer/notes/evidence/next-action/target-date/export UI and database paths. Currently breaks build; writes often omit database error handling. No tasks/answers present in the database. |
| Today dashboard | Deadlines, tasks, focus/progress and pin/reorder functionality. Implemented; depends on application/task data. |
| Evidence library/collections | Evidence and collection management exist. One evidence record, no collections confirmed. |
| Application preparation plan | API/UI exists, but generates generic CV/transcript/checklist steps without grounding all steps in provider requirements. |
| Context export / AI Bridge | Markdown/JSON copy/download utilities and import preview/dedupe logic. Opportunity import is incompatible with UUID IDs/schema; some exports omit actual evidence/analysis. |
| URL/text ingestion | Fetch/extract/preview/manual save paths exist. Live authenticated saving not performed. URL safety and publishing policy require repair. |
| Automated source ingestion | Source registry, candidate helpers, dedupe, and counters exist. Pipeline reports insertions without database writes. |
| Source verification/refresh | Heuristics and deadline/source labels exist. No reliable official-page verification/content-change monitoring; refresh checks domains and reports counts without updating records. |
| In-app notifications | Inbox API, unread/mark-read, periodic polling. Implemented; zero stored notifications. Producer jobs cannot reliably access user data. |
| Email alerts/digests | Sender/templates exist. Deadline job passes no recipient email; Scout sends no email; weekly digest/unsubscribe/preferences service absent. |
| Saved-search alerts | CRUD API/table exists; UI does not call it. Zero searches; scheduled matching has permissions/freshness problems. |
| Web push | Permission UI, subscription storage, service worker plumbing. Dispatcher explicitly says delivery is not implemented. |
| Billing | Razorpay order/signature/webhook/entitlement code. Local checkout disabled. Timed ₹499 pass, no recurring $9 subscription; access persistence and enforcement broken. |
| Admin | Opportunities/users/sources/settings/quality/analytics/audit-log screens and APIs. Missing schema, invalid IDs, ignored write errors, memory-only settings, and fabricated analytics. |
| Data export/deletion | Export includes profile/evidence/applications only. “Delete account” deletes the profile, not Supabase Auth identity, and ignores errors. |
| Analytics | Small event logger/funnel UI exists. Important journey events/attribution/renewal metrics absent; admin results mix static values with incomplete data. |
| Rewards/referrals/mobile/autofill | No complete launch-ready system. None is required for the proposed initial service. |

## Findings requiring repair before a paid launch

### 1. Production build fails

- [Application detail](src/app/(app)/workspace/[id]/page.tsx#L499) references removed `IS_DEMO_MODE` and `demoStore` identifiers.
- [Admin page](src/app/(app)/admin/page.tsx#L55) exports `AdminDashboard` as a named page export, which Next rejects.
- Lint has 30 errors. Fix blocking source errors and verify a clean production build, then complete authenticated browser journeys.

### 2. Matching can give false eligibility assurances

Reproduced using the real functions:

- A remote programme restricted to US residents was described as globally open for an Indian profile. [Country rules](src/lib/personalisation/countryRules.ts#L49) return early for remote/global cases and can bypass residency restrictions.
- An opportunity with a mandatory PhD requirement in `requirements.items`, but an undergraduate top-level tag, was marked `likely_eligible` by Scout. [Scout](src/lib/scout/engine.ts#L84) does not run the detailed mandatory-rule engine.
- Seven met mandatory rules plus three unknown mandatory rules resulted in `likely_eligible`. [Overall analysis](src/lib/eligibility/engine.ts#L343) uses a 70% readiness threshold instead of requiring all known mandatory conditions to pass and surfacing unresolved mandatory conditions.
- An empty requirements list yielded `possibly_eligible`, rather than an explicit unknown evidence state.
- [For You gap callback](src/app/(app)/for-you/page.tsx#L268) directly sets “requirements met,” clears gaps, and claims rules were rerun without performing that evaluation.
- [Opportunity detail](src/app/(app)/opportunities/[id]/page.tsx#L109) hardcodes possession of CV and transcript.
- Grouped AND/OR requirement evaluation exists but is not integrated into the main analysis. Profile-version changes are not consistently included in cached-analysis invalidation.

The local anonymous Scout API also described scholarship matches as likely eligible without a user profile. A “within the next seven days” query included a stored April 2027 deadline. These are correctness failures in the core promised value.

**Repair:** one authoritative rule evaluation shared by feeds, detail, compare, and alerts; separate eligibility, relevance, availability, and evidence quality. Unknown requirements/profile facts must remain unknown. A numeric fit/readiness score must not imply acceptance probability.

### 3. Source trust and freshness claims are unsupported

- None of the configured catalogue's 26 rows has a verification timestamp.
- [Verifier](src/opportunity-sources/verification/verifier.ts#L55) treats an unfamiliar non-aggregator domain as official without verifying organization ownership or fetching its requirements.
- [For You metadata](src/lib/recommendations/forYouEngine.ts#L206) labels curated sources official and other sources verified; `updated_at` or current time can become a displayed last-check date.
- [Freshness calculation](src/opportunity-sources/freshness.ts#L70) treats a deadline one hour in the past as “Closes Today” and applyable. The separate canonical status resolver correctly handles past timestamps, creating inconsistent views.
- Scout's API/recurring matching does not consistently filter closed/past opportunities. Some page/feed code does filter them, so this is not a claim that every screen displays every expired item.
- Domain HEAD checks are not verification of programme requirements, funding, deadlines, or changes. Refresh does not persist the claimed updates.
- Profile insight “affected opportunity” counts such as 11, 7, and 14 are hardcoded in [profile analysis](src/lib/ai/profileAnalysis.ts#L79). Admin freshness score 94 and sample zero-result queries are also hardcoded.

**Repair:** manually verify a small supported catalogue first; persist official evidence, programme edition, exact deadline/timezone, checked date, funding coverage/conditions and uncertainty. Remove unsupported verification/impact claims. Count only operations actually completed.

### 4. Import and admin saving are unreliable

- [Candidate normalization](src/opportunity-sources/normalize.ts#L64) and [admin creation](src/lib/admin/store.ts#L175) generate `opp-…` string IDs for a UUID database column.
- AI Bridge sends `source_type`, which is absent from the configured schema and not added by the migrations. Save cannot reliably succeed with the generated payload.
- Admin mutations await Supabase calls without checking returned errors. They can report success while storing nothing. Archiving writes `status: archived` against an older status constraint.
- Source ingestion called with a nonexistent source reported **14 insertions**, even though it scanned no sources and performed no database writes. [Pipeline](src/opportunity-sources/ingestion/engine.ts) processes a static seed catalogue and increments counters.
- General user imports default to globally published rows rather than reviewed drafts. Saving an imported opportunity can reset an existing application's stage to saved.
- Deduplication by exact URL can conflate different annual editions.
- Admin settings/source/quality state is substantially in memory; configured switches and ranking weights are not consistently consulted by the actual engines.

**Repair:** use the database UUID boundary, validate allowed fields server-side, check every write, preserve application state, retain edition identity, and require review before publication. A basic administrator import form is sufficient initially; automated crawling can wait.

### 5. URL import has a security defect

Actual [URL-fetch code](src/lib/ingestion/fetch.ts#L87), exercised with mocked fetch, accepted `192.168.1.1` and an IPv6 private address as fetch targets. Signed IPv4 arithmetic and incomplete IPv6 handling undermine the private-address guard. Automatic redirect following also bypasses explicit target revalidation. DNS resolution is not checked against private destinations.

Additionally, response-body size is checked after reading the body, and timeout coverage does not reliably span that body read.

**Repair:** constrain public HTTP(S) destinations, resolve/check destination addresses and every redirect, and enforce streaming size/time limits. Until repaired, restrict URL fetching to reviewed official domains or disable arbitrary URL extraction. No private-network exploitation was attempted.

### 6. Background alerts cannot deliver the promised service

- [Server Supabase helper](src/lib/supabase/server.ts#L4) uses the anon key plus browser cookies. Cron bearer authentication does not supply a Supabase user session or service identity. The deadline/Scout jobs therefore cannot scan private user records reliably, and notification writes use the same unsuitable client.
- [Deadline cron](src/app/api/cron/deadlines/route.ts#L50) passes `null` for user email. Its email branch cannot run.
- Scout cron only creates in-app notifications; it does not dispatch email or discover new external opportunities.
- Saved-search API exists but has no connected UI. Notification preferences/frequency/timezone/quiet hours are not connected to a user-facing service.
- Weekly digest, unsubscribe, delivery logging/retry, and reliable missed-run handling are absent. Creating a notification before email success can prevent retries.
- [Push dispatcher](src/lib/notifications/webpush.ts#L88) explicitly reports that delivery is not implemented.
- Scheduler configuration exists in `vercel.json`; actual hosted execution was not verified.

**Repair:** a server-only privileged database client for scoped background jobs, recipient lookup, one reliable weekly digest, preferences/unsubscribe, delivered/failed logging, deduplication and retry. Start with email; web push can wait.

### 7. Razorpay integration does not establish working paid access

- Code currently sells a **one-time ₹499/30-day pass**, not a $9/month recurring subscription. Local keys/checkout flags are absent; hosted values were not inspected.
- [Grant/revoke access](src/lib/payments/entitlements.ts#L128) uses the cookie/anon client. Migration policies restrict payment writes to the service role. Returned database errors are ignored, and [verification](src/app/api/payments/verify/route.ts#L81) can return success without a persisted pass.
- Verification does not bind the supplied order to the current user using a trusted stored/provider order record. Capture verification failure is swallowed; currency/product validation is incomplete.
- Event/payment idempotency is missing. Pass replacement is nontransactional; replay can reset access duration. Refund logic revokes all active passes for a user rather than the specific payment entitlement.
- `canUseAnalysis`, `canUseDraft`, and `recordUsage` exist but are not called by the corresponding AI routes. Dashboard allowances do not enforce a paid boundary; recorded usage is zero.
- Client/public environment configuration can disagree with server price/currency/checkout settings.

**Repair:** trusted order ownership, server-side amount/currency/capture checks, durable idempotent payment records, correct entitlement persistence, explicit error handling, and server enforcement of the chosen paid features. Then verify a sandbox purchase, webhook retry, refund/access change, and failed payment. Decide pass versus recurring subscription before adding renewal-specific machinery. International account readiness remains unknown.

### 8. Database/schema and authorization need coordinated repair

The live configured schema is behind the latest migration: missing profile `role`, `is_suspended`, `work_authorizations`; missing opportunity fields such as `eligible_countries`, `benefits`, `visa_requirements`, `publication_status`, recurring/featured/quality fields; and four admin tables. Queries requesting these columns returned explicit missing-column errors.

Do not blindly apply the latest migration:

- [Admin authorization](src/lib/api-auth.ts#L105) trusts `profiles.role`, while own-profile RLS permits updates and the older [promotion trigger](supabase/migrations/20240301000000_admin_hardening.sql#L81) protects only `is_admin` on UPDATE. Adding the writable role column creates a source-level privilege-escalation path.
- Profile INSERT is not covered by that promotion trigger.
- [Opportunity INSERT policy](supabase/migrations/20240913000000_canonical_opportunities.sql#L70) permits `created_by IS NULL`; review whether it permits unauthorized publication through direct database access.
- General authenticated routes do not enforce suspension. Client metadata/default owner labels are not authoritative authorization.
- Missing Supabase configuration can automatically enable demo authentication/admin bypasses; production should fail closed.

These are source/migration findings. The audit did not exploit them or prove the exact deployed policy state. Validate role policies, insert/update protections, public publication permissions, and privileged-client scope in an isolated environment before migrating production.

### 9. Existing user work can be lost or falsely reported saved

- [For You unsave](src/app/(app)/for-you/page.tsx#L233) and [Scout unsave](src/app/(app)/scout/page.tsx#L103) delete the application record. Foreign-key cascades can remove tasks, answers, and collection references, including prepared work.
- Many workspace/profile mutations use optimistic state without inspecting write errors or showing a recovery action.
- Year-only graduation values can fail when written directly to DATE fields, bypassing the profile API's normalization.

**Repair:** separate removing a bookmark from deleting application work; confirm destructive actions; preserve stage; centralize profile validation and surface failed writes with retry.

### 10. Privacy and account controls do not match their claims

- [Settings deletion](src/app/(app)/settings/page.tsx#L52) deletes only a profile row and signs out. It does not remove the Supabase Auth user, ignores database errors, and does not reliably remove every user-owned dataset/cache. Admin “delete” is suspension.
- [Settings export](src/app/(app)/settings/page.tsx#L29) calls itself full but omits tasks, answers, collections, insights, saved searches, feedback, notifications/preferences, and payment records.
- [Privacy page](src/app/(legal)/privacy/page.tsx#L43) says application answers are not stored server-side, while the application stores them in Supabase.
- AI-provider/profile-processing descriptions do not accurately cover the configured custom provider and automated profile analysis. Support refers to a missing password-reset flow; support/legal contacts remain placeholders. “Last updated” changes on every render rather than documenting a real revision.

**Repair:** implement authenticated account deletion and complete data export/cache clearing, correct factual policy text, provide actual contacts and reset/reporting flows. This is a source-consistency finding, not a legal compliance determination.

## What to add or finish for the narrow launch

| Requirement | Minimum useful implementation |
|---|---|
| Supported audience/coverage | Choose one applicant region and research-internship/fellowship coverage from a manually verified dataset. Show the coverage boundary explicitly. |
| Trustworthy opportunity records | Official source excerpts, edition, checked date, deadline/timezone, eligibility conditions, funding/remaining costs/unknowns, documents and next action. |
| Accurate matching | Shared rules with clear eligible/potential/ineligible/unknown states; mandatory unknowns and unsupported criteria remain visible. |
| Profile review | Fix the existing onboarding/autosave/import flow. A manual form plus pasted résumé is sufficient for the first release. File upload and conversation are optional. |
| Monitoring | Detect expiry and changes on supported pages; persist results. Manual review can handle ambiguous changes initially. |
| Email service | Weekly relevant matches and saved-opportunity deadline reminders, consent/preferences/unsubscribe, delivery failure handling. |
| Basic saved list | Preserve user work, maintain one user/opportunity identity, open official application link. |
| Paid access | Choose a real paid benefit and pricing experiment; repair checkout/webhooks/entitlements and test sandbox journeys before charging. |
| User controls | Password reset, complete export/deletion, incorrect-listing reporting, functioning support. |
| Distribution measurement | Acquisition source → completed profile → useful match saved → payment → renewal; recommendation errors and email delivery/engagement. Use actual events, no sample statistics. |
| Operational visibility | Error/failed-write/job/delivery logs and a small curation view with real counts. |
| Public acquisition pages | Useful shareable/indexable programme or shortlist pages with official-source provenance. Existing app detail pages require login; no complete programme SEO publishing flow exists. |

No recurring payment demand, audience willingness to pay, acquisition channel performance, or international settlement capability has been established by this code/database audit.

## Not worth expanding for the initial launch

These recommendations concern the current scope and evidence, not permanent bans:

- **Automatic application submission and an autofill extension:** outside the agreed scope; keep the official-provider handoff.
- **iOS:** defer until revenue/customer use justifies it.
- **Broad multi-category/global coverage:** start with the selected research/fellowship dataset and applicant region. Avoid promising coverage the database cannot supply.
- **Application workbench, AI drafts, evidence portfolios, elaborate task planning, collections, comparison and AI Bridge expansion:** useful code exists, but these are not necessary to deliver relevant matches by email. Preserve existing data and freeze or hide unfinished surfaces.
- **General Ask assistant and complex profile-strength scoring:** avoid guidance based on hardcoded opportunity counts or claims of verified achievements.
- **Streaks, daily rewards, elaborate referrals and gamification:** wait for evidence that people receive useful recommendations and renew. Application progress and relevant email are enough initially.
- **Web push and multiple alert channels:** finish reliable email first.
- **Configurable ranking platforms, rich admin dashboards, multi-role management, and broad crawler infrastructure:** simple curation, truthful counts and safe ownership policies are enough at this stage.
- **External AI import as a required user journey:** adds steps and schema/error risk; keep it optional if retained.
- **Guaranteed match quotas, acceptance probabilities and fabricated urgency:** do not offer these; coverage and evaluation do not support them.
- **Renaming/rebranding work before core reliability:** final name remains unresolved, but it should not delay the functional service.

## Suggested release order

1. **Stabilize:** resolve build errors; repair authorization/URL fetching; reconcile schema safely; check all writes and preserve user data.
2. **Make recommendations trustworthy:** manually verify supported listings; connect one consistent eligibility/availability evaluation across screens and jobs; remove unsupported verification/count claims.
3. **Finish the promised loop:** reviewed editable profile → useful match → save → delivered digest/deadline email → official application link. Include unsubscribe, reporting, reset and deletion.
4. **Enable the pricing experiment:** reliable sandbox checkout/entitlement/refund/retry flow and server-enforced paid value; verify payment account capabilities before promising international billing.
5. **Launch and measure:** real programme-led content/community distribution, ten unrelated paying customers as an experiment, recommendation quality and renewals measured from real events.

Release acceptance should require a clean build and completed authenticated journeys using the actual database: onboarding/edit persists; mandatory unknowns remain unknown; expired programmes cannot trigger relevant-match alerts; saved work survives unsave; email is received and can be disabled; payment grants exactly one correct entitlement; retry/refund behavior is correct; deletion/export match their claims. Existing green unit tests alone do not meet that bar.

**Summary:** real accounts, profiles, catalogue rows and saved applications exist. The broader workspace UI is largely implemented. Accurate evidence-backed matching, persistent curation, reliable email, safe paid access, and trustworthy user controls still require repair. Complete that narrow service before expanding the product.
