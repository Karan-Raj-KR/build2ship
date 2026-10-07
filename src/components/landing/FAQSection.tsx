"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does the eligibility engine avoid false matches?",
    answer:
      "Most search tools rely on loose keyword searches, leading to false positives. Elara checks recorded requirements against your profile, including citizenship, residency and education rules. Imported programmes require source review; there is no automatic live crawler. When a detail is missing from your profile, we flag it as an unverified requirement in amber rather than giving you false confidence.",
  },
  {
    question: "Do you submit applications for me, or do I apply directly?",
    answer:
      "You always submit directly through the official provider's authenticated portal (e.g. Oxford Rhodes Trust, Y Combinator, NSF FastLane). Elara is your preparation and wayfinding operating system: it helps you check recorded requirements, organize your evidence, and track preparation. Always confirm current rules and deadlines with the provider.",
  },
  {
    question: "How does the AI Bridge work with external LLMs like Claude or ChatGPT?",
    answer:
      "The AI Bridge exports your self-reported achievements, project links, and recorded opportunity requirements as a context bundle. You can paste it into an external AI assistant to help draft answers. Elara does not independently verify your achievements; review the bundle and any generated draft before using them.",
  },
  {
    question: "Is my personal data and academic history kept private?",
    answer:
      "Your workspace records are scoped to your account. AI features send relevant input to the configured AI provider; see our privacy policy for details. You can export or delete your profile from Settings.",
  },
  {
    question: "Is Elara free to use?",
    answer:
      "Yes. Browsing the stored catalogue, running eligibility scans, creating custom shortlists, and using the preparation checklists is free with no credit card required.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section id="faq" className="py-20 md:py-28 border-b-2 border-[var(--line)] bg-[var(--canvas)] scroll-mt-12">
      <div className="max-w-[840px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5FF] border-2 border-[#A568CC] text-[#7E22CE] text-xs font-black uppercase tracking-wide mb-3">
            <HelpCircle size={14} /> Clear Answers
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--ink)] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base font-semibold text-[var(--ink-secondary)] mt-2">
            Everything you need to know about the platform, eligibility scanning, and privacy.
          </p>
        </div>

        {/* Tactile Accordion */}
        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border-2 border-[var(--line)] rounded-2xl overflow-hidden shadow-[0_4px_0_var(--line)] transition-all"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-[var(--ink)] hover:text-[var(--primary-dark)] transition-colors min-h-[56px]"
                  aria-expanded={isOpen}
                >
                  <span className="text-base">{item.question}</span>
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                      isOpen
                        ? "bg-[#58CC02] border-[#46A302] text-white shadow-[0_2px_0_#46A302] rotate-180"
                        : "bg-[var(--canvas-subtle)] border-[var(--line)] text-[var(--ink-secondary)]"
                    }`}
                  >
                    <ChevronDown size={18} strokeWidth={3} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm font-semibold text-[var(--ink-secondary)] leading-relaxed border-t-2 border-[var(--line)] bg-[var(--canvas-subtle)]/40">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
