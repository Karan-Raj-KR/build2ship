export function validateNotificationSettings(input: Record<string, unknown>) {
  if (!input || typeof input.email_enabled !== 'boolean' || typeof input.in_app_enabled !== 'boolean'
    || !['instant', 'weekly', 'daily'].includes(String(input.frequency))) throw new Error('Invalid notification settings');
  if (typeof input.timezone !== 'string' || !/^(UTC|[A-Za-z_]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?)$/.test(input.timezone)) throw new Error('Choose an IANA timezone, such as Asia/Kolkata');
  try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); }
  catch { throw new Error('Choose a valid timezone, such as Asia/Kolkata'); }
  if (!Array.isArray(input.deadline_reminder_days) || input.deadline_reminder_days.some(day => ![1, 3, 7].includes(day))) throw new Error('Invalid reminder days');
  const day = input.digest_day ?? 0;
  const time = input.digest_time ?? '09:00';
  if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) throw new Error('Choose a weekday from Sunday to Saturday');
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(time)) throw new Error('Choose a valid digest time');
  return { email_enabled: input.email_enabled, in_app_enabled: input.in_app_enabled, frequency: input.frequency,
    timezone: input.timezone, ...('digest_day' in input ? { digest_day: day } : {}), ...('digest_time' in input ? { digest_time: time.slice(0, 5) } : {}),
    deadline_reminder_days: [...new Set(input.deadline_reminder_days)] };
}
