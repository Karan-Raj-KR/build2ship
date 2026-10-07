import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { createSql } from '@/lib/db/service';
import { parseScoutQuery } from '@/lib/scout/queryParser';
import { rankAndExplainOpportunities } from '@/lib/scout/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query = '', filters = {} } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0 || query.length > 2000) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const arrayKeys = ['categories','topics','skills','target_countries','excluded_countries','remote_mode','education_levels','applicant_nationalities'];
    const booleanKeys = ['travel_willingness','paid_only'];
    const numberKeys = ['deadline_window_days','academic_year'];
    if (!filters || typeof filters !== 'object' || Array.isArray(filters) || Object.entries(filters).some(([key, value]) =>
      arrayKeys.includes(key) ? !Array.isArray(value) || value.length > 30 || value.some(item => typeof item !== 'string' || item.length > 100) :
      booleanKeys.includes(key) ? typeof value !== 'boolean' :
      numberKeys.includes(key) ? typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 365 : true
    )) return NextResponse.json({ error: 'Invalid search filters.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const profileResult = user?.email_confirmed_at
      ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      : { data: null, error: null };
    if (profileResult.error) return NextResponse.json({ error: 'Account verification is unavailable.' }, { status: 503 });
    const profile = profileResult.data;
    if (profile?.is_suspended) return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
    const { recommendationContext } = await import('@/lib/recommendations/context');
    const { opportunities, applications } = await recommendationContext(user?.id || null);
    const savedOppMap = new Map(applications.map(app => [app.opportunity_id, app.stage]));

    // 1. Parse natural language into structured query
    const structuredQuery = await parseScoutQuery(query, profile || undefined);
    const combinedQuery = { ...structuredQuery, ...filters };

    // 2. Rank and explain opportunities against stored catalogue
    const rankingResult = rankAndExplainOpportunities(opportunities, profile || undefined, combinedQuery);

    // Annotate ranked items with saved / application state
    const annotatedRankedItems = rankingResult.rankedItems.map((item) => {
      const stage = savedOppMap.get(item.opportunity.id);
      return {
        ...item,
        saved_state: Boolean(stage),
        application_state: stage || null,
      };
    });

    const runId = crypto.randomUUID();

    // 3. If authenticated, persist the authenticated Scout run
    if (user) {
      await createSql()`INSERT INTO scout_runs (id,user_id,query_text,structured_query,result_count,status)
        VALUES (${runId},${user.id},${query},${JSON.stringify(combinedQuery)}::jsonb,${rankingResult.rankedItems.length},'completed')`;

    }

    const response = NextResponse.json({
      runId,
      query,
      structuredQuery: combinedQuery,
      rankedItems: annotatedRankedItems,
      stats: rankingResult.stats,
      searchProvider: {
        providerUsed: 'stored_catalogue',
        isConfiguredExternal: false,
      },
    });

    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return response;
  } catch (err) {
    console.error('Error in /api/scout/query:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scout query failed' },
      { status: 500 }
    );
  }
}
