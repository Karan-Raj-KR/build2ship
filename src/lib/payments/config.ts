// ============================================================
// PAYMENT CONFIG — Razorpay configuration and pricing
// All prices in paise (INR × 100). Configurable via env vars.
// ============================================================

export const RAZORPAY_CONFIG = {
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
};

import { APP_NAME } from "@/config/app";

// Provisional pricing — $9 for a one-time 30-day access pass
// This is an unvalidated pricing hypothesis. Do not treat as validated.
export const ACCESS_PASS = {
  amount: parseInt(process.env.ACCESS_PASS_AMOUNT ?? "900", 10), // USD cents by default
  currency: process.env.ACCESS_PASS_CURRENCY ?? "USD",
  durationDays: parseInt(process.env.ACCESS_PASS_DURATION_DAYS ?? "30", 10),
  description: `${APP_NAME} — 30-Day Access Pass`,
};

// Free tier allowances (configurable)
export const FREE_TIER = {
  maxAnalyses: parseInt(process.env.FREE_MAX_ANALYSES ?? "5", 10),
  maxDrafts: parseInt(process.env.FREE_MAX_DRAFTS ?? "5", 10),
};

// Paid tier allowances (configurable)
export const PAID_TIER = {
  maxAnalyses: parseInt(process.env.PAID_MAX_ANALYSES ?? "50", 10),
  maxDrafts: parseInt(process.env.PAID_MAX_DRAFTS ?? "50", 10),
};

export function isRazorpayConfigured(): boolean {
  if (typeof window !== "undefined") {
    return !!RAZORPAY_CONFIG.keyId;
  }
  return !!(RAZORPAY_CONFIG.keyId && RAZORPAY_CONFIG.keySecret);
}

export function isCheckoutEnabled(): boolean {
  const enabled =
    process.env.NEXT_PUBLIC_ENABLE_CHECKOUT === "true" ||
    process.env.ENABLE_CHECKOUT === "true";
  return isRazorpayConfigured() && enabled;
}
