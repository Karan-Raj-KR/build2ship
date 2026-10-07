# Eligent UX redesign — 2026-10-01

User priorities: discover relevant opportunities and take the next step; mature and focused.

Implemented: forest/lime navigation, mist-grey working surfaces, genuine local variable typography, compact discovery and filters, demo disclosures, context-appropriate eligibility states, mobile navigation/tools sheet, native details and notifications, persistent preparation, save pulse and nonmodal progress feedback. Existing authentication, providers, eligibility, payment and submission boundaries remain enforced.

Verification:
- Production webpack build and TypeScript pass.
- 60 targeted navigation, notification and production-contract tests pass.
- `scripts/verify-redesign.mjs` passes real local Supabase login → discover → filters → save → saved → details → prepare → persisted checkbox.
- Mobile navigation has five items. Tools dialog supports Escape and restores focus. Notifications and reduced motion checked. Saving never opens a modal.
- Discovery checked at 320, 390, 768, 1024 and 1440px without horizontal overflow. First listing title fits above mobile navigation at 390×844.
- Desktop/mobile captures cover landing, onboarding, discovery, saved, detail, preparation, journey, profile, applications, Scout, Today, For You, settings and billing in `.impeccable/review/`.
- Finish reviewer scored the six requested corrections and the final mobile deadline/filter overlap resolved; disposition `ship` applies to those scored fixes.
- QA uses temporary accounts on isolated local Supabase; accounts and private records are deleted after each run. The isolated HTTP preview omits HTTPS-upgrade headers only in a temporary clone; production configuration is preserved.

Known limits:
- The broader test suite contains existing ranking, eligibility, parser failures and an unresolved `server-only` import in the merge suite. Full results are in `.impeccable/review/tests.json`.
- The older `scripts/verify-adventure.mjs` assumes its seeded opportunity ranks first; an existing local catalogue invalidates that assumption. The new browser check verifies persisted behavior without that ranking assumption.
- No hosted deployment or payment transaction was performed.
- Impeccable reports the existing PRODUCT.md uses an older schema. Its `init` workflow can refresh that record separately.

Design system: DESIGN.md and `.impeccable/design.json`. Visual review: `.impeccable/review/finish-review.md`.

Profile autosave follow-up:
- Removed the 500ms text debounce and tag commit requirement. All 26 editable profile fields save on change; active requests merge subsequent edits and preserve ordering.
- Fixed tag blur layout shifts that swallowed checkbox clicks. Save status now reports success only after all pending changes persist; failed edits remain retryable and retry on reconnect.
- Profile editing no longer waits for evidence/insights loading. Unsaved changes trigger the browser's native reload/close protection.
- `tests/profile-autosave.test.ts` passes immediate-send, coalescing, ordering and failed-save recovery checks. `scripts/verify-profile-autosave.mjs` verifies all 26 fields against local Supabase, tag typing without blur, rapid typing, clearing, retry and reload persistence. TypeScript, targeted lint (one existing warning) and production build pass.
