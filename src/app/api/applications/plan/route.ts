import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { requireAuth } from '@/lib/api-auth';
import { GeneratedApplicationPlan, Opportunity, Profile } from '@/types/database';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { opportunity_id } = body;

    if (!opportunity_id) {
      return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: oData, error: opportunityError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .maybeSingle();
    if (opportunityError) throw opportunityError;
    const opp: Opportunity | null = oData;

    const { data: pData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    const profile: Partial<Profile> | null = pData;

    if (!opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const questions = opp.application_questions || [];

    // Construct intelligent plan
    const supported_from_profile: { requirement: string; evidence_title: string }[] = [];
    const requires_new_input: string[] = [];
    const documents_to_upload: string[] = [];

    // Deterministic pass
    documents_to_upload.push('Resume / CV', 'Official Transcript');

    if (profile?.skills && profile.skills.length > 0) {
      supported_from_profile.push({
        requirement: 'Demonstrated technical competency',
        evidence_title: `Self-reported Skills: ${profile.skills.slice(0, 4).join(', ')}`,
      });
    }

    if (profile?.target_roles && profile.target_roles.length > 0) {
      supported_from_profile.push({
        requirement: 'Career alignment and domain focus',
        evidence_title: `Target Roles: ${profile.target_roles.join(', ')}`,
      });
    }

    if (questions.length > 0) {
      for (const q of questions) {
        requires_new_input.push(q);
      }
    } else {
      requires_new_input.push('Statement of purpose / motivation letter', 'Project portfolio links');
    }

    const defaultOverview = `Plan created for ${opp.title} (${opp.organizer}). Identified ${supported_from_profile.length} areas supported directly by your profile facts, ${requires_new_input.length} required written responses, and ${documents_to_upload.length} documents.`;

    const suggested_tasks = [
      { title: 'Prepare & tailor Resume/CV for this role', due_days_before_deadline: 5 },
      { title: 'Draft and review core application essay answers', due_days_before_deadline: 3 },
      { title: 'Complete final submission on official portal', due_days_before_deadline: 1 },
    ];

    const plan: GeneratedApplicationPlan = {
      opportunity_id,
      overview: defaultOverview,
      supported_from_profile,
      requires_new_input,
      documents_to_upload,
      organizer_clarifications: [],
      suggested_tasks,
    };

    return NextResponse.json({ plan });
  } catch (err) {
    console.error('Plan generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Plan generation failed' },
      { status: 500 }
    );
  }
}
