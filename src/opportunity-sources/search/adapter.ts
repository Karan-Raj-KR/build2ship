import { Profile } from "@/types/database";
import { SOURCE_REGISTRY } from "../registry";
import { SourceDefinition } from "../types";

export type SearchProviderType = "tavily" | "serper" | "brave" | "exa" | "curated_fallback";

export interface SearchOptions {
  query: string;
  userProfile?: Partial<Profile>;
  constraints?: {
    categories?: string[];
    countries?: string[];
    remoteOnly?: boolean;
    paidOnly?: boolean;
  };
  limit?: number;
}

export interface SearchProviderResult {
  title: string;
  url: string;
  snippet: string;
  sourceProvider: SearchProviderType;
  score?: number;
  publishedDate?: string;
}

export interface SearchExecutionResult {
  providerUsed: SearchProviderType;
  isConfiguredExternalProvider: boolean;
  results: SearchProviderResult[];
  warning?: string;
}

/**
 * Builds an enriched search query that incorporates stored profile facts
 * (e.g. residence, field of study, degree stage, funding preference).
 */
export function buildProfileEnrichedQuery(baseQuery: string, profile?: Partial<Profile>): string {
  const parts: string[] = [baseQuery.trim()];

  if (profile) {
    if (profile.field_of_study && !baseQuery.toLowerCase().includes(profile.field_of_study.toLowerCase())) {
      parts.push(profile.field_of_study);
    }
    if (profile.education_stage && profile.education_stage !== "other" && !baseQuery.toLowerCase().includes(profile.education_stage.toLowerCase())) {
      parts.push(profile.education_stage);
    }
    if (profile.paid_only_preference && !baseQuery.toLowerCase().includes("paid") && !baseQuery.toLowerCase().includes("stipend")) {
      parts.push("stipend paid");
    }
    if (profile.country_of_residence && !baseQuery.toLowerCase().includes(profile.country_of_residence.toLowerCase())) {
      parts.push(profile.country_of_residence);
    }
  }

  return parts.join(" ");
}

/**
 * Deduplicates search results based on normalized domain and path.
 */
export function deduplicateSearchResults(results: SearchProviderResult[]): SearchProviderResult[] {
  const seenUrls = new Set<string>();
  const deduped: SearchProviderResult[] = [];

  for (const r of results) {
    try {
      const parsed = new URL(r.url);
      const normalized = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        deduped.push(r);
      }
    } catch {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        deduped.push(r);
      }
    }
  }

  return deduped;
}

/**
 * Searches opportunities using configured search provider (Exa, Tavily, Serper, Brave)
 * or gracefully falls back to the vetted curated source registry if no provider keys exist.
 * Never claims an unconfigured provider performed live search.
 */
export async function searchOpportunities(options: SearchOptions): Promise<SearchExecutionResult> {
  const limit = options.limit || 8;
  const enrichedQuery = buildProfileEnrichedQuery(options.query, options.userProfile);

  const exaKey = process.env.EXA_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  // 1. Try Exa
  if (exaKey) {
    try {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "x-api-key": exaKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${enrichedQuery} opportunity application eligibility`,
          numResults: limit,
          useAutoprompt: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawResults: SearchProviderResult[] = (data.results || []).map((r: { title: string; url: string; text?: string; highlight?: string }) => ({
          title: r.title || "Opportunity",
          url: r.url,
          snippet: r.highlight || r.text || "",
          sourceProvider: "exa" as const,
        }));

        return {
          providerUsed: "exa",
          isConfiguredExternalProvider: true,
          results: deduplicateSearchResults(rawResults),
        };
      }
    } catch (err) {
      console.warn("Exa search provider error, falling back:", err);
    }
  }

  // 2. Try Tavily
  if (tavilyKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `${enrichedQuery} fellowship internship grant hackathon opportunity`,
          search_depth: "advanced",
          include_answer: false,
          max_results: limit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawResults: SearchProviderResult[] = (data.results || []).map((r: { title: string; url: string; content: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          sourceProvider: "tavily" as const,
        }));

        return {
          providerUsed: "tavily",
          isConfiguredExternalProvider: true,
          results: deduplicateSearchResults(rawResults),
        };
      }
    } catch (err) {
      console.warn("Tavily search provider error, falling back:", err);
    }
  }

  // 3. Try Serper
  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `${enrichedQuery} opportunity application eligibility`,
          num: limit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawResults: SearchProviderResult[] = (data.organic || []).map((r: { title: string; link: string; snippet: string }) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          sourceProvider: "serper" as const,
        }));

        return {
          providerUsed: "serper",
          isConfiguredExternalProvider: true,
          results: deduplicateSearchResults(rawResults),
        };
      }
    } catch (err) {
      console.warn("Serper search provider error, falling back:", err);
    }
  }

  // 4. Try Brave
  if (braveKey) {
    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", `${enrichedQuery} fellowship internship program`);
      url.searchParams.set("count", limit.toString());

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveKey,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const rawResults: SearchProviderResult[] = (data.web?.results || []).map((r: { title: string; url: string; description: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
          sourceProvider: "brave" as const,
        }));

        return {
          providerUsed: "brave",
          isConfiguredExternalProvider: true,
          results: deduplicateSearchResults(rawResults),
        };
      }
    } catch (err) {
      console.warn("Brave search provider error, falling back:", err);
    }
  }

  // 5. Fallback to Curated Source Registry (Vetted directory)
  const qLower = enrichedQuery.toLowerCase();
  const queryTokens = qLower.split(/\s+/).filter((t) => t.length > 2);

  const matchedCurated = SOURCE_REGISTRY.map((source: SourceDefinition) => {
    let score = 0;
    const textCorpus = `${source.name} ${source.description} ${source.tags.join(" ")} ${source.category}`.toLowerCase();

    for (const token of queryTokens) {
      if (textCorpus.includes(token)) score += 2;
    }

    if (options.constraints?.remoteOnly && source.default_mode === "in-person") {
      score -= 5;
    }

    return { source, score };
  })
    .filter((item: { source: SourceDefinition; score: number }) => item.score >= 0)
    .sort((a: { source: SourceDefinition; score: number }, b: { source: SourceDefinition; score: number }) => b.score - a.score)
    .slice(0, limit);

  const results: SearchProviderResult[] = matchedCurated.map(({ source }: { source: SourceDefinition }) => ({
    title: `${source.name}`,
    url: `https://${source.official_domain}`,
    snippet: `${source.description} | Category: ${source.category} | Mode: ${source.default_mode}`,
    sourceProvider: "curated_fallback" as const,
  }));

  return {
    providerUsed: "curated_fallback",
    isConfiguredExternalProvider: false,
    results: deduplicateSearchResults(results),
    warning: "No external search API keys configured (EXA_API_KEY, TAVILY_API_KEY, SERPER_API_KEY, BRAVE_SEARCH_API_KEY). Scout is utilizing the vetted source registry.",
  };
}
