// ============================================================
// API: POST /api/analyze — Run eligibility analysis for a user
// Requires authentication. Enforces rate limits.
// ============================================================
import { assessOpportunityEligibility } from '@/lib/eligibility/opportunity';
import { createClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from "next/server";
import { analyzeEligibility } from "@/lib/eligibility/engine";
import { requireAuth, checkRateLimit } from "@/lib/api-auth";
import type { ExtractedRequirement } from "@/lib/ingestion/types";
import type { UserProfile } from "@/lib/eligibility/engine";

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
    if (typeof body.opportunity_id === 'string') {
      const db = await createClient();
      const [{ data: opp, error: oppError }, { data: profile, error: profileError }] = await Promise.all([
        db.from('opportunities').select('*').eq('id', body.opportunity_id).single(),
        db.from('profiles').select('*').eq('id', auth.userId).single(),
      ]);
      if (oppError || profileError) throw oppError || profileError;
      const assessment = assessOpportunityEligibility(opp, profile);
      const { country: _country, unknowns: _unknowns, ...base } = assessment;
      const report = { ...base, missing_documents: opp.required_documents || [], computed_at: new Date().toISOString(), source_snapshot: 'deterministic', opportunity_version_ts: opp.updated_at, profile_updated_at: profile.updated_at };
      const { error } = await db.from('analysis_records').insert({ user_id: auth.userId, opportunity_id: opp.id, opportunity_version_ts: opp.updated_at, profile_updated_at: profile.updated_at, result: report });
      if (error) throw error;
      return NextResponse.json(report);
    }
    const { requirements, application_questions, required_documents, profile, user_documents } =
      body as {
        requirements?: Array<Record<string, unknown>>;
        application_questions?: string[];
        required_documents?: string[];
        profile?: Record<string, unknown>;
        user_documents?: string[];
      };

    if (!Array.isArray(requirements)) {
      return NextResponse.json({ error: "requirements must be an array." }, { status: 400 });
    }
    if (!profile || typeof profile !== "object") {
      return NextResponse.json({ error: "profile is required." }, { status: 400 });
    }

    // Cap array sizes to prevent abuse
    if (requirements.length > 50) {
      return NextResponse.json({ error: "Too many requirements (max 50)." }, { status: 400 });
    }

    const userProfile: UserProfile = {
      display_name: profile.display_name != null ? String(profile.display_name).slice(0, 200) : null,
      nationality: profile.nationality != null ? String(profile.nationality).slice(0, 100) : null,
      residence: profile.residence != null ? String(profile.residence).slice(0, 100) : null,
      education_level: profile.education_level != null ? String(profile.education_level).slice(0, 50) : null,
      field_of_study: profile.field_of_study != null ? String(profile.field_of_study).slice(0, 100) : null,
      expected_graduation: profile.expected_graduation != null ? String(profile.expected_graduation).slice(0, 20) : null,
      skills: Array.isArray(profile.skills) ? profile.skills.map(String).slice(0, 50) : [],
      interests: Array.isArray(profile.interests) ? profile.interests.map(String).slice(0, 50) : [],
      has_cv: typeof profile.has_cv === "boolean" ? profile.has_cv : null,
      has_transcript: typeof profile.has_transcript === "boolean" ? profile.has_transcript : null,
      has_reference_letters: typeof profile.has_reference_letters === "boolean" ? profile.has_reference_letters : null,
      bio: profile.bio != null ? String(profile.bio).slice(0, 500) : null,
    };

    const extractedReqs: ExtractedRequirement[] = requirements.map((r) => {
      const cr = r.comparison_rule as Record<string, unknown> | null;
      return {
        text: String(r.text ?? "").slice(0, 500),
        type: String(r.type ?? "other") as ExtractedRequirement["type"],
        mandatory: String(r.mandatory ?? "uncertain") as ExtractedRequirement["mandatory"],
        excerpt: String(r.excerpt ?? "").slice(0, 500),
        source_ref: String(r.source_ref ?? "").slice(0, 200),
        comparison_rule: cr
          ? {
              field: String(cr.field ?? "").slice(0, 100),
              operator: String(cr.operator ?? "") as "includes" | "equals" | "gte" | "lte" | "between" | "matches_regex" | "in_list",
              value: cr.value,
              unit: cr.unit ? String(cr.unit).slice(0, 50) : undefined,
            }
          : null,
        uncertainty: r.uncertainty ? String(r.uncertainty).slice(0, 500) : null,
      };
    });

    const report = await analyzeEligibility(
      extractedReqs,
      Array.isArray(application_questions) ? application_questions.slice(0, 20) : [],
      Array.isArray(required_documents) ? required_documents.slice(0, 20) : [],
      userProfile,
      Array.isArray(user_documents) ? user_documents.slice(0, 20) : []
    );

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
