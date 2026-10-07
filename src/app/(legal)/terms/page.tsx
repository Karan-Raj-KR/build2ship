import Link from "next/link";
import { APP_NAME } from "@/config/app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `Terms and conditions for using ${APP_NAME}.`,
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance</h2>
            <p>
              By using {APP_NAME}, you agree to these terms. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. What the Service Is</h2>
            <p>
              {APP_NAME} is a personal productivity tool for tracking opportunities and managing applications.
              It is <strong>not</strong> an opportunity discovery engine, an application submission service,
              or an eligibility guarantee service.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Opportunities are manually curated or added by you</li>
              <li>We do not automatically submit applications on your behalf</li>
              <li>Eligibility analysis is advisory only — always verify on the original source</li>
              <li>We do not guarantee admission to any program</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Your Responsibilities</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You are responsible for the accuracy of your profile information</li>
              <li>You are responsible for verifying opportunity details on original sources</li>
              <li>You are responsible for meeting your own deadlines</li>
              <li>You must not misuse the service or attempt to access others&apos; data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. AI-Generated Content</h2>
            <p>
              {APP_NAME} may use AI to generate eligibility analyses, extract opportunity details, or draft application answers.
              AI-generated content is provided as-is and may contain errors. You are responsible for reviewing and verifying
              all AI-generated content before using it in applications.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Payments</h2>
            <p>
              Access passes are processed by Razorpay. Prices are in INR unless otherwise stated.
              See the <Link href="/refund" className="text-blue-600 hover:underline">Refund Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>
              {APP_NAME} is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from
              use of the service, including but not limited to missed opportunities, rejected applications,
              or incorrect eligibility assessments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Account Termination</h2>
            <p>
              You may delete your account at any time. We may terminate accounts that violate these terms.
              Upon termination, your data will be deleted per our privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Changes</h2>
            <p>
              We may update these terms. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Contact</h2>
            <p>
              Questions? Contact{" "}
              <a href="mailto:support@opportunityworkspace.com" className="text-blue-600 hover:underline">
                support@opportunityworkspace.com
              </a>.
              This email address is a placeholder — update it with your actual contact before launch.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
