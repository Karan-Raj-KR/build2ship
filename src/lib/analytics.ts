// ============================================================
// ANALYTICS — privacy-conscious event tracking
// No profile content, essays, source text, or sensitive attributes.
// ============================================================
import { IS_DEMO_MODE } from "@/config/app";

export type AnalyticsEvent =
  | "onboarding_completed"
  | "first_opportunity_saved"
  | "first_analysis_completed"
  | "first_draft_saved"
  | "context_exported"
  | "application_submitted"
  | "checkout_started"
  | "payment_confirmed";

interface AnalyticsRecord {
  id: string;
  user_id: string;
  event: AnalyticsEvent;
  created_at: string;
}

// In-memory store for demo mode
const _events: AnalyticsRecord[] = [];

function uid(): string {
  return `evt-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export async function trackEvent(userId: string, event: AnalyticsEvent): Promise<void> {
  if (IS_DEMO_MODE) {
    // Deduplicate: only track each event once per user
    const exists = _events.some((e) => e.user_id === userId && e.event === event);
    if (exists) return;

    _events.push({
      id: uid(),
      user_id: userId,
      event,
      created_at: new Date().toISOString(),
    });
    return;
  }

  try {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();

    // Deduplicate: only track each event once per user
    const { data: existing } = await supabase
      .from("analytics_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event", event)
      .limit(1);

    if (existing && existing.length > 0) return;

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event,
    });
  } catch {
    // Analytics failure should never block user actions
  }
}

export async function getFunnelData(): Promise<Record<AnalyticsEvent, number>> {
  const funnel: Record<string, number> = {
    onboarding_completed: 0,
    first_opportunity_saved: 0,
    first_analysis_completed: 0,
    first_draft_saved: 0,
    context_exported: 0,
    application_submitted: 0,
    checkout_started: 0,
    payment_confirmed: 0,
  };

  if (IS_DEMO_MODE) {
    for (const evt of _events) {
      funnel[evt.event] = (funnel[evt.event] || 0) + 1;
    }
    return funnel as Record<AnalyticsEvent, number>;
  }

  try {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();

    const { data } = await supabase
      .from("analytics_events")
      .select("event");

    if (data) {
      for (const row of data) {
        funnel[row.event] = (funnel[row.event] || 0) + 1;
      }
    }
  } catch {
    // Analytics query failure — return zeros
  }

  return funnel as Record<AnalyticsEvent, number>;
}

export async function getUserCount(): Promise<number> {
  if (IS_DEMO_MODE) {
    const uniqueUsers = new Set(_events.map((e) => e.user_id));
    return uniqueUsers.size;
  }

  try {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();

    const { count } = await supabase
      .from("analytics_events")
      .select("user_id", { count: "exact", head: true });

    return count ?? 0;
  } catch {
    return 0;
  }
}
