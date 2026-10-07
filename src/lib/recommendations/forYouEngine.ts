// ============================================================
// FOR YOU DATA FOUNDATION & FEED ENGINE
// Builds rich ForYouItem entities with multi-dimensional grounding,
// safe feedback loop weighting, exploration mix, and cursor pagination.
// ============================================================

import {
  Opportunity,
  Profile,
  RecommendationAction,
  RecommendationFeedback,
  ProfileEvidence,
} from "@/types/database";
import { evaluateOpportunity } from "@/lib/scout/engine";
import { analyzeDeadline } from "@/opportunity-sources/freshness";

export type EligibilityStatusKind =
  | "requirements_met"
  | "missing_information"
  | "specific_unmet_requirement"
  | "outside_interests";

export type ExplorationType = "strong_match" | "attainable_gap" | "adjacent_interest";

export interface ForYouItem {
  opportunity_id: string;
  opportunity: Opportunity;
  title: string;
  organizer: string | null;
  benefits: string[];
  location: string | null;
  deadline: string | null;
  source: string;
  freshness: string;
  relevance_explanation: string;
  eligibility_status: EligibilityStatusKind;
  specific_gaps: string[];
  saved_state: boolean;
  application_state: string | null;
  exploration_type: ExplorationType;
  // Detail objects preserved for backward compatibility and deep UI inspection
  recommendation_reasons: string[];
  eligibility_summary: {
    verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown";
    details: string;
    missing_info: string[];
  };
  evidence_strength: {
    score: number; // 0 - 100
    supporting_items: string[];
  };
  deadline_urgency: {
    label: string;
    days_remaining: number | null;
    is_urgent: boolean;
  };
  benefit_funding: {
    description: string;
    kind: string;
    is_paid: boolean;
    amount_label?: string;
  };
  feedback_state?: RecommendationAction | null;
  source_trust: "official" | "verified" | "community";
  last_checked: string | null;
  fit_score: number;
  match_tier: "exceptional" | "strong" | "possible" | "skip";
}

export interface ForYouFeedResult {
  items: ForYouItem[];
  nextCursor: string | null;
  totalAvailable: number;
  stats: {
    exceptional: number;
    strong: number;
    possible: number;
  };
}

/**
 * Builds a ForYouItem from an opportunity, profile, and user feedback history.
 */
export function buildForYouItem(
  opp: Opportunity,
  profile?: Partial<Profile>,
  evidence: ProfileEvidence[] = [],
  feedbackHistory: RecommendationFeedback[] = [],
  savedOppIds: Set<string> = new Set(),
  applicationStageMap: Map<string, string> = new Map()
): ForYouItem {
  const explanation = evaluateOpportunity(opp, profile);
  const deadlineAnalysis = analyzeDeadline(opp.deadline);

  // 1. Evidence Strength
  const matchingEvidence = evidence.filter((ev) => {
    const text = `${opp.title} ${opp.summary || ""} ${opp.skills?.join(" ") || ""}`.toLowerCase();
    return ev.tags.some((t) => text.includes(t.toLowerCase())) || text.includes(ev.title.toLowerCase());
  });

  const evidenceScore = Math.min(100, matchingEvidence.length * 30 + (profile?.github_url ? 20 : 0));
  const supportingItems = matchingEvidence.map((e) => e.title);

  // 2. Feedback adjustment (safe fractional decay, never deletes preferences)
  const oppFeedback = feedbackHistory.filter(f => f.opportunity_id === opp.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  let adjustedScore = explanation.fit_score;

  if (oppFeedback) {
    if (oppFeedback.action === "interested" || oppFeedback.action === "applied") {
      adjustedScore = Math.min(99, adjustedScore + 8);
    } else if (oppFeedback.action === "not_interested" || oppFeedback.action === "not_relevant") {
      adjustedScore = Math.max(15, adjustedScore - 12);
    }
  }

  // 3. Benefit / Funding
  const isPaid = opp.funding_kind === "stipend" || opp.funding_kind === "prize" || (opp.funding_amount_min || 0) > 0;
  let amountLabel = opp.funding_description || "Not specified";
  if (opp.funding_amount_min && opp.funding_currency) {
    amountLabel = `${opp.funding_currency} ${opp.funding_amount_min.toLocaleString()}${opp.funding_amount_max ? ` - ${opp.funding_amount_max.toLocaleString()}` : ""}`;
  }

  // 4. Distinction between eligibility vs interests
  const userInterests = (profile?.interests || []).map((i) => i.toLowerCase());
  const oppTopics = (opp.topics || []).map((t) => t.toLowerCase());
  const hasDirectInterest = oppTopics.some((t) => userInterests.some((ui) => ui.includes(t) || t.includes(ui))) ||
    userInterests.some((ui) => (opp.title + " " + (opp.summary || "")).toLowerCase().includes(ui));

  let eligibility_status: EligibilityStatusKind = "requirements_met";
  let exploration_type: ExplorationType = "strong_match";
  if (explanation.eligibility_verdict === "likely_ineligible") {
    eligibility_status = "specific_unmet_requirement";
    exploration_type = "attainable_gap";
  } else if (explanation.eligibility_verdict === "unknown" || explanation.eligibility_verdict === "possibly_eligible" || explanation.unresolved_questions.length > 0) {
    eligibility_status = "missing_information";
    exploration_type = "attainable_gap";
  } else if (!hasDirectInterest && userInterests.length > 0) {
    eligibility_status = "outside_interests";
    exploration_type = "adjacent_interest";
  } else {
    eligibility_status = "requirements_met";
    exploration_type = "strong_match";
  }

  // Specific gaps / evidence needs
  const specific_gaps = explanation.unresolved_questions.length > 0
    ? explanation.unresolved_questions
    : explanation.reasons_why_skip.length > 0
    ? explanation.reasons_why_skip
    : [];

  // Benefits list
  const benefits = opp.benefits && opp.benefits.length > 0
    ? opp.benefits
    : opp.funding_description
    ? [opp.funding_description]
    : isPaid
    ? ["Stipend / Prize provided"]
    : ["Experience & Network"];

  const appStage = applicationStageMap.get(opp.id) || null;
  const isSaved = savedOppIds.has(opp.id) || Boolean(appStage);

  return {
    opportunity_id: opp.id,
    opportunity: opp,
    title: opp.title,
    organizer: opp.organizer,
    benefits,
    location: opp.location,
    deadline: opp.deadline,
    source: opp.official_url || opp.source_url || "Source not supplied",
    freshness: explanation.freshness_status,
    relevance_explanation: explanation.reasons_why[0] || "Aligns with your profile skills and discovery goals.",
    eligibility_status,
    specific_gaps,
    saved_state: isSaved,
    application_state: appStage,
    exploration_type,
    recommendation_reasons: explanation.reasons_why,
    eligibility_summary: {
      verdict: explanation.eligibility_verdict,
      details: explanation.eligibility_verdict === "likely_eligible"
        ? "You meet stated nationality and academic prerequisites."
        : explanation.eligibility_verdict === "likely_ineligible"
        ? explanation.reasons_why_skip[0] || "Eligibility constraints not met."
        : "Some cohort criteria require further clarification.",
      missing_info: explanation.unresolved_questions,
    },
    evidence_strength: {
      score: evidenceScore,
      supporting_items: supportingItems.length ? supportingItems : ["Profile baseline skills"],
    },
    deadline_urgency: {
      label: deadlineAnalysis.label,
      days_remaining: deadlineAnalysis.daysRemaining,
      is_urgent: deadlineAnalysis.status === "urgent" || deadlineAnalysis.status === "closes_today",
    },
    benefit_funding: {
      description: opp.funding_description || (isPaid ? "Funded program" : "Unpaid program"),
      kind: opp.funding_kind || "none",
      is_paid: isPaid,
      amount_label: amountLabel,
    },
    feedback_state: oppFeedback?.action || null,
    source_trust: opp.last_verified_at && opp.official_url ? "official" : "community",
    last_checked: opp.last_verified_at || null,
    fit_score: adjustedScore,
    match_tier: explanation.match_tier,
  };
}

/**
 * Computes ranked, cursor-paginated For You feed items with controlled exploration mix.
 * Target exploration mix: ~75% strong matches, ~15% attainable gaps, ~10% adjacent interests.
 * Never includes expired, closed, or definitively impossible (likely_ineligible) records.
 */
export function getForYouFeed(params: {
  opportunities: Opportunity[];
  profile?: Partial<Profile>;
  evidence?: ProfileEvidence[];
  feedback?: RecommendationFeedback[];
  applications?: Array<{ opportunity_id: string; stage?: string }>;
  cursor?: string | null;
  limit?: number;
}): ForYouFeedResult {
  const limit = params.limit || 10;
  const feedback = params.feedback || [];
  const applications = params.applications || [];

  const savedOppIds = new Set(applications.map((a) => a.opportunity_id));
  const appStageMap = new Map(applications.map((a) => [a.opportunity_id, a.stage || "saved"]));

  // Filter out items marked as "hide", archived, closed, or expired
  const nowMs = Date.now();
  const hiddenOppIds = new Set(feedback.filter((f) => f.action === "hide").map((f) => f.opportunity_id));

  const activeOpps = params.opportunities.filter((o) => {
    if (hiddenOppIds.has(o.id)) return false;
    if (o.status === "archived" || o.publication_status === "archived") return false;
    if (o.source_status === "closed") return false;
    if (o.deadline) {
      const d = new Date(o.deadline).getTime();
      if (!isNaN(d) && d < nowMs) return false;
    }
    return true;
  });

  // Build items
  const allItems: ForYouItem[] = activeOpps.map((opp) =>
    buildForYouItem(opp, params.profile, params.evidence || [], feedback, savedOppIds, appStageMap)
  );

  // Filter out definitively impossible opportunities from the feed
  const eligibleItems = allItems.filter(
    (item) => item.match_tier !== "skip" && item.eligibility_summary.verdict !== "likely_ineligible"
  );

  // Group into controlled exploration buckets
  const strongMatches = eligibleItems
    .filter((i) => i.exploration_type === "strong_match")
    .sort((a, b) => b.fit_score - a.fit_score);

  const attainableGaps = eligibleItems
    .filter((i) => i.exploration_type === "attainable_gap")
    .sort((a, b) => b.fit_score - a.fit_score);

  const adjacentInterests = eligibleItems
    .filter((i) => i.exploration_type === "adjacent_interest")
    .sort((a, b) => b.fit_score - a.fit_score);

  // Controlled exploration mix interleave:
  // In a block of 20 items: 15 strong (~75%), 3 gaps (~15%), 2 adjacent (~10%)
  // If inventory in a bucket is exhausted, gracefully redistribute from remaining buckets.
  const orderedItems: ForYouItem[] = [];
  let sIdx = 0;
  let gIdx = 0;
  let aIdx = 0;

  while (sIdx < strongMatches.length || gIdx < attainableGaps.length || aIdx < adjacentInterests.length) {
    // 1. Take up to 15 strong
    for (let c = 0; c < 15 && sIdx < strongMatches.length; c++) {
      orderedItems.push(strongMatches[sIdx++]);
    }
    // 2. Take up to 3 gaps
    for (let c = 0; c < 3 && gIdx < attainableGaps.length; c++) {
      orderedItems.push(attainableGaps[gIdx++]);
    }
    // 3. Take up to 2 adjacent
    for (let c = 0; c < 2 && aIdx < adjacentInterests.length; c++) {
      orderedItems.push(adjacentInterests[aIdx++]);
    }

    // Drain remaining if other buckets are empty
    if (gIdx >= attainableGaps.length && aIdx >= adjacentInterests.length) {
      while (sIdx < strongMatches.length) orderedItems.push(strongMatches[sIdx++]);
    }
    if (sIdx >= strongMatches.length && aIdx >= adjacentInterests.length) {
      while (gIdx < attainableGaps.length) orderedItems.push(attainableGaps[gIdx++]);
    }
    if (sIdx >= strongMatches.length && gIdx >= attainableGaps.length) {
      while (aIdx < adjacentInterests.length) orderedItems.push(adjacentInterests[aIdx++]);
    }
  }

  // Calculate stats
  const stats = {
    exceptional: orderedItems.filter((i) => i.match_tier === "exceptional").length,
    strong: orderedItems.filter((i) => i.match_tier === "strong").length,
    possible: orderedItems.filter((i) => i.match_tier === "possible").length,
  };

  // Cursor pagination by item ID
  let startIndex = 0;
  if (params.cursor) {
    const idx = orderedItems.findIndex((item) => item.opportunity.id === params.cursor);
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  const paginatedItems = orderedItems.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < orderedItems.length;
  const lastItem = paginatedItems[paginatedItems.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.opportunity.id : null;

  return {
    items: paginatedItems,
    nextCursor,
    totalAvailable: orderedItems.length,
    stats,
  };
}
