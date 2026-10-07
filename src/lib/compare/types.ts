import { Opportunity, Profile, OpportunityCategory } from "@/types/database";

export type ComparisonGoal = "best_fit" | "least_effort" | "earliest_deadline" | "funding";

export interface DeadlineInfo {
  status: string;
  label: string;
  formattedDeadline: string;
  timezone: string;
  daysRemaining: number | null;
  isApplyable: boolean;
  warning?: string;
  isDemoData: boolean;
}

export interface EligibilityBreakdown {
  verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
  verdict_label: string;
  met_criteria: string[];
  failed_criteria: string[];
  unknown_criteria: string[];
}

export interface RelevanceInfo {
  fit_score: number;
  score_basis: string;
  reasons: string[];
}

export interface FundingInfo {
  kind: "stipend" | "prize" | "reimbursement" | "tuition" | "unpaid" | "cost" | "unknown";
  kind_label: string;
  display_amount: string;
  is_prize_pool: boolean;
  is_guaranteed: boolean;
  notes: string;
  currency: string;
}

export interface CostsInfo {
  covered: string;
  not_covered: string;
}

export interface LocationInfo {
  mode: "remote" | "in-person" | "hybrid" | "unknown";
  mode_label: string;
  location_name: string;
  travel_requirements: string;
}

export interface DurationInfo {
  duration_label: string;
  time_commitment: string;
}

export interface EffortInfo {
  level: "quick" | "moderate" | "significant" | "not_assessed";
  level_label: string;
  basis: string;
}

export interface SourceInfo {
  official_url: string | null;
  last_verified: string;
  is_demo: boolean;
  source_status: string;
}

export interface ComparedOpportunityItem {
  opportunity: Opportunity;
  is_demo: boolean;
  application_stage: string | null;
  deadline_info: DeadlineInfo;
  eligibility: EligibilityBreakdown;
  relevance: RelevanceInfo;
  funding_info: FundingInfo;
  costs_info: CostsInfo;
  location_info: LocationInfo;
  duration_info: DurationInfo;
  effort_info: EffortInfo;
  required_documents: string[];
  main_trade_off: string;
  source_info: SourceInfo;
}

export interface DecisionSummaryResult {
  recommended_id: string | null;
  recommended_title: string | null;
  recommended_organizer: string | null;
  priority_goal: ComparisonGoal;
  priority_label: string;
  reason_a: string;
  reason_b: string;
  trade_off: string;
  certainty_note?: string;
}

export interface CataloguePickerItem {
  id: string;
  title: string;
  organizer: string;
  category: OpportunityCategory | null;
  deadline_label: string;
  deadline_status: string;
  is_demo: boolean;
  eligibility_verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
  eligibility_label: string;
  is_saved: boolean;
}
