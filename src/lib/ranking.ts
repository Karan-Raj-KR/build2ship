// ============================================================
// OPPORTUNITY RANKING — profile-based scoring with transparent reasons
// Ranks opportunities by relevance to the user's profile.
// ============================================================
import type { Opportunity, Profile } from "@/types/database";
import { isClosedOrExpired } from "./opportunityStatus";

export interface RankingReason {
  kind: "match" | "partial" | "mismatch";
  label: string;
}

export interface RankedOpportunity {
  opportunity: Opportunity;
  score: number;
  reasons: RankingReason[];
}

/**
 * Rank opportunities by relevance to the user's profile.
 * Returns opportunities sorted by score descending, with ranking reasons.
 */
export function rankOpportunities(
  opportunities: Opportunity[],
  profile: Profile | null,
  { includeClosed = false }: { includeClosed?: boolean } = {}
): RankedOpportunity[] {
  if (!profile) {
    return opportunities
      .filter((o) => includeClosed || !isClosedOrExpired(o.deadline, o.source_status))
      .map((opportunity) => ({ opportunity, score: 0, reasons: [] }));
  }

  const ranked = opportunities
    .filter((o) => includeClosed || !isClosedOrExpired(o.deadline, o.source_status))
    .map((opportunity) => scoreOpportunity(opportunity, profile));

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function scoreOpportunity(opp: Opportunity, profile: Profile): RankedOpportunity {
  let score = 0;
  const reasons: RankingReason[] = [];

  // Category preference match (+20)
  if (profile.opportunity_types?.length && opp.category) {
    if (profile.opportunity_types.includes(opp.category)) {
      score += 20;
      reasons.push({ kind: "match", label: `Matches your interest in ${opp.category}s` });
    } else {
      reasons.push({ kind: "mismatch", label: `You're looking for ${profile.opportunity_types.join(", ")}` });
    }
  }

  // Participation mode match (+15)
  if (profile.participation_preference && opp.participation_mode) {
    const pref = profile.participation_preference;
    const mode = opp.participation_mode;
    if (pref === "both" || pref === mode) {
      score += 15;
      reasons.push({ kind: "match", label: `Matches your ${mode} preference` });
    } else if (mode === "hybrid") {
      score += 8;
      reasons.push({ kind: "partial", label: "Hybrid — partially matches your preference" });
    } else {
      reasons.push({ kind: "mismatch", label: `You prefer ${pref}, this is ${mode}` });
    }
  }

  // Education stage match (+15)
  if (opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    const items = Array.isArray(reqs.items) ? reqs.items : [];
    for (const req of items as Array<{ type: string; text: string }>) {
      if (req.type === "education_stage" && profile.education_stage) {
        const lower = req.text.toLowerCase();
        const stage = profile.education_stage.toLowerCase();
        if (
          (stage === "undergraduate" && (lower.includes("undergraduate") || lower.includes("student"))) ||
          (stage === "masters" && (lower.includes("master") || lower.includes("graduate"))) ||
          (stage === "phd" && (lower.includes("phd") || lower.includes("doctoral") || lower.includes("graduate")))
        ) {
          score += 15;
          reasons.push({ kind: "match", label: `Matches your ${profile.education_stage} status` });
          break;
        }
      }
    }
  }

  // Skills overlap (+10)
  if (profile.skills?.length && opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    const items = Array.isArray(reqs.items) ? reqs.items : [];
    const skillReqs = (items as Array<{ type: string; text: string }>).filter((r) => r.type === "skill");
    if (skillReqs.length > 0) {
      const userSkills = profile.skills.map((s) => s.toLowerCase());
      const matched = skillReqs.filter((r) =>
        userSkills.some((s) => s.includes(r.text.toLowerCase()) || r.text.toLowerCase().includes(s))
      );
      if (matched.length > 0) {
        score += 10;
        reasons.push({ kind: "match", label: `You have relevant skills (${matched.length}/${skillReqs.length})` });
      }
    }
  }

  // Field of study match (+10)
  if (profile.field_of_study && opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    const items = Array.isArray(reqs.items) ? reqs.items : [];
    const fieldReqs = (items as Array<{ type: string; text: string }>).filter((r) => r.type === "field_of_study");
    for (const req of fieldReqs) {
      if (req.text.toLowerCase().includes(profile.field_of_study.toLowerCase())) {
        score += 10;
        reasons.push({ kind: "match", label: `Matches your field (${profile.field_of_study})` });
        break;
      }
    }
  }

  // Deadline proximity bonus (+5 if > 30 days away, -5 if < 7 days)
  if (opp.deadline) {
    const daysLeft = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86_400_000);
    if (daysLeft > 30) {
      score += 5;
      reasons.push({ kind: "match", label: `${daysLeft} days until deadline` });
    } else if (daysLeft <= 7 && daysLeft > 0) {
      score -= 5;
      reasons.push({ kind: "partial", label: `Closing soon (${daysLeft} days left)` });
    }
  }

  // Funding match (+5)
  if (profile.max_budget_amount != null && opp.funding_kind) {
    if (opp.funding_kind === "stipend" || opp.funding_kind === "prize" || opp.funding_kind === "reimbursement") {
      score += 5;
      reasons.push({ kind: "match", label: `${opp.funding_kind} available` });
    } else if (opp.funding_kind === "cost") {
      reasons.push({ kind: "mismatch", label: "This opportunity has a participation cost" });
    }
  }

  return { opportunity: opp, score, reasons };
}
