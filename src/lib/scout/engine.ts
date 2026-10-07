import { Opportunity, Profile, RecommendationExplanation, ScoutStructuredQuery } from '@/types/database';
import { analyzeDeadline, analyzeFreshness } from '@/opportunity-sources/freshness';
import { assessOpportunityEligibility } from '@/lib/eligibility/opportunity';
import { isClosedOrExpired } from '@/lib/opportunityStatus';
import { INTEREST_PATTERNS } from '@/lib/journey';

export interface RankedOpportunityItem {
  opportunity: Opportunity;
  explanation: RecommendationExplanation;
}

export interface ScoutEngineResult {
  structuredQuery: ScoutStructuredQuery;
  rankedItems: RankedOpportunityItem[];
  totalEvaluated: number;
  stats: {
    exceptionalCount: number;
    strongCount: number;
    possibleCount: number;
    skippedCount: number;
  };
}

/**
 * Evaluates an opportunity against the user's Opportunity Profile and structured query.
 * Produces transparent multi-dimensional assessment: fit, eligibility, evidence, effort, upside, and why/why-not explanations.
 */
export function evaluateOpportunity(
  opp: Opportunity,
  profile?: Partial<Profile>,
  query?: ScoutStructuredQuery
): RecommendationExplanation {
  const reasons_why: string[] = [];
  const reasons_why_skip: string[] = [];
  const supporting_evidence_titles: string[] = [];
  const unresolved_questions: string[] = [];
  const upside_tags: string[] = [];

  let fit_score = 50;

  // 1. Topic & Interest Alignment
  const oppText = `${opp.title} ${opp.summary || ""}`.toLowerCase();
  const userInterests = (profile?.interests || []).map((i) => i.toLowerCase());
  const oppTopics = (opp.topics || []).map((t) => t.toLowerCase());
  const matchedTopics = oppTopics.filter((t) => userInterests.some((ui) => ui.includes(t) || t.includes(ui)));

  for (const ui of userInterests) {
    if ((oppText.includes(ui) || INTEREST_PATTERNS[ui]?.test(`${oppText} ${oppTopics.join(' ')}`)) && !matchedTopics.includes(ui)) {
      matchedTopics.push(ui);
    }
  }

  if (matchedTopics.length > 0) {
    fit_score += Math.min(25, matchedTopics.length * 10);
    reasons_why.push(`Matches your interest in ${matchedTopics.slice(0, 3).join(', ')}.`);
  }
  const goalPatterns: Record<string, RegExp> = {
    'Build my career': /internship|career|research|developer/i,
    'Fund my education': /scholarship|fellowship|education|funding/i,
    'Launch something': /startup|accelerator|founder|entrepreneur/i,
  };
  if (profile?.discovery_goal && goalPatterns[profile.discovery_goal]?.test(`${oppText} ${opp.category}`)) {
    fit_score += 10;
    reasons_why.push(`Aligns with your goal: ${profile.discovery_goal.toLowerCase()}.`);
  }

  // 2. Skill Alignment
  const userSkills = (profile?.skills || []).map((s) => s.toLowerCase());
  const oppSkills = (opp.skills || []).map((s) => s.toLowerCase());
  const matchedSkills = oppSkills.filter((s) => userSkills.some((us) => us.includes(s) || s.includes(us)));

  for (const us of userSkills) {
    if (oppText.includes(us) && !matchedSkills.includes(us)) {
      matchedSkills.push(us);
    }
  }

  if (matchedSkills.length > 0) {
    fit_score += Math.min(20, matchedSkills.length * 8);
    reasons_why.push(`Aligns with your listed skills: ${matchedSkills.slice(0, 3).join(', ')}.`);
  }

  // 3. Evidence Strength & Project Alignment
  const targetRoles = (profile?.target_roles || []).map((r) => r.toLowerCase());
  for (const role of targetRoles) {
    if (opp.title.toLowerCase().includes(role) || (opp.summary || '').toLowerCase().includes(role)) {
      supporting_evidence_titles.push(`Role focus: ${role}`);
      reasons_why.push(`Matches your targeted direction in ${role}.`);
      fit_score += 10;
      break;
    }
  }

  const effectiveProfile = { ...profile, nationalities: profile?.nationalities?.length ? profile.nationalities : query?.applicant_nationalities || [] };
  const assessment = assessOpportunityEligibility(opp, effectiveProfile);
  const eligibility_verdict = assessment.overall_verdict;
  unresolved_questions.push(...assessment.unknowns);
  reasons_why_skip.push(...assessment.blockers);
  reasons_why.push(...assessment.report_items.filter(item => item.verdict === 'met').map(item => item.explanation));
  if (eligibility_verdict === 'likely_ineligible') fit_score -= 35;

  // Query topics boost
  if (query?.topics && query.topics.length > 0) {
    const oppTextFull = `${opp.title} ${opp.summary || ''} ${(opp.topics || []).join(' ')} ${(opp.skills || []).join(' ')}`.toLowerCase();
    const matchedQueryTopics = query.topics.filter((t) => {
      const topicNorm = t.toLowerCase();
      if (topicNorm === 'ai' || topicNorm === 'ml') {
        return /\b(ai|ml|artificial intelligence|machine learning|deep learning|llm|nlp|computer vision)\b/i.test(oppTextFull);
      }
      return oppTextFull.includes(topicNorm) || Boolean(INTEREST_PATTERNS[topicNorm]?.test(oppTextFull));
    });
    if (matchedQueryTopics.length > 0) {
      fit_score += 15;
      reasons_why.push(`Matches requested topic focus: ${matchedQueryTopics.join(', ')}.`);
    }
  }

  // Featured Opportunity
  if (opp.is_featured) {
    upside_tags.push("Featured Opportunity");
    fit_score += 10;
  }

  // 5. Funding & Upside
  if (opp.funding_kind === 'stipend' || opp.funding_kind === 'prize' || (opp.funding_amount_min && opp.funding_amount_min > 0)) {
    upside_tags.push('Funded / Paid');
    reasons_why.push(`Provides financial compensation (${opp.funding_description || 'Stipend/Prize provided'}).`);
  } else if (opp.funding_kind === 'none') {
    reasons_why_skip.push('Unpaid role.');
    if (query?.paid_only || profile?.paid_only_preference) {
      fit_score -= 25;
    }
  }

  if (opp.participation_mode === 'remote') {
    upside_tags.push('Remote Accessible');
    reasons_why.push('100% Remote participation.');
  } else if (opp.participation_mode === 'in-person') {
    if (profile?.participation_preference === 'remote') {
      reasons_why_skip.push('In-person program conflicting with remote-only preference.');
      fit_score -= 15;
    }
  }

  if (opp.category === 'fellowship' || opp.category === 'grant') {
    upside_tags.push('High Prestige / Network');
  }

  // 6. Deadline & Urgency
  const deadlineAnalysis = analyzeDeadline(opp.deadline);
  const urgency_label = deadlineAnalysis.label;
  if (deadlineAnalysis.status === 'urgent' || deadlineAnalysis.status === 'closes_today') {
    reasons_why_skip.push(`Urgent deadline: closes within ${deadlineAnalysis.daysRemaining ?? 0} days.`);
  }

  // 7. Effort
  let estimated_effort: 'quick' | 'moderate' | 'significant' = 'moderate';
  const qCount = opp.application_questions?.length || 0;
  if (qCount > 4 || opp.category === 'fellowship') {
    estimated_effort = 'significant';
  } else if (qCount <= 1 && opp.category === 'hackathon') {
    estimated_effort = 'quick';
  }

  // Freshness
  const freshnessAnalysis = analyzeFreshness(opp.last_verified_at, opp.source_changed_at);
  const freshness_status = freshnessAnalysis.status === 'verified_recent'
    ? 'verified_recently'
    : freshnessAnalysis.status === 'source_changed'
    ? 'source_changed'
    : 'unverified';

  // Cap fit_score
  fit_score = Math.max(10, Math.min(98, fit_score));

  // Determine Match Tier
  let match_tier: 'exceptional' | 'strong' | 'possible' | 'skip' = 'possible';
  if (eligibility_verdict === 'likely_ineligible' || isClosedOrExpired(opp.deadline, opp.source_status)) {
    match_tier = 'skip';
  } else if (fit_score >= 80 && eligibility_verdict === 'likely_eligible') {
    match_tier = 'exceptional';
  } else if (fit_score >= 65) {
    match_tier = 'strong';
  } else if (fit_score >= 45) {
    match_tier = 'possible';
  } else {
    match_tier = 'skip';
  }

  return {
    opportunity_id: opp.id,
    match_tier,
    fit_score,
    eligibility_verdict,
    reasons_why: reasons_why.length ? reasons_why : ['Broadly aligns with your opportunity discovery focus.'],
    reasons_why_skip,
    supporting_evidence_titles,
    unresolved_questions,
    estimated_effort,
    upside_tags,
    urgency_label,
    freshness_status,
  };
}

/**
 * Runs the Scout ranking and discovery pipeline
 */
export function rankAndExplainOpportunities(
  opportunities: Opportunity[],
  profile?: Partial<Profile>,
  query?: ScoutStructuredQuery
): ScoutEngineResult {
  const rankedItems: RankedOpportunityItem[] = [];

  let exceptionalCount = 0;
  let strongCount = 0;
  let possibleCount = 0;
  let skippedCount = 0;

  for (const opp of opportunities) {
    if (opp.status !== 'published' || opp.publication_status === 'draft' || opp.publication_status === 'archived' || isClosedOrExpired(opp.deadline, opp.source_status)) continue;
    if (query?.deadline_window_days != null && (!opp.deadline || Date.parse(opp.deadline) > Date.now() + query.deadline_window_days * 86400000)) continue;
    if (query?.target_countries?.length && !query.target_countries.some(country => [opp.location, ...(opp.eligible_countries || []), ...(opp.citizenship_constraints || []), ...(opp.residency_constraints || [])].some(value => value?.toLowerCase().includes(country.toLowerCase())))) continue;
    if (query?.skills?.length && !query.skills.some(skill => `${opp.title} ${opp.summary} ${opp.skills?.join(' ')}`.toLowerCase().includes(skill.toLowerCase()))) continue;
    if (query?.education_levels?.length && !opp.education_stages?.some(stage => query.education_levels?.includes(stage))) continue;
    if (query?.min_funding_amount != null && (opp.funding_amount_min == null || opp.funding_amount_min < query.min_funding_amount)) continue;
    if ((query?.travel_willingness === false || profile?.willing_to_travel === false) && opp.participation_mode !== 'remote') continue;
    const effortOrder = { quick: 0, moderate: 1, significant: 2 };
    if (query?.max_effort && (!opp.application_effort || effortOrder[opp.application_effort] > effortOrder[query.max_effort])) continue;
    // Deterministic constraints filtering
    // 1. Paid Only constraint
    if ((query?.paid_only || profile?.paid_only_preference) && !['stipend', 'reimbursement'].includes(opp.funding_kind || 'unknown')) {
      continue;
    }

    // 2. Remote Mode constraint
    if (query?.remote_mode && query.remote_mode.length > 0) {
      if (!opp.participation_mode || !query.remote_mode.includes(opp.participation_mode)) {
        continue;
      }
    }

    // 3. Excluded Countries constraint (e.g., "outside India")
    if (query?.excluded_countries && query.excluded_countries.length > 0) {
      const isExcludedLocation = query.excluded_countries.some((exc) => {
        const excNorm = exc.toLowerCase();
        const oppLoc = (opp.location || '').toLowerCase();
        // If the location explicitly specifies the excluded country (and is not purely global/remote)
        if (oppLoc.includes(excNorm)) return true;
        // If residency constraints strictly require the excluded country
        if (opp.residency_constraints && opp.residency_constraints.length > 0) {
          const onlyExcluded = opp.residency_constraints.every((rc) => rc.toLowerCase().includes(excNorm));
          if (onlyExcluded) return true;
        }
        return false;
      });
      if (isExcludedLocation) {
        continue;
      }
    }

    // 4. Topic constraint (e.g. "AI"): Opportunity must match queried topic in title, summary, topics, or skills
    if (query?.topics && query.topics.length > 0) {
      const oppText = `${opp.title} ${opp.summary || ''} ${(opp.topics || []).join(' ')} ${(opp.skills || []).join(' ')}`.toLowerCase();
      const topicMatches = query.topics.some((t) => {
        const topicNorm = t.toLowerCase();
        if (topicNorm === 'ai' || topicNorm === 'ml') {
          return /\b(ai|ml|artificial intelligence|machine learning|deep learning|llm|nlp|computer vision)\b/i.test(oppText);
        }
        return oppText.includes(topicNorm) || Boolean(INTEREST_PATTERNS[topicNorm]?.test(oppText));
      });
      if (!topicMatches) {
        continue;
      }
    }

    // 5. Category constraint
    if (query?.categories && query.categories.length > 0 && opp.category) {
      const categoryMatch = query.categories.includes(opp.category);
      if (!categoryMatch) {
        continue;
      }
    }

    const explanation = evaluateOpportunity(opp, profile, query);

    if (explanation.match_tier === 'exceptional') exceptionalCount++;
    else if (explanation.match_tier === 'strong') strongCount++;
    else if (explanation.match_tier === 'possible') possibleCount++;
    else skippedCount++;

    rankedItems.push({ opportunity: opp, explanation });
  }

  // Sort by match tier priority and fit score
  const tierWeight = { exceptional: 4, strong: 3, possible: 2, skip: 1 };
  rankedItems.sort((a, b) => {
    const twDiff = tierWeight[b.explanation.match_tier] - tierWeight[a.explanation.match_tier];
    if (twDiff !== 0) return twDiff;
    return b.explanation.fit_score - a.explanation.fit_score;
  });

  return {
    structuredQuery: query || {},
    rankedItems,
    totalEvaluated: opportunities.length,
    stats: {
      exceptionalCount,
      strongCount,
      possibleCount,
      skippedCount,
    },
  };
}
