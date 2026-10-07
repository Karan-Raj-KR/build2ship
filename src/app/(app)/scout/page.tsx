'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Send,
  Scale,
  Upload,
} from 'lucide-react';
import { Opportunity, RecommendationExplanation, ScoutStructuredQuery } from '@/types/database';
import { resolveOpportunityStatus } from '@/lib/opportunityStatus';

interface RankedItem {
  opportunity: Opportunity;
  explanation: RecommendationExplanation;
  saved_state?: boolean;
}

const SAMPLE_QUERIES = [
  'Find paid AI opportunities outside India for second-year Indian students',
  'Find international programs with travel funding',
  'Only show things I can realistically apply to within the next 7 days',
  'Find opportunities where my open-source work is particularly valuable',
  'Find hackathons happening in Bangalore with high cash prizes',
];

export default function ScoutPage() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState(''), [searchedQuery, setSearchedQuery] = useState('');
  const searchVersion = useRef(0), saving = useRef(new Set<string>());
  const [loading, setLoading] = useState(false);
  const [rankedItems, setRankedItems] = useState<RankedItem[]>([]);
  const [structuredQuery, setStructuredQuery] = useState<ScoutStructuredQuery | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingQuery, setSavingQuery] = useState(false);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedSkip, setExpandedSkip] = useState(false);

  // Initial auto-search on mount
  useEffect(() => {
    handleSearch('Find opportunities matching my profile');
  }, []);

  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;
    const version = ++searchVersion.current;
    setLoading(true); setError(''); setSearchedQuery(searchQuery);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/scout/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
        signal: AbortSignal.timeout(20000),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search could not be completed.');
      if (version === searchVersion.current) {
        const validItems = (data.rankedItems || []).filter((item: RankedItem) => !resolveOpportunityStatus(item.opportunity.deadline, item.opportunity.source_status, item.opportunity.timezone_known).isClosed);
        setRankedItems(validItems);
        setStructuredQuery(data.structuredQuery || null);

        // Populate initial saved states from server
        const saved = new Set<string>();
        validItems.forEach((item: RankedItem) => {
          if (item.saved_state) saved.add(item.opportunity.id);
        });
        setSavedIds(saved);
      }
    } catch (err) {
      if (version === searchVersion.current) setError(err instanceof Error ? err.message : 'Search is unavailable. Please retry.');
    } finally {
      if (version === searchVersion.current) setLoading(false);
    }
  }

  async function handleToggleSave(oppId: string) {
    if (saving.current.has(oppId)) return;
    saving.current.add(oppId); setSavingIds([...saving.current]);
    const isSaved = savedIds.has(oppId);
    const next = new Set(savedIds);
    if (isSaved) {
      next.delete(oppId);
    } else {
      next.add(oppId);
    }
    // Optimistic UI response within milliseconds (<100ms)
    setSavedIds(next);

    try {
      const response = await fetch('/api/applications/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity_id: oppId, action: isSaved ? 'unsave' : 'save' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your change was not saved.');
      window.dispatchEvent(new Event('elara:progress'));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your change was not saved.');
      // Roll back on error
      setSavedIds(previous => { const rollback = new Set(previous); isSaved ? rollback.add(oppId) : rollback.delete(oppId); return rollback; });
    } finally { saving.current.delete(oppId); setSavingIds([...saving.current]); }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  const exceptionalMatches = rankedItems.filter((i) => i.explanation.match_tier === 'exceptional');
  const strongMatches = rankedItems.filter((i) => i.explanation.match_tier === 'strong');
  const possibleMatches = rankedItems.filter((i) => i.explanation.match_tier === 'possible');
  const skipMatches = rankedItems.filter((i) => i.explanation.match_tier === 'skip');

  async function saveQuery() {
    if (savingQuery || savedSuccess || !searchedQuery) return;
    setSavingQuery(true);
    try {
      const response = await fetch('/api/scout/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query_text: searchedQuery, structured_query: structuredQuery, notify_new_matches: false }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Search could not be saved.');
      setSavedSuccess(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Search could not be saved.'); }
    finally { setSavingQuery(false); }
  }

  return (
    <div className="page-frame text-[var(--ink)]">
      {/* Hero / Header */}
      <div className="page-header border-b border-[var(--line)] pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shadow-[0_2px_0_#46A302]">
              <Compass className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[var(--ink)]">Scout</h1>
              </div>
              <p className="text-sm font-semibold text-[var(--ink-muted)]">Tell Scout what you&apos;re looking for.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ingest"
              className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              <span>Import Opportunity</span>
            </Link>
            <Link
              href="/compare"
              className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5 text-[#58CC02]" />
              <span>Compare</span>
            </Link>
          </div>
        </div>
      </div>

      <p className="text-sm text-[var(--muted)] mb-5">Scout searches the reviewed catalogue, not the whole web. Describe a subject, location or funding preference. Add profile facts to clarify eligibility.</p>
      {error && <p className="alert alert-error" role="alert">{error} <button className="underline" onClick={() => void handleSearch(searchedQuery)}>Retry search</button></p>}
      <main className="min-w-0">
        {/* Natural Language Query Bar */}
        <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-[0_4px_0_#E3E7EA] relative overflow-hidden">
          <form onSubmit={handleFormSubmit} className="relative z-10 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find paid AI opportunities outside India for second-year Indian students"
                className="w-full bg-[#F7F9FA] border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white rounded-xl pl-12 pr-4 py-3 text-sm font-semibold text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-extrabold cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-white" />
                  <span>Scouting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Scout</span>
                </>
              )}
            </button>
          </form>

          {/* Sample Prompts */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--ink-muted)] font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#58CC02]" /> Try:
            </span>
            {SAMPLE_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  handleSearch(sample);
                }}
                className="bg-[#F7F9FA] hover:bg-white text-[var(--ink)] font-bold px-3 py-1.5 rounded-full border-2 border-[var(--border)] hover:border-[#1CB0F6] transition cursor-pointer active:translate-y-0.5"
              >
                {sample}
              </button>
            ))}
          </div>

          {/* Active Structured Query Chips */}
          {structuredQuery && (
            <div className="mt-5 pt-4 border-t-2 border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--ink-muted)] font-black uppercase tracking-wider text-[11px]">Parsed:</span>
                {structuredQuery.topics?.map((topic) => (
                  <span key={topic} className="px-2.5 py-1 rounded-full bg-[#DDF4FF] border-2 border-[#1CB0F6] text-[#0B72A4] font-extrabold">
                    Topic: {topic.toUpperCase()}
                  </span>
                ))}
                {structuredQuery.categories?.map((cat) => (
                  <span key={cat} className="px-2.5 py-1 rounded-full bg-[#EEFFD9] border-2 border-[#58CC02] text-[#287300] font-extrabold">
                    Category: {cat}
                  </span>
                ))}
                {structuredQuery.paid_only && (
                  <span className="px-2.5 py-1 rounded-full bg-[#FFF4D9] border-2 border-[#FFB020] text-[#8A5200] flex items-center gap-1 font-extrabold">
                    <DollarSign className="w-3 h-3" /> Paid Only
                  </span>
                )}
                {structuredQuery.excluded_countries?.map((exc) => (
                  <span key={exc} className="px-2.5 py-1 rounded-full bg-[#FFE5E5] border-2 border-[#D93B3B] text-[#991B1B] font-extrabold">
                    Outside: {exc}
                  </span>
                ))}
                {structuredQuery.academic_year && (
                  <span className="px-2.5 py-1 rounded-full bg-[#F3E8FF] border-2 border-[#A568CC] text-[#6B21A8] font-extrabold">
                    Year: {structuredQuery.academic_year}{structuredQuery.academic_year === 2 ? 'nd' : 'th'} Year Undergrad
                  </span>
                )}
                {structuredQuery.applicant_nationalities?.map((nat) => (
                  <span key={nat} className="px-2.5 py-1 rounded-full bg-[#F7F9FA] border-2 border-[var(--border)] text-[var(--ink)] font-extrabold">
                    Applicant: {nat}
                  </span>
                ))}
                {structuredQuery.remote_mode?.map((m) => (
                  <span key={m} className="px-2.5 py-1 rounded-full bg-[#F7F9FA] border-2 border-[var(--border)] text-[var(--ink-muted)] font-bold">
                    Mode: {m}
                  </span>
                ))}
                {structuredQuery.target_countries?.map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-full bg-[#F7F9FA] border-2 border-[var(--border)] text-[var(--ink)] font-extrabold">
                    Target: {c}
                  </span>
                ))}
                {structuredQuery.deadline_window_days && (
                  <span className="px-2.5 py-1 rounded-full bg-[#FFF4D9] border-2 border-[#FFB020] text-[#8A5200] flex items-center gap-1 font-extrabold">
                    <Clock className="w-3 h-3" /> Closes in &le; {structuredQuery.deadline_window_days}d
                  </span>
                )}
              </div>

              {searchedQuery && (
                <button
                  onClick={() => void saveQuery()}
                  disabled={savingQuery || savedSuccess}
                  className="text-[var(--ink-muted)] hover:text-[#58CC02] flex items-center gap-1.5 transition font-bold cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-[#58CC02]" />
                      <span className="text-[#287300] font-extrabold">Query Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>{savingQuery ? 'Saving…' : 'Save Query'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="mt-10 space-y-10">
          {loading ? (
            <ScoutSkeleton />
          ) : rankedItems.length === 0 ? (
            <div className="bg-[var(--surface-main)] border border-[var(--line)] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-panel">
              <AlertCircle className="w-10 h-10 text-[#8A4306] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[var(--ink)]">No matching opportunities found</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-1 mb-6 leading-relaxed">
                Your constraints may be too narrow, or some eligibility details (e.g. citizenship, graduation year) need to be completed.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/profile"
                  className="btn btn-secondary btn-sm"
                >
                  Update Profile Facts
                </Link>
                <button
                  onClick={() => handleSearch('Find all opportunities')}
                  className="btn btn-primary btn-sm"
                >
                  Broaden Search
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Exceptional Matches */}
              {exceptionalMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full bg-[#58CC02] border-2 border-[#46A302]" />
                    <h2 className="text-base font-black tracking-tight text-[var(--ink)]">Exceptional Match</h2>
                    <span className="text-xs font-bold text-[var(--ink-muted)]">({exceptionalMatches.length})</span>
                    <span className="text-xs font-semibold text-[var(--ink-muted)] ml-auto hidden sm:inline">
                      High evidence alignment & verified eligibility
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {exceptionalMatches.map((item) => (
                      <OpportunityScoutCard
                        key={item.opportunity.id}
                        item={item}
                        isSaved={savedIds.has(item.opportunity.id)}
                        onToggleSave={handleToggleSave}
                        isSaving={savingIds.includes(item.opportunity.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Strong Matches */}
              {strongMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full bg-[#1CB0F6] border-2 border-[#1899D6]" />
                    <h2 className="text-base font-black tracking-tight text-[var(--ink)]">Strong Match</h2>
                    <span className="text-xs font-bold text-[var(--ink-muted)]">({strongMatches.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {strongMatches.map((item) => (
                      <OpportunityScoutCard
                        key={item.opportunity.id}
                        item={item}
                        isSaved={savedIds.has(item.opportunity.id)}
                        onToggleSave={handleToggleSave}
                        isSaving={savingIds.includes(item.opportunity.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Possible Matches */}
              {possibleMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full bg-[#FFB020] border-2 border-[#E59800]" />
                    <h2 className="text-base font-black tracking-tight text-[var(--ink)]">Possible Matches</h2>
                    <span className="text-xs font-bold text-[var(--ink-muted)]">({possibleMatches.length})</span>
                    <span className="text-xs font-semibold text-[var(--ink-muted)] ml-auto hidden sm:inline">
                      May require minor verification or additional proof
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {possibleMatches.map((item) => (
                      <OpportunityScoutCard
                        key={item.opportunity.id}
                        item={item}
                        isSaved={savedIds.has(item.opportunity.id)}
                        onToggleSave={handleToggleSave}
                        isSaving={savingIds.includes(item.opportunity.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Skipped Matches (Collapsible) */}
              {skipMatches.length > 0 && (
                <section className="pt-4 border-t-2 border-[var(--border)]">
                  <button
                    onClick={() => setExpandedSkip(!expandedSkip)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F9FA] border-2 border-[var(--border)] text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)] transition cursor-pointer"
                  >
                    <span>
                      Show {skipMatches.length} lower-fit or ineligible opportunities (Filtered out by constraints)
                    </span>
                    {expandedSkip ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSkip && (
                    <div className="grid grid-cols-1 gap-4 mt-4 opacity-80">
                      {skipMatches.map((item) => (
                        <OpportunityScoutCard
                          key={item.opportunity.id}
                          item={item}
                          isSaved={savedIds.has(item.opportunity.id)}
                          onToggleSave={handleToggleSave}
                          isSaving={savingIds.includes(item.opportunity.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ScoutSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-[var(--border)] bg-white p-5 flex flex-col md:flex-row justify-between gap-6 shadow-[0_4px_0_#E3E7EA]">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-[#E3E7EA] rounded-full" />
              <div className="h-5 w-20 bg-[#E3E7EA] rounded-full" />
              <div className="h-4 w-16 bg-[#E3E7EA] rounded ml-auto" />
            </div>
            <div className="h-6 w-3/4 bg-[#E3E7EA] rounded-md" />
            <div className="h-4 w-1/3 bg-[#E3E7EA] rounded-md" />
            <div className="h-16 w-full bg-[#F7F9FA] rounded-xl border-2 border-[#E3E7EA]" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-[#E3E7EA] rounded-full" />
              <div className="h-5 w-24 bg-[#E3E7EA] rounded-full" />
            </div>
          </div>
          <div className="md:w-56 shrink-0 flex flex-col justify-between gap-3 border-t md:border-t-0 md:border-l-2 border-[var(--border)] pt-3 md:pt-0 md:pl-6">
            <div className="h-8 w-full bg-[#E3E7EA] rounded-md" />
            <div className="h-9 w-full bg-[#E3E7EA] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Scout Opportunity Card displaying transparent explanations, eligibility snapshot, and evidence alignment
 */
function OpportunityScoutCard({
  item,
  isSaved,
  isSaving,
  onToggleSave,
}: {
  item: RankedItem;
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: (id: string) => void;
}) {
  const { opportunity, explanation } = item;
  const router = useRouter();
  const [preparing, setPreparing] = useState(false), [prepareError, setPrepareError] = useState('');
  async function prepare() {
    if (preparing) return;
    setPreparing(true); setPrepareError('');
    try {
      const response = await fetch('/api/applications/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity_id: opportunity.id, action: 'prepare' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Preparation could not be opened.');
      window.dispatchEvent(new Event('elara:progress'));
      router.push(`/workspace/${result.application_id}`);
    } catch (err) { setPrepareError(err instanceof Error ? err.message : 'Please retry.'); }
    finally { setPreparing(false); }
  }

  const badgeColors = {
    exceptional: 'bg-[#EEFFD9] text-[#287300] border-[#58CC02]',
    strong: 'bg-[#DDF4FF] text-[#0B72A4] border-[#1CB0F6]',
    possible: 'bg-[#FFF4D9] text-[#8A5200] border-[#FFB020]',
    skip: 'bg-[#F7F9FA] text-[var(--ink-muted)] border-[var(--border)]',
  };

  return (
    <div
      className="rounded-2xl border-2 border-[var(--border)] bg-white hover:border-[#1CB0F6] shadow-[0_4px_0_#E3E7EA] p-5 transition duration-200 flex flex-col md:flex-row justify-between gap-6"
    >
      <div className="flex-1 space-y-4">
        {/* Header line */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border-2 font-black uppercase tracking-wider ${badgeColors[explanation.match_tier]}`}>
              {explanation.match_tier}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7F9FA] text-[var(--ink)] border-2 border-[var(--border)] font-extrabold">
              {opportunity.category}
            </span>
            {opportunity.participation_mode && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7F9FA] text-[var(--ink-muted)] border-2 border-[var(--border)] font-bold">
                {opportunity.participation_mode}
              </span>
            )}
            <span className="text-xs text-[var(--ink-muted)] flex items-center gap-1 ml-auto font-bold">
              <Clock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              {explanation.urgency_label}
            </span>
          </div>

          <h3 className="text-lg font-black text-[var(--ink)] hover:text-[#1CB0F6] transition">
            <Link href={`/opportunities/${opportunity.id}`}>{opportunity.title}</Link>
          </h3>
          <p className="text-xs text-[var(--ink-muted)] font-bold mt-0.5">{opportunity.organizer}</p>
        </div>

        {/* Transparent Explanation: Why this is recommended */}
        <div className="bg-[#EEFFD9] border-2 border-[#B4F079] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#287300]">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02]" strokeWidth={2.5} />
            <span>Why Scout recommends this:</span>
          </div>
          <ul className="text-xs text-[var(--ink)] font-semibold space-y-1 pl-4 list-disc marker:text-[#58CC02]">
            {explanation.reasons_why.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {/* Why you may skip (if any) */}
          {explanation.reasons_why_skip.length > 0 && (
            <div className="pt-2 border-t-2 border-[#B4F079] mt-2">
              <span className="text-xs font-bold text-[var(--ink-muted)] block mb-1">Things to consider:</span>
              <ul className="text-xs text-[var(--ink-muted)] font-medium space-y-0.5 pl-4 list-disc marker:text-[#FFB020]">
                {explanation.reasons_why_skip.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom tags */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {explanation.upside_tags.map((tag, idx) => (
            <span key={idx} className="px-2.5 py-0.5 rounded-full bg-[#F7F9FA] text-[var(--ink)] border-2 border-[var(--border)] font-bold">
              {tag}
            </span>
          ))}
          <span className="text-[var(--ink-muted)] text-xs font-bold">
            Effort: <strong className="text-[var(--ink)] capitalize font-black">{explanation.estimated_effort}</strong>
          </span>
        </div>
      </div>

      {/* Right Column: Actions & Verdict */}
      <div className="flex md:flex-col justify-between items-end md:w-56 shrink-0 border-t md:border-t-0 md:border-l-2 border-[var(--border)] pt-4 md:pt-0 md:pl-6">
        <div className="text-left md:text-right w-full mb-3">
          <div className="flex items-center md:justify-end gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#58CC02]" strokeWidth={2.5} />
            <span className="text-[var(--ink-muted)] font-bold">Eligibility:</span>
            <span
              className={`font-black capitalize ${
                explanation.eligibility_verdict === 'likely_eligible'
                  ? 'text-[#287300]'
                  : explanation.eligibility_verdict === 'likely_ineligible'
                  ? 'text-[#D93B3B]'
                  : 'text-[#8A5200]'
              }`}
            >
              {explanation.eligibility_verdict.replace('_', ' ')}
            </span>
          </div>
          <div className="text-xs text-[var(--ink-muted)] mt-1 font-bold">
            {explanation.match_tier === "exceptional" ? "Strong fit" : explanation.match_tier === "strong" ? "Possible fit" : "Needs more profile info"}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => onToggleSave(opportunity.id)}
            disabled={isSaving}
            className={`w-full py-2.5 px-3 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_2px_0_#E3E7EA] active:translate-y-0.5 ${
              isSaved
                ? 'bg-[#EEFFD9] border-[#58CC02] text-[#287300]'
                : 'bg-white hover:bg-[#F7F9FA] border-[var(--border)] text-[var(--ink)]'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#58CC02]" strokeWidth={2.5} />
                <span>{isSaving ? 'Saving…' : 'Saved'}</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-[var(--ink-muted)]" strokeWidth={2} />
                <span>{isSaving ? 'Updating…' : 'Save'}</span>
              </>
            )}
          </button>
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="w-full btn btn-primary py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 font-black"
          >
            <span>Should I Apply?</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => void prepare()} disabled={preparing} className="w-full btn btn-secondary py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 font-bold">
            <span>{preparing ? 'Opening…' : 'Prepare Application'}</span>
          </button>
          {prepareError && <p role="alert" className="text-xs text-[var(--danger)] font-bold">{prepareError}</p>}
          <Link
            href={`/compare?ids=${opportunity.id}`}
            className="w-full btn btn-secondary py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 font-bold hover:border-[#1CB0F6] hover:text-[#1CB0F6]"
          >
            <Scale className="w-3.5 h-3.5 text-[#1CB0F6]" />
            <span>Compare</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
