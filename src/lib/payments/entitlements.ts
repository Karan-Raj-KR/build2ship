// ============================================================
// ENTITLEMENTS — track user access pass and AI usage allowances
// ============================================================
import { createSql } from '@/lib/db/service';
import { IS_DEMO_MODE } from "@/config/app";
import { FREE_TIER, PAID_TIER, ACCESS_PASS } from "./config";

export interface Entitlement {
  userId: string;
  hasActivePass: boolean;
  passExpiresAt: string | null;
  analysesUsed: number;
  draftsUsed: number;
  maxAnalyses: number;
  maxDrafts: number;
  tier: "free" | "paid";
}

// In-memory store for demo mode (resets on restart)
const _entitlements = new Map<string, Entitlement>();

export async function getEntitlement(userId: string): Promise<Entitlement> {
  if (IS_DEMO_MODE) {
    const existing = _entitlements.get(userId);
    if (existing) return existing;

    const ent: Entitlement = {
      userId,
      hasActivePass: false,
      passExpiresAt: null,
      analysesUsed: 0,
      draftsUsed: 0,
      maxAnalyses: FREE_TIER.maxAnalyses,
      maxDrafts: FREE_TIER.maxDrafts,
      tier: "free",
    };
    _entitlements.set(userId, ent);
    return ent;
  }

  const row = (await createSql()`SELECT
    (SELECT max(expires_at) FROM payment_passes WHERE user_id = ${userId} AND status = 'active' AND expires_at > now()) AS expires_at,
    (SELECT count(*)::int FROM ai_usage WHERE user_id = ${userId} AND usage_type IN ('analysis','extraction') AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS analyses,
    (SELECT count(*)::int FROM ai_usage WHERE user_id = ${userId} AND usage_type = 'draft' AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS drafts`)[0];
  if (!row) throw new Error('Billing verification is unavailable. Please try again.');
  const hasActivePass = Boolean(row.expires_at);
  const limits = hasActivePass ? PAID_TIER : FREE_TIER;
  return { userId, hasActivePass, passExpiresAt: row.expires_at || null,
    analysesUsed: row.analyses, draftsUsed: row.drafts, ...limits, tier: hasActivePass ? 'paid' : 'free' };
}

export class UsageLimitError extends Error {
  constructor() { super('AI allowance or request limit reached. Try later or review your plan in Billing.'); }
}

export async function reserveUsage(userId: string, usageType: 'analysis' | 'draft'): Promise<void> {
  if (!userId) throw new Error('Authenticated account required for AI.');
  const key = usageType === 'draft' ? 'maxDrafts' : 'maxAnalyses';
  if (![FREE_TIER[key], PAID_TIER[key]].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid AI allowance configuration.');
  if (IS_DEMO_MODE) {
    const ent = await getEntitlement(userId);
    const used = usageType === 'draft' ? 'draftsUsed' : 'analysesUsed';
    if (ent[used] >= ent[key]) throw new UsageLimitError();
    ent[used]++;
    return;
  }
  const row = (await createSql()`SELECT reserve_ai_usage(${userId},${usageType},${FREE_TIER[key]},${PAID_TIER[key]}) AS id`)[0];
  if (!row?.id) throw new UsageLimitError();
}

export async function grantAccess(userId: string, paymentId: string, orderId: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const ent = _entitlements.get(userId) ?? {
      userId,
      hasActivePass: false,
      passExpiresAt: null,
      analysesUsed: 0,
      draftsUsed: 0,
      maxAnalyses: FREE_TIER.maxAnalyses,
      maxDrafts: FREE_TIER.maxDrafts,
      tier: "free" as const,
    };
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ACCESS_PASS.durationDays);
    ent.hasActivePass = true;
    ent.passExpiresAt = expiresAt.toISOString();
    ent.maxAnalyses = PAID_TIER.maxAnalyses;
    ent.maxDrafts = PAID_TIER.maxDrafts;
    ent.tier = "paid";
    _entitlements.set(userId, ent);
    return;
  }

  const sql = createSql();
  const order = (await sql`SELECT user_id FROM payment_orders WHERE order_id = ${orderId}`)[0];
  if (order?.user_id !== userId) throw new Error('Payment order ownership mismatch');
  await sql`SELECT grant_payment_access(${orderId},${paymentId})`;
}

export async function revokePaymentAccess(paymentId: string): Promise<void> {
  const sql = createSql();
  await sql`WITH revoked_order AS (UPDATE payment_orders SET status = 'refunded' WHERE payment_id = ${paymentId})
    UPDATE payment_passes SET status = 'revoked', updated_at = now() WHERE payment_id = ${paymentId}`;
}
