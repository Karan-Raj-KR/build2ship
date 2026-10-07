import { describe, it, expect } from "vitest";
import { assessOpportunityQualityAndFreshness } from "@/opportunity-sources/ingestion/engine";
import { getForYouFeed } from "@/lib/recommendations/forYouEngine";
import type { Opportunity, Profile } from "@/types/database";

describe("Freshness, Expiration, and Recommendation Filtering", () => {
  it("marks opportunities with elapsed deadlines as closed", () => {
    const pastOpportunity: Opportunity = {
      id: "opp-past-1",
      title: "Past Hackathon 2025",
      category: "hackathon",
      deadline: "2025-01-01T00:00:00Z",
      source_status: "live",
      created_at: "2024-11-01T00:00:00Z",
      updated_at: "2024-11-01T00:00:00Z",
    } as unknown as Opportunity;

    const assessed = assessOpportunityQualityAndFreshness(pastOpportunity);
    expect(assessed.source_status).toBe("closed");
  });

  it("flags opportunities unverified for over 45 days as stale in quality queue", () => {
    const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
    const staleOpportunity: Opportunity = {
      id: "opp-stale-1",
      title: "Stale Fellowship Listing",
      category: "fellowship",
      deadline: "2027-12-31T00:00:00Z",
      source_status: "live",
      last_verified_at: fiftyDaysAgo,
      created_at: fiftyDaysAgo,
      updated_at: fiftyDaysAgo,
    } as unknown as Opportunity;

    const assessed = assessOpportunityQualityAndFreshness(staleOpportunity);
    expect(assessed.quality_flags?.stale).toBe(true);
  });

  it("keeps recently verified opportunities clean of staleness flags", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const freshOpportunity: Opportunity = {
      id: "opp-fresh-1",
      title: "Fresh Mitacs Research Listing",
      category: "research_programme",
      deadline: "2027-09-18T18:00:00Z",
      source_status: "live",
      last_verified_at: threeDaysAgo,
      created_at: threeDaysAgo,
      updated_at: threeDaysAgo,
    } as unknown as Opportunity;

    const assessed = assessOpportunityQualityAndFreshness(freshOpportunity);
    expect(assessed.quality_flags?.stale).toBe(false);
  });

  it("ensures closed, expired, and archived opportunities do not appear in active For You recommendations", async () => {
    const mockProfile: Profile = {
      id: "test-user-1",
      display_name: "Test Student",
      country_of_residence: "United States",
      education_stage: "undergraduate",
      interests: ["Open Source", "Software Engineering"],
      skills: ["TypeScript", "Python"],
      opportunity_types: ["internship", "fellowship"],
      time_availability: "full_time",
      effort_tolerance: "significant",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    } as unknown as Profile;

    const candidateOpps: Opportunity[] = [
      {
        id: "active-live-opp",
        title: "Active Live Fellowship",
        category: "fellowship",
        status: "published",
        publication_status: "published",
        source_status: "live",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Opportunity,
      {
        id: "expired-opp",
        title: "Expired Contest 2024",
        category: "competition",
        status: "published",
        publication_status: "published",
        source_status: "closed",
        deadline: "2024-01-01T00:00:00Z",
        created_at: "2023-10-01T00:00:00Z",
        updated_at: "2023-10-01T00:00:00Z",
      } as unknown as Opportunity,
      {
        id: "archived-opp",
        title: "Archived Hackathon",
        category: "hackathon",
        status: "archived",
        publication_status: "archived",
        source_status: "live",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Opportunity,
    ];

    const feed = getForYouFeed({ profile: mockProfile, opportunities: candidateOpps });

    const feedIds = feed.items.map((c) => c.opportunity.id);
    expect(feedIds).toContain("active-live-opp");
    expect(feedIds).not.toContain("expired-opp");
    expect(feedIds).not.toContain("archived-opp");
  });
});
