// ============================================================
// API: /api/admin/settings
// GET: Retrieve system settings, feature flags, ranking weights, country rules
// PATCH: Update system settings with server-enforced validation
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getSystemSettings, updateSystemSettings } from "@/lib/admin/store";

export async function GET(_request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const settings = await getSystemSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load system settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  try {
    const updates = await request.json();
    const updated = await updateSystemSettings(
      updates,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update system settings" },
      { status: 500 }
    );
  }
}
