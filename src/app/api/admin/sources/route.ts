// ============================================================
// API: /api/admin/sources
// GET: List all sources with health, errors, country/category coverage
// POST: Toggle enable/disable or trigger ingestion run
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getAdminSources } from "@/lib/admin/store";

export async function GET(_request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const sources = await getAdminSources();
    return NextResponse.json({ sources, total: sources.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  return NextResponse.json({ error: "Automated source crawling is not implemented yet. Import a public README as drafts instead." }, { status: 501 });
}
