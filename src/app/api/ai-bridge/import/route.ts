import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { requireAuth } from '@/lib/api-auth';
import { parseExternalAIResponse } from '@/lib/ai-bridge/parser';
import { checkDuplicateOpportunity } from '@/opportunity-sources/dedupe/deduplicator';
import { assessOpportunityVerification } from '@/opportunity-sources/verification/verifier';
import { sanitizeOpportunity } from '@/lib/catalogue/validation';
import { Opportunity } from '@/types/database';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { rawText, saveSelected, selectedOpportunities } = body;

    const supabase = await createClient();

    // If saving selected opportunities
    if (saveSelected && Array.isArray(selectedOpportunities)) {
      if (!selectedOpportunities.length || selectedOpportunities.length > 50) return NextResponse.json({ error: 'Select between 1 and 50 opportunities.' }, { status: 400 });
      const drafts = selectedOpportunities.map(opp => {
        const clean = sanitizeOpportunity(opp);
        if (!clean.title) throw new Error('Each opportunity needs a title.');
        return { ...clean, created_by: auth.userId, status: 'draft', publication_status: 'draft', last_verified_at: null, source_status: 'unknown', source_label: 'user_provided', is_demo: false };
      });
      const savedIds: string[] = [];

      for (const draft of drafts) {
        const { data: saved, error } = await supabase.from('opportunities').insert(draft).select('id').single();
        if (error || !saved) {
          return NextResponse.json({ error: error?.message || 'Failed to save opportunity', savedCount: savedIds.length, savedIds }, { status: 500 });
        }
        const { error: applicationError } = await supabase.from('applications').upsert({ user_id: auth.userId, opportunity_id: saved.id, stage: 'saved' }, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true });
        if (applicationError) return NextResponse.json({ error: 'Draft saved, but it could not be added to your applications.', savedIds }, { status: 500 });
        savedIds.push(saved.id);
      }

      return NextResponse.json({ success: true, savedCount: savedIds.length, savedIds });
    }

    // Otherwise parse response
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText is required for parsing' }, { status: 400 });
    }

    const { candidates, suggestedProfileUpdates, rawDetectedCount } = parseExternalAIResponse(rawText);

    // Fetch existing opportunities for dedupe
    const { data, error } = await supabase.from('opportunities').select('*').limit(100);
    if (error) throw error;
    const existing: Opportunity[] = data || [];

    // Process each candidate with dedupe and verification assessment
    const processedCandidates = candidates.map((cand) => {
      const dupCheck = checkDuplicateOpportunity(cand, existing);
      const verification = assessOpportunityVerification(cand);

      return {
        ...cand,
        is_duplicate: dupCheck.isDuplicate,
        duplicate_reason: dupCheck.reason,
        verification_assessment: verification,
      };
    });

    return NextResponse.json({
      candidates: processedCandidates,
      suggestedProfileUpdates,
      rawDetectedCount,
    });
  } catch (err) {
    console.error('AI Bridge import error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI Bridge import failed' },
      { status: 500 }
    );
  }
}
