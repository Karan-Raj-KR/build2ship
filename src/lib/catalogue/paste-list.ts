import { cleanUrl, normalizeCategory, extractEditionYear } from '@/opportunity-sources/normalize';

export interface PastedListing { title: string; source_url: string; edition_year: number | null; excerpt: string }
export function parsePastedOpportunityList(input: string): PastedListing[] {
  if (typeof input !== 'string' || !input.trim() || input.length > 250_000) throw new Error('Paste a list under 250 KB.');
  const lines = input.split(/\r?\n/);
  const found = new Map<string, PastedListing>();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const link = /\[([^\]]{4,180})\]\((https?:\/\/[^\s)]+)\)/g;
    for (const match of line.matchAll(link)) {
      const title = match[1].replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
      const url = cleanUrl(match[2]);
      if (!url || /^(home|read more|apply now|website|link|here|github)$/i.test(title)) continue;
      const context = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 3)).join(' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
      const year = extractEditionYear(title, null);
      const key = `${url.toLowerCase()}|${year || 'unknown'}`;
      if (!found.has(key)) found.set(key, { title, source_url: url, edition_year: year, excerpt: context });
      if (found.size >= 250) return [...found.values()];
    }
    const bare = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)\[?([^\]\n]{5,160})\]?\s*[-–:|]\s*(https?:\/\/\S+)/);
    if (bare) {
      const title = bare[1].replace(/[*_`]/g, '').trim(), url = cleanUrl(bare[2].replace(/[),.]+$/, ''));
      if (url && !/^(home|read more|apply now|website|link)$/i.test(title)) {
        const year = extractEditionYear(title, null), key = `${url.toLowerCase()}|${year || 'unknown'}`;
        found.set(key, { title, source_url: url, edition_year: year, excerpt: line.trim().slice(0, 1000) });
      }
    }
  }
  return [...found.values()];
}
