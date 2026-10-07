'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Search, ExternalLink, Sparkles, ArrowRight, CheckCircle2, Clock3, Globe2, Wallet, Compass, X, HelpCircle, ShieldAlert, ShieldCheck, MapPin } from 'lucide-react';
import type { ForYouItem } from '@/lib/recommendations/forYouEngine';
import { useJourney } from './JourneyProvider';
import { formatDeadline } from '@/lib/utils';
import { isClosedOrExpired } from '@/lib/opportunityStatus';

const CATEGORIES = [
  'all',
  'internship',
  'fellowship',
  'scholarship',
  'research_programme',
  'grant',
  'competition',
  'hackathon',
  'startup_programme',
  'accelerator',
  'conference',
  'other',
];

const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

// Honest eligibility badge labels
const eligibilityConfig = {
  likely_eligible: {
    label: 'Eligible',
    desc: 'Meets known requirements',
    classes: 'bg-[#EEFFD9] text-[#287300] border-[#58CC02]',
    icon: ShieldCheck,
  },
  likely_ineligible: {
    label: 'Not eligible',
    desc: 'Known requirement mismatch',
    classes: 'bg-[#FEEAEA] text-[#9E1616] border-[#D93B3B]',
    icon: ShieldAlert,
  },
  possibly_eligible: {
    label: 'Needs information',
    desc: 'Potential fit · verify unconfirmed rules',
    classes: 'bg-[#FFF5E0] text-[#966100] border-[#FFB020]',
    icon: HelpCircle,
  },
  unknown: {
    label: 'Needs information',
    desc: 'Eligibility requirements unverified',
    classes: 'bg-[#FFF5E0] text-[#966100] border-[#FFB020]',
    icon: HelpCircle,
  },
};

export function DiscoveryScreen({ savedOnly = false }: { savedOnly?: boolean }) {
  const router = useRouter();
  const { data: journey, error: progressError, refresh } = useJourney();
  const [items, setItems] = useState<ForYouItem[]>([]);
  const [loading, setLoading] = useState(!savedOnly);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(8);
  const [detail, setDetail] = useState<ForYouItem | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);

  const requestFeed = useCallback(async (): Promise<ForYouItem[]> => {
    const response = await fetch('/api/recommendations/for-you?limit=200', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Opportunities could not be loaded.');
    return result.items;
  }, []);

  const load = () => {
    setLoading(true);
    return requestFeed()
      .then((result) => {
        setItems(result);
        setError('');
      })
      .catch((err) => setError(err.message || 'Discovery is unavailable.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (savedOnly) return;
    let active = true;
    requestFeed()
      .then((result) => {
        if (active) {
          setItems(result);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Discovery is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestFeed, savedOnly]);

  const allItems = savedOnly ? journey?.saved_items || [] : items;
  const hasFilters = !!search || category !== 'all' || filter !== 'all';

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setFilter('all');
    setLimit(8);
  }

  const filtered = allItems
    .filter((item) => {
      const opp = item.opportunity;
      const text = `${opp.title} ${opp.organizer || ''} ${opp.summary || ''} ${
        opp.skills?.join(' ') || ''
      }`.toLowerCase();
      return (
        (!search || text.includes(search.toLowerCase())) &&
        (category === 'all' || opp.category === category) &&
        (filter !== 'funded' ||
          ['stipend', 'prize', 'reimbursement'].includes(opp.funding_kind || '')) &&
        (filter !== 'remote' || opp.participation_mode === 'remote') &&
        (filter !== 'deadline' || !!opp.deadline)
      );
    })
    .sort((a, b) =>
      filter === 'deadline'
        ? (a.deadline || '9999').localeCompare(b.deadline || '9999')
        : 0
    );

  const appFor = (id: string) => journey?.applications.find((app) => app.opportunity_id === id);

  async function act(item: ForYouItem, action: 'save' | 'unsave' | 'prepare') {
    setBusy(item.opportunity_id);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/applications/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: item.opportunity_id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your progress.');

      setItems((previous) =>
        previous.map((row) =>
          row.opportunity_id === item.opportunity_id
            ? {
                ...row,
                saved_state: action !== 'unsave',
                application_state:
                  action === 'prepare' ? 'preparing' : action === 'save' ? 'saved' : null,
              }
            : row
        )
      );
      void refresh(true);
      if (action === 'prepare') {
        dialog.current?.close();
        router.push(`/workspace/${result.application_id}`);
      } else {
        setNotice(action === 'save' ? 'Saved to your shortlist.' : 'Removed from your shortlist.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
  }, [detail]);

  function open(item: ForYouItem) {
    setDetail(item);
  }

  const activeDetail = detail
    ? allItems.find((item) => item.opportunity_id === detail.opportunity_id) || detail
    : null;
  const selectedApp = activeDetail ? appFor(activeDetail.opportunity_id) : undefined;

  return (
    <div className="page-frame max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b-2 border-[var(--line)]">
        <div>
          <span className="eyebrow">{savedOnly ? 'Shortlist' : 'Discover'}</span>
          <h1 className="page-title mt-1">
            {savedOnly ? 'Your Saved Shortlist' : 'Explore Verified Opportunities'}
          </h1>
          <p className="text-sm font-semibold text-[var(--muted)] mt-1">
            {savedOnly
              ? 'Opportunities kept close. Ready to prepare when you are.'
              : 'Search and filter active programs with transparent eligibility checks.'}
          </p>
        </div>

        <Link
          className="btn btn-secondary flex items-center gap-2"
          href="/scout"
          aria-label="Search with Scout"
        >
          <Search size={16} />
          <span>Ask Scout</span>
        </Link>
      </div>

      {notice && <p className="alert alert-success" role="status">{notice}</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}{' '}
          <button className="underline font-bold" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {/* Main Grid: Feed + Right Insights Column */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)] gap-8 items-start">
        {/* Left Side: Search, Chips & Opportunity Cards */}
        <section id="opportunity-board" className="space-y-4">
          {/* Toolbar: Search input + Category dropdown */}
          <div className="flex gap-3 flex-wrap">
            <div className="adventure-search flex-1 min-w-[240px]">
              <Search size={18} className="text-[var(--muted)]" />
              <input
                id="opportunity-search"
                type="search"
                aria-label="Search opportunities"
                placeholder="Search by title, organization, skill…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(8);
                }}
              />
            </div>

            <select
              className="input w-auto min-w-[170px] cursor-pointer"
              aria-label="Opportunity type"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setLimit(8);
              }}
            >
              {CATEGORIES.map((type) => (
                <option value={type} key={type}>
                  {type === 'all' ? 'All categories' : label(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Chips */}
          <div className="adventure-chips">
            {(
              [
                ['all', 'All Matches', Sparkles],
                ['deadline', 'Deadlines', Clock3],
                ['funded', 'Funded', Wallet],
                ['remote', 'Remote', Globe2],
              ] as const
            ).map(([val, title, Icon]) => (
              <button
                key={val}
                className={`adventure-chip ${val === filter ? 'selected' : ''}`}
                aria-pressed={val === filter}
                onClick={() => {
                  setFilter(val);
                  setLimit(8);
                }}
              >
                <Icon size={15} />
                <span>{title}</span>
              </button>
            ))}

            {hasFilters && (
              <button
                className="text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 ml-auto"
                onClick={clearFilters}
              >
                <X size={14} /> Clear filters
              </button>
            )}
          </div>

          {/* Results count & Note */}
          <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)] pt-1">
            <span>
              {loading ? 'Checking catalogue…' : `${filtered.length} opportunities found`}
            </span>
            <span>
              {filter === 'deadline' ? 'Ordered by deadline' : 'Ranked by profile relevance'}
            </span>
          </div>

          {/* Opportunity Cards Feed */}
          {loading || (savedOnly && !journey && !progressError) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-64 skeleton-card" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.slice(0, limit).map((item) => {
                const opp = item.opportunity;
                const app = appFor(opp.id);
                const saved = !!app || item.saved_state;
                const closed = isClosedOrExpired(opp.deadline, opp.source_status);
                const elConfig =
                  eligibilityConfig[item.eligibility_summary.verdict] ||
                  eligibilityConfig.unknown;
                const ElIcon = elConfig.icon;

                return (
                  <article
                    className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] hover:border-[#1CB0F6] hover:shadow-[0_4px_0_#1CB0F6] transition-all bg-white flex flex-col justify-between group"
                    key={opp.id}
                  >
                    <div>
                      {/* Card Top: Org + Type + Save Button */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-9 h-9 rounded-xl border-2 border-[var(--line)] bg-[var(--canvas)] flex items-center justify-center font-black text-xs text-[var(--ink)] shrink-0 shadow-[0_2px_0_#E3E7EA]"
                            aria-hidden="true"
                          >
                            {(opp.organizer || opp.title)
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')}
                          </span>
                          <div className="min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-black bg-[var(--canvas)] text-[var(--muted)] border border-[var(--line)]">
                              {label(opp.category || 'Opportunity')}
                            </span>
                            <p className="text-xs font-bold text-[var(--muted)] truncate mt-0.5">
                              {opp.organizer || 'Organizer not stated'}
                            </p>
                          </div>
                        </div>

                        <button
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            saved
                              ? 'border-[#FFB020] bg-[#FFF5E0] text-[#966100] shadow-[0_2px_0_#FFB020]'
                              : 'border-[var(--line)] bg-white text-[var(--muted)] shadow-[0_2px_0_#E3E7EA] hover:border-[#FFB020] hover:text-[#FFB020]'
                          }`}
                          aria-label={saved ? `Unsave ${opp.title}` : `Save ${opp.title}`}
                          disabled={
                            busy === opp.id ||
                            (!!app && app.stage !== 'saved') ||
                            (!saved && closed)
                          }
                          onClick={() => void act(item, saved ? 'unsave' : 'save')}
                        >
                          <Bookmark
                            size={16}
                            fill={saved ? 'currentColor' : 'none'}
                            strokeWidth={2.5}
                          />
                        </button>
                      </div>

                      {/* Title & Mode */}
                      <h3 className="font-extrabold text-[var(--ink)] text-base leading-snug line-clamp-2 group-hover:text-[#1CB0F6] transition-colors mb-1.5">
                        {opp.title}
                      </h3>

                      <p className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5 mb-2.5">
                        <MapPin size={12} className="text-[var(--subtle)]" />
                        <span>{opp.participation_mode || opp.location || 'Location not stated'}</span>
                      </p>

                      {/* Recommendation factor */}
                      {item.recommendation_reasons[0] && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#DDF4FF] text-[#0E74A6] border border-[#99DAFC] mb-3">
                          <Sparkles size={12} />
                          <span className="line-clamp-1">{item.recommendation_reasons[0]}</span>
                        </div>
                      )}

                      {/* Funding / Benefit */}
                      <p className="text-xs font-extrabold text-[var(--ink)] mb-3">
                        {opp.funding_description || 'Funding details need clarification'}
                      </p>

                      {/* Eligibility Pill Badge */}
                      <div className="mb-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 ${elConfig.classes}`}
                        >
                          <ElIcon size={13} strokeWidth={2.5} />
                          <span>{elConfig.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Bottom: Deadline & CTA */}
                    <div className="pt-3.5 border-t-2 border-[var(--line)] flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[10px] font-black text-[var(--subtle)] uppercase tracking-wider">
                          Deadline
                        </span>
                        <strong className="block text-xs font-extrabold text-[var(--ink)]">
                          {formatDeadline(opp.deadline, opp.timezone_known)}
                        </strong>
                      </div>

                      <button
                        className="btn btn-secondary btn-sm font-extrabold flex items-center gap-1"
                        onClick={() => open(item)}
                      >
                        <span>Details</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Compass size={40} className="mx-auto mb-3 text-[var(--muted)]" />
              <h2>
                {hasFilters
                  ? 'No opportunities match your current filters.'
                  : savedOnly
                  ? 'Your shortlist is empty.'
                  : 'No opportunities found yet.'}
              </h2>
              <p>
                {hasFilters
                  ? 'Try clearing filters or searching for a different skill or topic.'
                  : savedOnly
                  ? 'Click the bookmark icon on any opportunity in Discover to keep it here.'
                  : 'Check back soon for new vetted programs, or use Scout to search.'}
              </p>
              {hasFilters ? (
                <button className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : savedOnly ? (
                <Link className="btn btn-primary" href="/discover">
                  Explore Discover
                </Link>
              ) : (
                <Link className="btn btn-primary" href="/scout">
                  Ask Scout
                </Link>
              )}
            </div>
          )}

          {filtered.length > limit && (
            <div className="text-center pt-4">
              <button
                className="btn btn-secondary font-bold px-8"
                onClick={() => setLimit((prev) => prev + 8)}
              >
                Load more opportunities
              </button>
            </div>
          )}
        </section>

        {/* Right Side Column: Profile Health & Quick Actions */}
        <aside className="space-y-6">
          {/* Profile Health Card */}
          <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-3">
            <h2 className="text-base font-black text-[var(--ink)]">Your Profile Readiness</h2>
            {journey ? (
              <div className="space-y-3">
                <div
                  className="adventure-meter"
                  role="progressbar"
                  aria-valuenow={journey.profile_completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${journey.profile_completion}%` }} />
                </div>
                <p className="text-xs font-semibold text-[var(--muted)]">
                  {journey.profile_completion}% profile information provided.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    journey.profile?.country_of_residence,
                    ...(journey.profile?.interests || []).slice(0, 2),
                  ]
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)]"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-xs font-semibold text-[var(--muted)]">
                Loading profile facts…
              </p>
            )}

            <Link href="/profile" className="btn btn-secondary btn-sm w-full font-bold">
              Update Profile Facts →
            </Link>
          </div>

          {/* Honest Preparation Reminder */}
          <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-3">
            <div className="flex items-center gap-2 text-[#58CC02]">
              <CheckCircle2 size={18} />
              <h3 className="text-sm font-black text-[var(--ink)]">Preparation Workspace</h3>
            </div>
            <p className="text-xs font-semibold text-[var(--muted)] leading-relaxed">
              Elara helps you organize requirements, drafts, and evidence. Final submission always occurs directly through the provider’s official portal.
            </p>
            <Link href="/workspace" className="text-xs font-extrabold text-[#58CC02] hover:underline block">
              View active applications →
            </Link>
          </div>
        </aside>
      </div>

      {/* Tactile Opportunity Detail Modal Dialog */}
      <dialog
        ref={dialog}
        className="adventure-detail"
        onClose={() => setDetail(null)}
        aria-labelledby="detail-title"
      >
        {activeDetail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--line)]">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border border-[#B7E885]">
                {label(activeDetail.opportunity.category || 'Opportunity')}
              </span>
              <button
                className="w-9 h-9 rounded-xl border-2 border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Close opportunity details"
                onClick={() => dialog.current?.close()}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h2 id="detail-title" className="text-xl sm:text-2xl font-black text-[var(--ink)] leading-snug">
                {activeDetail.title}
              </h2>
              {activeDetail.opportunity.organizer && (
                <p className="text-sm font-bold text-[var(--muted)] mt-1">
                  {activeDetail.opportunity.organizer}
                </p>
              )}
            </div>

            <p className="text-sm font-semibold text-[var(--ink)] leading-relaxed bg-[var(--canvas)] p-4 rounded-xl border border-[var(--line)]">
              {activeDetail.opportunity.summary ||
                'Review the official provider page for the complete opportunity description.'}
            </p>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border-2 border-[var(--line)] bg-white">
              <div>
                <small className="block text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider">
                  Deadline
                </small>
                <strong className="block text-sm font-black text-[var(--ink)] mt-0.5">
                  {formatDeadline(activeDetail.deadline, activeDetail.opportunity.timezone_known)}
                </strong>
                <span className="text-[11px] font-semibold text-[var(--muted)]">
                  {activeDetail.opportunity.deadline_timezone || 'Timezone unconfirmed'}
                </span>
              </div>
              <div>
                <small className="block text-[11px] font-black text-[var(--subtle)] uppercase tracking-wider">
                  Funding & Support
                </small>
                <strong className="block text-sm font-black text-[var(--ink)] mt-0.5">
                  {activeDetail.opportunity.funding_description || 'Funding not confirmed'}
                </strong>
              </div>
            </div>

            {/* Rule-by-Rule Eligibility Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[var(--ink)] uppercase tracking-wider">
                Eligibility Evaluation
              </h3>
              <div
                className={`p-3.5 rounded-xl border-2 ${
                  eligibilityConfig[activeDetail.eligibility_summary.verdict]?.classes ||
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="font-extrabold text-sm mb-1">
                  {eligibilityConfig[activeDetail.eligibility_summary.verdict]?.label}:{' '}
                  <span className="font-semibold">
                    {eligibilityConfig[activeDetail.eligibility_summary.verdict]?.desc}
                  </span>
                </div>
                <p className="text-xs font-semibold leading-relaxed">
                  {activeDetail.eligibility_summary.details}
                </p>
              </div>

              {activeDetail.specific_gaps.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FFF5E0] border border-[#FCD68A] text-xs font-semibold text-[#966100]">
                  <strong className="block font-black mb-1">Items to clarify:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {activeDetail.specific_gaps.map((gap, idx) => (
                      <li key={idx}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* What to Prepare */}
            <div>
              <h3 className="text-sm font-black text-[var(--ink)] uppercase tracking-wider mb-1.5">
                Required Documents
              </h3>
              <p className="text-xs font-semibold text-[var(--muted)]">
                {activeDetail.opportunity.required_documents?.length
                  ? activeDetail.opportunity.required_documents.join(', ')
                  : 'Specific required documents are not listed. Verify on official portal.'}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t-2 border-[var(--line)] flex items-center gap-3 flex-wrap">
              {selectedApp?.stage && selectedApp.stage !== 'saved' ? (
                <Link
                  className="btn btn-primary"
                  href={`/workspace/${selectedApp.id}`}
                >
                  Continue in Workspace →
                </Link>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={
                    busy === activeDetail.opportunity_id ||
                    isClosedOrExpired(
                      activeDetail.deadline,
                      activeDetail.opportunity.source_status
                    )
                  }
                  onClick={() => void act(activeDetail, 'prepare')}
                >
                  {busy === activeDetail.opportunity_id
                    ? 'Setting up…'
                    : 'Start Preparation'}
                </button>
              )}

              <Link
                className="btn btn-secondary"
                href={`/opportunities/${activeDetail.opportunity_id}`}
              >
                Full Details Page
              </Link>

              {(activeDetail.opportunity.official_url ||
                activeDetail.opportunity.source_url) && (
                <a
                  className="btn btn-ghost ml-auto flex items-center gap-1.5 font-extrabold"
                  href={
                    activeDetail.opportunity.official_url ||
                    activeDetail.opportunity.source_url!
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Official source</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
