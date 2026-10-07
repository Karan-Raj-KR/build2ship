"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  X,
  ExternalLink,
  Clock,
  MapPin,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  FileText,
  HelpCircle,
  Sparkles,
  Scale,
} from "lucide-react";
import { ForYouItem } from "@/lib/recommendations/forYouEngine";

interface OpportunityDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: ForYouItem | null;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenGapUpdater?: (gapText: string) => void;
}

export function OpportunityDetailSheet({
  isOpen,
  onClose,
  item,
  isSaved,
  onToggleSave,
  onOpenGapUpdater,
}: OpportunityDetailSheetProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const { opportunity, eligibility_summary } = item;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[rgba(24,20,38,0.55)] backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl max-h-[85dvh] md:max-h-[88dvh] overflow-y-auto rounded-t-3xl md:rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-main)] p-5 md:p-6 shadow-lift text-[var(--ink)] flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-[var(--line)] rounded-full mx-auto md:hidden -mt-1 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)] font-semibold capitalize">
                {opportunity.category}
              </span>
              {opportunity.participation_mode && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--ink-muted)] border border-[var(--line)]">
                  {opportunity.participation_mode}
                </span>
              )}
              <span className="text-xs text-[var(--ink-muted)] flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                {item.deadline_urgency.label}
              </span>
            </div>

            <h2 id="detail-sheet-title" className="text-xl md:text-2xl font-bold tracking-tight text-[var(--ink)] leading-snug">
              {opportunity.title}
            </h2>
            <p className="text-sm text-[var(--ink-muted)] font-medium">
              {opportunity.organizer} {opportunity.location ? `· ${opportunity.location}` : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[var(--line)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition shrink-0"
            aria-label="Close opportunity details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits banner */}
        <div className="p-3.5 rounded-xl bg-[rgba(197,243,107,0.22)] border border-[#A7DE40] text-[#1F3800] text-xs flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#1F3800] shrink-0" />
          <div>
            <strong className="font-semibold block">{item.benefit_funding.amount_label || "Funded Opportunity"}</strong>
            <span>{item.benefit_funding.description}</span>
          </div>
        </div>

        {/* Overview description */}
        {opportunity.summary && (
          <div className="space-y-1.5 text-xs">
            <h3 className="font-bold text-[var(--ink)] text-sm">Program Overview</h3>
            <p className="text-[var(--ink-muted)] leading-relaxed">{opportunity.summary}</p>
          </div>
        )}

        {/* Eligibility Details */}
        <div className="space-y-3 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#285C48]" />
              <h3 className="font-bold text-[var(--ink)] text-sm">Eligibility Assessment</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                eligibility_summary.verdict === "likely_eligible"
                  ? "bg-[rgba(197,243,107,0.3)] text-[#1F3800] border border-[#A7DE40]"
                  : eligibility_summary.verdict === "likely_ineligible"
                  ? "bg-[#FFF0F4] text-[#9E1B38] border border-[#F8C8D4]"
                  : "bg-[#FEF7E6] text-[#8A4306] border border-[#F6DDA5]"
              }`}
            >
              {eligibility_summary.verdict.replace("_", " ")}
            </span>
          </div>

          {/* Reasons */}
          <div className="space-y-1">
            <span className="font-semibold text-[var(--ink)]">Matching Profile Evidence:</span>
            <ul className="space-y-1 pl-4 list-disc marker:text-[#285C48] text-[var(--ink-muted)]">
              {item.recommendation_reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Gaps / Questions */}
          {item.specific_gaps.length > 0 && (
            <div className="pt-2 border-t border-[var(--line)] space-y-2">
              <span className="font-semibold text-[#8A4306] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#8A4306]" /> Specific Requirements to Verify:
              </span>
              <ul className="space-y-1 pl-4 list-disc marker:text-[#8A4306] text-[var(--ink-muted)]">
                {item.specific_gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
              {onOpenGapUpdater && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenGapUpdater(item.specific_gaps[0]);
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-[#285C48] font-semibold hover:underline"
                >
                  <Sparkles className="w-3 h-3" /> Update Profile / Add Evidence to Qualify
                </button>
              )}
            </div>
          )}
        </div>

        {/* Application details & steps */}
        <div className="space-y-3 text-xs">
          <h3 className="font-bold text-[var(--ink)] text-sm">Application Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-main)]">
              <span className="text-[var(--ink-muted)] block mb-0.5 font-medium">Official Source</span>
              <span className="font-semibold text-[var(--ink)] block truncate">
                {opportunity.organizer || "Verified Organization"}
              </span>
              {opportunity.official_url && (
                <a
                  href={opportunity.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-[#285C48] hover:underline flex items-center gap-1 text-[11px]"
                >
                  Visit Official Portal <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface-main)]">
              <span className="text-[var(--ink-muted)] block mb-0.5 font-medium">Deadline & Timezone</span>
              <span className="font-semibold text-[var(--ink)] block">
                {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString(undefined, { dateStyle: "long" }) : "Rolling / Open"}
              </span>
              <span className="text-[11px] text-[var(--ink-muted)]">
                {opportunity.timezone_known ? (opportunity.deadline_timezone || "Local Organizer Timezone") : "Timezone estimated"}
              </span>
            </div>
          </div>
        </div>

        {/* Action zone */}
        <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3 mt-auto">
          <button
            onClick={() => onToggleSave(opportunity.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[44px] ${
              isSaved
                ? "bg-[rgba(197,243,107,0.25)] border-[#A7DE40] text-[#1F3800]"
                : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-interactive)] border-[var(--line)] text-[var(--ink)]"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#1F3800]" />
                <span>Saved in Workspace</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-[var(--ink-muted)]" />
                <span>Save Opportunity</span>
              </>
            )}
          </button>

          <Link
            href={`/compare?ids=${opportunity.id}`}
            className="btn btn-secondary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
            title="Compare with other opportunities"
          >
            <Scale className="w-4 h-4 text-[#285C48]" />
            <span className="hidden sm:inline">Compare</span>
          </Link>

          <Link
            href={`/opportunities/${opportunity.id}`}
            className="flex-1 btn btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <span>Start Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
