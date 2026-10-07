"use client";

import Link from "next/link";
import { Bookmark, Check, MapPin, DollarSign, Calendar, Sparkles } from "lucide-react";
import { Opportunity } from "@/types/database";
import { categoryLabel, participationModeLabel } from "@/lib/utils";
import { resolveOpportunityStatus, formatDeadlineDisplay } from "@/lib/opportunityStatus";
import { Badge } from "./Badge";

interface OpportunityCardProps {
  opportunity: Opportunity;
  applicationStage?: string;
  onPreview?: () => void;
  onSave?: () => void;
  saving?: boolean;
  selectedForCompare?: boolean;
  onCompare?: () => void;
  onHide?: () => void;
  reasons?: string[];
  variant?: "compact" | "standard" | "feed" | "comparison";
}

const categoryVariant: Record<string, "blue" | "green" | "yellow" | "purple" | "default"> = {
  hackathon: "blue",
  fellowship: "purple",
  scholarship: "green",
  internship: "yellow",
  grant: "green",
  other: "default",
};

export function OpportunityCard({
  opportunity,
  applicationStage,
  onPreview,
  onSave,
  saving,
  selectedForCompare,
  onCompare,
  onHide,
  reasons = [],
  variant = "standard",
}: OpportunityCardProps) {
  const status = resolveOpportunityStatus(
    opportunity.deadline,
    opportunity.source_status,
    opportunity.timezone_known
  );

  const content = (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {opportunity.is_demo && <Badge variant="yellow">Demo</Badge>}
          {opportunity.category && (
            <Badge variant={categoryVariant[opportunity.category] ?? "default"}>
              {categoryLabel(opportunity.category)}
            </Badge>
          )}
          {variant !== "compact" && opportunity.participation_mode && (
            <Badge variant="gray">
              {participationModeLabel(opportunity.participation_mode)}
            </Badge>
          )}
        </div>

        <div className="text-right shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border-2 ${
              status.isClosed
                ? "bg-gray-100 text-gray-500 border-gray-200"
                : "bg-[#FFF5E0] text-[#966100] border-[#FCD68A]"
            }`}
          >
            <Calendar size={12} />
            <span>
              {opportunity.deadline
                ? status.isClosed
                  ? "Closed"
                  : formatDeadlineDisplay(opportunity.deadline, opportunity.timezone_known)
                : "Open"}
            </span>
          </div>
        </div>
      </div>

      <h3 className="font-extrabold text-[var(--ink)] text-base leading-snug line-clamp-2 group-hover:text-[#1CB0F6] transition-colors">
        {opportunity.title}
      </h3>

      {opportunity.organizer && (
        <p className="text-xs font-bold text-[var(--muted)] mt-1">
          {opportunity.organizer}
        </p>
      )}

      {variant !== "compact" && (
        <div className="flex items-center gap-3 flex-wrap mt-3 text-xs font-semibold text-[var(--muted)]">
          {opportunity.location && (
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-[var(--subtle)]" />
              {opportunity.location}
            </span>
          )}
          {opportunity.funding_kind && opportunity.funding_kind !== "unknown" && (
            <span className="flex items-center gap-1">
              <DollarSign size={13} className="text-[#58CC02]" />
              {opportunity.funding_kind === "cost" ? "Requires fee" : opportunity.funding_kind}
            </span>
          )}
        </div>
      )}

      {variant !== "compact" && reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {reasons.slice(0, 2).map((reason) => (
            <span
              key={reason}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#DDF4FF] text-[#0E74A6] border border-[#99DAFC]"
            >
              <Sparkles size={11} />
              {reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const cardClasses = `card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] hover:border-[#1CB0F6] hover:shadow-[0_4px_0_#1CB0F6] transition-all bg-white group block`;

  if (!onPreview) {
    return (
      <Link href={`/opportunities/${opportunity.id}`} className={cardClasses}>
        {content}
      </Link>
    );
  }

  return (
    <article className={cardClasses}>
      <button className="text-left w-full cursor-pointer" onClick={onPreview}>
        {content}
      </button>

      <div className="mt-4 pt-3.5 border-t-2 border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
        <button
          className={`btn btn-sm ${
            applicationStage ? "btn-secondary" : "btn-primary"
          }`}
          disabled={saving || status.isClosed || !!applicationStage}
          onClick={onSave}
        >
          {applicationStage ? (
            <>
              <Check size={14} className="text-[#58CC02]" /> {applicationStage}
            </>
          ) : (
            <>
              <Bookmark size={14} /> {saving ? "Saving…" : "Save"}
            </>
          )}
        </button>

        {(onCompare || onHide) && (
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {onCompare && (
              <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={selectedForCompare}
                  onChange={onCompare}
                  className="rounded-md border-2 border-[var(--line)] text-[#58CC02] focus:ring-[#58CC02] cursor-pointer w-4 h-4"
                />
                <span>Compare</span>
              </label>
            )}
            {onHide && (
              <button
                type="button"
                className="text-xs font-bold text-[var(--muted)] hover:text-red-600 transition-colors py-1 px-2 rounded-lg hover:bg-red-50 cursor-pointer"
                onClick={onHide}
              >
                Hide
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
