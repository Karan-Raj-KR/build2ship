// ============================================================
// DATABASE TYPES — mirrors Supabase schema exactly
// ============================================================

export type EducationStage = "undergraduate" | "masters" | "phd" | "other";
export type ParticipationPref = "remote" | "in-person" | "both";
export type OpportunityCategory =
  | "internship"
  | "fellowship"
  | "scholarship"
  | "hackathon"
  | "competition"
  | "grant"
  | "research_programme"
  | "startup_programme"
  | "accelerator"
  | "open_source_programme"
  | "conference"
  | "international_programme"
  | "other";
export type ParticipationMode = "remote" | "in-person" | "hybrid";
export type FundingKind = "prize" | "stipend" | "reimbursement" | "cost" | "none" | "unknown";
export type SourceStatus = "live" | "unknown" | "closed";
export type OpportunityStatus = "draft" | "published" | "archived";
export type ApplicationStage = "saved" | "preparing" | "submitted" | "selected" | "rejected" | "withdrawn";
export type EvidenceKind = "project" | "achievement" | "experience" | "fact";

export type AdminRole = "owner" | "admin" | "editor" | "user";

export interface Profile {
  id: string;
  display_name: string | null;
  country_of_residence: string | null;
  nationalities: string[];
  university: string | null;
  degree: string | null;
  field_of_study: string | null;
  education_stage: EducationStage | null;
  expected_graduation: string | null;
  skills: string[];
  interests: string[];
  opportunity_types: string[];
  participation_preference: ParticipationPref | null;
  travel_constraints: string | null;
  max_budget_amount: number | null;
  max_budget_currency: string | null;
  age_band: string | null;
  is_admin: boolean;
  role?: AdminRole;
  work_authorizations?: string[];
  is_suspended?: boolean;
  onboarding_completed: boolean;
  onboarding_step?: number;
  discovery_goal?: string | null;
  study_year?: string | null;
  experience_summary?: string | null;
  updated_at: string;
  // Extended Opportunity Profile fields
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  other_links?: string[];
  target_roles?: string[];
  target_industries?: string[];
  preferred_countries?: string[];
  willing_to_relocate?: boolean;
  willing_to_travel?: boolean;
  paid_only_preference?: boolean;
  time_availability?: string | null;
  effort_tolerance?: "quick" | "moderate" | "significant" | null;
}

export interface ProfileEvidence {
  id: string;
  user_id: string;
  kind: EvidenceKind;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  evidence_url: string | null;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  created_by: string | null;
  title: string;
  organizer: string | null;
  category: OpportunityCategory | null;
  summary: string | null;
  source_url: string | null;
  location: string | null;
  participation_mode: ParticipationMode | null;
  funding_description: string | null;
  funding_kind: FundingKind | null;
  deadline: string | null;
  timezone_known: boolean;
  source_content: string | null;
  retrieved_at: string | null;
  source_status: SourceStatus;
  requirements: Record<string, unknown> | null;
  status: OpportunityStatus;
  is_demo: boolean;
  updated_at: string;
  // Canonical extensions
  source_label?: "curated" | "fetched" | "user_provided" | "seed" | "search_provider" | "ai_import" | null;
  source_type?: "curated" | "official_feed" | "html_collector" | "search_provider" | "manual_url" | "pasted_text" | "ai_import" | null;
  official_url?: string | null;
  discovered_url?: string | null;
  source_evidence?: string | null;
  deadline_timezone?: string | null;
  deadline_timezone_known?: boolean;
  deadline_raw_text?: string | null;
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  funding_currency?: string | null;
  funding_conditional?: boolean;
  application_questions?: string[];
  required_documents?: string[];
  application_steps?: string[];
  application_effort?: "quick" | "moderate" | "significant" | null;
  topics?: string[];
  skills?: string[];
  education_stages?: EducationStage[];
  citizenship_constraints?: string[];
  residency_constraints?: string[];
  benefits?: string[] | null;
  eligible_countries?: string[] | null;
  visa_requirements?: string | null;
  is_recurring?: boolean;
  recurring_cycle?: string | null;
  publication_status?: "published" | "draft" | "archived" | null;
  is_featured?: boolean;
  quality_flags?: {
    stale?: boolean;
    uncertain_deadline?: boolean;
    broken_link?: boolean;
    conflicting_evidence?: boolean;
    user_reported?: boolean;
  } | null;
  edition_year?: number | null;
  last_verified_at?: string | null;
  source_changed_at?: string | null;
  created_at?: string;
}

export interface Application {
  id: string;
  user_id: string;
  opportunity_id: string;
  stage: ApplicationStage;
  next_action: string | null;
  target_date: string | null;
  notes: string | null;
  submitted_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithOpportunity extends Application {
  opportunities: Opportunity;
}

export interface ApplicationTask {
  id: string;
  application_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  task_key?: 'eligibility' | 'materials' | 'review' | null;
  due_date: string | null;
  sort_order: number;
  pinned_to_today: boolean;
  source_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityCollection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePreferences {
  user_id: string;
  weekly_focus: string | null;
  celebrations_enabled: boolean;
  updated_at: string;
}

export interface ApplicationAnswer {
  id: string;
  application_id: string;
  user_id: string;
  question: string;
  answer_draft: string | null;
  evidence_ids: string[];
  revised_at: string;
  created_at: string;
}

export interface AnalysisRecord {
  id: string;
  user_id: string;
  opportunity_id: string;
  opportunity_version_ts: string | null;
  profile_updated_at: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================
// PROMPT 2 — IMPORTED OPPORTUNITIES & EXTRACTION
// ============================================================

export interface ImportedOpportunity {
  id: string;
  created_by: string;
  title: string;
  organizer: string | null;
  category: OpportunityCategory;
  summary: string;
  location: string | null;
  participation_mode: ParticipationMode;
  deadline: string | null;
  deadline_timezone: string | null;
  deadline_timezone_known: boolean;
  deadline_raw_text: string | null;
  funding_kind: FundingKind;
  funding_description: string;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
  funding_currency: string | null;
  funding_conditional: boolean;
  requirements: ExtractedRequirementRecord[];
  application_questions: string[];
  required_documents: string[];
  application_steps: string[];
  source_url: string | null;
  source_content: string;
  source_label: "fetched" | "user_provided";
  source_status: SourceStatus;
  extracted_at: string;
  status: OpportunityStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtractedRequirementRecord {
  text: string;
  type: string;
  mandatory: "mandatory" | "preferred" | "uncertain";
  excerpt: string;
  source_ref: string;
  comparison_rule: ComparisonRuleRecord | null;
  uncertainty: string | null;
}

export interface ComparisonRuleRecord {
  field: string;
  operator: string;
  value: unknown;
  unit?: string;
}

export interface OpportunityAnalysis {
  id: string;
  user_id: string;
  opportunity_id: string;
  opportunity_version_ts?: string | null;
  profile_updated_at?: string | null;
  overall_verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
  confidence: number;
  blockers: string[];
  gaps: string[];
  ready_documents: string[];
  missing_documents: string[];
  readiness_score: number;
  report_items: EligibilityReportItem[];
  source_snapshot: string;
  computed_at: string;
  created_at: string;
}

export interface EligibilityReportItem {
  requirement_text: string;
  requirement_type: string;
  mandatory: string;
  verdict: "met" | "unmet" | "partially_met" | "unknown";
  explanation: string;
  evidence: string;
  source_excerpt: string;
  follow_up_question: string | null;
}

// ============================================================
// AI OPPORTUNITY AGENT MODELS
// ============================================================

export interface ProfileInsight {
  id: string;
  user_id: string;
  profile_version_ts: string;
  strongest_signals: string[];
  differentiators: string[];
  weak_signals: string[];
  likely_unlocks: string[];
  suggested_actions: string[];
  actionable_gaps: {
    gap: string;
    affected_count: number | null;
    action: string;
    category: "missing_info" | "addressable_gap" | "fixed_constraint";
  }[];
  summary: string;
  created_at: string;
}

export interface ScoutStructuredQuery {
  categories?: OpportunityCategory[];
  topics?: string[];
  skills?: string[];
  target_countries?: string[];
  excluded_countries?: string[];
  remote_mode?: ParticipationMode[];
  travel_willingness?: boolean;
  paid_only?: boolean;
  min_funding_amount?: number;
  deadline_window_days?: number;
  max_effort?: "quick" | "moderate" | "significant";
  education_levels?: EducationStage[];
  academic_year?: number;
  applicant_nationalities?: string[];
  free_text_intent?: string;
  user_profile_context?: string;
}

export interface ScoutRun {
  id: string;
  user_id: string;
  query_text: string;
  structured_query: ScoutStructuredQuery;
  result_count: number;
  status: "completed" | "failed" | "running";
  error?: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query_text: string;
  structured_query: ScoutStructuredQuery;
  notify_new_matches?: boolean;
  created_at: string;
}

export type RecommendationAction =
  | "interested"
  | "not_interested"
  | "not_relevant"
  | "already_knew"
  | "not_eligible"
  | "applied"
  | "hide";

export interface RecommendationFeedback {
  id: string;
  user_id: string;
  opportunity_id: string;
  action: RecommendationAction;
  reason?: string | null;
  created_at: string;
}

export interface RecommendationExplanation {
  opportunity_id: string;
  match_tier: "exceptional" | "strong" | "possible" | "skip";
  fit_score: number; // 0 - 100
  eligibility_verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
  reasons_why: string[];
  reasons_why_skip: string[];
  supporting_evidence_titles: string[];
  unresolved_questions: string[];
  estimated_effort: "quick" | "moderate" | "significant";
  upside_tags: string[];
  urgency_label: string;
  freshness_status: "verified_recently" | "open" | "potentially_stale" | "source_changed" | "unverified";
}

export interface ApplicationEvidenceLink {
  id: string;
  application_id: string;
  evidence_id: string;
  question_key?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface GeneratedApplicationPlan {
  opportunity_id: string;
  overview: string;
  supported_from_profile: { requirement: string; evidence_title: string }[];
  requires_new_input: string[];
  documents_to_upload: string[];
  organizer_clarifications: string[];
  suggested_tasks: { title: string; due_days_before_deadline: number }[];
}

// ============================================================
// ADMIN CONSOLE & OPERATIONS TYPES
// ============================================================

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export interface SystemSettings {
  feature_flags: {
    enable_ai_extraction: boolean;
    enable_notifications: boolean;
    enable_scout_search: boolean;
    enable_payments: boolean;
    collection_kill_switch: boolean;
    notification_kill_switch: boolean;
  };
  ranking_weights: {
    fit: number;
    eligibility: number;
    evidence: number;
    freshness: number;
  };
  country_rules: {
    us_include_eligible_international: boolean;
    auto_include_remote_global: boolean;
    require_explicit_citizenship_match: boolean;
  };
  featured_opportunity_ids: string[];
}

export interface QualityReport {
  id: string;
  opportunity_id: string;
  type: "stale" | "broken_link" | "uncertain_extraction" | "conflicting_evidence" | "user_report";
  details: string;
  status: "pending" | "resolved" | "ignored";
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface AdminSourceRecord {
  id: string;
  name: string;
  type: string;
  official_domain: string;
  category: OpportunityCategory;
  country: string;
  default_mode: ParticipationMode;
  is_verified: boolean;
  is_enabled: boolean;
  refresh_interval_days: number;
  last_run_at?: string | null;
  last_status: "healthy" | "warning" | "error" | "never_run";
  error_count: number;
  last_error?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}
