import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { requireAuth } from '@/lib/api-auth';
import { RecommendationAction } from '@/types/database';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { opportunity_id, action, reason } = body;

    if (!opportunity_id || !action) {
      return NextResponse.json({ error: 'opportunity_id and action are required' }, { status: 400 });
    }

    const validActions: RecommendationAction[] = [
      'interested',
      'not_interested',
      'not_relevant',
      'already_knew',
      'not_eligible',
      'applied',
      'hide',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid recommendation action' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: feedback, error } = await supabase.from('recommendation_feedback').insert({
      user_id: auth.userId,
      opportunity_id,
      action,
      reason: reason || null,
    }).select().single();
    if (error || !feedback) {
      throw new Error(error?.message || 'Failed to record feedback');
    }

    return NextResponse.json({ success: true, feedback });
  } catch (err) {
    console.error('Feedback API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record feedback' },
      { status: 500 }
    );
  }
}
