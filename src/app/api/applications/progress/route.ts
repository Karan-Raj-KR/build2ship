import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createClient } from '@/lib/db/server';
import { createSql } from '@/lib/db/service';
import { isClosedOrExpired } from '@/lib/opportunityStatus';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const { opportunity_id, action } = await request.json();
    if (typeof opportunity_id !== 'string' || !['save','unsave','prepare'].includes(action)) return NextResponse.json({ error: 'Choose an opportunity and supported action.' }, { status: 400 });
    const sql = createSql();
    if (action === 'unsave') {
      const data = await sql`DELETE FROM applications WHERE user_id = ${auth.userId} AND opportunity_id = ${opportunity_id} AND stage = 'saved' RETURNING id`;
      if (!data?.length) return NextResponse.json({ error: 'Active application work is preserved. Manage it from Applications.' }, { status: 409 });
      return NextResponse.json({ success: true });
    }
    const opp = (await sql`SELECT id,deadline,source_status FROM opportunities WHERE id = ${opportunity_id} AND (status = 'published' OR created_by = ${auth.userId})`)[0];
    if (!opp) return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 });
    if (isClosedOrExpired(opp.deadline, opp.source_status)) return NextResponse.json({ error: 'This listing is closed or past its deadline.' }, { status: 409 });
    if (action === 'prepare') {
      const db = await createClient();
      const { data: id, error } = await db.rpc('start_preparation', { p_opportunity_id: opportunity_id });
      if (error) throw error;
      return NextResponse.json({ application_id: id });
    }
    const rows = await sql`WITH inserted AS (
      INSERT INTO applications (user_id,opportunity_id,stage) VALUES (${auth.userId},${opportunity_id},'saved')
      ON CONFLICT (user_id,opportunity_id) DO NOTHING RETURNING id
    ) SELECT id FROM inserted UNION ALL SELECT id FROM applications
      WHERE user_id = ${auth.userId} AND opportunity_id = ${opportunity_id} LIMIT 1`;
    if (!rows[0]) throw new Error('Please retry saving this opportunity.');
    return NextResponse.json({ application_id: rows[0].id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Your progress could not be saved.' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const { task_id, completed } = await request.json();
    if (typeof task_id !== 'string' || typeof completed !== 'boolean') return NextResponse.json({ error: 'Choose a checklist item and completion state.' }, { status: 400 });
    const task = (await createSql()`UPDATE application_tasks SET completed = ${completed}, updated_at = now() WHERE id = ${task_id} AND user_id = ${auth.userId} RETURNING *`)[0];
    if (!task) return NextResponse.json({ error: 'Checklist item not found.' }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Checklist could not be saved.' }, { status: 500 }); }
}
