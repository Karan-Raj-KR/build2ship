"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ExtractedOpportunity, ExtractionResult } from "@/lib/ingestion/types";

const INGEST_BUFFER_KEY = "eligent_ingest_buffer";

export default function IngestPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedOpp, setEditedOpp] = useState<ExtractedOpportunity | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoredFromBuffer, setRestoredFromBuffer] = useState(false);

  // Restore buffer on mount if user navigated away and returned
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(INGEST_BUFFER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.result && parsed.editedOpp) {
          // Hydrate the persisted session buffer after mounting.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setResult(parsed.result);
          setEditedOpp(parsed.editedOpp);
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.url) setUrl(parsed.url);
          if (parsed.text) setText(parsed.text);
          setRestoredFromBuffer(true);
        }
      }
    } catch (_) {}
  }, []);

  const handleClearBuffer = useCallback(() => {
    try {
      sessionStorage.removeItem(INGEST_BUFFER_KEY);
    } catch (_) {}
    setResult(null);
    setEditedOpp(null);
    setEditing(false);
    setUrl("");
    setText("");
    setError(null);
    setRestoredFromBuffer(false);
  }, []);

  const handleIngest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setRestoredFromBuffer(false);

    try {
      const payload =
        mode === "url"
          ? { mode: "url", url }
          : { mode: "text", text };

      if (mode === "url" && !url.trim()) {
        setError("Please enter a URL.");
        return;
      }
      if (mode === "text" && text.trim().length < 50) {
        setError("Please paste at least 50 characters of opportunity text.");
        return;
      }

      const resp = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Ingestion failed.");
        return;
      }

      setResult(data);
      if (data.opportunity) {
        setEditedOpp(data.opportunity);
        try {
          sessionStorage.setItem(
            INGEST_BUFFER_KEY,
            JSON.stringify({
              result: data,
              editedOpp: data.opportunity,
              mode,
              url,
              text,
              timestamp: Date.now(),
            })
          );
        } catch (_) {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [mode, url, text]);

  const handleSave = useCallback(async () => {
    if (!editedOpp) return;
    setSaving(true);
    setError(null);
    try {
      // Save via canonical API endpoint (works in demo and production)
      const resp = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save", opportunity: editedOpp }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      // Successfully saved! Clear buffer
      try {
        sessionStorage.removeItem(INGEST_BUFFER_KEY);
      } catch (_) {}

      // Directly route to Applications workspace where it appears in Saved column!
      router.push("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [editedOpp, router]);

  const opp = editedOpp;

  return (
    <div className="page-frame max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/discover" className="text-xs font-bold text-[#1CB0F6] hover:underline mb-3 inline-flex items-center gap-1">
          ← Back to discover
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shadow-[0_3px_0_#46A302]">
            <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">Import Opportunity</h1>
            <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
              Paste a URL or raw opportunity text. We&apos;ll extract the requirements and eligibility rules.
            </p>
          </div>
        </div>
      </div>

      {restoredFromBuffer && result && (
        <div className="p-4 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] text-xs font-black text-[#287300] shadow-[0_2px_0_#46A302] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
            <span>Restored your extracted opportunity from buffer so you don&apos;t have to re-extract.</span>
          </div>
          <button
            onClick={handleClearBuffer}
            className="text-xs font-black text-[#287300] hover:underline cursor-pointer ml-3 shrink-0"
          >
            Clear / Start Over
          </button>
        </div>
      )}

      {error && <div className="alert alert-error font-bold" role="alert">{error}</div>}

      {!result && (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex p-1.5 bg-[#F7F9FA] border-2 border-[var(--border)] rounded-2xl text-xs font-black gap-1.5 w-fit">
            <button
              onClick={() => setMode("url")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                mode === "url"
                  ? "bg-white text-[var(--ink)] border-2 border-[var(--border)] shadow-[0_2px_0_#E3E7EA]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Import from URL
            </button>
            <button
              onClick={() => setMode("text")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                mode === "text"
                  ? "bg-white text-[var(--ink)] border-2 border-[var(--border)] shadow-[0_2px_0_#E3E7EA]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Paste Text
            </button>
          </div>

          {mode === "url" ? (
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">Opportunity URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/opportunity"
                className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                disabled={loading}
              />
              <p className="text-xs font-semibold text-[var(--ink-muted)]">
                We&apos;ll fetch the official page, parse requirements, and extract structured criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">Opportunity Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full text of the opportunity listing here..."
                rows={12}
                className="w-full bg-[#F7F9FA] border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white rounded-xl p-4 text-xs font-mono text-[var(--ink)] transition outline-none"
                disabled={loading}
              />
              <p className="text-xs font-semibold text-[var(--ink-muted)]">
                Paste the program description, requirements, and application details (at least 50 characters).
              </p>
            </div>
          )}

          <button
            onClick={handleIngest}
            disabled={loading || (mode === "url" ? !url.trim() : text.trim().length < 50)}
            className="btn btn-primary font-black text-xs px-6 py-3 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" /> Extracting…
              </span>
            ) : (
              "Extract Details"
            )}
          </button>
        </div>
      )}

      {/* Extraction result / preview */}
      {result && opp && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black border-2 ${result.success ? "bg-[#EEFFD9] text-[#287300] border-[#58CC02]" : "bg-[#FFE5E5] text-[#991B1B] border-[#D93B3B]"}`}>
              {result.success ? "Extraction Successful" : "Extraction Issues"}
            </span>
            {result.warnings.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#FFF4D9] text-[#8A5200] border-2 border-[#FFB020]">
                {result.warnings.length} warning(s)
              </span>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="card p-4 border-[#FDE3A7] bg-[#FEF7E6]">
              <h3 className="text-sm font-semibold text-[#8A5800] mb-2">Warnings</h3>
              <ul className="list-disc list-inside text-sm text-[#8A5800] space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="card p-4 border-[var(--error-border)] bg-[var(--error-surface)]">
              <h3 className="text-sm font-semibold text-[var(--error-text)] mb-2">Errors</h3>
              <ul className="list-disc list-inside text-sm text-[var(--error-text)] space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable preview */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Extracted Opportunity</h2>
              <div className="flex items-center gap-2">
                {opp.source_url && (
                  <span className="text-xs text-gray-400">
                    From: {new URL(opp.source_url).hostname}
                  </span>
                )}
                <button
                  onClick={() => setEditing(!editing)}
                  className="btn btn-secondary btn-sm"
                >
                  {editing ? "Lock fields" : "Edit fields"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Title</label>
                {editing ? (
                  <input
                    value={opp.title}
                    onChange={(e) => setEditedOpp({ ...opp, title: e.target.value })}
                    className="input"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{opp.title}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Organizer</label>
                {editing ? (
                  <input
                    value={opp.organizer ?? ""}
                    onChange={(e) => setEditedOpp({ ...opp, organizer: e.target.value || null })}
                    className="input"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{opp.organizer ?? "—"}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Category</label>
                {editing ? (
                  <select
                    value={opp.category}
                    onChange={(e) => setEditedOpp({ ...opp, category: e.target.value as ExtractedOpportunity["category"] })}
                    className="input"
                  >
                    <option value="hackathon">Hackathon</option>
                    <option value="fellowship">Fellowship</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="internship">Internship</option>
                    <option value="grant">Grant</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <Badge variant="blue">{opp.category}</Badge>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Location</label>
                {editing ? (
                  <input
                    value={opp.location ?? ""}
                    onChange={(e) => setEditedOpp({ ...opp, location: e.target.value || null })}
                    className="input"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{opp.location ?? "—"}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Deadline</label>
                <div className="text-sm text-gray-700">
                  {opp.deadline.date
                    ? new Date(opp.deadline.date).toLocaleDateString()
                    : "Not specified"}
                  {opp.deadline.raw_text && (
                    <span className="text-gray-400 ml-1">({opp.deadline.raw_text})</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Funding</label>
                <div className="text-sm text-gray-700">
                  {opp.funding.kind}: {opp.funding.description || "No details"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Summary</label>
              {editing ? (
                <textarea
                  value={opp.summary}
                  onChange={(e) => setEditedOpp({ ...opp, summary: e.target.value })}
                  rows={3}
                  className="input"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line">{opp.summary}</p>
              )}
            </div>

            {/* Requirements */}
            {opp.requirements.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Requirements ({opp.requirements.length})
                </label>
                <div className="space-y-2">
                  {opp.requirements.map((req, i) => (
                    <div key={i} className="card p-3 bg-gray-50">
                      <div className="flex items-start gap-2">
                        <Badge
                          variant={
                            req.mandatory === "mandatory"
                              ? "red"
                              : req.mandatory === "preferred"
                              ? "yellow"
                              : "gray"
                          }
                          className="shrink-0"
                        >
                          {req.mandatory}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900">{req.text}</div>
                          {req.excerpt && (
                            <div className="text-xs text-gray-400 mt-1 italic">
                              &ldquo;{req.excerpt}&rdquo;
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Type: {req.type}
                            {req.comparison_rule && (
                              <span className="ml-2">
                                Auto-check: {req.comparison_rule.operator} {String(req.comparison_rule.value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application questions */}
            {opp.application_questions.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Application Questions ({opp.application_questions.length})
                </label>
                <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                  {opp.application_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Required documents */}
            {opp.required_documents.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Required Documents
                </label>
                <div className="flex flex-wrap gap-2">
                  {opp.required_documents.map((d, i) => (
                    <Badge key={i} variant="gray">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Application steps */}
            {opp.application_steps.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                  Application Steps
                </label>
                <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                  {opp.application_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary cursor-pointer shadow-primary"
            >
              {saving ? "Saving to Applications & Library…" : "Save to Applications & Library"}
            </button>
            <button
              onClick={handleClearBuffer}
              className="btn btn-secondary cursor-pointer"
            >
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
