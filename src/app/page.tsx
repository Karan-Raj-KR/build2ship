import { redirect } from "next/navigation";
import { APP_NAME } from "@/config/app";
import { createClient } from "@/lib/db/server";
import type { Metadata } from "next";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { TrustSection } from "@/components/landing/TrustSection";
import { LiveCatalogPreview } from "@/components/landing/LiveCatalogPreview";
import { ThreePillarsSection } from "@/components/landing/ThreePillarsSection";
import { JourneyStepsSection } from "@/components/landing/JourneyStepsSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${APP_NAME} — Find your next chapter.`,
  description:
    "Discover scholarships, research fellowships, and grants matched to your true background with honest eligibility scans and evidence-backed preparation.",
};

export default async function LandingPage() {
  let destination: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      destination = profile?.onboarding_completed ? "/discover" : "/onboarding";
    }
  } catch (err) {
    console.warn("Could not check session on landing page:", err);
  }

  if (destination) {
    redirect(destination);
  }

  return (
    <div className="landing-site min-h-screen flex flex-col bg-[var(--canvas)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--lime)] selection:text-[var(--rail)]">
      {/* 1. Header & Navigation */}
      <LandingHeader />

      {/* 2. Main Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <LandingHero />

        {/* Institutional Trust Logos */}
        <TrustSection />

        {/* Interactive Live Opportunity Catalog */}
        <LiveCatalogPreview />

        {/* The Three Architectural Pillars */}
        <ThreePillarsSection />

        {/* 3-Step Wayfinding Pathway */}
        <JourneyStepsSection />

        {/* High-Contrast Comparison Matrix */}
        <ComparisonSection />

        {/* Interactive FAQ */}
        <FAQSection />

        {/* Final Conversion Banner */}
        <FinalCtaSection />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
}
