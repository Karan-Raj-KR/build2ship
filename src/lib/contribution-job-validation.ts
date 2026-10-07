export const TERMINAL_JOBS = ['done', 'failed', 'cancelled', 'expired'];
export const RUNNER_COMMIT = '170ba3eacad00932afcf66a33f804ba6ca4f4f38';
const secret = /sk-ant-[\w-]{20,}|gh[pousr]_[\w]{30,}|github_pat_[\w]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|xox[baprs]-[\w-]{20,}/;
export function safeJobText(value: unknown, max: number) {
  if (typeof value !== 'string' || value.length > max || secret.test(value)) throw new Error('Report rejected: invalid length or possible credentials. Remove credentials locally before retrying.');
  return value;
}
export function validateRunnerResult(value: Record<string, unknown>) {
  if (!['fixed', 'stopped'].includes(String(value.status))) throw new Error('Result status must be fixed or stopped.');
  const list = (key: string, max: number) => {
    const items = value[key] ?? [];
    if (!Array.isArray(items) || items.length > max) throw new Error('Report list is too large.');
    return items.map(item => safeJobText(item, 300));
  };
  return { status: value.status, summary: safeJobText(value.summary ?? '', 3000), diff: safeJobText(value.diff ?? '', 300000), files: list('files', 60), tests_run: list('tests_run', 20), not_verified: list('not_verified', 20) };
}
