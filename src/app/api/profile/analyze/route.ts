// ============================================================
// API: POST /api/profile/analyze — Run AI Profile Analysis
// Evaluates user profile and evidence, producing actionable insights.
// ============================================================
import { NextResponse } from "next/server";
import { requireAuth, checkRateLimit } from "@/lib/api-auth";
import { analyzeProfileWithLLM } from "@/lib/ai/profileAnalysis";
import type { Profile, ProfileEvidence, ProfileInsight } from "@/types/database";

export async function POST() {
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
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const [{ data: p, error: profileError }, { data: ev, error: evidenceError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle(),
      supabase.from("profile_evidence").select("*").eq("user_id", auth.userId),
    ]);
    if (profileError) throw profileError;
    if (evidenceError) throw evidenceError;
    const profile: Profile | null = p;
    const evidence: ProfileEvidence[] = ev ?? [];

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const analysis = await analyzeProfileWithLLM(profile, evidence);

    const insightPayload: Omit<ProfileInsight, "id" | "created_at"> = {
      user_id: auth.userId!,
      profile_version_ts: profile.updated_at || new Date().toISOString(),
      strongest_signals: analysis.strongest_signals,
      differentiators: analysis.differentiators,
      weak_signals: analysis.weak_signals,
      likely_unlocks: analysis.likely_unlocks,
      suggested_actions: analysis.suggested_actions,
      actionable_gaps: analysis.actionable_gaps,
      summary: analysis.summary,
    };

    const { data: savedInsight, error: insertErr } = await supabase
      .from("profile_insights")
      .insert(insightPayload)
      .select()
      .maybeSingle();

    if (insertErr || !savedInsight) {
      return NextResponse.json({ error: insertErr?.message || "Failed to save profile insight" }, { status: 500 });
    }

    return NextResponse.json({ success: true, insight: savedInsight });
  } catch (err) {
    console.error("Profile analysis API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profile_insights")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ insight: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
