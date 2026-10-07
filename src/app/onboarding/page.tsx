'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types/database';
import { DISCOVERY_GOALS, DISCOVERY_INTERESTS } from '@/lib/journey';
import {
  BriefcaseBusiness,
  Lightbulb,
  Compass,
  GraduationCap,
  Code2,
  Rocket,
  PenTool,
  FlaskConical,
  Heart,
  Globe2,
  ArrowLeft,
  Check,
  Sparkles,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { createAutosave } from '@/lib/autosave';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { CountrySelector } from '@/components/ui/CountrySelector';

const STEP_TITLES = [
  {
    title: 'What is your primary goal?',
    subtitle: 'Choose what you want to discover first. You can always change this later.',
  },
  {
    title: 'What areas interest you most?',
    subtitle: 'Select any topics you care about to tailor your initial recommendations.',
  },
  {
    title: 'Tell us a bit about your background',
    subtitle: 'This helps verify provider criteria like degree level, location, and age range.',
  },
  {
    title: 'Share your experience (Optional)',
    subtitle: 'Add skills or projects to help draft stronger applications when you are ready.',
  },
];

const GOAL_ICONS = [BriefcaseBusiness, Lightbulb, Compass, GraduationCap];
const INTEREST_ICONS = [Code2, Rocket, PenTool, FlaskConical, Heart, Globe2];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const [autosave] = useState(() =>
    createAutosave<Profile>(
      async (updates) => {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          keepalive: true,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your answers could not be saved.');
      },
      (state) => {
        setStatus(state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Not saved');
        if (state === 'error') {
          setError('Your latest answers have not saved. Retry before continuing.');
        } else {
          setError('');
        }
      }
    )
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profile', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Profile could not be loaded.');
        setProfile(result.profile);
        setStep(Math.min(result.profile.onboarding_step || 0, 3));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (autosave.hasPending()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const retry = () => autosave.retry();
    window.addEventListener('beforeunload', guard);
    window.addEventListener('online', retry);
    return () => {
      window.removeEventListener('beforeunload', guard);
      window.removeEventListener('online', retry);
    };
  }, [autosave]);

  function change(updates: Partial<Profile>) {
    setProfile((prev) => ({ ...prev, ...updates }));
    autosave.update(updates);
  }

  async function move(next: number, complete = false) {
    setBusy(true);
    try {
      autosave.update({
        onboarding_step: next,
        ...(complete ? { onboarding_completed: true } : {}),
      });
      await autosave.flush();
      if (autosave.hasPending()) throw new Error('Your answers have not saved. Please retry.');
      if (complete) router.push('/discover');
      else setStep(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  if (!profile && !error) {
    return (
      <main className="onboarding-page min-h-screen flex items-center justify-center bg-[var(--canvas)] p-4">
        <PageLoader />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="onboarding-page min-h-screen flex items-center justify-center bg-[var(--canvas)] p-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#58CC02] font-black text-2xl shadow-[0_3px_0_#46A302]">
            ✦
          </div>
          <h1 className="text-2xl font-black text-[var(--ink)]">
            {error ? 'Unable to load profile' : 'Setting up your workspace…'}
          </h1>
          {error && (
            <>
              <p className="text-sm font-semibold text-red-600" role="alert">
                {error}
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Try again
                </button>
                <Link href="/login" className="btn btn-secondary">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  const current = STEP_TITLES[step];
  const progressPct = ((step + 1) / 4) * 100;
  const canContinue =
    (step === 0 && !!profile.discovery_goal) ||
    (step === 1 && !!profile.interests?.filter(Boolean).length) ||
    step === 2 ||
    step === 3;

  return (
    <main className="min-h-screen flex flex-col bg-[var(--canvas)] text-[var(--ink)]">
      {/* Top Navigation Bar with Duolingo Progress Bar */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-[var(--line)] px-4 py-3 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {step > 0 ? (
            <button
              onClick={() => move(step - 1)}
              disabled={busy}
              className="w-10 h-10 rounded-xl border-2 border-[var(--line)] bg-white flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)] active:translate-y-[2px] transition-all cursor-pointer shadow-[0_2px_0_#E3E7EA]"
              aria-label="Go back to previous step"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <Link href="/" className="font-black text-xl tracking-tight text-[var(--ink)] flex items-center gap-1.5">
              <span className="w-8 h-8 rounded-xl bg-[#58CC02] text-white flex items-center justify-center font-black text-base shadow-[0_2px_0_#46A302]">
                b
              </span>
              build2ship<span className="text-[#58CC02]">.</span>
            </Link>
          )}

          {/* Duolingo Pill Progress Bar */}
          <div className="flex-1 mx-2 sm:mx-6">
            <div
              className="h-3.5 sm:h-4 w-full bg-[var(--line)] rounded-full overflow-hidden p-0.5"
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={4}
            >
              <div
                className="h-full bg-[#58CC02] rounded-full transition-all duration-300 relative shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                style={{ width: `${progressPct}%` }}
              >
                <div className="absolute inset-x-1 top-0.5 h-1 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            disabled={busy}
            onClick={() => move(step, true)}
          >
            Explore first
          </button>
        </div>
      </header>

      {/* Main Questionnaire Screen */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-between">
        <div>
          {/* Question Header */}
          <div className="mb-8 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border-2 border-[#B7E885] mb-3 uppercase tracking-wider">
              Step {step + 1} of 4
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
              {current.title}
            </h1>
            <p className="text-base font-semibold text-[var(--muted)] mt-2">
              {current.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mb-6 flex items-center justify-between" role="alert">
              <span>{error}</span>
              <button className="underline text-sm font-bold" onClick={() => autosave.retry()}>
                Retry
              </button>
            </div>
          )}

          {/* STEP 0: GOALS */}
          {step === 0 && (
            <div className="space-y-3" role="radiogroup" aria-label="Discovery Goals">
              {DISCOVERY_GOALS.map((goal, index) => {
                const Icon = GOAL_ICONS[index] || Compass;
                const isSelected = profile.discovery_goal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => change({ discovery_goal: goal })}
                    className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'border-[#58CC02] bg-[#EEFFD9] text-[#287300] shadow-[0_4px_0_#58CC02]'
                        : 'border-[var(--line)] bg-white text-[var(--ink)] shadow-[0_4px_0_#E3E7EA] hover:border-[#1CB0F6] hover:bg-[#F7F9FA] active:translate-y-[2px] active:shadow-[0_2px_0_#E3E7EA]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                          isSelected
                            ? 'bg-white border-[#58CC02] text-[#58CC02]'
                            : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--muted)]'
                        }`}
                      >
                        <Icon size={22} strokeWidth={2.3} />
                      </div>
                      <span className="font-extrabold text-base sm:text-lg">{goal}</span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#58CC02] border-[#58CC02] text-white'
                          : 'border-[var(--line-strong)] bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 1: INTERESTS */}
          {step === 1 && (
            <div>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">
                Choose one or more:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Interests">
                {DISCOVERY_INTERESTS.map((interest, index) => {
                  const Icon = INTEREST_ICONS[index] || Sparkles;
                  const isSelected = profile.interests?.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={!!isSelected}
                      onClick={() => {
                        const currentInterests = profile.interests || [];
                        const nextInterests = isSelected
                          ? currentInterests.filter((item) => item !== interest)
                          : [...currentInterests, interest];
                        change({ interests: nextInterests });
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none text-left ${
                        isSelected
                          ? 'border-[#58CC02] bg-[#EEFFD9] text-[#287300] shadow-[0_4px_0_#58CC02]'
                          : 'border-[var(--line)] bg-white text-[var(--ink)] shadow-[0_4px_0_#E3E7EA] hover:border-[#1CB0F6] hover:bg-[#F7F9FA] active:translate-y-[2px] active:shadow-[0_2px_0_#E3E7EA]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 ${
                            isSelected
                              ? 'bg-white border-[#58CC02] text-[#58CC02]'
                              : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--muted)]'
                          }`}
                        >
                          <Icon size={18} strokeWidth={2.3} />
                        </div>
                        <span className="font-extrabold text-sm sm:text-base">{interest}</span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#58CC02] border-[#58CC02] text-white'
                            : 'border-[var(--line-strong)] bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: EDUCATION & LOCATION */}
          {step === 2 && (
            <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-5">
              <div>
                <label className="label flex items-center gap-2">
                  <BookOpen size={16} className="text-[#1CB0F6]" />
                  <span>Current Chapter / Education Level</span>
                </label>
                <select
                  className="input cursor-pointer"
                  value={profile.education_stage || ''}
                  onChange={(e) =>
                    change({
                      education_stage: e.target.value
                        ? (e.target.value as Profile['education_stage'])
                        : null,
                    })
                  }
                >
                  <option value="">Add later</option>
                  <option value="undergraduate">Undergraduate student</option>
                  <option value="masters">Master’s student</option>
                  <option value="phd">PhD student or Researcher</option>
                  <option value="other">Early career, builder, founder, or other</option>
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <MapPin size={16} className="text-[#FFB020]" />
                  <span>Country of Residence</span>
                </label>
                <CountrySelector
                  id="onboarding-country"
                  value={profile.country_of_residence || ''}
                  onChange={(val) => change({ country_of_residence: val || null })}
                />
              </div>

              <div>
                <label className="label">Age Range (Optional)</label>
                <select
                  className="input cursor-pointer"
                  value={profile.age_band || ''}
                  onChange={(e) => change({ age_band: e.target.value || null })}
                >
                  <option value="">Add later</option>
                  {['Under 18', '18–20', '21–24', '25–29', '30+'].map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--line)] text-xs text-[var(--muted)] font-semibold leading-relaxed">
                ℹ️ Location and education help check restrictions. They never guarantee eligibility on their own. Missing facts stay marked as unknown.
              </div>
            </div>
          )}

          {/* STEP 3: EXPERIENCE & SKILLS */}
          {step === 3 && (
            <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-5">
              <div>
                <label className="label" htmlFor="onboard-experience">
                  Brief Experience or What You’ve Built
                </label>
                <textarea
                  id="onboard-experience"
                  className="input min-h-28"
                  maxLength={2000}
                  value={profile.experience_summary || ''}
                  onChange={(e) => change({ experience_summary: e.target.value })}
                  placeholder="e.g. built a web app with React, open-source contributions, academic project on climate data..."
                />
              </div>

              <div>
                <label className="label" htmlFor="onboard-skills">
                  Key Skills
                </label>
                <input
                  id="onboard-skills"
                  type="text"
                  className="input"
                  value={(profile.skills || []).join(', ')}
                  onChange={(e) =>
                    change({
                      skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Python, Figma, TypeScript, Data Analysis..."
                />
              </div>

              <div>
                <label className="label" htmlFor="onboard-portfolio">
                  Portfolio, GitHub, or LinkedIn URL
                </label>
                <input
                  id="onboard-portfolio"
                  type="url"
                  className="input"
                  value={profile.portfolio_url || ''}
                  onChange={(e) => change({ portfolio_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
                <span>Have an existing resume?</span>
                <Link
                  href="/onboarding/import"
                  className="text-[#1CB0F6] hover:underline inline-flex items-center gap-1"
                >
                  Import resume or profile context →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <footer className="mt-8 pt-6 border-t-2 border-[var(--line)] flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-[var(--muted)]">
            {status ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#58CC02]" />
                {status}
              </span>
            ) : (
              <span>Step {step + 1} of 4</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 3 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm font-bold"
                disabled={busy}
                onClick={() => move(4, true)}
              >
                Skip for now
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary px-8 text-base tracking-wide"
              disabled={busy || !canContinue}
              onClick={() => move(step === 3 ? 4 : step + 1, step === 3)}
            >
              {busy ? 'Saving…' : step === 3 ? 'Show Opportunities' : 'Continue'}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
