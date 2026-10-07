import { describe, it, expect } from "vitest";
import { buildForYouItem, getForYouFeed } from "@/lib/recommendations/forYouEngine";
import { Opportunity, Profile, ProfileEvidence } from "@/types/database";

describe("For You Feed UX & Exploration Engine", () => {
  const baseProfile: Partial<Profile> = {
    id: "test-feed-user",
    education_stage: "undergraduate",
    field_of_study: "Computer Science",
    skills: ["Python", "TypeScript"],
    interests: ["Open Source", "Developer Tools"],
    country_of_residence: "India",
    nationalities: ["India"],
    paid_only_preference: false,
    willing_to_travel: true,
  };

  const sampleEvidence: ProfileEvidence[] = [
    {
      id: "ev-gh",
      user_id: "test-feed-user",
      kind: "project",
      title: "Open Source CLI",
      description: "Built TypeScript developer tool with 500 stars",
      tags: ["TypeScript", "Open Source"],
      evidence_url: "https://github.com/test/tool",
      confirmed: true,
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const strongOpportunity: Opportunity = {
    id: "opp-gsoc",
    created_by: null,
    title: "Google Summer of Code 2027",
    organizer: "Google Open Source",
    category: "fellowship",
    summary: "Global open source stipend program for student and new open source developers.",
    source_url: "https://summerofcode.withgoogle.com",
    location: "Global Remote",
    participation_mode: "remote",
    funding_description: "$1,500 - $6,000 stipend (PPP adjusted)",
    funding_kind: "stipend",
    funding_amount_min: 1500,
    funding_amount_max: 6000,
    funding_currency: "USD",
    deadline: new Date(Date.now() + 45 * 86400000).toISOString(),
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    skills: ["Python", "TypeScript", "Open Source"],
    topics: ["Open Source"],
    education_stages: ["undergraduate", "masters", "phd"],
    citizenship_constraints: ["any"],
  };

  const missingInfoOpportunity: Opportunity = {
    id: "opp-fellowship-verification",
    created_by: null,
    title: "Global Civic Tech Fellowship",
    organizer: "Civic Open Institute",
    category: "fellowship",
    summary: "Fellowship requiring specific regional citizenship verification.",
    source_url: "https://example.com/civic",
    location: "Remote",
    participation_mode: "remote",
    funding_description: "$5,000 stipend",
    funding_kind: "stipend",
    funding_amount_min: 5000,
    funding_currency: "USD",
    deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    skills: ["Python"],
    topics: ["Civic Tech", "Open Source"],
    education_stages: ["undergraduate"],
    citizenship_constraints: ["India", "United States"],
  };

  const adjacentOpportunity: Opportunity = {
    id: "opp-design-jam",
    created_by: null,
    title: "Global UX & Product Design Jam",
    organizer: "Design Guild",
    category: "hackathon",
    summary: "Open to all disciplines: collaborate on civic technology interfaces.",
    source_url: "https://example.com/design-jam",
    location: "Remote",
    participation_mode: "remote",
    funding_description: "$2,500 prize pool",
    funding_kind: "prize",
    funding_amount_min: 2500,
    funding_currency: "USD",
    deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    skills: ["Figma", "UI Design"],
    topics: ["Civic Tech", "Design"],
    education_stages: ["undergraduate", "masters", "other"],
    citizenship_constraints: ["any"],
  };

  it("classifies strong matches with transparent why-matched explanations", () => {
    const item = buildForYouItem(strongOpportunity, baseProfile, sampleEvidence, []);
    expect(item.opportunity_id).toBe("opp-gsoc");
    expect(item.exploration_type).toBe("strong_match");
    expect(item.eligibility_summary.verdict).toBe("likely_eligible");
    expect(item.relevance_explanation).toMatch(/Open Source|Python|TypeScript/i);
    expect(item.specific_gaps.length).toBe(0);
  });

  it("identifies attainable gaps when evidence or profile facts require verification", () => {
    // Profile missing nationalities
    const unverifiedProfile: Partial<Profile> = {
      ...baseProfile,
      nationalities: [],
    };
    const item = buildForYouItem(missingInfoOpportunity, unverifiedProfile, sampleEvidence, []);
    expect(item.opportunity_id).toBe("opp-fellowship-verification");
    expect(item.exploration_type).toBe("attainable_gap");
    expect(item.eligibility_status).toBe("missing_information");
    expect(item.eligibility_summary.verdict).toBe("possibly_eligible");
    expect(item.specific_gaps.length).toBeGreaterThan(0);
  });

  it("updates eligibility deterministically when profile is updated with verified qualification", () => {
    const unverifiedProfile: Partial<Profile> = {
      ...baseProfile,
      nationalities: [],
    };
    const beforeItem = buildForYouItem(missingInfoOpportunity, unverifiedProfile, sampleEvidence, []);
    expect(beforeItem.eligibility_summary.verdict).toBe("possibly_eligible");

    // User updates nationality fact
    const updatedProfile: Partial<Profile> = {
      ...unverifiedProfile,
      nationalities: ["India"],
    };
    const afterItem = buildForYouItem(missingInfoOpportunity, updatedProfile, sampleEvidence, []);
    expect(afterItem.eligibility_summary.verdict).toBe("likely_eligible");
    expect(afterItem.eligibility_status).toBe("requirements_met");
  });

  it("delivers continuous paginated catalogue feed without duplicate IDs", () => {
    const catalogue = [strongOpportunity, missingInfoOpportunity, adjacentOpportunity];
    const page1 = getForYouFeed({
      profile: baseProfile,
      evidence: sampleEvidence,
      feedback: [],
      opportunities: catalogue,
      cursor: null,
      limit: 2,
    });

    expect(page1.items.length).toBe(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = getForYouFeed({
      profile: baseProfile,
      evidence: sampleEvidence,
      feedback: [],
      opportunities: catalogue,
      cursor: page1.nextCursor,
      limit: 2,
    });

    expect(page2.items.length).toBe(1);
    expect(page2.nextCursor).toBeNull(); // Exhausted catalog

    // Ensure zero overlap
    const page1Ids = page1.items.map((i) => i.opportunity_id);
    const page2Ids = page2.items.map((i) => i.opportunity_id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });
});
