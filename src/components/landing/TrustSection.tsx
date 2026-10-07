"use client";

const PRESTIGIOUS_PROGRAMS = [
  { name: "Rhodes Trust", label: "Oxford University" },
  { name: "Fulbright Program", label: "US Dept of State" },
  { name: "Y Combinator", label: "Startup Batch" },
  { name: "NSF Fellowships", label: "National Science Foundation" },
  { name: "Gates Cambridge", label: "Cambridge University" },
  { name: "Google Open Source", label: "GSoC Stipends" },
  { name: "Thiel Foundation", label: "Fellowship Grants" },
  { name: "CERN Geneva", label: "Research Studentships" },
];

export function TrustSection() {
  return (
    <section className="py-10 border-b-2 border-[var(--line)] bg-[var(--canvas-subtle)]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <p className="text-center text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)] mb-6">
          Examples of verified programme providers · no affiliation or endorsement
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 items-center justify-items-center">
          {PRESTIGIOUS_PROGRAMS.slice(0, 4).map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center justify-center p-4 text-center rounded-2xl bg-white border-2 border-[var(--line)] shadow-[0_3px_0_var(--line)] w-full transition-all hover:border-[var(--line-strong)]"
            >
              <span className="text-sm font-black text-[var(--ink)] tracking-tight">
                {item.name}
              </span>
              <span className="text-xs text-[var(--ink-secondary)] mt-0.5 font-bold">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
