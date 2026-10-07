'use client';
import { useState } from 'react';
import type { ApplicationTask, Opportunity } from '@/types/database';
import { Check, ExternalLink } from 'lucide-react';

export function PreparationChecklist({
  opportunity,
  tasks,
  onStarted,
  onToggle,
}: {
  opportunity: Opportunity;
  tasks: ApplicationTask[];
  onStarted: (tasks: ApplicationTask[]) => void;
  onToggle: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const steps = tasks.filter((task) => task.task_key).sort((a, b) => a.sort_order - b.sort_order);
  const done = steps.filter((task) => task.completed).length;
  const progressPct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  async function start() {
    setBusy('start');
    setError('');
    try {
      const response = await fetch('/api/applications/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunity.id, action: 'prepare' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Preparation could not be started.');

      const { createClient } = await import('@/lib/db/client');
      const { data, error: dbErr } = await createClient()
        .from('application_tasks')
        .select('*')
        .eq('application_id', result.application_id);
      if (dbErr) throw dbErr;
      onStarted(data || []);
      window.dispatchEvent(new Event('elara:progress'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preparation could not be saved.');
    } finally {
      setBusy('');
    }
  }

  async function toggle(id: string) {
    setBusy(id);
    setError('');
    try {
      await onToggle(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checklist could not be saved.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b-2 border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#58CC02] font-black shadow-[0_2px_0_#46A302]">
              ✓
            </span>
            <h2 className="text-xl font-black text-[var(--ink)]">
              {steps.length && done === steps.length
                ? 'All Preparation Steps Complete!'
                : 'Application Stepper'}
            </h2>
          </div>
          <p className="text-xs font-semibold text-[var(--muted)] mt-1">
            {done} of {steps.length || 3} preparation steps completed ({progressPct}%)
          </p>
        </div>

        {/* Duolingo Pill Progress Meter */}
        {steps.length > 0 && (
          <div className="w-44 space-y-1">
            <div className="adventure-meter" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-right text-[11px] font-black text-[#58CC02]">{progressPct}% Complete</div>
          </div>
        )}
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {/* Stepper Vertical Progression */}
      {steps.length ? (
        <div className="space-y-4">
          {steps.map((task, index) => {
            const isDone = task.completed;
            const isFirstUnfinished = !isDone && steps.findIndex((s) => !s.completed) === index;

            return (
              <div
                key={task.id}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
                  isDone
                    ? 'border-[#B7E885] bg-[#EEFFD9]/40'
                    : isFirstUnfinished
                    ? 'border-[#1CB0F6] bg-white shadow-[0_3px_0_#99DAFC]'
                    : 'border-[var(--line)] bg-[var(--canvas)] opacity-85'
                }`}
              >
                {/* Node Circle */}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => toggle(task.id)}
                  aria-pressed={isDone}
                  aria-label={isDone ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 font-black text-sm cursor-pointer transition-all active:translate-y-[2px] ${
                    isDone
                      ? 'bg-[#58CC02] border-[#58CC02] text-white shadow-[0_2px_0_#46A302]'
                      : isFirstUnfinished
                      ? 'bg-white border-[#1CB0F6] text-[#1CB0F6] shadow-[0_2px_0_#1899D6]'
                      : 'bg-white border-[var(--line-strong)] text-[var(--muted)] shadow-[0_2px_0_#E3E7EA]'
                  }`}
                >
                  {isDone ? <Check size={18} strokeWidth={3} /> : index + 1}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className={`text-base font-extrabold ${isDone ? 'line-through text-[var(--muted)]' : 'text-[var(--ink)]'}`}>
                      {task.title}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isDone
                          ? 'bg-[#EEFFD9] text-[#287300] border-[#B7E885]'
                          : isFirstUnfinished
                          ? 'bg-[#DDF4FF] text-[#0E74A6] border-[#99DAFC]'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {isDone ? 'Completed' : isFirstUnfinished ? 'Current Step' : 'Up Next'}
                    </span>
                  </div>

                  {task.task_key === 'materials' && (
                    <p className="text-xs font-semibold text-[var(--muted)] mt-1.5 leading-relaxed">
                      {opportunity.required_documents?.length
                        ? `Required: ${opportunity.required_documents.join(', ')}`
                        : 'Confirm the required application materials with the provider portal.'}
                    </p>
                  )}

                  {task.task_key === 'review' && (
                    <p className="text-xs font-semibold text-[var(--muted)] mt-1.5 leading-relaxed">
                      Verify country, education level, deadline, and eligibility constraints.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm font-semibold text-[var(--muted)]">
            Start the structured preparation checklist for this opportunity.
          </p>
          <button
            className="btn btn-primary"
            disabled={!!busy}
            onClick={start}
          >
            {busy ? 'Setting up…' : 'Start My Preparation'}
          </button>
        </div>
      )}

      {/* External submission callout without auto-submitting */}
      <div className="pt-4 border-t-2 border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--canvas)] p-4 rounded-xl">
        <p className="text-xs font-semibold text-[var(--muted)] leading-relaxed">
          ℹ️ Preparing in build2ship does not automatically submit your application. You submit directly with the provider when ready.
        </p>

        {(opportunity.official_url || opportunity.source_url) && (
          <a
            className="btn btn-secondary btn-sm shrink-0 flex items-center gap-1.5 font-bold"
            href={opportunity.official_url || opportunity.source_url!}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open Provider Portal</span>
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </section>
  );
}
