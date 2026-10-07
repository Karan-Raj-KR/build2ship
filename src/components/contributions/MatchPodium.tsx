'use client';
// Port of moreee/frontend/v2/MatchPodium.jsx: same podium, typography and controls.
// Only supplied deterministic factors are shown; no invented five-axis ratings.
import type { matchContributions } from '@/lib/contributions';

type Match = ReturnType<typeof matchContributions>[number];
export default function MatchPodium({ matches, onChoose, busy }: {
  matches: Match[]; onChoose: (repo: string) => void; busy: boolean;
}) {
  const order = matches.length === 3 ? [1, 0, 2] : matches.map((_, i) => i);
  return <section className="mx-auto max-w-6xl px-6 py-16" aria-labelledby="contribution-matches">
    <h2 id="contribution-matches" className="text-5xl leading-[0.95] text-white md:text-7xl">Meet your <em className="bg-gradient-to-r from-sky-200 via-cyan-200 to-orange-300 bg-clip-text pr-1 text-transparent">top three.</em></h2>
    <p className="mt-5 max-w-2xl text-lg font-medium text-zinc-300">Matched with your existing profile. Topics and time estimates are curator judgments; points are not a probability of success.</p>
    <details className="mt-4 text-sm text-zinc-300"><summary className="cursor-pointer">How matching works</summary><p className="mt-3 max-w-3xl">Existing ranking awards +10 for language overlap, +20 for an open-source category preference and +15 for remote preference. Interest overlap adds +10; sufficient weekly time adds +5. Experience is supplied to the plan without assuming a skill level.</p></details>
    <div className="mt-14 grid items-end gap-6 md:grid-cols-3">{order.map(i => {
      const m = matches[i], first = i === 0;
      return <article key={m.repo} className={`relative rounded-3xl border p-6 backdrop-blur transition duration-200 hover:-translate-y-1 ${first ? 'border-sky-300/60 bg-gradient-to-b from-sky-500/15 to-zinc-950/80 shadow-[0_0_80px_-20px_rgba(125,211,252,0.5)] md:-translate-y-6 md:pb-8' : 'border-white/10 bg-zinc-950/70'}`}>
        <span aria-hidden="true" className="display absolute -top-6 left-6 text-8xl leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.35)]">{i + 1}</span>
        <div className="mt-8 flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words text-4xl leading-tight text-white"><a href={`https://github.com/${m.repo}`} target="_blank" rel="noreferrer">{m.repo.split('/')[0]}</a></h3><div><div className="display text-5xl text-white">{m.score}</div><div className="text-xs font-bold text-zinc-300">fit points</div></div></div>
        {first && <span className="mt-2 inline-block rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-zinc-950">Top profile match</span>}
        <ul className="my-6 space-y-3 text-sm leading-relaxed text-zinc-200">{m.reasons.map((reason, n) => <li key={n}>{reason}</li>)}</ul>
        <p className="text-sm leading-relaxed text-zinc-300">{m.note}</p>
        <div className="mt-4 flex flex-wrap gap-2">{m.languages.map(l => <span key={l} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200">{l}</span>)}</div>
        <button onClick={() => onChoose(m.repo)} disabled={busy} className={`mt-6 w-full rounded-full px-6 py-3.5 text-base font-extrabold transition duration-200 hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${first ? 'bg-white text-zinc-950 hover:brightness-110' : 'border-2 border-white/25 text-white hover:border-white/60'}`}>{busy ? 'Fetching issues…' : 'Find candidate issues →'}</button>
      </article>;
    })}</div>
  </section>;
}
