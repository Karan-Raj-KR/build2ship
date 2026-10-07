import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';

const MAX_CONTENT_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const ip = address.split('.').reduce((total, part) => total * 256 + Number(part), 0);
    const blocked: [number, number][] = [[0, 0x00ffffff], [0x0a000000, 0x0affffff], [0x64400000, 0x647fffff], [0x7f000000, 0x7fffffff], [0xa9fe0000, 0xa9feffff], [0xac100000, 0xac1fffff], [0xc0000000, 0xc00000ff], [0xc0000200, 0xc00002ff], [0xc0586300, 0xc05863ff], [0xc0a80000, 0xc0a8ffff], [0xc6120000, 0xc613ffff], [0xc6336400, 0xc63364ff], [0xcb007100, 0xcb0071ff], [0xe0000000, 0xffffffff]];
    return !blocked.some(([start, end]) => ip >= start && ip <= end);
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    // Accept global unicast only; reject mapped IPv4, translation, documentation and special 2001 ranges.
    return /^[23][0-9a-f]{0,3}:/.test(normalized) && !normalized.startsWith('2001:') && !normalized.startsWith('2002:') && !normalized.startsWith('3fff:');
  }
  return false;
}

export async function safeFetchUrl(url: string) {
  const result = { url, finalUrl: url, contentType: null as string | null, content: '', contentLength: 0, fetchedAt: new Date().toISOString(), error: undefined as string | undefined };
  try {
    let current = new URL(url);
    const expires = Date.now() + FETCH_TIMEOUT_MS;
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      if (!['https:', 'http:'].includes(current.protocol) || current.username || current.password || (current.port && !['80', '443'].includes(current.port))) throw new Error('Only public HTTP(S) URLs on standard ports are supported.');
      const host = current.hostname.replace(/^\[|\]$/g, '');
      if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Private hostnames are not allowed.');
      const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
      if (!Array.isArray(addresses) || !addresses.length || addresses.some(record => !isPublicAddress(record.address))) throw new Error('Private or reserved destinations are not allowed.');
      const pinned = addresses[0];
      const remaining = expires - Date.now();
      if (remaining <= 0) throw new Error('Fetch timed out.');
      const response = await new Promise<{ status: number; location?: string; contentType: string; text: string; size: number }>((resolve, reject) => {
        const request = (current.protocol === 'https:' ? httpsRequest : httpRequest)(current, {
          headers: { 'User-Agent': 'Elara/1.0 (opportunity review)', Accept: 'text/html, text/plain, application/xhtml+xml' },
          // Pin validated DNS resolution to the actual connection to avoid rebinding.
          lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
          agent: false,
        }, res => {
          const status = res.statusCode || 0;
          if (status >= 300 && status < 400) { res.resume(); resolve({ status, location: res.headers.location, contentType: '', text: '', size: 0 }); return; }
          if (status < 200 || status >= 300) { res.destroy(); reject(new Error(`Source returned HTTP ${status}.`)); return; }
          const contentType = String(res.headers['content-type'] || '');
          if (!/^(text\/html|text\/plain|application\/xhtml\+xml)(;|$)/i.test(contentType)) { res.destroy(); reject(new Error('Only HTML or plain text is supported.')); return; }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk: Buffer) => { size += chunk.length; if (size > MAX_CONTENT_BYTES) { res.destroy(new Error('Source exceeds 500 KB.')); } else chunks.push(chunk); });
          res.on('error', reject);
          res.on('end', () => resolve({ status, contentType, text: Buffer.concat(chunks).toString('utf8'), size }));
        });
        const timeout = setTimeout(() => request.destroy(new Error('Fetch timed out.')), remaining);
        request.on('close', () => clearTimeout(timeout));
        request.on('error', reject);
        request.end();
      });
      if (response.status >= 300 && response.status < 400) {
        if (!response.location || redirects === MAX_REDIRECTS) throw new Error('Missing redirect target or too many redirects.');
        current = new URL(response.location, current); continue;
      }
      result.finalUrl = current.toString(); result.contentType = response.contentType; result.contentLength = response.size;
      result.content = response.text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      return result;
    }
  } catch (error) { result.error = error instanceof Error ? error.message : 'Source fetch failed.'; }
  return result;
}
