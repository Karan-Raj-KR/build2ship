import { Profile, ScoutStructuredQuery, OpportunityCategory, ParticipationMode, EducationStage } from '@/types/database';

/**
 * Deterministic fallback parser that extracts structured search intent from natural language
 */
export function parseScoutQueryDeterministic(
  queryText: string,
  profile?: Partial<Profile>
): ScoutStructuredQuery {
  const qLower = queryText.toLowerCase();
  const categories: OpportunityCategory[] = [];
  const remote_mode: ParticipationMode[] = [];
  const target_countries: string[] = [];
  const excluded_countries: string[] = [];
  const topics: string[] = [];
  const skills: string[] = [];
  const education_levels: EducationStage[] = [];
  const applicant_nationalities: string[] = [];
  let academic_year: number | undefined = undefined;

  // Category detection
  if (qLower.includes('hackathon') || qLower.includes('bounty') || qLower.includes('buildathon')) {
    categories.push('hackathon');
  }
  if (qLower.includes('fellowship') || qLower.includes('residency')) {
    categories.push('fellowship');
  }
  if (qLower.includes('scholarship')) categories.push('scholarship');
  if (qLower.includes('intern') || qLower.includes('trainee') || qLower.includes('apprentice')) {
    categories.push('internship');
  }
  if (qLower.includes('grant') || qLower.includes('funding') || qLower.includes('prize')) {
    categories.push('grant');
  }
  if (qLower.includes('open source') || qLower.includes('gsoc') || qLower.includes('contributor')) {
    categories.push('open_source_programme');
  }
  if (qLower.includes('accelerator') || qLower.includes('startup')) {
    categories.push('accelerator');
  }

  // Remote / location
  if (qLower.includes('remote') || qLower.includes('virtual') || qLower.includes('online')) {
    remote_mode.push('remote');
  }
  if (qLower.includes('in-person') || qLower.includes('offline') || qLower.includes('onsite')) {
    remote_mode.push('in-person');
  }

  // Location and country exclusions
  if (qLower.includes('outside india') || qLower.includes('abroad') || qLower.includes('outside of india')) {
    excluded_countries.push('India');
    target_countries.push('Global', 'USA', 'Canada', 'Europe', 'Switzerland', 'United Kingdom');
  } else if (qLower.includes('international') || qLower.includes('global')) {
    target_countries.push('Global', 'USA', 'Canada', 'Europe', 'Switzerland', 'United Kingdom');
  }

  if (qLower.includes('bangalore') || qLower.includes('bengaluru')) {
    target_countries.push('India');
  }

  // Academic year and education stage
  if (qLower.includes('second-year') || qLower.includes('second year') || qLower.includes('2nd year') || qLower.includes('sophomore')) {
    academic_year = 2;
    education_levels.push('undergraduate');
  } else if (qLower.includes('first-year') || qLower.includes('1st year') || qLower.includes('freshman')) {
    academic_year = 1;
    education_levels.push('undergraduate');
  } else if (qLower.includes('third-year') || qLower.includes('3rd year') || qLower.includes('junior')) {
    academic_year = 3;
    education_levels.push('undergraduate');
  } else if (qLower.includes('final-year') || qLower.includes('4th year') || qLower.includes('senior')) {
    academic_year = 4;
    education_levels.push('undergraduate');
  } else if (qLower.includes('undergrad') || qLower.includes('undergraduate') || qLower.includes('bachelor') || qLower.includes('student')) {
    education_levels.push('undergraduate');
  }

  if (/\b(masters?|postgraduate|graduate)\b/.test(qLower)) {
    if (!education_levels.includes('masters')) education_levels.push('masters');
  }
  if (qLower.includes('phd') || qLower.includes('doctoral')) {
    if (!education_levels.includes('phd')) education_levels.push('phd');
  }

  // Applicant nationality / citizenship intent in query
  if (/\bindian(\s+students?|\s+undergrads?|\s+citizens?)?\b/i.test(qLower)) {
    applicant_nationalities.push('India');
  }

  // Topics & skills with word boundary protection
  const topicPatterns: [RegExp, string][] = [
    [/\b(ai|artificial intelligence)\b/i, 'ai'],
    [/\b(ml|machine learning)\b/i, 'machine learning'],
    [/\b(robotics?|autonomous)\b/i, 'robotics'],
    [/\b(web3|crypto|blockchain|ethereum|solidity)\b/i, 'web3'],
    [/\b(fintech|finance)\b/i, 'fintech'],
    [/\b(climate|sustainability|clean energy)\b/i, 'climate'],
    [/\b(health|biotech|biology|medical)\b/i, 'health'],
    [/\b(open[ -]?source|gsoc)\b/i, 'open-source'],
    [/\b(systems|distributed systems|cloud|devops)\b/i, 'systems'],
    [/\b(design|ui|ux|product)\b/i, 'design'],
    [/\b(research|scientific|papers?)\b/i, 'research'],
  ];

  for (const [pattern, topicName] of topicPatterns) {
    if (pattern.test(qLower) && !topics.includes(topicName)) {
      topics.push(topicName);
    }
  }

  // Profile preferences integration
  const paid_only = /\b(paid|stipend)\b/.test(qLower) || Boolean(profile?.paid_only_preference);
  const travel_willingness = qLower.includes('travel') ? true : profile?.willing_to_travel ?? undefined;

  let deadline_window_days: number | undefined = undefined;
  if (qLower.includes('7 days') || qLower.includes('this week') || qLower.includes('next week')) {
    deadline_window_days = 7;
  } else if (qLower.includes('30 days') || qLower.includes('this month')) {
    deadline_window_days = 30;
  }

  // Profile context string
  const profileContextParts: string[] = [];
  if (profile?.nationalities?.length) profileContextParts.push(`Citizenship: ${profile.nationalities.join(', ')}`);
  if (profile?.country_of_residence) profileContextParts.push(`Resident: ${profile.country_of_residence}`);
  if (profile?.education_stage) profileContextParts.push(`Stage: ${profile.education_stage}`);
  if (profile?.expected_graduation) profileContextParts.push(`Graduation: ${profile.expected_graduation}`);
  if (profile?.skills?.length) profileContextParts.push(`Key Skills: ${profile.skills.slice(0, 5).join(', ')}`);

  return {
    categories: categories.length ? categories : undefined,
    topics: topics.length ? topics : (profile?.interests?.length ? profile.interests : undefined),
    skills: skills.length ? skills : undefined,
    target_countries: target_countries.length ? target_countries : undefined,
    excluded_countries: excluded_countries.length ? excluded_countries : undefined,
    remote_mode: remote_mode.length ? remote_mode : undefined,
    travel_willingness,
    paid_only,
    deadline_window_days,
    education_levels: education_levels.length ? education_levels : undefined,
    academic_year,
    applicant_nationalities: applicant_nationalities.length ? applicant_nationalities : (profile?.nationalities || undefined),
    free_text_intent: queryText,
    user_profile_context: profileContextParts.join(' | ') || undefined,
  };
}

/**
 * Parses user's natural language Scout query into a high-precision structured query
 * combining user prompt intent and stored profile constraints.
 */
export async function parseScoutQuery(
  queryText: string,
  profile?: Partial<Profile>
): Promise<ScoutStructuredQuery> {
  // Search must not wait for an LLM or depend on paid provider availability.
  return parseScoutQueryDeterministic(queryText, profile);
}
