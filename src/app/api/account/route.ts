import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createAdminClient, createSql } from '@/lib/db/service';

export async function GET() {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const sql = createSql();
    const data: Record<string, unknown> = { exported_at: new Date().toISOString() };
    const tables: Record<string, string> = { profiles: 'id', profile_evidence: 'user_id', applications: 'user_id', application_tasks: 'user_id', application_answers: 'user_id', analysis_records: 'user_id', opportunity_collections: 'user_id', opportunity_collection_items: 'user_id', workspace_preferences: 'user_id', workspace_milestones: 'user_id', profile_insights: 'user_id', scout_runs: 'user_id', saved_searches: 'user_id', recommendation_feedback: 'user_id', user_notifications: 'user_id', notification_preferences: 'user_id', push_subscriptions: 'user_id', progress_rewards: 'user_id', payment_passes: 'user_id', payment_orders: 'user_id', ai_usage: 'user_id', analytics_events: 'user_id', opportunities: 'created_by', imported_opportunities: 'created_by', email_deliveries: 'user_id', quality_reports: 'reported_by' };
    await Promise.all(Object.entries(tables).map(async ([table, column]) => {
      // Identifiers come only from the fixed export table map above.
      data[table] = await sql.query(`SELECT * FROM "${table}" WHERE "${column}" = $1`, [auth.userId]);
    }));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="elara-export.json"' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed; no partial export was presented as complete.' }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  const body = await request.json();
  if (body.confirmation !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  try {
    const sql = createSql();
    const profile = (await sql`SELECT * FROM profiles WHERE id = ${auth.userId}`)[0];
    if (profile?.role === 'owner' || profile?.is_admin) return NextResponse.json({ error: 'Transfer administrator access before deleting this account.' }, { status: 409 });
    const { error } = await createAdminClient().auth.admin.deleteUser(auth.userId!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Account could not be deleted.' }, { status: 500 }); }
}
