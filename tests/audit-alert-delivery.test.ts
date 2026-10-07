import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ sql: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/db/service', () => ({ createSql: () => mocks.sql }));
vi.mock('@/lib/notifications/email', () => ({ sendEmail: mocks.send }));
import { flushEmails } from '@/lib/notifications/jobs';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('BREVO_API_KEY', 'test-only'); vi.stubEnv('EMAIL_FROM', 'test@example.invalid');
});
afterEach(() => vi.unstubAllEnvs());
const delivery = { id: 'delivery-a', user_id: 'account-a', recipient: 'old@example.invalid', subject: 'Match', html: '<p>Match</p>', body_text: 'Match', attempts: 1 };
it('sends queued mail to the current verified email, never the cached recipient', async () => {
  mocks.sql.mockResolvedValueOnce([delivery]).mockResolvedValueOnce([{ email_enabled: true, email: 'current@example.invalid' }]).mockResolvedValueOnce([]);
  mocks.send.mockResolvedValue({ sent: true, messageId: 'provider-a' });
  expect(await flushEmails()).toEqual({ sent: 1, failed: 0 });
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'current@example.invalid' }));
  const verification = mocks.sql.mock.calls[1][0].join(' ');
  expect(verification).toContain('u.email_confirmed_at IS NOT NULL');
  expect(verification).toContain('NOT p.is_suspended');
});
it('cancels queued mail when the current active verified identity is unavailable', async () => {
  mocks.sql.mockResolvedValueOnce([delivery]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  expect(await flushEmails()).toEqual({ sent: 0, failed: 0 });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.sql.mock.calls[2][0].join(' ')).toContain("status = 'cancelled'");
});
it('holds uncertain provider outcomes rather than making them retryable', async () => {
  mocks.sql.mockResolvedValueOnce([delivery]).mockResolvedValueOnce([{ email_enabled: true, email: 'current@example.invalid' }]).mockResolvedValueOnce([]);
  mocks.send.mockResolvedValue({ sent: false, uncertain: true, warning: 'Reconcile provider logs' });
  expect(await flushEmails()).toEqual({ sent: 0, failed: 1 });
  expect(mocks.sql.mock.calls[2]).toContain('uncertain');
});
it('cancels a digest queued before its schedule changed', async () => {
  mocks.sql.mockResolvedValueOnce([{ ...delivery, event_key: 'digest:weekly:2026-10-05', preference_version: '2026-10-05T01:00:00Z' }])
    .mockResolvedValueOnce([{ email_enabled: true, email: 'current@example.invalid', schedule_changed_at: '2026-10-06T01:00:00Z' }]).mockResolvedValueOnce([]);
  await flushEmails();
  expect(mocks.send).not.toHaveBeenCalled();
});
