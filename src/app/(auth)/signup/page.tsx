"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { APP_NAME } from "@/config/app";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { authClient } = await import('@/lib/auth/client');
      const { error: err } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(err.message || 'Authentication failed.');
        return;
      }
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] px-4 py-12 text-[var(--ink)]">
        <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[var(--line)] p-8 text-center shadow-[0_4px_0_var(--line)] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] text-[#287300] mx-auto flex items-center justify-center shadow-[0_3px_0_#46A302]">
            <MailCheck size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-[var(--ink)] tracking-tight">Check your email</h1>
          <p className="text-sm font-semibold text-[var(--ink-secondary)]">
            We sent a verification link to <strong className="text-[var(--ink)]">{email}</strong>. Open it to activate your workspace.
          </p>
          {error && <p role="alert" className="text-xs font-bold text-[#D93B3B]">{error}</p>}
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white border-2 border-[var(--line)] font-black text-sm text-[var(--ink)] shadow-[0_3px_0_var(--line)] hover:border-[var(--line-strong)] active:translate-y-[2px] active:shadow-none"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] px-4 py-12 text-[var(--ink)]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label={`${APP_NAME} home`}>
            <span className="w-10 h-10 rounded-2xl bg-[#58CC02] text-white flex items-center justify-center font-black text-2xl shadow-[0_3px_0_#46A302]">
              b
            </span>
            <span className="text-2xl font-black tracking-tight text-[var(--ink)]">
              build2ship<span className="text-[#58CC02]">.</span>
            </span>
          </Link>
          <h1 className="text-3xl font-black text-[var(--ink)] tracking-tight">
            Create your workspace
          </h1>
          <p className="text-sm font-bold text-[var(--ink-secondary)]">
            Free forever for students and early-career builders.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border-2 border-[var(--line)] p-7 shadow-[0_4px_0_var(--line)] space-y-5">
          {error && (
            <div role="alert" className="p-3.5 rounded-2xl bg-[#FFE5E5] border-2 border-[#D93B3B] text-[#991B1B] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="name">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="alex@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-[11px] font-bold text-[var(--ink-secondary)]">Minimum 8 characters.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#58CC02] border-2 border-[#46A302] text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#46A302] hover:brightness-105 active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Creating workspace…" : "Get Started Free"}</span>
              {!loading && <ArrowRight size={16} strokeWidth={3} />}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--ink-secondary)]">
            Already have an account?{" "}
            <Link
              href={
                typeof window !== "undefined" && new URLSearchParams(window.location.search).get("next")
                  ? `/login?next=${encodeURIComponent(new URLSearchParams(window.location.search).get("next")!)}`
                  : "/login"
              }
              className="text-[#1CB0F6] hover:underline font-black"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
