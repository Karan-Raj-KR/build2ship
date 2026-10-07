// ============================================================
// API: POST /api/extract — Re-extract or refine a pasted text
// Requires authentication. Enforces rate limits.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { extractOpportunity } from "@/lib/ai/extraction";
import { requireAuth, checkRateLimit, sanitizeInput } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rateCheck = checkRateLimit(auth.userId!);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { text, source_url } = body as { text?: string; source_url?: string };

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 characters." },
        { status: 400 }
      );
    }

    const sanitizedText = sanitizeInput(text, 50000);
    const sanitizedUrl = source_url ? sanitizeInput(source_url, 2048) : null;

    const result = await extractOpportunity(sanitizedText, sanitizedUrl, auth.userId!);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
