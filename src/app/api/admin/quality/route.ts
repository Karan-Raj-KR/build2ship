// ============================================================
// API: /api/admin/quality
// GET: List quality review queue (uncertain extractions, stale listings, conflicting evidence)
// POST: Resolve or ignore quality report
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getQualityReports, resolveQualityReport } from "@/lib/admin/store";

export async function GET(_request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const reports = await getQualityReports();
    return NextResponse.json({ reports, total: reports.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load quality reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const { report_id, resolution } = await request.json();
    if (!report_id || !resolution) {
      return NextResponse.json(
        { error: "report_id and resolution ('resolved' | 'ignored') are required" },
        { status: 400 }
      );
    }

    await resolveQualityReport(
      report_id,
      resolution,
      auth.userId || "admin-user",
      auth.email || "admin@opportunityos.local"
    );

    return NextResponse.json({ success: true, report_id, resolution });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve quality report" },
      { status: 500 }
    );
  }
}
