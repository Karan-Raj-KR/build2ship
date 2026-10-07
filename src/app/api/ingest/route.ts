// ============================================================
// API: POST /api/ingest — Fetch URL or accept pasted text
// Requires authentication. Enforces rate limits.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { safeFetchUrl } from "@/lib/ingestion/fetch";
import { extractOpportunity } from "@/lib/ai/extraction";
import { requireAuth, checkRateLimit, sanitizeInput } from "@/lib/api-auth";
import type { ExtractionResult } from "@/lib/ingestion/types";

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
    const { mode, url, text } = body as { mode?: string; url?: string; text?: string };

    if (mode === "url") {
      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "URL is required." }, { status: 400 });
      }

      const sanitizedUrl = sanitizeInput(url, 2048);
      try {
        new URL(sanitizedUrl);
      } catch {
        return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
      }

      const fetchResult = await safeFetchUrl(sanitizedUrl);
      if (fetchResult.error) {
        return NextResponse.json({ error: fetchResult.error }, { status: 422 });
      }

      const extraction = await extractOpportunity(fetchResult.content, sanitizedUrl, auth.userId!);
      return NextResponse.json({
        ...extraction,
        source_url: sanitizedUrl,
        final_url: fetchResult.finalUrl,
        content_type: fetchResult.contentType,
      } satisfies IngestResponse);
    }

    if (mode === "text") {
      if (!text || typeof text !== "string" || text.trim().length < 50) {
        return NextResponse.json(
          { error: "Pasted text must be at least 50 characters." },
          { status: 400 }
        );
      }

      const sanitizedText = sanitizeInput(text, 50000);
      if (sanitizedText.trim().length < 50) {
        return NextResponse.json(
          { error: "Pasted text must be at least 50 characters." },
          { status: 400 }
        );
      }

      const extraction = await extractOpportunity(sanitizedText, null, auth.userId!);
      return NextResponse.json({
        ...extraction,
        source_url: null,
        final_url: null,
        content_type: "text/plain",
      } satisfies IngestResponse);
    }

    if (mode === "save") {
      const { opportunity } = body as {
        opportunity?: Record<string, unknown>;
      };
      if (!opportunity || typeof opportunity !== "object") {
        return NextResponse.json({ error: "Opportunity object is required for mode 'save'." }, { status: 400 });
      }

      const title = typeof opportunity.title === "string" ? sanitizeInput(opportunity.title, 500) : "";
      if (!title) {
        return NextResponse.json({ error: "Title is required." }, { status: 400 });
      }

      const deadlineObj = (opportunity.deadline && typeof opportunity.deadline === "object")
        ? opportunity.deadline as Record<string, unknown>
        : null;

      const fundingObj = (opportunity.funding && typeof opportunity.funding === "object")
        ? opportunity.funding as Record<string, unknown>
        : null;

      const deadline = typeof opportunity.deadline === "string"
        ? opportunity.deadline
        : (typeof deadlineObj?.date === "string" ? deadlineObj.date : null);

      const deadline_timezone = typeof opportunity.deadline_timezone === "string"
        ? opportunity.deadline_timezone
        : (typeof deadlineObj?.timezone === "string" ? deadlineObj.timezone : null);

      const deadline_timezone_known = typeof opportunity.deadline_timezone_known === "boolean"
        ? opportunity.deadline_timezone_known
        : (typeof deadlineObj?.timezone_known === "boolean" ? deadlineObj.timezone_known : false);

      const deadline_raw_text = typeof opportunity.deadline_raw_text === "string"
        ? opportunity.deadline_raw_text
        : (typeof deadlineObj?.raw_text === "string" ? deadlineObj.raw_text : null);

      const funding_kind = (typeof opportunity.funding_kind === "string"
        ? opportunity.funding_kind
        : (typeof fundingObj?.kind === "string" ? fundingObj.kind : "unknown")) as import("@/types/database").FundingKind;

      const funding_description = typeof opportunity.funding_description === "string"
        ? opportunity.funding_description
        : (typeof fundingObj?.description === "string" ? fundingObj.description : null);

      const funding_amount_min = typeof opportunity.funding_amount_min === "number"
        ? opportunity.funding_amount_min
        : (typeof fundingObj?.amount_min === "number" ? fundingObj.amount_min : null);

      const funding_amount_max = typeof opportunity.funding_amount_max === "number"
        ? opportunity.funding_amount_max
        : (typeof fundingObj?.amount_max === "number" ? fundingObj.amount_max : null);

      const funding_currency = typeof opportunity.funding_currency === "string"
        ? opportunity.funding_currency
        : (typeof fundingObj?.currency === "string" ? fundingObj.currency : null);

      const funding_conditional = typeof opportunity.funding_conditional === "boolean"
        ? opportunity.funding_conditional
        : (typeof fundingObj?.conditional === "boolean" ? fundingObj.conditional : false);

      const requirements = Array.isArray(opportunity.requirements)
        ? { items: opportunity.requirements }
        : (opportunity.requirements && typeof opportunity.requirements === "object" ? opportunity.requirements : null);

      const rawSourceLabel = String(opportunity.source_label ?? "user_provided");
      const source_label: "curated" | "fetched" | "user_provided" | "seed" =
        rawSourceLabel === "fetched" ? "fetched" : "user_provided";

      const canonicalOpportunityData = {
        created_by: auth.userId,
        title,
        organizer: typeof opportunity.organizer === "string" ? sanitizeInput(opportunity.organizer, 300) : null,
        category: (typeof opportunity.category === "string" ? opportunity.category : "other") as import("@/types/database").OpportunityCategory,
        summary: typeof opportunity.summary === "string" ? sanitizeInput(opportunity.summary, 4000) : null,
        location: typeof opportunity.location === "string" ? sanitizeInput(opportunity.location, 300) : null,
        participation_mode: (typeof opportunity.participation_mode === "string" ? opportunity.participation_mode : "remote") as import("@/types/database").ParticipationMode,
        deadline,
        deadline_timezone,
        deadline_timezone_known,
        deadline_raw_text,
        timezone_known: deadline_timezone_known,
        funding_kind,
        funding_description,
        funding_amount_min,
        funding_amount_max,
        funding_currency,
        funding_conditional,
        requirements,
        application_questions: Array.isArray(opportunity.application_questions) ? opportunity.application_questions.map(String) : [],
        required_documents: Array.isArray(opportunity.required_documents) ? opportunity.required_documents.map(String) : [],
        application_steps: Array.isArray(opportunity.application_steps) ? opportunity.application_steps.map(String) : [],
        source_url: typeof opportunity.source_url === "string" ? sanitizeInput(opportunity.source_url, 2048) : null,
        source_content: typeof opportunity.source_content === "string" ? sanitizeInput(opportunity.source_content, 50000) : null,
        source_label,
        source_status: "unknown" as import("@/types/database").SourceStatus,
        status: "draft" as import("@/types/database").OpportunityStatus,
        publication_status: "draft",
        last_verified_at: null,
        is_demo: false,
        retrieved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Production Supabase persistence
      const { createClient } = await import("@/lib/db/server");
      const supabase = await createClient();

      let oppId: string | null = null;
      let savedOpp: import("@/types/database").Opportunity | null = null;

      // Check duplicate by source_url if present
      if (canonicalOpportunityData.source_url) {
        const { data: existing } = await supabase
          .from("opportunities")
          .select("*")
          .eq("source_url", canonicalOpportunityData.source_url)
          .maybeSingle();

        if (existing) {
          oppId = existing.id;
          savedOpp = existing;
        }
      }

      if (!oppId) {
        const { data: inserted, error: insertErr } = await supabase
          .from("opportunities")
          .insert(canonicalOpportunityData)
          .select()
          .single();

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
        oppId = inserted.id;
        savedOpp = inserted;
      }

      // Automatically create application in 'saved' stage for the user so it immediately shows in Applications & Library!
      let appRecord = null;
      try {
        const { data: appData, error: appErr } = await supabase
          .from("applications")
          .upsert(
            {
              user_id: auth.userId,
              opportunity_id: oppId,
              stage: "saved",
              sort_order: Date.now(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,opportunity_id", ignoreDuplicates: true }
          )
          .select()
          .maybeSingle();

        if (!appErr && !appData) {
          const existing = await supabase.from("applications").select("*").eq("user_id", auth.userId).eq("opportunity_id", oppId).single();
          if (existing.error) throw existing.error;
          appRecord = existing.data;
        } else if (appErr) {
          console.warn("Could not upsert application record:", appErr.message);
        } else {
          appRecord = appData;
        }

        // Also ensure default 'Saved' collection exists and has this application item
        try {
          let { data: savedColl } = await supabase
            .from("opportunity_collections")
            .select("id")
            .eq("user_id", auth.userId)
            .ilike("name", "Saved")
            .maybeSingle();

          if (!savedColl) {
            const { data: createdColl } = await supabase
              .from("opportunity_collections")
              .insert({ user_id: auth.userId, name: "Saved" })
              .select("id")
              .maybeSingle();
            savedColl = createdColl;
          }

          if (savedColl && appRecord) {
            await supabase
              .from("opportunity_collection_items")
              .upsert(
                {
                  collection_id: savedColl.id,
                  application_id: appRecord.id,
                  user_id: auth.userId,
                },
                { onConflict: "collection_id,application_id" }
              );
          }
        } catch (collErr) {
          console.warn("Could not auto-add to Saved collection:", collErr);
        }
      } catch (e) {
        console.error("Error creating saved application:", e);
      }

      if (!appRecord) {
        return NextResponse.json({
          error: "Opportunity saved, but failed to save application",
          opportunity: savedOpp,
          application: null,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        opportunity: savedOpp,
        application: appRecord,
      });
    }

    return NextResponse.json(
      { error: "Invalid mode. Use 'url', 'text', or 'save'." },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

interface IngestResponse extends ExtractionResult {
  source_url: string | null;
  final_url: string | null;
  content_type: string | null;
}
