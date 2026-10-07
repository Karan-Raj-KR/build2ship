# Workspace performance and guidance — 2026-10-02

Ordinary account reads now check the authoritative identity and profile without rewriting them. Recommendation, Scout, Ask, and journey context use scoped SQL aggregates instead of repeated Data API round trips. Profile and checklist writes persist immediately; saves preserve active application stages. Vercel functions run in Singapore beside the existing Neon database.

Navigation renders while data loads. Shared page skeletons replace blocking spinners. Onboarding answers save immediately and navigation waits for pending writes. Discover and For You explain the next step: add background, find and save a possibility, prepare with official requirements. Scout/Ask are primary destinations, XP is concentrated in My journey, and For You uses a responsive laptop grid with reasons, funding, deadlines, eligibility gaps, and source status.

Scout parses locally, recognizes onboarding interest labels, distinguishes undergraduate scholarships from graduate fellowships, really saves queries, and opens preparation using the application ID. Ask uses a currently available free model with an eight-second provider budget; provider failure returns explicitly labelled profile/catalogue guidance rather than an error or fabricated AI response.

## Deployed QA measurements

Same isolated QA branch, same identity, same request bodies, measured from this workstation. One request each; these are observations, not p95 measurements or cold-start guarantees.

| Request | Before | After |
| --- | ---: | ---: |
| Profile read | 2,548 ms | 206 ms |
| Profile save | 2,222 ms | 383 ms |
| For You, 10 items | 3,860 ms | 817 ms |
| Scout, remote AI | 3,051 ms | 240 ms |

Original Ask failed with HTTP 500 because its free model had been withdrawn. The updated route returned HTTP 200 with useful guidance. The selected faster free model also passed direct requests with reported cost zero. Free-provider capacity can still vary.

## Verification

- TypeScript, production build, ESLint (zero errors; existing warnings remain), and 209 regression tests.
- Isolated QA integration: verified-email boundary, legacy account recovery, repeat login, immediate profile persistence, role and XP forgery rejection, cross-user isolation, scoped journey data, save/prepare and stage preservation, checklist ownership, persisted saved searches, malformed search/history rejection, export/delete, disabled checkout.
- Browser at 1280 × 720: main navigation, initial guidance, two-column For You, profile edits persisting through reload, real Scout results, saved query, preparation navigation and checklist update. No horizontal overflow observed. Mobile breakpoints are implemented; mobile browser inspection remains unverified.

## Remaining limits

Discovery and Scout search the existing curated catalogue, not a live crawl of the web. Unverified source facts and unknown eligibility stay labelled; expired listings are excluded. A small or incomplete catalogue still limits coverage. No new crawler, invented opportunities, schema changes, paid AI, or payment activation was introduced. Neon scale-to-zero, first requests, network conditions, and free AI limits can still add latency.
