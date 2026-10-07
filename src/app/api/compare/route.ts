import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { Opportunity, Profile } from "@/types/database";
import { evaluateComparisonItem } from "@/lib/compare/engine";
import { CataloguePickerItem, ComparedOpportunityItem } from "@/lib/compare/types";
import { analyzeDeadline } from "@/opportunity-sources/freshness";
import { evaluateCountryEligibility } from "@/lib/personalisation/countryRules";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const searchQuery = searchParams.get("search") || searchParams.get("q") || "";
  const view = searchParams.get("view") || "browse"; // "browse" | "saved"
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));
  const excludeParam = searchParams.get("exclude") || "";
  const excludeIds = new Set(excludeParam.split(",").map((s) => s.trim()).filter(Boolean));

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();
    const applicationsMap = new Map<string, string>();

    const [{ data: userProfile, error: profileError }, { data: userApps, error: appsError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle(),
      supabase.from("applications").select("opportunity_id, stage").eq("user_id", auth.userId),
    ]);
    if (profileError) throw profileError;
    if (appsError) throw appsError;
    const profile: Profile | null = userProfile;
    for (const app of userApps || []) {
      applicationsMap.set(app.opportunity_id, app.stage);
    }

    // 1. If requested specific IDs for comparison
    const comparedItems: ComparedOpportunityItem[] = [];
    if (idsParam) {
      const requestedIds = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3); // Maximum 3

      if (requestedIds.length > 0) {
        const { data, error } = await supabase
          .from("opportunities")
          .select("*")
          .in("id", requestedIds);
        if (error) throw error;
        const matchedOpps: Opportunity[] = data || [];

        // Maintain order of requestedIds
        for (const id of requestedIds) {
          const opp = matchedOpps.find((o) => o.id === id);
          if (opp) {
            const appStage = applicationsMap.get(opp.id) || null;
            comparedItems.push(evaluateComparisonItem(opp, profile, appStage));
          }
        }
      }
    }

    // 2. If picker results are requested (search or browse catalogue)
    let pickerResults: CataloguePickerItem[] = [];
    let totalPickerCount = 0;

    const wantsPicker = searchParams.has("search") || searchParams.has("view") || searchParams.has("page");

    if (wantsPicker) {
      let catalogueOpps: Opportunity[] = [];

      if (view === "saved") {
        const savedOppIds = Array.from(applicationsMap.keys());
        if (savedOppIds.length > 0) {
          let query = supabase.from("opportunities").select("*").in("id", savedOppIds);
          if (searchQuery.trim()) {
            query = query.or(`title.ilike.%${searchQuery}%,organizer.ilike.%${searchQuery}%`);
          }
          const { data, error } = await query;
          if (error) throw error;
          catalogueOpps = data || [];
        }
      } else {
        let query = supabase.from("opportunities").select("*").eq("status", "published");
        if (searchQuery.trim()) {
          query = query.or(`title.ilike.%${searchQuery}%,organizer.ilike.%${searchQuery}%`);
        }
        const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        catalogueOpps = data || [];
      }

      // Filter out excluded IDs
      const filteredOpps = catalogueOpps.filter((o) => !excludeIds.has(o.id));
      totalPickerCount = filteredOpps.length;

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedOpps = filteredOpps.slice(startIndex, startIndex + limit);

      pickerResults = paginatedOpps.map((opp) => {
        const deadline = analyzeDeadline(opp.deadline);
        const countryEval = evaluateCountryEligibility(opp, profile || undefined);

        let verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown" = "unknown";
        let verdictLabel = "Check Requirements";

        if (countryEval.verdict === "ineligible") {
          verdict = "likely_ineligible";
          verdictLabel = "Likely Ineligible";
        } else if (countryEval.verdict === "eligible") {
          verdict = "likely_eligible";
          verdictLabel = "Likely Eligible";
        } else {
          verdict = "possibly_eligible";
          verdictLabel = "Needs Checking";
        }

        return {
          id: opp.id,
          title: opp.title,
          organizer: opp.organizer || "Unknown Organizer",
          category: opp.category,
          deadline_label: deadline.label,
          deadline_status: deadline.status,
          is_demo: Boolean(opp.is_demo),
          eligibility_verdict: verdict,
          eligibility_label: verdictLabel,
          is_saved: applicationsMap.has(opp.id),
        };
      });
    }

    const totalPages = Math.ceil(totalPickerCount / limit) || 1;

    return NextResponse.json({
      items: comparedItems,
      picker: {
        items: pickerResults,
        total: totalPickerCount,
        page,
        totalPages,
      },
      profile: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        country_of_residence: profile.country_of_residence,
        nationalities: profile.nationalities || [],
        education_stage: profile.education_stage,
      } : null,
    });
  } catch (error) {
    console.error("GET /api/compare failed:", error);
    return NextResponse.json(
      { error: "Failed to evaluate comparison", message: String(error) },
      { status: 500 }
    );
  }
}
