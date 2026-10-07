// ============================================================
// API: GET /api/admin/analytics — Admin-only funnel view
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getFunnelData, getUserCount } from "@/lib/analytics";
import { getAdminCoverageAnalytics } from "@/lib/admin/store";

export async function GET(_request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin", "editor"]);
  if (auth.error) return auth.error;

  try {
    const [funnel, userCount, coverage] = await Promise.all([
      getFunnelData(),
      getUserCount(),
      getAdminCoverageAnalytics(),
    ]);

    return NextResponse.json({
      userCount,
      funnel,
      coverage,
      activation: {
        description: "A user saves an opportunity, completes its eligibility review, and saves at least one application task or answer.",
        count: Math.min(
          funnel.first_opportunity_saved,
          funnel.first_analysis_completed,
          Math.max(funnel.first_draft_saved, 0)
        ),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
