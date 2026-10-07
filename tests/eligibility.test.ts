// ============================================================
// TESTS — Eligibility rule evaluation engine
// ============================================================
import { describe, it, expect } from "vitest";
import {
  evaluateRequirementDeterministic,
  computeOverallReport,
} from "@/lib/eligibility/engine";
import type { ExtractedRequirement } from "@/lib/ingestion/types";
import type { UserProfile } from "@/lib/eligibility/engine";

const baseProfile: UserProfile = {
  display_name: "Test User",
  nationality: "GB",
  residence: "GB",
  education_level: "undergraduate",
  field_of_study: "Computer Science",
  expected_graduation: "2026-06-30",
  skills: ["python", "javascript", "react", "machine learning"],
  interests: ["AI", "web development"],
  has_cv: true,
  has_transcript: true,
  has_reference_letters: false,
  bio: null,
};

function makeRequirement(overrides: Partial<ExtractedRequirement>): ExtractedRequirement {
  return {
    text: "Test requirement",
    type: "other",
    mandatory: "mandatory",
    excerpt: "test excerpt",
    source_ref: "test",
    comparison_rule: null,
    uncertainty: null,
    ...overrides,
  };
}

describe("evaluateRequirementDeterministic", () => {
  describe("nationality", () => {
    it("returns 'met' when nationality is in allowed list", () => {
      const req = makeRequirement({
        type: "nationality",
        comparison_rule: { field: "nationality", operator: "in_list", value: ["GB", "US", "CA"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when nationality is not in allowed list", () => {
      const req = makeRequirement({
        type: "nationality",
        comparison_rule: { field: "nationality", operator: "in_list", value: ["US", "CA"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });

    it("returns 'unknown' when profile has no nationality", () => {
      const req = makeRequirement({
        type: "nationality",
        comparison_rule: { field: "nationality", operator: "in_list", value: ["GB"] },
      });
      const result = evaluateRequirementDeterministic(req, { ...baseProfile, nationality: null });
      expect(result.verdict).toBe("unknown");
    });
  });

  describe("residence", () => {
    it("returns 'met' when residence matches", () => {
      const req = makeRequirement({
        type: "residence",
        comparison_rule: { field: "residence", operator: "in_list", value: ["GB", "UK"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when residence doesn't match", () => {
      const req = makeRequirement({
        type: "residence",
        comparison_rule: { field: "residence", operator: "in_list", value: ["US"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });
  });

  describe("education_stage", () => {
    it("returns 'met' when education level matches", () => {
      const req = makeRequirement({
        type: "education_stage",
        comparison_rule: { field: "education_stage", operator: "in_list", value: ["undergraduate", "masters"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when education level doesn't match", () => {
      const req = makeRequirement({
        type: "education_stage",
        comparison_rule: { field: "education_stage", operator: "in_list", value: ["phd"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });
  });

  describe("field_of_study", () => {
    it("returns 'met' when field matches (includes)", () => {
      const req = makeRequirement({
        type: "field_of_study",
        comparison_rule: { field: "field_of_study", operator: "includes", value: "computer" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when field doesn't match", () => {
      const req = makeRequirement({
        type: "field_of_study",
        comparison_rule: { field: "field_of_study", operator: "includes", value: "biology" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });
  });

  describe("graduation_window", () => {
    it("returns 'met' when within graduation window", () => {
      const req = makeRequirement({
        type: "graduation_window",
        comparison_rule: { field: "months_until_graduation", operator: "lte", value: 24, unit: "months" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });
  });

  describe("skill", () => {
    it("returns 'met' when user has required skill", () => {
      const req = makeRequirement({
        type: "skill",
        comparison_rule: { field: "skill", operator: "includes", value: "python" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when user lacks required skill", () => {
      const req = makeRequirement({
        type: "skill",
        comparison_rule: { field: "skill", operator: "includes", value: "rust" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });

    it("returns 'met' when user has all required skills (in_list)", () => {
      const req = makeRequirement({
        type: "skill",
        comparison_rule: { field: "skill", operator: "in_list", value: ["python", "javascript"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when user is missing some required skills", () => {
      const req = makeRequirement({
        type: "skill",
        comparison_rule: { field: "skill", operator: "in_list", value: ["python", "rust", "go"] },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });
  });

  describe("document", () => {
    it("returns 'met' when user has required document", () => {
      const req = makeRequirement({
        type: "document",
        comparison_rule: { field: "document", operator: "equals", value: "CV/Resume" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("met");
    });

    it("returns 'unmet' when user lacks required document", () => {
      const req = makeRequirement({
        type: "document",
        comparison_rule: { field: "document", operator: "equals", value: "reference letter" },
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unmet");
    });
  });

  describe("no comparison rule", () => {
    it("returns 'unknown' when no rule is provided", () => {
      const req = makeRequirement({
        type: "other",
        comparison_rule: null,
      });
      const result = evaluateRequirementDeterministic(req, baseProfile);
      expect(result.verdict).toBe("unknown");
    });
  });
});

describe("computeOverallReport", () => {
  it("returns likely_eligible when all mandatory requirements are met", () => {
    const items = [
      { requirement_text: "req1", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "req2", requirement_type: "education", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = [
      makeRequirement({ text: "req1", type: "skill", mandatory: "mandatory" }),
      makeRequirement({ text: "req2", type: "education_stage", mandatory: "mandatory" }),
    ];
    const report = computeOverallReport(items, reqs, baseProfile, ["CV/Resume"]);
    expect(report.overall_verdict).toBe("likely_eligible");
    expect(report.blockers).toHaveLength(0);
    expect(report.readiness_score).toBe(100);
  });

  it("returns likely_ineligible when mandatory requirement is unmet", () => {
    const items = [
      { requirement_text: "req1", requirement_type: "nationality", mandatory: "mandatory", verdict: "unmet" as const, explanation: "Wrong nationality", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "req2", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = [
      makeRequirement({ text: "req1", type: "nationality", mandatory: "mandatory" }),
      makeRequirement({ text: "req2", type: "skill", mandatory: "mandatory" }),
    ];
    const report = computeOverallReport(items, reqs, baseProfile, []);
    expect(report.overall_verdict).toBe("likely_ineligible");
    expect(report.blockers).toContain("req1");
  });

  it("keeps mandatory eligibility when only preferred requirements are unmet", () => {
    const items = [
      { requirement_text: "req1", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "req2", requirement_type: "skill", mandatory: "preferred", verdict: "unmet" as const, explanation: "Nice to have", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = [
      makeRequirement({ text: "req1", type: "skill", mandatory: "mandatory" }),
      makeRequirement({ text: "req2", type: "skill", mandatory: "preferred" }),
    ];
    const report = computeOverallReport(items, reqs, baseProfile, []);
    expect(report.overall_verdict).toBe("likely_eligible");
    expect(report.gaps).toContain("req2");
    expect(report.blockers).toHaveLength(0);
  });

  it("computes readiness score correctly", () => {
    const items = [
      { requirement_text: "req1", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "req2", requirement_type: "education", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "req3", requirement_type: "nationality", mandatory: "mandatory", verdict: "unmet" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = items.map((i) => makeRequirement({ text: i.requirement_text, type: i.requirement_type as ExtractedRequirement["type"] }));
    const report = computeOverallReport(items, reqs, baseProfile, []);
    expect(report.readiness_score).toBe(67);
  });
});
