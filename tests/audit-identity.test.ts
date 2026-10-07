import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }));
vi.mock('@/lib/db/server', () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));

import { getAccountUser } from '@/lib/auth/server';
import { requireAdminRole } from '@/lib/api-auth';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: {
    id: 'user-a', email: 'current@example.invalid', email_confirmed_at: '2026-10-07T00:00:00Z', user_metadata: { display_name: 'Current' }, app_metadata: {},
  } }, error: null });
});

it('uses Supabase Auth identity and preserves trusted profile authorization fields', async () => {
  mocks.profile.mockResolvedValue({ data: { id: 'user-a', role: 'admin', is_admin: true, is_suspended: true, display_name: 'Current' }, error: null });
  const user = await getAccountUser();
  expect(user?.email).toBe('current@example.invalid');
  expect(user?.profile).toMatchObject({ role: 'admin', is_suspended: true });
  expect(user?.app_metadata).toMatchObject({ role: 'admin', is_admin: true });
});

it('does not open a workspace for unverified users or a missing profile', async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-a', email: 'current@example.invalid', email_confirmed_at: null } }, error: null });
  await expect(getAccountUser()).rejects.toThrow('Verify your email');
  mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-a', email: 'current@example.invalid', email_confirmed_at: '2026-10-07T00:00:00Z' } }, error: null });
  mocks.profile.mockResolvedValueOnce({ data: null, error: null });
  expect(await getAccountUser()).toBeNull();
});

it('denies admin access when the profile database fails, even with an admin claim', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: {
    id: 'user-a', email_confirmed_at: '2026-10-07T00:00:00Z', app_metadata: { role: 'owner' },
  } }, error: null });
  mocks.profile.mockResolvedValue({ data: null, error: { code: 'PGRST205' } });
  const result = await requireAdminRole();
  expect(result.userId).toBeNull();
  expect(result.error?.status).toBe(500);
});
