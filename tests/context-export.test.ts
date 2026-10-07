// ============================================================
// TESTS — Context export with opportunity requirements
// ============================================================
import { describe, it, expect } from "vitest";
import {
  generateContextMarkdown,
  generateContextJson,
  generateOpportunityContext,
} from "@/lib/contextExport";
import type { Profile, ProfileEvidence, Opportunity } from "@/types/database";

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
  skills: ["python", "javascript"],
  interests: ["AI"],
  opportunity_types: ["hackathon"],
  participation_preference: "remote",
  travel_constraints: null,
  max_budget_amount: null,
  max_budget_currency: null,
  age_band: null,
  is_admin: false,
  onboarding_completed: true,
  updated_at: new Date().toISOString(),
};

const testEvidence: ProfileEvidence[] = [
  {
    id: "ev1",
    user_id: "test",
    kind: "project",
    title: "ClimateViz",
    description: "Climate data tool",
    start_date: "2024-01-01",
    end_date: null,
    tags: ["Python", "React"],
    evidence_url: "https://github.com/test/climateviz",
    confirmed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const testOpp: Opportunity = {
  id: "opp1",
  created_by: null,
  title: "HackMIT 2026",
  organizer: "MIT",
  category: "hackathon",
  summary: "Premier student hackathon",
  source_url: "https://hackmit.org",
  location: "Cambridge, MA",
  participation_mode: "hybrid",
  funding_description: "Travel reimbursement available",
  funding_kind: "reimbursement",
  deadline: "2026-09-14T23:59:59Z",
  timezone_known: true,
  source_content: null,
  retrieved_at: null,
  source_status: "live",
  requirements: {
    items: [
      { text: "Must be a student", type: "education_stage", mandatory: "mandatory", excerpt: "Open to all students", source_ref: "eligibility", comparison_rule: null, uncertainty: null },
      { text: "Must be 18+", type: "age", mandatory: "mandatory", excerpt: "18 or older", source_ref: "eligibility", comparison_rule: null, uncertainty: null },
    ],
    application_questions: ["What's the coolest project you've built?"],
    required_documents: [],
    application_steps: ["Register", "Form team", "Hack for 24h"],
  },
  status: "published",
  is_demo: false,
  updated_at: new Date().toISOString(),
};

describe("generateContextMarkdown", () => {
  it("includes all selected sections", () => {
    const md = generateContextMarkdown(testProfile, testEvidence, {
      background: true, education: true, skills: true, evidence: true, preferences: true,
    });
    expect(md).toContain("Test User");
    expect(md).toContain("Test Uni");
    expect(md).toContain("python");
    expect(md).toContain("ClimateViz");
    expect(md).toContain("hackathon");
  });

  it("excludes deselected sections", () => {
    const md = generateContextMarkdown(testProfile, testEvidence, {
      background: false, education: false, skills: false, evidence: false, preferences: false,
    });
    expect(md).not.toContain("Test User");
    expect(md).not.toContain("python");
  });
});

describe("generateContextJson", () => {
  it("produces valid JSON with meta", () => {
    const json = generateContextJson(testProfile, testEvidence, {
      background: true, education: true, skills: true, evidence: true, preferences: true,
    });
    const parsed = JSON.parse(json);
    expect(parsed._meta).toBeDefined();
    expect(parsed._meta.generated_by).toContain("Opportunity Workspace");
    expect(parsed.background.display_name).toBe("Test User");
  });

  it("excludes deselected sections", () => {
    const json = generateContextJson(testProfile, testEvidence, {
      background: false, education: false, skills: false, evidence: false, preferences: false,
    });
    const parsed = JSON.parse(json);
    expect(parsed.background).toBeUndefined();
    expect(parsed.education).toBeUndefined();
  });
});

describe("generateOpportunityContext", () => {
  it("includes opportunity details in markdown", () => {
    const md = generateOpportunityContext(testOpp, testProfile, [], [], null, {
      includeOpportunityDetails: true, includeRequirements: false, includeProfile: false,
      includeEvidence: false, includeAnswers: false, includeEligibility: false, format: "markdown",
    });
    expect(md).toContain("HackMIT 2026");
    expect(md).toContain("MIT");
    expect(md).toContain("hybrid");
  });

  it("includes requirements and questions in markdown", () => {
    const md = generateOpportunityContext(testOpp, testProfile, [], [], null, {
      includeOpportunityDetails: false, includeRequirements: true, includeProfile: false,
      includeEvidence: false, includeAnswers: false, includeEligibility: false, format: "markdown",
    });
    expect(md).toContain("Requirements");
    expect(md).toContain("Must be a student");
    expect(md).toContain("Application Questions");
    expect(md).toContain("coolest project");
  });

  it("includes requirements in JSON", () => {
    const json = generateOpportunityContext(testOpp, testProfile, [], [], null, {
      includeOpportunityDetails: false, includeRequirements: true, includeProfile: false,
      includeEvidence: false, includeAnswers: false, includeEligibility: false, format: "json",
    });
    const parsed = JSON.parse(json);
    expect(parsed.requirements).toBeDefined();
    expect(parsed.requirements.items).toHaveLength(2);
    expect(parsed.requirements.application_questions).toHaveLength(1);
  });

  it("includes eligibility report", () => {
    const report = { overall_verdict: "likely_eligible", readiness_score: 85, blockers: [], gaps: [] };
    const md = generateOpportunityContext(testOpp, testProfile, [], [], report, {
      includeOpportunityDetails: false, includeRequirements: false, includeProfile: false,
      includeEvidence: false, includeAnswers: false, includeEligibility: true, format: "markdown",
    });
    expect(md).toContain("likely_eligible");
    expect(md).toContain("85%");
  });
});
