import { describe, expect, it } from 'vitest';
import { parsePastedOpportunityList } from '../src/lib/catalogue/paste-list';

describe('pasted opportunity lists', () => {
  it('extracts safe opportunity links once and retains edition identity', () => {
    const items = parsePastedOpportunityList(`
- [Research Fellowship 2027](https://provider.example/fellowship?utm_source=readme)
- [Research Fellowship 2027](https://provider.example/fellowship)
- [Open program](javascript:alert(1))
`);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Research Fellowship 2027', source_url: 'https://provider.example/fellowship', edition_year: 2027 });
  });
});
