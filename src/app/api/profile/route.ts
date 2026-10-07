// ============================================================
// API: /api/profile — Unified Profile Read & Auto-Save
// Handles atomic updates, type sanitization, date normalization,
// and graceful fallback for columns.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import type { Profile } from "@/types/database";
import { DISCOVERY_GOALS } from '@/lib/journey';

const ALLOWED_PROFILE_KEYS = new Set([
  "onboarding_step", "discovery_goal", "study_year", "experience_summary",
  "display_name",
  "country_of_residence",
  "nationalities",
  "university",
  "degree",
  "field_of_study",
  "education_stage",
  "expected_graduation",
  "skills",
  "interests",
  "opportunity_types",
  "participation_preference",
  "travel_constraints",
  "max_budget_amount",
  "max_budget_currency",
  "age_band",
  "work_authorizations",
  "onboarding_completed",
  "github_url",
  "linkedin_url",
  "portfolio_url",
  "other_links",
  "target_roles",
  "target_industries",
  "preferred_countries",
  "willing_to_relocate",
  "willing_to_travel",
  "paid_only_preference",
  "time_availability",
  "effort_tolerance",
]);

const ARRAY_FIELDS = new Set([
  "nationalities",
  "skills",
  "interests",
  "opportunity_types",
  "other_links",
  "target_roles",
  "target_industries",
  "preferred_countries",
  "work_authorizations",
]);

const BOOLEAN_FIELDS = new Set([
  "onboarding_completed",
  "willing_to_relocate",
  "willing_to_travel",
  "paid_only_preference",
]);

function normalizeDate(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    if (!isNaN(Date.parse(isoDate))) return isoDate;
  }

  // Fallback generic parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function sanitizeProfilePayload(updates: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(updates)) {
    if (!ALLOWED_PROFILE_KEYS.has(key)) continue;
    if (key === 'onboarding_step') {
      if (!Number.isInteger(val) || Number(val) < 0 || Number(val) > 4) throw new Error('Invalid onboarding step');
      clean[key] = val;
      continue;
    }
    if (key === 'discovery_goal' && val != null && !(DISCOVERY_GOALS as readonly unknown[]).includes(val)) throw new Error('Choose a supported goal');

    if (key === "expected_graduation") {
      clean[key] = normalizeDate(val);
      continue;
    }

    if (ARRAY_FIELDS.has(key)) {
      if (Array.isArray(val)) {
        clean[key] = Array.from(
          new Set(
            val
              .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
              .filter(Boolean).slice(0, 100).map(item => item.slice(0, 300))
          )
        );
      } else if (typeof val === "string" && val.trim()) {
        clean[key] = [val.trim()];
      } else {
        clean[key] = [];
      }
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof val !== "boolean") throw new Error(`${key} must be true or false`);
      clean[key] = val;
      continue;
    }

    if (typeof val === "string") {
      clean[key] = val.trim().slice(0, 2000) || null;
      continue;
    }

    clean[key] = val ?? null;
  }

  clean.updated_at = new Date().toISOString();
  return clean;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    if (auth.profile) return NextResponse.json({ profile: auth.profile }, { headers: { "Cache-Control": "private, no-store" } });
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error) throw error;
    let profile = data;
    if (!profile) {
      // Auto-create initial profile row
      const initial: Record<string, unknown> = {
        id: auth.userId,
        display_name: "User",
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      };
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .upsert(initial)
        .select()
        .maybeSingle();
      if (createError || !created) {
        throw new Error(createError?.message || "Failed to create profile");
      }
      profile = created;
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const rawBody = await request.json();
    const sanitized = sanitizeProfilePayload(rawBody);

    let savedProfile: Profile | undefined;
    if (process.env.SUPABASE_DB_URL) {
      try {
        const { createSql } = await import("@/lib/db/service");
        // Column identifiers come exclusively from ALLOWED_PROFILE_KEYS above.
        const assignments = Object.keys(sanitized).map(key => `"${key}" = (jsonb_populate_record(NULL::profiles, $1::jsonb))."${key}"`).join(', ');
        savedProfile = (await createSql().query(`UPDATE profiles SET ${assignments} WHERE id = $2 RETURNING *`, [JSON.stringify(sanitized), auth.userId]))[0] as Profile | undefined;
      } catch (sqlErr) {
        console.warn('createSql failed in profile PATCH, falling back to Supabase client:', sqlErr);
      }
    }

    if (!savedProfile) {
      const { createClient } = await import("@/lib/db/server");
      const supabase = await createClient();
      const { data, error } = await supabase.from('profiles').update(sanitized).eq('id', auth.userId).select().maybeSingle();
      if (error) throw error;
      savedProfile = data as Profile;
    }

    if (!savedProfile) throw new Error("Profile could not be found. Please sign in again.");

    return NextResponse.json({
      success: true,
      profile: savedProfile,
    });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error saving profile" },
      { status: 500 }
    );
  }
}
