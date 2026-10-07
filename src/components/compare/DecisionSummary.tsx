"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Info, Target } from "lucide-react";
import { ComparedOpportunityItem, ComparisonGoal } from "@/lib/compare/types";
import { computeDecisionSummary } from "@/lib/compare/engine";

interface DecisionSummaryProps {
  items: ComparedOpportunityItem[];
  selectedGoal: ComparisonGoal;
  onGoalChange: (goal: ComparisonGoal) => void;
}

const GOALS: { id: ComparisonGoal; label: string }[] = [
  { id: "best_fit", label: "Best fit" },
  { id: "least_effort", label: "Least application effort" },
  { id: "earliest_deadline", label: "Earliest deadline" },
  { id: "funding", label: "Funding support" },
];

export function DecisionSummary({
  items,
  selectedGoal,
  onGoalChange,
}: DecisionSummaryProps) {
  if (items.length < 2) return null;

  const decision = computeDecisionSummary(items, selectedGoal);
  if (!decision) return null;

  return (
    <section
      aria-labelledby="decision-summary-heading"
      className="card bg-gradient-to-r from-[#E9F1E4]/40 via-white to-[#FAF9F5] border border-[#C7DCBC] p-4 sm:p-5 shadow-xs transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-[#EAE6DF]">
        <div className="flex items-center gap-2 text-[#285C48]">
          <div className="w-6 h-6 rounded-lg bg-[#E9F1E4] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#285C48]" />
          </div>
          <h2 id="decision-summary-heading" className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
            Decision Summary
          </h2>
        </div>

        {/* Goal Selector Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-1 mr-1">
            <Target className="w-3 h-3 text-[var(--muted)]" /> Prioritize by:
          </span>
          <div className="flex rounded-lg bg-[var(--surface-subtle)] p-0.5 border border-[#EAE6DF] text-xs">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGoalChange(g.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  selectedGoal === g.id
                    ? "bg-white text-[var(--ink)] shadow-xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decision Body */}
      <div className="mt-3.5 space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-snug">
            Consider <span className="text-[#285C48] underline decoration-[#C7DCBC] underline-offset-2">{decision.recommended_title}</span> first if your priority is {decision.priority_label}.
          </h3>
          {decision.recommended_organizer && (
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Organized by {decision.recommended_organizer}
            </p>
          )}
        </div>

        {/* Two Concrete Reasons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#EAE6DF]">
            <CheckCircle2 className="w-4 h-4 text-[#2B5400] shrink-0 mt-0.5" />
            <div className="text-[var(--ink)] leading-relaxed">
              <strong className="block text-[11px] font-semibold text-[#2B5400] uppercase tracking-wide">
                Key Match Signal
              </strong>
              {decision.reason_a}
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-[#EAE6DF]">
            <CheckCircle2 className="w-4 h-4 text-[#2B5400] shrink-0 mt-0.5" />
            <div className="text-[var(--ink)] leading-relaxed">
              <strong className="block text-[11px] font-semibold text-[#2B5400] uppercase tracking-wide">
                Supporting Factor
              </strong>
              {decision.reason_b}
            </div>
          </div>
        </div>

        {/* Main Trade-off */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FEF7E6]/70 border border-[#FDE3A7] text-xs">
          <AlertCircle className="w-4 h-4 text-[#8A5800] shrink-0 mt-0.5" />
          <div className="text-[#8A5800] leading-relaxed">
            <strong className="text-[11px] font-semibold uppercase tracking-wide block">
              Main Trade-off to Weigh
            </strong>
            {decision.trade_off}
          </div>
        </div>

        {/* Certainty Note if any */}
        {decision.certainty_note && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <Info className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
            <span>{decision.certainty_note}</span>
          </div>
        )}

        {/* Action Link for the Recommended Opportunity */}
        {decision.recommended_id && (
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/workspace/${decision.recommended_id}`}
              className="btn btn-primary btn-sm text-xs flex items-center gap-1.5 shadow-xs"
            >
              <span>Prepare Application for {decision.recommended_title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/opportunities/${decision.recommended_id}`}
              className="btn btn-secondary btn-sm text-xs"
            >
              View Full Details
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
