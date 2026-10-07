"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Profile, ProfileEvidence, Opportunity, RecommendationExplanation } from "@/types/database";
import { QuickSetupWizard } from "@/components/onboarding/QuickSetupWizard";
import { ExtractionReviewModal } from "@/components/onboarding/ExtractionReviewModal";
import {
  CandidateFact,
  parseResumeText,
  parseGitHubProfile,
  parsePastedProfileText,
  parseAiBridgeResponse,
  AI_BRIDGE_PORTABLE_PROMPT,
} from "@/lib/onboarding/parsers";
import { ArrowRight, Bot, Check, Compass, Copy, FileText, Loader2, Sparkles, Upload, Zap, Calendar, DollarSign } from "lucide-react";

function GithubIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

type OnboardingPath = "select" | "quick" | "resume" | "github" | "paste" | "ai_bridge" | "activation";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState<OnboardingPath>("select");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Extraction Review Modal state
  const [reviewFacts, setReviewFacts] = useState<CandidateFact[]>([]);
  const [reviewSourceTitle, setReviewSourceTitle] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Input states for alternative paths
  const [resumeText, setResumeText] = useState("");
  const [githubInput, setGithubInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [aiBridgeInput, setAiBridgeInput] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Activation Moment state
  const [activating, setActivating] = useState(false);
  const [totalFoundCount, setTotalFoundCount] = useState(0);
  const [topMatches, setTopMatches] = useState<{ opportunity: Opportunity; explanation?: RecommendationExplanation }[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const { createClient } = await import("@/lib/db/client");
        const supabase = createClient();
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (!user || userErr) {
          router.replace("/login");
          return;
        }

        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        let current = existingProfile;
        if (!current) {
          const initial: Partial<Profile> = {
            id: user.id,
            display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
            onboarding_completed: false,
            skills: [],
            interests: [],
            opportunity_types: [],
            nationalities: [],
            updated_at: new Date().toISOString(),
          };
          const { data: created } = await supabase
            .from("profiles")
            .upsert(initial)
            .select()
            .maybeSingle();
          current = created || (initial as Profile);
        }


        if (isMounted) setProfile(current);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();
    return () => { isMounted = false; };
  }, [router]);

  /**
   * Saves updated profile facts and triggers the Activation Moment
   */
  async function completeAndActivate(updatedData: Partial<Profile>, extraEvidence: Partial<ProfileEvidence>[] = []) {
    setSaving(true);
    setActivationError(null);
    setTotalFoundCount(0);
    setTopMatches([]);
    setActivating(true);
    setCurrentPath("activation");

    try {
      if (!profile) throw new Error("Your profile is unavailable. Please reload and try again.");
      const mergedProfile: Profile = {
        ...profile,
        ...updatedData,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mergedProfile) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || 'Could not save your profile.');
      Object.assign(mergedProfile, saved.profile);

      if (extraEvidence.length > 0 && mergedProfile.id) {
        const rows = extraEvidence.map((ev) => ({
          user_id: mergedProfile.id,
          kind: ev.kind || "project",
          title: ev.title || "Project",
          description: ev.description || null,
          tags: ev.tags || [],
          evidence_url: ev.evidence_url || null,
          confirmed: true,
        }));
        const { error: evidenceError } = await supabase.from("profile_evidence").insert(rows);
        if (evidenceError) throw new Error("Your profile was saved, but evidence could not be saved. Please add it from your profile.");
      }
      setProfile(mergedProfile);

      const { trackEvent } = await import('@/lib/analytics');
      await trackEvent(mergedProfile.id, 'onboarding_completed');

      // 2. Run initial Scout Discovery based on profile
      const scoutQuery = mergedProfile.opportunity_types?.join(" ") || "fellowships internships hackathons";
      const scoutRes = await fetch("/api/scout/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scoutQuery }),
      });

      if (!scoutRes.ok) throw new Error("Your profile was saved, but discovery is currently unavailable. Please try Scout again later.");
      const scoutData = await scoutRes.json();
      const items = scoutData.rankedItems || [];
      setTotalFoundCount(items.length);
      setTopMatches(items.slice(0, 3));
    } catch (err) {
      console.error("Activation error:", err);
      setActivationError(err instanceof Error ? err.message : "Setup could not be completed. Please try again.");
      setTotalFoundCount(0);
      setTopMatches([]);
    } finally {
      setActivating(false);
      setSaving(false);
    }
  }

  // Handle confirmation of reviewed facts from modal
  function handleConfirmReviewedFacts(confirmed: CandidateFact[]) {
    setIsReviewOpen(false);

    const skillsToAdd: string[] = [];
    const evidenceToAdd: Partial<ProfileEvidence>[] = [];
    let university: string | null = null;
    let githubUrl: string | null = null;

    for (const fact of confirmed) {
      if (fact.category === "Skills") {
        skillsToAdd.push(fact.title);
      } else if (fact.category === "Education" && fact.profile_field === "university") {
        university = fact.title;
      } else if (fact.category === "Education" && fact.profile_field === "github_url") {
        githubUrl = fact.profile_value || null;
      } else if (fact.category === "Projects" || fact.category === "Experience" || fact.category === "Achievements") {
        evidenceToAdd.push({
          kind: fact.kind === "achievement" || fact.kind === "experience" ? fact.kind : "project",
          title: fact.title,
          description: fact.description,
          tags: fact.tags,
          evidence_url: fact.evidence_url,
          confirmed: true,
        });
      }
    }

    const updatedProfile: Partial<Profile> = {
      skills: Array.from(new Set([...(profile?.skills || []), ...skillsToAdd])),
      ...(university ? { university } : {}),
      ...(githubUrl ? { github_url: githubUrl } : {}),
      opportunity_types: profile?.opportunity_types?.length ? profile.opportunity_types : ["internship", "fellowship", "hackathon"],
    };

    completeAndActivate(updatedProfile, evidenceToAdd);
  }

  // --- Path 2: Resume Text Extraction ---
  function handleParseResume() {
    if (!resumeText.trim()) return;
    try {
      setImportError(null);
      const result = parseResumeText(resumeText);
      if (result.facts.length === 0) {
        setImportError("No clear candidate facts found in this text. Try pasting more details or use Quick Setup.");
        return;
      }
      setReviewFacts(result.facts);
      setReviewSourceTitle("Pasted Resume / CV");
      setIsReviewOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse resume text.");
    }
  }

  // --- Path 3: GitHub Profile Import ---
  async function handleFetchGitHub() {
    if (!githubInput.trim()) return;
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await parseGitHubProfile(githubInput);
      setReviewFacts(result.facts);
      setReviewSourceTitle(`GitHub (@${githubInput.replace(/^https?:\/\/(www\.)?github\.com\//i, "")})`);
      setIsReviewOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not fetch GitHub profile.");
    } finally {
      setImportLoading(false);
    }
  }

  // --- Path 4: Paste Profile Text ---
  function handleParsePasted() {
    if (!pasteText.trim()) return;
    try {
      setImportError(null);
      const result = parsePastedProfileText(pasteText);
      if (result.facts.length === 0) {
        setImportError("No structured signals detected. Paste your LinkedIn About section or full bio.");
        return;
      }
      setReviewFacts(result.facts);
      setReviewSourceTitle("Pasted Profile / Bio");
      setIsReviewOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to extract facts.");
    }
  }

  // --- Path 5: AI Bridge Parser ---
  function handleParseAiBridge() {
    if (!aiBridgeInput.trim()) return;
    try {
      setImportError(null);
      const { profile: bridgeProfile, evidence: bridgeEvidence, facts: bridgeFacts } = parseAiBridgeResponse(aiBridgeInput);
      setReviewFacts(bridgeFacts);
      setReviewSourceTitle("AI Bridge Response");
      setIsReviewOpen(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Invalid AI response structure.");
    }
  }

  // --- Path 6: Skip for now ---
  function handleSkip() {
    completeAndActivate({});
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] text-[var(--ink)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#58CC02]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] py-10 px-4 sm:px-6 relative">
      <div className="relative max-w-4xl mx-auto">
        {/* ==================================================== */}
        {/* VIEW 1: PATHWAY SELECTOR */}
        {/* ==================================================== */}
        {currentPath === "select" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-xs font-semibold text-[var(--primary)]">
                <Sparkles size={14} />
                <span>Opportunity Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--ink)]">
                Let&apos;s build your opportunity profile.
              </h1>
              <p className="text-[var(--muted)] text-sm sm:text-base">
                Scout needs to know who you are to surface high-signal fellowships, hackathons, and grants you actually qualify for.
              </p>
            </div>

            {/* Pathway Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Quick Setup */}
              <button
                onClick={() => setCurrentPath("quick")}
                className="group relative p-6 bg-white hover:bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--primary-border)] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-xs">
                    <Zap size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                        Quick Setup
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                        ~2 minutes
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Answer 5 quick high-signal questions with interactive chips. No boring long forms.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                  <span>Start Quick Setup</span>
                  <ArrowRight size={14} />
                </div>
              </button>

              {/* Option B: Resume / CV */}
              <button
                onClick={() => setCurrentPath("resume")}
                className="group relative p-6 bg-white hover:bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--primary-border)] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-xs">
                    <Upload size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                        Import Resume / CV
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Paste or upload your CV text. Scout extracts candidate facts for you to confirm.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                  <span>Extract from CV</span>
                  <ArrowRight size={14} />
                </div>
              </button>

              {/* Option C: GitHub */}
              <button
                onClick={() => setCurrentPath("github")}
                className="group relative p-6 bg-white hover:bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--primary-border)] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-xs">
                    <GithubIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                      Connect Public GitHub
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Enter your public GitHub handle to turn repos, stars, and languages into evidence.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                  <span>Import GitHub Signal</span>
                  <ArrowRight size={14} />
                </div>
              </button>

              {/* Option D: Paste Profile */}
              <button
                onClick={() => setCurrentPath("paste")}
                className="group relative p-6 bg-white hover:bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--primary-border)] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-xs">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                      Paste Profile or Bio
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Paste your LinkedIn About section, personal website bio, or existing brag sheet.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                  <span>Parse Text</span>
                  <ArrowRight size={14} />
                </div>
              </button>

              {/* Option E: AI Bridge */}
              <button
                onClick={() => setCurrentPath("ai_bridge")}
                className="group relative p-6 bg-white hover:bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--primary-border)] rounded-2xl text-left transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between md:col-span-2 cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] shadow-xs shrink-0">
                      <Bot size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                          Use ChatGPT, Claude, or Gemini to Help
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]">
                          AI Bridge
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1 max-w-xl">
                        Generate a 1-click structured prompt, paste it into your favorite LLM conversation, and bring back the structured profile.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] shrink-0">
                    <span>Generate Prompt</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            </div>

            {/* Option F: Skip for now */}
            <div className="text-center pt-4">
              <button
                onClick={handleSkip}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors underline underline-offset-4 decoration-[var(--border)] hover:decoration-[var(--muted)] cursor-pointer"
              >
                Skip setup for now (Explore with weaker personalization)
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: QUICK SETUP WIZARD */}
        {/* ==================================================== */}
        {currentPath === "quick" && (
          <QuickSetupWizard
            initialProfile={profile || {}}
            onComplete={(updated) => completeAndActivate(updated)}
            onBackToPaths={() => setCurrentPath("select")}
          />
        )}

        {/* ==================================================== */}
        {/* VIEW 3: RESUME / CV TEXT IMPORT */}
        {/* ==================================================== */}
        {currentPath === "resume" && (
          <div className="max-w-2xl mx-auto card p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                  Import Resume / CV
                </span>
                <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                  Paste your resume text
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  We&apos;ll extract education, projects, skills, and honors into candidate facts for your review.
                </p>
              </div>
              <button
                onClick={() => setCurrentPath("select")}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <textarea
              rows={9}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste plain text from your PDF, Word document, or markdown resume here..."
              className="input w-full p-4 font-mono text-xs"
            />

            {importError && (
              <div className="p-3.5 bg-[var(--error-surface)] border border-[var(--error-border)] text-[var(--error-text)] text-xs rounded-xl">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentPath("select")}
                className="btn btn-secondary btn-sm"
              >
                Back
              </button>
              <button
                onClick={handleParseResume}
                disabled={!resumeText.trim()}
                className="btn btn-primary flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>Extract Facts</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 4: GITHUB PROFILE IMPORT */}
        {/* ==================================================== */}
        {currentPath === "github" && (
          <div className="max-w-xl mx-auto card p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                  GitHub Evidence
                </span>
                <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                  Enter your GitHub profile
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  We look at your public repositories, languages, and stars as factual metrics.
                </p>
              </div>
              <button
                onClick={() => setCurrentPath("select")}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <GithubIcon size={18} className="absolute left-3.5 top-3 text-[var(--muted)]" />
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="github.com/username or just username"
                  className="input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Only public repositories are accessed. No OAuth or repo write permissions required.
              </p>
            </div>

            {importError && (
              <div className="p-3.5 bg-[var(--error-surface)] border border-[var(--error-border)] text-[var(--error-text)] text-xs rounded-xl">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentPath("select")}
                className="btn btn-secondary btn-sm"
              >
                Back
              </button>
              <button
                onClick={handleFetchGitHub}
                disabled={!githubInput.trim() || importLoading}
                className="btn btn-primary flex items-center gap-2"
              >
                {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Fetch Public Evidence</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 5: PASTE PROFILE */}
        {/* ==================================================== */}
        {currentPath === "paste" && (
          <div className="max-w-2xl mx-auto card p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                  Paste Bio or LinkedIn
                </span>
                <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                  Paste your profile text
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Paste your LinkedIn About section, website bio, or previous AI summaries.
                </p>
              </div>
              <button
                onClick={() => setCurrentPath("select")}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste LinkedIn About summary, portfolio intro, or previous brag sheet..."
              className="input w-full p-4 text-xs"
            />

            {importError && (
              <div className="p-3.5 bg-[var(--error-surface)] border border-[var(--error-border)] text-[var(--error-text)] text-xs rounded-xl">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentPath("select")}
                className="btn btn-secondary btn-sm"
              >
                Back
              </button>
              <button
                onClick={handleParsePasted}
                disabled={!pasteText.trim()}
                className="btn btn-primary flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>Parse Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 6: AI BRIDGE */}
        {/* ==================================================== */}
        {currentPath === "ai_bridge" && (
          <div className="max-w-2xl mx-auto card p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                  AI Bridge Onboarding
                </span>
                <h2 className="text-2xl font-bold text-[var(--ink)] mt-1">
                  Use ChatGPT / Claude / Gemini
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  1. Copy the portable prompt below. 2. Paste into your LLM. 3. Paste the generated response back here.
                </p>
              </div>
              <button
                onClick={() => setCurrentPath("select")}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Prompt Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Step 1: Portable Prompt
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(AI_BRIDGE_PORTABLE_PROMPT);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[var(--primary-subtle)] border border-[var(--primary-border)] text-[var(--primary)] hover:bg-[var(--primary-border)] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPrompt ? "Copied Prompt!" : "Copy Prompt"}</span>
                </button>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl text-[11px] font-mono text-[var(--muted)] max-h-32 overflow-y-auto">
                {AI_BRIDGE_PORTABLE_PROMPT}
              </div>
            </div>

            {/* Response Input */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--ink)]">
                Step 2: Paste the LLM&apos;s response here
              </span>
              <textarea
                rows={7}
                value={aiBridgeInput}
                onChange={(e) => setAiBridgeInput(e.target.value)}
                placeholder="Paste the output from ChatGPT / Claude / Gemini containing ===OPPORTUNITY_PROFILE_START===..."
                className="input w-full p-4 font-mono text-xs"
              />
            </div>

            {importError && (
              <div className="p-3.5 bg-[var(--error-surface)] border border-[var(--error-border)] text-[var(--error-text)] text-xs rounded-xl">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentPath("select")}
                className="btn btn-secondary btn-sm"
              >
                Back
              </button>
              <button
                onClick={handleParseAiBridge}
                disabled={!aiBridgeInput.trim()}
                className="btn btn-primary flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>Verify & Review</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 7: ACTIVATION MOMENT (SHOW MATCHES IMMEDIATELY) */}
        {/* ==================================================== */}
        {currentPath === "activation" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {activating ? (
              <div className="card p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center mx-auto text-[var(--primary)] animate-pulse">
                  <Compass size={32} className="animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--ink)]">
                  Scout is analyzing your profile...
                </h3>
                <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
                  Grounding your eligibility facts and discovering relevant fellowships, hackathons, and programs.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Value Header */}
                <div className="bg-gradient-to-r from-[var(--primary-subtle)]/50 via-white to-[var(--primary-subtle)]/30 border border-[var(--primary-border)] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)]">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                        Activation Moment
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-[var(--ink)]">
                        Scout found {totalFoundCount} things worth checking.
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--muted)] mt-2">
                    Based on your confirmed eligibility facts and interests, here are the top 3 high-signal matches ready for you right now:
                  </p>
                </div>

                {/* Top 3 Opportunity Cards */}
                <div className="space-y-3">
                  {topMatches.map(({ opportunity, explanation }, idx) => (
                    <div
                      key={opportunity.id || idx}
                      className="p-5 card hover:border-[var(--primary-border)] shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)] uppercase tracking-wide">
                            {opportunity.category || "fellowship"}
                          </span>
                          {explanation?.match_tier && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4FCE3] text-[#1F3800] border border-[#C5F36B]">
                              {explanation.match_tier} Match ({explanation.fit_score || 92}%)
                            </span>
                          )}
                          <span className="text-xs text-[var(--muted)]">
                            {opportunity.organizer}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-[var(--ink)]">
                          {opportunity.title}
                        </h4>

                        <p className="text-xs text-[var(--muted)] line-clamp-2">
                          {opportunity.summary}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-[var(--muted)] pt-1">
                          {opportunity.funding_description && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <DollarSign size={13} />
                              <span>{opportunity.funding_description.slice(0, 40)}...</span>
                            </span>
                          )}
                          {opportunity.deadline && (
                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                              <Calendar size={13} />
                              <span>Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col items-center gap-2">
                        <button
                          onClick={() => router.push(`/opportunities/${opportunity.id}`)}
                          className="btn btn-secondary btn-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main CTAs */}
                <div className="p-6 card flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">
                      Ready to dive in?
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      Your personalized feed is active. You can refine your profile anytime.
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => router.push("/profile")}
                      className="btn btn-secondary btn-sm flex-1 sm:flex-none"
                    >
                      Improve my profile
                    </button>
                    <button
                      onClick={() => router.push("/for-you")}
                      className="btn btn-primary btn-sm flex-1 sm:flex-none flex items-center justify-center gap-2"
                    >
                      <span>Explore my matches</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extraction Review Modal */}
        <ExtractionReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          facts={reviewFacts}
          sourceTitle={reviewSourceTitle}
          onConfirmAll={handleConfirmReviewedFacts}
        />
      </div>
    </div>
  );
}
