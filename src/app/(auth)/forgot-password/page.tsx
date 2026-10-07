'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { APP_NAME } from '@/config/app';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] px-4 py-12 text-[var(--ink)]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label={`${APP_NAME} home`}>
            <span className="w-10 h-10 rounded-2xl bg-[#58CC02] text-white flex items-center justify-center font-black text-2xl shadow-[0_3px_0_#46A302]">
              e
            </span>
            <span className="text-2xl font-black tracking-tight text-[var(--ink)]">
              elara<span className="text-[#58CC02]">.</span>
            </span>
          </Link>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm font-bold text-[var(--ink-secondary)]">
            Enter your email to receive recovery instructions.
          </p>
        </div>

        <div className="bg-white rounded-3xl border-2 border-[var(--line)] p-7 shadow-[0_4px_0_var(--line)] space-y-5">
          {error && (
            <div role="alert" className="p-3.5 rounded-2xl bg-[#FFE5E5] border-2 border-[#D93B3B] text-[#991B1B] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div role="status" className="p-3.5 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] text-[#287300] text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              setMessage('');
              try {
                const { authClient } = await import('@/lib/auth/client');
                const { error: err } = await authClient.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
                });
                if (err) throw err;
                setMessage('If an account exists, a password reset link will arrive by email.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Try again later.');
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="reset-email">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#58CC02] border-2 border-[#46A302] text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#46A302] hover:brightness-105 active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{busy ? "Sending link…" : "Send Reset Link"}</span>
              {!busy && <ArrowRight size={16} strokeWidth={3} />}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--ink-secondary)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
