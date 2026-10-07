"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  X,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  MapPin,
  FileText,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  HelpCircle,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { ComparedOpportunityItem } from "@/lib/compare/types";

interface ComparisonMatrixProps {
  items: ComparedOpportunityItem[];
  onRemove: (id: string) => void;
  onReplace: (id: string, index: number) => void;
  onToggleSave: (id: string) => Promise<void>;
  savingId?: string | null;
}

export function ComparisonMatrix({
  items,
  onRemove,
  onReplace,
  onToggleSave,
  savingId,
}: ComparisonMatrixProps) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    requirements: true,
    relevance: false,
    funding: true,
  });

  const toggleRowExpanded = (rowKey: string) => {
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  // Helper to determine whether a row has differences among items
  const rowDifferences = useMemo(() => {
    if (items.length < 2) return {} as Record<string, boolean>;

    const diffs: Record<string, boolean> = {};

    // 1. Deadline
    diffs.deadline = new Set(items.map((i) => i.deadline_info.formattedDeadline)).size > 1;

    // 2. Eligibility summary
    diffs.eligibility = new Set(items.map((i) => i.eligibility.verdict)).size > 1;

    // 3. Requirements breakdown
    diffs.requirements =
      new Set(items.map((i) => `${i.eligibility.met_criteria.length}-${i.eligibility.failed_criteria.length}-${i.eligibility.unknown_criteria.length}`)).size > 1;

    // 4. Relevance / Fit score
    diffs.relevance = new Set(items.map((i) => i.relevance.fit_score)).size > 1;

    // 5. Funding
    diffs.funding =
      new Set(items.map((i) => `${i.funding_info.kind}-${i.funding_info.display_amount}`)).size > 1;

    // 6. Costs
    diffs.costs = new Set(items.map((i) => i.costs_info.covered)).size > 1;

    // 7. Location & Mode
    diffs.location =
      new Set(items.map((i) => `${i.location_info.mode}-${i.location_info.location_name}`)).size > 1;

    // 8. Duration
    diffs.duration = new Set(items.map((i) => i.duration_info.duration_label)).size > 1;

    // 9. Effort
    diffs.effort = new Set(items.map((i) => i.effort_info.level)).size > 1;

    // 10. Required documents
    diffs.docs = new Set(items.map((i) => i.required_documents.join(","))).size > 1;

    // 11. Main trade-off
    diffs.trade_off = new Set(items.map((i) => i.main_trade_off)).size > 1;

    // 12. Official Source
    diffs.source = new Set(items.map((i) => i.source_info.official_url)).size > 1;

    return diffs;
  }, [items]);

  if (items.length === 0) return null;

  // Equal width columns: if 2 items, 2 equal columns; if 3 items, 3 equal columns
  const columnCount = items.length;

  return (
    <div className="space-y-3">
      {/* Matrix Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Side-by-side Matrix
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            ({items.length} of 3 selected)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {items.length >= 2 && (
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--ink)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDifferencesOnly}
                onChange={(e) => setShowDifferencesOnly(e.target.checked)}
                className="rounded border-[#EAE6DF] text-[#285C48] focus:ring-[#285C48] cursor-pointer"
              />
              <span>Show differences only</span>
            </label>
          )}
          <span className="text-[11px] text-[var(--muted)] hidden md:inline">
            Scroll table horizontally on smaller screens
          </span>
        </div>
      </div>

      {/* Matrix Bounded Scroll Container */}
      <div className="relative rounded-2xl border border-[#EAE6DF] bg-white shadow-xs overflow-hidden">
        {/* Horizontal scroll affordance for mobile */}
        <div className="md:hidden bg-[var(--surface-subtle)] px-3 py-1 text-[11px] text-[var(--muted)] border-b border-[#EAE6DF] flex items-center justify-between">
          <span>← Swipe horizontally to view all columns →</span>
          <span className="font-semibold text-[var(--ink)]">{items.length} columns</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left min-w-[640px] md:min-w-full table-fixed">
            <colgroup>
              <col className="w-44 sm:w-52" />
              {items.map((item) => (
                <col key={item.opportunity.id} style={{ width: `${100 / columnCount}%` }} />
              ))}
            </colgroup>

            {/* Sticky Header: Opportunity Identity */}
            <thead className="bg-white/95 backdrop-blur-xs sticky top-0 z-20 border-b border-[#EAE6DF]">
              <tr>
                <th className="p-3.5 sm:p-4 bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Opportunity
                </th>
                {items.map((item, index) => (
                  <th
                    key={item.opportunity.id}
                    className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top group hover:bg-[#FAF9F5] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[#EAE6DF] text-[var(--muted)]">
                        {item.opportunity.category?.replace("_", " ") || "Opportunity"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onReplace(item.opportunity.id, index)}
                          title={`Replace ${item.opportunity.title}`}
                          className="p-1 rounded-md text-[var(--muted)] hover:text-[#285C48] hover:bg-[#E9F1E4] transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(item.opportunity.id)}
                          title={`Remove ${item.opportunity.title}`}
                          className="p-1 rounded-md text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] line-clamp-2 leading-snug">
                      {item.opportunity.title}
                    </h3>
                    <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                      {item.opportunity.organizer || "Unknown Organizer"}
                    </p>

                    {item.is_demo && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium border border-gray-200">
                        Demo Record
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EAE6DF] text-xs">
              {/* ROW 1: Status & Deadline */}
              {(!showDifferencesOnly || rowDifferences.deadline) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Deadline & Status</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-xs ${
                              item.deadline_info.status === "urgent" || item.deadline_info.status === "closes_today"
                                ? "text-rose-600"
                                : item.deadline_info.status === "closed"
                                ? "text-gray-500"
                                : "text-[var(--ink)]"
                            }`}
                          >
                            {item.deadline_info.formattedDeadline}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--muted)] border border-[#EAE6DF]">
                            {item.deadline_info.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)]">
                          {item.deadline_info.timezone}
                        </p>
                        {item.deadline_info.warning && (
                          <p className="text-[11px] text-amber-800 font-medium">
                            {item.deadline_info.warning}
                          </p>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 2: Eligibility Summary */}
              {(!showDifferencesOnly || rowDifferences.eligibility) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Eligibility Summary</span>
                    </div>
                  </td>
                  {items.map((item) => {
                    const verdictColor =
                      item.eligibility.verdict === "likely_eligible"
                        ? "bg-[#C5F36B]/30 text-[#2B5400] border-[#C5F36B]/60"
                        : item.eligibility.verdict === "likely_ineligible"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200";

                    return (
                      <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                        <div className="space-y-1.5">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${verdictColor}`}>
                            {item.eligibility.verdict_label}
                          </span>
                          <p className="text-[11px] text-[var(--muted)]">
                            {item.eligibility.met_criteria.length} met · {item.eligibility.failed_criteria.length} failed · {item.eligibility.unknown_criteria.length} unknown
                          </p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* ROW 3: Requirements Met / Failed / Unknown (Expandable) */}
              {(!showDifferencesOnly || rowDifferences.requirements) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <button
                      type="button"
                      onClick={() => toggleRowExpanded("requirements")}
                      className="flex items-center gap-1.5 text-left text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Requirements Breakdown</span>
                      {expandedRows.requirements ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-2">
                        {/* Met criteria */}
                        {item.eligibility.met_criteria.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-[#2B5400] uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Met ({item.eligibility.met_criteria.length})
                            </span>
                            <ul className="space-y-0.5">
                              {(expandedRows.requirements ? item.eligibility.met_criteria : item.eligibility.met_criteria.slice(0, 1)).map((crit, i) => (
                                <li key={i} className="text-[11px] text-[var(--ink)] flex items-start gap-1">
                                  <span className="text-[#2B5400]">•</span>
                                  <span>{crit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Failed criteria */}
                        {item.eligibility.failed_criteria.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                              <X className="w-3 h-3" /> Ineligible / Failed ({item.eligibility.failed_criteria.length})
                            </span>
                            <ul className="space-y-0.5">
                              {item.eligibility.failed_criteria.map((crit, i) => (
                                <li key={i} className="text-[11px] text-rose-800 flex items-start gap-1">
                                  <span className="text-rose-600">•</span>
                                  <span>{crit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Unknown criteria */}
                        {item.eligibility.unknown_criteria.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" /> Unverified / Unknown ({item.eligibility.unknown_criteria.length})
                            </span>
                            <ul className="space-y-0.5">
                              {(expandedRows.requirements ? item.eligibility.unknown_criteria : item.eligibility.unknown_criteria.slice(0, 1)).map((crit, i) => (
                                <li key={i} className="text-[11px] text-amber-900 flex items-start gap-1">
                                  <span className="text-amber-700">•</span>
                                  <span>{crit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 4: Personal Relevance & Signals */}
              {(!showDifferencesOnly || rowDifferences.relevance) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <button
                      type="button"
                      onClick={() => toggleRowExpanded("relevance")}
                      className="flex items-center gap-1.5 text-left text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Relevance & Fit</span>
                      {expandedRows.relevance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--ink)]">
                            Fit Score: {item.relevance.fit_score}/100
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] leading-normal">
                          {item.relevance.score_basis}
                        </p>
                        <div className="pt-1">
                          <ul className="space-y-1">
                            {(expandedRows.relevance ? item.relevance.reasons : item.relevance.reasons.slice(0, 2)).map((r, i) => (
                              <li key={i} className="text-[11px] text-[var(--ink)] flex items-start gap-1">
                                <span className="text-[#285C48]">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 5: Funding / Benefit Type & Amount (Strict Prize Pool vs Stipend Distinction) */}
              {(!showDifferencesOnly || rowDifferences.funding) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Funding & Compensation</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold ${
                              item.funding_info.kind === "stipend"
                                ? "text-[#2B5400]"
                                : item.funding_info.kind === "prize"
                                ? "text-[#285C48]"
                                : "text-[var(--ink)]"
                            }`}
                          >
                            {item.funding_info.display_amount}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[#EAE6DF] text-[var(--muted)] font-medium">
                            {item.funding_info.kind_label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                          {item.funding_info.notes}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 6: Costs and What is Not Covered */}
              {(!showDifferencesOnly || rowDifferences.costs) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    Costs & Exclusions
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1 text-[11px]">
                        <p className="text-[var(--ink)]">
                          <strong className="text-[var(--muted)] font-medium">Covered: </strong>
                          {item.costs_info.covered}
                        </p>
                        <p className="text-[var(--muted)]">
                          <strong className="text-[var(--muted)] font-medium">Not covered: </strong>
                          {item.costs_info.not_covered}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 7: Location & Delivery Mode */}
              {(!showDifferencesOnly || rowDifferences.location) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Location & Mode</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[var(--ink)] block">
                          {item.location_info.mode_label} ({item.location_info.location_name})
                        </span>
                        <p className="text-[11px] text-[var(--muted)]">
                          {item.location_info.travel_requirements}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 8: Duration / Time Commitment */}
              {(!showDifferencesOnly || rowDifferences.duration) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Duration & Time</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[var(--ink)] block">
                          {item.duration_info.duration_label}
                        </span>
                        <p className="text-[11px] text-[var(--muted)]">
                          {item.duration_info.time_commitment}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 9: Application Effort & Basis */}
              {(!showDifferencesOnly || rowDifferences.effort) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    Application Effort
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[var(--ink)] block">
                          {item.effort_info.level_label}
                        </span>
                        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                          Basis: {item.effort_info.basis}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 10: Required Documents */}
              {(!showDifferencesOnly || rowDifferences.docs) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Required Documents</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top">
                      <ul className="space-y-1 text-[11px] text-[var(--ink)]">
                        {item.required_documents.map((doc, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] shrink-0" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 11: Main Trade-off */}
              {(!showDifferencesOnly || rowDifferences.trade_off) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors bg-[#FEF7E6]/30">
                  <td className="p-3.5 sm:p-4 font-semibold text-[#8A5800] bg-[#FEF7E6]/60 border-r border-[#EAE6DF] align-top">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-[#8A5800]" />
                      <span>Main Trade-off</span>
                    </div>
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top text-xs text-[#8A5800] leading-relaxed">
                      {item.main_trade_off}
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 12: Source & Last Checked */}
              {(!showDifferencesOnly || rowDifferences.source) && (
                <tr className="hover:bg-[#FAF9F5]/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-top">
                    Official Source
                  </td>
                  {items.map((item) => (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-top text-xs">
                      <div className="space-y-1">
                        {item.source_info.official_url ? (
                          <a
                            href={item.source_info.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#285C48] hover:underline font-medium flex items-center gap-1"
                          >
                            <span>Visit Official Announcement</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[var(--muted)]">Source URL not stated</span>
                        )}
                        <p className="text-[11px] text-[var(--muted)]">
                          Last checked: {item.source_info.last_verified} ({item.source_info.source_status})
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* ROW 13: Actions (Save, View Details, Prepare Application) */}
              <tr className="bg-[var(--surface-subtle)]">
                <td className="p-3.5 sm:p-4 font-semibold text-[var(--muted)] bg-[var(--surface-subtle)] border-r border-[#EAE6DF] align-middle">
                  Actions
                </td>
                {items.map((item) => {
                  const isSaved = Boolean(item.application_stage);
                  const isBusy = savingId === item.opportunity.id;

                  return (
                    <td key={item.opportunity.id} className="p-3.5 sm:p-4 border-r border-[#EAE6DF] last:border-r-0 align-middle">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/workspace/${item.opportunity.id}`}
                          className="btn btn-primary btn-sm text-xs justify-center flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Prepare Application</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/opportunities/${item.opportunity.id}`}
                            className="btn btn-secondary btn-sm text-xs flex-1 justify-center text-center"
                          >
                            View Details
                          </Link>

                          <button
                            type="button"
                            onClick={() => onToggleSave(item.opportunity.id)}
                            disabled={isBusy}
                            title={isSaved ? "Saved to your applications" : "Save opportunity"}
                            className={`p-2 rounded-xl border text-xs flex items-center justify-center transition cursor-pointer ${
                              isSaved
                                ? "bg-[#E9F1E4] text-[#285C48] border-[#C7DCBC]"
                                : "bg-white text-[var(--muted)] border-[#EAE6DF] hover:text-[var(--ink)]"
                            }`}
                          >
                            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
