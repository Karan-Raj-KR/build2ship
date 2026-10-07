'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import HeroSection from '@/components/contributions/HeroSection';
import MatchPodium from '@/components/contributions/MatchPodium';
import IssueBoard from '@/components/contributions/IssueBoard';
import './mentor.css';
import type { Profile } from '@/types/database';
import { CONTRIBUTION_PREFERENCES, type ContributionPreference, type ContributionBundle, type ContributionIssue, type SavedContribution, type matchContributions } from '@/lib/contributions';

type Match = ReturnType<typeof matchContributions>[number];
async function request(url: string, body?: object, method = 'POST') {
  const response = await fetch(url, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}
function Plan({ bundle }: { bundle: ContributionBundle }) {
  return <div className="space-y-4">
    <p className="adventure-note">AI generated {new Date(bundle.generatedAt).toLocaleString()}. Review against the linked sources before acting. Repository excerpts may be incomplete.</p>
    <div><h3 className="font-semibold">Why it fits your profile</h3><p className="whitespace-pre-wrap">{bundle.plan.why}</p></div>
    <div><h3 className="font-semibold">Repository context</h3><p className="whitespace-pre-wrap">{bundle.plan.context}</p></div>
    <div><h3 className="font-semibold">Contribution checklist</h3><ol className="list-decimal pl-6 space-y-2">{bundle.plan.checklist.map((t, i) => <li key={i}>{t}</li>)}</ol></div>
    <div><h3 className="font-semibold">One understanding question</h3><p>{bundle.plan.question}</p></div>
    <div><h3 className="font-semibold">Sources supplied to AI</h3><ul className="space-y-1"><li><a className="adventure-text-link" href={bundle.issue.url} target="_blank" rel="noreferrer">Issue #{bundle.issue.number}</a> · fetched {new Date(bundle.issue.fetchedAt).toLocaleString()}</li>{bundle.sources.map(s => <li key={s.url}><a className="adventure-text-link" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · fetched {new Date(s.fetchedAt).toLocaleString()}</li>)}</ul></div>
  </div>;
}
export default function ContributionsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weeklyTime, setWeeklyTime] = useState(''), [preference, setPreference] = useState<ContributionPreference | ''>('');
  const [knownTime, setKnownTime] = useState(false), [knownPreference, setKnownPreference] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]), [repo, setRepo] = useState(''), [issues, setIssues] = useState<ContributionIssue[]>([]);
  const [fetchedAt, setFetchedAt] = useState(''), [saved, setSaved] = useState<SavedContribution[]>([]);
  const [generated, setGenerated] = useState<{ bundle: ContributionBundle; token: string } | null>(null);
  const [busy, setBusy] = useState('loading'), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    const data = await request('/api/contributions');
    setProfile(data.profile); setSaved(data.saved);
    setWeeklyTime(data.preferences.weeklyTime); setPreference(data.preferences.preference);
    setKnownTime(!!data.preferences.weeklyTime); setKnownPreference(!!data.preferences.preference);
  }
  useEffect(() => {
    let active = true;
    request('/api/contributions').then(data => {
      if (!active) return;
      setProfile(data.profile); setSaved(data.saved);
      setWeeklyTime(data.preferences.weeklyTime); setPreference(data.preferences.preference);
      setKnownTime(!!data.preferences.weeklyTime); setKnownPreference(!!data.preferences.preference);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);
  async function run(name: string, action: () => Promise<void>) {
    setBusy(name); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(''); }
  }
  async function findIssues(selected: string) {
    setRepo(selected); setIssues([]); setFetchedAt(''); setGenerated(null);
    const data = await request(`/api/contributions?repo=${encodeURIComponent(selected)}&preference=${preference || 'any'}`);
    setIssues(data.issues); setFetchedAt(data.fetchedAt);
  }
  const preferences = { weeklyTime, preference };
  return <div className="mentor-surface space-y-6 pb-12" aria-busy={!!busy}>
    <HeroSection onStart={() => document.getElementById('contribution-profile')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}/>
    {error && <p className="alert alert-error" role="alert">{error} <button className="underline" disabled={!!busy} onClick={() => void run('loading', load)}>Reload saved progress</button></p>}
    {notice && <p className="alert alert-success" role="status">{notice}</p>}
    {busy === 'loading' && <p role="status">Loading your profile and saved contributions…</p>}
    {profile && <section className="mentor-profile card p-6 md:p-8 space-y-4" aria-labelledby="contribution-profile">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="contribution-profile" className="text-4xl">Your starting point</h2><Link className="adventure-text-link" href="/profile">Update your profile →</Link></div>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="font-semibold">Career goal</dt><dd>{profile.target_roles?.join(', ') || profile.discovery_goal || 'Not set in profile'}</dd></div><div><dt className="font-semibold">Languages & skills</dt><dd>{profile.skills.join(', ') || 'Not set; matching will be less specific'}</dd></div><div><dt className="font-semibold">Interests</dt><dd>{profile.interests.join(', ') || 'Not set'}</dd></div><div><dt className="font-semibold">Experience</dt><dd>{profile.experience_summary || 'Not set; no experience level assumed'}</dd></div></dl>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); setGenerated(null); setIssues([]); setFetchedAt(''); void run('matching', async () => { const result = await request('/api/contributions', { action: 'match', preferences }); setMatches(result.matches); }); }}>
        {knownTime ? <p>Weekly time: <strong>{weeklyTime}</strong></p> : <label className="label">Weekly time<input className="input" required maxLength={120} placeholder="e.g. 5 hours per week" value={weeklyTime} onChange={e => setWeeklyTime(e.target.value)}/></label>}
        {knownPreference ? <p>Contribution preference: <strong>{preference}</strong></p> : <label className="label">Contribution preference<select className="input" required value={preference} onChange={e => setPreference(e.target.value as ContributionPreference)}><option value="">Choose one</option>{CONTRIBUTION_PREFERENCES.map(p => <option key={p} value={p}>{p === 'any' ? 'Open to anything' : p}</option>)}</select></label>}
        <p className="adventure-note">These preferences are remembered with your saved plan. Your existing profile remains the source for skills, interests and experience.</p>
        <button className="btn btn-primary" disabled={!!busy}>{busy === 'matching' ? 'Matching…' : 'Find contribution paths'}</button>
      </form>
    </section>}
    {matches.length > 0 && !fetchedAt && <MatchPodium matches={matches} busy={!!busy} onChoose={selected => void run('issues', () => findIssues(selected))}/>}
    {fetchedAt && <IssueBoard issues={issues} repo={repo} fetchedAt={fetchedAt} busy={!!busy} onBack={() => { setFetchedAt(''); setGenerated(null); }} onPick={issue => { setGenerated(null); void run(`plan:${issue.number}`, async () => { const data = await request('/api/contributions', { action: 'plan', repo: issue.repo, number: issue.number, preferences }); setGenerated(data); }); }}/>}
    {generated && <section className="mentor-plan card p-6 md:p-8 space-y-4" aria-labelledby="contribution-plan"><h2 id="contribution-plan" className="text-4xl">Your plan · {generated.bundle.issue.title}</h2><Plan bundle={generated.bundle}/><button className="btn btn-primary" disabled={!!busy} onClick={() => void run('saving', async () => { const result = await request('/api/contributions', { action: 'save', token: generated.token }); await load(); setGenerated(null); setNotice(result.created ? 'Contribution plan saved. Your checklist and progress will appear here after refresh.' : 'This contribution was already saved. Your original plan and progress have been preserved.'); window.dispatchEvent(new Event('elara:progress')); })}>{busy === 'saving' ? 'Saving…' : 'Save plan to workspace'}</button></section>}
    <section className="mentor-saved space-y-4" aria-labelledby="saved-contributions"><h2 id="saved-contributions" className="text-4xl md:text-5xl">Saved contribution progress</h2>{!saved.length && !busy && <p>Your saved plans will appear here.</p>}{saved.map(record => <article key={record.id} className="card p-6 md:p-8 space-y-4"><h3 className="text-lg font-semibold">{record.bundle.issue.title}</h3><p>{record.bundle.issue.repo} · {record.stage} · Confirm with maintainer</p><p className="adventure-note">Saved snapshot, not a fresh availability check. {record.tasks.filter(t => t.completed).length}/{record.tasks.length} checklist items complete.</p><div className="mentor-checklist space-y-2">{record.tasks.map(task => <label className="flex items-start gap-3" key={task.id}><input type="checkbox" className="mt-1" checked={task.completed} disabled={!!busy} onChange={() => void run('progress', async () => { await request('/api/applications/progress', { task_id: task.id, completed: !task.completed }, 'PATCH'); await load(); window.dispatchEvent(new Event('elara:progress')); })}/><span>{task.title}</span></label>)}</div><div className="flex flex-wrap gap-3"><button className="btn btn-secondary" disabled={!!busy} onClick={() => void run('progress', async () => { await request('/api/contributions', { id: record.id, stage: record.stage === 'saved' ? 'preparing' : 'saved' }, 'PATCH'); await load(); window.dispatchEvent(new Event('elara:progress')); })}>{record.stage === 'saved' ? 'Start preparing' : 'Mark saved'}</button><Link className="btn btn-secondary" href={`/workspace/${record.id}`}>Open workspace</Link><a className="btn btn-ghost" href={record.bundle.issue.url} target="_blank" rel="noreferrer">Check current issue</a></div><details><summary className="cursor-pointer font-semibold">Read saved AI plan & sources</summary><div className="pt-4"><Plan bundle={record.bundle}/></div></details></article>)}</section>
  </div>;
}
