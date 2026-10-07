# Elara design reference

This package contains the exact interactive prototype source. No sign-in or API key is needed to run it locally.

## Preview

Unzip this folder. Serve it with a local static server, for example:

    python3 -m http.server 8000

Open http://localhost:8000 using your local development browser. Follow the local browser guidance available in your Codex environment. The font loads from Google Fonts; a system sans-serif fallback works offline.

## What to inspect

- Four-stage onboarding: goal, interests, eligibility basics, optional story.
- Progressive profile editor: basics, experience, preferences.
- Pip mascot, chunky controls, modular opportunity cards.
- Search, filters, saves, preparation checklists, journey, XP and celebrations.
- Mobile layout and reduced-motion support.

## Instructions for implementation

Use this folder as a visual and interaction reference for my existing opportunity app. Run and inspect it locally instead of trying to sign in to the hosted preview. Inspect onboarding, discovery, profile editing, saved opportunities, journey and preparation flows at desktop and mobile sizes.

Adapt the design into my existing framework and preserve working routes, authentication, backend logic, and Razorpay integration. Replace prototype-only session state with existing authenticated persistent storage. Keep relevance separate from verified eligibility. Reward meaningful progress and prevent duplicate XP. Do not present mock checkout, notifications, eligibility, or submission as live functionality. Implement the redesign and verify complete user flows rather than stopping at a plan.

## Prototype limitations

This is a design reference, not a production backend. Profile and progress use session-only in-memory state; no accounts, notifications, AI extraction or payments are connected. The 50 opportunity records are a research snapshot reviewed on 01 October 2026 and require fresh source verification before production use.

Files: index.html (structure), style.css (visual system), app.js (flows), data.js (research snapshot), mascot.png (original Pip asset).
