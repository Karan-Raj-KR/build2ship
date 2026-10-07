// ============================================================
// API: /api/scout/saved — Saved Searches (CRUD)
// Allows users to save natural language + structured Scout queries
// with notification preferences and schedule triggers.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { SavedSearch } from "@/types/database";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch saved searches from DB:", error.message);
      return NextResponse.json({ error: "Failed to load saved searches" }, { status: 500 });
    }

    return NextResponse.json({ savedSearches: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load saved searches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, query_text, structured_query, notify_new_matches = true } = body;

    if (!query_text || typeof query_text !== "string") {
      return NextResponse.json({ error: "query_text is required." }, { status: 400 });
    }

    const payload: Omit<SavedSearch, "id" | "created_at"> = {
      user_id: auth.userId!,
      name: name || query_text.slice(0, 30),
      query_text,
      structured_query: structured_query || {},
      notify_new_matches,
    };

    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("saved_searches")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.warn("Could not insert to saved_searches table:", error?.message);
      return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
    }

    return NextResponse.json({ success: true, savedSearch: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save search" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id param is required" }, { status: 400 });
    }

    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete saved search" },
      { status: 500 }
    );
  }
}
