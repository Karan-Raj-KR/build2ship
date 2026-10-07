import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createClient } from '@/lib/db/server';
import { validateNotificationSettings } from '@/lib/notifications/settings';

export async function GET() {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const db = await createClient();
    const { data, error } = await db.from('notification_preferences').select('in_app_enabled,email_enabled,frequency,timezone,deadline_reminder_days,digest_day,digest_time').eq('user_id', auth.userId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ preferences: data || { in_app_enabled: true, email_enabled: false, frequency: 'weekly', timezone: 'UTC', digest_day: 0, digest_time: '09:00', deadline_reminder_days: [7,3,1] } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Preferences unavailable' }, { status: 500 }); }
}
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  try {
    const input = validateNotificationSettings(await request.json());
    const db = await createClient();
    const { error } = await db.from('notification_preferences').upsert({ user_id: auth.userId, ...input, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Preferences could not be saved' }, { status: 400 }); }
}
