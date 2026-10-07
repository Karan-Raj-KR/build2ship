"use client";
import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  Check,
} from "lucide-react";
import { Profile, ProfileEvidence, EvidenceKind, ProfileInsight } from "@/types/database";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountrySelector, NationalitySelector } from "@/components/ui/CountrySelector";
import { createAutosave } from "@/lib/autosave";
import { DISCOVERY_GOALS, profileCompletion } from '@/lib/journey';
import { generateContextMarkdown, generateContextJson } from "@/lib/contextExport";

const TABS = ["Profile", "Evidence", "Goals & Preferences", "Intelligence", "Export"];

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfileContent />
    </Suspense>
  );
}

function TagInput({
  value = [],
  onChange,
  placeholder,
}: {
  value?: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const currentList = Array.isArray(value) ? value : [];
  const currentTags = currentList.filter(tag => !draftTags.includes(tag));
  const updateDraft = (text: string) => {
    const incoming = text.split(/[,;\n]+/).map(tag => tag.trim()).filter(Boolean);
    const nextDraft = [...new Set(incoming)].filter(tag => !currentTags.includes(tag));
    setDraftTags(nextDraft);
    setInput(text);
    onChange([...currentTags, ...nextDraft]);
  };

  const commitTags = (text: string) => {
    const incoming = text.split(/[,;\n]+/).map(tag => tag.trim()).filter(Boolean);
    onChange([...new Set([...currentTags, ...incoming])]);
    setDraftTags([]);
    setInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {currentTags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#DDF4FF] text-[#0B72A4] border-2 border-[#1CB0F6] shadow-[0_2px_0_#1899D6]"
          >
            <span>{t}</span>
            <button
              type="button"
              onClick={() => onChange(currentList.filter((v) => v !== t))}
              className="text-[#0B72A4] hover:text-red-600 transition cursor-pointer font-black ml-0.5 text-sm leading-none"
              title={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
          value={input}
          onChange={(e) => updateDraft(e.target.value)}
          placeholder={placeholder ?? "Type and press Enter or comma..."}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitTags(input);
            }
          }}
        />
      </div>
    </div>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "export") return "Export";
    if (requestedTab === "intelligence" || requestedTab === "elara-v2" || requestedTab === "elara_v2" || requestedTab === "eligent-v2" || requestedTab === "eligent_v2") return "Intelligence";
    if (requestedTab === "evidence") return "Evidence";
    if (requestedTab === "preferences") return "Goals & Preferences";
    return "Profile";
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [evidence, setEvidence] = useState<ProfileEvidence[]>([]);
  const [insight, setInsight] = useState<ProfileInsight | null>(null);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  
  // Auto-Save States
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<string>("");


  const [addingEvidence, setAddingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Partial<ProfileEvidence>>({ kind: "project", tags: [] });

  const [exportSections, setExportSections] = useState({
    background: true, education: true, skills: true, evidence: true, preferences: true,
  });
  const [exportFormat, setExportFormat] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);

  const [autosave] = useState(() => createAutosave<Profile>(async payload => {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your profile.");
      setProfile(previous => previous ? { ...previous, updated_at: data.profile.updated_at } : data.profile);
    }, status => {
      setSaveStatus(status);
      if (status === "saved") {
        setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        window.dispatchEvent(new Event('elara:progress'));
      }
    }));

  const queueAutoSave = useCallback((updates: Partial<Profile>) => {
    setProfile(previous => previous ? { ...previous, ...updates } : previous);
    setSaveStatus("saving");
    autosave.update(updates);
  }, [autosave]);

  useEffect(() => {
    const retry = () => autosave.retry();
    const guard = (event: BeforeUnloadEvent) => {
      if (autosave.hasPending()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', guard);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('beforeunload', guard);
    };
  }, [autosave]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok || !data.profile) throw new Error("Could not load your profile. Please try again.");
      setProfile(data.profile);
      setLoadError("");
      // Profile editing need not wait for ancillary evidence and insights queries.
      setLoading(false);
      const userId = data.profile.id;
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const [ev, ins] = await Promise.allSettled([
        supabase.from("profile_evidence").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("profile_insights").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (ev.status === 'fulfilled' && ev.value.data) setEvidence(ev.value.data);
      if (ins.status === 'fulfilled' && !ins.value.error && ins.value.data) {
        setInsight(ins.value.data);
      } else {
        const cached = localStorage.getItem(`opp_insight_${userId}`);
        if (cached) { try { setInsight(JSON.parse(cached)); } catch {} }
      }
    } catch (err) {
      if (err instanceof Error) setLoadError(err.message);
      console.error("Error loading profile data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadData(); }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const isInsightStale = useMemo(() => {
    if (!profile || !insight) return false;
    return new Date(profile.updated_at) > new Date(insight.created_at);
  }, [profile, insight]);

  const exportText = useMemo(() => {
    if (!profile) return "";
    return exportFormat === "markdown"
      ? generateContextMarkdown(profile, evidence, exportSections)
      : generateContextJson(profile, evidence, exportSections);
  }, [exportSections, exportFormat, profile, evidence]);

  async function handleRunAnalysis() {
    setAnalyzingProfile(true);
    setAnalysisError("");
    try {
      const resp = await fetch("/api/profile/analyze", { method: "POST" });
      const data = await resp.json();
      if (resp.ok && data.insight) {
        setInsight(data.insight);
        try {
          const key = profile?.id || "current";
          localStorage.setItem(`opp_insight_${key}`, JSON.stringify(data.insight));
        } catch (_) {}
      } else {
        setAnalysisError(data.error || "Analysis failed. Please try again.");
      }
    } catch (err) {
      console.error("Error analyzing profile:", err);
      setAnalysisError("Network or server error analyzing profile. Please try again.");
    } finally {
      setAnalyzingProfile(false);
    }
  }

  async function addEvidenceItem() {
    if (!newEvidence.title?.trim()) return;
    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profile_evidence")
        .insert({ ...newEvidence, user_id: user.id, confirmed: true })
        .select()
        .single();
      if (data) {
        setEvidence((prev) => [data, ...prev]);
        setAddingEvidence(false);
        setNewEvidence({ kind: "project", tags: [] });
      }
    } catch (err) {
      console.error("Error adding evidence:", err);
    }
  }

  async function deleteEvidenceItem(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      await supabase.from("profile_evidence").delete().eq("id", id);
      setEvidence((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Error deleting evidence:", err);
    }
  }

  async function handleCopy() {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (!profile) return;
    const { trackEvent } = await import("@/lib/analytics");
    await trackEvent(profile.id, "context_exported").catch(() => {});
  }

  async function handleDownload() {
    const blob = new Blob([exportText], { type: exportFormat === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elara-context-pack.${exportFormat === "json" ? "json" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
    if (!profile) return;
    const { trackEvent } = await import("@/lib/analytics");
    await trackEvent(profile.id, "context_exported").catch(() => {});
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div className="text-center py-16" role="alert"><p>{loadError || "Could not load your profile."}</p><button className="btn btn-secondary mt-4" onClick={() => { void loadData(); }}>Retry loading profile</button></div>;

  const p = profile;
  const completion = profileCompletion(profile);

  return (
    <div className="page-frame max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shadow-[0_3px_0_#46A302]">
            <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">
              Profile
            </h1>
            <p className="text-xs font-semibold text-[var(--ink-muted)]">
              Your background, verified evidence, and opportunity fit facts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Auto-Save Status Badge */}
          <div role="status" aria-live="polite" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition-all duration-200 bg-white shadow-[0_2px_0_#E3E7EA] border-[var(--border)]">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-[#0B72A4]">
                <RefreshCw size={12} className="animate-spin text-[#1CB0F6]" strokeWidth={2.5} />
                <span>Auto-saving…</span>
              </span>
            ) : saveStatus === "saved" ? (
              <span className="flex items-center gap-1.5 text-[#287300]">
                <CheckCircle2 size={13} className="text-[#58CC02]" strokeWidth={2.5} />
                <span>Auto-saved</span>
              </span>
            ) : saveStatus === "error" ? (
              <span className="flex items-center gap-1.5 text-[#D93B3B]">
                <AlertCircle size={13} className="text-[#D93B3B]" strokeWidth={2.5} />
                <span>Not saved — retry</span>
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                <Check size={12} className="text-[#58CC02]" strokeWidth={2.5} />
                <span>Saved at {lastSaved}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--ink-muted)]">
                <span className="w-2 h-2 rounded-full bg-[#58CC02]" />
                <span>Changes save automatically</span>
              </span>
            )}
          </div>

          <Link
            href="/ai-bridge"
            className="btn btn-secondary btn-sm px-3 flex items-center gap-1.5 font-bold"
            title="Sync CLI and AI Bridge Context"
          >
            <Layers size={14} className="text-[#1CB0F6]" strokeWidth={2.5} />
            <span>AI Bridge</span>
          </Link>
          <Link href="/contributions" className="btn btn-secondary btn-sm font-bold">
            Build your open source experience
          </Link>
        </div>
      </div>

      {/* Profile Completion Card */}
      <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-5 shadow-[0_4px_0_#E3E7EA] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between max-w-md">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">Profile Readiness</span>
            <span className="text-xs font-black text-[#287300] bg-[#EEFFD9] border-2 border-[#58CC02] px-2.5 py-0.5 rounded-full">{completion}% Complete</span>
          </div>
          <div className="w-full max-w-md bg-[#E3E7EA] h-3 rounded-full overflow-hidden border border-[#D0D7DE]">
            <div
              className="bg-[#58CC02] h-full rounded-full transition-all duration-500 shadow-[0_1px_0_#46A302]"
              style={{ width: `${Math.max(completion, 5)}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">
            More profile detail helps tailor recommendations and eligibility checks. Confirm requirements with each provider.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/discover" className="btn btn-primary btn-sm font-black text-xs flex items-center gap-1.5">
            <span>Find Opportunities</span>
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      {saveStatus === "error" && (
        <p className="alert alert-error font-bold" role="alert">
          Your latest edits have not been saved.{" "}
          <button className="underline cursor-pointer" onClick={() => autosave.retry()}>
            Retry saving
          </button>
        </p>
      )}

      {/* Tabs */}
      <div className="bg-[#F7F9FA] p-1.5 rounded-2xl border-2 border-[var(--border)] flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={isActive}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                isActive
                  ? "bg-white text-[var(--ink)] border-2 border-[var(--border)] shadow-[0_2px_0_#E3E7EA]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-white/50"
              }`}
            >
              {t === "Intelligence" ? "Insights" : t === "Profile" ? "Basics" : t === "Evidence" ? "Experience & Projects" : t === "Goals & Preferences" ? "Preferences" : t}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: INSIGHTS */}
      {/* ============================================================ */}
      {tab === "Intelligence" && (
        <div className="space-y-6">
          {analysisError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{analysisError}</span>
              </div>
              <button onClick={() => setAnalysisError("")} className="text-red-500 hover:text-red-800 text-xs font-semibold cursor-pointer">Dismiss</button>
            </div>
          )}
          {/* Header Action Card */}
          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02]">
                  <Sparkles size={14} strokeWidth={2.5} />
                  <span>Profile Insights</span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-[var(--ink)]">Your Competitive Edge & Signal Map</h2>
                <p className="text-sm font-semibold text-[var(--ink-muted)] leading-relaxed">
                  {insight?.summary ?? "Analyze your stored background and verified projects to discover key differentiators, unlocks, and eligibility barriers."}
                </p>
                {insight && isInsightStale && (
                  <div className="flex items-center gap-1.5 text-[#8A5200] text-xs mt-2 font-bold bg-[#FFF4D9] border-2 border-[#FFB020] px-3 py-1.5 rounded-xl">
                    <AlertCircle size={14} strokeWidth={2.5} />
                    <span>Profile was updated since last evaluation. Re-run analysis for fresh signals.</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={analyzingProfile}
                className="btn btn-primary shadow-xs shrink-0 flex items-center gap-2 px-5 py-3 text-xs font-black cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={analyzingProfile ? "animate-spin" : ""} strokeWidth={2.5} />
                {analyzingProfile ? "Analyzing Facts…" : insight ? "Re-analyze Profile" : "Run First Analysis"}
              </button>
            </div>
          </div>

          {insight ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Strongest Signals */}
              <div className="card p-5 border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldCheck className="text-blue-600" size={18} />
                  <h3>Strongest Verified Signals</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Hard evidence and demonstrated skills that reviewers see as major assets:
                </p>
                <ul className="space-y-2">
                  {insight.strongest_signals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Differentiators */}
              <div className="card p-5 border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Sparkles className="text-indigo-600" size={18} />
                  <h3>Personal Differentiators</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Combinations of background, location, and achievements that set you apart:
                </p>
                <ul className="space-y-2">
                  {insight.differentiators.map((diff, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-800 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/60">
                      <span className="text-indigo-600 font-bold">★</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unlocks & Next Actions */}
              <div className="card p-5 border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ArrowUpRight className="text-emerald-600" size={18} />
                  <h3>High-Leverage Opportunity Unlocks</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Programs you can realistically unlock with concrete next steps:
                </p>
                <div className="space-y-2.5">
                  {insight.likely_unlocks.map((unl, i) => (
                    <div key={i} className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs text-emerald-950">
                      {unl}
                    </div>
                  ))}
                  {insight.suggested_actions.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[11px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">Recommended Actions</div>
                      <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-inside">
                        {insight.suggested_actions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable Gaps & Barriers */}
              <div className="card p-5 border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <AlertCircle className="text-amber-600" size={18} />
                  <h3>Actionable Profile Gaps</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Missing information that directly blocks eligibility calculations:
                </p>
                {insight.actionable_gaps.length === 0 ? (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    ✓ All core eligibility fields are filled! Your profile can accurately evaluate all programs.
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {insight.actionable_gaps.map((gap, i) => (
                      <li key={i} className="p-3 bg-amber-50/50 rounded-lg border border-amber-100/70 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-900">{gap.gap}</span>
                          <span className="text-[10px] bg-amber-200/60 text-amber-800 font-medium px-2 py-0.5 rounded">
                            {gap.affected_count == null ? "May affect some matches" : `Affects ~${gap.affected_count} programs`}
                          </span>
                        </div>
                        <p className="text-gray-600">{gap.action}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center space-y-3">
              <EmptyState
                icon="search"
                title="No Profile Insights Generated Yet"
                description="Click 'Run First Analysis' to evaluate your background against international fellowship and hackathon criteria."
                action={
                  <button onClick={handleRunAnalysis} disabled={analyzingProfile} className="btn btn-primary btn-sm cursor-pointer">
                    {analyzingProfile ? "Analyzing Facts…" : "Analyze Profile Now"}
                  </button>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PROFILE (Identity & Education) */}
      {/* ============================================================ */}
      {tab === "Profile" && (
        <div className="space-y-6">
          <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Your Next Big Thing</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DISCOVERY_GOALS.map((goal) => {
                const isSelected = p.discovery_goal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    className={`p-3 rounded-xl border-2 text-xs font-black transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#EEFFD9] border-[#58CC02] text-[#287300] shadow-[0_3px_0_#46A302]'
                        : 'bg-[#F7F9FA] border-[var(--border)] text-[var(--ink)] hover:border-[#1CB0F6] shadow-[0_2px_0_#E3E7EA] active:translate-y-0.5'
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => queueAutoSave({ discovery_goal: goal })}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <div>
              <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Identity & Location</h2>
              <p className="text-xs font-semibold text-[var(--ink-muted)] mt-1">
                Citizenship, residence, and age are used only when an opportunity restricts who can apply. Missing details stay unknown.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="display-name">Display Name</label>
                <input
                  id="display-name"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.display_name ?? ""}
                  onChange={(e) => queueAutoSave({ display_name: e.target.value })}
                />
              </div>
              <div>
                <CountrySelector
                  id="country"
                  label="Country of Residence"
                  value={p.country_of_residence}
                  onChange={(code) => queueAutoSave({ country_of_residence: code })}
                />
              </div>
              <div>
                <NationalitySelector
                  id="nationalities"
                  label="Nationalities / Citizenships"
                  value={p.nationalities}
                  onChange={(v) => queueAutoSave({ nationalities: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="age-band">Age Band (optional)</label>
                <input
                  id="age-band"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.age_band ?? ""}
                  onChange={(e) => queueAutoSave({ age_band: e.target.value })}
                  placeholder="e.g. 18-24"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Education</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="university">University / Institution</label>
                <input
                  id="university"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.university ?? ""}
                  onChange={(e) => queueAutoSave({ university: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="degree">Degree</label>
                <input
                  id="degree"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.degree ?? ""}
                  onChange={(e) => queueAutoSave({ degree: e.target.value })}
                  placeholder="e.g. BSc Computer Science"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="field-of-study">Field of Study</label>
                <input
                  id="field-of-study"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.field_of_study ?? ""}
                  onChange={(e) => queueAutoSave({ field_of_study: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="education-stage">Education Stage</label>
                <select
                  id="education-stage"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer"
                  value={p.education_stage ?? ""}
                  onChange={(e) => queueAutoSave({ education_stage: e.target.value as Profile["education_stage"] })}
                >
                  <option value="">— select —</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="masters">Masters</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="study-year">Study Year or Experience Level</label>
                <input
                  id="study-year"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white mb-4"
                  value={p.study_year || ''}
                  onChange={event => queueAutoSave({ study_year: event.target.value })}
                  placeholder="Second year, recent graduate…"
                />
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="graduation">Expected Graduation</label>
                <input
                  id="graduation"
                  type="date"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.expected_graduation ?? ""}
                  onChange={(e) => queueAutoSave({ expected_graduation: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Skills & Interests</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Skills</label>
                <TagInput
                  value={p.skills}
                  onChange={(v) => queueAutoSave({ skills: v })}
                  placeholder="e.g. Python, Next.js, PyTorch"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Interests</label>
                <TagInput
                  value={p.interests}
                  onChange={(v) => queueAutoSave({ interests: v })}
                  placeholder="e.g. Climate Tech, Autonomous Agents"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: GOALS & PREFERENCES */}
      {/* ============================================================ */}
      {tab === "Goals & Preferences" && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Career Goals & Roles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Target Roles</label>
                <TagInput
                  value={p.target_roles ?? []}
                  onChange={(v) => queueAutoSave({ target_roles: v })}
                  placeholder="e.g. AI Engineer, Research Fellow, Founder"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Target Industries / Domains</label>
                <TagInput
                  value={p.target_industries ?? []}
                  onChange={(v) => queueAutoSave({ target_industries: v })}
                  placeholder="e.g. AI & Robotics, Open Source, Fintech, BioTech"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Preferred Destination Countries</label>
                <TagInput
                  value={p.preferred_countries ?? []}
                  onChange={(v) => queueAutoSave({ preferred_countries: v })}
                  placeholder="e.g. US, UK, Canada, Germany, Singapore"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Work Authorizations / Visa Status (optional)</label>
                <TagInput
                  value={p.work_authorizations ?? []}
                  onChange={(v) => queueAutoSave({ work_authorizations: v })}
                  placeholder="e.g. US Citizen, Green Card, F-1 OPT/CPT, EU Citizen, Indian Citizen, UK Right to Work"
                />
                <p className="text-xs font-semibold text-[var(--ink-muted)] mt-1.5">Used strictly to verify specific visa and work eligibility. Stored privately.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Opportunity & Travel Preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="participation-preference">Participation Preference</label>
                <select
                  id="participation-preference"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer"
                  value={p.participation_preference ?? ""}
                  onChange={(e) => queueAutoSave({ participation_preference: e.target.value as Profile["participation_preference"] })}
                >
                  <option value="">— select —</option>
                  <option value="remote">Remote only</option>
                  <option value="in-person">In-person</option>
                  <option value="both">Both remote & in-person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="effort-tolerance">Application Effort Tolerance</label>
                <select
                  id="effort-tolerance"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer"
                  value={p.effort_tolerance ?? ""}
                  onChange={(e) => queueAutoSave({ effort_tolerance: e.target.value as Profile["effort_tolerance"] })}
                >
                  <option value="">— any effort —</option>
                  <option value="quick">Quick (under 1 hour)</option>
                  <option value="moderate">Moderate (1-4 hours)</option>
                  <option value="significant">Significant (comprehensive proposal)</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={p.paid_only_preference ?? false}
                    onChange={(e) => queueAutoSave({ paid_only_preference: e.target.checked })}
                    className="w-5 h-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0 cursor-pointer"
                  />
                  <span>Prioritize paid opportunities only (stipends, prizes, funded fellowships)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={p.willing_to_travel ?? true}
                    onChange={(e) => queueAutoSave({ willing_to_travel: e.target.checked })}
                    className="w-5 h-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0 cursor-pointer"
                  />
                  <span>Willing to travel if travel funding/reimbursement is provided</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={p.willing_to_relocate ?? false}
                    onChange={(e) => queueAutoSave({ willing_to_relocate: e.target.checked })}
                    className="w-5 h-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0 cursor-pointer"
                  />
                  <span>Open to temporary international relocation (e.g. 3-month summer residencies)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Public Proof Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="github-url">GitHub Profile URL</label>
                <input
                  id="github-url"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.github_url ?? ""}
                  onChange={(e) => queueAutoSave({ github_url: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="portfolio-url">Personal Portfolio / Website</label>
                <input
                  id="portfolio-url"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.portfolio_url ?? ""}
                  onChange={(e) => queueAutoSave({ portfolio_url: e.target.value })}
                  placeholder="https://yourdomain.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5" htmlFor="linkedin-url">LinkedIn Profile URL</label>
                <input
                  id="linkedin-url"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={p.linkedin_url ?? ""}
                  onChange={(e) => queueAutoSave({ linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: EVIDENCE & PROJECTS */}
      {/* ============================================================ */}
      {tab === "Evidence" && (
        <div className="space-y-6">
          <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1" htmlFor="experience-summary">Your Experience and Projects</label>
            <textarea
              id="experience-summary"
              className="w-full text-sm font-medium rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white p-3.5 min-h-32 transition outline-none"
              maxLength={2000}
              value={p.experience_summary || ''}
              onChange={event => queueAutoSave({ experience_summary: event.target.value })}
              placeholder="What have you built, achieved, or tried?"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <p className="text-xs font-semibold text-[var(--ink-muted)]">Self-reported background helps you prepare. Add sources and project records below.</p>
              <Link href="/onboarding/import" className="text-xs font-black text-[#1CB0F6] hover:underline shrink-0">
                Import a résumé or background →
              </Link>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Your Evidence Library</h2>
              <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">Projects, achievements, and work samples attached directly to application answers.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/ai-bridge"
                className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5 font-bold"
                title="Import or sync evidence via AI Bridge"
              >
                <Layers size={13} className="text-[#1CB0F6]" strokeWidth={2.5} />
                <span>AI Bridge Import</span>
              </Link>
              {!addingEvidence && (
                <button onClick={() => setAddingEvidence(true)} className="btn btn-primary btn-sm font-black text-xs cursor-pointer">
                  + Add Evidence
                </button>
              )}
            </div>
          </div>

          {addingEvidence && (
            <div className="bg-white border-2 border-[#1CB0F6] rounded-2xl p-6 shadow-[0_4px_0_#1899D6] space-y-4">
              <div className="font-black text-sm text-[var(--ink)]">Add New Evidence Record</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Kind</label>
                  <select
                    className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#1CB0F6] focus:bg-white cursor-pointer"
                    value={newEvidence.kind}
                    onChange={(e) => setNewEvidence({ ...newEvidence, kind: e.target.value as EvidenceKind })}
                  >
                    <option value="project">Project (Code, Product, Open-Source)</option>
                    <option value="achievement">Achievement (Award, Contest, Hackathon)</option>
                    <option value="experience">Experience (Internship, Research, Leadership)</option>
                    <option value="fact">Fact / Personal Metric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Title *</label>
                  <input
                    className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#1CB0F6] focus:bg-white"
                    value={newEvidence.title ?? ""}
                    onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                    placeholder="e.g. Autonomous Multi-Agent Parser"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Description / Measurable Impact</label>
                  <textarea
                    className="w-full text-sm font-medium rounded-xl border-2 border-[var(--border)] focus:border-[#1CB0F6] focus:bg-white p-3 min-h-24 transition outline-none"
                    rows={3}
                    value={newEvidence.description ?? ""}
                    onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
                    placeholder="Built a streaming parser using Next.js and PyTorch. Indexed 50k documents with 99.4% accuracy..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Evidence / Live URL</label>
                  <input
                    className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#1CB0F6] focus:bg-white"
                    value={newEvidence.evidence_url ?? ""}
                    onChange={(e) => setNewEvidence({ ...newEvidence, evidence_url: e.target.value })}
                    placeholder="https://github.com/... or live demo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">Tags / Technologies</label>
                  <TagInput
                    value={newEvidence.tags ?? []}
                    onChange={(v) => setNewEvidence({ ...newEvidence, tags: v })}
                    placeholder="e.g. Next.js, Python, PostgreSQL"
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button onClick={addEvidenceItem} className="btn btn-primary btn-sm font-black text-xs cursor-pointer">Save Evidence</button>
                <button onClick={() => setAddingEvidence(false)} className="btn btn-secondary btn-sm font-bold text-xs cursor-pointer">Cancel</button>
              </div>
            </div>
          )}

          {evidence.length === 0 && !addingEvidence ? (
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-8 text-center shadow-[0_4px_0_#E3E7EA]">
              <EmptyState
                icon="file"
                title="No evidence items yet"
                description="Add your projects, hackathons, and achievements so the AI Answer Assistant can ground your proposals in real facts."
                action={
                  <button onClick={() => setAddingEvidence(true)} className="btn btn-primary btn-sm font-black text-xs cursor-pointer">
                    Add First Project
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((item) => (
                <div key={item.id} className="bg-white border-2 border-[var(--border)] rounded-2xl p-4 shadow-[0_3px_0_#E3E7EA] hover:border-[#1CB0F6] flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full border-2 border-[#1CB0F6] bg-[#DDF4FF] text-[#0B72A4] text-[11px] font-black uppercase tracking-wider">{item.kind}</span>
                      <h4 className="text-sm font-black text-[var(--ink)]">{item.title}</h4>
                      {item.evidence_url && (
                        <a href={item.evidence_url} target="_blank" rel="noreferrer" className="text-[#1CB0F6] hover:underline text-xs font-bold inline-flex items-center gap-0.5">
                          View Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {item.description && <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">{item.description}</p>}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.tags.map((t) => (
                          <span key={t} className="text-[11px] font-extrabold bg-[#F7F9FA] text-[var(--ink)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteEvidenceItem(item.id)} className="text-[var(--ink-muted)] hover:text-[#D93B3B] text-xs font-bold shrink-0 self-end sm:self-auto cursor-pointer transition">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: AI EXPORT */}
      {/* ============================================================ */}
      {tab === "Export" && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
            <div>
              <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Portable Context Pack</h2>
              <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
                Export your structured background into ChatGPT, Claude, Gemini, or Perplexity. You control what is shared.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 py-3 border-y-2 border-[var(--border)] text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--ink)] bg-[#F7F9FA] px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6]">
                <input type="checkbox" checked={exportSections.background} onChange={(e) => setExportSections({ ...exportSections, background: e.target.checked })} className="rounded text-[#58CC02] focus:ring-0" />
                <span>Background</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--ink)] bg-[#F7F9FA] px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6]">
                <input type="checkbox" checked={exportSections.education} onChange={(e) => setExportSections({ ...exportSections, education: e.target.checked })} className="rounded text-[#58CC02] focus:ring-0" />
                <span>Education</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--ink)] bg-[#F7F9FA] px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6]">
                <input type="checkbox" checked={exportSections.skills} onChange={(e) => setExportSections({ ...exportSections, skills: e.target.checked })} className="rounded text-[#58CC02] focus:ring-0" />
                <span>Skills & Goals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--ink)] bg-[#F7F9FA] px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6]">
                <input type="checkbox" checked={exportSections.evidence} onChange={(e) => setExportSections({ ...exportSections, evidence: e.target.checked })} className="rounded text-[#58CC02] focus:ring-0" />
                <span>Evidence ({evidence.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[var(--ink)] bg-[#F7F9FA] px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6]">
                <input type="checkbox" checked={exportSections.preferences} onChange={(e) => setExportSections({ ...exportSections, preferences: e.target.checked })} className="rounded text-[#58CC02] focus:ring-0" />
                <span>Preferences</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-[#F7F9FA] p-1 rounded-xl border-2 border-[var(--border)]">
                <button
                  onClick={() => setExportFormat("markdown")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${exportFormat === "markdown" ? "bg-white text-[var(--ink)] shadow-[0_2px_0_#E3E7EA] border border-[var(--border)]" : "text-[var(--ink-muted)]"}`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setExportFormat("json")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${exportFormat === "json" ? "bg-white text-[var(--ink)] shadow-[0_2px_0_#E3E7EA] border border-[var(--border)]" : "text-[var(--ink-muted)]"}`}
                >
                  JSON
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="btn btn-primary btn-sm font-black text-xs cursor-pointer">
                  {copied ? "Copied!" : "Copy Context Pack"}
                </button>
                <button onClick={handleDownload} className="btn btn-secondary btn-sm font-bold text-xs cursor-pointer">
                  Download File
                </button>
              </div>
            </div>

            <pre className="p-4 bg-[#263238] text-[#F7F9FA] rounded-2xl border-2 border-[#1E262B] text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
              {exportText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
