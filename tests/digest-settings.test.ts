import { expect, it } from 'vitest';
import { validateNotificationSettings } from '@/lib/notifications/settings';
import { analyzeFreshness } from '@/opportunity-sources/freshness';
const settings = { email_enabled: true, in_app_enabled: true, frequency: 'weekly', timezone: 'Asia/Kolkata', digest_day: 0, digest_time: '09:00', deadline_reminder_days: [7,3,1] };
it('accepts Sunday 9 AM and retains legacy preferences', () => {
  expect(validateNotificationSettings(settings)).toEqual(settings);
  expect(validateNotificationSettings({ ...settings, frequency: 'instant', digest_time: '09:00:00' })).toMatchObject({ frequency: 'instant', digest_time: '09:00' });
  const legacy = { ...settings }; delete (legacy as Partial<typeof settings>).digest_day; delete (legacy as Partial<typeof settings>).digest_time;
  expect(validateNotificationSettings(legacy)).not.toHaveProperty('digest_day');
  expect(validateNotificationSettings(legacy)).not.toHaveProperty('digest_time');
});
it.each([{ timezone: undefined }, { timezone: '+05:30' }, { timezone: 'Mars/Olympus' }, { digest_day: 7 }, { digest_day: '0' }, { digest_time: '24:00' }, { digest_time: '09:00:01' }, { deadline_reminder_days: ['7'] }])('rejects invalid schedule %j', input => {
  expect(() => validateNotificationSettings({ ...settings, ...input })).toThrow();
});
it('does not treat a future verification timestamp as reviewed', () => {
  expect(analyzeFreshness(new Date(Date.now() + 86400000).toISOString()).isStale).toBe(true);
});
