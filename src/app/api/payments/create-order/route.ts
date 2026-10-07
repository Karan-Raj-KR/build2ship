// ============================================================
// API: POST /api/payments/create-order — Create Razorpay order
// ============================================================
import { getSystemSettings } from '@/lib/admin/store';
import { createSql } from '@/lib/db/service';
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit } from "@/lib/api-auth";
import { RAZORPAY_CONFIG, ACCESS_PASS, isCheckoutEnabled } from "@/lib/payments/config";

export async function POST(request: NextRequest) {
  if (!isCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Checkout is not enabled. Payment configuration is incomplete." },
      { status: 503 }
    );
  }

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rateCheck = checkRateLimit(auth.userId!);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const settings = await getSystemSettings();
    if (!settings.feature_flags.enable_payments) return NextResponse.json({ error: 'Checkout is currently disabled.' }, { status: 503 });
    if (!Number.isSafeInteger(ACCESS_PASS.amount) || ACCESS_PASS.amount <= 0 || !Number.isSafeInteger(ACCESS_PASS.durationDays) || ACCESS_PASS.durationDays < 1) throw new Error('Invalid pass configuration');
    // Create order server-side — never trust client-provided prices
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: RAZORPAY_CONFIG.keyId,
      key_secret: RAZORPAY_CONFIG.keySecret,
    });

    const order = await razorpay.orders.create({
      amount: ACCESS_PASS.amount,
      currency: ACCESS_PASS.currency,
      receipt: `eligent-${crypto.randomUUID().slice(0, 24)}`,
      notes: {
        user_id: auth.userId!,
        product: "access_pass",
      },
    });

    const sql = createSql();
    await sql`INSERT INTO payment_orders (order_id,user_id,amount,currency,duration_days) VALUES (${order.id},${auth.userId},${ACCESS_PASS.amount},${ACCESS_PASS.currency},${ACCESS_PASS.durationDays})`;
    return NextResponse.json({
      keyId: RAZORPAY_CONFIG.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payment order" },
      { status: 500 }
    );
  }
}
