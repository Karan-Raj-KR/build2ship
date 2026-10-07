# Performance Audit

## Measured in this run

- `next build` completes successfully with Turbopack and produces 43 routes.
- `npx tsc --noEmit` passes.
- Final test suite passes after the experience work: 111 tests across 13 files.

## Findings

1. Several primary routes are client components and fetch after mount. That explains load shifts more than CSS does.
2. Scout and For You make one explicit request each and now keep their result layout compact; closed results are filtered before rendering.
3. Heavy secondary UI is not preloaded by the shell. The shell has no new dependency or global provider.
4. Existing route data boundaries and backend calls were preserved. No database, eligibility, payment, Scout, or application behavior was replaced.

## Changes made

- Consolidated tokens and shared primitives in one global stylesheet instead of adding a UI library.
- Kept animation to opacity, color, box-shadow, and transform; respects reduced motion.
- Replaced the mobile four-column board with a stage list, avoiding unusable horizontal layout.
- Added stable skeleton primitive and retained route loaders.

## Measurement boundary

No real-user CWV or Lighthouse run was available in this environment, so LCP, INP, and CLS are not claimed as achieved. The next measurable step is a production-start Lighthouse run on mobile and desktop, followed by moving high-value route data into server-rendered boundaries where authentication permits it.
