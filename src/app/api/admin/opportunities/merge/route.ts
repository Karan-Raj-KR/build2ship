// ============================================================
// API: /api/admin/opportunities/merge
// POST: Merge duplicate opportunity into primary record
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { mergeOpportunities } from "@/lib/admin/store";

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  try {
    const { primary_id, duplicate_id } = await request.json();

    if (!primary_id || !duplicate_id) {
      return NextResponse.json(
        { error: "primary_id and duplicate_id are required" },
        { status: 400 }
      );
    }

    if (primary_id === duplicate_id) {
      return NextResponse.json(
        { error: "Cannot merge an opportunity into itself" },
        { status: 400 }
      );
    }

    await mergeOpportunities(
      primary_id,
      duplicate_id,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({
      success: true,
      message: `Successfully merged duplicate ${duplicate_id} into primary ${primary_id}`,
      primary_id,
      duplicate_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to merge opportunities" },
      { status: 500 }
    );
  }
}
