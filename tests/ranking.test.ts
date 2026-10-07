// ============================================================
// TESTS — Opportunity ranking by profile relevance
// ============================================================
import { describe, it, expect } from "vitest";
import { rankOpportunities } from "@/lib/ranking";
import type { Opportunity, Profile } from "@/types/database";

function makeOpp(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "test-opp",
    created_by: null,
    title: "Test Opportunity",
    organizer: "Test Org",
    category: "hackathon",
    summary: "Test summary",
    source_url: null,
    location: "Remote",
    participation_mode: "remote",
    funding_description: "Stipend",
    funding_kind: "stipend",
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const testProfile: Profile = {
  id: "test",
  display_name: "Test User",
  country_of_residence: "GB",
  nationalities: ["GB"],
  university: "Test Uni",
  degree: "BSc CS",
  field_of_study: "Computer Science",
  education_stage: "undergraduate",
  expected_graduation: "2026-06-01",
  skills: ["python", "javascript", "react"],
  interests: ["AI", "web development"],
  opportunity_types: ["hackathon", "fellowship"],
  participation_preference: "remote",
  travel_constraints: null,
  max_budget_amount: null,
  max_budget_currency: null,
  age_band: null,
  is_admin: false,
  onboarding_completed: true,
  updated_at: new Date().toISOString(),
};

describe("rankOpportunities", () => {
  it("returns all opportunities when no profile", () => {
    const opps = [makeOpp({ id: "1" }), makeOpp({ id: "2" })];
    const ranked = rankOpportunities(opps, null);
    expect(ranked).toHaveLength(2);
    expect(ranked.every((r) => r.score === 0)).toBe(true);
  });

  it("boosts matching category", () => {
    const hackathon = makeOpp({ id: "hack", category: "hackathon" });
    const scholarship = makeOpp({ id: "scholar", category: "scholarship" });
    const ranked = rankOpportunities([scholarship, hackathon], testProfile);
    expect(ranked[0].opportunity.id).toBe("hack");
    expect(ranked[0].reasons.some((r) => r.label.includes("hackathon"))).toBe(true);
  });

  it("boosts matching participation mode", () => {
    const remote = makeOpp({ id: "remote", participation_mode: "remote" });
    const inPerson = makeOpp({ id: "inperson", participation_mode: "in-person" });
    const ranked = rankOpportunities([inPerson, remote], testProfile);
    expect(ranked[0].opportunity.id).toBe("remote");
  });

  it("filters out closed opportunities by default", () => {
    const open = makeOpp({ id: "open", source_status: "live" });
    const closed = makeOpp({ id: "closed", source_status: "closed" });
    const ranked = rankOpportunities([open, closed], testProfile);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].opportunity.id).toBe("open");
  });

  it("includes closed when includeClosed is true", () => {
    const open = makeOpp({ id: "open", source_status: "live" });
    const closed = makeOpp({ id: "closed", source_status: "closed" });
    const ranked = rankOpportunities([open, closed], testProfile, { includeClosed: true });
    expect(ranked).toHaveLength(2);
  });

  it("filters out expired deadlines", () => {
    const open = makeOpp({ id: "open", deadline: new Date(Date.now() + 30 * 86400000).toISOString() });
    const expired = makeOpp({ id: "expired", deadline: new Date(Date.now() - 5 * 86400000).toISOString() });
    const ranked = rankOpportunities([open, expired], testProfile);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].opportunity.id).toBe("open");
  });

  it("returns empty array when all filtered out", () => {
    const opps = [makeOpp({ source_status: "closed" })];
    const ranked = rankOpportunities(opps, testProfile);
    expect(ranked).toHaveLength(0);
  });
});
