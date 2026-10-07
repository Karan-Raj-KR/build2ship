"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, X, FolderHeart, Compass, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { CataloguePickerItem } from "@/lib/compare/types";

interface OpportunityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  excludeIds: string[];
  replaceTitle?: string | null;
}

export function OpportunityPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludeIds,
  replaceTitle,
}: OpportunityPickerModalProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"browse" | "saved">("browse");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CataloguePickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: search.trim(),
        view,
        page: page.toString(),
        limit: "6",
        exclude: excludeIds.join(","),
      });

      const res = await fetch(`/api/compare?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load opportunities from catalogue");
      const data = await res.json();

      if (data.picker) {
        setItems(data.picker.items || []);
        setTotal(data.picker.total || 0);
        setTotalPages(data.picker.totalPages || 1);
      }
    } catch (err: unknown) {
      console.error("Picker load error:", err);
      setError("Unable to load catalogue records. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [isOpen, search, view, page, excludeIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Reset page when switching views or search
  const handleViewChange = (newView: "browse" | "saved") => {
    setView(newView);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      className="fixed inset-0 z-50 bg-[rgba(28,25,41,0.55)] backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="card w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#EAE6DF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE6DF] flex items-center justify-between gap-4 bg-[var(--surface-subtle)]">
          <div>
            <h2 id="picker-title" className="text-base font-bold text-[var(--ink)]">
              {replaceTitle ? `Replace "${replaceTitle}"` : "Add Opportunity to Comparison"}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Select up to 3 opportunities to evaluate eligibility, benefits, and requirements side by side.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close opportunity picker"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[#EAE6DF]/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Tabs & Search */}
        <div className="p-4 border-b border-[#EAE6DF] space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-[var(--surface-subtle)] p-1 border border-[#EAE6DF] text-xs">
              <button
                type="button"
                onClick={() => handleViewChange("browse")}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  view === "browse"
                    ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Browse Catalogue
              </button>
              <button
                type="button"
                onClick={() => handleViewChange("saved")}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  view === "saved"
                    ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                Saved Applications
              </button>
            </div>
            <span className="text-xs text-[var(--muted)] ml-auto hidden sm:inline">
              {total} available to compare
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by opportunity title or organiser..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--surface-subtle)] border border-[#EAE6DF] rounded-xl text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[#285C48] focus:bg-white transition"
              autoFocus
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[280px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[#285C48] mb-2" />
              <p className="text-xs">Loading catalogue records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
              <p className="text-xs text-rose-700 font-medium max-w-sm">{error}</p>
              <button
                onClick={fetchItems}
                className="mt-3 btn btn-secondary btn-sm text-xs"
              >
                Retry Search
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--muted)]">
              <p className="text-sm font-medium text-[var(--ink)]">No matching opportunities found</p>
              <p className="text-xs max-w-xs mt-1">
                {view === "saved"
                  ? "You have no saved applications that aren't already selected."
                  : "Try clearing your search term or browsing all published opportunities."}
              </p>
            </div>
          ) : (
            items.map((item) => {
              const verdictBg =
                item.eligibility_verdict === "likely_eligible"
                  ? "bg-[#C5F36B]/20 text-[#2B5400] border-[#C5F36B]/50"
                  : item.eligibility_verdict === "likely_ineligible"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-800 border-amber-200";

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-[#EAE6DF] hover:border-[#C7DCBC] hover:bg-[#FAF9F5] transition flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        {item.category?.replace("_", " ") || "Opportunity"}
                      </span>
                      {item.is_demo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                          Demo Data
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${verdictBg}`}
                      >
                        {item.eligibility_label}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] ml-auto hidden sm:inline">
                        {item.deadline_label}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate group-hover:text-[#285C48] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                      {item.organizer}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className="shrink-0 btn btn-primary btn-sm text-xs py-1.5 px-3 flex items-center gap-1 shadow-xs"
                  >
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer: Pagination & Limit Notice */}
        <div className="p-3.5 sm:p-4 border-t border-[#EAE6DF] bg-[var(--surface-subtle)] flex items-center justify-between gap-3 text-xs">
          <span className="text-[var(--muted)] text-[11px]">
            Max 3 selections at a time. Selected cards update automatically.
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[#EAE6DF] bg-white text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-[var(--muted)] text-[11px] px-1">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[#EAE6DF] bg-white text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
