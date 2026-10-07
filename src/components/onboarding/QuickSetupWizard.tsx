"use client";

import { useState } from "react";
import { Profile } from "@/types/database";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { CountrySelector, NationalitySelector } from "@/components/ui/CountrySelector";

interface QuickSetupWizardProps {
  initialProfile: Partial<Profile>;
  onComplete: (updatedProfile: Partial<Profile>) => void;
  onBackToPaths: () => void;
}

const CHASE_CATEGORIES = [
  { id: "internship", label: "Internships", icon: "💼" },
  { id: "hackathon", label: "Hackathons", icon: "⚡" },
  { id: "fellowship", label: "Fellowships", icon: "🌟" },
  { id: "scholarship", label: "Scholarships", icon: "🎓" },
  { id: "research", label: "Research", icon: "🔬" },
  { id: "startup", label: "Startup Programs", icon: "🚀" },
  { id: "grant", label: "Grants", icon: "💰" },
  { id: "competition", label: "Competitions", icon: "🏆" },
  { id: "open-source", label: "Open Source Programs", icon: "🌐" },
  { id: "conference", label: "Conferences", icon: "🎤" },
  { id: "community", label: "Builder Communities", icon: "🤝" },
  { id: "other", label: "Other Opportunities", icon: "✨" },
];

const PRIORITIES = [
  { id: "paid", label: "Paid opportunities", desc: "Require stipend or salary" },
  { id: "prestige", label: "Prestige & network", desc: "Top-tier brand value" },
  { id: "international", label: "International exposure", desc: "Abroad or global cohorts" },
  { id: "career", label: "Career acceleration", desc: "Fast-track fulltime roles" },
  { id: "learning", label: "Deep learning", desc: "Mentorship & hard skills" },
  { id: "prize", label: "Prize money", desc: "Competitive cash awards" },
  { id: "remote", label: "Remote flexibility", desc: "Work from anywhere" },
  { id: "travel_fund", label: "Travel funding", desc: "Flights & lodging covered" },
  { id: "startup_exp", label: "Startup exposure", desc: "Founders & early venture" },
  { id: "research_exp", label: "Research experience", desc: "Papers & academic labs" },
  { id: "oss_exp", label: "Open-source exposure", desc: "Production public code" },
];

const SUGGESTED_SKILLS = [
  "AI & ML", "Python", "React", "TypeScript", "Next.js", "PyTorch", "LLMs",
  "Product Design", "Figma", "Full-Stack", "Rust", "Robotics", "Cybersecurity",
  "Cloud & DevOps", "BioTech", "Quantitative Finance", "Data Science",
  "Smart Contracts", "Mobile Dev", "Hardware & IoT", "Zero Knowledge", "Founders"
];

export function QuickSetupWizard({
  initialProfile,
  onComplete,
  onBackToPaths,
}: QuickSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<Profile>>({
    opportunity_types: ["internship", "fellowship", "hackathon"],
    country_of_residence: "India",
    nationalities: ["India"],
    education_stage: "undergraduate",
    expected_graduation: "2026",
    skills: ["AI & ML", "Python", "React"],
    interests: ["Paid opportunities", "Career acceleration"],
    willing_to_travel: true,
    willing_to_relocate: true,
    paid_only_preference: false,
    time_availability: "15-20 hrs",
    ...initialProfile,
  });

  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");

  function toggleOpportunityType(id: string) {
    setProfile((prev) => {
      const current = prev.opportunity_types || [];
      const updated = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...prev, opportunity_types: updated };
    });
  }

  function toggleSkill(skill: string) {
    setProfile((prev) => {
      const current = prev.skills || [];
      const updated = current.includes(skill)
        ? current.filter((s) => s !== skill)
        : [...current, skill];
      return { ...prev, skills: updated };
    });
  }

  function addCustomSkill() {
    if (!customSkillInput.trim()) return;
    const s = customSkillInput.trim();
    if (!profile.skills?.includes(s)) {
      setProfile((prev) => ({ ...prev, skills: [...(prev.skills || []), s] }));
    }
    setCustomSkillInput("");
  }

  const filteredSkills = SUGGESTED_SKILLS.filter((s) =>
    s.toLowerCase().includes(skillSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress pill header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else onBackToPaths();
          }}
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          <span>{step === 1 ? "Choose other method" : "Back"}</span>
        </button>

        {/* Minimal dot progress */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-[var(--primary)]"
                  : i < step
                  ? "w-3 bg-[var(--primary)]/60"
                  : "w-2 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        <span className="text-xs text-[var(--muted)] font-medium">
          ~{Math.max(1, 6 - step)} min left
        </span>
      </div>

      {/* Screen container */}
      <div className="card p-6 md:p-8 shadow-sm transition-all">
        {/* ==================================================== */}
        {/* SCREEN 1: WHAT ARE YOU CHASING? */}
        {/* ==================================================== */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Discovery Target
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                What&apos;s worth finding for you?
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Pick what excites you. Scout will prioritize these formats.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CHASE_CATEGORIES.map((cat) => {
                const selected = profile.opportunity_types?.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleOpportunityType(cat.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm font-medium transition-all cursor-pointer ${
                      selected
                        ? "bg-[var(--primary-subtle)] border-[var(--primary-border)] text-[var(--primary)] font-semibold shadow-xs"
                        : "bg-white border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-subtle)] hover:border-[var(--primary-border)]"
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 truncate">{cat.label}</span>
                    {selected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SCREEN 2: WHERE ARE YOU RIGHT NOW? (ELIGIBILITY) */}
        {/* ==================================================== */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Eligibility Grounding
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                Where are you right now?
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                We only ask facts that gate programs (visas, cohort graduation years, and legal age).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Education stage */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  Education Level
                </label>
                <select
                  value={profile.education_stage || "undergraduate"}
                  onChange={(e) =>
                    setProfile({ ...profile, education_stage: e.target.value as NonNullable<Profile["education_stage"]> })
                  }
                  className="input w-full"
                >
                  <option value="undergraduate">Undergraduate (BSc/BTech/BA)</option>
                  <option value="masters">Master&apos;s (MSc/MTech/MS)</option>
                  <option value="phd">PhD / Doctoral</option>
                  <option value="other">Recent Graduate / Self-Taught</option>
                </select>
              </div>

              {/* Graduation year */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  Expected Graduation
                </label>
                <select
                  value={profile.expected_graduation || "2026"}
                  onChange={(e) =>
                    setProfile({ ...profile, expected_graduation: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029+">2029 or later</option>
                  <option value="graduated">Already graduated</option>
                </select>
              </div>

              {/* Field of study */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  Field / Major
                </label>
                <input
                  type="text"
                  value={profile.field_of_study || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, field_of_study: e.target.value })
                  }
                  placeholder="e.g. Computer Science, AI, Design, Electrical Eng..."
                  className="input w-full"
                />
              </div>

              {/* Residence vs Citizenship */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Country of Residence
                  </label>
                  <span
                    title="Where you physically live today. Determines timezones, local tax, and regional events."
                    className="text-[var(--muted)] hover:text-[var(--ink)] cursor-help"
                  >
                    <HelpCircle size={12} />
                  </span>
                </div>
                <CountrySelector
                  value={profile.country_of_residence || "India"}
                  onChange={(c) => setProfile({ ...profile, country_of_residence: c })}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Citizenship / Passport
                  </label>
                  <span
                    title="Your legal citizenship. Determines international travel visas and embassy grants. We never confuse this with residence."
                    className="text-[var(--muted)] hover:text-[var(--ink)] cursor-help"
                  >
                    <HelpCircle size={12} />
                  </span>
                </div>
                <NationalitySelector
                  value={profile.nationalities || ["India"]}
                  onChange={(nats) => setProfile({ ...profile, nationalities: nats })}
                />
              </div>
            </div>

            <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl flex items-start gap-2.5 text-xs text-[var(--muted)]">
              <Globe size={16} className="shrink-0 text-[var(--primary)] mt-0.5" />
              <span>
                <strong className="text-[var(--ink)]">Why this matters:</strong> Many top fellowships (like Mitacs or Rhodes) check passport nationality, while hackathons check where you are physically located for travel reimbursements.
              </span>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SCREEN 3: WHAT SHOULD SCOUT PRIORITIZE? */}
        {/* ==================================================== */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Scout Priorities
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                What matters most to you?
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Select what Scout should weight highest when ranking your matches.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITIES.map((p) => {
                const isPaid = p.id === "paid";
                const isTravel = p.id === "travel_fund";
                const selected =
                  (isPaid && profile.paid_only_preference) ||
                  (isTravel && profile.willing_to_travel) ||
                  profile.interests?.includes(p.label);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (isPaid) {
                        setProfile((prev) => ({
                          ...prev,
                          paid_only_preference: !prev.paid_only_preference,
                        }));
                      } else if (isTravel) {
                        setProfile((prev) => ({
                          ...prev,
                          willing_to_travel: !prev.willing_to_travel,
                        }));
                      } else {
                        setProfile((prev) => {
                          const ints = prev.interests || [];
                          return {
                            ...prev,
                            interests: ints.includes(p.label)
                              ? ints.filter((i) => i !== p.label)
                              : [...ints, p.label],
                          };
                        });
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? "bg-[var(--primary-subtle)] border-[var(--primary-border)] text-[var(--primary)] font-semibold shadow-xs"
                        : "bg-white border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-subtle)] hover:border-[var(--primary-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{p.label}</span>
                      {selected && <Check size={14} className="text-[var(--primary)]" />}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 font-normal">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SCREEN 4: YOUR INTERESTS & SKILLS */}
        {/* ==================================================== */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Technical & Topic Signal
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                Your skills & focus areas
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Tap the topics you build with, or add custom ones.
              </p>
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
                placeholder="Type a skill and press Enter..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="btn btn-secondary btn-sm"
              >
                Add
              </button>
            </div>

            {/* Selected chips */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-2">
                  Selected Skills ({profile.skills.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] cursor-pointer hover:bg-[var(--error-surface)] hover:text-[var(--error-text)] hover:border-[var(--error-border)] transition-colors flex items-center gap-1.5"
                    >
                      <span>{s}</span>
                      <span className="text-[10px] text-[var(--primary)] hover:text-[var(--error-text)]">×</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested chips */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2">
                Popular Areas
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredSkills.map((skill) => {
                  const active = profile.skills?.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? "bg-[var(--primary)] text-white font-semibold shadow-xs"
                          : "bg-white border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-subtle)] hover:border-[var(--primary-border)]"
                      }`}
                    >
                      {skill} {active ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SCREEN 5: PRACTICAL CONSTRAINTS */}
        {/* ==================================================== */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Practical Realities
              </span>
              <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                How should we filter logistics?
              </h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                No jargon—just what actually fits into your semester and life.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Travel question */}
              <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">
                    Would you travel for the right opportunity?
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    Flag funded in-person programs and travel stipends.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, willing_to_travel: !profile.willing_to_travel })
                  }
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    profile.willing_to_travel
                      ? "bg-[#F4FCE3] text-[#1F3800] border border-[#C5F36B]"
                      : "bg-white text-[var(--muted)] border border-[var(--border)]"
                  }`}
                >
                  {profile.willing_to_travel ? "Yes, I can travel" : "Remote only"}
                </button>
              </div>

              {/* Relocation */}
              <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">
                    Are you open to relocating for summer / 3-month cohorts?
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    Opens up programs in SF, London, Toronto, etc.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, willing_to_relocate: !profile.willing_to_relocate })
                  }
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    profile.willing_to_relocate
                      ? "bg-[#F4FCE3] text-[#1F3800] border border-[#C5F36B]"
                      : "bg-white text-[var(--muted)] border border-[var(--border)]"
                  }`}
                >
                  {profile.willing_to_relocate ? "Open to relocate" : "No relocation"}
                </button>
              </div>

              {/* Unpaid tolerance */}
              <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">
                    Are unpaid opportunities okay if prestige or learning is high?
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {profile.paid_only_preference
                      ? "Filtering only paid stipends & prizes."
                      : "Includes high-prestige research fellowships even if unfunded."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile({ ...profile, paid_only_preference: !profile.paid_only_preference })
                  }
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !profile.paid_only_preference
                      ? "bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]"
                      : "bg-[#FEF7E6] text-[#8A5800] border border-[#FDE3A7]"
                  }`}
                >
                  {!profile.paid_only_preference ? "Unpaid is fine" : "Paid only"}
                </button>
              </div>

              {/* Weekly Time */}
              <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                <label className="block text-xs font-semibold text-[var(--muted)] mb-2">
                  Time available per week
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["5-10 hrs", "15-20 hrs", "Full-time (35+ hrs)"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProfile({ ...profile, time_availability: t })}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        profile.time_availability === t
                          ? "bg-[var(--primary-subtle)] border-[var(--primary-border)] text-[var(--primary)] font-semibold"
                          : "bg-white border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onBackToPaths();
            }}
            className="btn btn-secondary btn-sm"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn btn-primary flex items-center gap-2"
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete(profile)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Launch My Scout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
