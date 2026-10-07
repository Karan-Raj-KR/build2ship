'use client';

import Link from 'next/link';
import { Check, Sparkles, Compass, FolderCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useJourney } from '@/components/adventure/JourneyProvider';

export default function JourneyPage() {
  const { data, error, refresh } = useJourney();

  const keys = new Set(data?.rewards.map((reward) => reward.event_key) || []);
  const basicsDone = !!(
    data?.profile?.discovery_goal &&
    data.profile.interests?.length &&
    data.profile.country_of_residence &&
    data.profile.education_stage
  );
  const savedDone = keys.has('first_saved') || (data?.saved_items && data.saved_items.length > 0);
  const preparedDone = keys.has('first_prepared');

  const milestones = [
    {
      id: 'profile',
      title: 'Profile Foundation',
      description: 'Add your discovery goal, interests, location, and current education stage.',
      done: basicsDone,
      href: '/profile',
      action: 'Complete Profile',
      icon: UserCheck,
      color: 'blue',
    },
    {
      id: 'discover',
      title: 'First Target Opportunity',
      description: 'Explore verified programs and bookmark an opportunity that fits your path.',
      done: savedDone,
      href: '/discover',
      action: 'Explore Opportunities',
      icon: Compass,
      color: 'green',
    },
    {
      id: 'prepare',
      title: 'Application Preparation',
      description: 'Review rules, prepare required documents, and track deadlines on your workspace.',
      done: preparedDone,
      href: '/workspace',
      action: 'Open Workspace',
      icon: FolderCheck,
      color: 'amber',
    },
  ];

  const profilePct = data?.profile_completion ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[var(--line)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEFFD9] border-2 border-[#58CC02] text-[#287300] text-xs font-black tracking-wide uppercase mb-2">
            <Sparkles size={14} /> Application Milestones
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--ink)] tracking-tight">
            Your Journey
          </h1>
          <p className="text-[var(--ink-secondary)] text-base font-semibold mt-1">
            Step-by-step progress from discovering possibilities to confident submission.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-[var(--line)] shadow-[0_4px_0_var(--line)]">
            <div className="w-12 h-12 rounded-xl bg-[#DDF4FF] border-2 border-[#1CB0F6] flex items-center justify-center text-[#0B72A4] font-black text-lg">
              {profilePct}%
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                Readiness
              </div>
              <div className="text-sm font-black text-[var(--ink)]">Profile Complete</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-[#FFE5E5] border-2 border-[#D93B3B] text-[#991B1B] font-bold flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => refresh()}
            className="text-xs font-black underline uppercase tracking-wide hover:opacity-80"
          >
            Try again
          </button>
        </div>
      )}

      {/* Profile Readiness Banner */}
      {data && (
        <section className="bg-white rounded-3xl border-2 border-[var(--line)] p-6 shadow-[0_4px_0_var(--line)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-black text-[var(--ink)]">Profile Match Readiness</h2>
              <p className="text-sm font-medium text-[var(--ink-secondary)]">
                Higher completeness delivers more accurate eligibility evaluations and personalized match scoring.
              </p>
            </div>
            <Link
              href="/profile"
              className="px-4 py-2 rounded-xl bg-white border-2 border-[var(--line)] font-extrabold text-sm text-[var(--ink)] shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-none hover:border-[var(--primary)] transition-all whitespace-nowrap"
            >
              Update Profile
            </Link>
          </div>
          <div className="w-full bg-[var(--canvas-subtle)] h-4 rounded-full border-2 border-[var(--line)] overflow-hidden">
            <div
              className="bg-[var(--primary)] h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, profilePct)}%` }}
            />
          </div>
        </section>
      )}

      {/* Path / Stepper */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-[var(--ink)]">Core Milestones</h2>
        <div className="space-y-4">
          {milestones.map((quest, index) => {
            const Icon = quest.icon;
            return (
              <div
                key={quest.id}
                className={`bg-white rounded-3xl border-2 p-6 transition-all shadow-[0_4px_0_var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  quest.done ? 'border-[#58CC02]/40 bg-[#FAFDF7]' : 'border-[var(--line)]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border-2 transition-all ${
                      quest.done
                        ? 'bg-[#58CC02] border-[#46A302] text-white shadow-[0_4px_0_#46A302]'
                        : 'bg-[var(--canvas-subtle)] border-[var(--line)] text-[var(--ink-secondary)] shadow-[0_4px_0_var(--line)]'
                    }`}
                  >
                    {quest.done ? <Check size={28} strokeWidth={3.5} /> : index + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border-2 ${
                          quest.done
                            ? 'bg-[#EEFFD9] border-[#58CC02] text-[#287300]'
                            : 'bg-[var(--canvas-subtle)] border-[var(--line)] text-[var(--ink-secondary)]'
                        }`}
                      >
                        {quest.done ? 'Completed' : 'Milestone'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[var(--ink)] flex items-center gap-2">
                      <Icon size={18} className="text-[var(--ink-secondary)]" />
                      {quest.title}
                    </h3>
                    <p className="text-sm font-semibold text-[var(--ink-secondary)] max-w-xl">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <Link
                    href={quest.href}
                    className={`w-full md:w-auto text-center px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 ${
                      quest.done
                        ? 'bg-white border-2 border-[var(--line)] text-[var(--ink)] shadow-[0_3px_0_var(--line)] hover:border-[var(--line-strong)] active:translate-y-[2px] active:shadow-none'
                        : 'bg-[var(--primary)] border-2 border-[var(--primary-dark)] text-white shadow-[0_4px_0_var(--primary-dark)] hover:brightness-105 active:translate-y-[2px] active:shadow-none'
                    }`}
                  >
                    <span>{quest.done ? 'Review' : quest.action}</span>
                    <ArrowRight size={16} strokeWidth={3} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Activity Log */}
      {data && data.rewards && data.rewards.length > 0 && (
        <section className="bg-white rounded-3xl border-2 border-[var(--line)] p-6 shadow-[0_4px_0_var(--line)] space-y-4">
          <h2 className="text-lg font-black text-[var(--ink)]">Milestone Activity Log</h2>
          <div className="divide-y-2 divide-[var(--line)]">
            {data.rewards.slice(0, 10).map((reward, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300]">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <div className="font-extrabold text-[var(--ink)]">
                      {reward.event_key.startsWith('step:')
                        ? 'Preparation checklist step completed'
                        : reward.event_key.startsWith('prepared:')
                        ? 'Full preparation checklist completed'
                        : ({
                            first_saved: 'First opportunity saved to workspace',
                            first_prepared: 'Application materials prepared',
                            'profile:basics': 'Baseline profile completed',
                            'profile:skills': 'Key skills documented',
                            'profile:experience': 'Experience history recorded',
                            'profile:portfolio': 'External portfolio linked',
                          } as Record<string, string>)[reward.event_key] || 'Progress milestone logged'}
                    </div>
                    <div className="text-xs font-semibold text-[var(--ink-secondary)]">
                      {new Date(reward.awarded_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[var(--canvas-subtle)] text-[var(--ink-secondary)] border-2 border-[var(--line)]">
                  Logged
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Honest Disclaimer */}
      <footer className="p-4 rounded-2xl bg-[var(--canvas-subtle)] border-2 border-[var(--line)] text-center text-xs font-bold text-[var(--ink-secondary)]">
        Milestones track personal preparation and readiness. Official eligibility decisions and application submissions are handled directly by the host institution or program sponsor.
      </footer>
    </div>
  );
}
