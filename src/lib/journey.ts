import type { ApplicationTask, ApplicationWithOpportunity, Profile } from '@/types/database';
import type { ForYouItem } from '@/lib/recommendations/forYouEngine';

export const DISCOVERY_GOALS = ['Build my career', 'Fund my education', 'Launch something', 'Explore & grow'] as const;
export const DISCOVERY_INTERESTS = ['AI & software', 'Startups & business', 'Design & creative', 'Research & science', 'Social impact', 'Global experiences'] as const;
export const INTEREST_PATTERNS: Record<string, RegExp> = {
  'ai & software': /\bai\b|software|computer|coding|developer|technology|machine learning/i,
  'startups & business': /startup|business|founder|entrepreneur|accelerator|commerce/i,
  'design & creative': /design|creative|art|writing|media/i,
  'research & science': /research|science|scientific|biotech|laboratory/i,
  'social impact': /social|impact|climate|education|community/i,
  'global experiences': /global|international|conference|travel|exchange/i,
};
export const PREPARATION_STEPS = [
  { key: 'eligibility', title: 'Read the official rules and check eligibility' },
  { key: 'materials', title: 'Prepare the required documents or project materials' },
  { key: 'review', title: 'Review the submission requirements and deadline' },
] as const;
export function profileCompletion(profile: Partial<Profile> | null) {
  if (!profile) return 0;
  const fields = [profile.discovery_goal, profile.interests?.length, profile.country_of_residence, profile.education_stage, profile.nationalities?.length, profile.study_year || profile.expected_graduation, profile.experience_summary, profile.skills?.length, profile.portfolio_url || profile.github_url, profile.time_availability, profile.participation_preference, profile.preferred_countries?.length];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}
export interface ProgressReward { event_key: string; xp: number; awarded_at: string }
export interface JourneyApplication extends ApplicationWithOpportunity { application_tasks: ApplicationTask[] }
export interface JourneyData { profile: Profile | null; rewards: ProgressReward[]; applications: JourneyApplication[]; saved_items: ForYouItem[]; xp: number; level: number; profile_completion: number }
export function rewardSummary(rewards: ProgressReward[]) {
  const xp = rewards.reduce((sum, reward) => sum + reward.xp, 0);
  return { xp, level: 1 + Math.floor(xp / 100) };
}
