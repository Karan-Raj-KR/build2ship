// ============================================================
// TESTS — Enhanced eligibility engine features
// ============================================================
import { describe, it, expect } from "vitest";
import {
  evaluateRequirementDeterministic,
  computeOverallReport,
  evaluateRequirementGroup,
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
    excerpt: "test excerpt from source",
    source_ref: "test",
    comparison_rule: null,
    uncertainty: null,
    ...overrides,
  };
}

describe("evaluateRequirementDeterministic — source excerpts", () => {
  it("preserves source excerpt in result", () => {
    const req = makeRequirement({
      type: "nationality",
      excerpt: "Open to citizens of GB, US, and CA",
      comparison_rule: { field: "nationality", operator: "in_list", value: ["GB", "US", "CA"] },
    });
    const result = evaluateRequirementDeterministic(req, baseProfile);
    expect(result.evidence).toContain("Accepted");
  });

  it("returns empty evidence when no excerpt", () => {
    const req = makeRequirement({
      type: "other",
      comparison_rule: null,
    });
    const result = evaluateRequirementDeterministic(req, baseProfile);
    expect(result.verdict).toBe("unknown");
  });
});

describe("evaluateRequirementGroup — AND/OR logic", () => {
  const skillReq = makeRequirement({
    text: "Must know Python",
    type: "skill",
    mandatory: "mandatory",
    comparison_rule: { field: "skill", operator: "includes", value: "python" },
  });

  const langReq = makeRequirement({
    text: "Must know Rust",
    type: "skill",
    mandatory: "mandatory",
    comparison_rule: { field: "skill", operator: "includes", value: "rust" },
  });

  const goReq = makeRequirement({
    text: "Must know Go",
    type: "skill",
    mandatory: "mandatory",
    comparison_rule: { field: "skill", operator: "includes", value: "go" },
  });

  it("AND: all met returns met", () => {
    const result = evaluateRequirementGroup(
      { logic: "and", requirements: [skillReq] },
      baseProfile
    );
    expect(result.verdict).toBe("met");
    expect(result.metCount).toBe(1);
    expect(result.totalCount).toBe(1);
  });

  it("AND: one unmet returns unmet", () => {
    const result = evaluateRequirementGroup(
      { logic: "and", requirements: [skillReq, langReq] },
      baseProfile
    );
    expect(result.verdict).toBe("unmet");
    expect(result.metCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it("OR: one met returns met", () => {
    const result = evaluateRequirementGroup(
      { logic: "or", requirements: [skillReq, langReq] },
      baseProfile
    );
    expect(result.verdict).toBe("met");
    expect(result.metCount).toBe(1);
  });

  it("OR: none met returns unmet", () => {
    const result = evaluateRequirementGroup(
      { logic: "or", requirements: [langReq, goReq] },
      baseProfile
    );
    expect(result.verdict).toBe("unmet");
    expect(result.metCount).toBe(0);
  });

  it("AND: unknown when profile missing info", () => {
    const ageReq = makeRequirement({
      text: "Must be 18+",
      type: "age",
      comparison_rule: { field: "age", operator: "gte", value: 18 },
    });
    const result = evaluateRequirementGroup(
      { logic: "and", requirements: [skillReq, ageReq] },
      baseProfile
    );
    expect(result.verdict).toBe("unknown");
  });
});

describe("computeOverallReport — readiness score edge cases", () => {
  it("returns 0 readiness for empty items", () => {
    const report = computeOverallReport([], [], baseProfile, []);
    expect(report.readiness_score).toBe(0);
    expect(report.overall_verdict).toBe("unknown");
  });

  it("counts partially_met as half-met for readiness", () => {
    const items = [
      { requirement_text: "r1", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "r2", requirement_type: "skill", mandatory: "mandatory", verdict: "partially_met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = [
      makeRequirement({ text: "r1", type: "skill" }),
      makeRequirement({ text: "r2", type: "skill" }),
    ];
    const report = computeOverallReport(items, reqs, baseProfile, []);
    expect(report.readiness_score).toBe(50);
  });

  it("includes unknowns in confidence calculation", () => {
    const items = [
      { requirement_text: "r1", requirement_type: "skill", mandatory: "mandatory", verdict: "met" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
      { requirement_text: "r2", requirement_type: "age", mandatory: "mandatory", verdict: "unknown" as const, explanation: "", evidence: "", source_excerpt: "", follow_up_question: null },
    ];
    const reqs = [
      makeRequirement({ text: "r1", type: "skill" }),
      makeRequirement({ text: "r2", type: "age" }),
    ];
    const report = computeOverallReport(items, reqs, baseProfile, []);
    expect(report.confidence).toBe(0.5);
  });
});
