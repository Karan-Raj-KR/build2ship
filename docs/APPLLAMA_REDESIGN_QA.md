# Appllama redesign handoff — 2 October 2026

Scope confirmed by user: discovery workspace, shared navigation, matching landing page.

Implemented: paper/graphite/terracotta palette, self-hosted variable Manrope, grouped white navigation rail, clearer opportunity identity and metadata, less repeated discovery setup guidance, editorial landing sections, accessible example selectors/bookmarks, and native programme detail dialogs. Auth, recommendation evaluation, persistence, billing, and provider submission flows are unchanged.

Guidance read from https://github.com/Appllama/appllama-skills:
- `skills/appllama-app-design-skill/SKILL.md`: hierarchy, one accent, semantic controls, touch targets, complete states, restrained motion.
- `skills/appllama-usage/SKILL.md` and its improve-a-screen/research references. Appllama MCP tools were not connected, so no library screen research or MCP benchmark comparison is claimed. Native Expo-specific recommendations were adapted to the existing Next.js web app.
- Impeccable context, new-work, and craft-floor; Ponytail for reuse and removing redundant markup.

## Verified

- `npx tsc --noEmit`
- `npx next build --webpack`
- `npm test`: 210 tests across 28 files, including example provenance, semantic controls, native dialog markup, and existing navigation checks.
- Changed-file ESLint and `git diff --check`.
- Token contrast checked: body/canvas 13.8:1, secondary/canvas 4.95:1, button 6.03:1, selected text 4.97:1.
- Static Impeccable detector: no findings. This is a source check, not browser QA.
- Landing HTTP response: 200 at http://localhost:3001.

## Visual and interaction checks still required

Browser runtime returned `No browser is available`; documented troubleshooting returned an empty browser list. No screenshots, authenticated browser flows, mobile QA, or motion measurements were obtained. The implementation is code-validated, visually unverified.

At 1440×900, 1280×800, 390×844, and 320×700:
- Confirm the discovery heading, search, and opportunity cards are easy to reach; long provider names, funding descriptions, and titles wrap cleanly.
- Confirm two desktop opportunity columns, the profile/deadline margin, one mobile card column, and bottom safe-area clearance.
- With a real signed-in account, filter/search, save/unsave, reload, inspect details, and start/continue preparation. Confirm requests persist through existing APIs and failures remain visible.
- Open both discovery and landing detail dialogs with the keyboard; check initial focus, containment, Escape dismissal, and focus return.
- Switch all three landing example backgrounds, bookmark/unbookmark, filter the example catalogue, and clear a no-results search. Confirm examples never appear as verified live recommendations.
- Check keyboard focus, text selection, 200% text zoom, and reduced-motion preferences. No screenshot or 60fps claim is implied by passing source tests.
- Smoke-check profile, saved, workspace, login/signup, onboarding, notifications, and billing after shared token changes.
- Explicit dark theme remains outside this visual verification pass; legacy dark-theme tokens in globals.css have not been redesigned.

## Animation follow-up

Added CSS-based selector continuity, short reveals for new results and changed preview content, pending save feedback, preparation busy labels, profile progress transitions, status acknowledgements, and focused dialog entrances. No animation dependency added. Existing result keys and focused preview controls are retained. All 210 tests, TypeScript, changed-file lint and production build pass after this update. Static detector returned no primary failures; it listed existing advisory typography differences against the narrow documented type ramp. Browser validation remains unavailable.

When browser access is available, test rapid background switches, repeated filters, keyboard focus while results change, API pending/error/success, opening/closing details, and reduced motion. Confirm clicks never wait for an entrance and no ongoing animation remains when save requests finish.
