import { describe, it, expect } from 'vitest';
import { parseScoutQueryDeterministic } from '@/lib/scout/queryParser';
import { Profile } from '@/types/database';

describe('Scout Natural Language Query Parser (Deterministic)', () => {
  const baseProfile: Partial<Profile> = {
    nationalities: ['India'],
    country_of_residence: 'India',
    education_stage: 'undergraduate',
    expected_graduation: '2026',
    skills: ['TypeScript', 'Python', 'React'],
    interests: ['AI', 'Open Source'],
    paid_only_preference: false,
    willing_to_travel: false,
  };

  it('keeps undergraduate scholarships distinct from graduate fellowships', () => {
    const parsed = parseScoutQueryDeterministic('Find scholarships for undergraduate students');
    expect(parsed.education_levels).toEqual(['undergraduate']);
    expect(parsed.categories).toEqual(['scholarship']);
    expect(parseScoutQueryDeterministic('Open source programmes').categories).toEqual(['open_source_programme']);
  });

  it('does not invent travel or strict education constraints for a broad search', () => {
    const parsed = parseScoutQueryDeterministic('Find opportunities matching my profile', baseProfile);
    expect(parsed.education_levels).toBeUndefined();
    expect(parseScoutQueryDeterministic('Find opportunities').travel_willingness).toBeUndefined();
    expect(parseScoutQueryDeterministic('Find unpaid internships').paid_only).toBe(false);
  });

  it('correctly extracts paid constraint and target categories', () => {
    const query = 'Find paid hackathons and fellowships for AI students';
    const parsed = parseScoutQueryDeterministic(query, baseProfile);

    expect(parsed.paid_only).toBe(true);
    expect(parsed.categories).toContain('hackathon');
    expect(parsed.categories).toContain('fellowship');
    expect(parsed.topics).toContain('ai');
  });

  it('correctly extracts location constraints (outside India / international)', () => {
    const query = 'Find fellowships outside India with travel funding';
    const parsed = parseScoutQueryDeterministic(query, baseProfile);

    expect(parsed.target_countries).toContain('Global');
    expect(parsed.travel_willingness).toBe(true);
  });

  it('correctly extracts short deadline windows (7 days)', () => {
    const query = 'Only show things I can apply to within the next 7 days';
    const parsed = parseScoutQueryDeterministic(query, baseProfile);

    expect(parsed.deadline_window_days).toBe(7);
  });

  it('merges stored user profile context when query does not override', () => {
    const profileWithPaid: Partial<Profile> = {
      ...baseProfile,
      paid_only_preference: true,
      interests: ['Robotics', 'Embedded'],
    };

    const query = 'Find internships';
    const parsed = parseScoutQueryDeterministic(query, profileWithPaid);

    expect(parsed.paid_only).toBe(true);
    expect(parsed.categories).toContain('internship');
    expect(parsed.user_profile_context).toContain('Citizenship: India');
    expect(parsed.user_profile_context).toContain('Stage: undergraduate');
  });

  it('correctly parses complex query: paid AI opportunities outside India for second-year Indian students', () => {
    const query = 'Find paid AI opportunities outside India for second-year Indian students';
    const parsed = parseScoutQueryDeterministic(query, baseProfile);

    expect(parsed.paid_only).toBe(true);
    expect(parsed.topics).toContain('ai');
    expect(parsed.excluded_countries).toContain('India');
    expect(parsed.academic_year).toBe(2);
    expect(parsed.applicant_nationalities).toContain('India');
    expect(parsed.education_levels).toContain('undergraduate');
  });
});

