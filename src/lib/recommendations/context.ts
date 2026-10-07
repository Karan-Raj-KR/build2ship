import 'server-only';
import type { Opportunity, ProfileEvidence, RecommendationFeedback } from '@/types/database';

// Call after authorization. Every private subquery is explicitly owner-scoped.
export async function recommendationContext(userId: string | null) {
  if (process.env.SUPABASE_DB_URL) {
    try {
      const { createSql } = await import('@/lib/db/service');
      const rows = await createSql()`SELECT
        coalesce((SELECT jsonb_agg(o) FROM (SELECT * FROM opportunities
          WHERE status = 'published' AND publication_status = 'published'
            AND NOT is_demo AND source_status = 'live'
            AND (deadline IS NULL OR deadline > now() - interval '30 days')
          ORDER BY created_at DESC LIMIT 200) o), '[]'::jsonb) AS opportunities,
        coalesce((SELECT jsonb_agg(e) FROM profile_evidence e WHERE user_id = ${userId}), '[]'::jsonb) AS evidence,
        coalesce((SELECT jsonb_agg(f) FROM recommendation_feedback f WHERE user_id = ${userId}), '[]'::jsonb) AS feedback,
        coalesce((SELECT jsonb_agg(jsonb_build_object('opportunity_id', opportunity_id, 'stage', stage))
          FROM applications WHERE user_id = ${userId}), '[]'::jsonb) AS applications`;
      const result = rows[0] as {
        opportunities: Opportunity[]; evidence: ProfileEvidence[]; feedback: RecommendationFeedback[];
        applications: { opportunity_id: string; stage: string }[];
      };
      if (result && Array.isArray(result.opportunities) && result.opportunities.length > 0) {
        return result;
      }
    } catch (err) {
      console.warn('createSql failed in recommendationContext, falling back to Supabase client:', err);
    }
  }

  // Fallback to Supabase PostgREST client
  try {
    const { createClient } = await import('@/lib/db/server');
    const supabase = await createClient();

    const [oppsRes, evRes, fbRes, appsRes] = await Promise.all([
      supabase.from('opportunities').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(200),
      userId ? supabase.from('profile_evidence').select('*').eq('user_id', userId) : Promise.resolve({ data: [] }),
      userId ? supabase.from('recommendation_feedback').select('*').eq('user_id', userId) : Promise.resolve({ data: [] }),
      userId ? supabase.from('applications').select('opportunity_id, stage').eq('user_id', userId) : Promise.resolve({ data: [] }),
    ]);

    const opportunities = (oppsRes.data as Opportunity[]) || [];
    const evidence = (evRes.data as ProfileEvidence[]) || [];
    const feedback = (fbRes.data as RecommendationFeedback[]) || [];
    const applications = (appsRes.data as Array<{ opportunity_id: string; stage: string }>) || [];

    if (opportunities.length > 0) {
      return { opportunities, evidence, feedback, applications };
    }
  } catch (err) {
    console.warn('Supabase PostgREST query failed in recommendationContext:', err);
  }

  // Graceful fallback to verified catalogue snapshot
  const { DEMO_REAL_OPPORTUNITIES } = await import('@/lib/demo/data');
  const { importedToOpportunity } = await import('@/lib/demo/store');
  return {
    opportunities: DEMO_REAL_OPPORTUNITIES.map(importedToOpportunity),
    evidence: [],
    feedback: [],
    applications: [],
  };
}
