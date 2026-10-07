'use client';
// Port of moreee/frontend/v2/IssueBoard.jsx, with truthful public-read status.
import type { ContributionIssue } from '@/lib/contributions';
import Link from 'next/link';
export default function IssueBoard({ issues, repo, fetchedAt, onPick, onBack, busy }: {
  issues: ContributionIssue[]; repo: string; fetchedAt: string;
  onPick: (issue: ContributionIssue) => void; onBack: () => void; busy: boolean;
}) {
  return <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="contribution-issues">
    <button onClick={onBack} disabled={busy} className="mb-8 text-sm font-bold text-zinc-300 transition hover:text-white">← Back to matches</button>
    <h2 id="contribution-issues" className="text-5xl leading-[0.95] text-white md:text-7xl">{issues.length ? `${issues.length} candidate ${issues.length === 1 ? 'issue' : 'issues'}. ` : 'No candidates returned. '}<em className="bg-gradient-to-r from-sky-200 via-cyan-200 to-orange-300 bg-clip-text pr-1 text-transparent">{issues.length ? 'Choose your next step.' : 'Try another project.'}</em></h2>
    <p className="mt-5 max-w-3xl text-lg font-medium text-zinc-300">Live GitHub read · {repo} · fetched {new Date(fetchedAt).toLocaleString()}.</p>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">Up to 30 recently updated records checked; showing at most 6 open, unassigned issues, excluding pull requests. Comments and linked PR claims are not checked. Labels influence order; scope remains unverified.</p>
    {!issues.length && <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-950/70 p-8"><h3 className="text-4xl text-white">Keep exploring.</h3><p className="mt-3 text-zinc-300">No matching candidates were returned by this bounded search. This does not mean every issue is claimed.</p><button onClick={onBack} className="mt-6 text-sm font-bold text-sky-200">Choose another repository →</button></div>}
    <div className="mt-12 grid gap-6 lg:grid-cols-3">{issues.map(issue => <article key={`${issue.repo}#${issue.number}`} className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-zinc-950/75 p-6 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-sky-400/60">
      <a href={issue.url} target="_blank" rel="noreferrer" className="break-words text-sm font-bold text-sky-200 underline-offset-4 hover:underline">{issue.repo}#{issue.number} ↗</a>
      <h3 className="mt-5 break-words text-2xl font-black leading-tight text-white">{issue.title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">{issue.labels.map(l => <span key={l} className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">{l}</span>)}</div>
      <div className="my-6 space-y-2 rounded-2xl bg-white/5 p-4"><p className="font-bold text-amber-200">Confirm with maintainer</p><p className="text-sm leading-relaxed text-zinc-200">Unassigned does not establish availability. Read the discussion, contribution guidance and current AI policy before starting.</p><p className="text-xs text-zinc-300">Fetched {new Date(issue.fetchedAt).toLocaleString()}</p></div>
      <button onClick={() => onPick(issue)} disabled={busy} className="mt-auto w-full rounded-full bg-white px-6 py-3.5 text-base font-extrabold text-zinc-950 transition duration-200 hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-sky-400 disabled:opacity-50 disabled:hover:scale-100">{busy ? 'Preparing your plan…' : 'Understand this contribution →'}</button>
      <Link href={`/contributions/full-auto?repo=${encodeURIComponent(issue.repo)}&number=${issue.number}`} className="mt-4 text-center text-sm font-bold text-sky-200 underline-offset-4 hover:underline">Full-auto setup · separate feature →</Link>
    </article>)}</div>
  </section>;
}
