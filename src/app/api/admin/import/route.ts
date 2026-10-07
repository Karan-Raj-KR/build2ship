import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/api-auth';
import { createSql } from '@/lib/db/service';
import { parsePastedOpportunityList } from '@/lib/catalogue/paste-list';

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner','admin','editor']); if (auth.error) return auth.error;
  try {
    const body = await request.json();
    let markdown = body.markdown;
    if (typeof body.repository === 'string' && body.repository.trim()) {
      let url: URL;
      try { url = new URL(body.repository); } catch { return NextResponse.json({ error: 'Enter a valid public GitHub repository URL.' }, { status: 400 }); }
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.hostname !== 'github.com' || parts.length < 2 || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) return NextResponse.json({ error: 'Enter a public GitHub repository URL such as https://github.com/owner/repo.' }, { status: 400 });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}/readme`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Elara-Opportunity-Importer' }, signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return NextResponse.json({ error: response.status === 404 ? 'Repository or README not found. It must be public.' : `GitHub README request failed (${response.status}).` }, { status: 400 });
        const readme = await response.json();
        if (readme.encoding !== 'base64' || typeof readme.content !== 'string' || readme.content.length > 350000) return NextResponse.json({ error: 'README is too large or uses an unsupported format. Paste its Markdown instead.' }, { status: 400 });
        markdown = Buffer.from(readme.content, 'base64').toString('utf8');
      } finally { clearTimeout(timeout); }
    }
    const candidates = parsePastedOpportunityList(markdown);
    if (body.action !== 'save') return NextResponse.json({ candidates });
    const selected = new Set<string>(Array.isArray(body.urls) ? body.urls.slice(0, 100) : []);
    const rows = candidates.filter(candidate => selected.has(candidate.source_url));
    if (!rows.length) return NextResponse.json({ error: 'Select at least one listing.' }, { status: 400 });
    const sql = createSql();
    const existing = await sql`SELECT id,source_url,edition_year FROM opportunities WHERE source_url = ANY(${rows.map(row => row.source_url)}::text[])`;
    const existingKeys = new Set((existing || []).map(row => `${row.source_url.toLowerCase()}|${row.edition_year || 'unknown'}`));
    const newRows = rows.filter(row => !existingKeys.has(`${row.source_url.toLowerCase()}|${row.edition_year || 'unknown'}`)).map(row => ({
      created_by: auth.userId, title: row.title, organizer: null, category: 'other', summary: row.excerpt || null,
      source_url: row.source_url, official_url: null, location: null, participation_mode: null,
      funding_kind: 'unknown', funding_description: null, funding_amount_min: null, funding_amount_max: null,
      funding_currency: null, funding_conditional: false, deadline: null, deadline_timezone: null,
      deadline_timezone_known: false, timezone_known: false, deadline_raw_text: null, requirements: { items: [] },
      application_questions: [], required_documents: [], application_steps: [], source_content: row.excerpt,
      source_evidence: null, source_type: 'pasted_text', source_label: 'user_provided', source_status: 'unknown',
      edition_year: row.edition_year, status: 'draft', publication_status: 'draft', is_demo: false, last_verified_at: null,
    }));
    if (newRows.length) {
      const columns = Object.keys(newRows[0]);
      await sql.query(`INSERT INTO opportunities (${columns.map(key => `"${key}"`).join(',')}) SELECT ${columns.map(key => `r."${key}"`).join(',')} FROM jsonb_populate_recordset(NULL::opportunities, $1::jsonb) r`, [JSON.stringify(newRows)]);
    }
    return NextResponse.json({ success: true, saved: newRows.length, duplicates: rows.length - newRows.length, reviewRequired: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed.' }, { status: 400 }); }
}
