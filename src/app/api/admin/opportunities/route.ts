// ============================================================
// API: /api/admin/opportunities
// GET: Query opportunities with search, category, country, status filters & pagination
// POST: Create a new structured opportunity record
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getAdminOpportunities, createOpportunity } from "@/lib/admin/store";

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const category = searchParams.get("category") || undefined;
  const country = searchParams.get("country") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const result = await getAdminOpportunities({
      search,
      category,
      country,
      status,
      page,
      limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const created = await createOpportunity(
      body,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({ success: true, opportunity: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
