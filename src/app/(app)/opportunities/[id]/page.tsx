"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Opportunity, Application, OpportunityAnalysis, EligibilityReportItem } from "@/types/database";
import {
  formatDeadline,
  categoryLabel,
  participationModeLabel,
  fundingKindLabel,
  formatDate,
} from "@/lib/utils";
import { resolveOpportunityStatus } from "@/lib/opportunityStatus";
import { Badge } from "@/components/ui/Badge";
import { PageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, ExternalLink, ArrowLeft, Calendar, MapPin, DollarSign, CheckCircle2, XCircle, HelpCircle, ArrowRight, ShieldAlert, ShieldCheck, FileText } from "lucide-react";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eligibility analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    import("@/lib/db/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        const [oppRes, appRes, analysisRes] = await Promise.all([
          supabase.from("opportunities").select("*").eq("id", id).maybeSingle(),
          user
            ? supabase
                .from("applications")
                .select("*")
                .eq("opportunity_id", id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          user
            ? supabase
                .from("analysis_records")
                .select("*")
                .eq("opportunity_id", id)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        try {
          if (oppRes.data) setOpp(oppRes.data);
          if (appRes.data) setApplication(appRes.data);
          if (analysisRes.data) setAnalysis(analysisRes.data);
        } catch (err) {
          console.error("Error loading opportunity detail:", err);
        } finally {
          setLoading(false);
        }
      });
    });
  }, [id]);

  const runAnalysis = useCallback(async () => {
    if (!opp) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opp.id }),
      });
      const report = await response.json();
      if (!response.ok) throw new Error(report.error || "Analysis could not be saved.");
      setAnalysis(report);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }, [opp]);

  async function handleSave() {
    if (!opp) return;
    setSaving(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }
      const { data, error: e } = await supabase
        .from("applications")
        .insert({ user_id: user.id, opportunity_id: opp.id, stage: "saved" })
        .select()
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      setApplication(data);
      router.push(`/workspace/${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  if (!opp) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <Search size={40} className="mx-auto text-[var(--muted)]" />
        <h1 className="text-xl font-black text-[var(--ink)]">Opportunity not found</h1>
        <p className="text-sm font-semibold text-[var(--muted)]">
          The opportunity may have been removed or is unavailable.
        </p>
        <Link href="/discover" className="btn btn-secondary btn-sm inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Discover
        </Link>
      </div>
    );
  }

  const status = resolveOpportunityStatus(opp.deadline, opp.source_status, opp.timezone_known);
  const requirements = getRequirements(opp);
  const requiredDocs = getRequiredDocuments(opp);

  return (
    <div className="page-frame max-w-5xl mx-auto space-y-8">
      {/* Top Header Card */}
      <section className="card p-6 sm:p-8 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-5">
        <div>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#58CC02] hover:underline mb-4"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>Back to Discover Feed</span>
          </Link>

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 flex-wrap mb-2.5">
                {opp.is_demo && <Badge variant="yellow">Demo Record</Badge>}
                {opp.category && <Badge variant="blue">{categoryLabel(opp.category)}</Badge>}
                {opp.participation_mode && (
                  <Badge variant="gray">{participationModeLabel(opp.participation_mode)}</Badge>
                )}
                {status.isClosed && <Badge variant="red">Applications Closed</Badge>}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight leading-snug">
                {opp.title}
              </h1>

              {opp.organizer && (
                <p className="text-sm font-extrabold text-[var(--muted)] mt-1.5 flex items-center gap-2">
                  <span>Provided by</span>
                  <span className="text-[var(--ink)]">{opp.organizer}</span>
                </p>
              )}
            </div>

            {/* Quick Actions Cluster */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {application ? (
                <Link
                  href={`/workspace/${application.id}`}
                  className="btn btn-primary flex items-center justify-center gap-2"
                >
                  <span>Open Application Workspace</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || status.isClosed}
                  className="btn btn-primary"
                  id="save-to-workspace-btn"
                >
                  {saving ? "Saving…" : status.isClosed ? "Deadline Passed" : "Save to Workspace"}
                </button>
              )}

              {(opp.official_url || opp.source_url) && (
                <a
                  href={opp.official_url || opp.source_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex items-center justify-center gap-2"
                >
                  <span>Official Portal</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {/* 1. KEY FACTS GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deadline Card */}
        <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white">
          <div className="text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-[#1CB0F6]" />
            <span>Deadline</span>
          </div>
          <div className="text-base font-black text-[var(--ink)]">
            {formatDeadline(opp.deadline, opp.timezone_known)}
          </div>
          <p className="text-[11px] font-semibold text-[var(--muted)] mt-1">
            {opp.timezone_known
              ? opp.deadline_timezone || "Timezone confirmed"
              : "Timezone unconfirmed — verify source"}
          </p>
        </div>

        {/* Location & Format */}
        <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white">
          <div className="text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <MapPin size={13} className="text-[#FFB020]" />
            <span>Location</span>
          </div>
          <div className="text-base font-black text-[var(--ink)] truncate">
            {opp.location || "Not specified"}
          </div>
          <p className="text-[11px] font-semibold text-[var(--muted)] mt-1">
            {participationModeLabel(opp.participation_mode)}
          </p>
        </div>

        {/* Benefits & Funding */}
        <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white">
          <div className="text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <DollarSign size={13} className="text-[#58CC02]" />
            <span>Funding & Benefits</span>
          </div>
          <div className="text-base font-black text-[var(--ink)]">
            {fundingKindLabel(opp.funding_kind)}
          </div>
          <p className="text-[11px] font-semibold text-[var(--muted)] mt-1 line-clamp-1">
            {opp.funding_description || "Details need confirmation"}
          </p>
        </div>

        {/* Status Verification */}
        <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white">
          <div className="text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#58CC02]" />
            <span>Status</span>
          </div>
          <div
            className={`text-base font-black ${
              status.isClosed ? "text-red-600" : "text-[#287300]"
            }`}
          >
            {status.isClosed ? "Closed" : "Open (verified)"}
          </div>
          <p className="text-[11px] font-semibold text-[var(--muted)] mt-1">
            {opp.retrieved_at ? `Checked ${formatDate(opp.retrieved_at)}` : "Pending review"}
          </p>
        </div>
      </section>

      {/* 2. OVERVIEW SECTION */}
      {opp.summary && (
        <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-3">
          <h2 className="section-title text-lg font-black">Overview</h2>
          <p className="text-sm font-semibold text-[var(--ink)] leading-relaxed whitespace-pre-line max-w-3xl">
            {opp.summary}
          </p>
        </section>
      )}

      {/* 3. REQUIREMENTS & DOCUMENTS */}
      <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-5">
        <h2 className="section-title text-lg font-black">Program Requirements</h2>

        {requirements.length > 0 ? (
          <div className="space-y-2.5">
            {requirements.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--canvas)] border-2 border-[var(--line)]"
              >
                <Badge
                  variant={
                    r.mandatory === "mandatory"
                      ? "red"
                      : r.mandatory === "preferred"
                      ? "yellow"
                      : "gray"
                  }
                  className="shrink-0 text-[11px]"
                >
                  {r.mandatory}
                </Badge>
                <div className="text-sm font-bold text-[var(--ink)] flex-1 leading-snug">
                  {r.text}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-[var(--muted)]">
            Standard eligibility requirements are not listed in this catalogue entry. Refer to the provider’s official documentation.
          </p>
        )}

        {requiredDocs.length > 0 && (
          <div className="pt-4 border-t-2 border-[var(--line)]">
            <h3 className="text-xs font-black text-[var(--muted)] uppercase tracking-wider mb-2">
              Materials to Prepare
            </h3>
            <div className="flex flex-wrap gap-2">
              {requiredDocs.map((doc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[var(--line)] bg-white text-xs font-black text-[var(--ink)] shadow-[0_1px_0_#E3E7EA]"
                >
                  <FileText size={13} className="text-[#1CB0F6]" />
                  <span>{doc}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. ELIGIBILITY EVALUATION (Rule-by-rule rows & AI Guidance) */}
      <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b-2 border-[var(--line)]">
          <div>
            <h2 className="section-title text-lg font-black">Requirement-Level Eligibility</h2>
            <p className="text-xs font-semibold text-[var(--muted)]">
              Evaluated against your verified profile facts.
            </p>
          </div>

          {!analysis && (
            <button
              onClick={runAnalysis}
              disabled={analysisLoading}
              className="btn btn-primary btn-sm"
            >
              {analysisLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> Evaluating…
                </span>
              ) : (
                "Run Eligibility Check"
              )}
            </button>
          )}
        </div>

        {analysisError && <div className="alert alert-error">{analysisError}</div>}

        {analysis ? (
          <div className="space-y-6">
            {/* Top Verdict Pill Banner */}
            <div className="p-4 rounded-xl border-2 flex items-center justify-between gap-4 flex-wrap bg-[var(--canvas)] border-[var(--line)]">
              <div className="flex items-center gap-3">
                {analysis.overall_verdict === "likely_eligible" ? (
                  <ShieldCheck size={28} className="text-[#58CC02]" />
                ) : analysis.overall_verdict === "likely_ineligible" ? (
                  <ShieldAlert size={28} className="text-red-600" />
                ) : (
                  <HelpCircle size={28} className="text-amber-500" />
                )}
                <div>
                  <div className="text-base font-black text-[var(--ink)]">
                    {analysis.overall_verdict === "likely_eligible"
                      ? "Likely Eligible based on current facts"
                      : analysis.overall_verdict === "likely_ineligible"
                      ? "Potential Eligibility Restriction"
                      : "Needs Information"}
                  </div>
                  <p className="text-xs font-semibold text-[var(--muted)] mt-0.5">
                    Profile readiness estimate: {analysis.readiness_score}% (Confidence:{" "}
                    {Math.round(analysis.confidence * 100)}%)
                  </p>
                </div>
              </div>

              <button
                onClick={runAnalysis}
                disabled={analysisLoading}
                className="btn btn-secondary btn-sm font-bold"
              >
                {analysisLoading ? "Re-checking…" : "Re-check"}
              </button>
            </div>

            {/* Blockers & Gaps */}
            {analysis.blockers.length > 0 && (
              <div className="p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-900 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-700">
                  <XCircle size={15} />
                  <span>Unmet Mandatory Criteria</span>
                </div>
                <ul className="list-disc pl-5 text-xs font-bold space-y-1">
                  {analysis.blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rule-by-rule rows */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[var(--muted)] uppercase tracking-wider">
                Rule-by-rule breakdown
              </h3>
              <div className="space-y-2.5">
                {analysis.report_items.map((item: EligibilityReportItem, i: number) => {
                  const isMet = item.verdict === "met";
                  const isUnmet = item.verdict === "unmet";

                  return (
                    <div
                      key={i}
                      className="p-4 rounded-xl border-2 border-[var(--line)] bg-white shadow-[0_2px_0_#E3E7EA] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {isMet ? (
                            <span className="w-5 h-5 rounded-full bg-[#58CC02] text-white flex items-center justify-center shrink-0">
                              <CheckCircle2 size={13} strokeWidth={3} />
                            </span>
                          ) : isUnmet ? (
                            <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                              <XCircle size={13} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                              <HelpCircle size={13} strokeWidth={3} />
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-[var(--ink)]">
                            {item.requirement_text}
                          </span>
                        </div>

                        <Badge
                          variant={isMet ? "green" : isUnmet ? "red" : "yellow"}
                          className="text-[11px] capitalize"
                        >
                          {item.verdict.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <p className="text-xs font-semibold text-[var(--muted)] pl-7">
                        {item.explanation}
                      </p>

                      {item.evidence && (
                        <div className="text-xs font-bold text-[var(--ink)] pl-7">
                          <span className="text-[var(--subtle)]">User Evidence:</span> {item.evidence}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separate Visibly Labeled AI Explanations */}
            <div className="p-4 rounded-xl border-2 border-[var(--line)] bg-[var(--canvas)] text-xs text-[var(--muted)] font-semibold space-y-1">
              <strong className="block text-[var(--ink)] font-black">
                AI Evaluation Disclosure
              </strong>
              <p>
                Eligibility analysis parses self-reported profile facts against publicly indexed opportunity rules. It does not replace official program eligibility guidelines or guarantee selection.
              </p>
            </div>
          </div>
        ) : !analysisLoading ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm font-semibold text-[var(--muted)]">
              Evaluate your saved profile against this opportunity’s requirements.
            </p>
            <button onClick={runAnalysis} className="btn btn-primary btn-sm">
              Check My Eligibility
            </button>
          </div>
        ) : null}
      </section>

      {/* 5. NEXT STEPS / APPLICATION CALL TO ACTION */}
      <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[var(--ink)]">Ready to take action?</h2>
          <p className="text-xs font-semibold text-[var(--muted)] mt-1">
            Track tasks and document preparation inside your build2ship workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {application ? (
            <Link href={`/workspace/${application.id}`} className="btn btn-primary">
              <span>Go to Workspace</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || status.isClosed}
              className="btn btn-primary"
            >
              {saving ? "Saving…" : "Start Preparation"}
            </button>
          )}

          {(opp.official_url || opp.source_url) && (
            <a
              href={opp.official_url || opp.source_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center gap-1.5"
            >
              <span>Provider Site</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

// Helpers
function getRequirements(opp: Opportunity) {
  if (opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    if (Array.isArray(reqs.items)) {
      return reqs.items as Array<{
        text: string;
        type: string;
        mandatory: string;
        comparison_rule: unknown;
      }>;
    }
  }
  return [];
}

function getRequiredDocuments(opp: Opportunity): string[] {
  if (opp.required_documents?.length) return opp.required_documents;
  if (opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    if (Array.isArray(reqs.required_documents)) return reqs.required_documents as string[];
  }
  return [];
}
