import { rankOpportunities } from '@/lib/ranking';
import { INTEREST_PATTERNS } from '@/lib/journey';
import type { ApplicationTask, Opportunity, Profile } from '@/types/database';

// Curator judgments, not measurements of issue difficulty or maintainer availability.
export const CONTRIBUTION_REPOS = [
  { repo: 'eslint/eslint', languages: ['JavaScript', 'TypeScript'], topics: ['software', 'web', 'developer tools'], hours: 3, note: 'Curator judgment: tooling offers practice with focused tests and JavaScript.', label: 'good first issue' },
  { repo: 'scikit-learn/scikit-learn', languages: ['Python'], topics: ['machine learning', 'research', 'science', 'data'], hours: 5, note: 'Curator judgment: documentation and tests can provide an entry into scientific software.', label: 'good first issue' },
  { repo: 'zulip/zulip', languages: ['Python', 'TypeScript'], topics: ['software', 'web', 'community'], hours: 5, note: 'Curator judgment: a substantial web app with contributor guidance; setup may take extra time.', label: 'good first issue' },
] as const;
export const CONTRIBUTION_PREFERENCES = ['code', 'tests', 'documentation', 'any'] as const;
export type ContributionPreference = typeof CONTRIBUTION_PREFERENCES[number];
export interface ContributionPreferences { weeklyTime: string; preference: ContributionPreference }
export interface ContributionIssue { repo: string; number: number; title: string; url: string; body: string; labels: string[]; fetchedAt: string; updatedAt: string }
export interface ContributionSource { name: string; url: string; text: string; fetchedAt: string }
export interface ContributionPlan { why: string; context: string; checklist: string[]; question: string }
export interface ContributionBundle { issue: ContributionIssue; sources: ContributionSource[]; plan: ContributionPlan; preferences: ContributionPreferences; generatedAt: string }
export interface SavedContribution { id: string; stage: string; bundle: ContributionBundle; tasks: ApplicationTask[] }

export function validatePreferences(value: unknown): ContributionPreferences {
  const p = value as Partial<ContributionPreferences> | null;
  if (!p || typeof p.weeklyTime !== 'string' || !p.weeklyTime.trim() || p.weeklyTime.length > 120 || !CONTRIBUTION_PREFERENCES.includes(p.preference as ContributionPreference)) throw new Error('Add weekly time and choose a contribution preference.');
  return { weeklyTime: p.weeklyTime.trim(), preference: p.preference as ContributionPreference };
}
export function matchContributions(profile: Profile, preferences: ContributionPreferences) {
  const opportunities: Opportunity[] = CONTRIBUTION_REPOS.map(r => ({ id: r.repo, title: r.repo, category: 'open_source_programme', participation_mode: 'remote', source_status: 'unknown', deadline: null,
    created_by: null, organizer: r.repo, summary: r.note, source_url: `https://github.com/${r.repo}`, location: null, funding_description: null, funding_kind: 'unknown', timezone_known: false,
    source_content: null, retrieved_at: null, status: 'draft', is_demo: false, updated_at: '',
    requirements: { items: r.languages.map(text => ({ type: 'skill', text })) } }));
  return rankOpportunities(opportunities, profile).map(match => {
    const repo = CONTRIBUTION_REPOS.find(r => r.repo === match.opportunity.id)!;
    let score = match.score;
    const reasons = match.reasons.map(r => r.label);
    const interests = profile.interests.filter(interest => repo.topics.some(topic => topic.toLowerCase().includes(interest.toLowerCase()) || INTEREST_PATTERNS[interest.toLowerCase()]?.test(topic)));
    if (interests.length) { score += 10; reasons.push(`+10: interests overlap (${interests.join(', ')})`); }
    const hours = preferences.weeklyTime.match(/\d+/)?.[0];
    if (hours && Number(hours) >= repo.hours) { score += 5; reasons.push(`+5: weekly time meets curator estimate of ${repo.hours} hours to explore, not finish an issue`); }
    if (!profile.experience_summary) reasons.push('Experience is unknown; confirm scope before starting.');
    else reasons.push('Experience summary is supplied to the plan; no skill level is inferred from it.');
    reasons.push(`Preference: ${preferences.preference}; issue labels are used to sort candidates, not confirm scope.`);
    return { ...repo, score, reasons };
  }).sort((a, b) => b.score - a.score || a.repo.localeCompare(b.repo));
}
export function parseContributionPlan(value: unknown): ContributionPlan {
  const p = value as ContributionPlan | null;
  const text = (v: unknown) => typeof v === 'string' && !!v.trim() && v.length <= 3000;
  if (!p || !text(p.why) || !text(p.context) || !text(p.question) || !Array.isArray(p.checklist) || p.checklist.length < 1 || p.checklist.length > 6 || !p.checklist.every(text)) throw new Error('AI returned an incomplete plan. Try generating again.');
  return { why: p.why, context: p.context, checklist: p.checklist, question: p.question };
}
