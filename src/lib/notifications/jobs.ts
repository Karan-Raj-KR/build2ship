import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createSql } from '@/lib/db/service';
import { rankAndExplainOpportunities } from '@/lib/scout/engine';
import { getSystemSettings } from '@/lib/admin/store';
import { APP_URL } from '@/config/app';
import { sendEmail } from './email';
import { analyzeFreshness } from '@/opportunity-sources/freshness';
import type { Opportunity, Profile, SavedSearch } from '@/types/database';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

export function cronAuthorized(request: NextRequest) {
  return Boolean(process.env.CRON_SECRET && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`);
}

export async function runAlerts(request: NextRequest, mode: 'deadline' | 'digest' | 'scout') {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized cron execution' }, { status: 401 });
  try {
    const settings = await getSystemSettings();
    if (!settings.feature_flags.enable_notifications || settings.feature_flags.notification_kill_switch) return NextResponse.json({ disabled: true });
    const sql = createSql();
    const [profiles, opportunityRows, preferences] = await Promise.all([
      sql`SELECT * FROM profiles WHERE is_suspended = false AND onboarding_completed = true`,
      sql`SELECT * FROM opportunities WHERE status = 'published' LIMIT 1000`,
      sql`SELECT * FROM notification_preferences`,
    ]);
    const opportunities = (opportunityRows as Opportunity[]).filter(opp => !opp.is_demo && opp.source_status === 'live'
      && !!opp.official_url && !!opp.source_evidence && !analyzeFreshness(opp.last_verified_at, opp.source_changed_at).isStale
      && (!opp.deadline || (opp.timezone_known && Date.parse(opp.deadline) > Date.now())));
    const slots = mode === 'digest' ? await sql`SELECT * FROM due_digest_slots()` : [];
    let queued = 0;
    for (const profile of (profiles || []) as Profile[]) {
      const preference = preferences?.find(row => row.user_id === profile.id);
      const slot = slots.find(row => row.user_id === profile.id);
      if (mode === 'digest' && !slot) continue;
      const inApp = preference?.in_app_enabled ?? true;
      const email = preference?.email_enabled === true;
      if (!inApp && !email) continue;
      const account = (await sql`SELECT u.email FROM auth.users u WHERE u.id = ${profile.id} AND u.email_confirmed_at IS NOT NULL`)[0];
      const recipient = account?.email;
      const pass = (await sql`SELECT id FROM payment_passes WHERE user_id = ${profile.id} AND status = 'active' AND expires_at > now() LIMIT 1`)[0];
      const paid = Boolean(pass);
      const unsubscribe = `${APP_URL}/api/notifications/unsubscribe?token=${preference?.unsubscribe_token}`;
      const link = (opp: Opportunity) => `${APP_URL}/opportunities/${opp.id}`;
      const emit = async (eventKey: string, title: string, text: string, selected: Opportunity[], type: 'deadline' | 'new_match') => {
        if (inApp) {
          await sql`INSERT INTO user_notifications (user_id,event_key,title,message,type,link_url,metadata)
            VALUES (${profile.id},${eventKey},${title},${text},${type},${selected.length === 1 ? `/opportunities/${selected[0].id}` : '/for-you'},${JSON.stringify({ opportunity_id: selected[0]?.id })}::jsonb)
            ON CONFLICT (user_id,event_key) DO NOTHING RETURNING id`;
        }
        if (email && recipient && preference?.unsubscribe_token) {
          const html = `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p>${selected.map(opp => `<h2><a href="${escapeHtml(link(opp))}">${escapeHtml(opp.title)}</a></h2><p>${escapeHtml(opp.funding_description || 'Funding coverage is unknown.')} · ${escapeHtml(opp.deadline || 'Deadline needs checking')}</p><p>Review eligibility and remaining unknowns before applying.</p>`).join('')}<p><a href="${escapeHtml(unsubscribe)}">Unsubscribe</a> · <a href="${APP_URL}/settings">Email preferences</a></p>`;
          const inserted = await sql`INSERT INTO email_deliveries (user_id,event_key,recipient,subject,html,body_text,preference_version,opportunity_ids)
            SELECT ${profile.id},${eventKey},${recipient},${title},${html},${`${text}\n${selected.map(opp => `${opp.title}\n${link(opp)}`).join('\n')}\nUnsubscribe: ${unsubscribe}`},${mode === 'digest' ? slot?.preference_version : null},${selected.map(opp => opp.id)}::uuid[]
            FROM notification_preferences WHERE user_id = ${profile.id} AND email_enabled
              AND (${mode !== 'digest'} OR schedule_changed_at = ${slot?.preference_version || null})
            ON CONFLICT (user_id,event_key) DO NOTHING RETURNING id`;
          queued += inserted.length;
        }
      };
      if (mode === 'deadline') {
        const apps = await sql`SELECT opportunity_id,stage FROM applications WHERE user_id = ${profile.id} AND stage IN ('saved','preparing')`;
        for (const app of apps || []) {
          const opp = (opportunities as Opportunity[] || []).find(row => row.id === app.opportunity_id);
          if (!opp?.deadline || opp.source_status === 'closed') continue;
          const remaining = Date.parse(opp.deadline) - Date.now();
          if (remaining <= 0) continue;
          const days = Math.ceil(remaining / 86400000);
          const threshold = [...(preference?.deadline_reminder_days || [7,3,1])].sort((a: number,b: number) => a-b).find((day: number) => days <= day);
          if (!threshold) continue;
          await emit(`deadline:${opp.id}:${opp.deadline}:${threshold}`, `Deadline reminder: ${opp.title}`, `The stored deadline is ${opp.deadline}. Confirm the provider's exact deadline and timezone.`, [opp], 'deadline');
        }
      } else if (mode === 'scout') {
        if (!paid) continue;
        const searches = await sql`SELECT * FROM saved_searches WHERE user_id = ${profile.id} AND notify_new_matches = true`;
        for (const search of (searches || []) as SavedSearch[]) {
          const items = rankAndExplainOpportunities(opportunities || [], profile, search.structured_query).rankedItems.filter(item => item.explanation.eligibility_verdict === 'likely_eligible');
          for (const item of items.slice(0, 3)) await emit(`search:${search.id}:${item.opportunity.id}:${item.opportunity.edition_year || item.opportunity.deadline || 'rolling'}`, `A match for ${search.name}`, 'A stored programme matches your known requirements. Check any remaining funding and deadline details.', [item.opportunity], 'new_match');
        }
      } else {
        const ranking = rankAndExplainOpportunities(opportunities || [], profile, { categories: profile.opportunity_types as never });
        const selected = ranking.rankedItems.filter(item => item.explanation.eligibility_verdict !== 'likely_ineligible' && item.explanation.match_tier !== 'skip').slice(0, 5).map(item => item.opportunity);
        if (selected.length) await emit(slot!.event_key, 'Your Elara opportunity shortlist', 'These recently reviewed programmes may fit your profile. Review blockers and missing information before applying.', selected, 'new_match');
      }
    }
    const deliveries = await flushEmails();
    return NextResponse.json({ success: true, queuedAttempts: queued, ...deliveries });
  } catch { return NextResponse.json({ error: 'Alert job failed; check private operational logs.' }, { status: 500 }); }
}

export async function flushEmails() {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) return { sent: 0, failed: 0, held: 'Email provider is not configured' };
  const sql = createSql();
  const data = await sql`SELECT * FROM claim_email_batch()`;
  let sent = 0, failed = 0;
  for (const delivery of data || []) {
    const preference = (await sql`SELECT n.email_enabled, n.schedule_changed_at, u.email FROM notification_preferences n
      JOIN profiles p ON p.id = n.user_id AND NOT p.is_suspended
      JOIN auth.users u ON u.id = p.id AND u.email_confirmed_at IS NOT NULL
      WHERE n.user_id = ${delivery.user_id}`)[0];
    const stale = delivery.opportunity_ids?.length ? (await sql`SELECT count(*)::integer AS count FROM opportunities
      WHERE id = ANY(${delivery.opportunity_ids}::uuid[]) AND status = 'published' AND publication_status = 'published'
        AND NOT is_demo AND source_status = 'live' AND official_url IS NOT NULL AND source_evidence IS NOT NULL
        AND last_verified_at >= now() - interval '7 days' AND last_verified_at <= now()
        AND (source_changed_at IS NULL OR source_changed_at <= last_verified_at)
        AND (deadline IS NULL OR (timezone_known AND deadline > now()))`)[0]?.count !== delivery.opportunity_ids.length : delivery.event_key?.startsWith('digest:');
    if (!preference?.email_enabled || !preference.email || stale || (delivery.preference_version
      && new Date(preference.schedule_changed_at).getTime() !== new Date(delivery.preference_version).getTime())) {
      await sql`UPDATE email_deliveries SET status = 'cancelled' WHERE id = ${delivery.id}`;
      continue;
    }
    const result = await sendEmail({ to: preference.email, subject: delivery.subject, html: delivery.html, text: delivery.body_text, idempotencyKey: delivery.id });
    await sql`UPDATE email_deliveries SET recipient = ${preference.email}, status = ${result.sent ? 'sent' : result.uncertain ? 'uncertain' : 'failed'},
      sent_at = ${result.sent ? new Date().toISOString() : null}, provider_message_id = ${result.messageId || null},
      last_error = ${result.warning || null}, next_attempt_at = ${new Date(Date.now() + Math.min(24 * 60, 2 ** delivery.attempts * 10) * 60000).toISOString()}
      WHERE id = ${delivery.id} AND status = 'sending' AND attempts = ${delivery.attempts}`;
    if (result.sent) sent++; else failed++;
  }
  return { sent, failed };
}
