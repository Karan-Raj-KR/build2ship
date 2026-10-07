# Design System V2

## Intent

OpportunityOS is a calm, premium dark workspace. Violet identifies the primary action; cyan is reserved for Scout and intelligence moments. Amber, green, and red only communicate uncertainty, completion, and danger.

## Tokens

Tokens live in `src/app/globals.css` and are the source of truth for canvas, surfaces, text, borders, semantic states, radii, shadows, motion, and layers.

| Group | Tokens |
| --- | --- |
| Surfaces | `--canvas`, `--workspace`, `--surface-raised`, `--surface-interactive`, `--surface-overlay` |
| Content | `--ink`, `--muted`, `--subtle` |
| States | `--violet`, `--cyan`, `--success`, `--warning`, `--danger` |
| Foundation | `--radius-*`, `--shadow-*`, `--motion-*`, `--ease-out`, `--layer-*` |

## Shared primitives

- `app-shell`, `app-content`, `page-frame`, `page-header`: responsive application frame.
- `card`, `soft-panel`: elevated and quieter content surfaces.
- `btn`: primary, secondary, ghost, danger, and size variants; 44px touch target by default.
- `input`, `label`, `badge`, `tag`, `alert`, `skeleton`: form and feedback primitives.
- `OpportunityCard`: `compact`, `standard`, `feed`, and `comparison` variants. It keeps the decision surface to title, organization, type, deadline, fit reasons, benefit, and action.

## Typography and motion

`page-title`, `section-title`, `panel-title`, and `eyebrow` provide the application scale. Titles use `clamp()` rather than viewport-specific constants. Interactive motion is 150–200ms and uses transforms/colors only. Reduced motion disables non-essential animation.

## Shell

The desktop rail begins compact and can expand. Tablet uses the compact rail. Mobile removes it completely, shows a safe-area-aware bottom bar, and moves secondary routes into a real More sheet.

## Compatibility

Legacy page utilities are mapped into the V2 semantic system inside `.app-shell`. This is deliberately transitional: new UI should use the primitives above rather than introducing another set of page colors.
