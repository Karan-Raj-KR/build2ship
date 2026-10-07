import Link from "next/link";
import { APP_NAME } from "@/config/app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Refund Policy — ${APP_NAME}`,
  description: `Refund policy for ${APP_NAME} access passes.`,
};

export default function RefundPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Refund Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <div className="alert alert-warning">
            <strong>Notice:</strong> This refund policy is a draft. It has not been reviewed by legal counsel.
            Do not advertise or enforce refund commitments until this policy has been reviewed and finalized.
          </div>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Access Pass Refunds</h2>
            <p>
              Access passes for {APP_NAME} are digital goods. Due to the nature of the service,
              refunds are handled as follows:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Within 24 hours of purchase:</strong> Full refund if you have not used any AI features under the pass</li>
              <li><strong>After 24 hours:</strong> No refund. Your access continues until the pass expires</li>
              <li><strong>If the service is down:</strong> Pro-rated extension of your access pass for any verified downtime exceeding 24 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How to Request a Refund</h2>
            <p>
              Email{" "}
              <a href="mailto:refunds@opportunityworkspace.com" className="text-blue-600 hover:underline">
                refunds@opportunityworkspace.com
              </a>{" "}
              with your account email and payment ID. This email address is a placeholder — update it before launch.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Processing</h2>
            <p>
              Refunds are processed through Razorpay within 5-7 business days. The refund will be
              credited to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. What Happens After a Refund</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your access pass is deactivated immediately</li>
              <li>Your profile, evidence, and application data are preserved (you can still use free features)</li>
              <li>Any AI-generated content you have already saved remains yours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Free Tier</h2>
            <p>
              The free tier is always available. No payment is required to use core features
              (profile, browsing, tracking, export).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
