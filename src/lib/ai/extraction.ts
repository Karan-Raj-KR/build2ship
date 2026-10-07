// ============================================================
// EXTRACTION — structured extraction from raw opportunity text
// ============================================================
import { chatCompletion, AIError, isAIConfigured } from "./client";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt } from "./prompts";
import type { ExtractedOpportunity, ExtractionResult } from "../ingestion/types";

export async function extractOpportunity(
  content: string,
  sourceUrl: string | null,
  userId: string
): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!content || content.trim().length < 50) {
    return {
      success: false,
      opportunity: null,
      errors: ["Content too short to extract meaningful information."],
      warnings: [],
      source_status: "unknown",
    };
  }

  if (!isAIConfigured()) {
    return extractFallback(content, sourceUrl);
  }

  try {
    const response = await chatCompletion({
      userId,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionUserPrompt(content, sourceUrl) },
      ],
      temperature: 0.05,
      maxTokens: 4096,
      responseFormat: { type: "json_object" },
    });

    const parsed = JSON.parse(response) as Record<string, unknown>;
    const opportunity = normalizeExtraction(parsed, content, sourceUrl);

    if (!opportunity.title) {
      errors.push("Could not determine opportunity title from content.");
    }
    if (!opportunity.deadline?.date) {
      warnings.push("No parseable deadline found. The user should verify the deadline manually.");
    }

    return {
      success: errors.length === 0,
      opportunity: errors.length === 0 ? opportunity : null,
      errors,
      warnings,
      source_status: "unknown",
    };
  } catch (err) {
    if (err instanceof AIError) {
      return { success: false, opportunity: null, errors: [err.message], warnings: [], source_status: "unknown" };
    }
    return {
      success: false,
      opportunity: null,
      errors: [`Extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`],
      warnings: [],
      source_status: "unknown",
    };
  }
}

function normalizeExtraction(
  raw: Record<string, unknown>,
  sourceContent: string,
  sourceUrl: string | null
): ExtractedOpportunity {
  const deadline = (raw.deadline ?? {}) as Record<string, unknown>;
  const funding = (raw.funding ?? {}) as Record<string, unknown>;
  const requirements = Array.isArray(raw.requirements) ? raw.requirements : [];

  return {
    title: String(raw.title ?? "").trim() || "Untitled Opportunity",
    organizer: raw.organizer ? String(raw.organizer) : null,
    category: normalizeCategory(raw.category),
    summary: String(raw.summary ?? "").trim() || "",
    location: raw.location ? String(raw.location) : null,
    participation_mode: normalizeParticipationMode(raw.participation_mode),
    deadline: {
      date: deadline.date ? String(deadline.date) : null,
      timezone: deadline.timezone ? String(deadline.timezone) : null,
      timezone_known: deadline.timezone_known !== false,
      raw_text: deadline.raw_text ? String(deadline.raw_text) : null,
    },
    funding: {
      kind: normalizeFundingKind(funding.kind),
      description: String(funding.description ?? ""),
      amount_min: typeof funding.amount_min === "number" ? funding.amount_min : null,
      amount_max: typeof funding.amount_max === "number" ? funding.amount_max : null,
      currency: funding.currency ? String(funding.currency) : null,
      conditional: funding.conditional === true,
    },
    requirements: requirements.map(normalizeRequirement),
    application_questions: Array.isArray(raw.application_questions) ? raw.application_questions.map(String) : [],
    required_documents: Array.isArray(raw.required_documents) ? raw.required_documents.map(String) : [],
    application_steps: Array.isArray(raw.application_steps) ? raw.application_steps.map(String) : [],
    source_url: sourceUrl,
    source_content: sourceContent,
    source_label: sourceUrl ? "fetched" : "user_provided",
    extracted_at: new Date().toISOString(),
  };
}

function normalizeCategory(val: unknown): ExtractedOpportunity["category"] {
  const s = String(val ?? "").toLowerCase().trim();
  if (["hackathon", "fellowship", "scholarship", "internship", "grant"].includes(s)) {
    return s as ExtractedOpportunity["category"];
  }
  return "other";
}

function normalizeParticipationMode(val: unknown): ExtractedOpportunity["participation_mode"] {
  const s = String(val ?? "").toLowerCase().trim();
  if (["remote", "in-person", "hybrid"].includes(s)) {
    return s as ExtractedOpportunity["participation_mode"];
  }
  return "remote";
}

function normalizeFundingKind(val: unknown): ExtractedOpportunity["funding"]["kind"] {
  const s = String(val ?? "").toLowerCase().trim();
  if (["prize", "stipend", "reimbursement", "cost", "none", "unknown"].includes(s)) {
    return s as ExtractedOpportunity["funding"]["kind"];
  }
  return "unknown";
}

function normalizeRequirement(raw: Record<string, unknown>): ExtractedOpportunity["requirements"][0] {
  return {
    text: String(raw.text ?? ""),
    type: normalizeRequirementType(raw.type),
    mandatory: normalizeMandatory(raw.mandatory),
    excerpt: String(raw.excerpt ?? ""),
    source_ref: String(raw.source_ref ?? ""),
    comparison_rule: raw.comparison_rule ? normalizeComparisonRule(raw.comparison_rule as Record<string, unknown>) : null,
    uncertainty: raw.uncertainty ? String(raw.uncertainty) : null,
  };
}

function normalizeRequirementType(val: unknown): ExtractedOpportunity["requirements"][0]["type"] {
  const valid: ExtractedOpportunity["requirements"][0]["type"][] = [
    "nationality", "residence", "education_stage", "field_of_study",
    "graduation_window", "age", "location_restriction", "skill",
    "experience", "team_size", "document", "application_step", "other",
  ];
  const s = String(val ?? "").toLowerCase().trim();
  return (valid.includes(s as never) ? s : "other") as ExtractedOpportunity["requirements"][0]["type"];
}

function normalizeMandatory(val: unknown): ExtractedOpportunity["requirements"][0]["mandatory"] {
  const s = String(val ?? "").toLowerCase().trim();
  if (["mandatory", "preferred", "uncertain"].includes(s)) {
    return s as ExtractedOpportunity["requirements"][0]["mandatory"];
  }
  return "uncertain";
}

function normalizeComparisonRule(raw: Record<string, unknown>): ExtractedOpportunity["requirements"][0]["comparison_rule"] {
  const operators = ["includes", "equals", "gte", "lte", "between", "matches_regex", "in_list"];
  const op = String(raw.operator ?? "").trim();
  if (!operators.includes(op)) return null;
  return {
    field: String(raw.field ?? ""),
    operator: op as "includes" | "equals" | "gte" | "lte" | "between" | "matches_regex" | "in_list",
    value: raw.value,
    unit: raw.unit ? String(raw.unit) : undefined,
  };
}

// Fallback extraction when AI is not configured
function extractFallback(
  content: string,
  sourceUrl: string | null
): ExtractionResult {
  const lines = content.split("\n").filter((l) => l.trim());
  const title = lines[0]?.trim() || "Untitled Opportunity";

  const dateMatch = content.match(
    /(?:deadline|due|apply by|closes?|ends?)[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i
  );

  return {
    success: true,
    opportunity: {
      title,
      organizer: null,
      category: "other",
      summary: lines.slice(1, 4).join(" ").trim(),
      location: null,
      participation_mode: "remote",
      deadline: {
        date: dateMatch ? dateMatch[1] : null,
        timezone: null,
        timezone_known: false,
        raw_text: dateMatch ? dateMatch[0] : null,
      },
      funding: { kind: "unknown", description: "", amount_min: null, amount_max: null, currency: null, conditional: false },
      requirements: [],
      application_questions: [],
      required_documents: [],
      application_steps: [],
      source_url: sourceUrl,
      source_content: content,
      source_label: sourceUrl ? "fetched" : "user_provided",
      extracted_at: new Date().toISOString(),
    },
    errors: [],
    warnings: [
      "AI not configured — used basic regex fallback. Configure OPENAI_API_KEY for full extraction.",
    ],
    source_status: "unknown",
  };
}
