---
name: Elara
description: A warm editorial opportunity workspace and matching public landing page.
colors:
  primary: "#a7432c"
  primary-hover: "#873620"
  primary-depth: "#692b1b"
  rail: "#292724"
  rail-muted: "#ded6cc"
  lime: "#f3e7df"
  lime-ink: "#692b1b"
  canvas: "#f8f6f2"
  surface-main: "#ffffff"
  surface-subtle: "#f1ede6"
  surface-interactive: "#f3e7df"
  surface-selected: "#f3e7df"
  border-selected: "#c9a895"
  ink: "#292724"
  muted: "#706a62"
  subtle: "#706a62"
  line: "#e6e1d9"
  line-strong: "#cfc5b9"
  success-text: "#3e5935"
  success-bg: "#eef3e8"
  success-border: "#cad8be"
  warning-text: "#8a4306"
  warning-bg: "#fef7e6"
  eligibility-unknown-text: "#79561d"
  eligibility-unknown-bg: "#faf3e4"
  danger-text: "#9e1b38"
  danger-bg: "#fff0f4"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 62px)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 3vw, 42px)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.025em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-.025em"
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 750
    letterSpacing: ".06em"
  button:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: ".875rem"
    fontWeight: 750
    lineHeight: 1.35
  input:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
rounded:
  status: "8px"
  chip: "9px"
  control: "10px"
  sm: "12px"
  md: "14px"
  lg: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  card: "20px"
  lg: "24px"
  xl: "28px"
  page: "32px"
  desktop-inline: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-main}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-main}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  search:
    backgroundColor: "{colors.surface-main}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  navigation-active:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  filter-chip:
    backgroundColor: "{colors.surface-main}"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    padding: "8px 13px"
  filter-chip-selected:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.primary}"
  opportunity-card:
    backgroundColor: "{colors.surface-main}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  bookmark-saved:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    size: "44px"
  progress-toast:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.surface-main}"
    rounded: "{rounded.sm}"
    padding: "12px 12px 12px 18px"
  dialog:
    backgroundColor: "{colors.surface-main}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "28px"
    width: "min(680px, calc(100% - 32px))"
---
# Design System: Elara

## Overview

**Creative North Star: "The Opportunity Editorial"**

Warm paper, graphite text and terracotta accents give discovery the feel of a considered editorial workspace. A white navigation rail separates destinations from the reading canvas; flat white cards keep the next opportunity and its requirements easy to scan.

The matching public landing page uses the same typography, borders and controls with wider section spacing. Examples remain visibly illustrative: local bookmarks and background toggles demonstrate an interaction, while authenticated discovery holds real saved progress. Relevance, eligibility and source verification remain separate.

**Key Characteristics:**

- Warm paper, graphite and restrained terracotta.
- White desktop rail and flat bordered working surfaces.
- Self-hosted variable Manrope, weights 200–800.
- Five mobile destinations and native detail dialogs.
- Brief bookmark feedback with reduced-motion support.

Automated implementation checks reported by the implementing agent passed: 210 tests across 28 files, production build, TypeScript and changed-file lint. The handoff is `docs/APPLLAMA_REDESIGN_QA.md`; these checks do not establish visual approval.

This is a code-derived record of the authorized discovery workspace and matching landing page replacement. No visual comp was used. Browser access returned "No browser is available" and an empty browser list: desktop visual review, mobile review and complete authenticated-flow QA remain **unverified**. No screenshots exist for this pass. Product requirements in PRODUCT.md remain unchanged; this document is not backend, auth or billing validation.

## Colors

Frontmatter records the implemented palette from `src/app/adventure.css`, with warning/danger values inherited from `src/app/globals.css`. The compatibility token `rail` now means graphite; the desktop sidebar itself uses `surface-main`.

### Primary

- **Terracotta Action:** primary marks actions, links, selected filters and saved bookmarks; primary-hover and primary-depth provide darker states.
- **Terracotta Wash:** surface-interactive and surface-selected carry hover and selection; border-selected makes chosen filters legible without relying on color alone.

### Neutral

- **Warm Paper:** canvas behind the workspace and public page.
- **White Working Surface:** surface-main on cards, controls, navigation and dialogs.
- **Paper Inset:** surface-subtle for grouped context and public catalogue sections.
- **Graphite:** ink for reading and rail for inverse surfaces such as progress acknowledgements; muted/subtle for supporting copy.
- **Paper Lines:** line for structure; line-strong for controls and hover edges.

Status remains semantic: success colors accompany stated positive outcomes, warning and eligibility-unknown treatments accompany missing requirements, and danger accompanies known restrictions. Demo/example provenance remains visible. Legacy lime names alias the terracotta wash and dark terracotta ink; they are not an additional green accent.

## Typography

**Display and body font:** `Manrope, ui-sans-serif, system-ui, sans-serif`. The Latin variable TTF is self-hosted at `/fonts/manrope-latin.ttf` with `font-display: swap` and weights 200–800.

- **Display:** landing hero uses the frontmatter display role; mobile uses `clamp(35px, 8vw, 48px)`.
- **Headline:** workspace title uses the frontmatter headline role; discovery has a 30px mobile override. Landing section headings use `clamp(28px, 3vw, 40px)`, weight 650, line-height 1.2 and tracking -.03em.
- **Title:** opportunity cards use 21px/700 at line-height 1.35. Section titles use 18px; supporting sidebar titles use 17px.
- **Body:** workspace introduction uses 15px/1.6. Landing hero copy uses 17px/1.8 with 44ch maximum width, reducing to 15px on mobile. Card facts use 12–13px; supporting detail copy uses 14px.
- **Label/control:** eyebrow 11px/750 with .06em tracking; buttons .875rem/750; editable text 16px. Deadlines and counters use tabular numbers.

Some retained brand rules request weight 850, above the supplied font's 800 maximum; do not treat 850 as a new font asset or normative type weight.

## Layout

Desktop shell: fixed white sidebar 232px wide with 28px 18px 20px padding, matching shell offset, and a 72px contextual topbar. Content max-width is 1560px with 40px 40px 56px padding. Discovery places its board beside a 232px context column, separated by 32px. Discovery cards form two equal columns with 20px gaps on desktop; the removed wide-screen override does not expand them to three.

At 1200px and below, page/topbar padding becomes 28px and the context column 220px with 24px gap. At 1050px and below the board is one main region with a two-column supporting area below. At 760px and below, sidebar is hidden; cards, filters/search and supporting regions stack. Content padding is 24px 20px 32px (16px inline below 359px). Bottom navigation shows Discover, Scout, Saved, Applications and More, with safe-area padding and space reserved in the shell. The topbar becomes 60px minimum height. More opens a native bottom dialog with 88dvh maximum height.

Landing modules use a 1240px container with 24px inline padding: a two-column hero with 64px gap and 88px/80px vertical padding, followed by editorial sections generally padded 80px vertically. The illustrative catalogue uses three columns, two below 1050px and one below 760px. Mobile hero stacks with 44px 20px 48px padding, and sections generally use 48px 20px. These are implemented responsive rules, not verified viewport results.

## Elevation & Depth

Working cards and controls are flat at rest; borders and tonal grouping supply depth. Native dialogs use `0 24px 80px rgb(41 39 36 / .2)` with graphite 45% backdrop. The progress acknowledgement retains `0 8px 28px rgb(12 35 25 / .2)`; the declared optional lift token is `0 12px 32px rgb(41 39 36 / .09)`. Some retained landing modules use small Tailwind shadows; do not extend that treatment to ordinary discovery cards.

## Shapes

Cards use 14px corners, inputs/buttons/navigation 10px, filter chips 9px, status blocks 8px and native dialogs 16px. Public workspace preview uses 16px. Thin 1px borders organize surfaces. Organization marks use 40px squares with 10px corners; account avatars remain circular. Default buttons, bookmarks, filter chips and dialog close controls provide at least 44px targets; the retained small-button variant uses 40px minimum height.

## Components

### Buttons and fields

Primary buttons use terracotta with white text; hover darkens to primary-hover. Secondary buttons use white with line-strong border and graphite text; hover adds terracotta wash. Ghost actions use terracotta text. Shared padding is 11px 17px with 10px corners. Visible keyboard focus uses a 3px terracotta outline offset 3px. Search wraps a native search input in a white 10px bordered surface with 46px minimum input height and a focus-within outline.

### Navigation and filters

White desktop navigation groups destinations under Explore and Your workspace; More tools & settings is a native disclosure. Selected destinations use terracotta wash with terracotta text. Filters preserve `aria-pressed`, selected background and border. Mobile keeps five destinations and places remaining tools in the More dialog.

### Opportunity cards

White cards use 20px padding, 14px corners and line border; hover strengthens the border without lift. Organization initials, type/provenance and save control precede the title, format, relevance, funding and separate eligibility block. Deadline and explicit View opportunity action anchor the bottom. Missing facts remain stated as unknown and source freshness remains visible.

### Discovery context

A compact direction strip connects to the profile goal; a native First steps disclosure shows profile/save/prepare progress. The duplicate WorkspaceGuide is removed from discovery. The right-hand context area retains background completeness, completed preparation checklists and confirmed upcoming deadlines.

### Illustrative landing interactions

The hero switches between Student, Builder and Researcher examples with local `aria-pressed` controls. Its saved state resets when the background changes. The public sample catalogue filters/searches static programme examples and bookmarks locally; detail uses a native dialog. Labels and warnings identify examples and recorded terms that require provider confirmation. These interactions do not persist account progress or constitute live recommendations.

### Signature motion and dialogs

The selected bookmark performs a single 180ms icon settling pulse (scale 1.16 at 40%). Detail dialogs enter with a 12px vertical translation over 240ms using `cubic-bezier(.16, 1, .3, 1)`. Runtime uses `showModal()`, native dismissal and named close buttons. Reduced-motion media rules disable animation and transitions without removing content. Modal keyboard/focus behavior remains browser-QA pending.

## Do's and Don'ts

- **Do** use the implemented warm-paper palette and Manrope across these surfaces.
- **Do** keep relevance, eligibility, source checks and example provenance distinct.
- **Do** preserve visible focus, native semantics, reduced motion and useful empty/error/loading states.
- **Do** treat public preview bookmarks and programme terms as illustrative local state.
- **Don't** restore the forest/lime sidebar identity in new discovery or landing work.
- **Don't** imply a saved preview is persisted or preparation submits an application.
- **Don't** describe this pass as visually verified or full-flow tested without new browser evidence.

### Interaction motion update

The landing background selector uses a 240ms sliding surface; changing its background reveals only the example content over 220ms, preserving focused controls. Newly mounted discovery/catalogue cards reveal over 220ms without remounting retained results or blocking clicks. Pending save buttons show a small indicator and expose busy labels; preparation names its pending state. Profile completeness uses a 300ms scale transition, while success feedback and First steps disclosure enter over 180–200ms. Native dialogs keep their 240ms entrance with slight scale and opacity. Reduced motion removes movement while selected colors, saved icons, pending labels and alerts remain visible. Browser motion/performance QA remains unverified.
