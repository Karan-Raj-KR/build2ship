'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Copy, Check, Upload, ArrowRight, ExternalLink, CheckCircle2, BookmarkPlus } from 'lucide-react';
import { Opportunity, Profile } from '@/types/database';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function AIBridgePage() {
  const [activeTab, setActiveTab] = useState<'copy' | 'import'>('copy');
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Copy Prompt state
  const [purpose, setPurpose] = useState<'discover' | 'evaluate' | 'profile' | 'application'>('discover');
  const [copied, setCopied] = useState(false);

  // Import Response state
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsedCandidates, setParsedCandidates] = useState<(Opportunity & { is_duplicate?: boolean; duplicate_reason?: string; verification_assessment?: { isOfficialDomain: boolean; confidenceScore: number } })[]>([]);
  const [suggestedUpdates, setSuggestedUpdates] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSelected, setSavingSelected] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Could not load your profile. Please try again.');
        const data = await res.json();
        if (!data.profile) throw new Error('Your profile is unavailable.');
        setProfile(data.profile);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Could not load your profile.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Construct Portable Prompt
  const generatedPrompt = React.useMemo(() => {
    const p = profile;
    const citizenshipStr = p?.nationalities?.join(', ') || 'Not specified';
    const degreeStr = p?.education_stage ? `${p.education_stage} in ${p?.field_of_study || 'an unspecified field'}` : 'Not specified';
    const gradStr = p?.expected_graduation || 'Not specified';
    const skillsStr = p?.skills?.slice(0, 6).join(', ') || 'Not specified';
    const rolesStr = p?.target_roles?.slice(0, 3).join(', ') || 'Not specified';
    const remotePref = p?.participation_preference || 'Not specified';

    if (purpose === 'discover') {
      return `You are acting as my high-signal Opportunity Discovery Scout.

MY SELF-REPORTED PROFILE CONTEXT:
- Citizenship / Nationality: ${citizenshipStr}
- Education Stage: ${degreeStr} (Expected graduation: ${gradStr})
- Self-reported Skills: ${skillsStr}
- Target Direction: ${rolesStr}
- Participation Preference: ${remotePref}${p?.paid_only_preference ? ' (Paid / Funded opportunities only)' : ''}

TASK:
Search your knowledge base and current web sources for 5 selective, high-upside opportunities (fellowships, hackathons, grants, or student programs) that specifically match my citizenship, education stage, and technical background.

CRITICAL CONSTRAINTS:
1. Do NOT invent deadlines or requirements. If unknown, state "Unknown".
2. Prioritize direct official programs over third-party job aggregators.
3. For EVERY opportunity returned, format cleanly as:

### [Opportunity Name]
- Organization: [Organization]
- Official URL: [Official direct website URL]
- Category: [Fellowship / Internship / Hackathon / Grant / Other]
- Deadline: [Specific date or Rolling or Unknown]
- Funding: [Stipend amount, prize pool, or Unpaid]
- Eligibility: [Key requirements: citizenship, student status, age]
- Why it fits my profile: [1-2 sentences referencing my specific skills or background]
- Key uncertainties: [Any conditions that need verification]`;
    }

    if (purpose === 'evaluate') {
      return `You are acting as my Opportunity Evaluation Assistant.

MY SELF-REPORTED PROFILE:
- Citizenship: ${citizenshipStr}
- Education: ${degreeStr}, Graduating: ${gradStr}
- Skills: ${skillsStr}
- Goals: ${rolesStr}

TASK:
I want you to evaluate a specific program against my profile.
Program to evaluate: [PASTE PROGRAM NAME OR URL HERE]

Please evaluate:
1. Am I definitely eligible, possibly eligible, or ineligible based on my citizenship and graduation year?
2. How strongly does my background fit what they typically select for?
3. What is the estimated effort vs payoff?
4. What specific evidence should I emphasize in my application?`;
    }

    if (purpose === 'profile') {
      return `You are an elite talent scout reviewing my Opportunity Profile.

MY CURRENT PROFILE:
- Education: ${degreeStr} (Graduation: ${gradStr})
- Skills: ${skillsStr}
- Target Direction: ${rolesStr}
- Self-reported experience: ${p?.experience_summary || 'Not provided; ask me for details before making claims.'}
- Portfolio: ${p?.portfolio_url || p?.github_url || 'Not provided'}

TASK:
Identify my top 3 profile gaps or weak signals that would prevent me from winning top-tier fellowships (e.g. Thiel, MLH, GSoC, international grants).
For each gap, suggest 1 concrete, high-leverage project or action I can execute over the next 30 days to unlock more opportunities. Ground your advice in reality—no generic platitudes.`;
    }

    return `You are helping me draft a competitive application for an opportunity.

MY BACKGROUND:
- Education: ${degreeStr}
- Skills: ${skillsStr}
- Self-reported experience: ${p?.experience_summary || 'Not provided; use [FILL IN] placeholders.'}
- Portfolio: ${p?.portfolio_url || p?.github_url || 'Not provided'}

TASK:
Help me formulate a crisp, authentic response to the following application prompt:
[PASTE APPLICATION QUESTION HERE]

Rules:
1. Use my real technical background.
2. Avoid generic buzzwords.
3. Quantify outcomes where possible.`;
  }, [profile, purpose]);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleImportParse() {
    if (!pasteText.trim()) return;
    setImporting(true);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/ai-bridge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pasteText }),
      });

      if (res.ok) {
        const data = await res.json();
        setParsedCandidates(data.candidates || []);
        setSuggestedUpdates(data.suggestedProfileUpdates || []);
        setSelectedIndices((data.candidates || []).map((_: unknown, i: number) => i));
      }
    } catch (err) {
      console.error('Import parse error:', err);
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveSelected() {
    const toSave = selectedIndices.map((i) => parsedCandidates[i]).filter(Boolean);
    if (toSave.length === 0 || savingSelected) return;
    setSavingSelected(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/ai-bridge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveSelected: true,
          selectedOpportunities: toSave,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(data.savedCount || toSave.length);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Could not save selected drafts. Please try again.');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save selected drafts.');
    } finally {
      setSavingSelected(false);
    }
  }

  function toggleSelectCandidate(idx: number) {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== idx));
    } else {
      setSelectedIndices([...selectedIndices, idx]);
    }
  }

  if (loading) return <PageLoader />;
  if (profileError || !profile) return <div role="alert" className="alert alert-error">{profileError || 'Your profile is unavailable.'}</div>;

  return (
    <div className="page-frame text-[var(--ink)] space-y-6">
      {/* Hero / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b-2 border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shadow-[0_3px_0_#46A302]">
            <Sparkles className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">AI Bridge</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02] font-black">
                ChatGPT • Claude • Perplexity
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
              Export portable context prompts to external LLMs and import structured opportunity responses back into Elara.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-[#F7F9FA] border-2 border-[var(--border)] rounded-2xl text-xs font-black self-start md:self-auto gap-1.5">
          <button
            onClick={() => setActiveTab('copy')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'copy'
                ? 'bg-white text-[var(--ink)] border-2 border-[var(--border)] shadow-[0_2px_0_#E3E7EA]'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            1. Copy Context for AI
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-[var(--ink)] border-2 border-[var(--border)] shadow-[0_2px_0_#E3E7EA]'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            2. Import AI Response
          </button>
        </div>
      </div>

      <main className="w-full space-y-6">
        {activeTab === 'copy' ? (
          <div className="space-y-6">
            {/* Purpose Selector */}
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">Choose Prompt Purpose</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { id: 'discover', label: 'Discover Opportunities', desc: 'Find 5 selective high-upside programs' },
                  { id: 'evaluate', label: 'Evaluate a Program', desc: 'Check eligibility & fit against profile' },
                  { id: 'profile', label: 'Analyze Profile Gaps', desc: 'Identify top signals & 30-day projects' },
                  { id: 'application', label: 'Draft Application Answer', desc: 'Use saved background and evidence' },
                ].map((item) => {
                  const isSelected = purpose === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPurpose(item.id as 'discover' | 'evaluate' | 'profile' | 'application')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1.5 active:translate-y-0.5 ${
                        isSelected
                          ? 'border-[#58CC02] bg-[#EEFFD9] text-[#287300] shadow-[0_3px_0_#46A302]'
                          : 'border-[var(--border)] bg-[#F7F9FA] text-[var(--ink)] hover:border-[#1CB0F6] shadow-[0_2px_0_#E3E7EA]'
                      }`}
                    >
                      <span className={`font-black text-xs ${isSelected ? 'text-[#287300]' : 'text-[var(--ink)]'}`}>
                        {item.label}
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--ink-muted)] leading-tight">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Preview Box */}
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#58CC02] border border-[#46A302]" />
                  <span>Optimized Prompt for ChatGPT, Claude 3.5, Gemini, or Perplexity</span>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className={`btn btn-sm text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
                    copied
                      ? 'bg-[#EEFFD9] text-[#287300] border-2 border-[#58CC02]'
                      : 'btn-primary'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#58CC02]" strokeWidth={2.5} />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Copy for AI</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                readOnly
                value={generatedPrompt}
                rows={16}
                className="w-full bg-[#F7F9FA] border-2 border-[var(--border)] rounded-xl p-4 text-xs font-mono text-[var(--ink)] leading-relaxed focus:outline-none resize-none selection:bg-[#EEFFD9]"
              />

              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="text-[#58CC02] font-black">⚡</span>
                  Uses your saved, self-reported profile. Confirm facts before sharing or applying.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className="text-[#1CB0F6] font-black hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <span>Ready to paste the response back? Go to Import</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Paste Input Area */}
            <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
              <div>
                <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Paste Response from External LLM</h2>
                <p className="text-xs font-semibold text-[var(--ink-muted)] mt-0.5">
                  Paste output directly from ChatGPT, Claude, Gemini, or Perplexity. Scout will extract structured opportunities, verify official URLs, check deduplication, and save them to your library.
                </p>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste external AI output here (markdown, bullet points, or raw text)..."
                rows={7}
                className="w-full bg-[#F7F9FA] border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white rounded-xl p-4 text-xs font-mono text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none transition resize-none selection:bg-[#EEFFD9]"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPasteText(`### 1. Google Summer of Code 2026
- Organization: Google Open Source
- Official URL: https://summerofcode.withgoogle.com
- Category: Fellowship / Open Source
- Deadline: 2026-04-02
- Funding: Stipend ($1,500 - $3,000)
- Eligibility: 18+ years old, student or open-source beginner.
- Why it fits my profile: Direct match for your open-source and TypeScript background.

### 2. HackMIT 2026
- Organization: MIT Tech Club
- Official URL: https://hackmit.org
- Category: Hackathon
- Deadline: 2026-08-15
- Funding: Travel grants provided for admitted undergraduate teams
- Eligibility: Enrolled undergraduate students globally.`)}
                  className="text-xs font-bold text-[var(--ink-muted)] hover:text-[#1CB0F6] transition underline cursor-pointer self-start sm:self-auto"
                >
                  Load sample AI response
                </button>

                <button
                  onClick={handleImportParse}
                  disabled={importing || !pasteText.trim()}
                  className="btn btn-primary btn-sm flex items-center gap-2 text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing Candidates...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Parse Opportunities</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggested Profile Updates (if detected) */}
            {suggestedUpdates.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] space-y-2.5 shadow-[0_2px_0_#46A302]">
                <div className="flex items-center gap-2 text-xs font-black text-[#287300]">
                  <Sparkles className="w-4 h-4 text-[#58CC02]" strokeWidth={2.5} />
                  <span>Scout detected potential profile additions from this context:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedUpdates.map((update, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#58CC02] text-xs font-bold text-[var(--ink)] shadow-[0_2px_0_#46A302] flex items-center gap-2"
                    >
                      <span>{update}</span>
                      <Link
                        href="/profile"
                        className="text-[11px] font-black text-[#287300] hover:underline"
                      >
                        Add to Profile
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Screen */}
            {parsedCandidates.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-[var(--ink)]">
                    Extracted Opportunities ({parsedCandidates.length} Found)
                  </h3>
                  <button
                    onClick={handleSaveSelected}
                    disabled={selectedIndices.length === 0 || savingSelected}
                    className="btn btn-primary btn-sm text-xs font-black flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>{savingSelected ? 'Saving drafts…' : `Save ${selectedIndices.length} selected drafts`}</span>
                  </button>
                </div>

                {saveError && <p role="alert" className="alert alert-error font-bold">{saveError}</p>}
                {saveSuccess !== null && (
                  <div className="p-4 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] text-xs font-black text-[#287300] shadow-[0_2px_0_#46A302] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" strokeWidth={2.5} />
                    <span>Saved {saveSuccess} drafts to your library. Official source review is required before publication.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {parsedCandidates.map((cand, idx) => {
                    const isSelected = selectedIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleSelectCandidate(idx)}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col md:flex-row items-start justify-between gap-4 shadow-[0_3px_0_#E3E7EA] ${
                          isSelected
                            ? 'border-[#58CC02] bg-[#EEFFD9]/30 shadow-[0_3px_0_#46A302]'
                            : 'border-[var(--border)] bg-white opacity-80 hover:opacity-100 hover:border-[#1CB0F6]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 h-5 w-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0"
                          />
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-[var(--ink)]">{cand.title}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7F9FA] text-[var(--ink)] border-2 border-[var(--border)] font-extrabold">
                                {cand.organizer}
                              </span>
                              {cand.is_duplicate && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFF4D9] text-[#8A5200] border-2 border-[#FFB020] font-black">
                                  Duplicate detected: {cand.duplicate_reason}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">{cand.summary}</p>

                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--ink-muted)] pt-1">
                              {cand.official_url && (
                                <a
                                  href={cand.official_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[#1CB0F6] hover:underline"
                                >
                                  <span>Official Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <span>Deadline: <strong className="text-[var(--ink)] font-black">{cand.deadline || 'Unknown'}</strong></span>
                              <span>Funding: <strong className="text-[var(--ink)] font-black">{cand.funding_description || 'Stipend'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {cand.verification_assessment && (
                          <div className="shrink-0 md:text-right md:w-36 pt-1 md:pt-0">
                            <div className="text-xs font-black text-[var(--ink)]">
                              Confidence: {cand.verification_assessment.confidenceScore}%
                            </div>
                            <span
                              className={`text-[11px] font-black inline-block mt-1 px-2.5 py-0.5 rounded-full border-2 ${
                                cand.verification_assessment.isOfficialDomain
                                  ? 'bg-[#EEFFD9] text-[#287300] border-[#58CC02]'
                                  : 'bg-[#FFF4D9] text-[#8A5200] border-[#FFB020]'
                              }`}
                            >
                              {cand.verification_assessment.isOfficialDomain ? 'Official Domain' : 'Aggregator Link'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
