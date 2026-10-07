import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit } from '@/lib/api-auth';
import { createSql } from '@/lib/db/service';
import { matchContributions, validatePreferences, type ContributionBundle } from '@/lib/contributions';
import { fetchContributionIssues, fetchContributionContext, generateContributionPlan, signContribution, verifyContribution, contributionId, GitHubReadError } from '@/lib/contributions-server';
import { AIError } from '@/lib/ai/client';
import { UsageLimitError } from '@/lib/payments/entitlements';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  if (error instanceof GitHubReadError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof UsageLimitError) return NextResponse.json({ error: error.message }, { status: 429, headers });
  if (error instanceof AIError) return NextResponse.json({ error: 'AI is unavailable right now. Your existing saved work is safe. Retry later.', code: error.code }, { status: 503, headers });
  return NextResponse.json({ error: 'Contribution data could not be loaded or saved. Retry shortly; no success has been recorded.' }, { status: 503, headers });
}
async function saved(userId: string) {
  return createSql()`SELECT a.id, a.stage, o.requirements->'elara_contribution' AS bundle,
    coalesce((SELECT jsonb_agg(t ORDER BY sort_order) FROM application_tasks t WHERE t.application_id = a.id AND t.user_id = ${userId}), '[]'::jsonb) AS tasks
    FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
    WHERE a.user_id = ${userId} AND o.created_by = ${userId} AND o.requirements ? 'elara_contribution' ORDER BY a.updated_at DESC LIMIT 30`;
}
export async function GET(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const repo = request.nextUrl.searchParams.get('repo');
    if (repo) {
      if (!checkRateLimit(auth.userId!).allowed) return NextResponse.json({ error: 'Too many requests. Retry in a minute.' }, { status: 429 });
      const p = validatePreferences({ weeklyTime: 'unknown', preference: request.nextUrl.searchParams.get('preference') || 'any' });
      return NextResponse.json(await fetchContributionIssues(repo, p.preference), { headers });
    }
    const records = await saved(auth.userId!);
    const preferences = { weeklyTime: auth.profile?.time_availability || records[0]?.bundle?.preferences?.weeklyTime || '', preference: records[0]?.bundle?.preferences?.preference || '' };
    return NextResponse.json({ profile: auth.profile, preferences, saved: records }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  if (!checkRateLimit(auth.userId!).allowed) return NextResponse.json({ error: 'Too many requests. Retry in a minute.' }, { status: 429 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Send a valid JSON request.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Send a valid action object.' }, { status: 400 });
  try {
    if (body.action === 'save') {
      const bundle: ContributionBundle = verifyContribution(auth.userId!, body.token);
      const id = contributionId(`${auth.userId}:${bundle.issue.repo}:${bundle.issue.number}`);
      const notes = `AI contribution plan · ${bundle.generatedAt}\n\nWhy it fits\n${bundle.plan.why}\n\nContext\n${bundle.plan.context}\n\nChecklist\n${bundle.plan.checklist.map(t => '- ' + t).join('\n')}\n\nUnderstanding question\n${bundle.plan.question}\n\nConfirm with maintainer.\n${[bundle.issue.url, ...bundle.sources.map(s => s.url)].join('\n')}`;
      const rows = await createSql()`WITH opportunity AS (
        INSERT INTO opportunities (id,created_by,title,organizer,category,summary,source_url,official_url,source_content,retrieved_at,source_status,status,publication_status,source_label,participation_mode,requirements)
        VALUES (${id},${auth.userId},${bundle.issue.title},${bundle.issue.repo},'open_source_programme',${bundle.plan.why},${bundle.issue.url},${bundle.issue.url},${bundle.issue.body},${bundle.issue.fetchedAt},'unknown','draft','draft','fetched','remote',${JSON.stringify({ elara_contribution: bundle })}::jsonb)
        ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id WHERE opportunities.created_by = ${auth.userId} RETURNING id
      ), application AS (
        INSERT INTO applications (user_id,opportunity_id,stage,notes,next_action)
        SELECT ${auth.userId},id,'saved',${notes},'Confirm with maintainer' FROM opportunity
        ON CONFLICT (user_id,opportunity_id) DO UPDATE SET opportunity_id = EXCLUDED.opportunity_id RETURNING id
      ), tasks AS (
        INSERT INTO application_tasks (id,application_id,user_id,title,sort_order)
        SELECT (item->>'id')::uuid, application.id, ${auth.userId}, item->>'title', (item->>'sort_order')::int
        FROM application, jsonb_array_elements(${JSON.stringify(bundle.plan.checklist.map((title, i) => ({ id: contributionId(`${id}:task:${i}`), title, sort_order: i })))}::jsonb) item
        WHERE NOT EXISTS (SELECT 1 FROM applications WHERE user_id = ${auth.userId} AND opportunity_id = ${id})
        ON CONFLICT (id) DO NOTHING
      ) SELECT id, NOT EXISTS (SELECT 1 FROM applications WHERE user_id = ${auth.userId} AND opportunity_id = ${id}) AS created FROM application`;
      if (!rows[0]) throw new Error('Save failed');
      return NextResponse.json({ applicationId: rows[0].id, created: rows[0].created }, { headers });
    }
    if (!auth.profile) return NextResponse.json({ error: 'Complete your profile first.' }, { status: 400 });
    let preferences;
    try { preferences = validatePreferences(body.preferences); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (body.action === 'match') return NextResponse.json({ matches: matchContributions(auth.profile, preferences) }, { headers });
    if (body.action !== 'plan' || typeof body.repo !== 'string') return NextResponse.json({ error: 'Choose a supported action and repository.' }, { status: 400 });
    const context = await fetchContributionContext(body.repo, body.number);
    const plan = await generateContributionPlan(auth.userId!, auth.profile, context, preferences);
    const bundle = { ...context, plan, preferences, generatedAt: new Date().toISOString() };
    return NextResponse.json({ bundle, token: signContribution(auth.userId!, bundle) }, { headers });
  } catch (error) {
    if (error instanceof AIError && error.code === 'rate_limit') return NextResponse.json({ error: 'AI provider rate limit reached. Try again later; no plan was saved.', code: error.code }, { status: 429, headers });
    if (body.action === 'plan' && !(error instanceof GitHubReadError) && !(error instanceof UsageLimitError)) return NextResponse.json({ error: 'AI plan is unavailable right now. Try again later; no plan was saved.', code: error instanceof AIError ? error.code : 'plan_failed' }, { status: 503, headers });
    return failure(error);
  }
}
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const { id, stage } = await request.json();
    if (typeof id !== 'string' || !['saved', 'preparing'].includes(stage)) return NextResponse.json({ error: 'Choose saved or preparing.' }, { status: 400 });
    const rows = await createSql()`UPDATE applications a SET stage = ${stage}, updated_at = now()
      FROM opportunities o WHERE a.id = ${id}::uuid AND a.user_id = ${auth.userId} AND a.opportunity_id = o.id AND o.created_by = ${auth.userId} AND o.requirements ? 'elara_contribution' RETURNING a.id`;
    if (!rows[0]) return NextResponse.json({ error: 'Saved contribution not found.' }, { status: 404 });
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return failure(error); }
}
