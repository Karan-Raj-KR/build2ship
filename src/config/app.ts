// ============================================================
// APP CONFIGURATION — single source of truth for the app name
// Centralised display name while preserving internal identifiers
// ============================================================

export const APP_INTERNAL_NAME = "Opportunity Workspace"; // Preserved for compatibility with saved data & contracts
export const APP_NAME = "build2ship";
export const APP_DISPLAY_NAME = "build2ship";
export const APP_WORDMARK = "BUILD2SHIP";
export const APP_PREVIEW_BADGE = "build2ship · Preview";
export const APP_TAGLINE = "Find opportunities. Build your profile. Never lose your context.";
export const APP_DESCRIPTION =
  "Your AI Opportunity Agent. A personal workspace to find hackathons, fellowships, scholarships, and internships — and keep your background ready to share with any AI tool.";
export const APP_VERSION = "0.2.0";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Demo mode: active when Supabase env vars are absent or when forced explicitly
export const IS_DEMO_MODE = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FORCE_DEMO_MODE === "true";
