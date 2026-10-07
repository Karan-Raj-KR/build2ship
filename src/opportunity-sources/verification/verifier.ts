import type { Opportunity } from '@/types/database';
import type { RawOpportunityCandidate } from '../types';
import { getAllSources } from '../registry';

export interface VerificationAssessment {
  isOfficialDomain: boolean;
  confidenceScore: number;
  confidencePerField: { title: number; organization: number; official_url: number; deadline: number; eligibility: number; funding: number };
  uncertainFields: string[];
  evidenceNotes: string[];
}

export function isLikelyOfficialDomain(url: string, _organizationName?: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && getAllSources().some(source => source.is_verified_source && (parsed.hostname === source.official_domain || parsed.hostname.endsWith('.' + source.official_domain)));
  } catch { return false; }
}

export function assessOpportunityVerification(candidate: RawOpportunityCandidate | Partial<Opportunity>): VerificationAssessment {
  const recognized = isLikelyOfficialDomain(candidate.official_url || candidate.discovered_url || '');
  return { isOfficialDomain: recognized, confidenceScore: 0,
    confidencePerField: { title: 0, organization: 0, official_url: 0, deadline: 0, eligibility: 0, funding: 0 },
    uncertainFields: ['official_url','deadline','eligibility_requirements','funding'],
    evidenceNotes: [recognized ? 'Recognized provider domain; programme details still require manual source review.' : 'Unrecognized source. Verify the provider and programme details before publication.', 'An imported listing is not a verified opportunity.'] };
}
