// ============================================================
// EXTRACTION TYPES — structured requirement and opportunity data
// ============================================================

export type RequirementType =
  | "nationality"
  | "residence"
  | "education_stage"
  | "field_of_study"
  | "graduation_window"
  | "age"
  | "location_restriction"
  | "skill"
  | "experience"
  | "team_size"
  | "document"
  | "application_step"
  | "other";

export type RequirementMandatory = "mandatory" | "preferred" | "uncertain";

export interface ExtractedRequirement {
  text: string;
  type: RequirementType;
  mandatory: RequirementMandatory;
  excerpt: string;
  source_ref: string;
  comparison_rule: ComparisonRule | null;
  uncertainty: string | null;
}

export interface ComparisonRule {
  field: string;
  operator: "includes" | "equals" | "gte" | "lte" | "between" | "matches_regex" | "in_list";
  value: unknown;
  unit?: string;
}

export interface ExtractedDeadline {
  date: string | null;
  timezone: string | null;
  timezone_known: boolean;
  raw_text: string | null;
}

export interface ExtractedFunding {
  kind: "prize" | "stipend" | "reimbursement" | "cost" | "none" | "unknown";
  description: string;
  amount_min: number | null;
  amount_max: number | null;
  currency: string | null;
  conditional: boolean;
}

export interface ExtractedOpportunity {
  title: string;
  organizer: string | null;
  category: "hackathon" | "fellowship" | "scholarship" | "internship" | "grant" | "other";
  summary: string;
  location: string | null;
  participation_mode: "remote" | "in-person" | "hybrid";
  deadline: ExtractedDeadline;
  funding: ExtractedFunding;
  requirements: ExtractedRequirement[];
  application_questions: string[];
  required_documents: string[];
  application_steps: string[];
  source_url: string | null;
  source_content: string;
  source_label: "fetched" | "user_provided";
  extracted_at: string;
}

export interface ExtractionResult {
  success: boolean;
  opportunity: ExtractedOpportunity | null;
  errors: string[];
  warnings: string[];
  source_status: "live" | "unknown" | "closed";
}
