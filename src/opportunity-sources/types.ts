// ============================================================
// OPPORTUNITY DISCOVERY & SOURCE SYSTEM TYPES
// ============================================================
import type { Opportunity, OpportunityCategory, ParticipationMode, FundingKind, EducationStage } from "@/types/database";

export type DiscoverySourceType =
  | "curated"
  | "official_feed"
  | "html_collector"
  | "search_provider"
  | "manual_url"
  | "pasted_text"
  | "ai_import";

export interface SourceDefinition {
  id: string;
  name: string;
  type: DiscoverySourceType;
  official_domain: string;
  category: OpportunityCategory;
  country?: string; // e.g. "GLOBAL", "US", "IN", "GB", "CA", "EU"
  default_mode: ParticipationMode;
  is_verified_source: boolean;
  is_enabled?: boolean;
  refresh_interval_days: number;
  description: string;
  tags: string[];
  collection_method?: "api" | "feed" | "crawler" | "curated" | "search_provider";
  trust_level?: "official" | "high" | "verified" | "community";
  supported_categories?: OpportunityCategory[];
  last_successful_check?: string;
  last_status?: "healthy" | "warning" | "error" | "never_run";
  error_count?: number;
  errors?: string[];
}

export interface RawOpportunityCandidate {
  title: string;
  organizer?: string | null;
  category?: OpportunityCategory | string | null;
  summary?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  discovered_url?: string | null;
  source_type: DiscoverySourceType;
  source_evidence?: string | null;
  deadline?: string | null;
  deadline_raw_text?: string | null;
  deadline_timezone?: string | null;
  deadline_timezone_known?: boolean;
  location?: string | null;
  participation_mode?: ParticipationMode | string | null;
  funding_kind?: FundingKind | string | null;
  funding_description?: string | null;
  funding_amount?: number | null;
  funding_currency?: string | null;
  benefits?: string[];
  eligible_countries?: string[];
  visa_requirements?: string | null;
  is_recurring?: boolean;
  recurring_cycle?: string | null;
  requirements?: string[];
  skills?: string[];
  topics?: string[];
  education_stages?: string[];
  citizenship_constraints?: string[];
  residency_constraints?: string[];
  application_questions?: string[];
  edition_year?: number | null;
  raw_content?: string | null;
}

export interface VerificationResult {
  is_official: boolean;
  official_url: string;
  confidence_score: number; // 0 to 1
  field_confidence: {
    deadline: number;
    eligibility: number;
    funding: number;
    organizer: number;
  };
  uncertain_fields: string[];
  source_timestamp: string;
  evidence_excerpt?: string | null;
}

export type FreshnessStatus =
  | "verified_recently"
  | "open"
  | "potentially_stale"
  | "source_changed"
  | "closed";

export interface FreshnessResult {
  status: FreshnessStatus;
  label: string;
  days_remaining: number | null;
  is_closed: boolean;
  stale_warning?: string | null;
}
