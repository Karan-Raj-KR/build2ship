import { PushSubscriptionRecord } from "./types";

export function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string") return false;
  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidPushSubscription(sub: unknown): sub is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!sub || typeof sub !== "object" || !("endpoint" in sub) || !("keys" in sub)) return false;
  const keys = sub.keys;
  return isValidPushEndpoint(sub.endpoint) && !!keys && typeof keys === "object" &&
    "p256dh" in keys && typeof keys.p256dh === "string" && keys.p256dh.trim().length > 0 &&
    "auth" in keys && typeof keys.auth === "string" && keys.auth.trim().length > 0;
}

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string }; user_agent?: string }
): Promise<PushSubscriptionRecord> {
  if (!isValidPushSubscription(sub)) throw new Error("Valid push subscription is required.");

  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      keys: sub.keys,
      user_agent: sub.user_agent || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error || !data) throw new Error("Failed to save push subscription");
  return data;
}

export async function removePushSubscription(endpoint: string, userId?: string): Promise<void> {
  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  let query = supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;

  if (error) throw new Error("Failed to remove push subscription");
}

export async function dispatchWebPush(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ success: boolean; dispatchedCount: number; warning?: string }> {
  void payload;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return {
      success: false,
      dispatchedCount: 0,
      warning: "VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) not configured. Push notifications safely held.",
    };
  }

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();
    const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
    if (error) throw new Error("Failed to fetch push subscriptions");
    if (!data?.length) {
      return { success: true, dispatchedCount: 0, warning: "User has no active push subscriptions." };
    }
  } catch {
    return { success: false, dispatchedCount: 0, warning: "Failed to fetch push subscriptions." };
  }

  return {
    success: false,
    dispatchedCount: 0,
    warning: "Web push delivery is not implemented. No notifications were sent.",
  };
}
