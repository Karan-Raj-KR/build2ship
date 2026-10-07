// ============================================================
// API: /api/admin/audit-logs
// GET: Fetch immutable admin audit log entries
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/api-auth";
import { getAuditLogs } from "@/lib/admin/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["owner", "admin"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const logs = await getAuditLogs(limit);
    return NextResponse.json({ logs, total: logs.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
