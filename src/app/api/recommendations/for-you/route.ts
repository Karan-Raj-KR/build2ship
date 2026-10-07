// ============================================================
// API: GET /api/recommendations/for-you
// Provides ranked For You feed items with cursor pagination and feedback integration.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getForYouFeed } from "@/lib/recommendations/forYouEngine";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 10));

  try {
    const { recommendationContext } = await import('@/lib/recommendations/context');
    const { opportunities, evidence, feedback, applications } = await recommendationContext(auth.userId);
    const profile = auth.profile;

    const feedResult = getForYouFeed({
      opportunities,
      profile: profile || undefined,
      evidence,
      feedback,
      applications,
      cursor,
      limit,
    });

    const response = NextResponse.json({ ...feedResult, profile: profile || null });
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    return response;
  } catch (err) {
    console.error("For You feed API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load feed" },
      { status: 500 }
    );
  }
}
