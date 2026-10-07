// ============================================================
// OPPORTUNITY NORMALIZATION ENGINE
// Converts raw candidate inputs into unified Canonical Opportunity records.
// ============================================================
import type { Opportunity, OpportunityCategory, ParticipationMode, FundingKind, EducationStage } from "@/types/database";
import type { RawOpportunityCandidate } from "./types";

export function cleanUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const url = new URL(rawUrl.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    // Strip tracking parameters
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
    ];
    paramsToRemove.forEach((p) => url.searchParams.delete(p));
    // Normalize trailing slash
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return `${url.origin}${pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function extractEditionYear(title: string, deadline?: string | null): number | null {
  const match = title.match(/\b(202[4-9]|203[0-9])\b/);
  if (match) return parseInt(match[1], 10);
  if (deadline) {
    const dMatch = deadline.match(/^(202[4-9]|203[0-9])/);
    if (dMatch) return parseInt(dMatch[1], 10);
  }
  return null;
}

export function normalizeCategory(cat?: string | null): OpportunityCategory {
  if (!cat) return "other";
  const s = cat.toLowerCase();
  if (s.includes("hack")) return "hackathon";
  if (s.includes("fellow")) return "fellowship";
  if (s.includes("scholar")) return "scholarship";
  if (s.includes("intern")) return "internship";
  if (s.includes("grant")) return "grant";
  return "other";
}

export function normalizeParticipationMode(mode?: string | null): ParticipationMode | null {
  if (!mode) return null;
  const s = mode.toLowerCase();
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("person") || s.includes("onsite") || s.includes("on-site")) return "in-person";
  return s.includes("remote") ? "remote" : null;
}

export function normalizeCandidateToOpportunity(candidate: RawOpportunityCandidate): Opportunity {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const official_url = cleanUrl(candidate.official_url);
  const discovered_url = cleanUrl(candidate.discovered_url);
  const source_url = official_url || discovered_url || null;

  const category = normalizeCategory(candidate.category);
  const participation_mode = normalizeParticipationMode(candidate.participation_mode);
  const edition_year = candidate.edition_year ?? extractEditionYear(candidate.title, candidate.deadline);

  // Normalize requirements into structured dictionary
  const rawReqs = candidate.requirements ?? [];
  const reqItems = rawReqs.map((r, i) => ({
    text: r,
    type: "general",
    mandatory: "mandatory",
    excerpt: r,
    source_ref: `req_${i + 1}`,
    comparison_rule: null,
    uncertainty: null,
  }));

  return {
    id,
    created_by: null,
    title: candidate.title.trim(),
    organizer: candidate.organizer?.trim() ?? null,
    category,
    summary: candidate.summary?.trim() ?? null,
    source_url,
    official_url,
    discovered_url,
    source_type: candidate.source_type,
    source_evidence: candidate.source_evidence ?? null,
    location: candidate.location?.trim() ?? null,
    participation_mode,
    funding_description: candidate.funding_description?.trim() ?? null,
    funding_kind: (candidate.funding_kind as FundingKind) ?? "unknown",
    funding_amount_min: candidate.funding_amount ?? null,
    funding_amount_max: candidate.funding_amount ?? null,
    funding_currency: candidate.funding_currency ?? null,
    funding_conditional: false,
    deadline: candidate.deadline && /^\d{4}-\d{2}-\d{2}T/.test(candidate.deadline) && Number.isFinite(Date.parse(candidate.deadline)) ? candidate.deadline : null,
    deadline_raw_text: candidate.deadline_raw_text ?? candidate.deadline ?? null,
    timezone_known: false,
    source_content: candidate.raw_content ?? null,
    retrieved_at: now,
    source_status: "unknown",
    requirements: reqItems.length > 0 ? { items: reqItems } : null,
    application_questions: candidate.application_questions ?? [],
    required_documents: [],
    application_steps: [],
    status: "draft",
    publication_status: "draft",
    is_demo: false,
    updated_at: now,
    created_at: now,
    edition_year,
    topics: candidate.topics ?? [],
    skills: candidate.skills ?? [],
    education_stages: (candidate.education_stages as unknown as EducationStage[]) ?? [],
    citizenship_constraints: candidate.citizenship_constraints ?? [],
    residency_constraints: candidate.residency_constraints ?? [],
  };
}
