import Link from "next/link";
import { APP_NAME } from "@/config/app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and protects your personal information.`,
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. What We Collect</h2>
            <p>We collect only what you provide:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Account information:</strong> email address (for authentication only)</li>
              <li><strong>Profile data:</strong> education, skills, interests, nationality — entered by you</li>
              <li><strong>Evidence items:</strong> projects, achievements, experiences — entered by you</li>
              <li><strong>Application data:</strong> saved opportunities, tasks, answer drafts, notes</li>
              <li><strong>Payment information:</strong> processed by Razorpay; we do not store card details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. What We Do NOT Collect</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>We do not store your essays or application answers on our servers in production mode</li>
              <li>We do not track your browsing behavior across other websites</li>
              <li>We do not use advertising cookies or third-party trackers</li>
              <li>We do not collect location data beyond what you enter in your profile</li>
              <li>We do not store payment card details (handled by Razorpay)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To provide the service (profile management, opportunity matching, context export)</li>
              <li>To authenticate your account</li>
              <li>To process payments (via Razorpay)</li>
              <li>To improve the product (aggregated, anonymized usage patterns only)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Storage</h2>
            <p>
              Your data is stored in a Supabase (PostgreSQL) database. Supabase infrastructure is hosted on AWS.
              We do not operate our own servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Data Sharing</h2>
            <p>We do not sell, rent, or share your personal data with third parties except:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Razorpay:</strong> for payment processing only</li>
              <li><strong>Supabase:</strong> for database hosting</li>
              <li><strong>OpenAI (optional):</strong> if you configure an API key, your opportunity text is sent for extraction — we do not send your profile data to AI services without your explicit action</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Your Rights</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You can export all your data at any time (Settings → Download all my data)</li>
              <li>You can delete your account and all associated data (Settings → Delete my account)</li>
              <li>You can request access to or correction of your data by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Data Retention</h2>
            <p>
              We retain your data only while your account is active. When you delete your account,
              all personal data is permanently removed. Payment records may be retained for legal/compliance
              purposes as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Security</h2>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS),
              database-level access controls (Row Level Security), and server-side authentication
              verification. However, no method of transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this policy. Significant changes will be communicated via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{" "}
              <a href="mailto:privacy@opportunityworkspace.com" className="text-blue-600 hover:underline">
                privacy@opportunityworkspace.com
              </a>.
              This email address is a placeholder — update it with your actual contact before launch.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
