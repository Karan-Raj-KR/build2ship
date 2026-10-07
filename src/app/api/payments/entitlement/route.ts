// ============================================================
// API: GET /api/payments/entitlement — Get current user entitlements
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { ACCESS_PASS, isCheckoutEnabled } from '@/lib/payments/config';
import { getSystemSettings } from '@/lib/admin/store';
import { getEntitlement } from "@/lib/payments/entitlements";

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const entitlement = await getEntitlement(auth.userId!);
    const settings = await getSystemSettings();
    return NextResponse.json({ ...entitlement, pass: ACCESS_PASS, checkoutEnabled: isCheckoutEnabled() && settings.feature_flags.enable_payments });
  } catch {
    return NextResponse.json(
      { error: "Billing verification is unavailable. Please try again." },
      { status: 503 }
    );
  }
}
