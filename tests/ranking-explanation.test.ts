import { describe, it, expect } from 'vitest';
import { evaluateOpportunity, rankAndExplainOpportunities } from '@/lib/scout/engine';
import { Opportunity, Profile } from '@/types/database';

describe('Scout Ranking & Explainability Engine', () => {
  const profile: Partial<Profile> = {
    nationalities: ['India'],
    country_of_residence: 'India',
    education_stage: 'undergraduate',
    expected_graduation: '2026',
    skills: ['Python', 'TypeScript', 'PyTorch'],
    interests: ['AI', 'Open Source'],
    target_roles: ['AI Engineer', 'Research Fellow'],
    paid_only_preference: true,
    participation_preference: 'remote',
  };

  const sampleOpps: Opportunity[] = [
    {
      id: 'opp-1',
      title: 'Global AI Fellowship 2026',
      organizer: 'OpenAI Labs',
      category: 'fellowship',
      summary: 'Stipended fellowship for undergraduate builders working on AI systems.',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      funding_kind: 'stipend',
      funding_amount_min: 5000,
      participation_mode: 'remote',
      topics: ['AI', 'Open Source', 'Machine Learning'],
      skills: ['Python', 'PyTorch'],
      education_stages: ['undergraduate'],
      citizenship_constraints: ['Global', 'India'],
      status: 'published',
      is_demo: false,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as unknown as Opportunity,
    {
      id: 'opp-2',
      title: 'US Domestic Hackathon',
      organizer: 'US Tech Society',
      category: 'hackathon',
      summary: 'In-person hackathon exclusively for US citizens.',
      deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
      funding_kind: 'prize',
      participation_mode: 'in-person',
      topics: ['AI'],
      citizenship_constraints: ['USA'], // Restricts to USA
      status: 'published',
      is_demo: false,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as unknown as Opportunity,
  ];

  it('evaluates strong match with transparent reasons grounded in user facts', () => {
    const explanation = evaluateOpportunity(sampleOpps[0], profile);

    expect(explanation.match_tier).toBe('exceptional');
    expect(explanation.fit_score).toBeGreaterThanOrEqual(80);
    expect(explanation.eligibility_verdict).toBe('likely_eligible');

    // Transparent reason checks
    const reasonsStr = explanation.reasons_why.join(' ').toLowerCase();
    expect(reasonsStr).toContain('ai');
    expect(reasonsStr).toContain('python');
    expect(reasonsStr).toContain('education stage matches');
    expect(reasonsStr).toContain('geographic requirements are met');
  });

  it('strictly identifies ineligible constraints and assigns skip tier', () => {
    const explanation = evaluateOpportunity(sampleOpps[1], profile);

    expect(explanation.eligibility_verdict).toBe('likely_ineligible');
    expect(explanation.match_tier).toBe('skip');

    const skipStr = explanation.reasons_why_skip.join(' ');
    expect(skipStr).toContain('Stated citizenship restriction: USA');
  });

  it('preserves unknown state if profile has missing citizenship (unknown stays unknown)', () => {
    const incompleteProfile: Partial<Profile> = {
      ...profile,
      nationalities: [], // missing citizenship!
    };

    const oppWithCitizenshipReq: Opportunity = {
      ...sampleOpps[0],
      citizenship_constraints: ['India', 'Canada'],
    };

    const explanation = evaluateOpportunity(oppWithCitizenshipReq, incompleteProfile);

    expect(explanation.unresolved_questions.length).toBeGreaterThan(0);
    expect(explanation.unresolved_questions[0]).toContain('Add citizenship');
    // NEVER converts missing info into likely_eligible!
    expect(explanation.eligibility_verdict).not.toBe('likely_eligible');
  });

  it('ranks and sorts opportunities deterministically by match tier and fit score', () => {
    const result = rankAndExplainOpportunities(sampleOpps, { ...profile, paid_only_preference: false });

    expect(result.rankedItems.length).toBe(2);
    expect(result.rankedItems[0].opportunity.id).toBe('opp-1'); // Exceptional match comes first
    expect(result.rankedItems[1].opportunity.id).toBe('opp-2'); // Ineligible comes last
  });
});
