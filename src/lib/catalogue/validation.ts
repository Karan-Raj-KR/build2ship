import type { Opportunity } from '@/types/database';
import { cleanUrl } from '@/opportunity-sources/normalize';

const strings = ['title','organizer','summary','location','funding_description','funding_currency','deadline_timezone','deadline_raw_text','source_content','source_evidence','visa_requirements','recurring_cycle'];
const arrays = ['application_questions','required_documents','application_steps','topics','skills','education_stages','citizenship_constraints','residency_constraints','eligible_countries','benefits'];
const enums: Record<string, string[]> = {
  category: ['internship','fellowship','scholarship','hackathon','competition','grant','research_programme','startup_programme','accelerator','open_source_programme','conference','international_programme','other'],
  participation_mode: ['remote','in-person','hybrid'], funding_kind: ['prize','stipend','reimbursement','cost','none','unknown'], application_effort: ['quick','moderate','significant'],
};

export function sanitizeOpportunity(input: Record<string, unknown>, admin = false): Partial<Opportunity> {
  if (!input || Array.isArray(input)) throw new Error('Invalid opportunity');
  const output: Record<string, unknown> = {};
  for (const key of strings) if (key in input) output[key] = input[key] == null ? null : String(input[key]).trim().slice(0, key === 'source_content' ? 50000 : 4000);
  for (const key of arrays) if (key in input) {
    if (input[key] != null && !Array.isArray(input[key])) throw new Error(`${key} must be a list`);
    output[key] = Array.from(new Set(((input[key] || []) as unknown[]).filter(value => typeof value === 'string').map(value => String(value).trim().slice(0, 500)).filter(Boolean))).slice(0, 100);
  }
  for (const [key, allowed] of Object.entries(enums)) if (key in input) {
    if (input[key] != null && !allowed.includes(String(input[key]))) throw new Error(`Invalid ${key}`);
    output[key] = input[key];
  }
  for (const key of ['source_url','official_url','discovered_url']) if (key in input) {
    const url = input[key] ? cleanUrl(String(input[key])) : null;
    if (input[key] && !url) throw new Error(`${key} must be a public HTTP(S) URL`);
    output[key] = url;
  }
  for (const key of ['funding_amount_min','funding_amount_max','edition_year']) if (key in input) {
    const value = input[key];
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error(`Invalid ${key}`);
    output[key] = value;
  }
  for (const key of ['timezone_known','deadline_timezone_known','funding_conditional','is_recurring','is_featured']) if (key in input) {
    if (typeof input[key] !== 'boolean') throw new Error(`${key} must be true or false`);
    output[key] = input[key];
  }
  if ('deadline' in input) {
    const value = input.deadline;
    if (value != null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))) throw new Error('Deadline needs an ISO timestamp with timezone; leave it unknown until checked.');
    output.deadline = value;
  }
  if ('requirements' in input) {
    const raw = Array.isArray(input.requirements) ? input.requirements : (input.requirements as { items?: unknown[] } | null)?.items;
    if (raw != null && !Array.isArray(raw)) throw new Error('Requirements must be a list');
    output.requirements = { items: (raw || []).slice(0, 50).map(value => typeof value === 'string' ? { text: value.slice(0, 1000), mandatory: 'uncertain', type: 'other', comparison_rule: null } : value) };
  }
  if (admin && 'status' in input) {
    if (!['draft','published','archived'].includes(String(input.status))) throw new Error('Invalid publication status');
    output.status = input.status;
    output.publication_status = input.status;
  }
  return output as Partial<Opportunity>;
}

export function reviewPublication(input: Record<string, unknown>, record: Partial<Opportunity>) {
  if (record.status !== 'published') return {};
  if (input.verification_confirmed !== true || !record.official_url || !record.source_evidence) throw new Error('Publishing requires confirmation that the official programme page was reviewed, plus its URL and source evidence.');
  return { last_verified_at: new Date().toISOString(), source_status: 'live' as const, source_label: 'curated' as const };
}
