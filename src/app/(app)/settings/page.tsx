'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Bell, Download, LogOut, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NotificationPreference } from '@/lib/notifications/types';

function clearProfileCache() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('opp_profile_cache_') || key.startsWith('opp_insight_')) {
      localStorage.removeItem(key);
    }
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPreferences(data.preferences);
      })
      .catch((error) => { setMessageIsError(true); setMessage(error.message); });
  }, []);

  async function action(work: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    try {
      await work();
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { createClient } = await import('@/lib/db/client');
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
    clearProfileCache();
    router.replace('/login');
  }

  return (
    <div className="page-frame max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#DDF4FF] border-2 border-[#1CB0F6] flex items-center justify-center text-[#0B72A4] shadow-[0_3px_0_#1899D6]">
          <Settings className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">Settings</h1>
          <p className="text-xs font-semibold text-[var(--ink-muted)]">
            Manage your notification frequency, data exports, and account preferences.
          </p>
        </div>
      </div>

      {message && (
        <div
          role={messageIsError ? 'alert' : 'status'}
          className={`p-4 rounded-2xl text-xs font-black border-2 flex items-center gap-2 ${messageIsError ? 'bg-[#FFE5E5] border-[#D93B3B] text-[#991B1B]' : 'bg-[#EEFFD9] border-[#58CC02] text-[#287300]'}`}
        >
          {messageIsError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {/* Opportunity Alerts Card */}
      <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#58CC02]" strokeWidth={2.5} />
          <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Opportunity Alerts</h2>
        </div>

        {!preferences ? (
          <p className="text-xs font-semibold text-[var(--ink-muted)]">Loading preferences…</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void action(async () => {
                const response = await fetch('/api/notifications/preferences', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(preferences),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setMessage('Alert preferences saved.');
              });
            }}
          >
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={preferences.email_enabled}
                  onChange={(event) => setPreferences({ ...preferences, email_enabled: event.target.checked })}
                  className="w-5 h-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0 cursor-pointer"
                />
                <span>Email me relevant shortlists and saved-opportunity deadlines</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={preferences.in_app_enabled}
                  onChange={(event) => setPreferences({ ...preferences, in_app_enabled: event.target.checked })}
                  className="w-5 h-5 rounded-md border-2 border-[var(--border)] text-[#58CC02] focus:ring-0 cursor-pointer"
                />
                <span>Show alerts in the app</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                  Digest Frequency
                </label>
                <select
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer"
                  value={preferences.frequency}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      frequency: event.target.value as NotificationPreference['frequency'],
                    })
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  {preferences.frequency === 'instant' && (
                    <option value="instant">Weekly (previous instant preference)</option>
                  )}
                </select>
              </div>

              {preferences.frequency !== 'daily' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Digest Day
                  </label>
                  <select
                    className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white cursor-pointer"
                    value={preferences.digest_day}
                    onChange={(event) =>
                      setPreferences({ ...preferences, digest_day: Number(event.target.value) })
                    }
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                      (day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                  Digest Time
                </label>
                <input
                  required
                  type="time"
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={preferences.digest_time.slice(0, 5)}
                  onChange={(event) =>
                    setPreferences({ ...preferences, digest_time: event.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                  Timezone
                </label>
                <input
                  className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#58CC02] focus:bg-white"
                  value={preferences.timezone}
                  onChange={(event) =>
                    setPreferences({ ...preferences, timezone: event.target.value })
                  }
                  placeholder="Asia/Kolkata"
                />
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                Saved-Opportunity Reminders
              </span>
              <div className="flex flex-wrap gap-3">
                {[7, 3, 1].map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--ink)] bg-[#F7F9FA] px-3.5 py-2 rounded-xl border-2 border-[var(--border)] hover:border-[#1CB0F6]"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.deadline_reminder_days.includes(day)}
                      onChange={(event) =>
                        setPreferences({
                          ...preferences,
                          deadline_reminder_days: event.target.checked
                            ? [...preferences.deadline_reminder_days, day]
                            : preferences.deadline_reminder_days.filter((value) => value !== day),
                        })
                      }
                      className="rounded text-[#58CC02] focus:ring-0"
                    />
                    <span>
                      {day} day{day > 1 ? 's' : ''} before deadline
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed pt-1">
              Times follow your timezone, including daylight saving. Empty shortlists produce no email. Every email includes an unsubscribe link.
            </p>

            <button disabled={busy} className="btn btn-primary font-black text-xs px-5 py-2.5">
              {busy ? 'Saving…' : 'Save Preferences'}
            </button>
          </form>
        )}
      </section>

      {/* Your Data Card */}
      <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-[#1CB0F6]" strokeWidth={2.5} />
          <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Your Data</h2>
        </div>
        <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">
          Download a complete portable archive of your profile, saved work, preferences, insights, alerts, and billing records.
        </p>
        <button
          className="btn btn-secondary font-bold text-xs px-4 py-2 flex items-center gap-1.5"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const response = await fetch('/api/account');
              if (!response.ok) throw new Error((await response.json()).error);
              const url = URL.createObjectURL(await response.blob());
              const a = document.createElement('a');
              a.href = url;
              a.download = 'build2ship-export.json';
              a.click();
              URL.revokeObjectURL(url);
              setMessage('Your complete data export was downloaded.');
            })
          }
        >
          <Download className="w-4 h-4 text-[#1CB0F6]" strokeWidth={2.5} />
          <span>Download My Data (JSON)</span>
        </button>
      </section>

      {/* Account / Sign out Card */}
      <section className="bg-white border-2 border-[var(--border)] rounded-2xl p-6 shadow-[0_4px_0_#E3E7EA] space-y-4">
        <div className="flex items-center gap-2">
          <LogOut className="w-5 h-5 text-[var(--ink-muted)]" strokeWidth={2.5} />
          <h2 className="text-base font-black text-[var(--ink)] tracking-tight">Account Session</h2>
        </div>
        <p className="text-xs font-semibold text-[var(--ink-muted)]">
          Sign out of your account on this device.
        </p>
        <button
          className="btn btn-secondary font-bold text-xs px-4 py-2 flex items-center gap-1.5"
          disabled={busy}
          onClick={() => void action(signOut)}
        >
          <LogOut className="w-4 h-4 text-[var(--ink-muted)]" strokeWidth={2.5} />
          <span>Sign Out</span>
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-white border-2 border-[#D93B3B] rounded-2xl p-6 shadow-[0_4px_0_#BC2525] space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-[#D93B3B]" strokeWidth={2.5} />
          <h2 className="text-base font-black text-[#D93B3B] tracking-tight">Delete Account</h2>
        </div>
        <p className="text-xs font-semibold text-[var(--ink-muted)] leading-relaxed">
          This permanently deletes your account and private data. Download your data first if you wish to keep a copy.
        </p>
        <div className="max-w-xs space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-muted)]">
            Type DELETE to confirm
          </label>
          <input
            className="input text-sm font-semibold rounded-xl border-2 border-[var(--border)] focus:border-[#D93B3B] focus:bg-white"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
          />
        </div>
        <button
          className="btn btn-danger font-black text-xs px-4 py-2"
          disabled={busy || confirmation !== 'DELETE'}
          onClick={() =>
            void action(async () => {
              const response = await fetch('/api/account', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              await signOut();
            })
          }
        >
          Permanently Delete Account
        </button>
      </section>
    </div>
  );
}
