import type { Opportunity, Profile } from '@/types/database';
import type { ExtractedRequirement } from '@/lib/ingestion/types';
import { computeOverallReport, evaluateRequirementDeterministic, type UserProfile, type ReportItem } from './engine';
import { evaluateCountryEligibility } from '@/lib/personalisation/countryRules';

export function getOpportunityRequirements(opp: Opportunity): ExtractedRequirement[] {
  const raw = Array.isArray(opp.requirements) ? opp.requirements : opp.requirements?.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((value): ExtractedRequirement => {
    const req = typeof value === 'object' && value ? value : { text: String(value) };
    return { text: String(req.text || 'Unclear requirement'), type: req.type || 'other', mandatory: req.mandatory || 'uncertain', excerpt: req.excerpt || '', source_ref: req.source_ref || '', comparison_rule: req.comparison_rule || null, uncertainty: req.uncertainty || null };
  });
}

export function toEligibilityProfile(profile?: Partial<Profile>): UserProfile {
  return { display_name: profile?.display_name || null, nationality: profile?.nationalities?.[0] || null,
    nationalities: profile?.nationalities || [], residence: profile?.country_of_residence || null,
    education_level: profile?.education_stage || null, field_of_study: profile?.field_of_study || null,
    expected_graduation: profile?.expected_graduation || null, skills: profile?.skills || [], interests: profile?.interests || [],
    has_cv: null, has_transcript: null, has_reference_letters: null, bio: null };
}

export function assessOpportunityEligibility(opp: Opportunity, profile?: Partial<Profile>) {
  const requirements = getOpportunityRequirements(opp);
  const user = toEligibilityProfile(profile);
  const items: ReportItem[] = requirements.map(req => ({ requirement_text: req.text, requirement_type: req.type, mandatory: req.mandatory,
    ...evaluateRequirementDeterministic(req, user), source_excerpt: req.excerpt, follow_up_question: null }));
  const country = evaluateCountryEligibility(opp, profile);
  if (country.verdict !== 'uncertain' || opp.citizenship_constraints?.length || opp.residency_constraints?.length || opp.eligible_countries?.length) {
    items.push({ requirement_text: country.reason, requirement_type: 'geography', mandatory: 'mandatory',
      verdict: country.verdict === 'eligible' ? 'met' : country.verdict === 'ineligible' ? 'unmet' : 'unknown', explanation: country.reason,
      evidence: '', source_excerpt: '', follow_up_question: null });
  }
  if (opp.education_stages?.length) {
    const met = profile?.education_stage ? opp.education_stages.includes(profile.education_stage) : null;
    items.push({ requirement_text: `Education: ${opp.education_stages.join(', ')}`, requirement_type: 'education_stage', mandatory: 'mandatory',
      verdict: met === null ? 'unknown' : met ? 'met' : 'unmet', explanation: met === null ? 'Education stage not provided.' : met ? 'Education stage matches.' : 'Education stage does not match.', evidence: '', source_excerpt: '', follow_up_question: null });
  }
  const report = computeOverallReport(items, requirements, user, []);
  const unknowns = items.filter(item => item.mandatory !== 'preferred' && item.verdict !== 'met' && item.verdict !== 'unmet').map(item => item.requirement_text);
  if (!items.length) unknowns.push('Provider eligibility requirements have not been recorded.');
  if (!opp.last_verified_at) {
    unknowns.push('Official requirements have not been verified. Check the provider before applying.');
    if (report.overall_verdict === 'likely_eligible') report.overall_verdict = 'possibly_eligible';
  }
  return { ...report, unknowns, country };
}
