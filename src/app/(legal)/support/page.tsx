import Link from "next/link";
import { APP_NAME } from "@/config/app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Support — ${APP_NAME}`,
  description: `Get help with ${APP_NAME}.`,
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface-main)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs" style={{ background: "linear-gradient(180deg, #285C48 0%, #1C4636 100%)" }}>E</div>
            <span className="font-bold text-[var(--ink)] text-sm">{APP_NAME}</span>
          </Link>
          <Link href="/" className="text-sm text-[#285C48] hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Support</h1>

        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-sm text-gray-600 mb-4">
              For support, bug reports, or feature requests:
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Email:</strong>{" "}
                <a href="mailto:support@opportunityworkspace.com" className="text-blue-600 hover:underline">
                  support@opportunityworkspace.com
                </a>
                <span className="text-gray-400 ml-2">(placeholder — update before launch)</span>
              </div>
              <div>
                <strong>Response time:</strong> Within 48 hours for paid users, within 1 week for free users
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Common Questions</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-800">How do I reset my password?</h3>
                <p className="text-gray-500 mt-1">
                  Use the &quot;Forgot password&quot; link on the login page. If that doesn&apos;t work,
                  contact support with your account email.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">How do I delete my account?</h3>
                <p className="text-gray-500 mt-1">
                  Go to Settings → Danger Zone → Delete my account. Type DELETE to confirm.
                  This permanently removes all your data.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">How do I export my data?</h3>
                <p className="text-gray-500 mt-1">
                  Go to Settings → Download all my data (JSON). You can also export
                  opportunity-specific context packs from any application workspace.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Is my data safe?</h3>
                <p className="text-gray-500 mt-1">
                  We use encrypted connections (HTTPS) and database-level access controls.
                  See our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> for details.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">The eligibility analysis seems wrong</h3>
                <p className="text-gray-500 mt-1">
                  Eligibility analysis is advisory only. Always verify requirements on the original
                  opportunity source. If you find a consistent error, please report it.
                </p>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Bug Reports</h2>
            <p className="text-sm text-gray-600">
              When reporting a bug, please include:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4 mt-2">
              <li>What you were trying to do</li>
              <li>What happened instead</li>
              <li>Steps to reproduce the issue</li>
              <li>Your browser and device (if relevant)</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
