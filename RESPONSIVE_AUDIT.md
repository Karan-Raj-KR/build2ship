# Responsive Audit

## Layout contract

- The app shell uses `100dvh`, `min-width: 0`, capped fluid content, and safe-area padding.
- Desktop navigation is a compact/expandable rail at `>=768px`; mobile has no sidebar.
- Mobile application management uses stage tabs and a vertical card list. The four-column board starts at `768px`; it becomes four columns at `1280px`.
- Long page actions wrap through `action-row`; buttons have a 44px default minimum height.
- Overlays use viewport insets and constrained sheet heights. Native inputs and selects remain keyboard accessible.

## Required viewport matrix

| Width | Expected behavior | Static inspection |
| --- | --- | --- |
| 320, 360, 375, 390, 430 | Bottom navigation; More sheet; vertical cards; no desktop rail | CSS reviewed |
| 768, 820 | Compact rail; two-column application board | CSS reviewed |
| 1024 | Compact rail; two-column board and fluid content | CSS reviewed |
| 1280, 1440, 1728 | Expandable rail; four-column board; content capped at 104rem | CSS reviewed |

## Runtime verification

HTTP route serving and the production compilation are verified. Native browser screenshot automation was unavailable because the computer-use surface is not enabled in this run, so the matrix above has not been visually signed off. Before release, run the visual smoke suite (or manual checks) at every listed width and inspect bottom navigation clearance, dialog bounds, and board drag targets.

## Known visual follow-up

The legacy detail/workbench/profile forms still use transitional Tailwind utility classes, intentionally remapped by the V2 compatibility layer. They need screenshot-led component extraction in a follow-up rather than another speculative CSS rewrite.
