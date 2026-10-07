# Opportunity Discovery Source Registry

This document records the official sources, collection adapters, and verification methods configured in OpportunityOS.

## 1. Curated Programs (In-Tree Registry)

| Program Name | Organization | Category | Default Mode | Official Domain | Verification Method |
|---|---|---|---|---|---|
| **Google Summer of Code (GSoC)** | Google Open Source | Open Source / Fellowship | Remote | `summerofcode.withgoogle.com` | Official domain check & edition matching |
| **Mitacs Globalink Research Internship** | Mitacs Canada | Research / Internship | In-Person | `mitacs.ca` | Official university partner domain matching |
| **The Thiel Fellowship** | The Thiel Foundation | Fellowship / Grant | In-Person | `thielfellowship.org` | Official Foundation criteria verification |
| **MLH Fellowship** | Major League Hacking | Internship / Open Source | Remote | `fellowship.mlh.io` | Direct MLH portal check |
| **HackMIT** | MIT Tech Club | Hackathon | In-Person / Hybrid | `hackmit.org` | Official MIT domain verification |
| **Y Combinator** | Y Combinator | Startup Accelerator | In-Person | `ycombinator.com` | Batch edition & deadline verification |
| **Encode Club Accelerators & Hackathons** | Encode Club | Web3 / AI | Remote | `encode.club` | Direct event schedule parsing |
| **OpenAI Residency** | OpenAI | Research Residency | In-Person | `openai.com` | Direct careers/research feed |
| **Emergent Ventures** | Mercatus Center | Grant / Fellowship | Remote | `mercatus.org` | University research center verification |
| **ETHGlobal Hackathons** | ETHGlobal | Hackathon | Remote / Hybrid | `ethglobal.com` | Direct circuit schedule tracking |

---

## 2. Pluggable Search Adapters

Configured in `src/opportunity-sources/search/adapter.ts`:

1. **Tavily Search (`TAVILY_API_KEY`)**:
   - Advanced search depth targeting official program websites, deadlines, and eligibility criteria.
2. **Serper (`SERPER_API_KEY`)**:
   - Google Search API wrapper providing organic direct results for fast link discovery.
3. **Brave Search (`BRAVE_SEARCH_API_KEY`)**:
   - Privacy-respecting independent search index.
4. **Curated Fallback Engine**:
   - Activates automatically when no third-party API key is configured in the environment.
   - Guarantees that Scout queries always return relevant, vetted opportunities without breaking or displaying fake data.

---

## 3. Ingestion & Import Sources

1. **AI Bridge Import**:
   - Parses unstructured markdown or text from ChatGPT, Claude, Gemini, or Perplexity.
   - Normalizes titles, organizations, links, and deadlines.
   - Tests candidates against deduplication rules before saving.
2. **Manual URL Ingestion (`/ingest`)**:
   - Extracts page metadata, sanitizes tracking parameters, and checks against the canonical database.
