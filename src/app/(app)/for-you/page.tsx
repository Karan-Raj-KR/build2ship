'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, CheckCircle2, Clock3, ExternalLink, EyeOff, RefreshCw, Search, Sparkles } from 'lucide-react';
import type { ForYouItem, ForYouFeedResult } from '@/lib/recommendations/forYouEngine';
import type { Profile, ProfileEvidence } from '@/types/database';
import { OpportunityDetailSheet } from '@/components/feed/OpportunityDetailSheet';
import { InlineGapUpdater } from '@/components/feed/InlineGapUpdater';
import { WorkspaceGuide } from '@/components/adventure/WorkspaceGuide';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useJourney } from '@/components/adventure/JourneyProvider';
import { formatDeadline } from '@/lib/utils';

export default function ForYouPage() {
  const { refresh } = useJourney();
  const [items, setItems] = useState<ForYouItem[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<Partial<Profile>>({}), [total, setTotal] = useState(0), [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false), [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<ForYouItem | null>(null), [gap, setGap] = useState<{ item: ForYouItem; text: string } | null>(null);
  const pending = useRef(new Set<string>());
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const load = useCallback(async (cursor?: string) => {
    cursor ? setLoadingMore(true) : setLoading(true); setError('');
    try {
      const response = await fetch(`/api/recommendations/for-you?limit=12${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal: AbortSignal.timeout(20000) });
      const data: ForYouFeedResult & { profile?: Profile; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your matches could not be loaded.');
      setItems(previous => cursor ? [...previous, ...data.items.filter(item => !previous.some(old => old.opportunity_id === item.opportunity_id))] : data.items);
      setProfile(data.profile || {}); setTotal(data.totalAvailable); setNextCursor(data.nextCursor);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load matches. Try again.'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function toggleSave(id: string) {
    if (pending.current.has(id)) return;
    const item = items.find(row => row.opportunity_id === id); if (!item) return;
    const wasSaved = item.saved_state;
    pending.current.add(id); setSavingIds([...pending.current]);
    setItems(previous => previous.map(row => row.opportunity_id === id ? { ...row, saved_state: !wasSaved } : row)); setNotice(wasSaved ? 'Removing from your shortlist…' : 'Saving to your shortlist…');
    try {
      const response = await fetch('/api/applications/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity_id: id, action: wasSaved ? 'unsave' : 'save' }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Save failed.');
      setNotice(wasSaved ? 'Removed from your shortlist.' : 'Saved. Open your shortlist when you’re ready to prepare.'); void refresh(true);
    } catch (err) { setItems(previous => previous.map(row => row.opportunity_id === id ? { ...row, saved_state: wasSaved } : row)); setError(err instanceof Error ? err.message : 'Your change was not saved.'); }
    finally { pending.current.delete(id); setSavingIds([...pending.current]); }
  }
  async function hide(id: string) {
    try {
      const response = await fetch('/api/recommendations/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity_id: id, action: 'hide' }) });
      if (!response.ok) throw new Error('Could not save that feedback. Please retry.');
      setItems(previous => previous.filter(item => item.opportunity_id !== id)); setNotice('Hidden from your recommendations.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Feedback was not saved.'); }
  }
  function updated(next: Partial<Profile>, _evidence?: ProfileEvidence) { setProfile(next); setGap(null); void load(); }
  const visible = items.filter(item => filter === 'all' || (filter === 'funded' ? item.benefit_funding.is_paid : item.opportunity.participation_mode === 'remote'));
  return <div className="adventure-page for-you-page">
    <header className="adventure-pageheading"><div><h1>For you</h1><p>A shortlist to explore, with the reasons and requirements in plain sight.</p></div><Link href="/scout" className="btn btn-secondary"><Search size={16}/>Search a specific goal</Link></header>
    {!loading && <WorkspaceGuide profile={profile} savedCount={items.filter(item => item.saved_state).length}/>}
    <div className="for-you-toolbar"><div><h2>Your recommendations</h2><p>{loading ? 'Checking your profile and catalogue…' : `${total} active catalogue possibilities. Relevance and eligibility are checked separately.`}</p></div><div className="adventure-chips">{[['all','All matches'],['funded','Funded'],['remote','Remote']].map(([value,label]) => <button className={`adventure-chip ${filter === value ? 'selected' : ''}`} aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}<button className="adventure-chip" aria-label="Refresh recommendations" disabled={loading} onClick={() => void load()}><RefreshCw size={16}/></button></div></div>
    {error && <p className="alert alert-error" role="alert">{error} <button className="underline" onClick={() => void load()}>Retry</button></p>}{notice && <p className="alert alert-success" role="status">{notice}</p>}
    {loading ? <PageLoader/> : visible.length ? <div className="for-you-grid">{visible.map(item => <article className="for-you-match" key={item.opportunity_id}>
      <div className="for-you-match-head"><span>{item.organizer || 'Organizer not stated'}</span><button className={`adventure-save ${item.saved_state ? 'saved' : ''}`} aria-label={`${item.saved_state ? 'Unsave' : 'Save'} ${item.title}`} aria-pressed={item.saved_state} disabled={savingIds.includes(item.opportunity_id) || (!!item.application_state && item.application_state !== 'saved')} onClick={() => void toggleSave(item.opportunity_id)}><Bookmark size={20} fill={item.saved_state ? 'currentColor' : 'none'}/></button></div>
      <h3>{item.title}</h3><p className="for-you-summary">{item.opportunity.summary || 'Read the source for the complete programme description.'}</p>
      <div className="for-you-facts"><span><Clock3 size={15}/>{formatDeadline(item.deadline,item.opportunity.timezone_known)}</span><span>{item.location || item.opportunity.participation_mode || 'Location not stated'}</span></div>
      <div className="for-you-reason"><strong><Sparkles size={15}/>Why it may fit</strong><p>{item.relevance_explanation}</p></div>
      <div className={`for-you-eligibility ${item.eligibility_status}`}><strong><CheckCircle2 size={15}/>{item.eligibility_status === 'requirements_met' ? 'Known requirements look compatible' : 'Details to check before applying'}</strong><p>{item.eligibility_summary.details}</p>{item.specific_gaps[0] && <Link href="/profile">{item.specific_gaps[0]} <ArrowRight size={14}/></Link>}</div>
      <p className="for-you-funding"><strong>Funding</strong> {item.benefit_funding.description}</p><small className="adventure-freshness">{item.last_checked ? `Source checked ${new Date(item.last_checked).toLocaleDateString()}` : 'Source verification pending'}</small>
      <footer><button className="btn btn-secondary" onClick={() => setDetail(item)}>Review requirements<ArrowRight size={15}/></button>{item.opportunity.official_url && <a href={item.opportunity.official_url} target="_blank" rel="noreferrer" aria-label={`Official source for ${item.title}`}><ExternalLink size={18}/></a>}<button aria-label={`Hide ${item.title}`} onClick={() => void hide(item.opportunity_id)}><EyeOff size={18}/></button></footer>
    </article>)}</div> : <section className="adventure-empty"><h2>{filter !== 'all' ? 'No matches for this filter.' : 'No suitable matches in the current catalogue.'}</h2><p>{filter !== 'all' ? 'Try all matches or describe a different goal in Scout.' : 'Add profile details to clarify requirements, or explore a broader search. New listings require source review; this is not a search of the whole web.'}</p><Link className="btn btn-primary" href="/scout">Try Scout</Link><Link className="btn btn-secondary" href="/profile">Improve my profile</Link></section>}
    {nextCursor && <button className="btn btn-secondary adventure-loadmore" disabled={loadingMore} onClick={() => void load(nextCursor)}>{loadingMore ? 'Loading more matches…' : 'Show more matches'}</button>}
    <OpportunityDetailSheet isOpen={!!detail} onClose={() => setDetail(null)} item={detail} isSaved={!!items.find(item => item.opportunity_id === detail?.opportunity_id)?.saved_state} onToggleSave={toggleSave} onOpenGapUpdater={text => { if (detail) setGap({ item:detail,text }); }}/>
    {gap && <InlineGapUpdater isOpen onClose={() => setGap(null)} gapText={gap.text} profile={profile} opportunityId={gap.item.opportunity_id} opportunityTitle={gap.item.title} onProfileUpdated={updated}/>}
  </div>;
}
