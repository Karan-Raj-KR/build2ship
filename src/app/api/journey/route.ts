import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createSql } from '@/lib/db/service';
import { profileCompletion, rewardSummary } from '@/lib/journey';
import { buildForYouItem } from '@/lib/recommendations/forYouEngine';
import type { JourneyApplication } from '@/lib/journey';

export async function GET() {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const rows = await createSql()`SELECT
      coalesce((SELECT jsonb_agg(r ORDER BY awarded_at DESC) FROM progress_rewards r WHERE user_id = ${auth.userId}), '[]'::jsonb) AS rewards,
      coalesce((SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'opportunities', (SELECT to_jsonb(o) FROM opportunities o WHERE o.id = a.opportunity_id AND (o.status = 'published' OR o.created_by = ${auth.userId})),
        'application_tasks', coalesce((SELECT jsonb_agg(t) FROM application_tasks t WHERE t.application_id = a.id AND t.user_id = ${auth.userId}), '[]'::jsonb)
      ) ORDER BY a.updated_at DESC) FROM applications a WHERE a.user_id = ${auth.userId}), '[]'::jsonb) AS applications`;
    const { rewards, applications } = rows[0];
    const profile = auth.profile || null;
    const apps = applications as JourneyApplication[];
    const savedIds = new Set(apps.map(app => app.opportunity_id)), stages = new Map(apps.map(app => [app.opportunity_id, app.stage]));
    const savedItems = apps.filter(app => app.opportunities).map(app => buildForYouItem(app.opportunities, profile || undefined, [], [], savedIds, stages));
    return NextResponse.json({ profile, rewards, applications: apps, saved_items: savedItems, profile_completion: profileCompletion(profile), ...rewardSummary(rewards) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Progress could not be loaded. Please try again.' }, { status: 503 }); }
}
