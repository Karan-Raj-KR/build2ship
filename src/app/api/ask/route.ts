import { NextRequest, NextResponse } from 'next/server';
import { recommendationContext } from '@/lib/recommendations/context';
import { getForYouFeed } from '@/lib/recommendations/forYouEngine';
import { requireAuth } from '@/lib/api-auth';
import { UsageLimitError } from '@/lib/payments/entitlements';
import { chatCompletion, isAIConfigured } from '@/lib/ai/client';
import { computeDeterministicProfileInsights } from '@/lib/ai/profileAnalysis';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string' || message.length > 2000 || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const profile = auth.profile;
    const { opportunities, applications, evidence, feedback } = await recommendationContext(auth.userId);
    const feed = getForYouFeed({ opportunities, profile: profile || undefined, applications, evidence, feedback, limit: 5 });
    const topMatches = feed.items;
    const urgentDeadlines = topMatches.filter(item => item.deadline_urgency.is_urgent);
    const profileGaps = profile ? computeDeterministicProfileInsights(profile, evidence).actionable_gaps : [];

    // AI synthesis
    const systemPrompt = `You are the AI Opportunity Agent inside Elara.
You are grounded strictly in the user's saved, self-reported profile and evidence, database opportunities, and application statuses.
NEVER invent fake opportunities, deadlines, or user accomplishments.

USER CONTEXT:
- Citizenship: ${profile?.nationalities?.join(', ') || 'Not set'}
- Education: ${profile?.education_stage || 'Not set'} (Graduation: ${profile?.expected_graduation || 'Not set'})
- University: ${profile?.university || 'Not set'}
- Skills: ${profile?.skills?.join(', ') || 'None'}
- Target Roles: ${profile?.target_roles?.join(', ') || 'None'}
- Participation Preference: ${profile?.participation_preference || 'Flexible'}
- Paid Only: ${profile?.paid_only_preference ? 'Yes' : 'No'}

DATABASE & STATE:
- Total opportunities available: ${opportunities.length}
- Active applications tracking: ${applications.length}
- Top Recommended Opportunities: ${JSON.stringify(topMatches.map((m) => ({ title: m.title, fit: m.fit_score, why: m.relevance_explanation })))}
- Urgent Deadlines: ${JSON.stringify(urgentDeadlines.map((u) => ({ title: u.title, urgency: u.deadline_urgency.label })))}
- Profile Gaps Identified: ${JSON.stringify(profileGaps.slice(0, 3))}

Instructions:
1. Provide concise, direct, high-agency advice.
2. Directly reference specific opportunities from the context when relevant.
3. If the user asks what to apply to, recommend the highest fit and urgency opportunities.
4. If the user asks about profile gaps, mention their addressable gaps and concrete actions.`;

    const fallback = [
      `Start with your profile: ${profileGaps[0]?.action || 'add your citizenship, education, skills and interests so requirements can be checked.'}`,
      topMatches.length
        ? `Then review these catalogue matches (relevance is not confirmed eligibility):\n${topMatches.map(item => `- **${item.title}**: ${item.relevance_explanation} ${item.eligibility_summary.details}`).join('\n')}`
        : 'There are no suitable active catalogue matches yet. Try a broader Scout search or add missing profile details. The catalogue does not cover the whole web.',
      `Save a possibility in Discover, then choose Start preparation to work through its official requirements. You have ${applications.length} saved or active applications.`,
    ].join('\n\n');
    if (!isAIConfigured()) return NextResponse.json({ reply: fallback, topMatches, profileGaps, mode: 'catalogue_guidance', warning: 'AI is unavailable. This guidance uses your saved profile and catalogue.' });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.filter((item: { role?: string; content?: unknown }) => ['user','assistant'].includes(item?.role || '') && typeof item?.content === 'string').slice(-4).map((item: { role: 'user' | 'assistant'; content: string }) => ({ role: item.role, content: item.content.slice(0,2000) })),
      { role: 'user' as const, content: message },
    ];

    try {
      const reply = await chatCompletion({ userId: auth.userId!, messages, temperature: 0.3, maxTokens: 700, timeoutMs: 8000 });
      return NextResponse.json({ reply, topMatches, profileGaps, mode: 'ai' });
    } catch (error) {
      if (error instanceof UsageLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
      console.warn('Ask provider unavailable:', error instanceof Error ? error.message : 'Unknown provider error');
      return NextResponse.json({ reply: fallback, topMatches, profileGaps, mode: 'catalogue_guidance', warning: 'The AI provider is unavailable. Here is guidance from your saved profile and catalogue.' });
    }
  } catch (err) {
    console.error('Ask API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ask agent failed' },
      { status: 500 }
    );
  }
}
