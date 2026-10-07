import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn(), requireAuth: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({ requireAuth: mocks.requireAuth, checkRateLimit: () => ({ allowed: true }), sanitizeInput: (s: string) => s.trim() }));
vi.mock('@/lib/db/server', () => ({ createClient: async () => ({ from: mocks.from }) }));
import { POST as ingest } from '@/app/api/ingest/route';
import { POST as bridge } from '@/app/api/ai-bridge/import/route';
function result(data: unknown, error: unknown = null) {
  const value = Promise.resolve({ data, error });
  const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(), then: value.then.bind(value) };
  mocks.from.mockReturnValueOnce(q);
  return q;
}
beforeEach(() => { vi.resetAllMocks(); mocks.requireAuth.mockResolvedValue({ userId: 'account-a' }); });
function request(body: object) { return new NextRequest('http://localhost/api/import', { method: 'POST', body: JSON.stringify(body) }); }
it('saves an ingest draft that complies with the actual RLS contract', async () => {
  const opportunity = result({ id: 'draft-a' });
  result({ id: 'application-a', stage: 'saved' });
  result({ id: 'collection-a' }); result(null);
  const response = await ingest(request({ mode: 'save', opportunity: { title: 'Imported listing' } }));
  expect(response.status).toBe(200);
  expect(opportunity.insert.mock.calls[0][0]).toMatchObject({ created_by: 'account-a', status: 'draft', publication_status: 'draft', last_verified_at: null });
});
it('retains a submitted application when importing its existing source URL again', async () => {
  result({ id: 'opportunity-a' });
  const upsert = result(null);
  result({ id: 'application-a', stage: 'submitted', notes: 'Keep my work' });
  result({ id: 'collection-a' }); result(null);
  const response = await ingest(request({ mode: 'save', opportunity: { title: 'Listing', source_url: 'https://example.org/programme' } }));
  expect(response.status).toBe(200);
  expect(upsert.upsert.mock.calls[0][1]).toMatchObject({ ignoreDuplicates: true });
  expect((await response.json()).application).toMatchObject({ stage: 'submitted', notes: 'Keep my work' });
});
it('whitelists AI Bridge fields and saves private drafts with applications', async () => {
  const insert = result({ id: 'draft-b' });
  const application = result(null);
  const response = await bridge(request({ saveSelected: true, selectedOpportunities: [{ title: 'Candidate', id: 'another-users-id', status: 'published', publication_status: 'published', created_by: 'victim', is_duplicate: false, verification_assessment: { confidenceScore: 100 } }] }));
  expect(response.status).toBe(200);
  expect(insert.insert.mock.calls[0][0]).toEqual({ title: 'Candidate', created_by: 'account-a', status: 'draft', publication_status: 'draft', last_verified_at: null, source_status: 'unknown', source_label: 'user_provided', is_demo: false });
  expect(application.upsert.mock.calls[0][1]).toMatchObject({ ignoreDuplicates: true });
});
it('rejects invalid bridge candidates before writing any draft', async () => {
  const response = await bridge(request({ saveSelected: true, selectedOpportunities: [{ title: 'Good' }, { title: '' }] }));
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
