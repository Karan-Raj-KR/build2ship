import { describe, it, expect } from 'vitest';
import { checkDuplicateOpportunity, normalizeTitleForComparison } from '@/opportunity-sources/dedupe/deduplicator';
import { Opportunity } from '@/types/database';

describe('Opportunity Deduplication Engine', () => {
  const existingOpportunities: Opportunity[] = [
    {
      id: 'opp-gsoc-2025',
      title: 'Google Summer of Code 2025',
      organizer: 'Google Open Source',
      category: 'other',
      summary: 'Open source contributor program',
      source_url: 'https://summerofcode.withgoogle.com',
      official_url: 'https://summerofcode.withgoogle.com',
      deadline: '2025-04-08T18:00:00Z',
      edition_year: 2025,
      funding_kind: 'stipend',
      funding_amount_min: 1500,
      participation_mode: 'remote',
      status: 'published',
      is_demo: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as unknown as Opportunity,
    {
      id: 'opp-mitacs-2025',
      title: 'Mitacs Globalink Research Internship 2025',
      organizer: 'Mitacs',
      category: 'internship',
      summary: 'Research internship in Canada',
      source_url: 'https://www.mitacs.ca/en/programs/globalink/globalink-research-internship',
      official_url: 'https://www.mitacs.ca/en/programs/globalink/globalink-research-internship',
      deadline: '2025-09-18T20:00:00Z',
      edition_year: 2025,
      funding_kind: 'stipend',
      participation_mode: 'in-person',
      status: 'published',
      is_demo: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as unknown as Opportunity,
  ];

  it('normalizes titles for comparison by stripping years and special chars', () => {
    expect(normalizeTitleForComparison('Google Summer of Code 2025!')).toBe('google summer of code');
    expect(normalizeTitleForComparison('Mitacs Globalink Research Internship 2026')).toBe('mitacs globalink research internship');
  });

  it('flags exact canonical URL as duplicate', () => {
    const candidate = {
      title: 'GSoC Open Source Program',
      organizer: 'Google',
      official_url: 'https://summerofcode.withgoogle.com',
    };

    const match = checkDuplicateOpportunity(candidate, existingOpportunities);
    expect(match.isDuplicate).toBe(true);
    expect(match.matchedOpportunityId).toBe('opp-gsoc-2025');
  });

  it('recognizes 2025 vs 2026 as DISTINCT editions (not duplicate)', () => {
    const candidate2026 = {
      title: 'Google Summer of Code 2026',
      organizer: 'Google Open Source',
      official_url: 'https://summerofcode.withgoogle.com/edition/2026',
      edition_year: 2026,
    };

    const match = checkDuplicateOpportunity(candidate2026, existingOpportunities);
    expect(match.isDuplicate).toBe(false);
  });

  it('flags same organization and base title within same edition as duplicate', () => {
    const candidateSameEdition = {
      title: 'Google Summer of Code 2025 (Student edition)',
      organizer: 'Google Open Source',
      edition_year: 2025,
    };

    const match = checkDuplicateOpportunity(candidateSameEdition, existingOpportunities);
    expect(match.isDuplicate).toBe(true);
    expect(match.matchedOpportunityId).toBe('opp-gsoc-2025');
  });
});
