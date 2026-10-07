"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { APP_NAME } from "@/config/app";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const { data: authData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message || 'Authentication failed.');
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const nextParam = searchParams.get("next");
      const validNext =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//") &&
        !nextParam.includes("://") &&
        !nextParam.includes("\\")
          ? nextParam
          : null;

      let destination = validNext || "/discover";
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (!profile?.onboarding_completed) {
          destination = "/onboarding";
        }
      }

      router.replace(destination);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
            Welcome back
          </h1>
          <p className="text-sm font-bold text-[var(--ink-secondary)]">
            Log in to continue your applications and track deadlines.
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--ink-secondary)]" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-black text-[#1CB0F6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--canvas-subtle)] focus:bg-white focus:border-[#1CB0F6] outline-none font-bold text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-secondary)]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#58CC02] border-2 border-[#46A302] text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_0_#46A302] hover:brightness-105 active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Signing in…" : "Sign In"}</span>
              {!loading && <ArrowRight size={16} strokeWidth={3} />}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--ink-secondary)]">
            Don&apos;t have an account?{" "}
            <Link
              href={
                typeof window !== "undefined" && new URLSearchParams(window.location.search).get("next")
                  ? `/signup?next=${encodeURIComponent(new URLSearchParams(window.location.search).get("next")!)}`
                  : "/signup"
              }
              className="text-[#1CB0F6] hover:underline font-black"
            >
              Create workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
