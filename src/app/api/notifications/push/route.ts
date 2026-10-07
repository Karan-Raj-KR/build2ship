// ============================================================
// API: GET & POST /api/notifications/push
// Manages web push subscriptions and provides public VAPID key.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { removePushSubscription, isValidPushEndpoint, isValidPushSubscription } from "@/lib/notifications/webpush";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  return NextResponse.json({
    enabled: false,
    publicKey: null,
    warning: "Browser alerts are not available yet. Use email or in-app notifications.",
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { subscription, action = "subscribe" } = body;

    if (!subscription || !isValidPushEndpoint(subscription.endpoint)) {
      return NextResponse.json({ error: "Valid push subscription is required." }, { status: 400 });
    }

    if (action === "unsubscribe") {
      await removePushSubscription(subscription.endpoint, auth.userId!);
      return NextResponse.json({ success: true, message: "Unsubscribed from push notifications." });
    }

    if (action !== "subscribe" || !isValidPushSubscription(subscription)) {
      return NextResponse.json({ error: "Valid push subscription is required." }, { status: 400 });
    }

    return NextResponse.json({ error: "Browser alerts are not available yet. Use email or in-app notifications." }, { status: 503 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process push subscription" },
      { status: 500 }
    );
  }
}
