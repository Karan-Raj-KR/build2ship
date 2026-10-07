// ============================================================
// ELIGIBILITY ENGINE — deterministic rule evaluation + model assist
// ============================================================
import { chatCompletion, isAIConfigured } from "../ai/client";
import { ELIGIBILITY_SYSTEM_PROMPT, buildEligibilityUserPrompt } from "../ai/prompts";
import type { ExtractedRequirement } from "../ingestion/types";

// --- Types ---

export type Verdict = "met" | "unmet" | "partially_met" | "unknown";

export interface ReportItem {
  requirement_text: string;
  requirement_type: string;
  mandatory: string;
  verdict: Verdict;
  explanation: string;
  evidence: string;
  source_excerpt: string;
  follow_up_question: string | null;
}

export interface EligibilityReport {
  overall_verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
  confidence: number;
  blockers: string[];
  gaps: string[];
  ready_documents: string[];
  missing_documents: string[];
  readiness_score: number;
  report_items: ReportItem[];
  computed_at: string;
  source_snapshot: string;
}

// --- Profile type for eligibility checks ---

export interface UserProfile {
  display_name: string | null;
  nationality: string | null;
  residence: string | null;
  education_level: string | null;
  field_of_study: string | null;
  expected_graduation: string | null;
  skills: string[];
  interests: string[];
  has_cv: boolean | null;
  has_transcript: boolean | null;
  has_reference_letters: boolean | null;
  nationalities?: string[];
  bio: string | null;
}

// --- Deterministic rule evaluation ---

export function evaluateRequirementDeterministic(
  req: ExtractedRequirement,
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  const rule = req.comparison_rule;

  if (!rule) {
    // Cannot evaluate without a rule — check if profile has relevant field
    return {
      verdict: "unknown",
      explanation: `Cannot automatically verify: ${req.text}`,
      evidence: "No comparison rule available.",
    };
  }

  switch (req.type) {
    case "nationality":
      return evaluateNationality(rule, profile);
    case "residence":
      return evaluateResidence(rule, profile);
    case "education_stage":
      return evaluateEducationStage(rule, profile);
    case "field_of_study":
      return evaluateFieldOfStudy(rule, profile);
    case "graduation_window":
      return evaluateGraduationWindow(rule, profile);
    case "age":
      return evaluateAge(rule, profile);
    case "skill":
      return evaluateSkill(rule, profile);
    case "team_size":
      return evaluateTeamSize(rule, profile);
    case "document":
      return evaluateDocument(rule, profile);
    default:
      return {
        verdict: "unknown",
        explanation: `Cannot automatically verify: ${req.text}`,
        evidence: "No automatic check available for this requirement type.",
      };
  }
}

function evaluateNationality(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || !profile.nationality) {
    return { verdict: "unknown", explanation: "Nationality not specified in profile.", evidence: "" };
  }
  const { operator, value } = rule;
  const nationalities = (profile.nationalities?.length ? profile.nationalities : [profile.nationality]).map(n => String(n).toLowerCase());
  const nat = nationalities[0];

  if (operator === "in_list" && Array.isArray(value)) {
    const allowed = value.map((v: string) => String(v).toLowerCase());
    const met = nationalities.some(n => allowed.includes(n));
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `Your nationality (${profile.nationality}) is accepted.`
        : `Your nationality (${profile.nationality}) is not in the accepted list.`,
      evidence: `Accepted: ${allowed.join(", ")}`,
    };
  }
  if (operator === "equals") {
    const met = nationalities.includes(String(value).toLowerCase());
    return {
      verdict: met ? "met" : "unmet",
      explanation: met ? "Nationality matches." : `Required: ${value}. You have: ${profile.nationality}.`,
      evidence: "",
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate nationality rule.", evidence: "" };
}

function evaluateResidence(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || !profile.residence) {
    return { verdict: "unknown", explanation: "Residence not specified in profile.", evidence: "" };
  }
  const { operator, value } = rule;
  const res = profile.residence.toLowerCase();

  if (operator === "in_list" && Array.isArray(value)) {
    const allowed = value.map((v: string) => String(v).toLowerCase());
    const met = allowed.includes(res);
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `Your residence (${profile.residence}) is accepted.`
        : `Your residence (${profile.residence}) is not in the accepted list.`,
      evidence: `Accepted: ${allowed.join(", ")}`,
    };
  }
  if (operator === "includes") {
    const met = res.includes(String(value).toLowerCase());
    return {
      verdict: met ? "met" : "unmet",
      explanation: met ? "Residence matches." : `Required region: ${value}.`,
      evidence: "",
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate residence rule.", evidence: "" };
}

function evaluateEducationStage(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || !profile.education_level) {
    return { verdict: "unknown", explanation: "Education level not specified in profile.", evidence: "" };
  }
  const { operator, value } = rule;
  const edu = profile.education_level.toLowerCase();

  if (operator === "in_list" && Array.isArray(value)) {
    const allowed = value.map((v: string) => String(v).toLowerCase());
    const met = allowed.includes(edu);
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `Your education level (${profile.education_level}) matches.`
        : `Your education level (${profile.education_level}) is not in the accepted list.`,
      evidence: `Accepted: ${allowed.join(", ")}`,
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate education rule.", evidence: "" };
}

function evaluateFieldOfStudy(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || !profile.field_of_study) {
    return { verdict: "unknown", explanation: "Field of study not specified in profile.", evidence: "" };
  }
  const { operator, value } = rule;
  const field = profile.field_of_study.toLowerCase();

  if (operator === "includes" && typeof value === "string") {
    const met = field.includes(value.toLowerCase());
    return {
      verdict: met ? "met" : "unmet",
      explanation: met ? "Field of study matches." : `Required field: ${value}. Your field: ${profile.field_of_study}.`,
      evidence: "",
    };
  }
  if (operator === "in_list" && Array.isArray(value)) {
    const allowed = value.map((v: string) => String(v).toLowerCase());
    const met = allowed.some((v) => field.includes(v));
    return {
      verdict: met ? "met" : "unmet",
      explanation: met ? "Field of study matches." : `Your field (${profile.field_of_study}) is not in the accepted list.`,
      evidence: `Accepted: ${allowed.join(", ")}`,
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate field of study rule.", evidence: "" };
}

function evaluateGraduationWindow(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || !profile.expected_graduation) {
    return { verdict: "unknown", explanation: "Expected graduation not specified in profile.", evidence: "" };
  }
  const { operator, value, unit } = rule;
  const gradDate = new Date(profile.expected_graduation);
  if (isNaN(gradDate.getTime())) {
    return { verdict: "unknown", explanation: "Could not parse graduation date.", evidence: "" };
  }

  const now = new Date();
  const monthsUntilGrad = (gradDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (operator === "lte" && typeof value === "number") {
    const threshold = unit === "months" ? value : value * 12;
    const met = monthsUntilGrad <= threshold;
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `You graduate within ${value} ${unit ?? "months"}.`
        : `You graduate in ${Math.round(monthsUntilGrad)} months, which exceeds the ${value} ${unit ?? "months"} limit.`,
      evidence: `Expected: ${profile.expected_graduation}`,
    };
  }
  if (operator === "gte" && typeof value === "number") {
    const threshold = unit === "months" ? value : value * 12;
    const met = monthsUntilGrad >= threshold;
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `You are at least ${value} ${unit ?? "months"} from graduation.`
        : `You are only ${Math.round(monthsUntilGrad)} months from graduation.`,
      evidence: `Expected: ${profile.expected_graduation}`,
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate graduation rule.", evidence: "" };
}

function evaluateAge(
  _rule: ExtractedRequirement["comparison_rule"],
  _profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  // Age is hard to determine from profile alone — only evaluable if we have birth date
  return {
    verdict: "unknown",
    explanation: "Age verification requires birth date in profile.",
    evidence: "Profile does not contain date of birth.",
  };
}

function evaluateSkill(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule || profile.skills.length === 0) {
    return { verdict: "unknown", explanation: "No skills listed in profile.", evidence: "" };
  }
  const { value } = rule;
  const userSkills = profile.skills.map((s) => s.toLowerCase());

  if (operatorIncludes(rule.operator)) {
    const required = String(value).toLowerCase();
    const met = userSkills.some((s) => s.includes(required));
    return {
      verdict: met ? "met" : "unmet",
      explanation: met ? `You have the required skill: ${value}.` : `Missing skill: ${value}.`,
      evidence: `Your skills: ${profile.skills.join(", ")}`,
    };
  }
  if (rule.operator === "in_list" && Array.isArray(value)) {
    const required = value.map((v: string) => String(v).toLowerCase());
    const matches = required.filter((r) => userSkills.some((s) => s.includes(r)));
    const met = matches.length === required.length;
    return {
      verdict: met ? "met" : "unmet",
      explanation: met
        ? `You have all required skills.`
        : `Missing skills: ${required.filter((r) => !matches.includes(r)).join(", ")}.`,
      evidence: `Your skills: ${profile.skills.join(", ")}`,
    };
  }
  return { verdict: "unknown", explanation: "Cannot evaluate skill rule.", evidence: "" };
}

function evaluateTeamSize(
  _rule: ExtractedRequirement["comparison_rule"],
  _profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  return {
    verdict: "unknown",
    explanation: "Team size requires user input at application time.",
    evidence: "",
  };
}

function evaluateDocument(
  rule: ExtractedRequirement["comparison_rule"],
  profile: UserProfile
): { verdict: Verdict; explanation: string; evidence: string } {
  if (!rule) {
    return { verdict: "unknown", explanation: "Document requirement unclear.", evidence: "" };
  }
  const docType = String(rule.value ?? "").toLowerCase();
  const hasDoc =
    (docType.includes("cv") || docType.includes("resume")) ? profile.has_cv :
    docType.includes("transcript") ? profile.has_transcript :
    docType.includes("reference") ? profile.has_reference_letters :
    false;

  if (hasDoc == null) return { verdict: "unknown", explanation: "Document availability has not been confirmed.", evidence: "" };
  return {
    verdict: hasDoc ? "met" : "unmet",
    explanation: hasDoc ? `You have the required document: ${rule.value}.` : `You may be missing: ${rule.value}.`,
    evidence: "",
  };
}

function operatorIncludes(op: string): boolean {
  return ["includes", "equals", "matches_regex"].includes(op);
}

// --- Compute overall report from report items ---

export function computeOverallReport(
  items: ReportItem[],
  requirements: ExtractedRequirement[],
  profile: UserProfile,
  documents: string[]
): Omit<EligibilityReport, "computed_at" | "source_snapshot"> {
  const mandatoryItems = items.filter((i) => i.mandatory === "mandatory");
  const preferredItems = items.filter((i) => i.mandatory === "preferred");

  const blockers = mandatoryItems
    .filter((i) => i.verdict === "unmet")
    .map((i) => i.requirement_text);

  const gaps = preferredItems
    .filter((i) => i.verdict !== "met")
    .map((i) => i.requirement_text);

  const requiredDocs = requirements
    .filter((r) => r.type === "document" && r.mandatory === "mandatory")
    .map((r) => r.text);

  const readyDocuments = requiredDocs.filter((d) =>
    documents.some((ud) => ud.toLowerCase().includes(d.toLowerCase()))
  );
  const missingDocuments = requiredDocs.filter(
    (d) => !documents.some((ud) => ud.toLowerCase().includes(d.toLowerCase()))
  );

  const metCount = items.filter((i) => i.verdict === "met").length;
  const totalCount = items.length;
  const readinessScore = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

  const unknownCount = items.filter((i) => i.verdict === "unknown").length;
  const confidence = totalCount > 0 ? Math.round(((totalCount - unknownCount) / totalCount) * 100) / 100 : 0;

  let overallVerdict: EligibilityReport["overall_verdict"] = "unknown";
  if (blockers.length > 0) {
    overallVerdict = "likely_ineligible";
  } else if (items.length === 0 || items.every(i => i.verdict === "unknown")) {
    overallVerdict = "unknown";
  } else if (items.some(i => i.mandatory !== "preferred" && i.verdict !== "met")) {
    overallVerdict = "possibly_eligible";
  } else if (mandatoryItems.length > 0 && mandatoryItems.every(i => i.verdict === "met")) {
    overallVerdict = "likely_eligible";
  }

  return {
    overall_verdict: overallVerdict,
    confidence,
    blockers,
    gaps,
    ready_documents: readyDocuments,
    missing_documents: missingDocuments,
    readiness_score: readinessScore,
    report_items: items,
  };
}

// --- Full eligibility analysis (deterministic + model) ---

export async function analyzeEligibility(
  requirements: ExtractedRequirement[],
  applicationQuestions: string[],
  requiredDocuments: string[],
  profile: UserProfile,
  userDocuments: string[]
): Promise<EligibilityReport> {
  // Step 1: Deterministic evaluation
  const items: ReportItem[] = requirements.map((req) => {
    const result = evaluateRequirementDeterministic(req, profile);
    return {
      requirement_text: req.text,
      requirement_type: req.type,
      mandatory: req.mandatory,
      verdict: result.verdict,
      explanation: result.explanation,
      evidence: result.evidence,
      source_excerpt: req.excerpt || "",
      follow_up_question: generateFollowUpQuestion(req, result.verdict, profile),
    };
  });

  const base = computeOverallReport(items, requirements, profile, userDocuments);
  return {
    ...base,
    computed_at: new Date().toISOString(),
    source_snapshot: "deterministic",
  };
}

// --- Generate follow-up questions for unknown/uncertain items ---

function generateFollowUpQuestion(
  req: ExtractedRequirement,
  verdict: Verdict,
  profile: UserProfile
): string | null {
  if (verdict !== "unknown") return null;

  switch (req.type) {
    case "age":
      return "What is your date of birth or age? This requirement needs age verification.";
    case "experience":
      return req.text.includes("venture") || req.text.includes("project")
        ? "Do you have an active project or venture? Describe what you're building."
        : "Describe your relevant experience for this requirement.";
    case "team_size":
      return "How many team members do you plan to work with?";
    case "other":
      if (req.text.toLowerCase().includes("passport")) {
        return "Do you have a valid passport? This is needed for travel-based opportunities.";
      }
      if (req.text.toLowerCase().includes("willing") || req.text.toLowerCase().includes("commit")) {
        return null; // Subjective commitment questions aren't actionable
      }
      return `Can you confirm: ${req.text}?`;
    default:
      return null;
  }
}

// --- AND/OR logic for grouped requirements ---

export interface RequirementGroup {
  logic: "and" | "or";
  requirements: ExtractedRequirement[];
}

/**
 * Evaluate a group of requirements with AND/OR logic.
 * AND: all must be met. OR: at least one must be met.
 */
export function evaluateRequirementGroup(
  group: RequirementGroup,
  profile: UserProfile
): { verdict: Verdict; explanation: string; metCount: number; totalCount: number } {
  const results = group.requirements.map((req) => ({
    req,
    ...evaluateRequirementDeterministic(req, profile),
  }));

  if (group.logic === "and") {
    const unmet = results.filter((r) => r.verdict === "unmet");
    const unknown = results.filter((r) => r.verdict === "unknown");
    const met = results.filter((r) => r.verdict === "met");

    if (unmet.length > 0) {
      return {
        verdict: "unmet",
        explanation: `Not met: ${unmet.map((r) => r.req.text).join("; ")}`,
        metCount: met.length,
        totalCount: results.length,
      };
    }
    if (unknown.length > 0) {
      return {
        verdict: "unknown",
        explanation: `Needs info: ${unknown.map((r) => r.req.text).join("; ")}`,
        metCount: met.length,
        totalCount: results.length,
      };
    }
    return {
      verdict: "met",
      explanation: "All requirements in this group are met.",
      metCount: met.length,
      totalCount: results.length,
    };
  }

  // OR logic
  const met = results.filter((r) => r.verdict === "met");
  if (met.length > 0) {
    return {
      verdict: "met",
      explanation: `At least one alternative is met: ${met.map((r) => r.req.text).join("; ")}`,
      metCount: met.length,
      totalCount: results.length,
    };
  }
  const unknown = results.filter((r) => r.verdict === "unknown");
  if (unknown.length > 0) {
    return {
      verdict: "unknown",
      explanation: "No alternatives confirmed yet. Need more information.",
      metCount: 0,
      totalCount: results.length,
    };
  }
  return {
    verdict: "unmet",
    explanation: "No alternatives in this group are met.",
    metCount: 0,
    totalCount: results.length,
  };
}

function normalizeVerdict(val: unknown): Verdict {
  const s = String(val ?? "").toLowerCase().trim();
  if (["met", "unmet", "partially_met", "unknown"].includes(s)) {
    return s as Verdict;
  }
  return "unknown";
}
