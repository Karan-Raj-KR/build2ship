import { RawOpportunityCandidate } from '@/opportunity-sources/types';
import { normalizeCandidateToOpportunity } from '@/opportunity-sources/normalize';
import { Opportunity } from '@/types/database';

export interface ExtractedAIBridgeResult {
  candidates: Opportunity[];
  suggestedProfileUpdates: string[];
  rawDetectedCount: number;
}

/**
 * Parses raw text pasted from external LLMs (ChatGPT, Claude, Gemini, Perplexity)
 * into normalized opportunity candidates and surfaces potential profile updates.
 */
export function parseExternalAIResponse(rawText: string): ExtractedAIBridgeResult {
  const candidates: Opportunity[] = [];
  const suggestedProfileUpdates: string[] = [];

  if (!rawText || rawText.trim().length === 0) {
    return { candidates: [], suggestedProfileUpdates: [], rawDetectedCount: 0 };
  }

  // 1. Detect candidate sections (split by markdown headings or numbered lists or horizontal lines)
  const sections = rawText.split(/(?=(?:^|\n)(?:###|\d+\.|\*\*Opportunity:|\*\*Name:))/g);

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (trimmed.length < 30) continue;

    // Title extraction
    const titleMatch = trimmed.match(/(?:###|\d+\.|\*\*Opportunity:|\*\*Name:|\*\*Title:)?\s*([^\n\*\#]+)/i);
    const title = titleMatch ? titleMatch[1].replace(/^[0-9\.\-\:\*#\s]+/, '').trim() : '';

    if (!title || title.length < 3 || title.toLowerCase().includes('here are') || title.toLowerCase().includes('assistant')) {
      continue;
    }

    // Organization
    const orgMatch = trimmed.match(/(?:Organization|Company|Host|Provider|By):\s*([^\n\*]+)/i);
    const organizer = orgMatch ? orgMatch[1].trim() : 'External Organization';

    // Official URL extraction
    const urlMatch = trimmed.match(/(?:Official\s*URL|Link|Website|Apply\s*URL|URL):\s*(https?:\/\/[^\s\)\*]+)/i) ||
                     trimmed.match(/(https?:\/\/[^\s\)\*]+)/i);
    const official_url = urlMatch ? urlMatch[1].replace(/[\,\.\>]+$/, '').trim() : null;

    // Deadline extraction
    const deadlineMatch = trimmed.match(/(?:Deadline|Closes|Due\s*Date):\s*([^\n\*]+)/i);
    const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;

    // Funding extraction
    const fundingMatch = trimmed.match(/(?:Funding|Stipend|Prize|Reward|Compensation):\s*([^\n\*]+)/i);
    const funding_description = fundingMatch ? fundingMatch[1].trim() : null;

    // Requirements extraction
    const requirements: string[] = [];
    const reqLines = trimmed.split('\n');
    for (const line of reqLines) {
      if (line.match(/^[\*\-]\s*(?:Eligibility|Requirement|Open to|Must be)/i)) {
        requirements.push(line.replace(/^[\*\-\s]+/, '').trim());
      }
    }

    const rawCandidate: RawOpportunityCandidate = {
      title,
      organizer,
      official_url,
      deadline,
      funding_description,
      summary: trimmed.slice(0, 300),
      requirements: requirements.length ? requirements : undefined,
      source_type: 'ai_import',
      source_evidence: `Imported via AI Bridge from external LLM response.`,
    };

    const canonical = normalizeCandidateToOpportunity(rawCandidate);
    candidates.push(canonical);
  }

  // 2. Detect potential profile updates (interests, skills mentioned)
  const skillKeywords = ['interested in', 'focus on', 'background in', 'specializes in', 'knowledge of'];
  for (const kw of skillKeywords) {
    const idx = rawText.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      const snippet = rawText.slice(idx, idx + 80).split(/[\.\,\n]/)[0];
      const cleaned = snippet.replace(/^[\w\s]+(?:in|on|of)\s+/i, '').trim();
      if (cleaned.length > 2 && cleaned.length < 50 && !suggestedProfileUpdates.includes(cleaned)) {
        suggestedProfileUpdates.push(cleaned);
      }
    }
  }

  return {
    candidates,
    suggestedProfileUpdates: suggestedProfileUpdates.slice(0, 4),
    rawDetectedCount: candidates.length,
  };
}
