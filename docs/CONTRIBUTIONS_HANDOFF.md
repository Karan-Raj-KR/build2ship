# Elara contribution integration — 7 October 2026

Implemented `/contributions`, reachable as **Build your open source experience**, the second item in the main sidebar, and from My profile.

The page reuses profile skills/languages, interests, experience summary, discovery goal and target roles. Only missing weekly time and contribution preference are requested. Preferences are remembered with saved plans; existing profile time takes precedence. Repository ranking reuses the existing deterministic opportunity ranker, adds explained interest/time points, and labels catalogue topics and exploration-time estimates as curator judgments.

## Runtime and authentication status

The user subsequently requested Supabase for the entire runtime. Supabase Auth, browser/server database adapters, account/admin/notification identity queries and release configuration are now active. Contribution plans are signed using the existing server-only Supabase secret, with no Neon authentication dependency.

The earlier Neon restoration followed the original hackathon instructions. Its live QA results below are historical evidence for the contribution flow, not verification of the current Supabase deployment.

`SUPABASE_DB_URL` remains missing from `.env.local`. The configured Supabase REST profile-table read returned HTTP 404; the schema still needs inspection and verification. No schema migration or existing-user/data transfer has been completed. No push or deployment was performed.

## Data and AI behavior

- Three bounded curated repositories: ESLint, scikit-learn and Zulip. One public GitHub issues request per chosen repository checks at most 30 recently updated records; at most six candidates are returned.
- Pull requests, closed issues, assigned issues and records lacking assignment-state evidence are excluded. Beginner labels and contribution preference influence ordering; scope is unverified.
- Issue claim comments, linked pull requests and actual maintainer availability are not checked. Every candidate says **Confirm with maintainer**. Unassigned never means available.
- README and root `CONTRIBUTING.md` excerpts are fetched for the selected issue; a genuine missing contribution guide is distinguished from read errors. Excerpts are bounded and links/timestamps are displayed. External guide links are not crawled.
- The existing OpenAI-compatible AI adapter and per-account quota reservation generate the fit explanation, repository context, checklist and one understanding question. The prompt treats profile and fetched content as untrusted data, restricts claims to supplied sources, and prohibits invented commands, files, policies or test results. Output still needs human review.
- GitHub rate-limit/fetch errors and unavailable AI states are explicit. There are no sample fixtures represented as live results, static AI substitutes, worker agents or GitHub writes.
- A generated plan is signed for its authenticated account and expires for saving after 30 minutes. Already saved plans do not expire.
- One SQL statement saves a private draft opportunity, an existing application record and checklist tasks. Original plan/progress is preserved on duplicate saves. Plans are also readable in workspace notes; contribution checkboxes and saved/preparing stages are managed on the contribution page.
- Saved entries are labelled snapshots and link to the current issue. The page shows the latest 30 saved contribution records.

## Verification

- Production build: `npm run build -- --webpack` passed, including Next.js TypeScript validation.
- Standalone `npx tsc --noEmit` passed.
- Focused ESLint checks for the new page, API, helpers and tests passed.
- Full existing suite plus contribution tests: 34 files, 239 tests passed. Focused tests were rerun after final filtering/save changes.
- Live authenticated HTTP flow passed against the guarded existing isolated Neon QA configuration, using its existing disposable account: login → profile → deterministic match → real GitHub issues → real configured AI plan → workspace save → reload → stage/checkbox update → reload → duplicate save preserving progress.
- The live check initially hit anonymous GitHub rate limiting. QA then used the already authenticated GitHub CLI token only in the local server process for bounded public reads; no token was written to project files.
- Subsequent attempts to generate another plan hit the existing AI provider rate limit. The unavailable state returned no generated plan or save success; earlier saved progress remained intact. AI capacity must be available for a fresh generation during the demo.
- Browser check confirmed that `/contributions` redirects an unsigned user to login. Signed-in desktop/mobile visual QA has not been completed; authenticated flow verification was through HTTP APIs.
- No push, commit or deployment was performed. Production behavior of this integration remains unverified.

## Environment names

### Supabase setup audit (October 7)

- Live Auth settings return HTTP 200; the configured service key matches the configured project. Profiles return HTTP 404 / `PGRST205`: `public.profiles` is absent from the schema cache.
- Initially `SUPABASE_DB_URL` was absent and the current CLI account did not list the configured project. The supplied connection now identifies the same project as the API credentials; it is stored only in ignored `.env.local`.
- Added `scripts/setup-supabase.mjs`: checks matching project identity and empty public schema, installs migrations atomically, records migration history, and reloads the Data API schema cache.
- Added a migration blocking client profile deletion, permitting trusted database-owner administration, backfilling profiles for preexisting Supabase Auth accounts, and marking historical example catalogue seeds as demo data. Admin authorization now fails closed if profile lookup fails.
- All 14 migrations were installed atomically on the confirmed empty Supabase public schema. Data API profiles now return HTTP 200. Live SQL checks passed for RLS, profile deletion protection, AI usage mutation/function protection and profile backfill.
- Live Supabase QA passed temporary confirmed-account password login, profile creation/save/refresh, public GitHub issue fetching, authenticated workspace save and server task update after refresh. Temporary accounts and private fixtures were cleaned up. Workspace persistence used an explicitly identified fixture, not invented AI output; email confirmation delivery and signed-in browser QA remain untested.
- The real AI provider returned HTTP 429, blocking fresh plan generation and the complete generated-plan flow on Supabase. Fixed shared AI error handling so rate limits are handled before JSON-format fallback; added a regression test.
- Latest production build and TypeScript validation passed. Full suite passed 241 tests across 34 files. Script syntax and diff checks passed.
- The 26 published Neon catalogue records are now imported into Supabase and verified through ordinary authenticated Data API access. Accounts and saved data remain unmigrated. All 26 records lack a verification timestamp, and four deadlines have passed; the import does not establish current availability. Notification sender configuration and fresh catalogue verification remain release gaps. Local `NEXT_PUBLIC_APP_URL` is set to localhost; deployment environments must use their actual origin. No push or deployment occurred.

Current runtime: `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `NEXT_PUBLIC_APP_URL`.

Existing working AI provider: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.

Optional public GitHub read capacity: `GITHUB_TOKEN`. Configure it server-side for a reliable demo on an IP that has exhausted anonymous reads.

## Reference material

Read as reference data, without running agents: [README](https://github.com/havinash-007/moreee/blob/main/README.md), [project context](https://github.com/havinash-007/moreee/blob/main/docs/PROJECT_CONTEXT.md), [matcher](https://github.com/havinash-007/moreee/blob/main/backend/matcher.py), [GitHub adapter](https://github.com/havinash-007/moreee/blob/main/backend/github.py), [agent prompts](https://github.com/havinash-007/moreee/blob/main/backend/agents.py), and [curated organizations](https://github.com/havinash-007/moreee/blob/main/mentor/orgs.json).
