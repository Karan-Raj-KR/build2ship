import { Opportunity, Profile } from "@/types/database";
import {
  ComparedOpportunityItem,
  ComparisonGoal,
  DecisionSummaryResult,
  DeadlineInfo,
  EligibilityBreakdown,
  RelevanceInfo,
  FundingInfo,
  CostsInfo,
  LocationInfo,
  DurationInfo,
  EffortInfo,
  SourceInfo,
} from "./types";
import { analyzeDeadline, analyzeFreshness } from "@/opportunity-sources/freshness";
import { evaluateCountryEligibility } from "@/lib/personalisation/countryRules";
import { evaluateOpportunity } from "@/lib/scout/engine";

export function evaluateComparisonItem(
  opp: Opportunity,
  profile?: Partial<Profile> | null,
  applicationStage?: string | null
): ComparedOpportunityItem {
  const isDemo = Boolean(opp.is_demo);

  // 1. Deadline Intelligence
  const deadlineAnalysis = analyzeDeadline(opp.deadline);
  let formattedDeadline = "Deadline not stated";
  if (opp.deadline && !isNaN(new Date(opp.deadline).getTime())) {
    const d = new Date(opp.deadline);
    formattedDeadline = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } else if (opp.deadline_raw_text) {
    formattedDeadline = opp.deadline_raw_text;
  }

  const deadline_info: DeadlineInfo = {
    status: deadlineAnalysis.status,
    label: isDemo ? `${deadlineAnalysis.label} (Demo)` : deadlineAnalysis.label,
    formattedDeadline: isDemo ? `${formattedDeadline} (Demo cycle)` : formattedDeadline,
    timezone: opp.deadline_timezone || (opp.timezone_known ? "Timezone verified" : "Timezone not stated"),
    daysRemaining: deadlineAnalysis.daysRemaining,
    isApplyable: deadlineAnalysis.isApplyable,
    warning: deadlineAnalysis.warning,
    isDemoData: isDemo,
  };

  // 2. Eligibility Breakdown
  const scoutEval = evaluateOpportunity(opp, profile || undefined);
  const met_criteria: string[] = [];
  const failed_criteria: string[] = [];
  const unknown_criteria: string[] = [];

  // Citizenship / Nationalities
  const userNationalities = profile?.nationalities || [];
  if (opp.citizenship_constraints && opp.citizenship_constraints.length > 0) {
    if (userNationalities.length === 0) {
      unknown_criteria.push(`Citizenship requirement (${opp.citizenship_constraints.join(", ")}) unverified: profile nationalities not provided.`);
    } else {
      const citizenMatch = userNationalities.some((nat) =>
        opp.citizenship_constraints?.some(
          (c) => c.toLowerCase() === "any" || c.toLowerCase() === "global" || c.toLowerCase() === nat.toLowerCase()
        )
      );
      if (citizenMatch) {
        met_criteria.push(`Citizenship matches criteria (${userNationalities.join(", ")})`);
      } else {
        failed_criteria.push(`Restricted to ${opp.citizenship_constraints.join(", ")}; profile indicates ${userNationalities.join(", ")}`);
      }
    }
  } else {
    met_criteria.push("Open to all nationalities / no citizenship constraint listed");
  }

  // Country of residence / Geographic match
  const countryEval = evaluateCountryEligibility(opp, profile || undefined);
  if (countryEval.verdict === "eligible") {
    met_criteria.push(countryEval.reason);
  } else if (countryEval.verdict === "ineligible") {
    failed_criteria.push(countryEval.reason);
  } else {
    unknown_criteria.push(countryEval.reason);
  }

  // Education stage
  if (opp.education_stages && opp.education_stages.length > 0) {
    if (!profile?.education_stage) {
      unknown_criteria.push(`Requires ${opp.education_stages.join(", ")}; user education stage unknown.`);
    } else if (opp.education_stages.includes(profile.education_stage)) {
      met_criteria.push(`Open to your current study level (${profile.education_stage})`);
    } else {
      failed_criteria.push(`Restricted to ${opp.education_stages.join(", ")}; profile is ${profile.education_stage}`);
    }
  } else {
    met_criteria.push("No explicit education level restriction listed");
  }

  let verdict: "likely_eligible" | "possibly_eligible" | "likely_ineligible" | "unknown" = "unknown";
  let verdict_label = "Eligibility Unknown";

  if (failed_criteria.length > 0) {
    verdict = "likely_ineligible";
    verdict_label = "Likely Ineligible";
  } else if (unknown_criteria.length > 0) {
    verdict = "possibly_eligible";
    verdict_label = "Needs Verification";
  } else if (met_criteria.length > 0) {
    verdict = "likely_eligible";
    verdict_label = "Likely Eligible";
  }

  const eligibility: EligibilityBreakdown = {
    verdict,
    verdict_label,
    met_criteria,
    failed_criteria,
    unknown_criteria,
  };

  // 3. Relevance / Fit Score (Transparent explanation)
  const relevance: RelevanceInfo = {
    fit_score: scoutEval.fit_score,
    score_basis: "Heuristic match based on topic interest, listed skills, and location; does not indicate admission probability.",
    reasons: scoutEval.reasons_why.length > 0 ? scoutEval.reasons_why : ["Broadly matches current exploration focus."],
  };

  // 4. Funding Info (Prize pool vs Guaranteed stipend strictly separated)
  let funding_info: FundingInfo;
  const currency = opp.funding_currency || "$";
  const minAmt = opp.funding_amount_min;
  const maxAmt = opp.funding_amount_max;
  const rawDesc = opp.funding_description || "";

  if (opp.funding_kind === "prize") {
    const amtStr = maxAmt ? `${currency}${maxAmt.toLocaleString()}` : rawDesc || "Prize purse";
    funding_info = {
      kind: "prize",
      kind_label: "Competitive Prize Pool",
      display_amount: `Up to ${amtStr} total pool`,
      is_prize_pool: true,
      is_guaranteed: false,
      notes: "Total prize purse distributed across winning teams. Not a guaranteed stipend or individual award.",
      currency,
    };
  } else if (opp.funding_kind === "stipend") {
    const amtStr = maxAmt ? `${currency}${maxAmt.toLocaleString()}` : rawDesc || "Living stipend";
    funding_info = {
      kind: "stipend",
      kind_label: "Guaranteed Living Stipend",
      display_amount: amtStr,
      is_prize_pool: false,
      is_guaranteed: true,
      notes: opp.funding_conditional ? "Subject to milestone completion and active participation." : "Direct financial living allowance for admitted participants.",
      currency,
    };
  } else if (opp.funding_kind === "reimbursement") {
    funding_info = {
      kind: "reimbursement",
      kind_label: "Expense Reimbursement",
      display_amount: rawDesc || "Travel & lodging reimbursement",
      is_prize_pool: false,
      is_guaranteed: true,
      notes: "Direct expenses reimbursed upon official receipt submission.",
      currency,
    };
  } else if (opp.funding_kind === "none") {
    funding_info = {
      kind: "unpaid",
      kind_label: "Unpaid / Volunteer",
      display_amount: "Unpaid",
      is_prize_pool: false,
      is_guaranteed: false,
      notes: "No stipend or prize purse provided by organizer.",
      currency: "",
    };
  } else if (opp.funding_kind === "cost") {
    funding_info = {
      kind: "cost",
      kind_label: "Fee / Tuition Required",
      display_amount: rawDesc || "Participation fee required",
      is_prize_pool: false,
      is_guaranteed: false,
      notes: "Participants or home institutions must cover registration or tuition costs.",
      currency,
    };
  } else {
    funding_info = {
      kind: "unknown",
      kind_label: "Funding Not Stated",
      display_amount: "Not stated",
      is_prize_pool: false,
      is_guaranteed: false,
      notes: "Organizer announcement does not specify financial compensation.",
      currency: "",
    };
  }

  // 5. Costs & Exclusions
  let costs_info: CostsInfo;
  if (opp.benefits && opp.benefits.length > 0) {
    costs_info = {
      covered: opp.benefits.join("; "),
      not_covered: "Personal incidentals, visa fees, and non-covered personal travel.",
    };
  } else if (opp.funding_kind === "stipend" || opp.funding_kind === "reimbursement") {
    costs_info = {
      covered: "Core participation allowance provided as outlined.",
      not_covered: "Visa issuance fees or unapproved travel extensions.",
    };
  } else {
    costs_info = {
      covered: "Free to apply; no application fee specified.",
      not_covered: "Living, travel, or equipment expenses not covered unless specified.",
    };
  }

  // 6. Location & Mode
  const mode = opp.participation_mode || "unknown";
  const mode_label = mode === "remote" ? "Remote / Online" : mode === "in-person" ? "In-person" : mode === "hybrid" ? "Hybrid" : "Mode not stated";
  const location_name = opp.location || (mode === "remote" ? "Global (Online)" : "Location not specified");
  const travel_requirements = mode === "remote"
    ? "No travel required (100% remote)"
    : mode === "in-person"
    ? `Travel & physical attendance required in ${location_name}`
    : mode === "hybrid"
    ? `Periodic in-person attendance required in ${location_name}`
    : "Travel requirements not stated";

  const location_info: LocationInfo = {
    mode,
    mode_label,
    location_name,
    travel_requirements,
  };

  // 7. Duration / Time Commitment
  let duration_label = "Not stated";
  let time_commitment = "Not stated";
  if (opp.category === "hackathon") {
    duration_label = "24-48 hours (Intensive weekend)";
    time_commitment = "Full weekend commitment";
  } else if (opp.category === "fellowship" || opp.category === "internship") {
    duration_label = "8 to 12 weeks (Typical term)";
    time_commitment = "Full-time or intensive part-time";
  } else if (opp.category === "grant") {
    duration_label = "6 to 12 months project timeline";
    time_commitment = "Self-paced milestone delivery";
  }

  const duration_info: DurationInfo = {
    duration_label,
    time_commitment,
  };

  // 8. Application Effort & Basis
  const qCount = opp.application_questions?.length || 0;
  const docCount = opp.required_documents?.length || 0;
  let effort_level: "quick" | "moderate" | "significant" | "not_assessed" = "not_assessed";
  let effort_basis = "Not assessed (application structure not specified in source)";

  if (opp.application_effort) {
    effort_level = opp.application_effort;
    effort_basis = `Explicitly designated as ${opp.application_effort} effort`;
  } else if (qCount > 3 || docCount >= 3 || opp.category === "fellowship") {
    effort_level = "significant";
    effort_basis = `${qCount > 0 ? `${qCount} written essays` : "Multi-stage application"} + ${docCount > 0 ? `${docCount} documents` : "formal recommendations"}`;
  } else if (opp.category === "hackathon" && qCount <= 2 && docCount === 0) {
    effort_level = "quick";
    effort_basis = "Direct registration form with project synopsis";
  } else if (qCount > 0 || docCount > 0) {
    effort_level = "moderate";
    effort_basis = `${qCount > 0 ? `${qCount} short answers` : "Standard form"} with basic credentials`;
  } else if (opp.category === "hackathon") {
    effort_level = "quick";
    effort_basis = "Direct registration form with project synopsis";
  }

  const effort_info: EffortInfo = {
    level: effort_level,
    level_label: effort_level === "quick" ? "Quick (under 1 hr)" : effort_level === "moderate" ? "Moderate (1-3 hrs)" : effort_level === "significant" ? "Significant (3+ hrs / essays)" : "Not Assessed",
    basis: effort_basis,
  };

  // 9. Required Documents
  const required_documents = opp.required_documents && opp.required_documents.length > 0
    ? opp.required_documents
    : ["Not stated in official announcement"];

  // 10. Main Trade-off
  let main_trade_off = "Review detailed requirements before preparing application materials.";
  if (funding_info.is_prize_pool) {
    main_trade_off = "High effort for a competitive prize pool where financial reward is contingent on winning rather than guaranteed.";
  } else if (location_info.mode === "in-person" && profile?.participation_preference === "remote") {
    main_trade_off = "Requires physical travel and in-person presence, conflicting with remote preference.";
  } else if (deadline_info.daysRemaining !== null && deadline_info.daysRemaining <= 5 && deadline_info.daysRemaining >= 0) {
    main_trade_off = `Urgent deadline (${deadline_info.daysRemaining} days left) requires immediate submission effort.`;
  } else if (eligibility.unknown_criteria.length > 0) {
    main_trade_off = "Requires manual confirmation of unverified eligibility criteria prior to drafting.";
  } else if (effort_info.level === "significant") {
    main_trade_off = "Demands substantial preparation time (essays/references) alongside coursework or work.";
  } else if (funding_info.kind === "unpaid") {
    main_trade_off = "Valuable resume/learning upside, but provides no financial stipend.";
  }

  // 11. Source & Freshness Info
  const freshness = analyzeFreshness(opp.last_verified_at, opp.source_changed_at);
  const source_info: SourceInfo = {
    official_url: opp.official_url || opp.source_url,
    last_verified: opp.last_verified_at ? new Date(opp.last_verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not recently verified",
    is_demo: isDemo,
    source_status: freshness.label,
  };

  return {
    opportunity: opp,
    is_demo: isDemo,
    application_stage: applicationStage || null,
    deadline_info,
    eligibility,
    relevance,
    funding_info,
    costs_info,
    location_info,
    duration_info,
    effort_info,
    required_documents,
    main_trade_off,
    source_info,
  };
}

export function computeDecisionSummary(
  items: ComparedOpportunityItem[],
  goal: ComparisonGoal
): DecisionSummaryResult | null {
  if (items.length < 2) return null;

  // Filter out definitely closed items unless all are closed
  const openItems = items.filter((it) => it.deadline_info.isApplyable);
  const pool = openItems.length > 0 ? openItems : items;

  const sorted = [...pool];
  let certainty_note: string | undefined;

  if (goal === "best_fit") {
    sorted.sort((a, b) => {
      // Ineligible items receive a penalty in ranking
      const aPenalty = a.eligibility.verdict === "likely_ineligible" ? 50 : a.eligibility.verdict === "possibly_eligible" ? 10 : 0;
      const bPenalty = b.eligibility.verdict === "likely_ineligible" ? 50 : b.eligibility.verdict === "possibly_eligible" ? 10 : 0;
      return (b.relevance.fit_score - bPenalty) - (a.relevance.fit_score - aPenalty);
    });
  } else if (goal === "least_effort") {
    const effortWeights: Record<string, number> = {
      quick: 4,
      moderate: 3,
      significant: 1,
      not_assessed: 2,
    };
    sorted.sort((a, b) => {
      const wA = effortWeights[a.effort_info.level] || 2;
      const wB = effortWeights[b.effort_info.level] || 2;
      if (wB !== wA) return wB - wA;
      return b.relevance.fit_score - a.relevance.fit_score;
    });
    if (sorted[0].effort_info.level === "not_assessed") {
      certainty_note = "Effort basis is not fully published in official records; review application requirements manually.";
    }
  } else if (goal === "earliest_deadline") {
    sorted.sort((a, b) => {
      const aDays = a.deadline_info.daysRemaining ?? 999;
      const bDays = b.deadline_info.daysRemaining ?? 999;
      return aDays - bDays;
    });
  } else if (goal === "funding") {
    const fundingWeights: Record<string, number> = {
      stipend: 5,
      reimbursement: 4,
      prize: 3, // Competitive prize pool is strictly below guaranteed stipend
      unpaid: 1,
      cost: 0,
      unknown: 2,
    };
    sorted.sort((a, b) => {
      const fA = fundingWeights[a.funding_info.kind] ?? 2;
      const fB = fundingWeights[b.funding_info.kind] ?? 2;
      if (fB !== fA) return fB - fA;
      return b.relevance.fit_score - a.relevance.fit_score;
    });
    if (sorted[0].funding_info.is_prize_pool) {
      certainty_note = "Top funding option is a competitive prize pool rather than a guaranteed individual stipend.";
    }
  }

  const best = sorted[0];
  const goalLabels: Record<ComparisonGoal, string> = {
    best_fit: "overall profile fit",
    least_effort: "least application effort",
    earliest_deadline: "earliest upcoming deadline",
    funding: "financial support",
  };

  // Concrete reasons
  const reasonA = best.relevance.reasons[0] || `Strong alignment with your profile and interests.`;
  let reasonB = best.eligibility.met_criteria[0] || `${best.funding_info.kind_label}: ${best.funding_info.display_amount}.`;
  if (goal === "least_effort") {
    reasonB = `Requires ${best.effort_info.level_label.toLowerCase()} (${best.effort_info.basis}).`;
  } else if (goal === "earliest_deadline") {
    reasonB = `Closes in ${best.deadline_info.daysRemaining ?? "unknown"} days (${best.deadline_info.formattedDeadline}).`;
  } else if (goal === "funding") {
    reasonB = `${best.funding_info.kind_label}: ${best.funding_info.display_amount}.`;
  }

  const headline = `Consider ${best.opportunity.title} first if your priority is ${goalLabels[goal]}.`;

  return {
    recommended_id: best.opportunity.id,
    recommended_title: best.opportunity.title,
    recommended_organizer: best.opportunity.organizer,
    priority_goal: goal,
    priority_label: goalLabels[goal],
    reason_a: reasonA,
    reason_b: reasonB,
    trade_off: best.main_trade_off,
    certainty_note,
  };
}
