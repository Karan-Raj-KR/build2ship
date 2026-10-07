import { describe, it, expect } from "vitest";
import { buildForYouItem, getForYouFeed } from "@/lib/recommendations/forYouEngine";
import { Opportunity, Profile, ProfileEvidence, RecommendationFeedback } from "@/types/database";

describe("For You Engine & Feedback Foundation", () => {
  const sampleProfile: Partial<Profile> = {
    id: "user-for-you",
    education_stage: "undergraduate",
    field_of_study: "Computer Science",
    skills: ["Python", "Machine Learning", "Open Source"],
    interests: ["AI Safety", "Climate Tech"],
    country_of_residence: "India",
    nationalities: ["India"],
    paid_only_preference: true,
    willing_to_travel: true,
  };

  const sampleEvidence: ProfileEvidence[] = [
    {
      id: "ev-1",
      user_id: "user-for-you",
      kind: "project",
      title: "Climate AI Model",
      description: "Trained PyTorch model on weather datasets",
      tags: ["Python", "Machine Learning", "Climate Tech"],
      evidence_url: "https://github.com/test/climate-ai",
      confirmed: true,
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const sampleOpportunities: Opportunity[] = [
    {
      id: "opp-ml-fellowship",
      created_by: null,
      title: "Global ML Research Fellowship",
      organizer: "AI Institute",
      category: "fellowship",
      summary: "Paid research fellowship in machine learning and climate.",
      source_url: "https://example.com/ml",
      location: "Remote",
      participation_mode: "remote",
      funding_description: "$4,000 monthly stipend",
      funding_kind: "stipend",
      funding_amount_min: 4000,
      funding_currency: "USD",
      deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
      timezone_known: true,
      source_content: null,
      retrieved_at: null,
      source_status: "live",
      requirements: null,
      status: "published",
      is_demo: false,
      updated_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      skills: ["Python", "Machine Learning"],
      topics: ["AI Safety", "Climate Tech"],
      education_stages: ["undergraduate"],
      citizenship_constraints: ["any"],
    },
    {
      id: "opp-unpaid-hackathon",
      created_by: null,
      title: "Local Unfunded Buildathon",
      organizer: "Local Club",
      category: "hackathon",
      summary: "Weekend buildathon with no cash prize.",
      source_url: "https://example.com/build",
      location: "In-Person",
      participation_mode: "in-person",
      funding_description: "No prizes or stipend",
      funding_kind: "none",
      deadline: new Date(Date.now() + 50 * 86400000).toISOString(),
      timezone_known: true,
      source_content: null,
      retrieved_at: null,
      source_status: "live",
      requirements: null,
      status: "published",
      is_demo: false,
      updated_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      skills: ["Design"],
      topics: ["Art"],
    },
  ];

  it("builds a grounded ForYouItem with recommendation reasons, evidence strength, and funding", () => {
    const item = buildForYouItem(
      sampleOpportunities[0],
      sampleProfile,
      sampleEvidence,
      []
    );

    expect(item.opportunity.id).toBe("opp-ml-fellowship");
    expect(item.match_tier).toBe("exceptional");
    expect(item.fit_score).toBeGreaterThanOrEqual(80);
    expect(item.benefit_funding.is_paid).toBe(true);
    expect(item.benefit_funding.amount_label).toContain("USD 4,000");
    expect(item.evidence_strength.score).toBeGreaterThan(0);
    expect(item.evidence_strength.supporting_items).toContain("Climate AI Model");
    expect(item.recommendation_reasons.length).toBeGreaterThan(0);
  });

  it("incorporates user feedback: boosts interested items, penalizes not_interested, and hides hidden items", () => {
    const feedback: RecommendationFeedback[] = [
      {
        id: "fb-1",
        user_id: "user-for-you",
        opportunity_id: "opp-ml-fellowship",
        action: "interested",
        created_at: new Date().toISOString(),
      },
      {
        id: "fb-2",
        user_id: "user-for-you",
        opportunity_id: "opp-unpaid-hackathon",
        action: "hide",
        created_at: new Date().toISOString(),
      },
    ];

    const feed = getForYouFeed({
      opportunities: sampleOpportunities,
      profile: sampleProfile,
      evidence: sampleEvidence,
      feedback,
      limit: 10,
    });

    // opp-unpaid-hackathon should be hidden
    expect(feed.items.some((i) => i.opportunity.id === "opp-unpaid-hackathon")).toBe(false);

    // opp-ml-fellowship should be present and boosted
    const mlItem = feed.items.find((i) => i.opportunity.id === "opp-ml-fellowship");
    expect(mlItem).toBeTruthy();
    expect(mlItem?.feedback_state).toBe("interested");
  });

  it("handles cursor pagination correctly", () => {
    const manyOpps: Opportunity[] = Array.from({ length: 15 }).map((_, idx) => ({
      ...sampleOpportunities[0],
      id: `paginated-opp-${idx + 1}`,
      title: `Opportunity ${idx + 1}`,
    }));

    // Page 1: limit 5
    const page1 = getForYouFeed({
      opportunities: manyOpps,
      profile: sampleProfile,
      limit: 5,
    });

    expect(page1.items.length).toBe(5);
    expect(page1.nextCursor).toBeTruthy();

    // Page 2 using cursor
    const page2 = getForYouFeed({
      opportunities: manyOpps,
      profile: sampleProfile,
      cursor: page1.nextCursor,
      limit: 5,
    });

    expect(page2.items.length).toBe(5);
    // Page 2 items should not overlap with Page 1
    const p1Ids = new Set(page1.items.map((i) => i.opportunity.id));
    for (const item of page2.items) {
      expect(p1Ids.has(item.opportunity.id)).toBe(false);
    }
  });

  it("enforces full feed contract and distinguishes eligibility status and exploration types", () => {
    const oppWithGaps: Opportunity = {
      ...sampleOpportunities[0],
      id: "opp-with-gaps",
      title: "Quantum Research Fellowship",
      citizenship_constraints: ["US", "India"],
      education_stages: ["masters"], // Conflict with undergrad profile
    };

    const oppAdjacent: Opportunity = {
      ...sampleOpportunities[0],
      id: "opp-adjacent",
      title: "Clean Ocean Marine Hackathon",
      topics: ["Marine Biology", "Ecology"], // Not in user interests (AI Safety, Climate Tech)
      skills: ["Python"],
    };

    const feed = getForYouFeed({
      opportunities: [sampleOpportunities[0], oppWithGaps, oppAdjacent],
      profile: sampleProfile,
      applications: [{ opportunity_id: sampleOpportunities[0].id, stage: "saved" }],
      limit: 10,
    });

    // oppWithGaps should be excluded from feed because master's requirement makes undergrad ineligible
    expect(feed.items.some((i) => i.opportunity_id === "opp-with-gaps")).toBe(false);

    // Primary match
    const primaryItem = feed.items.find((i) => i.opportunity_id === sampleOpportunities[0].id);
    expect(primaryItem).toBeTruthy();
    expect(primaryItem?.saved_state).toBe(true);
    expect(primaryItem?.application_state).toBe("saved");
    expect(primaryItem?.eligibility_status).toBe("requirements_met");
    expect(primaryItem?.exploration_type).toBe("strong_match");
    expect(Array.isArray(primaryItem?.benefits)).toBe(true);

    // Adjacent item
    const adjacentItem = feed.items.find((i) => i.opportunity_id === "opp-adjacent");
    expect(adjacentItem).toBeTruthy();
    expect(adjacentItem?.exploration_type).toBe("adjacent_interest");
    expect(adjacentItem?.eligibility_status).toBe("outside_interests");
  });
});

