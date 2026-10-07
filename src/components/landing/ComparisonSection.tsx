"use client";

import { Check, X } from "lucide-react";

const COMPARISON_ROWS = [
  {
    feature: "Opportunity Discovery",
    oldWay: "Scattered across 40 browser tabs, stale Reddit threads, and expired blog posts.",
    elaraWay: "An authenticated catalogue with recorded source checks and official links. Confirm current dates with the provider.",
  },
  {
    feature: "Eligibility Verification",
    oldWay: "Guesswork; discovering a quiet citizenship or age restriction after writing 3 essays.",
    elaraWay: "Transparent rule checking with green, amber, and red indicators before you invest time.",
  },
  {
    feature: "Application Evidence",
    oldWay: "Hunting through old résumés and disparate folders to remember what you built.",
    elaraWay: "Structured Evidence Bank that links verified projects and papers to application prompts.",
  },
  {
    feature: "AI Writing Assistance",
    oldWay: "Generic LLM prompts that produce robotic, hallucinated statements of purpose.",
    elaraWay: "Portable AI Bridge exporting factual context packs calibrated for Claude & ChatGPT.",
  },
  {
    feature: "Deadline Defense",
    oldWay: "Forgotten spreadsheet cells and missed cutoff times across international timezones.",
    elaraWay: "Recorded deadlines, 3-step preparation checklists, and milestone tracking.",
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-20 md:py-28 border-b-2 border-[var(--line)] bg-white scroll-mt-12">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-[720px] mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF4FF] border-2 border-[#1CB0F6] text-[#0B72A4] text-xs font-black uppercase tracking-wide mb-3">
            Comparison
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--ink)] tracking-tight">
            Stop running your future out of a spreadsheet
          </h2>
          <p className="text-base font-semibold text-[var(--ink-secondary)] mt-2 leading-relaxed">
            High-stakes scholarship and fellowship applications deserve a dedicated workspace that keeps requirements, evidence, and next steps together.
          </p>
        </div>

        {/* Tactile Comparison Table / Matrix */}
        <div className="border-2 border-[var(--line)] rounded-3xl overflow-hidden shadow-[0_6px_0_var(--line)] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 border-b-2 border-[var(--line)] bg-[var(--canvas-subtle)] text-xs font-black text-[var(--ink-secondary)] uppercase tracking-wider py-4 px-6">
            <div className="md:col-span-4 hidden md:block">Dimension</div>
            <div className="md:col-span-4 text-[#991B1B] hidden md:block">Traditional Spreadsheets</div>
            <div className="md:col-span-4 text-[#287300] hidden md:block">Elara Workspace</div>
          </div>

          <div className="divide-y-2 divide-[var(--line)]">
            {COMPARISON_ROWS.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-6 items-start hover:bg-[var(--canvas-subtle)]/50 transition-colors"
              >
                {/* Feature Label */}
                <div className="md:col-span-4">
                  <span className="text-base font-black text-[var(--ink)]">
                    {row.feature}
                  </span>
                </div>

                {/* Old Way */}
                <div className="md:col-span-4 flex items-start gap-3 text-xs font-bold text-[var(--ink-secondary)] leading-relaxed bg-[#FFE5E5]/40 md:bg-transparent p-3.5 md:p-0 rounded-2xl border-2 md:border-0 border-[#D93B3B]/20">
                  <div className="w-6 h-6 rounded-xl bg-[#FFE5E5] border-2 border-[#D93B3B] text-[#991B1B] flex items-center justify-center shrink-0 mt-0.5">
                    <X size={14} strokeWidth={3} />
                  </div>
                  <span>{row.oldWay}</span>
                </div>

                {/* Elara Way */}
                <div className="md:col-span-4 flex items-start gap-3 text-xs font-extrabold text-[var(--ink)] leading-relaxed bg-[#EEFFD9]/40 md:bg-transparent p-3.5 md:p-0 rounded-2xl border-2 md:border-0 border-[#58CC02]/30">
                  <div className="w-6 h-6 rounded-xl bg-[#EEFFD9] border-2 border-[#58CC02] text-[#287300] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_#58CC02]">
                    <Check size={14} strokeWidth={3.5} />
                  </div>
                  <span>{row.elaraWay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
