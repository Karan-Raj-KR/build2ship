"use client";

import Link from "next/link";
import { APP_NAME, APP_PREVIEW_BADGE } from "@/config/app";

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-[var(--line)] bg-white py-14 md:py-18 text-xs text-[var(--ink-secondary)]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b-2 border-[var(--line)]">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-[var(--ink)]"
            >
              <span className="w-8 h-8 rounded-xl bg-[#58CC02] text-white flex items-center justify-center font-black text-lg shadow-[0_2px_0_#46A302]">
                e
              </span>
              <span>
                elara<span className="text-[#58CC02]">.</span>
              </span>
            </Link>
            <p className="max-w-[38ch] text-[var(--ink-secondary)] font-semibold leading-relaxed text-sm">
              Your space to discover opportunities, understand requirements, and prepare with your own evidence.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--canvas-subtle)] border-2 border-[var(--line)] text-[11px] font-black text-[var(--ink-secondary)]">
              {APP_PREVIEW_BADGE} · Independent & Open
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="font-black uppercase tracking-wider text-[var(--ink)] text-xs mb-3">
              Navigation
            </h4>
            <ul className="space-y-2.5 font-bold">
              <li>
                <a href="#catalogue" className="hover:text-[var(--primary-dark)] transition-colors">
                  Programme examples
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[var(--primary-dark)] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pillars" className="hover:text-[var(--primary-dark)] transition-colors">
                  Eligibility Engine
                </a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-[var(--primary-dark)] transition-colors">
                  Why Elara
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[var(--primary-dark)] transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div className="md:col-span-4">
            <h4 className="font-black uppercase tracking-wider text-[var(--ink)] text-xs mb-3">
              Legal & Access
            </h4>
            <div className="grid grid-cols-2 gap-2.5 font-bold">
              <Link href="/privacy" className="hover:text-[var(--primary-dark)] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[var(--primary-dark)] transition-colors">
                Terms of Service
              </Link>
              <Link href="/refund" className="hover:text-[var(--primary-dark)] transition-colors">
                Refund Policy
              </Link>
              <Link href="/support" className="hover:text-[var(--primary-dark)] transition-colors">
                Support & Contact
              </Link>
              <Link href="/login" className="hover:text-[var(--primary-dark)] transition-colors">
                Account Sign In
              </Link>
              <Link href="/signup" className="hover:text-[var(--primary-dark)] transition-colors">
                Register Workspace
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <p>© 2026 {APP_NAME}. All rights reserved.</p>
          <p className="text-[11px] text-[var(--ink-secondary)]">
            Confirm current rules and deadlines with the official provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
