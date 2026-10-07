import type { Opportunity, Profile } from '@/types/database';

export interface CountryEligibilityVerdict {
  verdict: 'eligible' | 'uncertain' | 'ineligible';
  is_local_match: boolean;
  is_international_eligible: boolean;
  country_fit_score: number;
  reason: string;
  explanation: string;
  missing_profile_field?: string;
  required_authorizations?: string[];
}

export function normalizeCountry(value?: string | null): string {
  const country = value?.trim().toLowerCase() || '';
  const aliases: Record<string, string> = { us: 'united states', usa: 'united states', 'united states of america': 'united states', in: 'india', ind: 'india', uk: 'united kingdom', gb: 'united kingdom', ca: 'canada', ch: 'switzerland', de: 'germany', all: 'global', any: 'global', worldwide: 'global' };
  return aliases[country] || country;
}

export function evaluateCountryEligibility(opp: Opportunity, profile?: Partial<Profile>): CountryEligibilityVerdict {
  const residence = normalizeCountry(profile?.country_of_residence);
  const nationalities = (profile?.nationalities || []).map(normalizeCountry);
  const checks = [
    { allowed: opp.citizenship_constraints || [], facts: nationalities, field: 'nationalities', label: 'citizenship' },
    { allowed: opp.residency_constraints || [], facts: residence ? [residence] : [], field: 'country_of_residence', label: 'residency' },
    { allowed: opp.eligible_countries || [], facts: nationalities, field: 'nationalities', label: 'applicant countries' },
  ].filter(check => check.allowed.length > 0);
  let missing: typeof checks[number] | undefined;
  let failure: typeof checks[number] | undefined;
  for (const check of checks) {
    const allowed = check.allowed.map(normalizeCountry);
    if (allowed.includes('global')) continue;
    if (!check.facts.length) { missing = check; continue; }
    if (!check.facts.some(fact => allowed.includes(fact))) failure = check;
  }
  // Location and remote mode describe participation, not permission to apply.
  const reason = failure ? `Stated ${failure.label} restriction: ${failure.allowed.join(', ')}.`
    : missing ? `Add ${missing.label} to check the stated restriction.`
    : checks.length ? 'Known geographic requirements are met; other eligibility requirements still apply.'
    : 'Geographic eligibility has not been stated or verified.';
  const verdict = failure ? 'ineligible' : missing || !checks.length ? 'uncertain' : 'eligible';
  const isLocal = Boolean(residence && normalizeCountry(opp.location) === residence);
  return { verdict, is_local_match: verdict === 'eligible' && isLocal, is_international_eligible: verdict === 'eligible' && !isLocal,
    country_fit_score: verdict === 'eligible' ? 85 : verdict === 'ineligible' ? 0 : 50,
    reason, explanation: reason, missing_profile_field: missing?.field };
}
