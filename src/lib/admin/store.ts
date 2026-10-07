import type { Opportunity, Profile, AdminRole, SystemSettings, QualityReport, AdminSourceRecord } from '@/types/database';
import { createSql } from '@/lib/db/service';
import { sanitizeOpportunity, reviewPublication } from '@/lib/catalogue/validation';
import { logAdminAction } from './audit';
import { getAllSources } from '@/opportunity-sources/registry';
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  feature_flags: {
    enable_ai_extraction: true,
    enable_notifications: true,
    enable_scout_search: true,
    enable_payments: false,
    collection_kill_switch: false,
    notification_kill_switch: false,
  },
  ranking_weights: {
    fit: 40,
    eligibility: 35,
    evidence: 15,
    freshness: 10,
  },
  country_rules: {
    us_include_eligible_international: true,
    auto_include_remote_global: false,
    require_explicit_citizenship_match: true,
  },
  featured_opportunity_ids: [],
};

export async function getAdminOpportunities(params: { search?: string; category?: string; country?: string; status?: string; page?: number; limit?: number }): Promise<{ opportunities: Opportunity[]; total: number }> {
  const sql = createSql();
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (Math.max(1, params.page || 1) - 1) * limit;
  const filters: string[] = [];
  const values: (string | number)[] = [];
  for (const [column, value, match] of [
    ['title', params.search, true], ['location', params.country === 'all' ? undefined : params.country, true],
    ['category', params.category === 'all' ? undefined : params.category, false], ['status', params.status === 'all' ? undefined : params.status, false],
  ] as const) if (value) { values.push(match ? `%${value.slice(0, 200)}%` : value); filters.push(`${column} ${match ? 'ILIKE' : '='} $${values.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await sql.query(`SELECT count(*)::int AS total FROM opportunities ${where}`, values);
  const rows = await sql.query(`SELECT * FROM opportunities ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values,limit,offset]);
  return { opportunities: rows as Opportunity[], total: count[0].total };
}

export async function createOpportunity(input: Partial<Opportunity>, adminId: string, adminEmail: string): Promise<Opportunity> {
  const clean = sanitizeOpportunity(input as Record<string, unknown>, true);
  if (!clean.title) throw new Error('Title is required');
  clean.status ||= 'draft';
  clean.publication_status = clean.status;
  const record = { ...clean, ...reviewPublication(input as Record<string, unknown>, clean), created_by: adminId, is_demo: false, source_status: clean.status === 'published' ? 'live' : 'unknown', updated_at: new Date().toISOString() };
  const columns = Object.keys(record);
  // Column names come only from the sanitizer and fixed server fields.
  const sql = createSql();
  const rows = await sql.query(`INSERT INTO opportunities (${columns.map(key => `"${key}"`).join(',')}) SELECT ${columns.map(key => `r."${key}"`).join(',')} FROM jsonb_populate_record(NULL::opportunities, $1::jsonb) r RETURNING *`, [JSON.stringify(record)]);
  const data = rows[0] as Opportunity;
  await logAdminAction({ adminId, adminEmail, action: 'create_opportunity', targetType: 'opportunity', targetId: data.id });
  return data;
}

export async function updateOpportunity(id: string, input: Partial<Opportunity>, adminId: string, adminEmail: string): Promise<boolean> {
  const sql = createSql();
  const current = (await sql`SELECT * FROM opportunities WHERE id = ${id}`)[0];
  if (!current) throw new Error('Opportunity not found');
  const clean = sanitizeOpportunity(input as Record<string, unknown>, true);
  const merged = { ...current, ...clean };
  const verification = merged.status === 'published' ? reviewPublication(input as Record<string, unknown>, merged) : { last_verified_at: null };
  const record = { ...clean, ...verification, updated_at: new Date().toISOString() };
  const columns = Object.keys(record);
  await sql.query(`UPDATE opportunities SET ${columns.map(key => `"${key}" = r."${key}"`).join(',')} FROM jsonb_populate_record(NULL::opportunities, $1::jsonb) r WHERE opportunities.id = $2`, [JSON.stringify(record), id]);
  await logAdminAction({ adminId, adminEmail, action: 'update_opportunity', targetType: 'opportunity', targetId: id });
  return true;
}

export async function archiveOpportunity(id: string, adminId: string, adminEmail: string) {
  return updateOpportunity(id, { status: 'archived' }, adminId, adminEmail);
}

export async function mergeOpportunities(_primaryId: string, _duplicateId: string, _adminId: string, _adminEmail: string): Promise<boolean> {
  throw new Error('Merge is disabled to preserve existing application work. Archive duplicates after review instead.');
}

export async function getAdminSources(): Promise<AdminSourceRecord[]> {
  const data = await createSql()`SELECT * FROM admin_sources ORDER BY name` as AdminSourceRecord[];
  if (data?.length) return data;
  return getAllSources().map(source => ({ id: source.id, name: source.name, type: source.type, official_domain: source.official_domain,
    category: source.category, country: source.country || 'Unknown', default_mode: source.default_mode, is_verified: false,
    is_enabled: false, refresh_interval_days: source.refresh_interval_days, last_run_at: null, last_status: 'never_run' as const,
    error_count: 0, metadata: {}, created_at: '' }));
}

export async function getQualityReports(): Promise<QualityReport[]> {
  const data = await createSql()`SELECT * FROM quality_reports ORDER BY created_at DESC LIMIT 100` as QualityReport[];
  return data || [];
}
export async function resolveQualityReport(id: string, resolution: 'resolved' | 'ignored', adminId: string, adminEmail: string) {
  await createSql()`UPDATE quality_reports SET status = ${resolution}, resolved_by = ${adminId}, resolved_at = now() WHERE id = ${id}`;
  await logAdminAction({ adminId, adminEmail, action: 'resolve_quality_report', targetType: 'quality_report', targetId: id });
  return true;
}

export async function getAdminUsers(search?: string): Promise<(Profile & { email?: string; application_count?: number })[]> {
  return await createSql()`SELECT p.*, u.email, (SELECT count(*)::int FROM applications app WHERE app.user_id = p.id) AS application_count
    FROM profiles p JOIN auth.users u ON u.id = p.id WHERE (${search || null}::text IS NULL OR p.display_name ILIKE ${`%${(search || '').slice(0,100)}%`}) LIMIT 50` as (Profile & { email?: string; application_count?: number })[];
}
export async function updateUserRole(userId: string, role: AdminRole, adminId: string, adminEmail: string) {
  if (!['owner','admin','editor','user'].includes(role) || userId === adminId) throw new Error('Invalid role or self-role change');
  const sql = createSql();
  const current = (await sql`SELECT role FROM profiles WHERE id = ${userId}`)[0];
  if (!current) throw new Error('User not found');
  if (current.role === 'owner') throw new Error('Owner role changes require a manual account handoff.');
  await sql`UPDATE profiles SET role = ${role}, is_admin = ${['owner','admin'].includes(role)} WHERE id = ${userId}`;
  await logAdminAction({ adminId, adminEmail, action: 'update_user_role', targetType: 'user', targetId: userId, details: { role } });
  return true;
}
export async function toggleUserSuspension(userId: string, suspended: boolean, adminId: string, adminEmail: string) {
  if (userId === adminId) throw new Error('Cannot suspend your own administrator account');
  const sql = createSql();
  const current = (await sql`SELECT role FROM profiles WHERE id = ${userId}`)[0];
  if (!current) throw new Error('User not found');
  if (current.role === 'owner') throw new Error('Owner account cannot be suspended here');
  await sql`UPDATE profiles SET is_suspended = ${suspended} WHERE id = ${userId}`;
  await logAdminAction({ adminId, adminEmail, action: suspended ? 'suspend_user' : 'reactivate_user', targetType: 'user', targetId: userId });
  return true;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const data = (await createSql()`SELECT value FROM system_settings WHERE key = 'system'`)[0];
  return { ...DEFAULT_SYSTEM_SETTINGS, ...data?.value, feature_flags: { ...DEFAULT_SYSTEM_SETTINGS.feature_flags, ...data?.value?.feature_flags } };
}
export async function updateSystemSettings(updates: Partial<SystemSettings>, adminId: string, adminEmail: string) {
  if (updates.ranking_weights || updates.country_rules || updates.featured_opportunity_ids) throw new Error('Ranking and eligibility rules are fixed for this release. Only feature switches can be changed.');
  const current = await getSystemSettings();
  const flags = updates.feature_flags || {};
  for (const [key, value] of Object.entries(flags)) if (!(key in current.feature_flags) || typeof value !== 'boolean') throw new Error('Invalid feature switch');
  const settings = { ...current, feature_flags: { ...current.feature_flags, ...flags } };
  await createSql()`INSERT INTO system_settings (key,value,updated_by,updated_at) VALUES ('system',${JSON.stringify(settings)}::jsonb,${adminId},now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`;
  await logAdminAction({ adminId, adminEmail, action: 'update_system_settings', targetType: 'settings' });
  return settings;
}

export async function getAdminCoverageAnalytics() {
  const sql = createSql();
  const opps = await sql`SELECT * FROM opportunities` as Opportunity[];
  const categoryBreakdown: Record<string, number> = {}, countryBreakdown: Record<string, number> = {};
  for (const opp of opps) { const category = opp.category || 'other', country = opp.location || 'Unknown'; categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1; countryBreakdown[country] = (countryBreakdown[country] || 0) + 1; }
  const fresh = opps.filter(opp => opp.last_verified_at && Date.parse(opp.last_verified_at) > Date.now() - 7 * 86400000 && (!opp.source_changed_at || Date.parse(opp.source_changed_at) <= Date.parse(opp.last_verified_at)));
  const runs = await sql`SELECT query_text FROM scout_runs WHERE result_count = 0 LIMIT 100`;
  const zeroCounts = new Map<string, number>();
  for (const run of runs || []) zeroCounts.set(run.query_text, (zeroCounts.get(run.query_text) || 0) + 1);
  return { totalOpportunities: opps.length, publishedCount: opps.filter(opp => opp.status === 'published').length, draftCount: opps.filter(opp => opp.status === 'draft').length, archivedCount: opps.filter(opp => opp.status === 'archived').length,
    categoryBreakdown, countryBreakdown, participationBreakdown: { remote: opps.filter(opp => opp.participation_mode === 'remote').length, inPerson: opps.filter(opp => opp.participation_mode === 'in-person').length, hybrid: opps.filter(opp => opp.participation_mode === 'hybrid').length },
    freshnessScore: opps.length ? Math.round(fresh.length * 100 / opps.length) : 0, staleRecordsCount: opps.length - fresh.length,
    openDeadlinesCount: opps.filter(opp => opp.status === 'published' && opp.source_status === 'live' && opp.deadline && Date.parse(opp.deadline) > Date.now()).length,
    zeroResultSearches: Array.from(zeroCounts, ([query, count]) => ({ query, count })) };
}
