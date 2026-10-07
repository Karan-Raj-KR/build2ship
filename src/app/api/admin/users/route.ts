// ============================================================
// API: /api/admin/users
// GET: Search and list users with roles, residence, and account status
// PATCH: Manage user roles, suspend/reactivate accounts
// DELETE: Process account deletion requests (with audit log)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getAdminUsers, updateUserRole, toggleUserSuspension } from "@/lib/admin/store";
import { logAdminAction } from "@/lib/admin/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;

  try {
    const users = await getAdminUsers(search);
    return NextResponse.json({ users, total: users.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { user_id, action, role, is_suspended } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    if (action === "update_role") {
      // Only owners can assign owner or admin roles
      if (auth.role !== "owner" && (role === "owner" || role === "admin")) {
        return NextResponse.json(
          { error: "Only the Owner can assign owner or admin privileges." },
          { status: 403 }
        );
      }

      await updateUserRole(
        user_id,
        role,
        auth.userId || "admin-user",
        auth.email || "admin@opportunityos.local"
      );

      return NextResponse.json({ success: true, user_id, role });
    }

    if (action === "toggle_suspension") {
      await toggleUserSuspension(
        user_id,
        Boolean(is_suspended),
        auth.userId || "admin-user",
        auth.email || "admin@opportunityos.local"
      );

      return NextResponse.json({ success: true, user_id, is_suspended: Boolean(is_suspended) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["owner"]);
  if (auth.error) return auth.error;

  try {
    const { user_id, reason } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Suspend for manual deletion review; no background deletion queue exists.
    await toggleUserSuspension(
      user_id,
      true,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    await logAdminAction({
      adminId: auth.userId || "admin-user",
      adminEmail: auth.email || "admin@opportunityos.local",
      action: "suspend_for_deletion_review",
      targetType: "user",
      targetId: user_id,
      details: { reason: reason || "User requested GDPR account deletion" },
    });

    return NextResponse.json({
      success: true,
      user_id,
      message: "Account suspended. Data is retained; deletion requires manual review.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process user deletion" },
      { status: 500 }
    );
  }
}
