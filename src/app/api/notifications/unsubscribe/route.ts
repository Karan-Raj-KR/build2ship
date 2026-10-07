import { NextRequest, NextResponse } from 'next/server';
import { createSql } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) return new Response('Invalid unsubscribe link.', { status: 400 });
  // GET only displays confirmation so email scanners cannot silently change preferences.
  return new Response(`<html><head><title>Email preferences</title></head><body><h1>Stop Elara emails</h1><form method="post"><input type="hidden" name="token" value="${token}"><button>Unsubscribe from all opportunity emails</button></form></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get('token') || '');
  if (!/^[a-f0-9-]{36}$/i.test(token)) return new Response('Invalid unsubscribe link.', { status: 400 });
  try {
    const sql = createSql();
    const data = (await sql`UPDATE notification_preferences SET email_enabled = false, updated_at = now() WHERE unsubscribe_token = ${token} RETURNING user_id`)[0];
    if (!data) return new Response('Unsubscribe link is invalid or unavailable.', { status: 400 });
    await sql`UPDATE email_deliveries SET status = 'cancelled' WHERE user_id = ${data.user_id} AND status IN ('pending','failed')`;
    return new Response('You are unsubscribed. You can enable emails again in Settings.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch { return NextResponse.json({ error: 'Could not unsubscribe; please try again.' }, { status: 503 }); }
}
