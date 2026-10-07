# Opportunity Workspace redesign

## 1. Current implementation findings

- Next.js 16.3 App Router, React 19, Tailwind v4, Supabase, and Lucide are already in use.
- The existing source of truth is sound: `applications` has a unique `(user_id, opportunity_id)` constraint, opportunity status is resolved in `src/lib/opportunityStatus.ts`, and eligibility remains separate from relevance.
- Existing useful flows: ranked discovery, safe imports, eligibility analysis, application tasks and answers, profile evidence, and Markdown/JSON export.
- Current gaps: Home is a static dashboard; discover navigation loses context; application tracking is list-only; tasks and stages have no ordering/pinning; collections and a user goal do not persist.
- The repository contains no `.git` directory, so no worktree status or checkpoint could be inspected. Existing files are preserved in place.

## 2. Information architecture

- **Today** (`/home`, with `/today` compatibility): attention, next tasks, deadlines, and actual progress.
- **Discover** (`/discover`): filterable results, in-place preview, save/prepare actions, and comparison selection.
- **Applications** (`/workspace`): board and accessible compact list; old workspace URLs remain valid.
- **My Profile** (`/profile`): profile, confirmed evidence, and controlled export.
- **Library** (`/library`): collections of existing saved opportunities, without a second opportunity store.
- Import, billing, account, and admin remain quieter utility routes.

## 3. Visual system

- Warm neutral canvas, pale side surface, white workspace panels, ink typography, cobalt actions, and semantic green/amber/red states only.
- Shared CSS tokens cover color, spacing, radii, elevation, and motion. Inter remains the single font system with native fallbacks.
- Interaction feedback is compact: inline errors, toasts with Undo where mutation state is held locally, and native/semantic controls for keyboard and mobile access.

## 4. Interaction specifications

- Saving an opportunity reuses the existing application identity; it never creates a second application for the same opportunity.
- Stage changes to Submitted and Results use explicit confirmations; Preparing does not. The board always has a keyboard “Move to…” alternative.
- Task completion changes Today and application progress from real task state. Source-required tasks remain distinguishable from personal tasks.
- Ordering is explicit and owner-scoped. Optimistic UI is only used where the old state is retained for rollback.
- Discover preview retains filters and scroll position. It shows the existing status resolver output, eligibility boundaries, and source link.

## 5. Implementation checklist

- [x] Inspect product, finalization notes, existing routes, models, components, and status resolver.
- [x] Run the current application.
- [x] Establish shared tokens and rename navigation destinations without removing old URLs.
- [x] Add owner-scoped migration for ordering, task pinning, collections, weekly focus, and deduplicated milestone storage.
- [x] Build Today, Discover preview/save, and the application board vertical slice.
- [x] Add Library collections, task pinning, answer evidence attachment, and actual task-completion progress.
- [x] Verify TypeScript, lint, existing tests, and a webpack production build.

## 6. Verification results and remaining limitations

- `npm run dev` starts successfully on `http://localhost:3000`.
- `npx tsc --noEmit` passes; `npm run lint` passes with 11 existing warnings; `npm run test` passes (84 tests); `npx next build --webpack` passes (31 routes).
- The default `npm run build` remains blocked by this sandbox's Turbopack worker-port restriction. The webpack build exposed an existing Edge Runtime warning from the Supabase middleware dependency trace but completed successfully.
- Browser automation is not available in this environment, so desktop/mobile screenshots and physical drag inspection cannot yet be claimed. A manual browser checklist will be maintained here before handoff.
- `@dnd-kit` installation was attempted but did not complete in this restricted environment. The board uses native drag plus keyboard/menu movement. Replace it with the library only after installing and browser-testing it; do not claim its behavior is tested yet.
- The optional celebration/milestone UI and global command menu were deliberately not added. Milestone storage is migrated and deduplicated, but no reward is presented until its behavior can be browser-tested.

## Manual browser checklist (on wake)

1. Start `npm run dev`, open `/demo`, then enter the workspace.
2. At wide desktop, laptop width, and 390px mobile: save an opportunity from Discover, prepare it, complete a task, and verify Today updates.
3. In Applications: move a card to Submitted, cancel, then confirm with a date; reload and confirm order/stage remain.
4. Use “Move to…” by keyboard, test the empty column, collection deletion, and answer evidence attachment.
5. Enable reduced motion and repeat one meaningful completion. Capture screenshots of Today, Discover preview, board, and mobile navigation.
