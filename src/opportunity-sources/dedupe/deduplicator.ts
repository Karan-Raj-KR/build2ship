// ============================================================
// OPPORTUNITY DEDUPLICATION ENGINE
// Multi-factor, edition-aware deduplication protecting against redundant
// copies from aggregators, social feeds, and search snippets.
// ============================================================
import type { Opportunity } from "@/types/database";
import { cleanUrl, extractEditionYear } from "../normalize";

export interface DeduplicationMatch {
  isDuplicate: boolean;
  matchedOpportunityId?: string;
  matchedTitle?: string;
  matchConfidence: number; // 0 to 1
  reason?: string;
}

export function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(202[4-9]|203[0-9])\b/g, "") // strip year to compare base name
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkDuplicateOpportunity(
  candidate: {
    title: string;
    organizer?: string | null;
    official_url?: string | null;
    deadline?: string | null;
    edition_year?: number | null;
  },
  existingOpportunities: Opportunity[]
): DeduplicationMatch {
  const candidateUrl = cleanUrl(candidate.official_url);
  const candidateNormTitle = normalizeTitleForComparison(candidate.title);
  const candidateYear = candidate.edition_year ?? extractEditionYear(candidate.title, candidate.deadline);

  for (const existing of existingOpportunities) {
    const existingUrl = cleanUrl(existing.official_url ?? existing.source_url);

    // 1. Exact Canonical URL match
    if (candidateUrl && existingUrl && candidateUrl === existingUrl) {
      return {
        isDuplicate: true,
        matchedOpportunityId: existing.id,
        matchedTitle: existing.title,
        matchConfidence: 1.0,
        reason: "Exact official URL match",
      };
    }

    const existingYear = existing.edition_year ?? extractEditionYear(existing.title, existing.deadline);

    // If both have explicit edition years and they differ, they are DISTINCT editions!
    if (candidateYear && existingYear && candidateYear !== existingYear) {
      continue;
    }

    const existingNormTitle = normalizeTitleForComparison(existing.title);

    // 2. Normalized Title + Same Organizer match
    const sameOrg =
      candidate.organizer &&
      existing.organizer &&
      candidate.organizer.toLowerCase().trim() === existing.organizer.toLowerCase().trim();

    if (candidateNormTitle === existingNormTitle) {
      if (sameOrg) {
        return {
          isDuplicate: true,
          matchedOpportunityId: existing.id,
          matchedTitle: existing.title,
          matchConfidence: 0.95,
          reason: "Identical normalized title and organizer",
        };
      }

      // Title matches and neither has a conflicting year
      return {
        isDuplicate: true,
        matchedOpportunityId: existing.id,
        matchedTitle: existing.title,
        matchConfidence: 0.85,
        reason: "Identical title structure",
      };
    }

    // 3. High substring overlap with same organizer
    if (
      sameOrg &&
      (candidateNormTitle.includes(existingNormTitle) || existingNormTitle.includes(candidateNormTitle)) &&
      Math.min(candidateNormTitle.length, existingNormTitle.length) >= 8
    ) {
      return {
        isDuplicate: true,
        matchedOpportunityId: existing.id,
        matchedTitle: existing.title,
        matchConfidence: 0.8,
        reason: "Substring title match with matching organizer",
      };
    }
  }

  return {
    isDuplicate: false,
    matchConfidence: 0,
  };
}
