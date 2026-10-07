import 'server-only';
import { createSql } from '@/lib/db/service';
import type { Opportunity, ProfileEvidence, RecommendationFeedback } from '@/types/database';

// Call after authorization. Every private subquery is explicitly owner-scoped.
export async function recommendationContext(userId: string | null) {
  const rows = await createSql()`SELECT
    coalesce((SELECT jsonb_agg(o) FROM (SELECT * FROM opportunities
      WHERE status = 'published' AND publication_status = 'published'
        AND NOT is_demo AND source_status = 'live' AND official_url IS NOT NULL AND source_evidence IS NOT NULL
        AND last_verified_at >= now() - interval '7 days' AND last_verified_at <= now()
        AND (source_changed_at IS NULL OR source_changed_at <= last_verified_at)
        AND (deadline IS NULL OR (timezone_known AND deadline > now()))
      ORDER BY created_at DESC LIMIT 200) o), '[]'::jsonb) AS opportunities,
    coalesce((SELECT jsonb_agg(e) FROM profile_evidence e WHERE user_id = ${userId}), '[]'::jsonb) AS evidence,
    coalesce((SELECT jsonb_agg(f) FROM recommendation_feedback f WHERE user_id = ${userId}), '[]'::jsonb) AS feedback,
    coalesce((SELECT jsonb_agg(jsonb_build_object('opportunity_id', opportunity_id, 'stage', stage))
      FROM applications WHERE user_id = ${userId}), '[]'::jsonb) AS applications`;
  return rows[0] as {
    opportunities: Opportunity[]; evidence: ProfileEvidence[]; feedback: RecommendationFeedback[];
    applications: { opportunity_id: string; stage: string }[];
  };
}
