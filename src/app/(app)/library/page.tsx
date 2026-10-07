"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bookmark, FolderPlus, Trash2, Folder, ArrowRight, X, Compass, CheckCircle2 } from "lucide-react";
import { IS_DEMO_MODE } from "@/config/app";
import { demoStore } from "@/lib/demo/store";
import type { ApplicationWithOpportunity, OpportunityCollection } from "@/types/database";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { formatDeadline } from "@/lib/utils";

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<ApplicationWithOpportunity[]>([]);
  const [collections, setCollections] = useState<OpportunityCollection[]>([]);
  const [items, setItems] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const load = useCallback(async () => {
    if (IS_DEMO_MODE) {
      const demoApps = demoStore
        .getApplications()
        .map((app) => ({
          ...app,
          opportunities:
            demoStore.getOpportunity(app.opportunity_id) ??
            demoStore.getImportedOpportunity(app.opportunity_id)!,
        }))
        .filter((app) => app.opportunities) as ApplicationWithOpportunity[];

      setApps(demoApps);
      setLoading(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [applications, collectionData, itemData] = await Promise.all([
        supabase
          .from("applications")
          .select("*, opportunities(*)")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("opportunity_collections")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("opportunity_collection_items")
          .select("collection_id, application_id")
          .eq("user_id", user.id),
      ]);

      setApps((applications.data ?? []) as ApplicationWithOpportunity[]);
      setCollections((collectionData.data ?? []) as OpportunityCollection[]);
      setItems(
        (itemData.data ?? []).reduce<Record<string, string[]>>(
          (result, item) => ({
            ...result,
            [item.collection_id]: [
              ...(result[item.collection_id] ?? []),
              item.application_id,
            ],
          }),
          {}
        )
      );
    } catch (err) {
      console.error("Failed to load library data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load the external store on mount, including the synchronous demo store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function addCollection() {
    const clean = name.trim();
    if (!clean) return;

    // Check duplicate
    if (collections.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      setNotice(`A collection named "${clean}" already exists.`);
      return;
    }

    if (IS_DEMO_MODE) {
      const collection: OpportunityCollection = {
        id: `demo-collection-${Date.now()}`,
        user_id: "demo",
        name: clean,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCollections((all) => [...all, collection]);
      setName("");
      setNotice(`Created folder "${clean}".`);
      return;
    }

    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("opportunity_collections")
      .insert({ user_id: user.id, name: clean })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }
    setCollections((all) => [...all, data]);
    setName("");
    setNotice(`Created folder "${clean}".`);
  }

  async function removeCollection(collection: OpportunityCollection) {
    if (
      !confirm(
        `Delete folder "${collection.name}"? Opportunities and applications will remain safely stored in your Saved folder and Applications board.`
      )
    )
      return;

    if (!IS_DEMO_MODE) {
      const { createClient } = await import("@/lib/db/client");
      const { error } = await createClient()
        .from("opportunity_collections")
        .delete()
        .eq("id", collection.id)
        .eq("user_id", collection.user_id);
      if (error) {
        setNotice(error.message);
        return;
      }
    }
    setCollections((all) => all.filter((item) => item.id !== collection.id));
    setItems((all) => {
      const next = { ...all };
      delete next[collection.id];
      return next;
    });
    setNotice(`Folder "${collection.name}" deleted. Opportunities were kept in Saved.`);
  }

  async function addItem(collection: OpportunityCollection, applicationId: string) {
    if (items[collection.id]?.includes(applicationId)) return;

    if (!IS_DEMO_MODE) {
      const { createClient } = await import("@/lib/db/client");
      const { error } = await createClient()
        .from("opportunity_collection_items")
        .insert({
          collection_id: collection.id,
          application_id: applicationId,
          user_id: collection.user_id,
        });
      if (error) {
        setNotice(error.message);
        return;
      }
    }
    setItems((all) => ({
      ...all,
      [collection.id]: [...(all[collection.id] ?? []), applicationId],
    }));
  }

  async function removeItem(collectionId: string, applicationId: string) {
    if (!IS_DEMO_MODE) {
      const { createClient } = await import("@/lib/db/client");
      await createClient()
        .from("opportunity_collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("application_id", applicationId);
    }
    setItems((all) => ({
      ...all,
      [collectionId]: (all[collectionId] ?? []).filter((id) => id !== applicationId),
    }));
  }

  if (loading) return <PageLoader />;

  // Filter custom collections to exclude any duplicate "Saved" DB row
  const customCollections = collections.filter(
    (c) => c.name.toLowerCase() !== "saved" && c.name.toLowerCase() !== "all saved"
  );

  // Filtered saved apps for search
  const filteredSavedApps = apps.filter((app) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      app.opportunities?.title?.toLowerCase().includes(q) ||
      app.opportunities?.organizer?.toLowerCase().includes(q) ||
      app.opportunities?.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-frame text-[var(--ink)] space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b-2 border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#DDF4FF] border-2 border-[#1CB0F6] flex items-center justify-center text-[#0B72A4] shadow-[0_3px_0_#1899D6]">
            <Bookmark className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">Library</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02] font-black">
                {apps.length} Saved {apps.length === 1 ? "Opportunity" : "Opportunities"}
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
              All saved opportunities live in your permanent Saved folder, ready to organize into decision groups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/workspace"
            className="btn btn-secondary btn-sm text-xs font-bold flex items-center gap-1.5"
          >
            <span>Applications Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/scout"
            className="btn btn-primary btn-sm text-xs font-black flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Find More</span>
          </Link>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] text-xs font-black text-[#287300] shadow-[0_2px_0_#46A302] flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs text-[#287300] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Collection Bar */}
      <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-4 shadow-[0_4px_0_#E3E7EA] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white pr-4"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Create a new folder, e.g. Summer Fellowships, Hackathons 2026..."
            onKeyDown={(e) => e.key === "Enter" && addCollection()}
          />
        </div>
        <button
          onClick={addCollection}
          disabled={!name.trim()}
          className="btn btn-primary btn-sm font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <FolderPlus size={16} strokeWidth={2.5} />
          <span>Create Folder</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. PERMANENT SYSTEM "SAVED" FOLDER (INSTAGRAM-STYLE)        */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="bg-white border-2 border-[#58CC02] rounded-2xl p-5 md:p-6 shadow-[0_4px_0_#46A302] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#58CC02] text-white flex items-center justify-center shadow-[0_2px_0_#46A302] shrink-0">
                <Bookmark className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[var(--ink)]">Saved</h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EEFFD9] text-[#287300] border border-[#58CC02] font-black">
                    Default System Folder
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--ink-muted)]">
                  Every opportunity you save from Ingest, Scout, or Discover automatically lives here.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-[#F7F9FA] text-[var(--ink)] border-2 border-[var(--border)]">
                {apps.length} {apps.length === 1 ? "Opportunity" : "Opportunities"}
              </span>
            </div>
          </div>

          {/* Saved Items List */}
          {apps.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-black text-[var(--ink)]">No saved opportunities yet</p>
              <p className="text-xs font-semibold text-[var(--ink-muted)] max-w-md mx-auto">
                When you click save on any opportunity or import from a URL, it automatically appears here and in your Applications board.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Link href="/ingest" className="btn btn-secondary btn-sm text-xs font-bold">
                  Import an Opportunity
                </Link>
                <Link href="/scout" className="btn btn-primary btn-sm text-xs font-black">
                  Scout Opportunities
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl bg-[#F7F9FA] border-2 border-[var(--border)] hover:border-[#1CB0F6] hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_0_#E3E7EA]"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/workspace/${app.id}`}
                        className="text-sm font-black text-[var(--ink)] hover:text-[#1CB0F6] transition"
                      >
                        {app.opportunities?.title || "Untitled Opportunity"}
                      </Link>
                      {app.opportunities?.organizer && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-[var(--border)] text-[var(--ink-muted)] font-semibold">
                          {app.opportunities.organizer}
                        </span>
                      )}
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#DDF4FF] text-[#0B72A4] border border-[#1CB0F6] capitalize font-black">
                        {app.stage}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-muted)] font-semibold">
                      {app.opportunities?.deadline && (
                        <span>Deadline: <strong className="text-[var(--ink)] font-bold">{formatDeadline(app.opportunities.deadline)}</strong></span>
                      )}
                      {app.opportunities?.funding_description && (
                        <span>Funding: <strong className="text-[var(--ink)] font-bold">{app.opportunities.funding_description}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Link
                      href={`/workspace/${app.id}`}
                      className="btn btn-secondary btn-sm text-xs py-1 px-3 h-auto min-h-0 flex items-center gap-1 font-bold"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. USER-CREATED CUSTOM COLLECTIONS                           */}
      {/* ============================================================ */}
      {customCollections.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">
              Custom Folders ({customCollections.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customCollections.map((collection) => {
              const collectionAppIds = items[collection.id] ?? [];
              const availableToAdd = apps.filter(
                (app) => !collectionAppIds.includes(app.id)
              );

              return (
                <article
                  className="bg-white border-2 border-[var(--border)] rounded-2xl p-5 shadow-[0_4px_0_#E3E7EA] flex flex-col justify-between gap-4"
                  key={collection.id}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#DDF4FF] border border-[#1CB0F6] text-[#0B72A4] flex items-center justify-center shadow-[0_2px_0_#1899D6]">
                          <Folder size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[var(--ink)]">{collection.name}</h3>
                          <p className="text-xs font-semibold text-[var(--ink-muted)]">
                            {collectionAppIds.length} {collectionAppIds.length === 1 ? "opportunity" : "opportunities"}
                          </p>
                        </div>
                      </div>

                      <button
                        aria-label={`Delete ${collection.name}`}
                        onClick={() => removeCollection(collection)}
                        className="text-[var(--ink-muted)] hover:text-[#D93B3B] transition cursor-pointer p-1"
                        title="Delete this custom folder"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Collection items */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                      {collectionAppIds.length === 0 ? (
                        <p className="text-xs text-[var(--ink-muted)] font-semibold italic py-2">
                          No opportunities in this folder yet. Select one below to add.
                        </p>
                      ) : (
                        collectionAppIds.map((appId) => {
                          const app = apps.find((item) => item.id === appId);
                          if (!app) return null;
                          return (
                            <div
                              key={appId}
                              className="p-2.5 rounded-xl bg-[#F7F9FA] border border-[var(--border)] flex items-center justify-between gap-2 text-xs font-bold"
                            >
                              <Link
                                href={`/workspace/${app.id}`}
                                className="text-[var(--ink)] hover:text-[#1CB0F6] truncate"
                              >
                                {app.opportunities?.title || "Untitled"}
                              </Link>
                              <button
                                onClick={() => removeItem(collection.id, appId)}
                                className="text-[var(--ink-muted)] hover:text-[#D93B3B] shrink-0 cursor-pointer"
                                title="Remove from this folder"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Add saved opportunity dropdown */}
                  {availableToAdd.length > 0 && (
                    <select
                      aria-label={`Add opportunity to ${collection.name}`}
                      className="input text-xs font-semibold py-2 rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer mt-1"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addItem(collection, e.target.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    >
                      <option value="">+ Add saved opportunity to {collection.name}…</option>
                      {availableToAdd.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.opportunities?.title || "Untitled"}
                        </option>
                      ))}
                    </select>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
