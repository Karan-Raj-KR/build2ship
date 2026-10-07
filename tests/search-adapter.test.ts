import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchOpportunities } from '@/opportunity-sources/search/adapter';

describe('Search Provider Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('uses Serper provider when SERPER_API_KEY is configured', async () => {
    process.env.SERPER_API_KEY = 'test-serper-key';
    delete process.env.TAVILY_API_KEY;

    const mockResponse = {
      organic: [
        {
          title: 'OpenAI Residency Program',
          link: 'https://openai.com/careers/residency',
          snippet: 'Research residency program for engineers and researchers.',
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await searchOpportunities({
      query: 'OpenAI residency',
      limit: 1,
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://google.serper.dev/search', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-API-KEY': 'test-serper-key',
      }),
    }));

    expect(result.providerUsed).toBe('serper');
    expect(result.isConfiguredExternalProvider).toBe(true);
    expect(result.results.length).toBe(1);
    expect(result.results[0].title).toBe('OpenAI Residency Program');
    expect(result.results[0].url).toBe('https://openai.com/careers/residency');
  });

  it('gracefully falls back to curated source registry when no provider keys exist', async () => {
    delete process.env.SERPER_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;

    const result = await searchOpportunities({
      query: 'open source summer program',
      limit: 3,
    });

    expect(result.providerUsed).toBe('curated_fallback');
    expect(result.isConfiguredExternalProvider).toBe(false);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].sourceProvider).toBe('curated_fallback');
  });
});
