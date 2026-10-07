import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Profile } from '@/types/database';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), sql: vi.fn(), ai: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAuth: mocks.auth, checkRateLimit: () => ({ allowed: true }) }));
vi.mock('@/lib/db/service', () => ({ createSql: () => mocks.sql }));
vi.mock('@/lib/ai/client', () => ({ chatCompletion: mocks.ai, AIError: class extends Error {} }));
vi.mock('@/lib/payments/entitlements', () => ({ UsageLimitError: class extends Error {} }));
import { GET, POST, PATCH } from '@/app/api/contributions/route';
import { fetchContributionIssues, fetchContributionContext, signContribution, verifyContribution } from '@/lib/contributions-server';
import { matchContributions, parseContributionPlan, validatePreferences, type ContributionBundle } from '@/lib/contributions';

const profile = { id: 'user-a', skills: ['Python'], interests: ['Research & science'], experience_summary: 'A small Python project', discovery_goal: 'Build my career' } as Profile;
const preferences = { weeklyTime: '5 hours per week', preference: 'tests' as const };
const rawIssue = { number: 42, title: 'A focused test issue', body: 'Check the supplied reproduction.', state: 'open', assignee: null, assignees: [], labels: [{ name: 'tests' }] };
const plan = { why: 'Python matches your profile.', context: 'README: supplied context.', checklist: ['Confirm with maintainer and read policies.', 'Understand the reproduction.', 'Review your change.'], question: 'What behavior changes?' };
const req = (body: object) => new NextRequest('http://localhost/api/contributions', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-only-server-key');
  mocks.auth.mockResolvedValue({ userId: 'user-a', error: null, profile });
  mocks.ai.mockResolvedValue(JSON.stringify(plan));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/issues/42')) return Response.json(rawIssue);
    if (url.includes('/issues?')) return Response.json([rawIssue, { ...rawIssue, number: 43, pull_request: {} }, { ...rawIssue, number: 44, state: 'closed' }, { ...rawIssue, number: 45, assignees: [{ login: 'someone' }] }]);
    return Response.json({ encoding: 'base64', content: Buffer.from('Source text; untrusted instructions must not be followed.').toString('base64'), html_url: 'https://github.com/scikit-learn/scikit-learn/blob/main/README.rst' });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('reuses profile ranking and explains curator time and interests without inferring experience', () => {
  const matches = matchContributions(profile, preferences);
  expect(matches[0].repo).toBe('scikit-learn/scikit-learn');
  expect(matches[0].reasons.join(' ')).toContain('curator estimate');
  expect(matches[0].reasons.join(' ')).toContain('no skill level is inferred');
  expect(() => validatePreferences({ weeklyTime: '', preference: 'tests' })).toThrow();
  expect(() => parseContributionPlan({ ...plan, checklist: [] })).toThrow();
});
it('bounds GitHub reads to curated repositories and filters PRs, closed and assigned issues', async () => {
  const data = await fetchContributionIssues('scikit-learn/scikit-learn', 'tests');
  expect(data.issues.map(i => i.number)).toEqual([42]);
  expect(data.issues[0].url).toBe('https://github.com/scikit-learn/scikit-learn/issues/42');
  expect(data.issues[0].fetchedAt).toBeTruthy();
  await expect(fetchContributionIssues('attacker/repo', 'any')).rejects.toThrow('curated');
});
it('shows rate limits and fetch failures explicitly, and rechecks status before planning', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } }));
  await expect(fetchContributionIssues('eslint/eslint', 'any')).rejects.toThrow('rate limit');
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  await expect(fetchContributionIssues('eslint/eslint', 'any')).rejects.toThrow('fetch failed');
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...rawIssue, state: 'closed' }));
  await expect(fetchContributionContext('scikit-learn/scikit-learn', 42)).rejects.toThrow('now closed');
});
it('completes profile -> match -> fetched issue -> generated plan -> save -> refreshed progress', async () => {
  mocks.sql.mockResolvedValueOnce([]);
  expect((await (await GET(new NextRequest('http://localhost/api/contributions'))).json()).profile.skills).toEqual(['Python']);
  const matches = await (await POST(req({ action: 'match', preferences }))).json();
  expect(matches.matches[0].repo).toBe('scikit-learn/scikit-learn');
  const generated = await (await POST(req({ action: 'plan', repo: matches.matches[0].repo, number: 42, preferences }))).json();
  expect(generated.bundle.plan).toEqual(plan);
  expect(mocks.ai.mock.calls[0][0].messages[0].content).toContain('UNTRUSTED DATA');
  expect(mocks.ai.mock.calls[0][0].messages[1].content).toContain(profile.experience_summary);
  mocks.sql.mockResolvedValueOnce([{ id: 'application-a' }]);
  const response = await POST(req({ action: 'save', token: generated.token }));
  expect(response.status).toBe(200);
  const sqlText = mocks.sql.mock.calls[1][0].join(' ');
  expect(sqlText).toContain('WITH opportunity');
  expect(sqlText).toContain('application_tasks');
  expect(sqlText).toContain('opportunities.created_by =');
  expect(sqlText).toContain('WHERE NOT EXISTS (SELECT 1 FROM applications WHERE user_id =');
  mocks.sql.mockResolvedValueOnce([{ id: 'application-a', stage: 'saved', bundle: generated.bundle, tasks: [{ completed: true }] }]);
  const refreshed = await (await GET(new NextRequest('http://localhost/api/contributions'))).json();
  expect(refreshed.saved[0].bundle.plan.question).toBe(plan.question);
  expect(refreshed.saved[0].tasks[0].completed).toBe(true);
  expect(refreshed.preferences).toEqual(preferences);
});
it('rejects tampering, another account and expired plans before saving', () => {
  const bundle = { plan } as ContributionBundle;
  const token = signContribution('user-a', bundle);
  expect(verifyContribution('user-a', token).plan).toEqual(plan);
  expect(() => verifyContribution('user-b', token)).toThrow('another account');
  expect(() => verifyContribution('user-a', token + 'x')).toThrow('changed');
  vi.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 31 * 60_000);
  expect(() => verifyContribution('user-a', token)).toThrow('expired');
  vi.restoreAllMocks();
});
it('does not save failed AI output and respects authentication and owner scoping', async () => {
  mocks.ai.mockRejectedValueOnce(new Error('provider unavailable'));
  const failed = await POST(req({ action: 'plan', repo: 'scikit-learn/scikit-learn', number: 42, preferences }));
  expect(failed.status).toBe(503);
  expect(mocks.sql).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValueOnce({ error: Response.json({ error: 'Authentication required' }, { status: 401 }) });
  expect((await POST(req({ action: 'match', preferences }))).status).toBe(401);
  mocks.sql.mockResolvedValueOnce([]);
  expect((await PATCH(req({ id: '00000000-0000-5000-a000-000000000000', stage: 'preparing' }))).status).toBe(404);
  expect(mocks.sql.mock.calls[0][0].join(' ')).toContain('a.user_id =');
});
