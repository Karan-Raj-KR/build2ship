"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, Plus, X, RefreshCw, ArrowRight, Loader2, Compass } from "lucide-react";
import { ComparedOpportunityItem, ComparisonGoal } from "@/lib/compare/types";
import { ComparisonMatrix } from "@/components/compare/ComparisonMatrix";
import { DecisionSummary } from "@/components/compare/DecisionSummary";
import { OpportunityPickerModal } from "@/components/compare/OpportunityPickerModal";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const rawIds = searchParams.get("ids");
    if (rawIds) {
      return rawIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    return [];
  });

  const [items, setItems] = useState<ComparedOpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<ComparisonGoal>("best_fit");

  // Modal Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<{ id: string; index: number; title: string } | null>(null);

  // Synchronize URL when selectedIds change
  const syncUrl = useCallback(
    (ids: string[]) => {
      const currentParams = new URLSearchParams(window.location.search);
      if (ids.length > 0) {
        currentParams.set("ids", ids.join(","));
      } else {
        currentParams.delete("ids");
      }
      const newUrl = `${window.location.pathname}${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  // Load evaluated items whenever selectedIds change
  const loadComparison = useCallback(async (idsToFetch: string[]) => {
    if (idsToFetch.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/compare?ids=${idsToFetch.join(",")}`);
      if (!res.ok) throw new Error("Failed to load comparison data");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error("Error loading comparison:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: if no IDs in URL, fetch initial 2 opportunities to seed comparison
  useEffect(() => {
    async function init() {
      const urlIds = searchParams.get("ids");
      if (urlIds) {
        const parsed = urlIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3);
        if (parsed.length > 0) {
          setSelectedIds(parsed);
          await loadComparison(parsed);
          return;
        }
      }

      // Fetch default 2 opportunities from catalogue
      try {
        const res = await fetch("/api/compare?view=browse&limit=2");
        if (res.ok) {
          const data = await res.json();
          if (data.picker?.items && data.picker.items.length >= 2) {
            const initial = [data.picker.items[0].id, data.picker.items[1].id];
            setSelectedIds(initial);
            syncUrl(initial);
            await loadComparison(initial);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to seed initial comparison:", e);
      }
      setLoading(false);
    }

    init();
  }, [searchParams, loadComparison, syncUrl]);

  // Handle Remove
  const handleRemove = (idToRemove: string) => {
    const nextIds = selectedIds.filter((id) => id !== idToRemove);
    setSelectedIds(nextIds);
    syncUrl(nextIds);
    loadComparison(nextIds);
  };

  // Handle Replace Initiation
  const handleStartReplace = (idToReplace: string, index: number) => {
    const item = items.find((i) => i.opportunity.id === idToReplace);
    setReplacingSlot({
      id: idToReplace,
      index,
      title: item?.opportunity.title || "Selected Opportunity",
    });
    setPickerOpen(true);
  };

  // Handle Selection from Picker Modal
  const handlePickerSelect = (newOppId: string) => {
    if (replacingSlot) {
      const nextIds = [...selectedIds];
      nextIds[replacingSlot.index] = newOppId;
      setSelectedIds(nextIds);
      syncUrl(nextIds);
      loadComparison(nextIds);
      setReplacingSlot(null);
    } else {
      if (selectedIds.length >= 3) return;
      const nextIds = [...selectedIds, newOppId];
      setSelectedIds(nextIds);
      syncUrl(nextIds);
      loadComparison(nextIds);
    }
  };

  // Handle Toggle Save
  const handleToggleSave = async (oppId: string) => {
    setSavingId(oppId);
    try {
      const item = items.find((i) => i.opportunity.id === oppId);
      const isCurrentlySaved = Boolean(item?.application_stage);

      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it.opportunity.id === oppId
            ? { ...it, application_stage: isCurrentlySaved ? null : "saved" }
            : it
        )
      );

      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (isCurrentlySaved) {
          await supabase
            .from("applications")
            .delete()
            .eq("user_id", user.id)
            .eq("opportunity_id", oppId);
        } else {
          await supabase
            .from("applications")
            .insert({ user_id: user.id, opportunity_id: oppId, stage: "saved" });
        }
      }
    } catch (err) {
      console.error("Save toggle failed:", err);
      // Re-fetch comparison to rollback
      loadComparison(selectedIds);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page-frame text-[var(--ink)] space-y-6">
      {/* 1. Compact Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b-2 border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shrink-0 shadow-[0_3px_0_#46A302]">
            <Scale className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
                Compare Opportunities
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02] font-black">
                {selectedIds.length}/3 selected
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
              Check requirements, benefits, and effort side by side.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length < 3 && (
            <button
              type="button"
              onClick={() => {
                setReplacingSlot(null);
                setPickerOpen(true);
              }}
              className="btn btn-primary btn-sm text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Add Opportunity</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Selected Opportunities Bar (Chips / Compact Cards) */}
      <section aria-label="Selected opportunities for comparison" className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">
            Selected Opportunities ({selectedIds.length} of 3 maximum)
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                syncUrl([]);
                setItems([]);
              }}
              className="text-xs font-bold text-[var(--ink-muted)] hover:text-[#D93B3B] transition cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item, index) => (
            <div
              key={item.opportunity.id}
              className="bg-white border-2 border-[var(--border)] rounded-2xl p-4 shadow-[0_3px_0_#E3E7EA] hover:border-[#1CB0F6] transition flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F9FA] border border-[var(--border)] text-[var(--ink-muted)]">
                    {item.opportunity.category?.replace("_", " ") || "Opportunity"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartReplace(item.opportunity.id, index)}
                      title={`Replace ${item.opportunity.title}`}
                      className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[#1CB0F6] hover:bg-[#DDF4FF] transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.opportunity.id)}
                      title={`Remove ${item.opportunity.title}`}
                      className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[#D93B3B] hover:bg-[#FFE5E5] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-black text-[var(--ink)] line-clamp-1">
                  {item.opportunity.title}
                </h3>
                <p className="text-xs font-semibold text-[var(--ink-muted)] truncate mt-0.5">
                  {item.opportunity.organizer || "Unknown Organizer"}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-2.5 border-t-2 border-[var(--border)] font-bold">
                <span className="text-[var(--ink-muted)]">{item.deadline_info.label}</span>
                <span
                  className={`font-black ${
                    item.eligibility.verdict === "likely_eligible"
                      ? "text-[#287300]"
                      : item.eligibility.verdict === "likely_ineligible"
                      ? "text-[#D93B3B]"
                      : "text-[#8A5200]"
                  }`}
                >
                  {item.eligibility.verdict_label}
                </span>
              </div>
            </div>
          ))}

          {/* Add Opportunity Slot if < 3 */}
          {selectedIds.length < 3 && (
            <button
              type="button"
              onClick={() => {
                setReplacingSlot(null);
                setPickerOpen(true);
              }}
              className="bg-[#F7F9FA] border-2 border-dashed border-[#1CB0F6] hover:bg-[#DDF4FF]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[95px] group transition active:translate-y-0.5"
            >
              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#1CB0F6] flex items-center justify-center text-[#1CB0F6] group-hover:scale-105 transition-transform shadow-[0_2px_0_#1899D6]">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black text-[var(--ink)] group-hover:text-[#1CB0F6]">
                Add Opportunity
              </span>
              <span className="text-[11px] font-bold text-[var(--ink-muted)]">
                {3 - selectedIds.length} slot{3 - selectedIds.length > 1 ? "s" : ""} remaining
              </span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Main Comparison Area */}
      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center text-[var(--muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[#285C48] mb-3" />
          <p className="text-sm font-medium text-[var(--ink)]">Evaluating opportunities side by side...</p>
          <p className="text-xs mt-1">Cross-referencing verified eligibility, costs, deadlines, and requirements.</p>
        </div>
      ) : selectedIds.length === 0 ? (
        /* Empty State (0 Selected) */
        <div className="card p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-3 border border-[#EAE6DF] bg-white shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E9F1E4] border border-[#C7DCBC] flex items-center justify-center text-[#285C48]">
            <Scale className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--ink)]">
            No opportunities selected for comparison
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Select 2 or 3 opportunities from your saved applications or the catalogue to evaluate eligibility, deadlines, effort, and benefits side by side.
          </p>
          <button
            type="button"
            onClick={() => {
              setReplacingSlot(null);
              setPickerOpen(true);
            }}
            className="btn btn-primary btn-sm text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Browse Catalogue to Add</span>
          </button>
        </div>
      ) : selectedIds.length === 1 ? (
        /* Single Opportunity State (1 Selected) - Do NOT force a winner! */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#EAE6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#EAE6DF] flex items-center justify-center text-[#285C48]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                  Add another opportunity to compare side by side
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Full side-by-side matrices and recommendation trade-offs require at least 2 opportunities.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReplacingSlot(null);
                setPickerOpen(true);
              }}
              className="btn btn-primary btn-sm text-xs shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add second opportunity</span>
            </button>
          </div>

          {/* Single Item Full Detail Card */}
          {items[0] && (
            <div className="card p-5 border border-[#EAE6DF] space-y-4 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#EAE6DF] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    {items[0].opportunity.category?.replace("_", " ")}
                  </span>
                  <h2 className="text-lg font-bold text-[var(--ink)] mt-1">
                    {items[0].opportunity.title}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {items[0].opportunity.organizer}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/workspace/${items[0].opportunity.id}`}
                    className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                  >
                    <span>Prepare Application</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/opportunities/${items[0].opportunity.id}`}
                    className="btn btn-secondary btn-sm text-xs"
                  >
                    Full Details
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[#EAE6DF]">
                  <span className="text-[11px] text-[var(--muted)] block">Eligibility Status</span>
                  <span className="font-semibold text-[var(--ink)] mt-0.5 block">
                    {items[0].eligibility.verdict_label}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[#EAE6DF]">
                  <span className="text-[11px] text-[var(--muted)] block">Funding / Award</span>
                  <span className="font-semibold text-[var(--ink)] mt-0.5 block">
                    {items[0].funding_info.display_amount} ({items[0].funding_info.kind_label})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[#EAE6DF]">
                  <span className="text-[11px] text-[var(--muted)] block">Upcoming Deadline</span>
                  <span className="font-semibold text-[var(--ink)] mt-0.5 block">
                    {items[0].deadline_info.formattedDeadline} ({items[0].deadline_info.label})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2 or 3 Selections: Render Decision Summary and Shared Comparison Matrix */
        <div className="space-y-6">
          <DecisionSummary
            items={items}
            selectedGoal={selectedGoal}
            onGoalChange={setSelectedGoal}
          />

          <ComparisonMatrix
            items={items}
            onRemove={handleRemove}
            onReplace={handleStartReplace}
            onToggleSave={handleToggleSave}
            savingId={savingId}
          />
        </div>
      )}

      {/* 4. Searchable Picker Modal */}
      <OpportunityPickerModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setReplacingSlot(null);
        }}
        onSelect={handlePickerSelect}
        excludeIds={replacingSlot ? selectedIds.filter((id) => id !== replacingSlot.id) : selectedIds}
        replaceTitle={replacingSlot?.title}
      />
    </div>
  );
}
