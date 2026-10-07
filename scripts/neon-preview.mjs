// Usage: node scripts/neon-preview.mjs /absolute/private/neon.env
import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
const env = parseEnv(fs.readFileSync(process.argv[2], 'utf8'));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','--port','3000'], {
  stdio: 'inherit', env: { ...process.env, ...env, NEXT_PUBLIC_FORCE_DEMO_MODE: 'false', ENABLE_CHECKOUT: 'false', NEXT_PUBLIC_ENABLE_CHECKOUT: 'false', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' },
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
