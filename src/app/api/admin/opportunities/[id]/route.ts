// ============================================================
// API: /api/admin/opportunities/[id]
// PATCH: Update opportunity details or publication status
// DELETE: Archive opportunity (reversible)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { updateOpportunity, archiveOpportunity } from "@/lib/admin/store";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });
  }

  try {
    const updates = await request.json();
    await updateOpportunity(
      id,
      updates,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({ success: true, id, updates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing opportunity ID" }, { status: 400 });
  }

  try {
    await archiveOpportunity(
      id,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({ success: true, archived_id: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to archive opportunity" },
      { status: 500 }
    );
  }
}
